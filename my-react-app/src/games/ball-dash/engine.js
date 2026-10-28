// Bulbuli Ball Dash — the game rules, with no React and no three.js, so they can be tested
// (engine.test.js) and the 3D scene only has to draw what this says.
//
// The ball sits at distance `dist` along the track and rolls forward by itself. Obstacles come in
// rows, each row asking for exactly ONE kind of move:
//   'lanes'   crates / cones / bumpers in one or two lanes: steer into a free lane
//   'hurdle'  a low bar across the whole track: jump
//   'gate'    an arch across the whole track: shrink and roll under it
// Every new row is checked against the one before it (rowIsFair) before it is placed: there is
// always a free way through, with time to react and to make the move. If no candidate passes,
// the gap is widened until one does, so an impossible sequence can never be generated.
//
//   const run = createRun({ seed, practice, bestDistance })
//   moveLeft(run) / moveRight(run) / jump(run) / shrink(run)
//   stepRun(run, dt)          // advance; read run.x, run.y, run.scale, run.rows, run.pickups …
//   run.events                // [{ type, … }] since the last drainEvents(run)
//   summary(run)              // { time, distance, stars, hits }

import { BALL_DASH_CONFIG } from './config.js'

/** Small seeded random numbers (mulberry32), so tests and replays are repeatable. */
export function createRng(seed = 1) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Rolling speed at time t. Flat while learning, a gentle ease to `at60`, then a slow ramp to `max`. */
export function speedAt(t, cfg = BALL_DASH_CONFIG) {
  const { initial, at60, rampPerSecond, max } = cfg.speed
  if (t < 40) return initial
  if (t < 60) return initial + (at60 - initial) * ((t - 40) / 20)
  return Math.min(max, at60 + rampPerSecond * (t - 60))
}

export function phaseAt(t, cfg = BALL_DASH_CONFIG) {
  return cfg.phases.find((phase) => t < phase.until) ?? cfg.phases[cfg.phases.length - 1]
}

/** Seconds between two rows, at the moment the ball reaches them. */
export function gapSecAt(t, cfg = BALL_DASH_CONFIG) {
  const phase = phaseAt(t, cfg)
  if (phase.until !== Infinity) return phase.gapSec
  return Math.max(cfg.minGapSec, phase.gapSec - cfg.gapShrinkPerSecond * (t - 60))
}

const ACTION_KINDS = new Set(['hurdle', 'gate'])
const LANE_COUNT = 3

/** The lanes a player can be in to get through a row (an action row: any lane, with its move). */
export function passableLanes(row) {
  if (row.kind !== 'lanes') return [0, 1, 2]
  return [0, 1, 2].filter((lane) => !row.lanes[lane])
}

/**
 * Can a player who got through `prev` get through `row`, `gapSec` later? Counts a reaction time,
 * the worst-case lane changes (from any lane that was safe in `prev` to the nearest safe lane in
 * `row`) and, after a jump or a gate, time to land / settle. Never asks for two moves at once.
 */
export function rowIsFair(prev, row, gapSec, cfg = BALL_DASH_CONFIG) {
  const safe = passableLanes(row)
  if (safe.length === 0) return false
  if (row.kind === 'lanes' && row.lanes.filter(Boolean).length > 2) return false
  if (!prev) return gapSec >= cfg.fairness.reactionSec
  const laneSec = Math.abs(cfg.lanes[1] - cfg.lanes[0]) / cfg.laneChangeSpeed
  const from = passableLanes(prev)
  const worstLanes = Math.max(...from.map((p) => Math.min(...safe.map((q) => Math.abs(p - q)))))
  let need = cfg.fairness.reactionSec + worstLanes * laneSec
  if (ACTION_KINDS.has(prev.kind)) need += cfg.fairness.landingSec
  return gapSec >= need
}

function newRow(state, kind, at) {
  const row = { id: state.nextId++, kind, at, lanes: [null, null, null], hit: false, passed: false, hinted: false }
  return row
}

function pickLaneTypes(state, phase, count) {
  const lanes = [null, null, null]
  const order = [0, 1, 2].sort(() => state.rng() - 0.5)
  for (let i = 0; i < count; i += 1) {
    lanes[order[i]] = phase.laneTypes[Math.floor(state.rng() * phase.laneTypes.length)]
  }
  return lanes
}

