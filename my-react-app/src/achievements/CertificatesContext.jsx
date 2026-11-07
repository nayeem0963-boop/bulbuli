/**
 * The signed-in player's certificates and certificate privacy, shared by the dashboard, the
 * celebration and the share panel.
 *
 *   const { byBadge, status, nameDisplay, ensureCertificate, setNameDisplay, setPublic } = useCertificates()
 *
 * status        'idle' (signed out) | 'loading' | 'ready' | 'missing' (migration not run) | 'error'
 * byBadge       Map badgeId → certificate (see toCertificate in certificateStore.js)
 * ensureCertificate(badgeId)
 *               asks the server for the certificate (it checks the badge, and returns the same
 *               certificate every time); resolves the certificate, or null if it can't be issued.
 *
 * Certificate-eligible badges that are unlocked but have no certificate yet are issued once in
 * the background after loading, so the certificate history is complete. The server never makes
 * a second certificate for the same badge, however often this runs.
 */
import { createContext, useContext } from 'react'

/** Value provided by <CertificatesProvider> (CertificatesProvider.jsx). */
export const CertificatesContext = createContext(null)

export function useCertificates() {
  const context = useContext(CertificatesContext)
  if (!context) throw new Error('useCertificates() must be used inside <CertificatesProvider>.')
  return context
}
