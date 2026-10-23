// The grammar courses beyond the tenses. Each course is one JSON file in this folder,
// shaped by course.schema.json; courses.test.js checks them all.
import subjectVerbAgreement from './subject-verb-agreement.json' with { type: 'json' }
import articlesPrepositions from './articles-prepositions.json' with { type: 'json' }
import activePassiveVoice from './active-passive-voice.json' with { type: 'json' }
import punctuationSentences from './punctuation-sentences.json' with { type: 'json' }

export const GRAMMAR_COURSES = [subjectVerbAgreement, articlesPrepositions, activePassiveVoice, punctuationSentences]

export const getCourse = (id) => GRAMMAR_COURSES.find((course) => course.id === id) ?? null

/** A course's sections, each with its cards, in order. */
export const courseSections = (course) => course.sections.map((section) => ({
  ...section,
  cards: course.cards.filter((card) => card.section === section.id),
}))