function weightedPick(rng, mix) {
  const entries = Object.entries(mix).filter(([, weight]) => weight > 0)
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = rng() * total
  for (const [kind, weight] of entries) {
    roll -= weight
    if (roll <= 0) return kind
  }
  return entries[entries.length - 1][0]
}

/** A candidate row for arrival time tA: a scripted first hurdle / gate, or one from the phase mix. */
function candidate(state, tA, at, attempt) {
  const { cfg } = state
  const phase = phaseAt(tA, cfg)
  const { introduced } = state
  if (attempt === 0 && !introduced.hurdle && tA >= cfg.introduce.hurdleAt) return newRow(state, 'hurdle', at)
  if (attempt === 0 && introduced.hurdle && !introduced.gate && tA >= cfg.introduce.gateAt
    && state.lastRow?.kind !== 'hurdle') return newRow(state, 'gate', at)

  const mix = { ...phase.mix }
  if (!introduced.hurdle) delete mix.hurdle // nothing to jump before it's been shown
  if (!introduced.gate) delete mix.gate
  if (state.actionStreak >= cfg.fairness.maxActionRowsInARow) { delete mix.hurdle; delete mix.gate }
  if (Object.keys(mix).length === 0) mix.single = 1
  const type = weightedPick(state.rng, mix)
  if (type === 'hurdle' || type === 'gate') return newRow(state, type, at)
  const row = newRow(state, 'lanes', at)
  row.lanes = pickLaneTypes(state, phase, type === 'double' ? 2 : 1)
  return row
}

function addStars(state, fromAt, row) {
  const { stars } = state.cfg
  const start = fromAt + stars.keepClear
  const end = row.at - stars.keepClear
  if (end - start < stars.spacing * 2) return
  const safe = passableLanes(row)
  // a line in a lane that is safe for the next row: following the stars is always a good idea
  const lane = safe[Math.floor(state.rng() * safe.length)]
  if (state.rng() < stars.bigChance) {
    state.pickups.push({ id: state.nextId++, at: (start + end) / 2, lane, value: stars.bigValue, big: true, taken: false })
    return
  }
  if (state.rng() > stars.lineChance) return
  const count = Math.min(stars.perLine, Math.floor((end - start) / stars.spacing) + 1)
  const first = end - (count - 1) * stars.spacing
  for (let i = 0; i < count; i += 1) {
    state.pickups.push({ id: state.nextId++, at: first + i * stars.spacing, lane, value: 1, big: false, taken: false })
  }
}

/** Makes rows until the track is filled `spawnAhead` metres in front of the ball. */
function fillTrack(state) {
  const { cfg } = state
  while (state.nextRowAt < state.dist + cfg.spawnAhead) {
    const prev = state.lastRow
    const baseAt = state.nextRowAt
    let at = baseAt
    let row = null
    // try a few candidates; if none is fair, give the player more room and try again
    for (let widen = 0; widen < 20 && !row; widen += 1) {
      const tA = estimateArrival(state, at)
      const speed = speedAt(tA, cfg)
      for (let attempt = 0; attempt < 6 && !row; attempt += 1) {
        const next = candidate(state, tA, at, attempt)
        const gapSec = prev ? (at - prev.at) / speed : Infinity
        if (rowIsFair(prev, next, gapSec, cfg)) row = next
      }
      if (!row) at += speed * 0.5
    }
    if (!row) row = newRow(state, 'lanes', at) // an empty row: always fair
    if (row.kind === 'hurdle') state.introduced.hurdle = true
    if (row.kind === 'gate') state.introduced.gate = true
    state.actionStreak = ACTION_KINDS.has(row.kind) ? state.actionStreak + 1 : 0
    if (prev) addStars(state, prev.at, row)
    else addStars(state, state.dist, row)
    state.rows.push(row)
    state.lastRow = row
    const tNext = estimateArrival(state, row.at)
    state.nextRowAt = row.at + Math.max(cfg.minRowGap, gapSecAt(tNext, cfg) * speedAt(tNext, cfg))
  }
}

/** When the ball will reach `at`, assuming today's speed schedule (good enough: speed changes slowly). */
function estimateArrival(state, at) {
  let t = state.t
  let d = state.dist
  // integrate in half-second steps; rows are at most ~100 m ahead
  while (d < at) {
    d += speedAt(t, state.cfg) * 0.5
    t += 0.5
  }
  return t
}

