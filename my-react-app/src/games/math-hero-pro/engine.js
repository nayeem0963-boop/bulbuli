/**
 * Math Hero Pro rules: levels, rounds, stars, XP, unlocks and the saved record.
 * No React and no storage, so everything here runs in `node --test` (engine.test.js).
 *
 * The saved record (stored by useGameProgress under GAME_ID):
 *   {
 *     levels: { [levelId]: { bestStars, bestCorrect, plays, lastPlayedAt } },
 *     badges: ['number-explorer', …],   collectible badges, in the order they were won
 *     lastLevel: 3,
 *   }
 */
import { createRand, mulberry32 } from '../../core/rng.js'
import { makeQuestions } from './questions.js'

export const GAME_ID = 'math-hero-pro'
export const QUESTIONS_PER_LEVEL = 10

/** Percent correct needed for each star. */
export const STAR_THRESHOLDS = [0.5, 0.75, 0.9]

const t = (en, bn) => ({ en, bn })

export const LEVELS = [
  {
    id: 1,
    icon: 'plus',
    accent: 'sky',
    title: t('Addition & Subtraction', 'যোগ ও বিয়োগ'),
    blurb: t('Count on, take away and find number bonds.', 'সামনে গোনো, সরিয়ে নাও, সংখ্যা জোড়া খোঁজো।'),
    maxXp: 50,
    badge: { id: 'number-explorer', emoji: '🧭', name: t('Number Explorer', 'সংখ্যা অভিযাত্রী') },
  },
  {
    id: 2,
    icon: 'times',
    accent: 'violet',
    title: t('Fun Multiplication', 'মজার গুণ'),
    blurb: t('Times tables from 1 × 1 to 10 × 10 with dot arrays.', 'বিন্দুর সারি দিয়ে ১ × ১ থেকে ১০ × ১০ নামতা।'),
    maxXp: 55,
    badge: { id: 'times-table-titan', emoji: '🚀', name: t('Times Table Titan', 'নামতা মহাবীর') },
  },
  {
    id: 3,
    icon: 'divide',
    accent: 'emerald',
    title: t('Division & Sharing', 'ভাগ ও ভাগাভাগি'),
    blurb: t('Share things fairly into equal groups.', 'জিনিস সমান দলে ন্যায্যভাবে ভাগ করো।'),
    maxXp: 60,
    badge: { id: 'sharing-superstar', emoji: '🤝', name: t('Sharing Superstar', 'ভাগাভাগির তারকা') },
  },
  {
    id: 4,
    icon: 'pie',
    accent: 'rose',
    title: t('Fractions & Shapes', 'ভগ্নাংশ ও আকৃতি'),
    blurb: t('Spot halves, thirds and quarters in shapes.', 'আকৃতিতে অর্ধেক, তিন ভাগ আর চার ভাগ চেনো।'),
    maxXp: 65,
    badge: { id: 'fraction-finder', emoji: '🍕', name: t('Fraction Finder', 'ভগ্নাংশ সন্ধানী') },
  },
  {
    id: 5,
    icon: 'brain',
    accent: 'amber',
    title: t('Word Problems & Logic', 'গল্পের অঙ্ক ও যুক্তি'),
    blurb: t('Solve real-life puzzles, patterns and mysteries.', 'জীবনের ধাঁধা, নকশা আর রহস্য সমাধান করো।'),
    maxXp: 70,
    badge: { id: 'math-wizard', emoji: '🧙', name: t('Math Wizard', 'গণিত জাদুকর') },
  },
]

export const MAX_STARS = LEVELS.length * 3

export const getLevel = (id) => LEVELS.find((level) => level.id === id) ?? null

// ---------- stars, unlocks, XP ----------

/** 0–3 stars for a score: 50% → 1, 75% → 2, 90% → 3. */
export function starsFor(correct, total = QUESTIONS_PER_LEVEL) {
  if (!(total > 0)) return 0
  const ratio = correct / total
  return STAR_THRESHOLDS.filter((needed) => ratio >= needed - 1e-9).length
}

const levelRecord = (record, id) => record?.levels?.[id] ?? {}
export const bestStars = (record, id) => levelRecord(record, id).bestStars ?? 0

/** Level 1 is always open; every other level opens once the one before has at least one star. */
export function isUnlocked(id, record) {
  if (id === 1) return true
  return Boolean(getLevel(id)) && bestStars(record, id - 1) >= 1
}

export const totalStars = (record) => LEVELS.reduce((sum, level) => sum + bestStars(record, level.id), 0)

/** The level to point a child at: the first open one not yet at 3 stars (or the last level). */
export function suggestedLevel(record) {
  const open = LEVELS.filter((level) => isUnlocked(level.id, record))
  return (open.find((level) => bestStars(record, level.id) < 3) ?? open[open.length - 1]).id
}

/**
 * XP for one finished round. A level is worth up to `maxXp` (50–70), paid out by stars:
 * each new best star earns its third of the level's XP, so a level can't be farmed.
 * Replaying without a new best still earns 1 XP per correct answer, so practice always counts.
 */
