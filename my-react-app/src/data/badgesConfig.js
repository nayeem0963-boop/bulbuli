/**
 * Every badge a Bulbuli player can earn. Add, remove or retune badges here only:
 * the dashboard grid, the unlock checks, the toasts and the certificates all read this list.
 *
 * Fields
 *   id                  stable slug, saved in the player's unlocked list. Never rename one
 *                       that has shipped (players would lose it). Lowercase letters, digits, dashes.
 *   title               short name shown on the card, the toast and the certificate.
 *   description         one sentence a child can read: what they did to earn it.
 *   icon                one emoji.
 *   category            'level' | 'skill' | 'mastery' (see BADGE_CATEGORIES).
 *   requirement         what unlocks it. One of:
 *     { type: 'level',        target: 5 }                           reach a level
 *     { type: 'total_xp',     target: 1000 }                        earn XP across all games
 *     { type: 'game_xp',      gameId: 'math-hero', target: 100 }    earn XP in one game
 *     { type: 'game_plays',   gameId: 'math-hero', target: 10 }     finish rounds of one game
 *     { type: 'games_played', target: 3 }                           try different games
 *     { type: 'activities',   target: 50 }                          finish rounds in any game
 *   certificateEligible true shows "View & Print Certificate" once it's unlocked.
 *
 * Numbers come from the player's account (profiles.xp / profiles.stats), the same
 * figures the dashboard shows, so a badge can never disagree with the XP table.
 * Game ids must match src/games/registry.js. Per-game targets are set to what each
 * game can award (e.g. HTML Architect has 4 chapters × 50 XP = 200 XP in total).
 */

/** @typedef {'level' | 'skill' | 'mastery'} BadgeCategory */

export const BADGE_CATEGORIES = {
  level: { label: 'Level badges', short: 'Levels', blurb: 'Climb the levels by earning XP in any game.' },
  skill: { label: 'Skill badges', short: 'Skills', blurb: 'Get good at a game, or try lots of them.' },
  mastery: { label: 'Mastery badges', short: 'Mastery', blurb: 'The big ones. Each comes with a certificate.' },
}

export const BADGES = [
  /* ---------- level ---------- */
  {
    id: 'hatchling',
    title: 'Hatchling',
    description: 'Reached level 2. Your adventure has begun!',
    icon: '🐣',
    category: 'level',
    requirement: { type: 'level', target: 2 },
    certificateEligible: false,
  },
  {
    id: 'fledgling',
    title: 'Fledgling',
    description: 'Reached level 3 by learning and playing.',
    icon: '🐥',
    category: 'level',
    requirement: { type: 'level', target: 3 },
    certificateEligible: false,
  },
  {
    id: 'sky-explorer',
    title: 'Sky Explorer',
    description: 'Reached level 5. Bulbuli is proud of you!',
    icon: '🪽',
    category: 'level',
    requirement: { type: 'level', target: 5 },
    certificateEligible: true,
  },
  {
    id: 'high-flyer',
    title: 'High Flyer',
    description: 'Reached level 8 with lots of practice.',
    icon: '🚀',
    category: 'level',
    requirement: { type: 'level', target: 8 },
    certificateEligible: true,
  },
  {
    id: 'bulbuli-legend',
    title: 'Bulbuli Legend',
    description: 'Reached level 10. A true learning legend!',
    icon: '👑',
    category: 'level',
    requirement: { type: 'level', target: 10 },
    certificateEligible: true,
  },

  /* ---------- skill ---------- */
  {
    id: 'number-cruncher',
    title: 'Number Cruncher',
    description: 'Earned 100 XP in Math Hero.',
    icon: '➕',
    category: 'skill',
    requirement: { type: 'game_xp', gameId: 'math-hero', target: 100 },
    certificateEligible: false,
  },
  {
    id: 'shape-spotter',
    title: 'Shape Spotter',
    description: 'Earned 100 XP finding shapes in Shape Hunt 3D.',
    icon: '🔺',
    category: 'skill',
    requirement: { type: 'game_xp', gameId: 'shape-hunt', target: 100 },
    certificateEligible: false,
  },
  {
    id: 'sorting-pro',
    title: 'Sorting Pro',
    description: 'Earned 100 XP in the Shape Sorting Factory.',
    icon: '🧩',
    category: 'skill',
    requirement: { type: 'game_xp', gameId: 'shape-sorting', target: 100 },
    certificateEligible: false,
  },
  {
    id: 'swift-typist',
    title: 'Swift Typist',
    description: 'Earned 150 XP typing words in Sky Typewriter.',
    icon: '⌨️',
    category: 'skill',
    requirement: { type: 'game_xp', gameId: 'sky-typewriter', target: 150 },
    certificateEligible: false,
  },
  {
    id: 'first-tags',
    title: 'First Tags',
    description: 'Earned 50 XP building web pages in HTML Architect.',
    icon: '🧱',
    category: 'skill',
    requirement: { type: 'game_xp', gameId: 'html-architect', target: 50 },
    certificateEligible: false,
  },
  {
    id: 'curious-mind',
    title: 'Curious Mind',
    description: 'Played 3 different games.',
    icon: '🧭',
    category: 'skill',
    requirement: { type: 'games_played', target: 3 },
    certificateEligible: false,
  },

  /* ---------- mastery ---------- */
  {
    id: 'math-hero-master',
    title: 'Math Hero Master',
    description: 'Earned 1,000 XP in Math Hero. Amazing adding and taking away!',
    icon: '🦸',
    category: 'mastery',
    requirement: { type: 'game_xp', gameId: 'math-hero', target: 1000 },
    certificateEligible: true,
  },
  {
    id: 'math-master-champion',
    title: 'Math Master Champion',
    description: 'Earned 1,000 XP in Math Master.',
    icon: '🏆',
    category: 'mastery',
    requirement: { type: 'game_xp', gameId: 'math-master', target: 1000 },
    certificateEligible: true,
  },
  {
    id: 'code-architect',
    title: 'Code Architect',
    description: 'Earned every star in HTML Architect: all 200 XP.',
    icon: '🏗️',
    category: 'mastery',
    requirement: { type: 'game_xp', gameId: 'html-architect', target: 200 },
    certificateEligible: true,
  },
  {
    id: 'typing-wizard',
    title: 'Typing Wizard',
    description: 'Earned 1,000 XP in Sky Typewriter.',
    icon: '🪄',
    category: 'mastery',
    requirement: { type: 'game_xp', gameId: 'sky-typewriter', target: 1000 },
    certificateEligible: true,
  },
  {
    id: 'dedicated-learner',
    title: 'Dedicated Learner',
    description: 'Finished 100 rounds across Bulbuli games.',
    icon: '📚',
    category: 'mastery',
    requirement: { type: 'activities', target: 100 },
    certificateEligible: true,
  },
  {
    id: 'arcade-all-star',
    title: 'Arcade All-Star',
    description: 'Played 8 different Bulbuli games.',
    icon: '🌟',
    category: 'mastery',
    requirement: { type: 'games_played', target: 8 },
    certificateEligible: true,
  },
]

const BY_ID = new Map(BADGES.map((badge) => [badge.id, badge]))

/** The badge with this id, or undefined (e.g. a badge that was removed from the list). */
export const getBadge = (id) => BY_ID.get(id)
