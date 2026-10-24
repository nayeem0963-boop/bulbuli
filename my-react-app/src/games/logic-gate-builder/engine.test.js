import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  connect, disconnect, emptyCircuit, evalGate, GATES, inputRows, isSolved, isUnlocked, LEVELS, OUTPUT, OUTPUT_PIN,
  pinsOf, placeGate, simulate, sourcesFor, starsFor, truthTable, xpFor,
} from './engine.js'

/** Builds a circuit from { gates: { g1: 'AND' }, wires: { 'g1.0': 'A', ... } } using the real rules. */
function build(level, { gates, wires }) {
  let circuit = emptyCircuit(level)
  for (const [socket, type] of Object.entries(gates)) circuit = placeGate(level, circuit, socket, type)
  for (const [pin, source] of Object.entries(wires)) {
    const next = connect(level, circuit, pin, source)
    assert.notEqual(next, circuit, `wire ${pin} ← ${source} should be allowed`)
    circuit = next
  }
  return circuit
}

const SOLUTIONS = {
  1: { gates: { g1: 'AND' }, wires: { 'g1.0': 'A', 'g1.1': 'B', 'out.0': 'g1' } },
  2: { gates: { g1: 'NOT' }, wires: { 'g1.0': 'A', 'out.0': 'g1' } },
  3: { gates: { g1: 'OR' }, wires: { 'g1.0': 'A', 'g1.1': 'B', 'out.0': 'g1' } },
  4: { gates: { g1: 'XOR' }, wires: { 'g1.0': 'A', 'g1.1': 'B', 'out.0': 'g1' } },
  5: {
    gates: { g1: 'OR', g2: 'NOT', g3: 'AND' },
    wires: { 'g1.0': 'M', 'g1.1': 'D', 'g2.0': 'H', 'g3.0': 'g1', 'g3.1': 'g2', 'out.0': 'g3' },
  },
}

test('gates follow their truth tables', () => {
  const pairs = [[0, 0], [0, 1], [1, 0], [1, 1]]
  const table = (type) => pairs.map((pair) => evalGate(type, pair))
  assert.deepEqual(table('AND'), [0, 0, 0, 1])
  assert.deepEqual(table('OR'), [0, 1, 1, 1])
  assert.deepEqual(table('XOR'), [0, 1, 1, 0])
  assert.deepEqual(table('NAND'), [1, 1, 1, 0])
  assert.deepEqual([evalGate('NOT', [0]), evalGate('NOT', [1])], [1, 0])
  assert.equal(evalGate('AND', [1, null]), null, 'an unconnected input makes the output unknown')
})

test('every level is solved by its intended circuit, using only its own palette', () => {
  for (const level of LEVELS) {
    const solution = SOLUTIONS[level.id]
    for (const type of Object.values(solution.gates)) assert.ok(level.palette.includes(type), `level ${level.id} offers ${type}`)
    assert.ok(isSolved(level, build(level, solution)), `level ${level.id}`)
    assert.ok(!isSolved(level, emptyCircuit(level)), `level ${level.id} starts unsolved`)
  }
})

test('the obvious wrong gate fails each single-gate level', () => {
  const wrong = { 1: 'OR', 2: 'AND', 3: 'AND', 4: 'OR' }
  for (const [id, type] of Object.entries(wrong)) {
    const level = LEVELS[Number(id) - 1]
    const wires = level.inputs.length === 1 ? { 'g1.0': 'A', 'out.0': 'g1' } : { 'g1.0': 'A', 'g1.1': 'B', 'out.0': 'g1' }
    assert.ok(!isSolved(level, build(level, { gates: { g1: type }, wires })), `level ${id} with ${type}`)
  }
})

test('level 5 also accepts a different correct design (any circuit that matches the table wins)', () => {
  const level = LEVELS[4]
  // NAND with both inputs on H acts as NOT H, so this design works too
  const nandAsNot = build(level, {
    gates: { g1: 'OR', g2: 'NAND', g3: 'AND' },
    wires: { 'g1.0': 'M', 'g1.1': 'D', 'g2.0': 'H', 'g2.1': 'H', 'g3.0': 'g1', 'g3.1': 'g2', 'out.0': 'g3' },
  })
  assert.ok(isSolved(level, nandAsNot))
})

test('wires only run left to right, so circuits never loop', () => {
  const level = LEVELS[4]
  let circuit = build(level, { gates: { g1: 'OR', g2: 'NOT', g3: 'AND' }, wires: {} })
  assert.deepEqual(sourcesFor(level, 'g1.0'), ['M', 'D', 'H'])
  assert.deepEqual(sourcesFor(level, 'g3.0'), ['M', 'D', 'H', 'g1', 'g2'])
  assert.deepEqual(sourcesFor(level, OUTPUT_PIN), ['M', 'D', 'H', 'g1', 'g2', 'g3'])
  assert.equal(connect(level, circuit, 'g1.0', 'g3'), circuit, 'no wire back from a later gate')
  assert.equal(connect(level, circuit, 'g2.1', 'H'), circuit, 'NOT has only one input pin')
  circuit = connect(level, circuit, 'g1.0', 'M')
  assert.equal(disconnect(circuit, 'g1.0').wires['g1.0'], undefined)
})

test('changing a gate keeps the wires that still fit and cuts the rest', () => {
  const level = LEVELS[0]
  let circuit = build(level, SOLUTIONS[1])
  circuit = placeGate(level, circuit, 'g1', 'OR')
  assert.deepEqual(Object.keys(circuit.wires).sort(), ['g1.0', 'g1.1', 'out.0'])
  circuit = placeGate(level, circuit, 'g1', null)
  assert.deepEqual(Object.keys(circuit.wires), ['out.0'], 'an emptied socket loses its input wires')
  assert.equal(simulate(level, circuit, { A: 1, B: 1 })[OUTPUT], null, 'and its output is unknown')
  assert.deepEqual(pinsOf(level, circuit).map((pin) => pin.key), [OUTPUT_PIN])
})

test('truth tables list every switch combination in counting order', () => {
  assert.deepEqual(inputRows(LEVELS[0]), [{ A: 0, B: 0 }, { A: 0, B: 1 }, { A: 1, B: 0 }, { A: 1, B: 1 }])
  assert.equal(inputRows(LEVELS[4]).length, 8)
  const table = truthTable(LEVELS[0], build(LEVELS[0], SOLUTIONS[1]))
  assert.deepEqual(table.map((row) => [row.goal, row.actual, row.ok]), [[0, 0, true], [0, 0, true], [0, 0, true], [1, 1, true]])
  assert.ok(Object.keys(GATES).length === 5)
})

test('stars, XP and unlocking', () => {
  assert.deepEqual([1, 2, 3, 4].map(starsFor), [3, 2, 2, 1])
  assert.equal(xpFor(3), 14)
  assert.ok(isUnlocked(1) && !isUnlocked(2) && isUnlocked(2, { 1: 1 }))
})
