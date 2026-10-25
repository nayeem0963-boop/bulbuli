import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SKY_TYPEWRITER_STATUS as S,
  INITIAL_LIVES,
  applyKeystroke,
  applyMiss,
  applyPause,
  applyWord,
  comboMultiplier,
  createInitialState,
  resetRun,
  startRun,
} from './skyTypewriterState.js'

const playing = () => startRun(createInitialState())

test('start and play again give a fresh PLAYING run with full hearts and a new runId', () => {
  let state = playing()
  state = applyWord(applyMiss(applyMiss(applyMiss(state))))
  assert.equal(state.status, S.GAME_OVER)

  const again = startRun(state)
  assert.equal(again.status, S.PLAYING)
  assert.equal(again.lives, INITIAL_LIVES)
  assert.equal(again.score, 0)
  assert.equal(again.combo, 0)
  assert.equal(again.wordsTyped, 0)
  assert.equal(again.paused, false)
  assert.equal(again.runId, state.runId + 1)
})

test('losing the last heart ends the flight and nothing changes after that', () => {
  let state = playing()
  state = applyMiss(applyMiss(state))
  assert.equal(state.status, S.PLAYING)
  state = applyMiss(state)
  assert.equal(state.status, S.GAME_OVER)
  assert.equal(state.lives, 0)
  assert.deepEqual(applyWord(applyKeystroke(applyMiss(state), true)), state)
})

test('reaching the target score is a victory', () => {
  let state = playing()
  state = applyWord(state, { targetScore: 30 })
  state = applyWord(state, { targetScore: 30 })
  assert.equal(state.status, S.PLAYING)
  state = applyWord(state, { targetScore: 30 })
  assert.equal(state.status, S.VICTORY)
})

test('combo grows the points per word, a miss resets it, and the multiplier is capped', () => {
  assert.equal(comboMultiplier(1), 1)
  assert.equal(comboMultiplier(2), 1.2)
  assert.equal(comboMultiplier(99), 2)

  let state = applyWord(applyWord(playing()))
  assert.equal(state.score, 10 + 12)
  assert.equal(state.combo, 2)
  state = applyMiss(state)
  assert.equal(state.combo, 0)
  assert.equal(state.bestCombo, 2)
})

test('a paused game ignores keys, words and misses', () => {
  const paused = applyPause(playing(), true)
  assert.deepEqual(applyMiss(applyWord(applyKeystroke(paused, true))), paused)
  assert.equal(applyPause(paused, false).paused, false)
})

test('accuracy is correct keystrokes over all keystrokes', () => {
  let state = playing()
  state = applyKeystroke(applyKeystroke(applyKeystroke(applyKeystroke(state, true), true), true), false)
  assert.equal(state.accuracy, 75)
})

test('reset returns to the start screen with a new runId', () => {
  const state = resetRun(applyWord(playing()))
  assert.equal(state.status, S.IDLE)
  assert.equal(state.score, 0)
})
