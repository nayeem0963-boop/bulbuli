import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  check, cssRule, cssValue, isUnlocked, LEVELS, PROPERTIES, setValue, startValues, starsFor, targetValues, toStyle, xpFor,
} from './engine.js'

const allowed = (prop, value) => {
  const spec = PROPERTIES[prop]
  if (spec.control === 'slider') return value >= spec.min && value <= spec.max && (value - spec.min) % spec.step === 0
  return spec.options.includes(value)
}

test('every level starts unsolved, and the target is reachable with its own controls', () => {
  for (const level of LEVELS) {
    assert.equal(check(level, startValues(level)).solved, false, `level ${level.id}`)
    for (const el of level.elements) {
      assert.deepEqual(Object.keys(el.start).sort(), [...el.controls].sort(), `level ${level.id} ${el.key} start`)
      assert.deepEqual(Object.keys(el.target).sort(), [...el.controls].sort(), `level ${level.id} ${el.key} target`)
      for (const prop of el.controls) {
        assert.ok(PROPERTIES[prop], prop)
        assert.ok(allowed(prop, el.start[prop]) && allowed(prop, el.target[prop]), `level ${level.id} ${prop} on the control`)
      }
    }
    let values = startValues(level)
    for (const el of level.elements) for (const prop of el.controls) values = setValue(level, values, el.key, prop, el.target[prop])
    assert.ok(check(level, values).solved, `level ${level.id} solvable`)
    assert.deepEqual(values, targetValues(level))
  }
})

test('levels follow the brief: flex alignment, centring, spacing, grid, card styling', () => {
  const controls = LEVELS.map((level) => level.elements.flatMap((el) => el.controls).join('+'))
  assert.deepEqual(controls, [
    'justifyContent', 'justifyContent+alignItems', 'justifyContent+gap', 'display+columns+gap', 'borderRadius+padding+backgroundColor',
  ])
})

test('check gives per-property results and says "more" or "less" for numbers', () => {
  const level = LEVELS[3]
  let values = setValue(level, startValues(level), 'cards', 'display', 'grid')
  values = setValue(level, values, 'cards', 'gap', 24)
  const { solved, results } = check(level, values)
  assert.equal(solved, false)
  assert.deepEqual(results.map((r) => [r.prop, r.ok, r.hint]), [['display', true, null], ['columns', false, null], ['gap', false, 'less']])
})

test('fixed declarations cannot be changed', () => {
  const level = LEVELS[0]
  const values = startValues(level)
  assert.equal(setValue(level, values, 'row', 'display', 'block'), values)
})

test('inline styles and CSS text match what a developer would write', () => {
  assert.deepEqual(toStyle({ display: 'grid', columns: 2, gap: 16 }), { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' })
  assert.deepEqual(toStyle({ display: 'block', columns: 2 }), { display: 'block' }, 'columns only apply to a grid')
  assert.equal(cssValue('columns', 2), 'repeat(2, 1fr)')
  assert.equal(cssValue('borderRadius', 16), '16px')
  const rule = cssRule(LEVELS[3].elements[0], startValues(LEVELS[3]))
  assert.equal(rule.selector, '.card-grid')
  assert.deepEqual(rule.lines.map((line) => `${line.css}: ${line.value}${line.inactive ? ' (inactive)' : ''}`),
    ['display: block', 'grid-template-columns: 1fr (inactive)', 'gap: 0px (inactive)'])
  assert.ok(cssRule(LEVELS[0].elements[0], startValues(LEVELS[0])).lines[0].fixed)
})

test('stars, XP and unlocking', () => {
  assert.deepEqual([1, 2, 3, 4].map(starsFor), [3, 2, 2, 1])
  assert.equal(xpFor(3), 14)
  assert.ok(isUnlocked(1) && !isUnlocked(2) && isUnlocked(2, { 1: 1 }))
})
