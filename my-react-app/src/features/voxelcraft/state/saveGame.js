import { MAX_SAVED_LEVELS, isPublishedHere, sanitizeEntry } from '../community/creatorStorage.js'
import { APPEAL_PRESETS } from '../community/simulation.js'
import { xpForLevel } from '../data/mockData.js'
import { parseLevel } from '../level/levelSchema.js'
import { KNOWN_BADGES } from '../profile/achievements.js'
import { COSMETIC_BY_ID, DEFAULT_LOOK, SLOTS, isHex } from '../profile/cosmetics.js'
import { STORAGE_KEYS, getStorage } from './storageKeys.js'

/**
 * Local save game (localStorage). There's no backend yet, so this is what keeps a player's
 * progress between visits:
 *
 *   bulbuli_voxelcraft_save_v1    player progress (level, XP, gems, badges, medals, best
 *                                 times), unlocked + equipped cosmetics, votes cast, published
 *                                 levels, settled contests, Dev / Test Mode settings
 *   bulbuli_voxelcraft_studio_v1  the level open in the Build Studio (work in progress)
 *
 * (All keys live in storageKeys.js, prefixed so they never collide with Bulbuli's own data.)
 *
 * Everything read back is untrusted (it's just text the user can edit): numbers are clamped,
 * ids are checked against the catalogues, levels go through parseLevel/validateLevel. A
 * corrupt or missing save means a fresh start, never a crash. Storage can be unavailable
 * (private mode, quota, Node tests); every access is wrapped.
 *
 * NOTE: a local save can be edited, so gems and unlocks here are trust-the-client. When a server
 * exists it must own the economy; this file then becomes a cache.
 */
export const SAVE_KEY = STORAGE_KEYS.save
export const STUDIO_KEY = STORAGE_KEYS.studio
// Publish data from the very first standalone build ({ version: 1 }): read once, migrated, removed.
export const LEGACY_KEY = 'voxelcraft:creator:v1'

const MAX_GEMS = 10_000_000
const MAX_LEVEL = 999

export const storage = getStorage

const readJson = (key) => {
  const s = storage()
  if (!s) return null
  try {
    return JSON.parse(s.getItem(key) ?? 'null')
  } catch {
    return null
  }
}

const int = (v, lo, hi, fallback) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.floor(v))) : fallback)
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '')
const plainObject = (v) => v && typeof v === 'object' && !Array.isArray(v)

// ---- sanitizers --------------------------------------------------------------------------
function sanitizePlayer(p) {
  if (!plainObject(p)) return {}
  const level = int(p.level, 1, MAX_LEVEL, undefined)
  const out = {}
  if (level !== undefined) {
    out.level = level
    out.xp = int(p.xp, 0, xpForLevel(level) - 1, 0)
  }
  const gems = int(p.gems, 0, MAX_GEMS, undefined)
  if (gems !== undefined) out.gems = gems
  if (Array.isArray(p.badges)) out.badges = p.badges.filter((b) => KNOWN_BADGES.has(b))
  if (Array.isArray(p.medals)) {
    out.medals = p.medals
      .filter((m) => plainObject(m) && [1, 2, 3].includes(m.place) && typeof m.contestId === 'string')
      .slice(0, 50)
      .map((m) => ({ contestId: str(m.contestId, 80), theme: str(m.theme, 60), place: m.place, at: int(m.at, 0, 8.64e15, 0), levelTitle: str(m.levelTitle, 40) }))
  }
  if (plainObject(p.beaten)) {
    out.beaten = Object.fromEntries(
      Object.entries(p.beaten)
        .filter(([id, ms]) => id.length <= 80 && Number.isFinite(ms) && ms > 0)
        .slice(0, 500)
        .map(([id, ms]) => [id, Math.round(ms)]),
    )
  }
  return out
}

function sanitizeCosmetics(c) {
  if (!plainObject(c)) return null
  const unlocked = (Array.isArray(c.unlocked) ? c.unlocked : []).filter((id) => COSMETIC_BY_ID[id]?.unlock.type === 'gems')
  const equipped = {}
  for (const { id: slot } of SLOTS) {
    const e = plainObject(c.equipped) ? c.equipped[slot] : null
    const item = COSMETIC_BY_ID[e?.item]
    equipped[slot] = {
      item: item && item.slot === slot ? item.id : DEFAULT_LOOK[slot].item,
      color: isHex(e?.color) ? e.color.toLowerCase() : DEFAULT_LOOK[slot].color,
    }
  }
  return { unlocked: [...new Set(unlocked)], equipped }
}

function sanitizeVotes(v) {
  if (!plainObject(v)) return {}
  return Object.fromEntries(
    Object.entries(v)
      .filter(([id, x]) => id.length <= 80 && plainObject(x))
      .slice(0, 2000)
      .map(([id, x]) => [id, { voted: x.voted === true, rewarded: x.rewarded === true }]),
  )
}

