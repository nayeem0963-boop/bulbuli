/**
 * Certificates on the server (Supabase): see supabase/migrations/20261030000000_certificates.sql.
 *
 * Certificates are issued and verified ONLY by the server. The browser can ask for one, but the
 * server checks the badge's requirement against the player's XP itself, makes the random
 * verification token, and refuses duplicates. Until the migration has been run, every call here
 * reports `missing` and the app shows certificates as "not yet registered" instead of inventing
 * an ID or a QR code.
 */
import { isSupabaseConfigured, supabase } from '../supabaseClient.js'
import { isVerificationToken } from './links.js'
import { DEFAULT_NAME_DISPLAY, isNameDisplay } from './privacy.js'

// "the table / column / function isn't there yet": the migration hasn't been run
const MISSING_CODES = new Set(['42P01', '42703', '42883', 'PGRST202', 'PGRST204', 'PGRST205'])
const isMissing = (error) => MISSING_CODES.has(error?.code)
let warned = false
function warnMissing() {
  if (warned) return
  warned = true
  console.warn('[certificates] Run supabase/migrations/20261030000000_certificates.sql to issue verifiable certificates.')
}

const fail = (error) => {
  if (isMissing(error)) {
    warnMissing()
    return Object.assign(new Error('Certificates are not set up on the server yet.'), { missing: true })
  }
  if (/requirement_not_met/.test(error?.message ?? '')) {
    return Object.assign(new Error('This badge is not unlocked on your account yet.'), { notMet: true })
  }
  return error instanceof Error ? error : Object.assign(new Error(error?.message ?? 'Request failed'), error)
}

/** A database row → what the app uses. Unknown / bad rows → null. */
export function toCertificate(row) {
  if (!row || typeof row !== 'object' || !row.badge_id || !row.certificate_code) return null
  return {
    id: row.id,
    badgeId: row.badge_id,
    code: row.certificate_code,
    token: isVerificationToken(row.verification_token) ? row.verification_token : '',
    studentName: row.student_name ?? '',
    badgeTitle: row.badge_title ?? '',
    badgeDescription: row.badge_description ?? '',
    badgeIcon: row.badge_icon ?? '',
    xpEarned: Number(row.xp_earned) || 0,
    xpLabel: row.xp_label ?? 'XP',
    awardedAt: row.awarded_at,
    issuedAt: row.issued_at,
    isPublic: row.is_public !== false,
    revokedAt: row.revoked_at ?? null,
  }
}

const unavailable = () => Object.assign(new Error('Sign-in is not set up.'), { missing: true })

/** All of the signed-in player's certificates, newest award first. */
export async function listCertificates(userId) {
  if (!isSupabaseConfigured || !userId) throw unavailable()
  const { data, error } = await supabase
    .from('certificates')
    .select('id, badge_id, certificate_code, verification_token, student_name, badge_title, badge_description, badge_icon, xp_earned, xp_label, awarded_at, issued_at, is_public, revoked_at')
    .eq('user_id', userId)
    .order('awarded_at', { ascending: false })
  if (error) throw fail(error)
  return (data ?? []).map(toCertificate).filter(Boolean)
}

/** Issues (or returns the existing) certificate for a badge. Idempotent on the server. */
export async function issueCertificate(badgeId, displayName) {
  if (!isSupabaseConfigured) throw unavailable()
  const { data, error } = await supabase.rpc('issue_certificate', { p_badge_id: badgeId, p_display_name: displayName ?? null })
  if (error) throw fail(error)
  const certificate = toCertificate(data)
  if (!certificate) throw new Error('The server sent back an unexpected certificate.')
  return certificate
}

/** Public check for the verification page. Never throws for a bad token: returns { status }. */
export async function verifyCertificate(token) {
  if (!isVerificationToken(token)) return { status: 'not_found' }
  if (!isSupabaseConfigured) return { status: 'unavailable' }
  const { data, error } = await supabase.rpc('verify_certificate', { p_token: token })
  if (error) {
    if (isMissing(error)) warnMissing()
    return { status: 'unavailable' }
  }
  const status = data?.status
  return ['valid', 'revoked', 'private', 'not_found'].includes(status) ? data : { status: 'not_found' }
}

export async function fetchNameDisplay(userId) {
  if (!isSupabaseConfigured || !userId) throw unavailable()
  const { data, error } = await supabase.from('profiles').select('certificate_name_display').eq('id', userId).maybeSingle()
  if (error) throw fail(error)
  return isNameDisplay(data?.certificate_name_display) ? data.certificate_name_display : DEFAULT_NAME_DISPLAY
}

export async function saveNameDisplay(mode) {
  if (!isNameDisplay(mode)) throw new Error('Unknown name setting')
  if (!isSupabaseConfigured) throw unavailable()
  const { error } = await supabase.rpc('set_certificate_privacy', { p_name_display: mode })
  if (error) throw fail(error)
  return mode
}

export async function saveCertificatePublic(certificateId, isPublic) {
  if (!isSupabaseConfigured) throw unavailable()
  const { error } = await supabase.rpc('set_certificate_public', { p_certificate_id: certificateId, p_public: Boolean(isPublic) })
  if (error) throw fail(error)
  return Boolean(isPublic)
}
