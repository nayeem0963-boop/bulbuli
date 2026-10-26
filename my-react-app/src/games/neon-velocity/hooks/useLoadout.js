import { useShallow } from 'zustand/react/shallow'
import { resolveLoadout, useProfileStore } from '../stores/useProfileStore'

/** Equipped items with any Vault try-on applied. Re-renders only when an item changes. */
export const useLoadout = () => useProfileStore(useShallow((s) => resolveLoadout(s)))

/** Non-reactive read for per-frame code. */
export const getLoadout = () => resolveLoadout(useProfileStore.getState())
