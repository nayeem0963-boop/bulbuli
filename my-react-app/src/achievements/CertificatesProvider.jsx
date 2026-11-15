/**
 * <CertificatesProvider>: owns the state behind useCertificates(). The context object and the hook live in
 * CertificatesContext.jsx, so this file exports only a component (Fast Refresh boundary).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { useBadges } from '../badges/BadgesContext.jsx'
import { getBadge } from '../data/badgesConfig.js'
import {
  fetchNameDisplay, issueCertificate, listCertificates, saveCertificatePublic, saveNameDisplay,
} from './certificateStore.js'
import { certificateName } from './player.js'
import { DEFAULT_NAME_DISPLAY } from './privacy.js'
import { CertificatesContext } from './CertificatesContext.jsx'

export function CertificatesProvider({ children }) {
  const { user, profile } = useAuth()
  const { unlocked, ready: badgesReady } = useBadges()
  const userId = user?.id ?? null

  const [status, setStatus] = useState(userId ? 'loading' : 'idle')
  const [certificates, setCertificates] = useState([])
  const [nameDisplay, setNameDisplayState] = useState(DEFAULT_NAME_DISPLAY)
  const [failed, setFailed] = useState(() => new Set()) // badges the server wouldn't issue this visit

  // A new player starts from a clean slate, reset during render when `userId` changes.
  const [owner, setOwner] = useState(userId)
  if (owner !== userId) {
    setOwner(userId)
    setCertificates([])
    setFailed(new Set())
    setNameDisplayState(DEFAULT_NAME_DISPLAY)
    setStatus(userId ? 'loading' : 'idle')
  }
  const pending = useRef(new Map()) // badgeId → in-flight promise, so two clicks ask once
  const userRef = useRef(userId)
  const nameRef = useRef('')
  const playerName = certificateName(user, profile)
  useEffect(() => {
    nameRef.current = playerName
  }, [playerName])

  const upsert = useCallback((certificate) => {
    setCertificates((current) => [certificate, ...current.filter((c) => c.badgeId !== certificate.badgeId)])
  }, [])

  /* ---------- load when the player changes ---------- */
  useEffect(() => {
    userRef.current = userId
    pending.current.clear()
    if (!userId) return undefined
    let active = true
    Promise.all([listCertificates(userId), fetchNameDisplay(userId)])
      .then(([list, mode]) => {
        if (!active) return
        setCertificates(list)
        setNameDisplayState(mode)
        setStatus('ready')
      })
      .catch((error) => {
        if (!active) return
        setStatus(error?.missing ? 'missing' : 'error')
        if (!error?.missing) console.warn('[certificates] could not load certificates', error)
      })
    return () => {
      active = false
    }
  }, [userId])

  const byBadge = useMemo(() => new Map(certificates.map((c) => [c.badgeId, c])), [certificates])
  const byBadgeRef = useRef(byBadge)
  useEffect(() => {
    byBadgeRef.current = byBadge
  }, [byBadge])

  const ensureCertificate = useCallback(async (badgeId) => {
    const badge = getBadge(badgeId)
    if (!userId || !badge?.certificateEligible) return null
    const known = byBadgeRef.current.get(badgeId)
    if (known) return known
    if (status === 'missing') return null
    if (pending.current.has(badgeId)) return pending.current.get(badgeId)

    const request = issueCertificate(badgeId, nameRef.current)
      .then((certificate) => {
        if (userRef.current === userId) upsert(certificate)
        return certificate
      })
      .catch((error) => {
        if (error?.missing) setStatus('missing')
        else if (!error?.notMet) console.warn('[certificates] could not issue a certificate', error)
        if (userRef.current === userId) setFailed((current) => new Set(current).add(badgeId))
        return null
      })
      .finally(() => pending.current.delete(badgeId))
    pending.current.set(badgeId, request)
    return request
  }, [userId, status, upsert])

  /* ---------- issue any missing certificates once, quietly ---------- */
  const backfilled = useRef(null)
  useEffect(() => {
    if (status !== 'ready' || !badgesReady || !userId) return
    const missing = unlocked
      .filter((entry) => getBadge(entry.badgeId)?.certificateEligible && !byBadgeRef.current.has(entry.badgeId) && !failed.has(entry.badgeId))
      .map((entry) => entry.badgeId)
    const key = `${userId}:${missing.join(',')}`
    if (missing.length === 0 || backfilled.current === key) return
    backfilled.current = key
    ;(async () => {
      for (const badgeId of missing) {
        // one at a time: there are only ever a handful
        await ensureCertificate(badgeId)
      }
    })()
  }, [status, badgesReady, userId, unlocked, failed, ensureCertificate])

  const setNameDisplay = useCallback(async (mode) => {
    const saved = await saveNameDisplay(mode)
    setNameDisplayState(saved)
    return saved
  }, [])

  const setPublic = useCallback(async (certificateId, isPublic) => {
    const saved = await saveCertificatePublic(certificateId, isPublic)
    setCertificates((current) => current.map((c) => (c.id === certificateId ? { ...c, isPublic: saved } : c)))
    return saved
  }, [])

  const value = useMemo(() => ({
    status, certificates, byBadge, failed, nameDisplay, ensureCertificate, setNameDisplay, setPublic,
  }), [status, certificates, byBadge, failed, nameDisplay, ensureCertificate, setNameDisplay, setPublic])

  return <CertificatesContext.Provider value={value}>{children}</CertificatesContext.Provider>
}
