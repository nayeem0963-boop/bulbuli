import test from 'node:test'
import assert from 'node:assert/strict'
import { AMAZON_FAUNA } from './amazonFauna.js'
import { LEG_MOTION, WING_MOTION, hasMotion, makeMotion, motionGlsl, patchShader } from './amazonMotion.js'

test('every roaming gait and every flyer kind has limb motion; static ones have none', () => {
  for (const kind of ['jaguar', 'ocelot', 'armadillo', 'capuchin']) assert.ok(LEG_MOTION[kind] && AMAZON_FAUNA[kind], kind)
  for (const kind of ['macaw', 'blueMacaw', 'scarletMacaw', 'toucan', 'morpho']) assert.ok(WING_MOTION[kind] && AMAZON_FAUNA[kind], kind)
  assert.equal(hasMotion('nothing'), false)
  assert.equal(motionGlsl('nothing'), '')
})

test('the patch adds the uniforms once and moves `transformed`, never `position`', () => {
  const shader = { uniforms: {}, vertexShader: '#include <common>\nvoid main() {\n#include <begin_vertex>\n}' }
  const uniforms = { uPh: { value: 0 }, uAmp: { value: 1 } }
  patchShader(shader, 'jaguar', uniforms)
  assert.equal(shader.uniforms.uPh, uniforms.uPh)
  assert.equal(shader.vertexShader.match(/uniform float uPh/g).length, 1)
  assert.match(shader.vertexShader, /transformed\.xz \+=/)
  assert.doesNotMatch(shader.vertexShader, /position\.[xyz] \+=|position = /)
})

test('the hoppers and the turned jaguar have their own motion', () => {
  assert.match(motionGlsl('hoatzin'), /mHop/)
  assert.match(motionGlsl('harpyEagle'), /sign\(position\.x\)/)
  assert.match(motionGlsl('jaguar'), /transformed\.xz \+= mA/)
  assert.ok(Math.abs(LEG_MOTION.jaguar.yaw + 0.52) < 1e-9)
})

test('fixed animals have idle motion that only runs while `uIdle` is up', () => {
  assert.match(motionGlsl('jaguar'), /iTail/)
  assert.match(motionGlsl('anaconda'), /uIdle \* sin\(position\.z/)
  assert.match(motionGlsl('capuchin'), /iAng/)
  assert.match(motionGlsl('harpyEagle'), /iRuf/)
  for (const kind of ['jaguar', 'anaconda', 'capuchin', 'harpyEagle', 'hoatzin', 'fish']) assert.ok(hasMotion(kind), kind)
  assert.equal(makeMotion().uIdle.value, 0, 'idle is off until a fixed animal turns it on')
})
