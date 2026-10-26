import { formatInt, formatSeconds, formatTime } from '../../../utils/format'

/** Grid of stats for the finished run. */
export function RunStats({ run }) {
  const stats = [
    ['Distance', `${formatInt(run.distance)} m`],
    ['Time', formatTime(run.timeMs)],
    ['Top speed', `${formatInt(run.maxSpeedKmh)} km/h`],
    ['Energy', `${run.crystals}`, run.earned ? `+${run.earned} ◆` : null],
    ['Neon Surges', run.surges],
    ['Air time', formatSeconds(run.airTime)],
    ['Grinds', run.grinds, run.grindTime > 0 ? formatSeconds(run.grindTime) : null],
    ['Wall runs', run.wallRuns],
    ['Jumps', run.jumps + run.doubleJumps + run.wallJumps, run.doubleJumps ? `${run.doubleJumps} double` : null],
    ['Hits', run.hits, run.smashes ? `${run.smashes} smashed` : null],
  ]
  return (
    <dl className="nv-run-stats">
      {stats.map(([label, value, sub]) => (
        <div key={label} className="nv-run-stats__item">
          <dt>{label}</dt>
          <dd>{value}{sub && <small>{sub}</small>}</dd>
        </div>
      ))}
    </dl>
  )
}
