// Every grammar course in one shape, so the Grammar page and the quiz screen treat them alike.
//
//   course: { id, kind, icon, title, tagline, subtitle, sections: [{ id, tone, title, hint, cards }], cards }
//   card:   { id, order, section, title, badge, recap, questions }   (recap differs by kind)
//
// The 12 tenses (tenses.json) keep their richer recap (kind 'tenses'); the other courses
// (courses/*.json) use a short rule + example (kind 'rules').
import { GRAMMAR_COURSES } from './courses/index.js'
import { TENSE_MODULES, TENSE_TOPIC } from './tenseModules.js'

export const DEFAULT_COURSE = 'tenses'

const ICONS = {
  tenses: '⏳',
  'subject-verb-agreement': '🤝',
  'articles-prepositions': '📍',
  'active-passive-voice': '🔄',
  'punctuation-sentences': '❗',
  modals: '🔑',
  conditionals: '🔀',
  'reported-speech': '💬',
  'relative-clauses': '🔗',
  'comparatives-superlatives': '📊',
}

const TENSE_SECTIONS = [
  { id: 'present', title: { en: 'Present', bn: 'বর্তমান (Present)' }, hint: { en: 'Things happening now, or always true', bn: 'এখন যা ঘটছে, বা সবসময় সত্য' } },
  { id: 'past', title: { en: 'Past', bn: 'অতীত (Past)' }, hint: { en: 'Things that already happened', bn: 'যা আগে ঘটে গেছে' } },
  { id: 'future', title: { en: 'Future', bn: 'ভবিষ্যৎ (Future)' }, hint: { en: 'Things still to come', bn: 'যা সামনে ঘটবে' } },
]

const tenses = {
  id: DEFAULT_COURSE,
  kind: 'tenses',
  title: { en: '12 Tenses', bn: '১২টি Tense' },
  tagline: { en: 'Master the 12 tenses', bn: '১২টি Tense আয়ত্ত করো' },
  subtitle: {
    en: 'Every tense has a short rule recap and 5 questions. Pick one to start. No sign-in needed, and your stars are saved on this device.',
    bn: 'প্রতিটি Tense-এ আছে ছোট্ট নিয়ম আর ৫টি প্রশ্ন। একটি বেছে নিয়ে শুরু করো। সাইন ইন লাগবে না, আর তোমার তারাগুলো এই ডিভাইসে জমা থাকে।',
  },
  topic: TENSE_TOPIC,
  rawSections: TENSE_SECTIONS,
  cards: TENSE_MODULES.map((module) => ({ ...module, section: module.time, badge: module.recap.form[0].pattern })),
}

const rules = GRAMMAR_COURSES.map((course) => ({ ...course, kind: 'rules', rawSections: course.sections }))

/** All courses, tenses first. Each section gets a colour tone (0–3) by its position. */
export const COURSES = [tenses, ...rules].map((course) => {
  const { rawSections, ...rest } = course
  return {
    ...rest,
    icon: ICONS[course.id] ?? '📘',
    sections: rawSections.map((section, index) => ({
      ...section,
      tone: index,
      cards: course.cards.filter((card) => card.section === section.id),
    })),
  }
})

export const getCourse = (id) => COURSES.find((course) => course.id === id) ?? null

export function getCard(courseId, cardId) {
  const course = getCourse(courseId)
  const card = course?.cards.find((item) => item.id === cardId) ?? null
  return card ? { course, card } : null
}

/** The card after this one in the same course, or null at the end. */
export function nextCard(course, cardId) {
  const index = course.cards.findIndex((card) => card.id === cardId)
  return index >= 0 ? course.cards[index + 1] ?? null : null
}

/**
 * Addresses. Tense cards keep their original short address (/grammar/simple-past), so links
 * already shared still work; the other courses' cards live at /grammar/<course>/<card>.
 */
export const cardPath = (courseId, cardId) => (courseId === DEFAULT_COURSE ? `/grammar/${cardId}` : `/grammar/${courseId}/${cardId}`)

/** Where a quiz address points: { courseId, cardId }. */
export const parseCardPath = (first, second) => (second
  ? { courseId: first, cardId: second }
  : { courseId: DEFAULT_COURSE, cardId: first })

/** Where best stars are saved. Tenses keep their original keys, so earlier stars still count. */
export const starsKey = (courseId, cardId) => (courseId === DEFAULT_COURSE ? cardId : `${courseId}/${cardId}`)

/** The Grammar page with a course picked: /?zone=learn&track=grammar(&course=…). Tenses is the default. */
export function grammarPath(courseId = DEFAULT_COURSE) {
  const base = '/?zone=learn&track=grammar'
  return courseId === DEFAULT_COURSE ? base : `${base}&course=${encodeURIComponent(courseId)}`
}

/** The course named in a query string; anything unknown is the tenses. */
export function courseFromSearch(search) {
  return getCourse(new URLSearchParams(search).get('course')) ?? getCourse(DEFAULT_COURSE)
}
