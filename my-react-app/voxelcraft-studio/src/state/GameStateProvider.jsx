import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { mockPlayer } from '../data/mockData.js'
import { createInitialGameState, gameReducer } from './gameReducer.js'
import { clearSave, loadSave, selectSaveData, writeSave } from './saveGame.js'

const GameStateContext = createContext(null)
const GameDispatchContext = createContext(null)

/**
 * Holds all mock game state in one reducer. State and dispatch live in separate contexts so
 * components that only fire actions (buttons) don't re-render when XP ticks.
 * Progress, gems, unlocks, votes and published levels persist in localStorage (saveGame.js),
 * so they survive a reload. To go live: hydrate the state from the API instead and mirror
 * actions to it in a middleware.
 */
const loadInitialState = () => createInitialGameState(Date.now(), loadSave(mockPlayer.handle))

export function GameStateProvider({ children, initialState }) {
  const [state, dispatch] = useReducer(gameReducer, initialState, (s) => s ?? loadInitialState())

  // Persist whenever the saved slice changes (tab switches and toasts don't write).
  const lastSaved = useRef(null)
  const { player, cosmetics, community, studio, sim } = state
  useEffect(() => {
    const data = selectSaveData({ player, cosmetics, community, studio, sim })
    const json = JSON.stringify(data)
    if (lastSaved.current === null) {
      lastSaved.current = json // first render: this is what we just loaded
      return
    }
    if (json === lastSaved.current) return
    lastSaved.current = json
    writeSave(data)
  }, [player, cosmetics, community, studio, sim])

  return (
    <GameDispatchContext.Provider value={dispatch}>
      <GameStateContext.Provider value={state}>{children}</GameStateContext.Provider>
    </GameDispatchContext.Provider>
  )
}

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
