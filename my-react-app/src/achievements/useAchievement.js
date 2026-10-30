import { useEffect, useMemo } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { usePlayerAvatar } from '../avatars/usePlayerAvatar.js'
import { getGame } from '../games/registry.js'
import { useCertificates } from './CertificatesContext.jsx'
import { certificateUrl, SITE_URL } from './links.js'
import { certificateName } from './player.js'
import { buildSheet } from './sheet.js'

const gameName = (id) => getGame(id)?.title.en

/** The painters live in their own chunk: loaded the first time a certificate or image is made. */
export const loadExporters = () => import('./render/exporters.js')

/**
 * Everything a certificate / share view needs for one earned badge.
 *
 *   const { sheet, certificate, certState, avatar, photoUrl, nameDisplay, shareLink } = useAchievement(badge, unlockedAt)
 *
 * certState  'none'        the badge has no certificate
 *            'issuing'     asking the server for it
 *            'issued'      a real, verifiable certificate (sheet.code / sheet.verifyUrl are set)
 *            'unavailable' the server can't issue certificates yet (migration not run / offline):
 *                          the certificate is still shown, honestly marked as not verifiable
 * shareLink  the public verification link when the certificate is public, else the site
 */
export function useAchievement(badge, unlockedAt) {
  const { user, profile } = useAuth()
  const { avatar, photoUrl } = usePlayerAvatar()
  const { byBadge, failed, ensureCertificate, status, nameDisplay } = useCertificates()
  const eligible = Boolean(badge?.certificateEligible)
  const certificate = (badge && byBadge.get(badge.id)) ?? null
  const playerName = certificateName(user, profile)

  useEffect(() => {
    if (eligible && !certificate && status === 'ready' && !failed.has(badge.id)) ensureCertificate(badge.id)
  }, [eligible, certificate, status, failed, ensureCertificate, badge?.id])

  let certState = 'none'
  if (eligible) {
    if (certificate) certState = 'issued'
    else if ((status === 'loading' || status === 'ready') && !failed.has(badge.id)) certState = 'issuing'
    else certState = 'unavailable'
  }

  const sheet = useMemo(
    () => buildSheet({ badge, certificate, unlockedAt, profile, playerName, gameName }),
    [badge, certificate, unlockedAt, profile, playerName],
  )

  const shareLink = certificate && certificate.isPublic && !certificate.revokedAt
    ? certificateUrl(certificate.token) || SITE_URL
    : SITE_URL

  return { sheet, certificate, certState, avatar, photoUrl, playerName, nameDisplay, shareLink }
}
