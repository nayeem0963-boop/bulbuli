import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DECKS } from './decks.js'
import {
  createBoard, createGame, createRng, flipCard, hideOpenCards, LEVELS, starsFor, xpFor,
} from './engine.js'

const deck = DECKS[0]

test('every deck has enough items for the biggest level', () => {
  const most = Math.max(...LEVELS.map((level) => level.pairs))
  for (const set of DECKS) {
    assert.ok(set.items.length >= most, `${set.id} has ${set.items.length} items`)
    for (const item of set.items) assert.ok(item.word.en && item.word.bn && item.picture, item.id)
  }
})

test('a board has two cards per pair and is repeatable with the same seed', () => {
  for (const level of LEVELS) {
    const board = createBoard(deck, level, createRng(7))
    assert.equal(board.length, level.pairs * 2)
    const counts = {}
    for (const card of board) counts[card.pairId] = (counts[card.pairId] ?? 0) + 1
    assert.ok(Object.values(counts).every((n) => n === 2))
    assert.equal(new Set(board.map((card) => card.id)).size, board.length)
    assert.deepEqual(createBoard(deck, level, createRng(7)).map((c) => c.id), board.map((c) => c.id))
  }
})

test('word levels pair a picture card with a word card', () => {
  const board = createBoard(deck, LEVELS[2], createRng(1))
  const faces = board.reduce((acc, card) => ({ ...acc, [card.pairId]: [...(acc[card.pairId] ?? []), card.face] }), {})
  for (const pair of Object.values(faces)) assert.deepEqual(pair.sort(), ['picture', 'word'])
})

test('matching, missing and winning', () => {
  let game = createGame(deck, LEVELS[0], createRng(3))
  const byPair = {}
  for (const card of game.cards) (byPair[card.pairId] ??= []).push(card.id)
  const [pairA, pairB, pairC] = Object.values(byPair)

  // a miss: two different cards stay open until hidden, and count as one move
  game = flipCard(game, pairA[0])
  game = flipCard(game, pairB[0])
  assert.equal(game.open.length, 2)
  assert.equal(game.moves, 1)
  assert.equal(flipCard(game, pairC[0]), game, 'a third card is ignored while two are open')
  game = hideOpenCards(game)
  assert.deepEqual(game.open, [])

  // tapping the same card twice does nothing
  game = flipCard(game, pairA[0])
  assert.equal(flipCard(game, pairA[0]), game)

  for (const pair of [pairA, pairB, pairC]) {
    if (!game.open.length) game = flipCard(game, pair[0])
    game = flipCard(game, pair[1])
  }
  assert.equal(game.won, true)
  assert.equal(game.moves, 4)
  assert.equal(game.matched.length, 3)
})

test('stars and XP', () => {
  assert.equal(starsFor(3, 3), 3)
  assert.equal(starsFor(5, 3), 3)
  assert.equal(starsFor(7, 3), 2)
  assert.equal(starsFor(30, 3), 1)
  assert.equal(xpFor(6, 3), 21)
})