/** Dev / Test Mode settings. Anything unexpected → simulation off. */
function sanitizeSim(v) {
  if (!plainObject(v)) return null
  return {
    enabled: v.enabled === true,
    appeal: APPEAL_PRESETS.some((a) => a.id === v.appeal) ? v.appeal : 'normal',
    seed: int(v.seed, 0, 4294967295, 0x5eed),
    simulatedHours: int(v.simulatedHours, 0, 1e7, 0),
  }
}

const sanitizeLevels = (levels, handle) =>
  (Array.isArray(levels) ? levels : []).slice(0, MAX_SAVED_LEVELS).map((e) => sanitizeEntry(e, handle)).filter(Boolean)

const strings = (a, max = 200) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string' && x.length <= 80).slice(0, max) : [])

/**
 * Reads the save (migrating the previous build's publish data if that's all there is).
 * @returns {null | { player, cosmetics, votes, levels, publishedIds, pastContests, sim }}
 */
export function loadSave(handle) {
  const raw = readJson(SAVE_KEY)
  if (plainObject(raw) && raw.version === 2) {
    return {
      player: sanitizePlayer(raw.player),
      cosmetics: sanitizeCosmetics(raw.cosmetics),
      votes: sanitizeVotes(raw.votes),
      levels: sanitizeLevels(raw.levels, handle),
      publishedIds: strings(raw.publishedIds),
      sim: sanitizeSim(raw.sim),
      pastContests: (Array.isArray(raw.pastContests) ? raw.pastContests : [])
        .filter((c) => plainObject(c) && typeof c.id === 'string')
        .slice(0, 10)
        .map((c) => ({
          id: str(c.id, 80),
          theme: str(c.theme, 60),
          endedAt: int(c.endedAt, 0, 8.64e15, 0),
          entries: int(c.entries, 0, 1e6, 0),
          myRank: Number.isInteger(c.myRank) && c.myRank > 0 ? c.myRank : null,
          podium: (Array.isArray(c.podium) ? c.podium : []).slice(0, 3).map((p) => ({ title: str(p?.title, 40), author: str(p?.author, 32), votes: int(p?.votes, 0, 1e9, 0) })),
        })),
    }
  }
  const legacy = readJson(LEGACY_KEY) // v1: { version: 1, levels, badges, publishedIds }
  if (plainObject(legacy) && legacy.version === 1) {
    return {
      player: sanitizePlayer({ badges: legacy.badges }),
      cosmetics: null,
      votes: {},
      levels: sanitizeLevels(legacy.levels, handle),
      publishedIds: strings(legacy.publishedIds),
      sim: null,
      pastContests: [],
    }
  }
  return null
}

/** The slice of game state that's saved. */
export function selectSaveData(state) {
  const { player, cosmetics, community, studio, sim } = state
  const votes = {}
  for (const l of community.levels) {
    if (l.author !== player.handle && (l.votedByMe || l.voteRewarded)) votes[l.id] = { voted: l.votedByMe, rewarded: l.voteRewarded }
  }
  return {
    version: 2,
    player: { level: player.level, xp: player.xp, gems: player.gems, badges: player.badges, medals: player.medals, beaten: player.beaten },
    cosmetics,
    votes,
    levels: community.levels
      .filter((l) => isPublishedHere(l, player.handle))
      .slice(0, MAX_SAVED_LEVELS)
      // eslint-disable-next-line no-unused-vars
      .map(({ votedByMe, voteRewarded, ...entry }) => entry),
    publishedIds: studio.publishedIds,
    pastContests: community.pastContests,
    sim,
  }
}

/**
 * Writes the save. If storage is full, retries without level thumbnails (the gallery falls back
 * to SVG previews). Returns 'saved' | 'saved-without-thumbnails' | 'failed'.
 */
export function writeSave(data) {
  const s = storage()
  if (!s) return 'failed'
  try {
    s.setItem(SAVE_KEY, JSON.stringify(data))
    s.removeItem(LEGACY_KEY) // migrated
    return 'saved'
  } catch {
    try {
      s.setItem(SAVE_KEY, JSON.stringify({ ...data, levels: data.levels.map((l) => ({ ...l, thumbnail: null })) }))
      return 'saved-without-thumbnails'
    } catch {
      return 'failed'
    }
  }
}

// ---- Studio work in progress -------------------------------------------------------------
/** The level last open in the Studio, validated; null if none / corrupt. */
export function loadStudioLevel() {
  const raw = readJson(STUDIO_KEY)
  if (!plainObject(raw)) return null
  try {
    return parseLevel(raw).level
  } catch {
    return null
  }
}

export function saveStudioLevel(level) {
  const s = storage()
  if (!s) return false
  try {
    s.setItem(STUDIO_KEY, JSON.stringify(level))
    return true
  } catch {
    return false
  }
}

/** "Reset progress": forget everything this device saved. */
export function clearSave() {
  const s = storage()
  if (!s) return
  for (const key of [SAVE_KEY, STUDIO_KEY, LEGACY_KEY]) {
    try {
      s.removeItem(key)
    } catch {
      // ignore
    }
  }
}
