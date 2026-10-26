import { useEffect, useState } from 'react'
import { getItem } from '../../../config/catalog'
import { useLeaderboardStore } from '../../../stores/useLeaderboardStore'
import { useProfileStore } from '../../../stores/useProfileStore'
import { useUiStore } from '../../../stores/useUiStore'
import { formatInt, formatTime } from '../../../utils/format'

/**
 * Leaderboard table for one board (today's daily course or endless).
 * Global (Supabase) when configured, plus a "This device" view.
 * Your row is highlighted; if you're outside the top 50 it's pinned at the bottom.
 */
export function Rankings({ boardId, label }) {
  const hasGlobal = useLeaderboardStore((s) => s.hasGlobal)
  const scopeSetting = useUiStore((s) => s.rankingScope)
  const setScope = useUiStore((s) => s.setRankingScope)
  const scope = hasGlobal ? scopeSetting : 'local'
  const board = useLeaderboardStore((s) => s.boards[`${scope}:${boardId}`])
  const fetchBoard = useLeaderboardStore((s) => s.fetchBoard)
  const submission = useLeaderboardStore((s) => s.submission)
  const needsName = hasGlobal && submission?.status === 'needs-name'

  useEffect(() => { fetchBoard(boardId, scope) }, [boardId, scope, fetchBoard])

  const myId = scope === 'global' ? submission?.global?.id : submission?.local?.id
  const myRank = scope === 'global' ? submission?.global?.rank : submission?.local?.rank
  const entries = board?.entries ?? []
  const inList = myId && entries.some((e) => e.id === myId)

  return (
    <div className="nv-rankings">
      <div className="nv-rankings__head">
        <div>
          <span className="nv-rankings__title">{scope === 'global' ? 'Global ranking' : 'Best runs on this device'}</span>
          <span className="nv-rankings__board">{label}</span>
        </div>
        {hasGlobal && (
          <div className="nv-segmented nv-segmented--small" role="radiogroup" aria-label="Ranking scope">
            {[['global', 'Global'], ['local', 'Device']].map(([value, text]) => (
              <button
                key={value}
                role="radio"
                aria-checked={scope === value}
                className={`nv-segmented__opt ${scope === value ? 'is-active' : ''}`}
                onClick={() => setScope(value)}
              >{text}</button>
            ))}
          </div>
        )}
      </div>

      {needsName && <NameEntry />}

      {board?.status === 'error' && (
        <p className="nv-rankings__error">
          Couldn't load rankings ({board.error}).{' '}
          <button className="nv-link-btn" onClick={() => fetchBoard(boardId, scope, { force: true })}>Retry</button>
        </p>
      )}

      <ol className="nv-rankings__list" aria-busy={board?.status === 'loading'}>
        {board?.status === 'loading' && !entries.length
          ? Array.from({ length: 6 }, (_, i) => <li key={i} className="nv-rank-row nv-rank-row--skeleton" />)
          : entries.map((e, i) => <RankRow key={e.id} rank={i + 1} entry={e} me={e.id === myId} />)}
        {board?.status === 'ready' && !entries.length && (
          <li className="nv-rankings__empty">No runs yet — this board is yours to take.</li>
        )}
      </ol>
      {myRank && !inList && submission?.run && (
        <RankRow pinned rank={myRank} me entry={{ name: useProfileStore.getState().name || 'You', score: submission.score, distance: submission.run.distance, timeMs: submission.run.timeMs, maxSpeedKmh: submission.run.maxSpeedKmh }} />
      )}
    </div>
  )
}

function RankRow({ rank, entry, me, pinned }) {
  const skin = getItem(entry.skin)
  return (
    <li className={`nv-rank-row ${me ? 'is-me' : ''} ${pinned ? 'is-pinned' : ''} ${rank <= 3 ? `is-top${rank}` : ''}`}>
      <span className="nv-rank-row__rank">{rank}</span>
      <span className="nv-rank-row__name">
        {skin && <i className="nv-rank-row__dot" style={{ background: skin.colors.crest }} aria-hidden="true" />}
        {entry.name}{me && <em> · you</em>}
      </span>
      <span className="nv-rank-row__score">{formatInt(entry.score)}</span>
      <span className="nv-rank-row__detail">{formatInt(entry.distance)} m · {formatTime(entry.timeMs)} · {formatInt(entry.maxSpeedKmh)} km/h</span>
    </li>
  )
}

/** First-time name prompt; submits the pending run globally once saved. */
export function NameEntry({ compact = false, onSaved }) {
  const name = useProfileStore((s) => s.name)
  const setName = useProfileStore((s) => s.setName)
  const submitPendingGlobal = useLeaderboardStore((s) => s.submitPendingGlobal)
  const [value, setValue] = useState(name)

  const save = (e) => {
    e.preventDefault()
    if (!value.trim()) return
    setName(value)
    if (useLeaderboardStore.getState().submission?.status === 'needs-name') submitPendingGlobal()
    onSaved?.()
  }

  return (
    <form className={`nv-name-entry ${compact ? 'nv-name-entry--compact' : ''}`} onSubmit={save}>
      {!compact && <label htmlFor="player-name">Pick a name to post this run to the global board</label>}
      <div className="nv-name-entry__row">
        <input
          id="player-name"
          value={value}
          maxLength={16}
          placeholder="Your runner name"
          autoComplete="nickname"
          enterKeyHint="done"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()} /* don't trigger game hotkeys while typing */
        />
        <button className="nv-btn nv-btn--primary nv-btn--inline" type="submit" disabled={!value.trim()}>Save</button>
      </div>
    </form>
  )
}
