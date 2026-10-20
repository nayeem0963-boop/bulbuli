export const MATH_HERO_QUESTIONS_PER_LEVEL = 5
export const MATH_HERO_QUESTION_SECONDS = 2 * 60

function randomInteger(max) {
  return Math.floor(Math.random() * max)
}

function shuffle(values) {
  const shuffled = values.slice()
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInteger(index + 1)
    const temporary = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = temporary
  }
  return shuffled
}

export function createMathHeroDeadline() {
  return new Date(Date.now() + MATH_HERO_QUESTION_SECONDS * 1000).toISOString()
}

export function createMathHeroFeedback(type) {
  if (!['incorrect', 'timeout'].includes(type)) {
    throw new TypeError('Math Hero feedback must describe an incorrect answer or timeout.')
  }

  return { type, createdAt: new Date().toISOString(), ready: false }
}

export function createMathHeroQuestion(level) {
  if (!Number.isInteger(level) || level < 1) {
    throw new RangeError('Math Hero levels must be positive integers.')
  }

  const maxOperand = level === 1 ? 9 : level === 2 ? 20 : 99
  const left = randomInteger(maxOperand) + 1
  const right = randomInteger(maxOperand) + 1
  const operator = randomInteger(2) === 0 ? '+' : '-'
  const first = operator === '+' ? left : Math.max(left, right)
  const second = operator === '+' ? right : Math.min(left, right)
  const answer = operator === '+' ? first + second : first - second
  const choices = new Set([answer])

  while (choices.size < 4) {
    const offset = randomInteger(9) - 4
    const distractor = answer + (offset === 0 ? 5 : offset)
    if (distractor >= 0 && distractor !== answer) choices.add(distractor)
  }

  return {
    left: first,
    right: second,
    operator,
    answer,
    options: shuffle([...choices]),
  }
}

export function createInitialMathHeroProgress() {
  const level = 1
  return {
    level,
    questionNumber: 1,
    totalXp: 0,
    question: createMathHeroQuestion(level),
    deadline: createMathHeroDeadline(),
    feedback: null,
  }
}

export function createNextMathHeroProgress(progress) {
  const questionNumber = progress.questionNumber === MATH_HERO_QUESTIONS_PER_LEVEL
    ? 1
    : progress.questionNumber + 1
  const level = questionNumber === 1 ? progress.level + 1 : progress.level

  return {
    ...progress,
    level,
    questionNumber,
    question: createMathHeroQuestion(level),
    deadline: createMathHeroDeadline(),
    feedback: null,
  }
}
