/**
 * One play-test session's state, shared by the 3D loop (inside the Canvas) and the DOM HUD.
 * It's an external store, not React state: the game loop writes it ~never (only on events like
 * a death or the finish), and the stopwatch is read straight from timestamps by the HUD's own
 * animation frame, so a running timer causes zero React renders.
 *
 * status:  'ready'   waiting for the first move (speedrun timers start on input, not on load)
 *          'running' timer counting
 *          'won'     finished; timer frozen
 */

// Best times live for the browser session, per level *version* (an edit can change the route).
const bestTimes = new Map()
let sessionSeq = 0

export function createPlayStore(level) {
  const versionKey = `${level.id}@${level.updatedAt}`
  let state = {
    status: 'ready',
    respawns: 0,
    startedAt: 0, // performance.now() when the run started
    finalMs: 0,
    bestMs: bestTimes.get(versionKey) ?? null,
    newBest: false,
    flash: null, // { id, cause: 'lava' | 'void' } → HUD screen flash
    runId: 0, // bumps on restart; the game loop watches it to reset the player
  }
  const listeners = new Set()
  const set = (patch) => {
    state = { ...state, ...patch }
    listeners.forEach((l) => l())
  }
  let flashSeq = 0

  return {
    id: ++sessionSeq, // a fresh store = a fresh PlaySession (React key)
    get: () => state,
    subscribe(l) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    /** Milliseconds on the stopwatch at `now`. */
    elapsed(now = performance.now()) {
      if (state.status === 'won') return state.finalMs
      if (state.status === 'running') return now - state.startedAt
      return 0
    },
    start(now = performance.now()) {
      if (state.status === 'ready') set({ status: 'running', startedAt: now })
    },
    die(cause) {
      if (state.status === 'won') return
      set({ respawns: state.respawns + 1, flash: { id: ++flashSeq, cause } })
    },
    win(now = performance.now()) {
      if (state.status !== 'running') return false
      const finalMs = now - state.startedAt
      const newBest = state.bestMs == null || finalMs < state.bestMs
      if (newBest) bestTimes.set(versionKey, finalMs)
      set({ status: 'won', finalMs, newBest, bestMs: newBest ? finalMs : state.bestMs })
      return true
    },
    restart() {
      set({ status: 'ready', respawns: 0, startedAt: 0, finalMs: 0, newBest: false, flash: null, runId: state.runId + 1 })
    },
  }
}

/** 83456.7 ms → "01:23.45" (minutes keep counting past 99). */
export function formatStopwatch(ms) {
  const total = Math.max(0, Math.floor(ms / 10)) // centiseconds
  const cs = total % 100
  const s = Math.floor(total / 100) % 60
  const m = Math.floor(total / 6000)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(m)}:${pad(s)}.${pad(cs)}`
}
