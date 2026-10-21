import { getFeedbackStyle } from '../utils/feedbackConfig.js'

const DEFAULT_LABELS = {
  life: (count) => (count === 1 ? 'Life' : 'Lives'),
  livesLabel: (count, n) => `${n} ${count === 1 ? 'life' : 'lives'} remaining`,
  extraLife: '+1 Extra Life!',
  formatNumber: (value) => String(value),
}

function LifeCounter({ lives, event = null, className = '', labels = DEFAULT_LABELS }) {
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
      aria-label={labels.livesLabel(lives, labels.formatNumber(lives))}
      aria-live="polite"
    >
      <span className="feedback-life-hearts" aria-hidden="true">
        {hearts.map((heart) => (
          <span className={`feedback-life-heart ${heart.state}`} key={heart.key}>❤️</span>
        ))}
      </span>
      <strong>{labels.formatNumber(lives)}</strong>
      <span>{labels.life(lives)}</span>
      {event?.type === 'bonus' && (
        <span key={event.id} className="feedback-life-particle" aria-hidden="true">
          {labels.extraLife}
        </span>
      )}
    </div>
  )
}

export default LifeCounter
