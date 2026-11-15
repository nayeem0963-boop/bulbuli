import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BIOMES } from './biomes/index.js'
import { SKY_STATE } from './rendering/daylight.js'
import { glowFalloff, glowStrength } from './playerGlow.js'

test('player glow: only the Sundarbans asks for it, and modestly', () => {
  const glow = BIOMES.sundarbans.playerGlow
  assert.ok(glow, 'the Sundarbans sets a night-time ground glow')
  assert.equal(BIOMES.amazon.playerGlow, undefined)
  assert.equal(BIOMES.sahara.playerGlow, undefined)
  // a pool round the bird, not a floodlight: under two metres across each way, well short of opaque
  assert.ok(glow.radius >= 1 && glow.radius <= 2, `radius ${glow.radius} m`)
  assert.ok(glow.opacity > 0.15 && glow.opacity <= 0.5, `opacity ${glow.opacity}`)
  assert.match(glow.color, /^#[0-9a-f]{6}$/i)
})

test('player glow: nothing by day, a little at dusk, full only at night; faint under a flying bird', () => {
  assert.equal(glowStrength(1, true), 0, 'daylight is untouched')
  assert.ok(glowStrength(0.9, true) < 0.03, 'high daylight is effectively untouched')
  assert.ok(glowStrength(0.5, true) > 0.2 && glowStrength(0.5, true) < 0.45, 'twilight gets part of it')
  assert.equal(glowStrength(0, true), 1)
  let previous = 0
  for (let d = 1; d >= 0; d -= 0.05) {
    const s = glowStrength(d, true)
    assert.ok(s >= previous - 1e-9 && s >= 0 && s <= 1, 'it only grows as the light goes')
    previous = s
  }
  assert.ok(glowStrength(0, false) <= 0.3, 'in the air the pool is faint')
  assert.equal(glowStrength(-1, true), 1)
  assert.equal(glowStrength(2, true), 0)
})

test('player glow: the pool fades smoothly to nothing at its rim', () => {
  assert.equal(glowFalloff(0), 1)
  assert.equal(glowFalloff(1), 0)
  assert.equal(glowFalloff(1.5), 0)
  let previous = 1
  for (let t = 0; t <= 1; t += 0.05) {
    assert.ok(glowFalloff(t) <= previous + 1e-9)
    previous = glowFalloff(t)
  }
  assert.ok(glowFalloff(0.7) < 0.06 && glowFalloff(0.85) < 0.01, 'no visible edge')
  assert.ok(glowFalloff(0.25) > 0.6, 'the light sits under the bird')
})

test('player glow: it is an unlit disc, not a light, and the sky state starts in daylight', () => {
  assert.equal(SKY_STATE.daylight, 1)
  const source = readFileSync(new URL('./PlayerGlow.jsx', import.meta.url), 'utf8')
  assert.ok(!/pointLight|spotLight|directionalLight|PointLight|SpotLight/.test(source), 'no real-time light is added')
  assert.ok(/meshBasicMaterial/.test(source) && /depthWrite=\{false\}/.test(source))
})
