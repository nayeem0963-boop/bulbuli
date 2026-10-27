/**
 * Simulated community voters for local play-testing (Dev / Test Mode).
 *
 * Problem: offline, nobody else exists to upvote your contest entries, so medals and the
 * Contest Winner badge could never be earned. The simulation stands in for the crowd:
 *   - every gallery level gains upvotes and plays over simulated time, at random (Poisson);
 *   - contest entries get more attention than regular levels;
 *   - your own entries' pull is set by an "appeal" preset (Low / Normal / Viral) so QA can test
 *     every outcome: no medal, a podium finish, or a guaranteed-looking win.
 * It's seeded and pure: the same seed + hours always gives the same votes (testable, replayable).
 * Simulated votes never touch the player's own vote flags and never pay gems.
 */

export const HOUR = 3600 * 1000
export const SIM_TICK_MS = 5000 // live mode: 5 real seconds = 1 simulated hour
export const MAX_FAST_FORWARD_HOURS = 24 * 7

export const APPEAL_PRESETS = [
  { id: 'low', label: 'Low', factor: 0.4, hint: 'Your entries get few votes' },
  { id: 'normal', label: 'Normal', factor: 1, hint: 'Same pull as everyone else' },
  { id: 'viral', label: 'Viral', factor: 40, hint: 'Your entries blow up (tests the gold medal)' },
]
const APPEAL = Object.fromEntries(APPEAL_PRESETS.map((a) => [a.id, a.factor]))

// Average upvotes per simulated hour.
const RATE = { contest: 0.6, regular: 0.15 }
const PLAYS_PER_VOTE = 3.5

export const DEFAULT_SIM = { enabled: false, appeal: 'normal', seed: 0x5eed, simulatedHours: 0 }

/** Small, fast, seedable PRNG (mulberry32). Returns () => [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Poisson sample: exact (Knuth) for small λ, normal approximation for large λ. */
export function poisson(rng, lambda) {
  if (lambda <= 0) return 0
  if (lambda < 30) {
    const L = Math.exp(-lambda)
    let k = 0
    let p = 1
    do {
      k++
      p *= rng()
    } while (p > L)
    return k - 1
  }
  // Box–Muller
  const u = Math.max(rng(), 1e-12)
  const v = rng()
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  return Math.max(0, Math.round(lambda + z * Math.sqrt(lambda)))
}

/**
 * Applies `hours` of simulated community activity to the gallery.
 * (The sum of Poisson draws is Poisson, so a long fast-forward is one draw per level.)
 */
export function simulateVotes(state, hours) {
  if (!(hours > 0)) return state
  const sim = state.sim ?? DEFAULT_SIM
  const rng = mulberry32(sim.seed)
  const handle = state.player.handle
  const contestId = state.community.contest.id
  const appeal = APPEAL[sim.appeal] ?? 1

  const levels = state.community.levels.map((l) => {
    const inContest = l.contestId === contestId
    const own = l.author === handle
    const lambda = hours * (inContest ? RATE.contest : RATE.regular) * (own ? appeal : 1)
    const votes = poisson(rng, lambda)
    if (!votes) return l
    return { ...l, votes: l.votes + votes, plays: l.plays + Math.round(votes * PLAYS_PER_VOTE) }
  })

  return {
    ...state,
    community: { ...state.community, levels },
    sim: { ...sim, seed: (rng() * 4294967296) >>> 0, simulatedHours: sim.simulatedHours + hours },
  }
}

/** Hours of voting left in the contest (whole hours, capped at one week). */
export const hoursLeft = (contest, now) =>
  Math.min(MAX_FAST_FORWARD_HOURS, Math.max(0, Math.ceil((contest.endsAt - now) / HOUR)))

/** Current contest standings, best first: [{ entry, rank }]. Ties → earlier entry wins. */
export function contestStandings(state) {
  return state.community.levels
    .filter((l) => l.contestId === state.community.contest.id)
    .sort((a, b) => b.votes - a.votes || a.createdAt - b.createdAt)
    .map((entry, i) => ({ entry, rank: i + 1 }))
}
