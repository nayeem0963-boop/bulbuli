import { useState } from 'react'

function QuizCard({ question, questionNumber, totalQuestions, onAnswer, onNext }) {
  const [selectedIndex, setSelectedIndex] = useState(null)

  const selectAnswer = (index) => {
    if (selectedIndex !== null) return

    setSelectedIndex(index)
    onAnswer(index === question.correctIndex)
  }

  const answeredCorrectly = selectedIndex === question.correctIndex

  return (
    <section className="card question-card" aria-labelledby="quiz-prompt">
      <p className="eyebrow">Quiz {questionNumber} of {totalQuestions}</p>
      <h2 id="quiz-prompt">{question.question}</h2>
      <div className="answer-options">
        {question.options.map((option, index) => (
          <button
            key={option}
            type="button"
            className={selectedIndex === null ? '' : index === question.correctIndex ? 'option-correct' : index === selectedIndex ? 'option-incorrect' : ''}
            onClick={() => selectAnswer(index)}
            disabled={selectedIndex !== null}
          >
            {option}
          </button>
        ))}
      </div>
      {selectedIndex !== null && (
        <div className={answeredCorrectly ? 'feedback correct' : 'feedback incorrect'} role="status">
          <p>{answeredCorrectly ? '✅ Correct!' : '❌ Incorrect.'}</p>
          {!answeredCorrectly && <p>Correct answer: {question.options[question.correctIndex]}</p>}
          <button className="button" type="button" onClick={onNext}>Next</button>
        </div>
      )}
    </section>
  )
}

export default QuizCard
