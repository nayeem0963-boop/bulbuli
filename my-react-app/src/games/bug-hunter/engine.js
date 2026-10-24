// Bug Hunter rules, kept free of React so they can be tested on their own.
//
// Each puzzle is a Code Critter map plus a program that is almost right. One or
// two blocks have a bug. Tapping a bug cycles it through a few choices; Run tests
// the program with Code Critter's engine, so any fix that gets Bulbuli home counts.

import { run } from '../code-critter/engine.js'

export { parseLevel } from '../code-critter/engine.js'

/** Fails (after changing something) before the hint button opens. */
export const HINT_AFTER = 2

/**
 * Bug kinds and what one choice changes on the block:
 *   'move'     { type }   wrong arrow / turn
 *   'times'    { times }  wrong Repeat count
 *   'missing'  { type }   an empty slot; choice -1 means still empty
 *   'turn'     { turn }   wrong turn inside "If path blocked"
 *
 * `start` is the buggy choice the puzzle begins with.
 * `goal` is drawn as the nest or as a treasure chest.
 */
export const LEVELS = [
  {
    id: 1,
    rows: ['S..T', 'TT.T', '..N.'],
    facing: 'E',
    goal: 'nest',
    program: [
      { id: 'a', type: 'forward' },
      { id: 'b', type: 'forward' },
      { id: 'c', type: 'left' },
      { id: 'd', type: 'forward' },
      { id: 'e', type: 'forward' },
    ],
    bugs: [{ blockId: 'c', kind: 'move', options: ['forward', 'right', 'left'], start: 2 }],
  },
  {
    id: 2,
    rows: ['S...#', '.#..#', '...N.'],
    facing: 'E',
    goal: 'chest',
    program: [
      { id: 'a', type: 'repeat', times: 5, body: [{ id: 'a1', type: 'forward' }] },
      { id: 'b', type: 'right' },
      { id: 'c', type: 'forward' },
      { id: 'd', type: 'forward' },
    ],
    bugs: [{ blockId: 'a', kind: 'times', options: [2, 3, 4, 5], start: 3 }],
  },
  {
    id: 3,
    rows: ['T....', 'S.#.N', '...T.'],
    facing: 'E',
    goal: 'nest',
    program: [
      { id: 'a', type: 'forward' },
      { id: 'b', type: 'left' },
      { id: 'c', type: 'forward' },
      { id: 'd', type: 'right' },
      { id: 'e', type: 'repeat', times: 3, body: [{ id: 'e1', type: 'forward' }] },
      { id: 'f', type: 'right' },
      { id: 'g', type: 'missing' },
    ],
    bugs: [{ blockId: 'g', kind: 'missing', options: ['forward', 'right', 'left'], start: -1 }],
  },
  {
    id: 4,
    rows: ['..o..', '.###.', 'o###o', '.###.', 'S###N'],
    facing: 'N',
    goal: 'chest',
    program: [
      {
        id: 'a',
        type: 'repeat',
        times: 12,
        body: [{ id: 'a1', type: 'ifBlocked', turn: 'left' }, { id: 'a2', type: 'forward' }],
      },
    ],
    bugs: [{ blockId: 'a1', kind: 'turn', options: ['right', 'left'], start: 1 }],
  },
  {
    id: 5,
    rows: ['###N.', '##..#', '#..#.', 'S.#..'],
    facing: 'E',
    goal: 'nest',
    program: [
      {
        id: 'a',
        type: 'repeat',
        times: 2,
        body: [
          { id: 'a1', type: 'forward' },
          { id: 'a2', type: 'left' },
          { id: 'a3', type: 'forward' },
          { id: 'a4', type: 'left' },
        ],
      },
    ],
    bugs: [
      { blockId: 'a', kind: 'times', options: [2, 3, 4], start: 0 },
      { blockId: 'a4', kind: 'move', options: ['forward', 'right', 'left'], start: 2 },
    ],
  },
]

export const getLevel = (id) => LEVELS.find((level) => level.id === id) ?? LEVELS[0]

/** The choices a puzzle starts with: one index per bug. */
export const startChoices = (level) => level.bugs.map((bug) => bug.start)

/** Moves one bug to its next choice (wraps around; an empty slot never goes back to empty). */
export function cycleChoice(level, choices, bugIndex) {
  const bug = level.bugs[bugIndex]
  const next = (choices[bugIndex] + 1) % bug.options.length
  return choices.map((choice, index) => (index === bugIndex ? next : choice))
}

const patchFor = (bug, choice) => {
  if (choice < 0) return { type: 'missing' }
  const value = bug.options[choice]
  if (bug.kind === 'times') return { times: value }
  if (bug.kind === 'turn') return { turn: value }
  return { type: value }
}

/** The program with the player's choices put in. */
export function applyChoices(level, choices) {
  const patches = new Map(level.bugs.map((bug, index) => [bug.blockId, patchFor(bug, choices[index])]))
  const patch = (list) => list.map((block) => {
    const next = patches.has(block.id) ? { ...block, ...patches.get(block.id) } : block
    return next.body ? { ...next, body: patch(next.body) } : next
  })
  return patch(level.program)
}

/** True while an empty slot still needs a block. */
export const hasEmptySlot = (level, choices) => level.bugs.some((bug, index) => bug.kind === 'missing' && choices[index] < 0)

/** True when the choices are still the ones the puzzle started with. */
export const isUntouched = (level, choices) => level.bugs.every((bug, index) => choices[index] === bug.start)

/** Where Bulbuli waits before any code runs: a one-frame list for the map. */
export const startFrames = (level) => run(level, []).frames

/** Runs the player's version with Code Critter's engine: { frames, outcome }. */
export const test = (level, choices) => run(level, applyChoices(level, choices))

/**
 * Stars: running the buggy code first to watch it fail is good debugging and costs nothing.
 * 3 = fixed without a wrong try, 2 = fixed without the hint, 1 = fixed with the hint.
 */
export function starsFor({ fails, hintUsed }) {
  if (hintUsed) return 1
  return fails === 0 ? 3 : 2
}

/** XP for a fixed puzzle: 5 plus 3 per star (same scale as the other arcade games). */
export const xpFor = (stars) => 5 + stars * 3

export const isUnlocked = (levelId, bestStars = {}) => levelId === 1 || (bestStars[levelId - 1] ?? 0) > 0
