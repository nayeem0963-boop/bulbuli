import { getFeedbackStyle } from '../utils/feedbackConfig.js'

function LifeCounter({ lives, event = null, className = '' }) {
  if (!Number.isInteger(lives) || lives < 0) {
    throw new RangeError('LifeCounter requires a non-negative integer life count.')
  }

  const hearts = Array.from({ length: lives }, (_, index) => ({
    key: `life-${index}`,
    state: event?.type === 'bonus' && index === lives - 1 ? 'is-gained' : '',
  }))
  if (event?.type === 'wrong') {
    hearts.push({ key: `lost-${event.id}`, state: 'is-lost' })
  }

  return (
    <div
      className={`feedback-life-counter ${className}`.trim()}
      style={getFeedbackStyle()}
      aria-label={`${lives} ${lives === 1 ? 'life' : 'lives'} remaining`}
      aria-live="polite"
    >
      <span className="feedback-life-hearts" aria-hidden="true">
        {hearts.map((heart) => (
          <span className={`feedback-life-heart ${heart.state}`} key={heart.key}>❤️</span>
        ))}
      </span>
      <strong>{lives}</strong>
      <span>{lives === 1 ? 'Life' : 'Lives'}</span>
      {event?.type === 'bonus' && (
        <span key={event.id} className="feedback-life-particle" aria-hidden="true">
          +1 Extra Life!
        </span>
      )}
    </div>
  )
}

export default LifeCounter
