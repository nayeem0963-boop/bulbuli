// Pro Coder: the HTML course (curriculum + question bank). Played by the quiz engine in quiz/engine.js.
import fundamentals from './questions/01-fundamentals.js'
import text from './questions/02-text.js'
import links from './questions/03-links.js'
import media from './questions/04-media.js'
import listsTables from './questions/05-lists-tables.js'
import forms from './questions/06-forms.js'
import semantic from './questions/07-semantic.js'
import metadata from './questions/08-metadata.js'
import attributesA11y from './questions/09-attributes-a11y.js'
import practical from './questions/10-practical.js'

/** Levels in course order. `number` matches each question's `level`; `color` is any CSS colour. */
export const levels = [
  { number: 1, name: 'HTML Fundamentals', difficulty: 'Beginner', color: '#38bdf8', icon: '🌱' },
  { number: 2, name: 'Text & Content', difficulty: 'Beginner', color: '#a78bfa', icon: '✍️' },
  { number: 3, name: 'Links & Navigation', difficulty: 'Beginner', color: '#f472b6', icon: '🔗' },
  { number: 4, name: 'Images & Media', difficulty: 'Beginner', color: '#fb923c', icon: '🖼️' },
  { number: 5, name: 'Lists & Tables', difficulty: 'Beginner', color: '#34d399', icon: '📋' },
  { number: 6, name: 'Forms & User Input', difficulty: 'Intermediate', color: '#facc15', icon: '📝' },
  { number: 7, name: 'Semantic HTML', difficulty: 'Intermediate', color: '#60a5fa', icon: '🏛️' },
  { number: 8, name: 'Metadata & Document Structure', difficulty: 'Intermediate', color: '#c084fc', icon: '🧭' },
  { number: 9, name: 'Attributes & Accessibility', difficulty: 'Intermediate', color: '#2dd4bf', icon: '♿' },
  { number: 10, name: 'Practical HTML & Knowledge Check', difficulty: 'Intermediate', color: '#f87171', icon: '🛠️' },
]

export const questions = [
  ...fundamentals,
  ...text,
  ...links,
  ...media,
  ...listsTables,
  ...forms,
  ...semantic,
  ...metadata,
  ...attributesA11y,
  ...practical,
]

const htmlCourse = {
  id: 'html',
  title: 'HTML Course',
  subject: 'HTML',
  tagline: 'From your first tag to accessible, well-structured pages.',
  intro:
    'Learn HTML the way it is written today: one short question at a time. Every question has a hint and a mini-lesson, ' +
    'and the timer pauses while you read. Work through all ten levels, from your first tag to forms, semantic HTML and accessibility.',
  levels,
  questions,
  // Mastery badges, by percentage of the maximum score (checked top-down)
  badges: [
    { min: 90, icon: '🏆', title: 'HTML Junior Dev', color: '#22c55e', desc: "Outstanding! You're ready to build real pages. CSS is the next step on your Pro Coder path." },
    { min: 70, icon: '🎓', title: 'HTML Apprentice', color: '#a78bfa', desc: "Solid foundations. Review the levels below that aren't full yet to level up." },
    { min: 40, icon: '📘', title: 'HTML Learner', color: '#38bdf8', desc: 'Good progress! Re-read the lessons for questions you missed and try again.' },
    { min: 0, icon: '🌱', title: 'HTML Novice', color: '#f59e0b', desc: "Every expert started here. Open the lessons as you go; that's what they're for." },
  ],
}

export default htmlCourse
