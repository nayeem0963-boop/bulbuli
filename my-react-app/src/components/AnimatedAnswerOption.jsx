import { getFeedbackStyle } from '../utils/feedbackConfig.js'

function AnimatedAnswerOption({
  feedback = null,
  option,
  children,
  className = '',
  ...props
}) {
  const result = feedback?.target === option ? ` is-${feedback.type}` : ''

  return (
    <button
      {...props}
      className={`feedback-answer-option${result} ${className}`.trim()}
      style={{ ...getFeedbackStyle(), ...props.style }}
      type="button"
    >
      {children ?? option}
    </button>
  )
}

export default AnimatedAnswerOption
