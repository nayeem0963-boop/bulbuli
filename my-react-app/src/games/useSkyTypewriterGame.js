import { useCallback, useState } from 'react'
import { getSkyTypewriterDifficulty } from './skyTypewriterDifficulty.js'
import { calculateSkyTypewriterXp } from './skyTypewriterRewards.js'
import {
  DEFAULT_TARGET_SCORE,
  SKY_TYPEWRITER_STATUS,
  applyKeystroke,
  applyMiss,
  applyPause,
  applyWord,
  createInitialState,
  finishRun,
  isFinished,
  resetRun,
  startRun,
} from './skyTypewriterState.js'

export { SKY_TYPEWRITER_STATUS } from './skyTypewriterState.js'

/**
 * All of a SkyTypewriter flight's state. The rules live in skyTypewriterState.js.
 *
 *   const game = useSkyTypewriterGame({ targetScore: 500 })
 *   game.playAgain()   // fresh PLAYING run: 3 hearts, score 0, new runId → spawner clears its words
 */
export default function useSkyTypewriterGame({ targetScore = DEFAULT_TARGET_SCORE } = {}) {
  const [state, setState] = useState(() => createInitialState())
  const difficulty = getSkyTypewriterDifficulty(state.score)

  const startGame = useCallback(() => setState(startRun), [])
  const playAgain = startGame
  const resetGame = useCallback(() => setState(resetRun), [])

  const recordKeystroke = useCallback((isCorrect) => {
    setState((current) => applyKeystroke(current, isCorrect))
  }, [])

  const recordWord = useCallback((basePoints) => {
    setState((current) => applyWord(current, { basePoints, targetScore }))
  }, [targetScore])

  const loseLife = useCallback(() => setState(applyMiss), [])

  const setPaused = useCallback((paused) => setState((current) => applyPause(current, paused)), [])
  const togglePause = useCallback(() => setState((current) => applyPause(current, !current.paused)), [])

  const endGame = useCallback(() => setState((current) => finishRun(current, SKY_TYPEWRITER_STATUS.GAME_OVER)), [])
  const winGame = useCallback(() => setState((current) => finishRun(current, SKY_TYPEWRITER_STATUS.VICTORY)), [])

  const playing = state.status === SKY_TYPEWRITER_STATUS.PLAYING
  const victory = state.status === SKY_TYPEWRITER_STATUS.VICTORY

  return {
    ...state,
    targetScore,
    difficulty,
    flightSpeed: difficulty.flightSpeed,
    /** True while words should move and keys should count. */
    active: playing && !state.paused,
    finished: isFinished(state.status),
    victory,
    xpReward: calculateSkyTypewriterXp({ ...state, won: victory }),
    startGame,
    playAgain,
    resetGame,
    recordKeystroke,
    recordWord,
    loseLife,
    setPaused,
    togglePause,
    endGame,
    winGame,
  }
}
