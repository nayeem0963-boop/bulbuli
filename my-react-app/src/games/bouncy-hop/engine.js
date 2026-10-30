/**
 * Bulbuli Bouncy Hop 3D — the rules, with no React and no three.js in them (tested in engine.test.js).
 *
 * The ball bounces on its own, one hop per row of floating tiles. The player only steers left and
 * right, so the ball comes down on the right tile:
 *
 *   • a correct tile  → the ball stays there, scores, and the combo grows; it hops on to the next row
 *   • a wrong tile    → "boing!" the ball is bounced back to the tile it came from and tries again
 *   • no tile at all  → it falls into the clouds and pops back onto the tile it came from
 *
 * A wrong tile or a fall costs a heart (never in practice). A row can only be passed by landing on
 * its correct tile, so every row ahead can be made in advance: row k of "count by 2s" always asks
 * for 2·k. The scene reads the state below each frame and draws it; it never decides anything.
 *
 * Fair and predictable, by design (playtests showed young players lost within a minute):
 *   • every hop is the same arc: the same height and the same time, so the rhythm can be learnt
 *     (a super bounce only flies higher, never longer);
 *   • the pace is calm and fixed for the first 30 seconds, then quickens one small step per 12 good
 *     hops (never past 0.72 s a hop), and a mistake eases it back a step (see `pace` below);
 *   • steering is gentle, and on landing the ball settles onto the tile instead of sliding about;
 *   • landing is forgiving: a ball a little past a tile's edge still lands on it (the nearest one);
 *   • `landingPreview(run)` says where the ball will come down, so the scene can mark it.
 *
 * Usage:
 *   const run = createRun({ seed, mode: 'by2', alphabet: 'en', practice: false })
 *   run.input.dir = -1 | 0 | 1         // keys / hold buttons
 *   run.input.dragX = number | null     // a finger or mouse dragging: where the ball should go
 *   stepRun(run, dt)                    // once per frame
 *   drainEvents(run)                    // → [{ type: 'land' | 'wrong' | 'fall' | 'boost' | … }]
 */

export const HOP_CONFIG = {
  rowGap: 3.6, // distance between rows (world units, along -z)
  xLimit: 3.3, // the ball can steer this far either side
  ballRadius: 0.42,
  // steering: gentle top speed and acceleration; a drag follows the finger, but never in a jerk
  steer: { speed: 7.2, accel: 45, dragFollow: 10, dragMax: 8.5 },
  // every hop: the same arc (height) in the same time (seconds); `contact` is the moment on a tile,
  // during which the ball settles onto it (`settle`: how quickly, per second)
  hop: { calm: 1.0, min: 0.72, perTier: 0.025, height: 1.8, superHeight: 2.6, contact: 0.12, settle: 22 },
  // the speed curve: calm for `calmSeconds`, then one step quicker per `tierEvery` good hops
  pace: { calmSeconds: 30, tierEvery: 12 },
  bounceBack: 0.62, // seconds the "boing back" arc takes
  fallTime: 1.0,
  hearts: 3,
  forgive: 0.3, // a ball this much past a tile's edge still lands on it (between two, the nearer wins)
  tile: { startWidth: 2.0, minWidth: 1.8, shrinkFrom: 30, depth: 1.7, padWidth: 3.4 },
  sway: { fromRow: 45, maxAmp: 0.5 }, // rows that drift side to side: late, slow and small
  slots: [-2.6, 0, 2.6],
  comboStep: 5, // every 5 in a row: +1 multiplier (up to ×5) and a super bounce
  maxMultiplier: 5,
  points: 10,
}

/** The learning targets. Counting modes ask for step·k on row k; vowels ask for one vowel per row. */
export const MODES = {
  by2: { kind: 'count', step: 2 },
  by3: { kind: 'count', step: 3 },
  by5: { kind: 'count', step: 5 },
  by10: { kind: 'count', step: 10 },
  vowels: { kind: 'letters' },
}
export const MODE_IDS = Object.keys(MODES)

export const ALPHABETS = {
  en: {
    vowels: ['A', 'E', 'I', 'O', 'U'],
    consonants: ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V', 'W', 'Z'],
  },
  bn: {
    vowels: ['অ', 'আ', 'ই', 'ঈ', 'উ', 'ঊ', 'ঋ', 'এ', 'ঐ', 'ও', 'ঔ'],
    consonants: ['ক', 'খ', 'গ', 'ঘ', 'চ', 'ছ', 'জ', 'ঝ', 'ট', 'ঠ', 'ড', 'ত', 'থ', 'দ', 'ধ', 'ন', 'প', 'ফ', 'ব', 'ভ', 'ম', 'র', 'ল', 'স', 'হ'],
  },
}

