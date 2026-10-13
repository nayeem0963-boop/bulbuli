import { useContext } from 'react'
import { QuizContext } from '../context/quizContext.js'

export function useQuiz() {
  const context = useContext(QuizContext)
  if (context === null) {
    throw new Error('useQuiz must be used within a QuizProvider.')
  }

  return context
}