export function createRun({ seed = Date.now(), practice = false, bestDistance = 0, config = BALL_DASH_CONFIG } = {}) {
  const state = {
    cfg: config,
    rng: createRng(seed),
    practice,
    t: 0,
    dist: 0,
    speed: config.speed.initial,
    lane: 1,
    x: config.lanes[1],
    y: 0,
    jumpT: -1,
    queuedJumpAt: -Infinity,
    shrinkT: -1,
    scale: 1,
    hearts: config.hearts,
    hits: 0,
    sinceHit: 0,
    invulnerable: 0,
    stars: 0,
    rows: [],
    pickups: [],
    lastRow: null,
    nextRowAt: config.speed.initial * config.firstObstacleSec,
    actionStreak: 0,
    introduced: { hurdle: false, gate: false },
    hinted: { move: false, jump: false, shrink: false },
    milestones: { stars: false, t30: false, t60: false, record: false },
    bestDistance,
    over: false,
    nextId: 1,
    events: [],
  }
  fillTrack(state)
  return state
}

const emit = (state, type, extra) => state.events.push({ type, t: state.t, ...extra })

export function drainEvents(state) {
  const events = state.events
  state.events = []
  return events
}

export const isGrounded = (state) => state.jumpT < 0

export function moveLeft(state) {
  if (state.over || state.lane === 0) return false
  state.lane -= 1
  emit(state, 'move', { lane: state.lane })
  return true
}

export function moveRight(state) {
  if (state.over || state.lane === LANE_COUNT - 1) return false
  state.lane += 1
  emit(state, 'move', { lane: state.lane })
  return true
}

/** Jumps from the ground; a press just before landing is remembered. No jumping in mid-air. */
export function jump(state) {
  if (state.over) return false
  if (isGrounded(state)) {
    state.jumpT = 0
    state.queuedJumpAt = -Infinity
    emit(state, 'jump')
    return true
  }
  const airLeft = state.cfg.jump.duration - state.jumpT
  if (airLeft <= state.cfg.jump.bufferSec) state.queuedJumpAt = state.t
  return false
}

/** Shrinks for a while (pressing again while small restarts the timer). Works in the air too. */
export function shrink(state) {
  if (state.over) return false
  const wasSmall = state.shrinkT >= 0
  state.shrinkT = 0
  if (!wasSmall) emit(state, 'shrink')
  return true
}

/** Size factor over a shrink: eases down, holds, eases back to 1. */
export function shrinkScale(shrinkT, cfg = BALL_DASH_CONFIG) {
  if (shrinkT < 0) return 1
  const { duration, scale, easeSec } = cfg.shrink
  const ease = (p) => p * p * (3 - 2 * p)
  if (shrinkT < easeSec) return 1 - (1 - scale) * ease(shrinkT / easeSec)
  if (shrinkT > duration - easeSec) return scale + (1 - scale) * ease(Math.min(1, (shrinkT - (duration - easeSec)) / easeSec))
  return scale
}

function obstacleHit(state, row) {
  const { cfg } = state
  const r = cfg.ball.radius * state.scale
  const bottom = state.y
  const top = state.y + 2 * r
  const { side, vertical } = cfg.forgiveness
  if (row.kind === 'hurdle') return bottom < cfg.obstacles.hurdle.height - vertical
  if (row.kind === 'gate') return top > cfg.obstacles.gate.clearance + vertical
  for (let lane = 0; lane < LANE_COUNT; lane += 1) {
    const type = row.lanes[lane]
    if (!type) continue
    const o = cfg.obstacles[type]
    if (Math.abs(state.x - cfg.lanes[lane]) < o.halfWidth + r - side && bottom < o.height - vertical) return true
  }
  return false
}

const rowDepth = (cfg, row) => {
  if (row.kind !== 'lanes') return cfg.obstacles[row.kind].depth
  return Math.max(...row.lanes.filter(Boolean).map((type) => cfg.obstacles[type].depth), 0.5)
}