const MILESTONES = [10, 25, 50, 100]

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

const pick = (rng, list) => list[Math.floor(rng() * list.length)]
function shuffle(rng, list) {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/* ------------------------------------------------------------------ difficulty (by row) */

/** Seconds one hop takes at pace tier `tier` (0 = the calm start): a little quicker per tier, never too quick. */
export const hopDuration = (tier = 0, cfg = HOP_CONFIG) => Math.max(cfg.hop.min, cfg.hop.calm - tier * cfg.hop.perTier)
/** How many tiles row k has: two while learning, then three. */
export const tilesInRow = (k) => (k <= 5 ? 2 : 3)
export const tileWidth = (k, cfg = HOP_CONFIG) =>
  Math.max(cfg.tile.minWidth, cfg.tile.startWidth - Math.max(0, k - cfg.tile.shrinkFrom) * 0.008)
/** Some rows sway side to side from row 45 on (a minute or more in): slowly, and never far. */
export function swayFor(k, rng, cfg = HOP_CONFIG) {
  const from = cfg.sway.fromRow
  if (k < from || rng() > Math.min(0.45, 0.2 + (k - from) * 0.01)) return null
  return { amp: Math.min(cfg.sway.maxAmp, 0.25 + (k - from) * 0.01), speed: 0.7 + rng() * 0.4, phase: rng() * Math.PI * 2 }
}

/* ------------------------------------------------------------------ questions */

/** Wrong answers near the right one, so a child has to think: neighbours, the number after, … */
export function numberDistractors(value, step, count, rng) {
  const half = Math.max(1, Math.round(step / 2))
  const candidates = [value + 1, value - 1, value + step, value + half, value - half, value + 2 * step, value - step - 1]
  const out = []
  for (const c of shuffle(rng, candidates)) {
    if (c > 0 && c !== value && c !== value - step && !out.includes(c)) out.push(c)
    if (out.length === count) break
  }
  let extra = value + step + 1
  while (out.length < count) { // (only for tiny values)
    if (extra !== value && !out.includes(extra)) out.push(extra)
    extra += 1
  }
  return out
}

/** The labels for row k (k ≥ 1): exactly one correct. */
export function questionFor(mode, k, n, rng, alphabet = 'en') {
  const def = MODES[mode] ?? MODES.by2
  if (def.kind === 'count') {
    const value = def.step * k
    return [{ label: String(value), value, correct: true },
      ...numberDistractors(value, def.step, n - 1, rng).map((v) => ({ label: String(v), value: v, correct: false }))]
  }
  const letters = ALPHABETS[alphabet] ?? ALPHABETS.en
  const vowel = pick(rng, letters.vowels)
  const others = shuffle(rng, letters.consonants).slice(0, n - 1)
  return [{ label: vowel, value: vowel, correct: true }, ...others.map((c) => ({ label: c, value: c, correct: false }))]
}

/** Row k, made from the run's random numbers. Row 0 is the wide start pad. */
export function makeRow(k, run, cfg = HOP_CONFIG) {
  const z = -k * cfg.rowGap
  if (k === 0) {
    const def = MODES[run.mode]
    const label = def?.kind === 'count' ? '0' : '★'
    return { k, z, sway: null, hint: false, clearedAt: null,
      tiles: [{ x: 0, w: cfg.tile.padWidth, label, value: 0, correct: true, pad: true, hit: null, hitAt: 0, color: 0 }] }
  }
  const { rng } = run
  const n = tilesInRow(k)
  const w = tileWidth(k, cfg)
  // Fair reach: the correct tile is never more than one lane from the last one, so it can always be
  // reached in one hop (wrong tiles can be anywhere). Two tiles: the correct lane and one other;
  // three tiles: all lanes. A little jitter, never touching.
  const lanes = cfg.slots.map((_, i) => i)
  const prevLane = laneOf(run.rows[k - 1], cfg)
  const correctLane = pick(rng, lanes.filter((i) => Math.abs(i - prevLane) <= 1))
  const used = n === 3 ? lanes : [correctLane, pick(rng, lanes.filter((i) => i !== correctLane))].sort((a, b) => a - b)
  const [right, ...wrong] = questionFor(run.mode, k, n, rng, run.alphabet)
  const others = shuffle(rng, wrong)
  const tiles = used.map((lane) => ({
    x: cfg.slots[lane] + (rng() - 0.5) * 0.2,
    w,
    ...(lane === correctLane ? right : others.pop()),
    pad: false,
    hit: null,
    hitAt: 0,
    color: Math.floor(rng() * 5),
  }))
  return { k, z, sway: swayFor(k, rng, cfg), hint: false, clearedAt: null, tiles }
}

/** Which lane (index into cfg.slots) a row's correct tile is in; the start pad counts as the middle. */
function laneOf(row, cfg) {
  const tile = row?.tiles.find((t) => t.correct)
  if (!tile || tile.pad) return Math.floor(cfg.slots.length / 2)
  let best = 0
  cfg.slots.forEach((x, i) => { if (Math.abs(x - tile.x) < Math.abs(cfg.slots[best] - tile.x)) best = i })
  return best
}

/** Each row floats up and down a little, on its own beat (drawing only: landing ignores it). */
export const bob = (k, t) => Math.sin(t * 1.5 + k * 1.9) * 0.07

/** Where a tile is at time t (rows that sway move all their tiles together). */
export function tileX(row, tile, t) {
  return tile.x + (row.sway ? Math.sin(t * row.sway.speed + row.sway.phase) * row.sway.amp : 0)
}

/**
 * The tile under x in a row at time t, or null (the void). Forgiving: a ball up to `forgive` past a
 * tile's edge still lands on it, and if that puts it in reach of two tiles, the nearer one wins.
 */
export function tileUnder(row, x, t, cfg = HOP_CONFIG) {
  let best = null
  let bestGap = Infinity
  for (const tile of row.tiles) {
    const gap = Math.abs(x - tileX(row, tile, t)) - tile.w / 2 // how far past the edge (< 0: on it)
    if (gap <= cfg.forgive && gap < bestGap) { best = tile; bestGap = gap }
  }
  return best
}

/* ------------------------------------------------------------------ the run */

const AHEAD = 16

export function createRun({ seed = 1, mode = 'by2', alphabet = 'en', practice = false, cfg = HOP_CONFIG } = {}) {
  const run = {
    cfg,
    t: 0,
    mode: MODES[mode] ? mode : 'by2',
    alphabet,
    practice,
    rng: createRng(seed),
    rows: [],
    row: 0, // the row the ball is on (or took off from)
    x: 0,
    vx: 0,
    // the hop in progress: 'contact' (squashed on a tile) → 'air' → land → …; or 'back' / 'fall'
    phase: 'contact',
    phaseT: 0,
    phaseDur: cfg.hop.contact * 4, // a short wind-up before the very first hop
    settleX: null, // where the ball is settling to on the tile it just landed on (contact only)
    paceTier: 0, // 0 = the calm start; see hopDuration
    nextPaceAt: cfg.pace.tierEvery, // the good-hop count that may bring the next pace step
    from: 0,
    to: 1,
    superHop: false,
    fromX: 0,
    backX0: 0,
    backX1: 0,
    input: { dir: 0, dragX: null },
    hearts: cfg.hearts,
    score: 0,
    combo: 0,
    bestCombo: 0,
    correct: 0,
    wrong: 0,
    falls: 0,
    over: false,
    events: [],
  }
  ensureRows(run)
  return run
}

function ensureRows(run) {
  while (run.rows.length <= run.row + AHEAD) run.rows.push(makeRow(run.rows.length, run, run.cfg))
}

export const multiplier = (combo, cfg = HOP_CONFIG) => Math.min(cfg.maxMultiplier, 1 + Math.floor(combo / cfg.comboStep))

/** Where the ball is drawn, from the state: { x, y, z, p } (p = how far through the hop, 0..1). */
export function ballPosition(run) {
  const { cfg } = run
  const zOf = (k) => -k * cfg.rowGap
  if (run.phase === 'air') {
    const p = clamp(run.phaseT / run.phaseDur, 0, 1)
    const h = run.superHop ? cfg.hop.superHeight : cfg.hop.height
    return { x: run.x, y: 4 * h * p * (1 - p), z: zOf(run.from) + (zOf(run.to) - zOf(run.from)) * p, p }
  }
  if (run.phase === 'back') { // from the wrong tile back to where it came from, in a smaller arc
    const p = clamp(run.phaseT / run.phaseDur, 0, 1)
    const z = zOf(run.to) + (zOf(run.from) - zOf(run.to)) * p
    return { x: run.x, y: 4 * cfg.hop.height * 0.8 * p * (1 - p), z, p }
  }
  if (run.phase === 'fall') {
    const s = run.phaseT
    const z = zOf(run.to) - s * 1.2
    return { x: run.x, y: -9 * s * s - 1.5 * s, z, p: 1 }
  }
  return { x: run.x, y: 0, z: zOf(run.row), p: 0 }
}

/** The ball's height speed (units/s), for squash and stretch. */
export function ballVerticalSpeed(run) {
  const { cfg } = run
  if (run.phase === 'air') {
    const p = clamp(run.phaseT / run.phaseDur, 0, 1)
    const h = run.superHop ? cfg.hop.superHeight : cfg.hop.height
    return (4 * h * (1 - 2 * p)) / run.phaseDur
  }
  if (run.phase === 'fall') return -18 * run.phaseT - 1.5
  return 0
}

function steer(run, dt) {
  const { cfg, input } = run
  if (run.phase === 'contact' && run.settleX != null) { // just landed: settle onto the tile, no sliding
    run.x += (run.settleX - run.x) * (1 - Math.exp(-cfg.hop.settle * dt))
    run.vx = 0
    return
  }
  if (run.phase === 'back') { // glide back over the tile it came from
    const p = clamp(run.phaseT / run.phaseDur, 0, 1)
    run.x = run.backX0 + (run.backX1 - run.backX0) * p
    run.vx = 0
    return
  }
  if (run.phase === 'fall') { run.vx = 0; return }
  if (input.dragX != null && Number.isFinite(input.dragX)) {
    const target = clamp(input.dragX, -cfg.xLimit, cfg.xLimit)
    const want = clamp((target - run.x) * cfg.steer.dragFollow, -cfg.steer.dragMax, cfg.steer.dragMax)
    run.vx = want
  } else {
    const want = clamp(input.dir, -1, 1) * cfg.steer.speed
    const dv = want - run.vx
    const maxDv = cfg.steer.accel * dt
    run.vx += clamp(dv, -maxDv, maxDv)
  }
  run.x += run.vx * dt
  if (run.x < -cfg.xLimit || run.x > cfg.xLimit) {
    run.x = clamp(run.x, -cfg.xLimit, cfg.xLimit)
    run.vx = 0
  }
}

function startHop(run) {
  run.from = run.row
  run.to = run.row + 1
  run.fromX = run.x
  run.phase = 'air'
  run.phaseT = 0
  run.settleX = null
  run.phaseDur = hopDuration(run.paceTier, run.cfg) // the same time for every hop, super or not
  run.events.push({ type: 'hop', super: run.superHop, row: run.row })
}

function loseHeart(run) {
  run.combo = 0
  easePace(run)
  if (run.practice) return
  run.hearts -= 1
}

/** After the calm start, each `tierEvery` good hops make the hops one small step quicker. */
function quickenPace(run) {
  const { cfg } = run
  if (run.t < cfg.pace.calmSeconds || run.correct < run.nextPaceAt) return
  if (hopDuration(run.paceTier + 1, cfg) >= hopDuration(run.paceTier, cfg)) return // already as quick as it gets
  run.paceTier += 1
  run.nextPaceAt = run.correct + cfg.pace.tierEvery
  run.events.push({ type: 'pace', tier: run.paceTier })
}

/** A mistake eases the pace back a step, so a struggling player gets a calmer rhythm again. */
function easePace(run) {
  if (run.paceTier > 0) run.paceTier -= 1
  run.nextPaceAt = run.correct + run.cfg.pace.tierEvery
}

/** Where on a tile a ball at x should settle: no nearer the edge than most of its own width. */
function settleOnto(row, tile, x, t, cfg) {
  const cx = tileX(row, tile, t)
  const room = Math.max(0, tile.w / 2 - cfg.ballRadius * 0.8)
  return clamp(x, cx - room, cx + room)
}

function land(run) {
  const { cfg } = run
  const row = run.rows[run.to]
  const tile = tileUnder(row, run.x, run.t, cfg)
  run.superHop = false
  if (tile && tile.correct) {
    tile.hit = 'correct'
    tile.hitAt = run.t
    row.clearedAt = run.t
    run.row = run.to
    run.correct += 1
    run.combo += 1
    run.bestCombo = Math.max(run.bestCombo, run.combo)
    run.settleX = settleOnto(row, tile, run.x, run.t, cfg)
    quickenPace(run)
    const mult = multiplier(run.combo, cfg)
    const points = cfg.points * mult
    run.score += points
    ensureRows(run)
    run.events.push({ type: 'land', value: tile.value, label: tile.label, points, combo: run.combo, multiplier: mult, x: tileX(row, tile, run.t), z: row.z })
    if (run.combo % cfg.comboStep === 0) {
      run.superHop = true
      run.events.push({ type: 'boost', combo: run.combo, multiplier: mult })
    }
    if (MILESTONES.includes(run.correct)) run.events.push({ type: 'milestone', correct: run.correct })
    run.phase = 'contact'
    run.phaseT = 0
    run.phaseDur = cfg.hop.contact
    return
  }
  row.hint = true
  if (tile) { // a wrong tile: boing back
    tile.hit = 'wrong'
    tile.hitAt = run.t
    run.wrong += 1
    loseHeart(run)
    const right = row.tiles.find((t) => t.correct)
    run.events.push({ type: 'wrong', label: tile.label, value: tile.value, answer: right?.label, hearts: run.hearts, x: tileX(row, tile, run.t), z: row.z })
    const fromRow = run.rows[run.from]
    const home = fromRow.tiles.find((t) => t.hit === 'correct') ?? fromRow.tiles.find((t) => t.correct) ?? fromRow.tiles[0]
    run.backX0 = run.x
    run.backX1 = clamp(tileX(fromRow, home, run.t), -cfg.xLimit, cfg.xLimit)
    run.phase = 'back'
    run.phaseT = 0
    run.phaseDur = cfg.bounceBack
    return
  }
  run.falls += 1
  loseHeart(run)
  run.events.push({ type: 'fall', hearts: run.hearts, answer: row.tiles.find((t) => t.correct)?.label })
  run.phase = 'fall'
  run.phaseT = 0
  run.phaseDur = cfg.fallTime
}

/** Back on the tile the ball left (after a wrong tile or a fall): onto its middle, then hop again. */
function respawn(run) {
  const row = run.rows[run.from]
  const tile = row.tiles.find((t) => t.hit === 'correct') ?? row.tiles.find((t) => t.correct) ?? row.tiles[0]
  run.row = run.from
  run.x = clamp(tileX(row, tile, run.t), -run.cfg.xLimit, run.cfg.xLimit)
  run.vx = 0
  run.settleX = null
  run.events.push({ type: 'respawn', x: run.x, z: row.z })
  if (!run.practice && run.hearts <= 0) {
    run.over = true
    run.events.push({ type: 'over' })
    return
  }
  run.phase = 'contact'
  run.phaseT = 0
  run.phaseDur = run.cfg.hop.contact * 5 // a breath before trying again
}

export function stepRun(run, dt) {
  if (run.over) return run
  const step = Math.min(dt, 0.05) // a long frame (tab switch) never teleports the ball
  run.t += step
  steer(run, step)
  run.phaseT += step
  if (run.phaseT < run.phaseDur) return run
  switch (run.phase) {
    case 'contact': startHop(run); break
    case 'air': land(run); break
    case 'back':
    case 'fall': respawn(run); break
    default: break
  }
  return run
}

/**
 * Where the ball will come down if it keeps its line: { k, x, tile } (tile null = the void), worked out
 * for the moment it lands (so swaying rows are judged where they will be). While the ball rests on a
 * tile it previews the next hop. null while it bounces back or falls.
 */
export function landingPreview(run) {
  if (run.over || run.phase === 'back' || run.phase === 'fall') return null
  const k = run.phase === 'air' ? run.to : run.row + 1
  const row = run.rows[k]
  if (!row) return null
  const left = Math.max(0, run.phaseDur - run.phaseT)
  const at = run.t + left + (run.phase === 'air' ? 0 : hopDuration(run.paceTier, run.cfg))
  return { k, x: run.x, tile: tileUnder(row, run.x, at, run.cfg) }
}

export function drainEvents(run) {
  const events = run.events
  run.events = []
  return events
}

/** What the HUD's Learning Target badge shows: the numbers so far and what comes next. */
export function targetFor(run) {
  const def = MODES[run.mode]
  if (def.kind === 'count') {
    const k = run.row
    const trail = [k - 2, k - 1, k].filter((i) => i >= 0).map((i) => i * def.step)
    return { kind: 'count', step: def.step, trail, next: (k + 1) * def.step }
  }
  return { kind: 'letters', vowels: (ALPHABETS[run.alphabet] ?? ALPHABETS.en).vowels }
}

export function summary(run) {
  const def = MODES[run.mode]
  return {
    mode: run.mode,
    score: run.score,
    correct: run.correct,
    wrong: run.wrong,
    falls: run.falls,
    bestCombo: run.bestCombo,
    time: run.t,
    reached: def.kind === 'count' ? run.row * def.step : run.correct,
  }
}

/** XP for a finished run: none for practice, about one per two good hops, a bonus for streaks. */
export function xpForRun(stats, practice) {
  if (practice) return 0
  return Math.min(40, Math.floor(stats.correct / 2) + Math.floor(stats.bestCombo / 5))
}
