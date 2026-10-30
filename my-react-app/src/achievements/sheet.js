/**
 * Everything printed on a certificate or share image, in one plain object, from real data only:
 * the issued certificate (server snapshot) when there is one, otherwise the badge and the
 * player's profile. Pure, so it can be tested.
 */
import { formatDate } from '../dashboard/format.js'
import { emblemFor } from './emblems.js'
import { certificateUrl } from './links.js'

const count = (n) => Math.max(0, Math.floor(Number(n) || 0))

/**
 * XP shown when no certificate has been issued: the game's XP for game badges, else total XP.
 * `gameName(id)` gives a game's display name (the caller passes the registry lookup).
 */
export function xpFor(badge, profile, gameName = () => null) {
  const gameId = badge?.requirement?.gameId
  if (gameId && ['game_xp', 'game_plays'].includes(badge.requirement.type)) {
    return { xp: count(profile?.stats?.[gameId]?.xp), label: `${gameName(gameId) ?? 'Game'} XP` }
  }
  return { xp: count(profile?.xp), label: 'Total XP' }
}

/**
 * @returns {{ studentName, badgeId, badgeTitle, badgeDescription, badgeIcon, emblem, category, xpEarned,
 *             xpLabel, awardedAt, awardedLabel, code, verifyUrl, revoked }}
 */
export function buildSheet({ badge, certificate = null, unlockedAt, profile, playerName, gameName }) {
  const fallbackXp = xpFor(badge, profile, gameName)
  const awardedAt = certificate?.awardedAt ?? unlockedAt ?? null
  return {
    studentName: (certificate?.studentName || playerName || 'Bulbuli Learner').trim(),
    badgeId: badge?.id ?? certificate?.badgeId ?? '',
    badgeTitle: certificate?.badgeTitle || badge?.title || 'Achievement',
    badgeDescription: certificate?.badgeDescription || badge?.description || '',
    badgeIcon: badge?.icon || certificate?.badgeIcon || '★',
    emblem: emblemFor(badge ?? { id: certificate?.badgeId }), // vector medal emblem (no emoji)
    category: badge?.category ?? 'mastery',
    xpEarned: certificate ? count(certificate.xpEarned) : fallbackXp.xp,
    xpLabel: certificate?.xpLabel || fallbackXp.label,
    awardedAt,
    awardedLabel: formatDate(awardedAt, 'en-GB'), // 28 Oct 2026: reads the same everywhere
    code: certificate?.code ?? '',
    verifyUrl: certificate && !certificate.revokedAt ? certificateUrl(certificate.token) : '',
    revoked: Boolean(certificate?.revokedAt),
  }
}
