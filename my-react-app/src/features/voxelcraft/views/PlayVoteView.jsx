import { LoaderCircle, Search, SearchX, X } from 'lucide-react'
import { Suspense, lazy, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { playSfx } from '../audio/sfx.js'
import ContestBanner from '../community/ContestBanner.jsx'
import { SORT_TABS, selectGallery } from '../community/gallery.js'
import LevelCard from '../community/LevelCard.jsx'
import { useGameActions, useGameState } from '../state/GameStateProvider.jsx'

// 3D is lazy: the hub's first paint is HTML + SVG thumbnails; previews go live when ready.
const GalleryCanvas = lazy(() => import('../community/Gallery3D.jsx').then((m) => ({ default: m.GalleryCanvas })))
const CommunityPlayer = lazy(() => import('../community/CommunityPlayer.jsx'))

function PlayerLoading() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950">
      <p className="flex items-center gap-2 text-slate-300">
        <LoaderCircle className="size-5 animate-spin text-indigo-400" aria-hidden="true" /> Loading level…
      </p>
    </div>
  )
}

/** Contest & Community Submission Hub (the "Play & Vote" tab). */
export default function PlayVoteView() {
  const { community, player } = useGameState()
  const { toggleVote, recordPlay, clearHighlight } = useGameActions()
  // Arriving right after publishing: show Newest so the new level is on top, and spotlight it.
  const [tab, setTab] = useState(() => (community.highlightId ? 'newest' : 'trending'))
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query) // typing stays instant while the grid re-sorts
  const [live, setLive] = useState(false)
  const [playingId, setPlayingId] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (community.highlightId) clearHighlight() // one-shot: a later visit opens normally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Kept for this visit (a timer could expire unseen while the 3D previews are still loading);
  // the glow itself fades out in CSS.
  const [spotlight] = useState(() => community.highlightId)

  // "5m ago" labels and trending scores refresh once a minute, not every render.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const { contest, levels } = community
  const visible = useMemo(
    () => selectGallery(levels, { tab, query: deferredQuery, contestId: contest.id, now }),
    [levels, tab, deferredQuery, contest.id, now],
  )
  const contestEntries = useMemo(() => levels.filter((l) => l.contestId === contest.id), [levels, contest.id])
  const myEntryIds = useMemo(
    () => contestEntries.filter((l) => l.author === player.handle).map((l) => l.id),
    [contestEntries, player.handle],
  )
  const playing = playingId ? levels.find((l) => l.id === playingId) : null

  // Returns true when this upvote paid out gems (the card shows "+10").
  const vote = useCallback(
    (entry) => {
      if (entry.author === player.handle) return false
      const upvoting = !entry.votedByMe
      toggleVote(entry.id)
      playSfx(upvoting ? 'coin' : 'unvote')
      return upvoting && !entry.voteRewarded
    },
    [player.handle, toggleVote],
  )
  const play = useCallback(
    (entry) => {
      recordPlay(entry.id)
      setPlayingId(entry.id)
    },
    [recordPlay],
  )

  const onTabKey = (e) => {
    const i = SORT_TABS.findIndex((t) => t.id === tab)
    const moves = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: SORT_TABS.length - 1 }
    if (!(e.key in moves)) return
    e.preventDefault()
    const next = SORT_TABS[(moves[e.key] + SORT_TABS.length) % SORT_TABS.length]
    setTab(next.id)
    document.getElementById(`sort-${next.id}`)?.focus()
  }

  return (
    <div className="relative">
      {/* One shared WebGL canvas behind the page draws every card's live preview. Paused while a level is open. */}
      {!playing && (
        <Suspense fallback={null}>
          <GalleryCanvas onLive={setLive} />
        </Suspense>
      )}

      <div className="relative z-10 space-y-6">
        <ContestBanner contest={contest} entryCount={contestEntries.length} myEntryIds={myEntryIds} onShowEntries={() => setTab('contest')} />

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative md:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search levels or creators"
              aria-label="Search levels by title or creator"
              className="w-full rounded-xl bg-slate-900 py-2.5 pl-9 pr-9 text-sm text-white ring-1 ring-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div role="tablist" aria-label="Sort levels" onKeyDown={onTabKey} className="flex gap-1 overflow-x-auto rounded-xl bg-slate-900 p-1 ring-1 ring-slate-800">
            {SORT_TABS.map((t) => (
              <button
                key={t.id}
                id={`sort-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls="community-grid"
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => setTab(t.id)}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${tab === t.id ? 'bg-indigo-500/25 text-white ring-1 ring-indigo-400/60' : 'text-slate-400 hover:text-slate-100'}`}
              >
                {t.label}
                {t.id === 'contest' && <span className="ml-1.5 rounded bg-amber-400/20 px-1 text-[11px] text-amber-200">{contestEntries.length}</span>}
              </button>
            ))}
          </div>
        </div>

        <div id="community-grid" role="tabpanel" aria-labelledby={`sort-${tab}`}>
          <p className="mb-3 text-sm text-slate-400" aria-live="polite">
            {visible.length} {visible.length === 1 ? 'level' : 'levels'}
            {deferredQuery.trim() && <> matching “{deferredQuery.trim()}”</>}
          </p>
          {visible.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visible.map((entry) => (
                <LevelCard
                  key={entry.id}
                  entry={entry}
                  live={live}
                  now={now}
                  isOwn={entry.author === player.handle}
                  isContest={entry.contestId === contest.id}
                  onVote={vote}
                  onPlay={play}
                  highlight={entry.id === spotlight}
                />
              ))}
            </div>
          ) : (
            <div className="grid place-items-center rounded-2xl bg-slate-900 px-6 py-14 text-center ring-1 ring-slate-800">
              <SearchX className="size-8 text-slate-500" aria-hidden="true" />
              <p className="mt-3 font-display text-lg font-bold text-white">No levels found</p>
              <p className="text-sm text-slate-400">
                {tab === 'contest' && !deferredQuery ? 'No contest entries yet. Be the first!' : 'Try a different title or creator name.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {playing && (
        <Suspense fallback={<PlayerLoading />}>
          <CommunityPlayer
            entry={playing}
            canVote={playing.author !== player.handle}
            onVote={() => vote(playing)}
            onClose={() => setPlayingId(null)}
          />
        </Suspense>
      )}
    </div>
  )
}