export function stepRun(state, rawDt) {
  if (state.over) return state
  const { cfg } = state
  const dt = Math.min(Math.max(rawDt, 0), cfg.maxDt)
  state.t += dt
  state.speed = speedAt(state.t, cfg)
  state.dist += state.speed * dt

  // sideways: glide to the chosen lane
  const target = cfg.lanes[state.lane]
  const step = cfg.laneChangeSpeed * dt
  state.x = Math.abs(target - state.x) <= step ? target : state.x + Math.sign(target - state.x) * step

  // jump arc
  if (state.jumpT >= 0) {
    state.jumpT += dt
    if (state.jumpT >= cfg.jump.duration) {
      state.jumpT = -1
      emit(state, 'land')
      if (state.t - state.queuedJumpAt <= cfg.jump.bufferSec + cfg.maxDt) jump(state)
    }
  }
  if (state.jumpT >= 0) {
    const p = state.jumpT / cfg.jump.duration
    state.y = 4 * cfg.jump.height * p * (1 - p)
  } else {
    state.y = 0
  }

  // shrink timer
  if (state.shrinkT >= 0) {
    state.shrinkT += dt
    if (state.shrinkT >= cfg.shrink.duration) {
      state.shrinkT = -1
      emit(state, 'grow')
    }
  }
  state.scale = shrinkScale(state.shrinkT, cfg)
  if (state.invulnerable > 0) state.invulnerable = Math.max(0, state.invulnerable - dt)

  // a lost heart comes back after a while without a bump
  state.sinceHit += dt
  if (state.hearts < cfg.hearts && state.sinceHit >= cfg.heartBackAfterSec) {
    state.hearts += 1
    state.sinceHit = 0
    emit(state, 'heart', { hearts: state.hearts })
  }

  fillTrack(state)

  // obstacles: hints ahead, collisions while overlapping, then recycle what is behind
  const r = cfg.ball.radius * state.scale
  for (const row of state.rows) {
    const dz = row.at - state.dist
    if (!row.hinted && dz / state.speed <= cfg.hintLeadSec) {
      row.hinted = true
      const hint = row.kind === 'hurdle' ? 'jump' : row.kind === 'gate' ? 'shrink' : row.lanes.some(Boolean) ? 'move' : null
      if (hint && !state.hinted[hint]) {
        state.hinted[hint] = true
        emit(state, 'hint', { hint })
      }
    }
    if (row.passed) continue
    const reach = rowDepth(cfg, row) / 2 + r * 0.6
    if (dz < -reach) {
      row.passed = true
      if (!row.hit && row.kind !== 'lanes') emit(state, 'cleared', { kind: row.kind })
      continue
    }
    if (dz > reach || row.hit || state.invulnerable > 0) continue
    if (obstacleHit(state, row)) {
      row.hit = true
      state.hits += 1
      state.invulnerable = cfg.invulnerableSec
      state.sinceHit = 0
      if (!state.practice) state.hearts -= 1
      emit(state, 'hit', { kind: row.kind, hearts: state.hearts })
      if (state.hearts <= 0) {
        state.over = true
        emit(state, 'over')
      }
    }
  }
  while (state.rows.length && state.rows[0].at < state.dist - 12) state.rows.shift()

  // stars
  const top = state.y + 2 * r
  for (const star of state.pickups) {
    if (star.taken) continue
    const dz = star.at - state.dist
    if (dz > cfg.stars.hit.z) break // sorted by distance: the rest are further away
    const starY = star.big ? 0.9 : 0.6
    if (dz > -cfg.stars.hit.z && Math.abs(state.x - cfg.lanes[star.lane]) < cfg.stars.hit.x
      && top > starY - 0.45 && state.y < starY + 0.45) {
      star.taken = true
      state.stars += star.value
      emit(state, 'star', { value: star.value, big: star.big, total: state.stars })
    }
  }
  while (state.pickups.length && state.pickups[0].at < state.dist - 6) state.pickups.shift()

  // milestones
  const m = state.milestones
  if (!m.stars && state.stars >= cfg.milestones.starsAt) { m.stars = true; emit(state, 'milestone', { id: 'stars' }) }
  if (!m.t30 && state.t >= cfg.milestones.timesAt[0]) { m.t30 = true; emit(state, 'milestone', { id: 't30' }) }
  if (!m.t60 && state.t >= cfg.milestones.timesAt[1]) { m.t60 = true; emit(state, 'milestone', { id: 't60' }) }
  if (!m.record && state.bestDistance > 0 && state.dist > state.bestDistance) {
    m.record = true
    emit(state, 'milestone', { id: 'record' })
  }
  return state
}

export function summary(state) {
  return { time: state.t, distance: Math.floor(state.dist), stars: state.stars, hits: state.hits }
}

/** XP for a finished run: a share of the stars plus a little for time survived, capped. */
export function xpForRun({ time, stars }, practice = false) {
  if (practice) return 0
  return Math.min(40, Math.floor(stars / 3) + Math.floor(time / 15))
}
