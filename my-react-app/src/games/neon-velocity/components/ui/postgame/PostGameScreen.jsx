import { CourseMode } from '../../../services/course'
import { useResponsive } from '../../../hooks/useResponsive'
import { DeathCause, useGameStore } from '../../../stores/useGameStore'
import { useLeaderboardStore } from '../../../stores/useLeaderboardStore'
import { useUiStore } from '../../../stores/useUiStore'
import { formatInt } from '../../../utils/format'
import { ClipCard } from './ClipCard'
import { Rankings } from './Rankings'
import { RunStats } from './RunStats'

/**
 * Post-game screen.
 *   Desktop: run stats + highlight clip on the left, rankings on the right.
 *   < 768 px: the same two panels as tabs, inside a scrollable bottom sheet.
 * Actions: run again (Enter), race your ghost (daily course), Vault, menu.
 */
export function PostGameScreen() {
  const run = useGameStore((s) => s.lastRun)
  const isNewBest = useGameStore((s) => s.isNewBest)
  const start = useGameStore((s) => s.start)
  const goToMenu = useGameStore((s) => s.goToMenu)
  const setRaceGhost = useGameStore((s) => s.setRaceGhost)
  const submission = useLeaderboardStore((s) => s.submission)
  const hasGlobal = useLeaderboardStore((s) => s.hasGlobal)
  const { isMobile } = useResponsive()
  const tab = useUiStore((s) => s.postGameTab)
  const setTab = useUiStore((s) => s.setPostGameTab)
  const openVault = useUiStore((s) => s.openVault)

  if (!run) return null
  const daily = run.mode === CourseMode.DAILY
  const rank = submission?.global?.rank ?? submission?.local?.rank
  const rankScope = submission?.global ? 'Global' : 'Device'

  const raceGhost = () => { setRaceGhost('pb'); start() }
  const toVault = () => { goToMenu(); openVault() }

  return (
    <div className="nv-overlay nv-overlay--gameover nv-postgame" role="dialog" aria-labelledby="postgame-title">
      <section className="nv-postgame__card">
        <header className="nv-postgame__header">
          <p className="nv-postgame__course">{run.courseLabel}</p>
          <h2 id="postgame-title" className="nv-heading nv-heading--danger">
            {run.cause === DeathCause.FALL ? 'Lost to the void' : 'Systems critical'}
          </h2>
          <p className="nv-final-score">{formatInt(run.score)}</p>
          <div className="nv-postgame__badges">
            {isNewBest && <span className="nv-badge">New best</span>}
            {run.scoreMultiplier > 1 && <span className="nv-badge nv-badge--muted">{run.scoreMultiplier.toFixed(1)}× score</span>}
            {rank && <span className="nv-badge nv-badge--rank">#{rank} {rankScope}</span>}
            {submission?.status === 'saving' && <span className="nv-badge nv-badge--muted">Saving…</span>}
            {run.earned > 0 && <span className="nv-badge nv-badge--crystal">+{run.earned} ◆ banked</span>}
          </div>
        </header>

        {isMobile && (
          <div className="nv-tabs" role="tablist">
            {[['run', 'Run'], ['rankings', hasGlobal ? 'Rankings' : 'Best runs']].map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                className={`nv-tabs__tab ${tab === id ? 'is-active' : ''}`}
                onClick={() => setTab(id)}
              >{label}</button>
            ))}
          </div>
        )}

        <div className="nv-postgame__body">
          {(!isMobile || tab === 'run') && (
            <div className="nv-postgame__col">
              <RunStats run={run} />
              <ClipCard run={run} />
            </div>
          )}
          {(!isMobile || tab === 'rankings') && (
            <div className="nv-postgame__col">
              <Rankings boardId={run.boardId} label={run.courseLabel} />
            </div>
          )}
        </div>

        <footer className="nv-postgame__actions">
          <button className="nv-btn nv-btn--primary" onClick={start} autoFocus>Run again</button>
          {daily && <button className="nv-btn" onClick={raceGhost}>Race your ghost</button>}
          <button className="nv-btn" onClick={toVault}>Vault</button>
          <button className="nv-btn nv-btn--ghost" onClick={goToMenu}>Menu</button>
        </footer>
      </section>
    </div>
  )
}
