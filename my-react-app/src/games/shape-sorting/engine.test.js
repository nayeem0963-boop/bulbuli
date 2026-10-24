import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createGame, createItem, createRng, dropItem, getLevel, LEVELS, missItem, nextItem,
  POINTS_FIRST_TRY, POINTS_RETRY, starsFor, xpFor,
} from './engine.js'

const wrongBin = (game) => game.bins.find((bin) => bin !== game.item.bin)

test('every item belongs in one of the level bins', () => {
  for (const level of LEVELS) {
    const rng = createRng(7)
    for (let i = 1; i <= 50; i += 1) {
      const item = createItem(level, rng, i)
      assert.ok(level.bins.includes(item.bin), `level ${level.id}: ${item.bin}`)
      assert.equal(level.sortBy === 'shape' ? item.shape : item.color, item.bin)
    }
  }
})

test('the same bin never comes up three times in a row', () => {
  const level = getLevel(1)
  const rng = createRng(3)
  let game = createGame(level, rng)
  game = { ...game, total: 200 }
  const bins = [game.item.bin]
  for (let i = 0; i < 150; i += 1) {
    game = nextItem(dropItem(game, game.item.bin).game, level, rng)
    bins.push(game.item.bin)
  }
  for (let i = 2; i < bins.length; i += 1) {
    assert.ok(!(bins[i] === bins[i - 1] && bins[i] === bins[i - 2]), `three ${bins[i]} at ${i}`)
  }
})

test('right bin scores, wrong bin counts a mistake and keeps the item', () => {
  const game = createGame(getLevel(2), createRng(1))
  const wrong = dropItem(game, wrongBin(game))
  assert.equal(wrong.result, 'wrong')
  assert.equal(wrong.game.mistakes, 1)
  assert.equal(wrong.game.item.id, game.item.id)
  assert.equal(wrong.game.item.solved, false)

  const right = dropItem(wrong.game, game.item.bin)
  assert.equal(right.result, 'correct')
  assert.equal(right.game.sorted, 1)
  assert.equal(right.game.points, POINTS_RETRY)
  assert.equal(dropItem(game, game.item.bin).game.points, POINTS_FIRST_TRY)
})

test('drops are ignored once sorted or for unknown bins', () => {
  const game = createGame(getLevel(1), createRng(2))
  assert.equal(dropItem(game, 'banana').result, 'ignored')
  const sorted = dropItem(game, game.item.bin).game
  assert.equal(dropItem(sorted, game.item.bin).result, 'ignored')
  assert.equal(missItem(sorted), sorted)
})

test('falling off the belt is a mistake and the item comes back', () => {
  const game = createGame(getLevel(1), createRng(4))
  const missed = missItem(game)
  assert.equal(missed.mistakes, 1)
  assert.equal(missed.misses, 1)
  assert.equal(missed.item.id, game.item.id)
  assert.equal(missed.item.attempts, 1)
})

test('the game finishes after the last item is sorted', () => {
  const level = getLevel(1)
  const rng = createRng(5)
  let game = createGame(level, rng)
  for (let i = 0; i < level.items; i += 1) {
    assert.equal(game.finished, false)
    assert.equal(nextItem(game, level, rng), game, 'no advance before sorting')
    game = nextItem(dropItem(game, game.item.bin).game, level, rng)
  }
  assert.equal(game.finished, true)
  assert.equal(game.sorted, level.items)
  assert.equal(game.points, level.items * POINTS_FIRST_TRY)
})

test('stars and XP', () => {
  assert.equal(starsFor(0, 8), 3)
  assert.equal(starsFor(2, 8), 2)
  assert.equal(starsFor(3, 8), 1)
  assert.equal(xpFor(8, 3), 17)
})
