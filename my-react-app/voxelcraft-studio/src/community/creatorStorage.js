import { TITLE_MAX, parseLevel, validateLevel } from '../level/levelSchema.js'

/**
 * Validation for the player's published gallery entries as they come back from storage
 * (see src/state/saveGame.js, which owns reading and writing localStorage).
 *
 * Anything read back is treated as untrusted: levels go through parseLevel + validateLevel,
 * strings are trimmed to size, and thumbnails must be image data URLs.
 */
export const DIFFICULTIES = ['Easy', 'Medium', 'Hard']
export const DESCRIPTION_MAX = 200
export const MAX_SAVED_LEVELS = 25
const MAX_THUMB_CHARS = 250_000 // ~180 KB image; a 480×360 WebP is usually 15–40 KB

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '')
const isThumb = (v) => typeof v === 'string' && /^data:image\/(webp|jpeg|png);base64,/.test(v) && v.length <= MAX_THUMB_CHARS
const num = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0)

/** Cleans one stored gallery entry; returns null if it isn't a valid, publishable level. */
export function sanitizeEntry(raw, handle) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !raw.id.startsWith('ugc_')) return null
  let level
  try {
    level = parseLevel(raw.level).level
  } catch {
    return null
  }
  const title = str(raw.title, TITLE_MAX).trim() || level.title
  level = { ...level, title, author: handle }
  if (validateLevel(level).length) return null
  return {
    id: raw.id.slice(0, 80),
    title,
    author: handle,
    description: str(raw.description, DESCRIPTION_MAX),
    difficulty: DIFFICULTIES.includes(raw.difficulty) ? raw.difficulty : null,
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t) => typeof t === 'string').slice(0, 4).map((t) => t.slice(0, 16)) : ['New'],
    votes: num(raw.votes),
    plays: num(raw.plays),
    createdAt: num(raw.createdAt) || Date.now(),
    contestId: typeof raw.contestId === 'string' ? raw.contestId.slice(0, 80) : null,
    thumbnail: isThumb(raw.thumbnail) ? raw.thumbnail : null,
    level,
    votedByMe: false,
    voteRewarded: false,
  }
}

/** Levels published from this Studio (ids are `ugc_…`); built-in mock levels are never saved. */
export const isPublishedHere = (entry, handle) => entry.author === handle && entry.id.startsWith('ugc_')
