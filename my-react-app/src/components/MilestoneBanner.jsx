import { getFeedbackStyle } from '../utils/feedbackConfig.js'

function MilestoneBanner({ event, className = '' }) {
  if (!event) return null

  return (
    <p
      key={event.id}
      className={`feedback-milestone-banner is-${event.type} ${className}`.trim()}
      style={getFeedbackStyle()}
      role="status"
    >
      {event.message}
    </p>
  )
}

export default MilestoneBanner
