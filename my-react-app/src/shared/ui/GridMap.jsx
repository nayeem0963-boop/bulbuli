import runnerBird from '../../assets/bulbul-runner.webp'
import './grid-map.css'

/**
 * The grid map used by the coding games (Code Critter, Bug Hunter).
 *
 * board   parseLevel() result from src/games/code-critter/engine.js
 * frames  run().frames from the same engine; index is the frame on show
 * text    the game's words: map, bulbuli, seeds, where(row, col), facing{N,E,S,W}, cell{...}
 * n       formats numbers for the current language
 * goal    'nest' (default) or 'chest'; open opens the chest
 */

function CellArt({ type, goal, open }) {
  if (type === 'nest') {
    return goal === 'chest'
      ? <span className={`grid-map-chest${open ? ' is-open' : ''}`} />
      : <span className="grid-map-nest"><i /><i /></span>
  }
  if (type === 'seed') return <span className="grid-map-seed" />
  if (type === 'rock') return <span className="grid-map-rock" />
  if (type === 'tree') return <span className="grid-map-tree">🌳</span>
  if (type === 'start') return <span className="grid-map-start" />
  return null
}

export default function GridMap({ board, frames, index, text, n, goal = 'nest', open = false }) {
  const frame = frames[index]
  const taken = new Set(frame.collected.map((seed) => `${seed.row},${seed.col}`))
  const hit = frame.event === 'bump' && frame.bump && !frame.bump.edge ? `${frame.bump.row},${frame.bump.col}` : null

  // The picture of Bulbuli faces left or right: keep the last sideways heading.
  let flipped = false
  for (let i = index; i >= 0; i -= 1) {
    if (frames[i].facing === 'E') break
    if (frames[i].facing === 'W') { flipped = true; break }
  }

  const goalName = goal === 'chest' ? text.cell.chest : text.cell.nest
  const seedsLeft = board.seeds.length - frame.collected.length
  const label = [
    `${text.map}.`,
    `${text.bulbuli}: ${text.where(n(frame.row + 1), n(frame.col + 1))}, ${text.facing[frame.facing]}.`,
    `${goalName}: ${text.where(n(board.nest.row + 1), n(board.nest.col + 1))}.`,
    board.seeds.length ? `${text.seeds}: ${n(seedsLeft)}.` : '',
  ].join(' ')

  return (
    <div className="grid-map" role="img" aria-label={label} style={{ '--cols': board.width, '--rows': board.height }}>
      {board.cells.map((cell) => {
        const key = `${cell.row},${cell.col}`
        const type = cell.type === 'seed' && taken.has(key) ? 'grass' : cell.type
        return (
          <span key={key} className={`grid-map-cell is-${type}${hit === key ? ' is-hit' : ''}`}>
            <CellArt type={type} goal={goal} open={open} />
          </span>
        )
      })}
      <span
        key={frame.event === 'bump' ? `bump-${index}` : 'bird'}
        className={`grid-map-bird${frame.event === 'bump' ? ' is-bump' : ''}${frame.event === 'seed' ? ' is-happy' : ''}`}
        style={{ '--row': frame.row, '--col': frame.col }}
      >
        <span className="grid-map-heading" style={{ '--turns': frame.turns }} />
        <img className={flipped ? 'is-flipped' : ''} src={runnerBird} alt="" width="240" height="236" draggable="false" />
      </span>
    </div>
  )
}
