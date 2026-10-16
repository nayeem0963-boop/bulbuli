function ProgressBar({ value, max, label = 'Quiz progress' }) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0

  return (
    <div className="progress quiz-progress">
      <div className="progress-label">
        <span>{label}</span>
        <span>{Math.min(value, max)} <span aria-hidden="true">/</span> {max}</span>
      </div>
      <progress value={value} max={max} aria-label={label}>
        {percent}%
      </progress>
    </div>
  )
}

export default ProgressBar
