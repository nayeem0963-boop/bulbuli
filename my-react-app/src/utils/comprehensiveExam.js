export const COMPREHENSIVE_EXAM_SIZE = 50
export const COMPREHENSIVE_EXAM_DURATION_SECONDS = 15 * 60
export const COMPREHENSIVE_EXAM_PASS_PERCENT = 80

export function shuffleArray(items, random = Math.random) {
  const shuffled = items.slice()

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}

export function sampleExamQuestions(catalog, size = COMPREHENSIVE_EXAM_SIZE, random = Math.random) {
  if (!Array.isArray(catalog) || !Number.isInteger(size) || size < 1) {
    throw new TypeError('Exam sampling requires a catalog and a positive question count.')
  }

  const questionBank = catalog.flatMap((tutorial) => (
    tutorial.questions.map((question, questionIndex) => ({
      ...question,
      id: `${tutorial.id}:${questionIndex}`,
      tutorialId: tutorial.id,
      tutorialTitle: tutorial.title,
      category: tutorial.category,
    }))
  ))

  if (questionBank.length < size) {
    throw new RangeError(`The question bank contains ${questionBank.length} questions; ${size} are required.`)
  }

  const activeTutorials = catalog.filter((tutorial) => tutorial.questions.length > 0)
  if (activeTutorials.length > size) {
    throw new RangeError(`The exam size must cover all ${activeTutorials.length} active tutorials.`)
  }

  const requiredQuestions = activeTutorials.map((tutorial) => {
    const questionIndex = Math.floor(random() * tutorial.questions.length)
    return questionBank.find((question) => (
      question.tutorialId === tutorial.id && question.id === `${tutorial.id}:${questionIndex}`
    ))
  })
  const requiredIds = new Set(requiredQuestions.map((question) => question.id))
  const remainingQuestions = questionBank.filter((question) => !requiredIds.has(question.id))
  return shuffleArray([
    ...requiredQuestions,
    ...shuffleArray(remainingQuestions, random).slice(0, size - requiredQuestions.length),
  ], random)
}

export function sampleUniqueExamQuestions(catalog, previousQuestionSets = [], size = COMPREHENSIVE_EXAM_SIZE) {
  const previousOrders = new Set(previousQuestionSets.map((ids) => ids.join('|')))

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const questions = sampleExamQuestions(catalog, size)
    if (!previousOrders.has(questions.map((question) => question.id).join('|'))) return questions
  }

  const questions = sampleExamQuestions(catalog, size)
  const ordering = questions.slice().sort((left, right) => left.id.localeCompare(right.id))
  for (let attempt = 0; attempt <= previousOrders.size; attempt += 1) {
    const signature = ordering.map((question) => question.id).join('|')
    if (!previousOrders.has(signature)) return ordering.slice()

    let pivot = ordering.length - 2
    while (pivot >= 0 && ordering[pivot].id >= ordering[pivot + 1].id) pivot -= 1
    if (pivot < 0) break

    let successor = ordering.length - 1
    while (ordering[successor].id <= ordering[pivot].id) successor -= 1
    ;[ordering[pivot], ordering[successor]] = [ordering[successor], ordering[pivot]]
    ordering.splice(pivot + 1, ordering.length, ...ordering.slice(pivot + 1).reverse())
  }
  throw new Error('A unique question order could not be created for this exam attempt.')
}

export function createExamAttempt(questions, now = Date.now()) {
  if (!Array.isArray(questions) || questions.length !== COMPREHENSIVE_EXAM_SIZE) {
    throw new TypeError(`A comprehensive exam must contain exactly ${COMPREHENSIVE_EXAM_SIZE} questions.`)
  }

  return {
    id: `${now}-${Math.random().toString(36).slice(2)}`,
    questions,
    answers: Array(questions.length).fill(null),
    currentIndex: 0,
    startedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + COMPREHENSIVE_EXAM_DURATION_SECONDS * 1000).toISOString(),
  }
}

export function scoreExam(attempt, submittedAt = new Date().toISOString()) {
  const correct = attempt.questions.reduce(
    (total, question, index) => total + (attempt.answers[index] === question.correctIndex ? 1 : 0),
    0,
  )
  const percentage = Math.round((correct / COMPREHENSIVE_EXAM_SIZE) * 100)
  const categoryScores = attempt.questions.reduce((scores, question, index) => {
    const category = question.category || 'Other'
    const score = scores[category] ?? { correct: 0, total: 0 }
    score.total += 1
    if (attempt.answers[index] === question.correctIndex) score.correct += 1
    scores[category] = score
    return scores
  }, {})

  return {
    id: attempt.id,
    startedAt: attempt.startedAt,
    submittedAt,
    score: correct,
    totalQuestions: COMPREHENSIVE_EXAM_SIZE,
    percentage,
    passed: percentage >= COMPREHENSIVE_EXAM_PASS_PERCENT,
    perfect: percentage === 100,
    timedOut: Date.parse(submittedAt) >= Date.parse(attempt.expiresAt),
    xpEarned: percentage === 100 ? 100 : percentage >= COMPREHENSIVE_EXAM_PASS_PERCENT ? 50 : 0,
    questionIds: attempt.questions.map((question) => question.id),
    categoryScores,
  }
}
