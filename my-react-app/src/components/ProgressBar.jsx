function ProgressBar({ value, max }) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0

  return (
    <div className="progress">
      <div className="progress-label">
        <span>Progress</span>
        <span>{value}/{max}</span>
      </div>
      <progress value={value} max={max} aria-label="Level progress">
        {percent}%
      </progress>
    </div>
  )
}

export default ProgressBar
