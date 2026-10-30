/**
 * Words for achievement moments: the celebration, the share image and the share message.
 * Pure data + helpers (no React), so they're easy to change and to test.
 *
 * To give a game its own message, add it to GAME_MESSAGES. A single badge can override
 * everything in BADGE_MESSAGES. Messages praise effort, curiosity and progress, never
 * beating other players.
 *
 *   motivationFor(badge)                  → 'You're becoming a math superstar! …'
 *   congratsFor('Nayeem Hasan')           → 'Way to go, Nayeem!'
 *   defaultShareMessage({ badge, link })  → the editable text in the share panel
 */

/** One badge, one message (wins over the game and category messages). */
export const BADGE_MESSAGES = {
  'bulbuli-legend': 'A true learning legend! Bulbuli is so proud of everything you have learned.',
  'curious-mind': 'Curious minds explore everything. Keep trying new things!',
  'arcade-all-star': 'Curious minds explore everything. Keep trying new things!',
  'dedicated-learner': 'Practice makes progress. Your hard work is paying off!',
}

/** By the game a badge is about (requirement.gameId). Ids from src/games/registry.js. */
export const GAME_MESSAGES = {
  'math-hero': "You're becoming a math superstar! Keep solving and exploring!",
  'math-hero-pro': "You're becoming a math superstar! Keep solving and exploring!",
  'math-hero-pro-plus': 'Every mission makes your maths mind stronger. Super thinking!',
  'math-master': 'Your problem-solving skills are leveling up!',
  'html-architect': 'Every great programmer starts with one line of code. Keep building!',
  'sky-typewriter': 'Your fingers are flying! Every word you type makes you quicker.',
  'shape-hunt': 'Sharp eyes! You are spotting shapes everywhere.',
  'shape-sorting': 'Great sorting! Clever thinking puts everything in its place.',
  'sky-runner': 'Brave explorers never stop learning!',
  'ball-dash': 'Brave explorers never stop learning!',
  'bouncy-hop': 'Brave explorers never stop learning!',
  'skyward-explorer': 'Brave explorers never stop learning!',
  'neon-velocity': 'Focus and practice make you faster every time!',
}

/** By badge category (src/data/badgesConfig.js), when nothing more specific fits. */
export const CATEGORY_MESSAGES = {
  level: 'Look how far you have flown! Every level is a new adventure.',
  skill: 'Your skills are growing every time you play. Keep it up!',
  mastery: 'You worked hard for this one. Amazing dedication!',
}

export const GENERAL_MESSAGE = 'Amazing progress! Your hard work is paying off!'

export function motivationFor(badge) {
  if (!badge) return GENERAL_MESSAGE
  return BADGE_MESSAGES[badge.id]
    ?? GAME_MESSAGES[badge.requirement?.gameId]
    ?? CATEGORY_MESSAGES[badge.category]
    ?? GENERAL_MESSAGE
}

/** First word of a name, or '' (never the email or anything else). */
export function firstName(name) {
  return String(name ?? '').trim().split(/\s+/)[0] ?? ''
}

export function congratsFor(name) {
  const first = firstName(name)
  return first ? `Way to go, ${first}!` : 'Way to go!'
}

export const SHARE_HEADLINE = "I'm proud of my learning journey!"

/**
 * The pre-written sharing message. `link` is the public verification link when there is one
 * (and the player hasn't turned it off), otherwise the site address.
 */
export function defaultShareMessage({ badge, link }) {
  const what = badge?.title ? `the "${badge.title}" achievement` : 'a new achievement'
  return `${SHARE_HEADLINE} I just earned ${what} on Bulbuli. Come explore and learn through games! ${link}`.trim()
}
