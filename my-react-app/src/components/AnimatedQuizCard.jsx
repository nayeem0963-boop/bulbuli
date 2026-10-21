import { createElement } from 'react'
import { getFeedbackStyle } from '../utils/feedbackConfig.js'

function AnimatedQuizCard({
  as = 'section',
  className = '',
  feedback = null,
  children,
  ...props
}) {
  const feedbackClass = feedback?.type === 'correct'
    ? ' is-correct'
    : feedback?.type === 'wrong'
      ? ' is-wrong'
      : ''

  return createElement(
    as,
    {
      ...props,
      key: feedback?.id ?? 'idle',
      className: `feedback-animated-card${feedbackClass} ${className}`.trim(),
      style: { ...getFeedbackStyle(), ...props.style },
    },
    children,
  )
}

export default AnimatedQuizCard
