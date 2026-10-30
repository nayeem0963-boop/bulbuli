/**
 * Math Hero Pro+ rules (ages 10–12): levels, rounds, stars, XP, unlocks and the saved record.
 * No React and no storage, so everything here runs in `node --test` (engine.test.js).
 *
 * The saved record (stored by useGameProgress under GAME_ID, apart from Math Hero Pro's):
 *   {
 *     levels: { [levelId]: { bestStars, bestCorrect, plays, lastPlayedAt } },
 *     badges: ['order-commander', …],   collectible badges, in the order they were won
 *     lastLevel: 3,
 *   }
 */
import { createRand, mulberry32 } from '../../core/rng.js'
import { makeQuestions } from './questions.js'

export const GAME_ID = 'math-hero-pro-plus'
export const QUESTIONS_PER_LEVEL = 10

/** Percent correct needed for each star. */
export const STAR_THRESHOLDS = [0.5, 0.75, 0.9]

const t = (en, bn) => ({ en, bn })

export const LEVELS = [
  {
    id: 1,
    icon: 'order',
    accent: 'sky',
    title: t('Order of Operations', 'কাজের ক্রম'),
    blurb: t('Brackets, powers, × ÷ then + −. Crack PEMDAS.', 'বন্ধনী, ঘাত, × ÷ তারপর + −। ক্রমের রহস্য ভেদ করো।'),
    maxXp: 60,
    badge: { id: 'order-commander', emoji: '🎯', name: t('Order Commander', 'ক্রম সেনাপতি') },
  },
  {
    id: 2,
    icon: 'percent',
    accent: 'violet',
    title: t('Decimals & Percentages', 'দশমিক ও শতকরা'),
    blurb: t('Discounts, price rises and fractions as decimals.', 'ছাড়, দাম বাড়া আর ভগ্নাংশকে দশমিকে লেখা।'),
    maxXp: 65,
    badge: { id: 'percent-pro', emoji: '💯', name: t('Percent Pro', 'শতকরা প্রো') },
  },
  {
    id: 3,
    icon: 'ratio',
    accent: 'emerald',
    title: t('Ratios, Proportions & Rates', 'অনুপাত, সমানুপাত ও হার'),
    blurb: t('Unit rates, scaled recipes, maps and best buys.', 'একক হার, রেসিপি বড় করা, মানচিত্র আর সাশ্রয়ী কেনাকাটা।'),
    maxXp: 70,
    badge: { id: 'ratio-ranger', emoji: '⚖️', name: t('Ratio Ranger', 'অনুপাত রেঞ্জার') },
  },
  {
    id: 4,
    icon: 'algebra',
    accent: 'rose',
    title: t('Intro to Pre-Algebra', 'বীজগণিতের শুরু'),
    blurb: t('Find x in one-step and two-step equations.', 'এক ধাপ আর দুই ধাপের সমীকরণে x খুঁজে বের করো।'),
    maxXp: 75,
    badge: { id: 'algebra-apprentice', emoji: '🗝️', name: t('Algebra Apprentice', 'বীজগণিত শিক্ষানবিশ') },
  },
  {
    id: 5,
    icon: 'geometry',
    accent: 'amber',
    title: t('Geometry & Measurement', 'জ্যামিতি ও পরিমাপ'),
    blurb: t('Area, perimeter and missing angles in shapes.', 'আকৃতির ক্ষেত্রফল, পরিসীমা আর হারানো কোণ।'),
    maxXp: 80,
    badge: { id: 'math-tactician', emoji: '📐', name: t('Math Tactician', 'গণিত কৌশলী') },
  },
]

export const MAX_STARS = LEVELS.length * 3
export const MAX_XP = LEVELS.reduce((sum, level) => sum + level.maxXp, 0)

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

/** The level to point a player at: the first open one not yet at 3 stars (or the last level). */
export function suggestedLevel(record) {
  const open = LEVELS.filter((level) => isUnlocked(level.id, record))
  return (open.find((level) => bestStars(record, level.id) < 3) ?? open[open.length - 1]).id
}

/**
 * XP for one finished round. A level is worth up to `maxXp` (60–80), paid out by stars:
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
  if (!getLevel(levelId)) throw new RangeError(`Unknown Math Hero Pro+ level: ${levelId}`)
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
      ...previous.levels,
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

// ---------- encouragement (pitched at 10–12-year-olds) ----------

const CHEERS = [
  t('Sharp thinking!', 'তীক্ষ্ণ চিন্তা!'), t('Spot on!', 'একদম ঠিক!'), t('Tactician move!', 'কৌশলীর চাল!'),
  t('Clean solve!', 'নিখুঁত সমাধান!'), t('That’s the method!', 'এটাই সঠিক পদ্ধতি!'), t('Level-up brain!', 'লেভেল-আপ মস্তিষ্ক!'),
]
const NUDGES = [
  t('Close! Check the method below.', 'কাছাকাছি! নিচের পদ্ধতিটা দেখো।'),
  t('Good attempt. Here’s where it turns.', 'ভালো চেষ্টা। এখানেই মোড়টা।'),
  t('Mistakes are data. Let’s use this one.', 'ভুলও তথ্য। চলো এটা কাজে লাগাই।'),
  t('Not this time. Spot the trap for next time.', 'এবার হলো না। পরের বারের জন্য ফাঁদটা চিনে রাখো।'),
]

/** A cheer (correct) or a nudge (wrong), picked by question number so it varies but never flickers. */
export const encouragement = (correct, index) => (correct ? CHEERS : NUDGES)[index % (correct ? CHEERS.length : NUDGES.length)]

/** The completion screen's headline for 0–3 stars. */
export const RESULT_HEADLINES = [
  t('Solid practice. Go again to earn a star.', 'ভালো অনুশীলন। তারা পেতে আবার চেষ্টা করো।'),
  t('Mission cleared! First star earned.', 'মিশন পার! প্রথম তারা পেয়েছ।'),
  t('Strong work! Two stars.', 'দারুণ কাজ! দুটি তারা।'),
  t('Flawless strategy! Three stars.', 'নিখুঁত কৌশল! তিনটি তারা।'),
]
