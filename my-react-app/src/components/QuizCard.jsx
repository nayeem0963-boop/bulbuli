function QuizCard({
  question,
  questionNumber,
  totalQuestions,
  selectedIndex,
  onAnswer,
  onPrevious,
  onNext,
  isLastQuestion,
  canFinish,
}) {
  const answeredCorrectly = selectedIndex === question.correctIndex

  return (
    <section className="card question-card" aria-labelledby="quiz-prompt">
      <div className="quiz-question-meta">
        <p className="eyebrow">Question {questionNumber}</p>
        <span>{String(questionNumber).padStart(2, '0')} <span aria-hidden="true">/</span> {String(totalQuestions).padStart(2, '0')}</span>
      </div>
      <h2 id="quiz-prompt">{question.question}</h2>
      <div className="answer-options" role="group" aria-label="Answer choices">
        {question.options.map((option, index) => {
          const isSelected = selectedIndex === index
          const isCorrect = selectedIndex !== null && index === question.correctIndex
          const isIncorrect = isSelected && !answeredCorrectly

          return (
            <button
              key={option}
              type="button"
              className={`${isCorrect ? 'option-correct' : ''}${isIncorrect ? ' option-incorrect' : ''}${isSelected ? ' is-selected' : ''}`}
              onClick={() => onAnswer(index)}
              aria-pressed={isSelected}
            >
              <span className="answer-option-letter">{String.fromCharCode(65 + index)}</span>
              <span>{option}</span>
              {isCorrect && <span className="answer-option-mark" aria-label="Correct answer">✓</span>}
            </button>
          )
        })}
      </div>
      {selectedIndex !== null && (
        <div className={`feedback ${answeredCorrectly ? 'correct' : 'incorrect'}`} role="status">
          <div>
            <strong>{answeredCorrectly ? 'That’s right!' : 'Not quite yet'}</strong>
            <span>{answeredCorrectly
              ? 'You’ve got this concept.'
              : `The answer is: ${question.options[question.correctIndex]}`}</span>
          </div>
        </div>
      )}
      <div className="quiz-card-navigation">
        <button
          className="button-secondary"
          type="button"
          onClick={onPrevious}
          disabled={!onPrevious}
        >
          <span aria-hidden="true">←</span> Previous
        </button>
        <button
          className="button"
          type="button"
          onClick={onNext}
          disabled={selectedIndex === null || (isLastQuestion && !canFinish)}
        >
          {isLastQuestion ? 'See results' : 'Next question'}
          <span aria-hidden="true">→</span>
        </button>
      </div>
      {isLastQuestion && selectedIndex !== null && !canFinish && (
        <p className="quiz-completion-hint">Answer each question before viewing your results.</p>
      )}
    </section>
  )
}

export default QuizCard
