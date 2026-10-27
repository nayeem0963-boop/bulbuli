// Checks a course's data for the mistakes the quiz engine can't recover from.
// Used by courses.test.js (npm test) and, as console warnings, by quiz/engine.js.

export const OPTION_COUNT = 4
const REQUIRED_TEXT = ['topic', 'question', 'hint', 'lesson']

/** Returns a list of human-readable problems; an empty list means the course is valid. */
export function validateCourse(course) {
  const problems = []
  if (!course?.id) problems.push('course has no id')
  if (!course?.title) problems.push('course has no title')
  const levels = Array.isArray(course?.levels) ? course.levels : []
  const questions = Array.isArray(course?.questions) ? course.questions : []
  if (!levels.length) problems.push('course has no levels')
  if (!questions.length) problems.push('course has no questions')

  const levelNumbers = new Set()
  for (const level of levels) {
    if (!Number.isInteger(level.number)) problems.push(`level "${level.name}" has no number`)
    if (levelNumbers.has(level.number)) problems.push(`level ${level.number} is listed twice`)
    levelNumbers.add(level.number)
    for (const key of ['name', 'color', 'icon']) {
      if (!level[key]) problems.push(`level ${level.number} has no ${key}`)
    }
  }

  const ids = new Set()
  const questionTexts = new Set()
  let lastLevelIndex = 0
  for (const q of questions) {
    const label = `question ${q?.id ?? '(no id)'}`
    if (q.id === undefined || q.id === null || q.id === '') problems.push(`${label}: missing id`)
    if (ids.has(q.id)) problems.push(`${label}: duplicate id`)
    ids.add(q.id)

    const levelIndex = levels.findIndex((l) => l.number === q.level)
    if (levelIndex === -1) problems.push(`${label}: unknown level ${q.level}`)
    else if (levelIndex < lastLevelIndex) problems.push(`${label}: out of level order`)
    else lastLevelIndex = levelIndex

    for (const key of REQUIRED_TEXT) {
      if (typeof q[key] !== 'string' || !q[key].trim()) problems.push(`${label}: missing ${key}`)
    }
    if (typeof q.question === 'string') {
      const key = q.question.replace(/\s+/g, ' ').trim()
      if (questionTexts.has(key)) problems.push(`${label}: same question text as an earlier question`)
      questionTexts.add(key)
    }

    if (!Array.isArray(q.options) || q.options.length !== OPTION_COUNT) {
      problems.push(`${label}: needs exactly ${OPTION_COUNT} options`)
    } else {
      if (q.options.some((o) => typeof o !== 'string' || !o.trim())) problems.push(`${label}: empty option`)
      if (new Set(q.options.map((o) => o.trim())).size !== q.options.length) problems.push(`${label}: repeated option`)
    }
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= OPTION_COUNT) {
      problems.push(`${label}: correctIndex must be 0–${OPTION_COUNT - 1}`)
    }
  }

  for (const level of levels) {
    if (!questions.some((q) => q.level === level.number)) problems.push(`level ${level.number} has no questions`)
  }
  return problems
}
