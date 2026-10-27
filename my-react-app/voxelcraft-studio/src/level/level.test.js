import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BLOCK } from './blockTypes.js'
import { createEditorState, editorReducer } from './editorReducer.js'
import { addBlock, blockAt, canPlace, clearBlocks, removeBlockAt } from './levelOps.js'
import { MAX_BLOCKS, createEmptyLevel, parseLevel, validateLevel } from './levelSchema.js'
import { axisNormal, floorCell, resolveTarget } from './placement.js'

const level0 = () => createEmptyLevel({ id: 'lvl_test', title: 'Test', author: 'tester' })
const at = (x, y, z) => ({ x, y, z })

test('addBlock places a block and rejects occupied / out-of-bounds cells', () => {
  let lvl = addBlock(level0(), { type: BLOCK.PLATFORM, ...at(0, 0, 0), color: '#ff0000' })
  assert.equal(lvl.blocks.length, 1)
  assert.equal(lvl.blocks[0].color, '#ff0000')
  assert.equal(addBlock(lvl, { type: BLOCK.LAVA, ...at(0, 0, 0) }), lvl, 'occupied cell is a no-op')
  assert.equal(canPlace(lvl, at(10, 0, 0), BLOCK.PLATFORM).ok, false, 'x=10 is off the 20x20 plot')
  assert.equal(canPlace(lvl, at(0, -1, 0), BLOCK.PLATFORM).ok, false, 'below the floor')
  assert.equal(canPlace(lvl, at(-10, 15, 9), BLOCK.PLATFORM).ok, true, 'corner at max height')
})

test('non-paintable types keep their signature colour', () => {
  const lvl = addBlock(level0(), { type: BLOCK.LAVA, ...at(1, 0, 1), color: '#00ff00' })
  assert.equal(lvl.blocks[0].color, '#ef4444')
})

test('SPAWN and FINISH are unique: placing again moves them, markers follow', () => {
  let lvl = addBlock(level0(), { type: BLOCK.SPAWN, ...at(0, 0, 0) })
  lvl = addBlock(lvl, { type: BLOCK.SPAWN, ...at(3, 0, 3) })
  assert.equal(lvl.blocks.filter((b) => b.type === BLOCK.SPAWN).length, 1)
  assert.deepEqual(lvl.spawnPoint, at(3, 0, 3))
  lvl = addBlock(lvl, { type: BLOCK.FINISH, ...at(5, 2, 5) })
  assert.deepEqual(lvl.finishGate, at(5, 2, 5))
  lvl = removeBlockAt(lvl, at(3, 0, 3))
  assert.equal(lvl.spawnPoint, null)
})

test('validateLevel requires spawn + finish', () => {
  let lvl = level0()
  assert.equal(validateLevel(lvl).length, 2)
  lvl = addBlock(lvl, { type: BLOCK.SPAWN, ...at(0, 0, 0) })
  lvl = addBlock(lvl, { type: BLOCK.FINISH, ...at(4, 0, 0) })
  assert.deepEqual(validateLevel(lvl), [])
})

test('block cap applies to normal blocks only', () => {
  const blocks = []
  for (let i = 0; i < MAX_BLOCKS; i++) {
    blocks.push({ id: `b${i}`, type: BLOCK.PLATFORM, x: (i % 20) - 10, y: Math.floor(i / 400), z: (Math.floor(i / 20) % 20) - 10, color: '#64748b' })
  }
  const full = { ...level0(), blocks: blocks.slice(0, MAX_BLOCKS) }
  assert.equal(canPlace(full, at(0, 15, 0), BLOCK.PLATFORM).ok, false)
  assert.equal(canPlace(full, at(0, 15, 0), BLOCK.SPAWN).ok, true)
})

test('parseLevel sanitises untrusted JSON', () => {
  const { level, dropped } = parseLevel({
    title: 'x'.repeat(100),
    blocks: [
      { type: 'PLATFORM', x: 0, y: 0, z: 0, color: '#ABCDEF' },
      { type: 'PLATFORM', x: 0, y: 0, z: 0 }, // duplicate cell
      { type: 'NUKE', x: 1, y: 0, z: 0 }, // unknown type
      { type: 'LAVA', x: 99, y: 0, z: 0 }, // out of bounds
      { type: 'PLATFORM', x: 1.5, y: 0, z: 0 }, // non-integer
      { type: 'SPAWN', x: 2, y: 0, z: 0 },
      { type: 'SPAWN', x: 3, y: 0, z: 0 }, // second spawn
      { type: 'PLATFORM', x: 4, y: 0, z: 0, color: 'red' }, // bad colour → default
    ],
  })
  assert.equal(level.title.length, 40)
  assert.equal(level.blocks.length, 3)
  assert.equal(dropped, 5)
  assert.equal(level.blocks[0].color, '#abcdef')
  assert.equal(level.blocks[2].color, '#64748b')
  assert.deepEqual(level.spawnPoint, at(2, 0, 0))
})

test('placement: floor hits, face hits, erase, stale hits', () => {
  let lvl = addBlock(level0(), { type: BLOCK.PLATFORM, ...at(0, 0, 0) })
  const block = blockAt(lvl, at(0, 0, 0))
  const build = { mode: 'build', blockType: BLOCK.PLATFORM }

  assert.deepEqual(floorCell({ x: 10, y: 0, z: -10 }), at(9, 0, -10), 'edge of plot clamps')
  assert.deepEqual(resolveTarget({ block: null, point: { x: 3.4, y: 0, z: -2.1 } }, build, lvl).cell, at(3, 0, -3))
  assert.deepEqual(resolveTarget({ block, normal: axisNormal({ x: 0.02, y: 0.99, z: 0 }) }, build, lvl).cell, at(0, 1, 0))
  assert.deepEqual(resolveTarget({ block, normal: { x: -1, y: 0, z: 0 } }, build, lvl).cell, at(-1, 0, 0))
  const under = resolveTarget({ block, normal: { x: 0, y: -1, z: 0 } }, build, lvl)
  assert.equal(under.valid, false, 'cannot place below the floor')

  const erase = resolveTarget({ block, normal: { x: 0, y: 1, z: 0 }, erase: true }, build, lvl)
  assert.deepEqual(erase, { action: 'erase', cell: at(0, 0, 0), valid: true })
  assert.equal(resolveTarget({ block: null, point: { x: 0, y: 0, z: 0 } }, { ...build, mode: 'erase' }, lvl), null)

  lvl = clearBlocks(lvl)
  assert.equal(resolveTarget({ block, normal: { x: 0, y: 1, z: 0 } }, build, lvl), null, 'stale hit')
})

test('editor history: undo/redo, clear, title survives undo', () => {
  let s = createEditorState(level0())
  s = editorReducer(s, { type: 'block/add', block: { type: BLOCK.PLATFORM, ...at(0, 0, 0) } })
  s = editorReducer(s, { type: 'block/add', block: { type: BLOCK.PLATFORM, ...at(1, 0, 0) } })
  s = editorReducer(s, { type: 'level/rename', title: 'Renamed' })
  s = editorReducer(s, { type: 'level/clear' })
  assert.equal(s.level.blocks.length, 0)
  s = editorReducer(s, { type: 'history/undo' })
  assert.equal(s.level.blocks.length, 2)
  assert.equal(s.level.title, 'Renamed')
  s = editorReducer(s, { type: 'history/redo' })
  assert.equal(s.level.blocks.length, 0)
  const same = editorReducer(s, { type: 'level/clear' })
  assert.equal(same, s, 'no-op edits add no history')
})
