import test from 'node:test'
import assert from 'node:assert/strict'
import { AMAZON_FAUNA } from './amazonFauna.js'
import { LEG_MOTION, WING_MOTION, hasMotion, motionGlsl, patchShader } from './amazonMotion.js'

test('every roaming gait and every flyer kind has limb motion; static ones have none', () => {
  for (const kind of ['jaguar', 'ocelot', 'armadillo', 'capuchin']) assert.ok(LEG_MOTION[kind] && AMAZON_FAUNA[kind], kind)
  for (const kind of ['macaw', 'blueMacaw', 'scarletMacaw', 'toucan', 'morpho']) assert.ok(WING_MOTION[kind] && AMAZON_FAUNA[kind], kind)
  assert.equal(hasMotion('anaconda'), false)
  assert.equal(motionGlsl('anaconda'), '')
})

test('the patch adds the uniforms once and moves `transformed`, never `position`', () => {
  const shader = { uniforms: {}, vertexShader: '#include <common>\nvoid main() {\n#include <begin_vertex>\n}' }
  const uniforms = { uPh: { value: 0 }, uAmp: { value: 1 } }
  patchShader(shader, 'jaguar', uniforms)
  assert.equal(shader.uniforms.uPh, uniforms.uPh)
  assert.equal(shader.vertexShader.match(/uniform float uPh/g).length, 1)
  assert.match(shader.vertexShader, /transformed\.z \+=/)
  assert.doesNotMatch(shader.vertexShader, /position\.[xyz] \+=|position = /)
})
