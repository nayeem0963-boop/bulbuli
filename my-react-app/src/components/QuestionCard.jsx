import { useState } from 'react'

function QuestionCard({ question, questionNumber, totalQuestions, onAnswer, onNext }) {
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState(null)

  const checkAnswer = (event) => {
    event.preventDefault()
    if (result !== null) return

    const normalizedAnswer = answer.trim().toLowerCase()
    const correct = normalizedAnswer.length > 0 && question.keywords.some(
      (keyword) => normalizedAnswer.includes(keyword.toLowerCase()),
    )
    setResult(correct)
    onAnswer(correct)
  }

  return (
    <section className="card question-card" aria-labelledby="question-prompt">
      <p className="eyebrow">Question {questionNumber} of {totalQuestions}</p>
      <h2 id="question-prompt">{question.question}</h2>
      <form onSubmit={checkAnswer}>
        <label className="answer-label" htmlFor="question-answer">Your answer</label>
        <input
          id="question-answer"
          type="text"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          disabled={result !== null}
          required
        />
        {result === null && <button className="button" type="submit">Check answer</button>}
      </form>
      {result !== null && (
        <div className={result ? 'feedback correct' : 'feedback incorrect'} role="status">
          <p>{result ? '✅ Correct!' : '❌ Not quite.'}</p>
          <p>Correct answer: {question.answer}</p>
          <button className="button" type="button" onClick={onNext}>Next</button>
        </div>
      )}
    </section>
  )
}

export default QuestionCard
