import { create } from 'zustand'
import { Slot } from '../config/catalog'

/** Overlay / navigation state that isn't gameplay. */
export const useUiStore = create((set) => ({
  vaultOpen: false,
  vaultTab: Slot.SKIN,
  postGameTab: 'run',      // 'run' | 'rankings' (mobile tabs; desktop shows both)
  rankingScope: 'global',  // 'global' | 'local'
  settingsOpen: false,

  openVault: (tab) => set((s) => ({ vaultOpen: true, vaultTab: tab ?? s.vaultTab })),
  closeVault: () => set({ vaultOpen: false }),
  setVaultTab: (vaultTab) => set({ vaultTab }),
  setPostGameTab: (postGameTab) => set({ postGameTab }),
  setRankingScope: (rankingScope) => set({ rankingScope }),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
}))
