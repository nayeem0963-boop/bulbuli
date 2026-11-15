/**
 * Safe recovery: Bulbuli is never lost, stranded or stuck outside the expedition.
 *
 * Pure logic, without React or three.js. ExplorerController calls updateRecovery once a frame,
 * after the physics; recovery.test.js drives the same path.
 *
 * What it adds, on every map:
 *   - the playable area is the terrain that is drawn (every station, tree and path lies inside it)
 *   - a gentle warning as Bulbuli nears or leaves its outer edge
 *   - beyond a short margin, or once it has dropped off the edge, or if it is ever held
 *     motionless in mid-air, it is carried back in a smooth arc to the last safe spot it stood on
 *
 * What it leaves alone: the shared physics, its fall rescue far below the map, and the
 * Sundarbans water rescue (drive.js) all work as before. Nothing here knows about stations,
 * collected items or progress, so it cannot touch them. There is no failure, score or penalty.
 */
import { terrainFootprintRadius } from './rendering/terrain.js'

export const RECOVERY = Object.freeze({
  /** Maps whose edge is a drop (no water round them): warn this far inside the edge (m). */
  warnInsideEdge: 2.5,
  /** Maps surrounded by water: warn this far out beyond the drawn terrain (m). */
  warnBeyondWater: 4,
  /** Flying further than this beyond the drawn terrain, Bulbuli is carried back (m). */
  limitBeyond: 9,
  /** Off the edge and this far below the lowest ground: carried back, long before the far fall. */
  dropBelow: 4,
  /** A spot counts as safe once Bulbuli has stood there this long (s)… */
  standFor: 0.25,
  /** …this far inside the outer edge of the drawn terrain (m)… */
  safeInside: 3.5,
  /** …and this far inside the rim of the piece of ground it stands on (m). */
  safeFromRim: 0.6,
  /** Motionless in mid-air for this long without flying: the physics is stuck; carry it back (s). */
  hangFor: 1,
  /** The carry back: seconds, and how high its arc lifts above the straight line (m). */
  carrySeconds: 0.9,
  carryLift: 1.6,
  /** How long the "back on safe ground" note stays (s). */
  noteSeconds: 4.5,
})

const AREAS = new WeakMap()
function areaOf(biome) {
  if (!AREAS.has(biome)) {
    AREAS.set(biome, {
      discs: biome.discs.map((d) => ({ x: d.x, z: d.z, r: terrainFootprintRadius(d), core: d.r, top: d.top })),
      lowest: Math.min(...biome.discs.map((d) => d.top)),
    })
  }
  return AREAS.get(biome)
}

/** How far (x, z) lies beyond the terrain that is drawn: negative inside it, positive outside. */
export function distanceOutside(biome, x, z) {
  let nearest = Infinity
  for (const d of areaOf(biome).discs) nearest = Math.min(nearest, Math.hypot(x - d.x, z - d.z) - d.r)
  return nearest
}

/** Where the gentle warning starts on this map, as a distanceOutside value. */
export const warnDistance = (biome) => (biome.water ? RECOVERY.warnBeyondWater : -RECOVERY.warnInsideEdge)

export function createRecovery(biome) {
  return {
    safe: [...biome.spawn.position], // the last safe spot Bulbuli stood on
    stoodFor: 0,
    hungFor: 0,
    last: null,
    carry: null, // { from, to, t } while Bulbuli is being carried back
    note: null, // { kind: 'returned', reason, left } after a carry or a rescue
  }
}

/** A deliberate move (the Mission Log's "Travel here"): that place is the safe spot now. */
export function markSafe(state, position) {
  state.safe = [...position]
  state.stoodFor = 0
  state.hungFor = 0
  state.last = null
  state.carry = null
}

function isSafeStanding(biome, p, colliders) {
  if (!p.grounded || !p.groundId) return false
  const ground = colliders?.find((c) => c.id === p.groundId || c.groundId === p.groundId)
  // the ground itself, or a Sahara dune (sand to stand on like any other)
  if (!ground || !(ground.kind === 'land' || ground.id.startsWith('dune-'))) return false
  // beside water: only the firm middle of an island or a boardwalk, never its shore
  if (biome.water) return !ground.surfaceOnly && Math.hypot(p.pos[0] - ground.x, p.pos[2] - ground.z) <= ground.r - RECOVERY.safeFromRim
  // on a map with a drop at its edge: any ground well inside the edge, never a spot from which
  // the next step is the drop
  return distanceOutside(biome, p.pos[0], p.pos[2]) <= -RECOVERY.safeInside
}

