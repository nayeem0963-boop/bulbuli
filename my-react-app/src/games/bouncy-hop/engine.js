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
  steer: { speed: 8.5, accel: 70, dragFollow: 16, dragMax: 13 },
  hop: { start: 0.84, min: 0.58, perRow: 0.006, height: 1.8, superHeight: 3.4, contact: 0.075 },
  bounceBack: 0.62, // seconds the "boing back" arc takes
  fallTime: 1.0,
  hearts: 3,
  forgive: 0.16, // a ball this much past a tile's edge still lands on it
  tile: { startWidth: 1.95, minWidth: 1.55, depth: 1.7, padWidth: 3.4 },
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

/** Seconds one hop takes when leaving row k: a little quicker the further you get. */
export const hopDuration = (k, cfg = HOP_CONFIG) => Math.max(cfg.hop.min, cfg.hop.start - k * cfg.hop.perRow)
/** How many tiles row k has: two while learning, then three. */
export const tilesInRow = (k) => (k <= 5 ? 2 : 3)
export const tileWidth = (k, cfg = HOP_CONFIG) =>
  Math.max(cfg.tile.minWidth, cfg.tile.startWidth - Math.max(0, k - 8) * 0.012)
/** Rows sway side to side from row 18 on, gently at first. */
export function swayFor(k, rng) {
  if (k < 18 || rng() > Math.min(0.6, 0.25 + (k - 18) * 0.012)) return null
  return { amp: Math.min(0.85, 0.4 + (k - 18) * 0.015), speed: 1.1 + rng() * 0.6, phase: rng() * Math.PI * 2 }
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
  // two tiles: any two of the three places; three tiles: all of them. A little jitter, never touching.
  const slots = n === 3 ? cfg.slots : shuffle(rng, cfg.slots).slice(0, 2).sort((a, b) => a - b)
  const labels = shuffle(rng, questionFor(run.mode, k, n, rng, run.alphabet))
  const tiles = slots.map((slot, i) => ({
    x: slot + (rng() - 0.5) * 0.2,
    w,
    ...labels[i],
    pad: false,
    hit: null,
    hitAt: 0,
    color: Math.floor(rng() * 5),
  }))
  return { k, z, sway: swayFor(k, rng), hint: false, clearedAt: null, tiles }
}

/** Each row floats up and down a little, on its own beat (drawing only: landing ignores it). */
export const bob = (k, t) => Math.sin(t * 1.5 + k * 1.9) * 0.07

/** Where a tile is at time t (rows that sway move all their tiles together). */
export function tileX(row, tile, t) {
  return tile.x + (row.sway ? Math.sin(t * row.sway.speed + row.sway.phase) * row.sway.amp : 0)
}

/** The tile under x in a row at time t, or null (the gap / the void). */
export function tileUnder(row, x, t, cfg = HOP_CONFIG) {
  for (const tile of row.tiles) {
    if (Math.abs(x - tileX(row, tile, t)) <= tile.w / 2 + cfg.forgive) return tile
  }
  return null
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
  run.phaseDur = hopDuration(run.row, run.cfg) * (run.superHop ? 1.25 : 1)
  run.events.push({ type: 'hop', super: run.superHop, row: run.row })
}

function loseHeart(run) {
  run.combo = 0
  if (run.practice) return
  run.hearts -= 1
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
