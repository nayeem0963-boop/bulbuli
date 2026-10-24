import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  chooseShape, COLORS, createGame, createRng, createRound, getLevel, LEVELS, nextRound, SAME_COLOR, SHAPES, starsFor, xpFor,
} from './engine.js'

const targetOption = (game) => game.round.options.find((option) => option.shape === game.round.target)
const wrongOption = (game) => game.round.options.find((option) => option.shape !== game.round.target)

test('every shape has an English and a Bangla name, and every level pool is valid', () => {
  for (const shape of SHAPES) assert.ok(shape.name.en && shape.name.bn, shape.id)
  for (const level of LEVELS) {
    assert.ok(level.pool.length >= level.choices, `level ${level.id}`)
    for (const id of level.pool) assert.ok(SHAPES.some((shape) => shape.id === id), id)
  }
})

test('a round has the target once, distinct shapes, and is repeatable with the same seed', () => {
  for (const level of LEVELS) {
    for (let seed = 1; seed <= 50; seed += 1) {
      const round = createRound(level, createRng(seed))
      assert.equal(round.options.length, level.choices)
      assert.equal(round.options.filter((option) => option.shape === round.target).length, 1)
      assert.equal(new Set(round.options.map((option) => option.shape)).size, level.choices)
      assert.equal(new Set(round.options.map((option) => option.id)).size, level.choices)
      assert.ok(round.options.every((option) => level.pool.includes(option.shape)))
      assert.deepEqual(createRound(level, createRng(seed)), round)
    }
  }
})

test('the target never repeats the previous round', () => {
  const level = getLevel(1)
  const rng = createRng(3)
  let previous = null
  for (let i = 0; i < 200; i += 1) {
    const round = createRound(level, rng, previous)
    assert.notEqual(round.target, previous)
    previous = round.target
  }
})

test('colours vary on easy levels and are all the same on the hardest', () => {
  const easy = createRound(getLevel(2), createRng(9))
  assert.ok(easy.options.every((option) => COLORS.includes(option.color)))
  assert.equal(new Set(easy.options.map((option) => option.color)).size, easy.options.length)
  const hard = createRound(getLevel(3), createRng(9))
  assert.ok(hard.options.every((option) => option.color === SAME_COLOR))
})

test('a wrong tap counts once, names the tapped shape, and a repeat tap is ignored', () => {
  const game = createGame(getLevel(2), createRng(5))
  const wrong = wrongOption(game)
  const first = chooseShape(game, wrong.id)
  assert.equal(first.result, 'wrong')
  assert.equal(first.shape, wrong.shape)
  assert.equal(first.game.mistakes, 1)
  const again = chooseShape(first.game, wrong.id)
  assert.equal(again.result, 'ignored')
  assert.equal(again.game.mistakes, 1)
  assert.equal(chooseShape(game, 'nope').result, 'ignored')
})

test('a correct tap solves the round; taps after that are ignored', () => {
  const game = createGame(getLevel(1), createRng(5))
  const { game: solved, result } = chooseShape(game, targetOption(game).id)
  assert.equal(result, 'correct')
  assert.equal(solved.correct, 1)
  assert.equal(chooseShape(solved, wrongOption(solved).id).result, 'ignored')
  assert.equal(nextRound(game, getLevel(1)), game, 'unsolved round does not advance')
})

test('playing every round finishes the game', () => {
  const level = getLevel(3)
  const rng = createRng(11)
  let game = createGame(level, rng)
  for (let i = 0; i < level.rounds; i += 1) {
    assert.equal(game.roundNumber, i + 1)
    game = chooseShape(game, targetOption(game).id).game
    game = nextRound(game, level, rng)
  }
  assert.equal(game.finished, true)
  assert.equal(game.correct, level.rounds)
  assert.equal(chooseShape(game, game.round.options[0].id).result, 'ignored')
})

test('stars and XP', () => {
  assert.equal(starsFor(0, 6), 3)
  assert.equal(starsFor(2, 6), 2)
  assert.equal(starsFor(3, 6), 1)
  assert.equal(starsFor(2, 5), 2)
  assert.equal(xpFor(5, 3), 11)
  assert.ok(Number.isSafeInteger(xpFor(8, 1)))
})
