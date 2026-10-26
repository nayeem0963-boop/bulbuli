import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_LOADOUT, getItem } from '../config/catalog'

/*
 * Player profile — persisted to localStorage via zustand/persist.
 *   name, wallet (banked crystals), owned items, equipped loadout,
 *   lifetime stats, mobile control preferences.
 * `preview` (Vault try-on) is deliberately NOT persisted.
 */

const FREE_ITEMS = Object.values(DEFAULT_LOADOUT)
const SURGE_BONUS = 5 // crystals banked per Neon Surge

export const useProfileStore = create(
  persist(
    (set, get) => ({
      name: '',
      wallet: 0,
      lifetimeCrystals: 0,
      owned: FREE_ITEMS,
      equipped: { ...DEFAULT_LOADOUT },
      preview: null,                 // { slot, id } while browsing the Vault
      stats: { runs: 0, totalDistance: 0, totalTimeMs: 0, bestScore: 0, topSpeedKmh: 0 },
      controls: { layout: 'both', handed: 'right', haptics: true }, // layout: both | swipe | buttons

      setName: (name) => set({ name: name.replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 16) }),

      /** Bank a finished run's crystals (+ surge bonus). Returns the amount banked. */
      bankRun: (run) => {
        const earned = run.crystals + run.surges * SURGE_BONUS
        set((s) => ({
          wallet: s.wallet + earned,
          lifetimeCrystals: s.lifetimeCrystals + earned,
          stats: {
            runs: s.stats.runs + 1,
            totalDistance: s.stats.totalDistance + Math.floor(run.distance),
            totalTimeMs: s.stats.totalTimeMs + Math.round(run.timeMs),
            bestScore: Math.max(s.stats.bestScore, run.score),
            topSpeedKmh: Math.max(s.stats.topSpeedKmh, Math.round(run.maxSpeedKmh)),
          },
        }))
        return earned
      },

      /** → { ok: true } | { ok: false, reason: 'owned' | 'funds' | 'unknown' } */
      purchase: (id) => {
        const item = getItem(id)
        const { owned, wallet } = get()
        if (!item) return { ok: false, reason: 'unknown' }
        if (owned.includes(id)) return { ok: false, reason: 'owned' }
        if (wallet < item.price) return { ok: false, reason: 'funds' }
        set({ wallet: wallet - item.price, owned: [...owned, id] })
        get().equip(id)
        return { ok: true }
      },

      equip: (id) => {
        const item = getItem(id)
        if (!item || !get().owned.includes(id)) return false
        set((s) => ({ equipped: { ...s.equipped, [item.slot]: id }, preview: null }))
        return true
      },

      setPreview: (id) => {
        const item = id && getItem(id)
        set({ preview: item ? { slot: item.slot, id } : null })
      },

      setControls: (patch) => set((s) => ({ controls: { ...s.controls, ...patch } })),
    }),
    {
      name: 'neonVelocity.profile',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ preview, ...rest }) => rest, // never persist the try-on
      merge: (persisted, current) => {
        const merged = { ...current, ...persisted }
        // Guard against removed catalog items in old saves
        merged.owned = [...new Set([...FREE_ITEMS, ...(merged.owned ?? []).filter((id) => getItem(id))])]
        for (const [slot, id] of Object.entries(merged.equipped ?? {})) {
          if (!merged.owned.includes(id)) merged.equipped[slot] = DEFAULT_LOADOUT[slot]
        }
        merged.controls = { ...current.controls, ...merged.controls }
        return merged
      },
    },
  ),
)

/** Resolved loadout items, with any Vault preview applied on top of what's equipped. */
export function resolveLoadout({ equipped, preview }) {
  const ids = { ...equipped }
  if (preview) ids[preview.slot] = preview.id
  return { skin: getItem(ids.skin), trail: getItem(ids.trail), wings: getItem(ids.wings) }
}
