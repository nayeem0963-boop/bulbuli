import { ArrowBigUp, Eye, Gem, Hand, Play, Trophy } from 'lucide-react'
import { Suspense, lazy, memo, useEffect, useRef, useState } from 'react'
import { formatCount, timeAgo } from './gallery.js'
import LevelThumbnail from './LevelThumbnail.jsx'

const LevelPreview3D = lazy(() => import('./Gallery3D.jsx').then((m) => ({ default: m.LevelPreview3D })))

const TAG_STYLES = {
  Speedrun: 'bg-cyan-500/20 text-cyan-200 ring-cyan-400/40',
  Obby: 'bg-indigo-500/20 text-indigo-200 ring-indigo-400/40',
  Hazard: 'bg-red-500/20 text-red-200 ring-red-400/40',
  Bounce: 'bg-green-500/20 text-green-200 ring-green-400/40',
  Climb: 'bg-purple-500/20 text-purple-200 ring-purple-400/40',
  Chill: 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/40',
  New: 'bg-amber-500/20 text-amber-200 ring-amber-400/40',
}

const DIFFICULTY_STYLES = {
  Easy: 'bg-emerald-400/90 text-emerald-950',
  Medium: 'bg-amber-300/90 text-amber-950',
  Hard: 'bg-red-500/90 text-white',
}

/** Placeholder until the live 3D preview runs: the creator's snapshot if any, else an SVG drawing. */
function StaticPreview({ entry }) {
  return entry.thumbnail ? (
    <img src={entry.thumbnail} alt={`Thumbnail of ${entry.title}`} className="absolute inset-0 size-full rounded-t-2xl object-cover" loading="lazy" decoding="async" />
  ) : (
    <LevelThumbnail blocks={entry.level.blocks} title={entry.title} className="absolute inset-0 size-full rounded-t-2xl" />
  )
}

// The 3D preview shows through a "hole" in the card (the shared canvas sits behind the page).
// These quarter-circle masks give that hole the card's rounded top corners.
function CornerMasks() {
  const mask = 'pointer-events-none absolute top-0 size-4 text-slate-900'
  return (
    <>
      <svg className={`${mask} left-0`} viewBox="0 0 16 16" aria-hidden="true"><path d="M0 0h16A16 16 0 0 0 0 16z" fill="currentColor" /></svg>
      <svg className={`${mask} right-0`} viewBox="0 0 16 16" aria-hidden="true"><path d="M16 0H0a16 16 0 0 1 16 16z" fill="currentColor" /></svg>
    </>
  )
}

