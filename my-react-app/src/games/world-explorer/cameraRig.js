/**
 * Follow-camera framing for an expedition map, without React or three.js (ExplorerController
 * applies it every frame; cameraRig.test.js checks it).
 *
 * Every destination uses DEFAULT_CAMERA unless its map sets `camera`, so a map that says nothing
 * keeps exactly the framing it always had.
 *
 *   distance    metres behind Bulbuli
 *   height      metres above Bulbuli's position
 *   lookHeight  metres above Bulbuli's position that the camera aims at (higher = horizon lower
 *               in the frame, so more forest and sky)
 *   fov         vertical field of view in degrees; only applied when a map sets it, otherwise the
 *               canvas keeps the field of view it was created with (DEFAULT_FOV)
 *   avoid       upright cylinders { x, z, r, top } the camera must not enter or look through
 *               (the Sundarbans village houses)
 *
 * Obstruction handling (only for maps with `avoid` volumes; advanceCamera does one frame of it):
 *   1. The camera yaw is steered round a volume (steerYaw). It starts while the volume is still
 *      only close to the line of sight, turns one way until the view is clear, and never works
 *      against the player: while Q or E is held it only ever helps the turn across the blocked
 *      directions.
 *   2. The camera always aims for a full-distance, normally framed position (cameraTarget). When
 *      the current direction is blocked it aims for the clear direction it is turning towards,
 *      so it is never pulled in close or lifted to look straight down.
 *   3. The eased camera is kept out of the volumes and at a comfortable angle on its way there
 *      (constrainCamera).
 */
export const DEFAULT_CAMERA = Object.freeze({ distance: 3.2, height: 1.8, lookHeight: 0.3 })
/** The field of view ExpeditionCanvas creates its camera with. */
export const DEFAULT_FOV = 50

/** How fast the camera position follows its target (ExplorerController's easing). */
export const CAMERA_EASE = 6
/** How fast the camera swings round a volume that is close to the line of sight (radians a second). */
export const AUTO_TURN_SPEED = 2.6
/** ...and when the line of sight is actually blocked (after a teleport, say). */
export const BLOCKED_TURN_SPEED = 5
/** A volume this close (metres) to the line of sight already starts the swing. */
export const EARLY_MARGIN = 0.8
/** The steepest the camera may look down at Bulbuli while it moves round a volume (degrees). */
export const MAX_PITCH = 30

/** Extra margin round a volume, so a line of sight sampled in steps cannot graze through it. */
const PAD = 0.2
const SIGHT_FROM = 0.15
const SIGHT_STEP = 0.05
const YAW_STEP = Math.PI / 36
/** The eased camera stays at least this far (metres, on the ground plane) from Bulbuli near a volume. */
const MIN_FOLLOW = 2.2
const MIN_HEIGHT = 0.6
/** The eased camera does not skim closer than this (metres) above a volume. */
const ROOF_CLEARANCE = 0.5
/** Top speed (m/s) of the eased camera on its way round a volume, so a swing is a glide, not a jump. */
export const MAX_SWING_SPEED = 14
/** A camera further than this (metres) from its target is arriving from elsewhere (a teleport): not slowed. */
const ARRIVAL_DISTANCE = 12

/** The camera settings of a map: its own values over the defaults. */
export function cameraRigFor(biome) {
  const own = biome?.camera ?? {}
  return {
    distance: own.distance ?? DEFAULT_CAMERA.distance,
    height: own.height ?? DEFAULT_CAMERA.height,
    lookHeight: own.lookHeight ?? DEFAULT_CAMERA.lookHeight,
    fov: own.fov ?? null,
    avoid: own.avoid ?? [],
  }
}

/**
 * The camera position behind Bulbuli (at `pos`, camera yaw `yaw`) and the point it looks at.
 * Always the full, normal framing: obstruction is handled by turning (steerYaw), not by this.
 */
export function cameraPose(pos, yaw, rig) {
  return {
    position: [pos[0] + Math.sin(yaw) * rig.distance, pos[1] + rig.height, pos[2] + Math.cos(yaw) * rig.distance],
    lookAt: [pos[0], pos[1] + rig.lookHeight, pos[2]],
  }
}

/**
 * True when a volume stands in (or, with `margin`, within that many metres of) the line of sight
 * from the camera position for `yaw` to Bulbuli.
 */
