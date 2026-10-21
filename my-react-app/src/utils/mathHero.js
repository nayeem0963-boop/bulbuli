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

function randomBetween(min, max) {
  return min + randomInteger(max - min + 1)
}

function createChoices(answer) {
  const choices = new Set([answer])

  while (choices.size < 4) {
    const offset = randomInteger(13) - 6
    const distractor = answer + (offset === 0 ? 7 : offset)
    if (distractor >= 0 && distractor !== answer) choices.add(distractor)
  }

  return shuffle([...choices])
}

export function generateMathQuestion(level) {
  if (!Number.isInteger(level) || level < 1) {
    throw new RangeError('Math Hero levels must be positive integers.')
  }

  let left
  let right
  let operator
  let answer

  if (level <= 10) {
    const maxOperand = level === 1 ? 9 : Math.min(level * 10, 99)
    left = randomBetween(1, maxOperand)
    right = randomBetween(1, maxOperand)
    operator = randomInteger(2) === 0 ? '+' : '-'
  } else if (level <= 20) {
    left = randomBetween(55, 299)
    right = randomBetween(55, 299)
    operator = randomInteger(2) === 0 ? '+' : '-'
  } else if (level <= 30) {
    left = randomBetween(255, 895)
    right = randomBetween(255, 895)
    operator = randomInteger(2) === 0 ? '+' : '-'
  } else {
    const tier = Math.floor((level - 31) / 10)
    const maxFactor = Math.min(12 + tier * 3, 30)
    if (randomInteger(2) === 0) {
      left = randomBetween(2, maxFactor)
      right = randomBetween(2, maxFactor)
      operator = '×'
    } else {
      right = randomBetween(2, maxFactor)
      const quotient = randomBetween(2, maxFactor)
      left = right * quotient
      operator = '÷'
    }
  }

  if (operator === '+') {
    answer = left + right
  } else if (operator === '-') {
    if (left < right) [left, right] = [right, left]
    answer = left - right
  } else if (operator === '×') {
    answer = left * right
  } else {
    answer = left / right
  }

  return {
    left,
    right,
    operator,
    answer,
    options: createChoices(answer),
  }
}

export function createInitialMathHeroProgress() {
  const level = 1
  return {
    level,
    questionNumber: 1,
    totalXp: 0,
    lives: 1,
    correctAnswers: 0,
    question: generateMathQuestion(level),
    deadline: createMathHeroDeadline(),
    feedback: null,
    gameOver: null,
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
    question: generateMathQuestion(level),
    deadline: createMathHeroDeadline(),
    feedback: null,
    gameOver: null,
  }
}

export function applyMathHeroCorrectAnswer(progress) {
  const correctAnswers = progress.correctAnswers + 1
  const bonusLifeAwarded = correctAnswers % 10 === 0

  return {
    progress: createNextMathHeroProgress({
      ...progress,
      totalXp: progress.totalXp + 5,
      correctAnswers,
      lives: progress.lives + (bonusLifeAwarded ? 1 : 0),
    }),
    bonusLifeAwarded,
  }
}

export function applyMathHeroMiss(progress, type) {
  return {
    ...progress,
    lives: Math.max(0, progress.lives - 1),
    deadline: null,
    feedback: createMathHeroFeedback(type),
  }
}

export function createMathHeroGameOverProgress(progress) {
  const initialProgress = createInitialMathHeroProgress()
  return {
    ...initialProgress,
    deadline: null,
    gameOver: {
      finalScore: progress.totalXp,
      finalLevel: progress.level,
      correctAnswers: progress.correctAnswers,
    },
  }
}
