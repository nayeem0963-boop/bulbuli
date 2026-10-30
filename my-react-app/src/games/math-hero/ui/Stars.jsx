/** A row of 0–3 stars. `animate` pops the earned ones in, one after another. */
export default function Stars({ count, label, size = 'sm', animate = false }) {
  return (
    <span className={`mh-stars is-${size}`} role="img" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`${i < count ? 'is-on' : ''}${i < count && animate ? ' is-animated' : ''}`}
          style={i < count && animate ? { animationDelay: `${0.25 + i * 0.25}s` } : undefined}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </span>
  )
}
