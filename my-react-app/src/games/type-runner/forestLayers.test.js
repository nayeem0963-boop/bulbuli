import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addBurst, FOREST_LAYERS, FOREST_MOTION, stepScroll } from './forestLayers.js'

test('layers go back to front, slower to faster, and nothing is drawn over the bird', () => {
  const speeds = FOREST_LAYERS.map((layer) => layer.speed)
  assert.deepEqual([...speeds].sort((a, b) => a - b), speeds)
  assert.equal(FOREST_LAYERS.filter((layer) => layer.front).length, 0)
  assert.equal(FOREST_LAYERS.at(-1).speed, 1, 'the path layer moves with the runner')
  for (const layer of FOREST_LAYERS) assert.match(layer.src, /^\/forest\/.+\.webp$/)
})

const run = (state, seconds, running) => {
  for (let t = 0; t < seconds; t += 1 / 60) state = stepScroll(state, { dt: 1 / 60, running })
  return state
}

test('the forest eases up to cruising speed, keeps scrolling, and stops when the race ends', () => {
  let state = run({ scroll: 0, speed: 0 }, 3, true)
  assert.ok(Math.abs(state.speed - FOREST_MOTION.cruise) < 0.5)
  assert.ok(state.scroll > 50)
  state = run(state, 3, false)
  assert.ok(state.speed < 0.5)
  const stopped = run(state, 1, false)
  assert.ok(stopped.scroll - state.scroll < 1)
})

test('a correct key gives a burst that eases back, never above the top speed', () => {
  const burst = addBurst(FOREST_MOTION.cruise)
  assert.equal(burst, FOREST_MOTION.cruise + FOREST_MOTION.burst)
  assert.ok(run({ scroll: 0, speed: burst }, 2, true).speed < FOREST_MOTION.cruise + 2)
  let speed = 0
  for (let i = 0; i < 20; i += 1) speed = addBurst(speed)
  assert.equal(speed, FOREST_MOTION.maxSpeed)
})
