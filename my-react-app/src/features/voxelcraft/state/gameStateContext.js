/**
 * Contexts and hooks for the Voxelcraft game state. <GameStateProvider> (GameStateProvider.jsx)
 * fills them; keeping them here lets that file export only a component (Fast Refresh boundary).
 * State and dispatch are separate contexts so components that only fire actions don't re-render
 * when XP ticks.
 */
import { createContext, useContext, useMemo } from 'react'
import { createInitialGameState } from './gameReducer.js'
import { clearSave } from './saveGame.js'

export const GameStateContext = createContext(null)
export const GameDispatchContext = createContext(null)

export function useGameState() {
  const ctx = useContext(GameStateContext)
  if (!ctx) throw new Error('useGameState must be used inside <GameStateProvider>')
  return ctx
}

export function useGameDispatch() {
  const ctx = useContext(GameDispatchContext)
  if (!ctx) throw new Error('useGameDispatch must be used inside <GameStateProvider>')
  return ctx
}

/** Named action creators, so components never hand-write action objects. */
export function useGameActions() {
  const dispatch = useGameDispatch()
  return useMemo(
    () => ({
      setTab: (tab) => dispatch({ type: 'tab/set', tab }),
      reward: (reward, reason) => dispatch({ type: 'player/reward', reward, reason }),
      /** publishBuild(level, { description, difficulty, contest, thumbnail }) */
      publishBuild: (level, meta = {}) => dispatch({ type: 'studio/publish', level, ...meta }),
      clearHighlight: () => dispatch({ type: 'community/clearHighlight' }),
      submitContestEntry: (level) => dispatch({ type: 'community/submit', level }),
      toggleVote: (id) => dispatch({ type: 'community/toggleVote', id }),
      recordPlay: (id) => dispatch({ type: 'community/recordPlay', id }),
      dismissToast: (id) => dispatch({ type: 'toast/dismiss', id }),
      levelBeaten: (levelId, title, ms) => dispatch({ type: 'player/levelBeaten', levelId, title, ms }),
      settleContest: () => dispatch({ type: 'contest/settle' }),
      // Dev / Test Mode (simulated community voters)
      configureSim: (patch) => dispatch({ type: 'sim/configure', ...patch }),
      simTick: (hours = 1) => dispatch({ type: 'sim/tick', hours }),
      fastForwardContest: () => dispatch({ type: 'contest/fastForward' }),
      buyCosmetic: (itemId) => dispatch({ type: 'cosmetics/buy', itemId }),
      equipCosmetic: (itemId) => dispatch({ type: 'cosmetics/equip', itemId }),
      setCosmeticColor: (slot, color) => dispatch({ type: 'cosmetics/color', slot, color }),
      /** Wipes this device's save and starts over (the Studio is reset by its own provider). */
      resetProgress: () => {
        clearSave()
        dispatch({ type: 'state/replace', state: createInitialGameState(Date.now(), null) })
      },
    }),
    [dispatch],
  )
}
