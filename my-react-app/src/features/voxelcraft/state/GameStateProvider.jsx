import { useEffect, useReducer, useRef } from 'react'
import { mockPlayer } from '../data/mockData.js'
import { createInitialGameState, gameReducer } from './gameReducer.js'
import { loadSave, selectSaveData, writeSave } from './saveGame.js'

import { GameDispatchContext, GameStateContext } from './gameStateContext.js'

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