/**
 * One frame of recovery, after stepPlayer (and the water rescue) have run.
 *
 * @param state     from createRecovery
 * @param p         the player (its pos / vel are changed only while it is carried back)
 * @param biome     the map
 * @param dt        seconds
 * @param options   { colliders: those near Bulbuli, events: this frame's physics events,
 *                    flying: Space held, reducedMotion }
 * @returns { carrying, warning, note }  carrying: skip the physics next frame;
 *          warning: true near or beyond the edge; note: { kind: 'returned', reason } or null
 */
export function updateRecovery(state, p, biome, dt, { colliders = null, events = null, flying = false, reducedMotion = false } = {}) {
  const area = areaOf(biome)
  if (state.note) {
    state.note.left -= dt
    if (state.note.left <= 0) state.note = null
  }

  // being carried back: an eased arc from where it was to the safe spot
  if (state.carry) {
    const carry = state.carry
    carry.t = Math.min(1, carry.t + dt / RECOVERY.carrySeconds)
    const e = carry.t * carry.t * (3 - 2 * carry.t)
    p.pos[0] = carry.from[0] + (carry.to[0] - carry.from[0]) * e
    p.pos[2] = carry.from[2] + (carry.to[2] - carry.from[2]) * e
    p.pos[1] = carry.from[1] + (carry.to[1] - carry.from[1]) * e + Math.sin(Math.PI * carry.t) * carry.lift
    p.vel[0] = 0
    p.vel[1] = 0
    p.vel[2] = 0
    p.grounded = false
    p.groundId = null
    p.gliding = false
    const flat = Math.hypot(carry.to[0] - carry.from[0], carry.to[2] - carry.from[2])
    if (flat > 0.2) p.facing = Math.atan2(carry.to[0] - carry.from[0], carry.to[2] - carry.from[2])
    if (carry.t >= 1) {
      p.pos = [carry.to[0], carry.to[1] + 0.05, carry.to[2]]
      p.checkpoint = [...carry.to]
      // a jump pressed just before the mishap is forgotten: Bulbuli is set down, not bounced
      p.buffer = 0
      p.coyote = 0
      state.note = { kind: 'returned', reason: carry.reason, left: RECOVERY.noteSeconds }
      state.carry = null
      state.last = null
      state.hungFor = 0
    }
    return { carrying: Boolean(state.carry), warning: false, note: state.note }
  }

  // the physics' own rescues (the far fall, the Sundarbans water) have already put Bulbuli back:
  // say so, kindly, and leave them be
  if (events?.fell) {
    state.note = { kind: 'returned', reason: biome.water ? 'water' : 'fall', left: RECOVERY.noteSeconds }
    state.last = null
    state.hungFor = 0
    return { carrying: false, warning: false, note: state.note }
  }

  // remember the last safe spot stood on
  if (isSafeStanding(biome, p, colliders)) {
    state.stoodFor += dt
    if (state.stoodFor >= RECOVERY.standFor) state.safe = [p.pos[0], p.pos[1], p.pos[2]]
  } else {
    state.stoodFor = 0
  }

  // held motionless in mid-air while not flying: nothing in the game does that on purpose
  const moved = state.last ? Math.hypot(p.pos[0] - state.last[0], p.pos[1] - state.last[1], p.pos[2] - state.last[2]) : Infinity
  state.hungFor = !p.grounded && !flying && moved < 1e-4 ? state.hungFor + dt : 0
  state.last = [p.pos[0], p.pos[1], p.pos[2]]

  const outside = distanceOutside(biome, p.pos[0], p.pos[2])
  let reason = null
  if (outside > RECOVERY.limitBeyond) reason = 'far'
  else if (outside > 0 && p.pos[1] < area.lowest - RECOVERY.dropBelow) reason = 'edge'
  else if (state.hungFor >= RECOVERY.hangFor) reason = 'stuck'

  if (reason) {
    const from = [p.pos[0], p.pos[1], p.pos[2]]
    const to = [...state.safe]
    state.hungFor = 0
    if (reducedMotion) {
      // no sweeping movement: straight there
      state.carry = { from: to, to, t: 1 - 1e-9, lift: 0, reason }
    } else {
      // rise clear of the ground on the way, more when coming up from below it
      const lift = RECOVERY.carryLift + Math.max(0, Math.min(6, (to[1] - from[1]) * 0.25))
      state.carry = { from, to, t: 0, lift, reason }
    }
    p.vel[0] = 0
    p.vel[1] = 0
    p.vel[2] = 0
    return { carrying: true, warning: false, note: state.note }
  }

  return { carrying: false, warning: outside > warnDistance(biome), note: state.note }
}