export function xpForRound({ maxXp, previousBestStars = 0, stars, correct }) {
  const worth = (s) => Math.round((maxXp * Math.min(3, s)) / 3)
  const improvement = worth(stars) - worth(previousBestStars)
  return improvement > 0 ? improvement : Math.max(0, correct)
}

// ---------- rounds ----------

/**
 * A fresh round: { levelId, questions, index, responses, phase: 'asking' | 'answered' | 'done', seed }.
 * Pass a seed for a repeatable round (tests); by default every round is different.
 */
export function createRound(levelId, seed = Date.now() ^ Math.floor(Math.random() * 1e9)) {
  if (!getLevel(levelId)) throw new RangeError(`Unknown Math Hero Pro level: ${levelId}`)
  const rand = createRand(mulberry32(seed))
  return {
    levelId,
    seed,
    questions: makeQuestions(levelId, rand, QUESTIONS_PER_LEVEL),
    index: 0,
    responses: [],
    phase: 'asking',
  }
}

export const currentQuestion = (round) => (round && round.phase !== 'done' ? round.questions[round.index] : null)

/** Locks in a choice. Returns the same round with outcome 'ignored' if it isn't time to answer. */
export function answer(round, choice) {
  const question = currentQuestion(round)
  if (!question || round.phase !== 'asking' || !question.choices.includes(choice)) return { round, outcome: 'ignored' }
  const correct = choice === question.answer
  return {
    round: { ...round, phase: 'answered', responses: [...round.responses, { questionId: question.id, choice, correct }] },
    outcome: { correct, answer: question.answer },
  }
}

/** Moves on after an answer; after the last question the round is done. */
export function next(round) {
  if (!round || round.phase !== 'answered') return round
  const index = round.index + 1
  return index >= round.questions.length ? { ...round, phase: 'done' } : { ...round, index, phase: 'asking' }
}

export const correctSoFar = (round) => round?.responses.filter((r) => r.correct).length ?? 0

export function summarize(round) {
  const total = round.questions.length
  const correct = correctSoFar(round)
  return {
    levelId: round.levelId,
    correct,
    total,
    percent: Math.round((correct / total) * 100),
    stars: starsFor(correct, total),
  }
}

/** The saved record after a round, keeping the best results. */
export function mergeRecord(saved, summary, now = new Date().toISOString()) {
  const previous = saved && typeof saved === 'object' ? saved : {}
  const before = levelRecord(previous, summary.levelId)
  const level = getLevel(summary.levelId)
  const badges = Array.isArray(previous.badges) ? [...previous.badges] : []
  if (summary.stars >= 1 && level && !badges.includes(level.badge.id)) badges.push(level.badge.id)
  return {
    ...previous,
    levels: {
      ...(previous.levels ?? {}),
      [summary.levelId]: {
        bestStars: Math.max(before.bestStars ?? 0, summary.stars),
        bestCorrect: Math.max(before.bestCorrect ?? 0, summary.correct),
        plays: (before.plays ?? 0) + 1,
        lastPlayedAt: now,
      },
    },
    badges,
    lastLevel: summary.levelId,
  }
}

// ---------- encouragement ----------

const CHEERS = [
  t('Awesome!', 'দারুণ!'), t('You got it!', 'ঠিক ধরেছ!'), t('Super star!', 'সুপার স্টার!'),
  t('Brilliant thinking!', 'চমৎকার চিন্তা!'), t('Math hero move!', 'ম্যাথ হিরোর চাল!'), t('Nailed it!', 'একদম ঠিক!'),
]
const NUDGES = [
  t('Nice try! Let’s see how it works.', 'ভালো চেষ্টা! চলো দেখি কীভাবে হয়।'),
  t('Almost! Every mistake helps your brain grow.', 'প্রায় হয়ে গেছিল! প্রতিটি ভুলে মস্তিষ্ক আরও শক্ত হয়।'),
  t('Good effort! Here’s a trick for next time.', 'ভালো চেষ্টা! পরের বারের জন্য একটা কৌশল দেখো।'),
  t('Keep going — heroes learn by trying!', 'চালিয়ে যাও — হিরোরা চেষ্টা করেই শেখে!'),
]

/** A cheer (correct) or a gentle nudge (wrong), picked by question number so it varies but never flickers. */
export const encouragement = (correct, index) => (correct ? CHEERS : NUDGES)[index % (correct ? CHEERS.length : NUDGES.length)]

/** The completion screen's headline for 0–3 stars. */
export const RESULT_HEADLINES = [
  t('Good practice! Try again to earn a star.', 'ভালো অনুশীলন! তারা পেতে আবার চেষ্টা করো।'),
  t('Level cleared! You earned a star!', 'লেভেল পার! তুমি একটি তারা পেয়েছ!'),
  t('Great job! Two shining stars!', 'দারুণ কাজ! দুটি ঝলমলে তারা!'),
  t('PERFECT HERO! Three stars!', 'পারফেক্ট হিরো! তিনটি তারা!'),
]