export function viewBlocked(pos, yaw, rig, margin = 0) {
  if (!rig.avoid.length) return false
  const dx = Math.sin(yaw) * rig.distance
  const dz = Math.cos(yaw) * rig.distance
  for (const c of rig.avoid) {
    const reach = c.r + PAD + margin
    // from near Bulbuli (t = 0, the point looked at) out to the camera (t = 1), at the height the
    // line of sight really has there: a camera above a roof can still be looking through it
    for (let t = SIGHT_FROM; t <= 1 + 1e-9; t += SIGHT_STEP) {
      const y = pos[1] + rig.lookHeight + (rig.height - rig.lookHeight) * t
      if (y < c.top && Math.hypot(pos[0] + dx * t - c.x, pos[2] + dz * t - c.z) < reach) return true
    }
  }
  return false
}

/**
 * How early the swing may start here: EARLY_MARGIN where that still leaves a clear direction,
 * less (down to none) when Bulbuli stands so close to a volume that it would not.
 */
function earlyMargin(pos, rig) {
  for (const margin of [EARLY_MARGIN, EARLY_MARGIN / 2]) {
    for (let k = 0; k < 72; k += 1) if (!viewBlocked(pos, k * YAW_STEP, rig, margin)) return margin
  }
  return 0
}

/** The first clear yaw from `yaw` turning one way (side +1 or -1), or null if there is none. */
function clearYawToward(pos, yaw, rig, side, margin) {
  for (let k = 1; k <= 72; k += 1) {
    const candidate = yaw + side * k * YAW_STEP
    if (!viewBlocked(pos, candidate, rig, margin)) return candidate
  }
  return null
}

/** Which way (+1 / -1) the nearest clear yaw lies; 0 when the view is clear or nothing is clear. */
function nearestSide(pos, yaw, rig, margin) {
  for (let k = 1; k <= 72; k += 1) {
    if (!viewBlocked(pos, yaw + k * YAW_STEP, rig, margin)) return 1
    if (!viewBlocked(pos, yaw - k * YAW_STEP, rig, margin)) return -1
  }
  return 0
}

/**
 * The camera yaw nearest to `yaw` from which the view of Bulbuli is unobstructed, or null when
 * the view is already clear (or the map has nothing to avoid, or no clear direction exists).
 */
export function clearYaw(pos, yaw, rig, margin = 0) {
  if (!viewBlocked(pos, yaw, rig, margin)) return null
  const side = nearestSide(pos, yaw, rig, margin)
  return side ? clearYawToward(pos, yaw, rig, side, margin) : null
}

/** What the obstruction handling remembers between frames. */
export function createCameraState() {
  return { side: 0, manual: false, position: null }
}

/**
 * One frame of steering the camera yaw round the volumes. Returns the yaw to use.
 *
 * @param state   createCameraState(); `side` is the way the camera is turning (0 = not turning)
 * @param manual  the player's own turn this frame: +1 (E), -1 (Q) or 0
 * @param snap    true to jump straight to the clear direction (reduced motion)
 *
 * The turn keeps one direction until the view is clear, so it cannot flutter. While the player
 * turns, that direction is the player's: across the blocked directions the camera is carried
 * along the same way (never back), and where the view is merely close to a volume the player's
 * turn is left alone.
 */
export function steerYaw(state, pos, yaw, rig, dt, { manual = 0, snap = false } = {}) {
  if (!viewBlocked(pos, yaw, rig, EARLY_MARGIN)) {
    state.side = 0
    state.manual = false
    return yaw
  }
  const margin = earlyMargin(pos, rig)
  if (margin < EARLY_MARGIN && !viewBlocked(pos, yaw, rig, margin)) {
    state.side = 0
    state.manual = false
    return yaw
  }
  const blocked = viewBlocked(pos, yaw, rig, 0)
  if (manual) {
    state.side = manual
    state.manual = true
    if (!blocked) return yaw
  } else if (!state.side || state.manual) {
    // not turning yet, or the player has just let go: take the shorter way out, once
    state.side = nearestSide(pos, yaw, rig, margin)
    state.manual = false
  }
  if (!state.side) return yaw
  const target = clearYawToward(pos, yaw, rig, state.side, manual ? 0 : margin)
  if (target === null) return yaw
  if (snap && !manual) return target
  const step = (blocked && !manual ? BLOCKED_TURN_SPEED : AUTO_TURN_SPEED) * dt
  return yaw + state.side * Math.min(step, Math.abs(target - yaw))
}