function LevelCard({ entry, live, isOwn, isContest, onVote, onPlay, now, highlight = false }) {
  // Spin state lives in a ref: the 3D scene reads it every frame without React renders.
  const spin = useRef({ angle: (entry.id.length * 1.7) % 6.28, dragging: false, hover: false, lastX: 0 })
  const [reward, setReward] = useState(0) // bumps to replay the "+10" animation
  const article = useRef(null)
  useEffect(() => {
    if (highlight) article.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [highlight])

  const pointer = {
    onPointerEnter: () => (spin.current.hover = true),
    onPointerLeave: () => Object.assign(spin.current, { hover: false, dragging: false }),
    onPointerDown: (e) => {
      Object.assign(spin.current, { dragging: true, lastX: e.clientX })
      e.currentTarget.setPointerCapture?.(e.pointerId)
    },
    onPointerMove: (e) => {
      const s = spin.current
      if (!s.dragging) return
      s.angle += (e.clientX - s.lastX) * 0.012
      s.lastX = e.clientX
    },
    onPointerUp: () => (spin.current.dragging = false),
    onPointerCancel: () => (spin.current.dragging = false),
  }

  const vote = () => {
    const paid = onVote(entry)
    if (paid) setReward((n) => n + 1)
  }

  return (
    <article
      ref={article}
      aria-labelledby={`${entry.id}-title`}
      className={`group relative flex flex-col rounded-2xl transition hover:ring-indigo-400/60 focus-within:ring-indigo-400/60 ${highlight ? 'vc-spotlight ring-2 ring-emerald-400' : 'ring-1 ring-slate-800'}`}
    >
      {/* Preview: transparent so the shared 3D canvas shows through; SVG until 3D is live. */}
      <div className="relative aspect-[4/3] cursor-grab touch-pan-y select-none active:cursor-grabbing" {...pointer}>
        {!live && <StaticPreview entry={entry} />}
        {live && (
          <Suspense fallback={<StaticPreview entry={entry} />}>
            <LevelPreview3D blocks={entry.level.blocks} spin={spin} className="absolute inset-0" />
            <CornerMasks />
          </Suspense>
        )}

        <div className="pointer-events-none absolute inset-x-2.5 top-2.5 flex flex-wrap items-start gap-1.5">
          {isContest && (
            <span className="flex items-center gap-1 rounded-full bg-amber-400/90 px-2 py-0.5 text-[11px] font-bold text-amber-950 shadow">
              <Trophy className="size-3" aria-hidden="true" /> Contest entry
            </span>
          )}
          {isOwn && <span className="rounded-full bg-slate-950/80 px-2 py-0.5 text-[11px] font-bold text-white ring-1 ring-white/20">Your level</span>}
          {highlight && <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[11px] font-bold text-emerald-950 shadow">Just published</span>}
          {entry.difficulty && (
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold shadow ${DIFFICULTY_STYLES[entry.difficulty]}`}>{entry.difficulty}</span>
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 flex items-end justify-between gap-2">
          <ul className="flex flex-wrap gap-1" aria-label="Categories">
            {entry.tags.map((t) => (
              <li key={t} className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 backdrop-blur ${TAG_STYLES[t] ?? TAG_STYLES.New}`}>{t}</li>
            ))}
          </ul>
          {live && (
            <span className="flex items-center gap-1 rounded-md bg-slate-950/70 px-1.5 py-0.5 text-[10px] text-slate-300 opacity-0 transition group-hover:opacity-100">
              <Hand className="size-3" aria-hidden="true" /> drag to spin
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 rounded-b-2xl bg-slate-900 p-4">
        <div className="min-w-0">
          <h3 id={`${entry.id}-title`} className="truncate font-display text-lg font-bold text-white">{entry.title}</h3>
          <p className="truncate text-sm text-slate-400">
            by <span className="font-semibold text-slate-200">{entry.author}</span> · {timeAgo(entry.createdAt, now)}
          </p>
          {entry.description && <p className="mt-1.5 line-clamp-2 text-sm text-slate-300">{entry.description}</p>}
        </div>

        <div className="mt-auto flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={vote}
              disabled={isOwn}
              aria-pressed={entry.votedByMe}
              title={isOwn ? "You can't upvote your own level" : entry.voteRewarded ? 'Upvote' : 'Upvote: +10 UGC Gems'}
              className={[
                'flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-bold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300',
                entry.votedByMe
                  ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/60'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700',
                'disabled:cursor-not-allowed disabled:opacity-50',
              ].join(' ')}
            >
              <ArrowBigUp className={`size-5 ${entry.votedByMe ? 'fill-emerald-400 text-emerald-300' : ''}`} aria-hidden="true" />
              {formatCount(entry.votes)}
              <span className="sr-only"> upvotes{entry.votedByMe ? ', you upvoted this' : ''}</span>
            </button>
            {reward > 0 && (
              <span key={reward} className="vc-gem-pop pointer-events-none absolute -top-2 left-1/2 flex items-center gap-0.5 font-display text-sm font-bold text-purple-200" aria-hidden="true">
                +10 <Gem className="size-3.5" />
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-sm tabular-nums text-slate-400" title="Plays">
            <Eye className="size-4" aria-hidden="true" /> {formatCount(entry.plays)}
            <span className="sr-only"> plays</span>
          </span>
          <button
            type="button"
            onClick={() => onPlay(entry)}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-2 text-sm font-bold text-white shadow-[0_0_16px_rgba(129,140,248,0.35)] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Play className="size-4" aria-hidden="true" /> Play
            <span className="sr-only"> {entry.title}</span>
          </button>
        </div>
      </div>
    </article>
  )
}

export default memo(LevelCard)