/**
 * Where the camera should be heading: the normal pose for `yaw`, or, while that direction is
 * blocked, the normal pose for the clear direction the camera is turning towards.
 */
export function cameraTarget(state, pos, yaw, rig) {
  if (!viewBlocked(pos, yaw, rig, 0)) return cameraPose(pos, yaw, rig)
  const side = state.side || nearestSide(pos, yaw, rig, 0)
  const clear = side ? clearYawToward(pos, yaw, rig, side, 0) : null
  return cameraPose(pos, clear ?? yaw, rig)
}

/** True when Bulbuli is close enough to a volume for it to matter to the camera. */
export function nearAvoidVolume(pos, rig) {
  return rig.avoid.some((c) => Math.hypot(pos[0] - c.x, pos[2] - c.z) < c.r + rig.distance + 2)
}

/**
 * Keeps an eased camera position sensible on its way round a volume: outside every volume, not
 * on top of Bulbuli, and never looking down more steeply than MAX_PITCH. Returns a new position.
 * Away from the volumes it returns the position unchanged.
 */
export function constrainCamera(position, pos, rig) {
  if (!nearAvoidVolume(pos, rig)) return position
  let [x, y, z] = position
  const pushOut = () => {
    for (const c of rig.avoid) {
      if (y >= c.top + ROOF_CLEARANCE) continue
      const d = Math.hypot(x - c.x, z - c.z)
      if (d >= c.r) continue
      // straight out from the volume's axis (from Bulbuli's side if the camera is on the axis)
      const ux = d > 1e-6 ? (x - c.x) / d : Math.sign(pos[0] - c.x) || 1
      const uz = d > 1e-6 ? (z - c.z) / d : 0
      x = c.x + ux * c.r
      z = c.z + uz * c.r
    }
  }
  pushOut()
  const away = Math.hypot(x - pos[0], z - pos[2])
  if (away < MIN_FOLLOW && away > 1e-6) {
    x = pos[0] + ((x - pos[0]) / away) * MIN_FOLLOW
    z = pos[2] + ((z - pos[2]) / away) * MIN_FOLLOW
    pushOut() // staying out of a house matters more than the distance
  }
  const run = Math.hypot(x - pos[0], z - pos[2])
  const lookY = pos[1] + rig.lookHeight
  const highest = lookY + run * Math.tan((MAX_PITCH * Math.PI) / 180)
  y = Math.max(pos[1] + MIN_HEIGHT, Math.min(y, highest))
  return [x, y, z]
}

/**
 * One whole camera frame for a map with volumes to avoid: steers the yaw, eases the camera
 * towards its target and keeps it clear. Mutates `state` (state.position is the eased camera).
 *
 * @param current  the camera's position before this frame, used once to start the easing
 * @returns {{ yaw: number, position: number[], lookAt: number[] }}
 */
export function advanceCamera(state, pos, yaw, rig, dt, { manual = 0, snap = false, current = null } = {}) {
  const nextYaw = steerYaw(state, pos, yaw, rig, dt, { manual, snap })
  const target = cameraTarget(state, pos, nextYaw, rig)
  if (!state.position) state.position = current ? [...current] : [...target.position]
  if (snap) {
    state.position = [...target.position]
  } else {
    const ease = 1 - Math.exp(-Math.max(0, dt) * CAMERA_EASE)
    const from = state.position
    let next = from.map((value, i) => value + (target.position[i] - value) * ease)
    if (nearAvoidVolume(pos, rig)) {
      const gap = Math.hypot(target.position[0] - from[0], target.position[1] - from[1], target.position[2] - from[2])
      const moved = Math.hypot(next[0] - from[0], next[1] - from[1], next[2] - from[2])
      const limit = MAX_SWING_SPEED * Math.max(0, dt)
      if (gap < ARRIVAL_DISTANCE && moved > limit) next = from.map((value, i) => value + ((next[i] - value) / moved) * limit)
    }
    state.position = next
  }
  state.position = constrainCamera(state.position, pos, rig)
  return { yaw: nextYaw, position: [...state.position], lookAt: target.lookAt }
}
