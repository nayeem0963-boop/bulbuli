/**
 * Follow-camera framing for an expedition map, without React or three.js (ExplorerController
 * applies it every frame; cameraRig.test.js checks it).
 *
 * Every destination uses DEFAULT_CAMERA unless its map sets `camera`, so a map that says nothing
 * keeps exactly the framing it always had. A map may also list `avoid` volumes (upright
 * cylinders the camera must not enter or look through, such as the Sundarbans village houses):
 * the camera then swings round to the nearest clear side (settleYaw), and while it gets there it
 * moves in towards Bulbuli along its own line of sight (cameraPose).
 *
 *   distance    metres behind Bulbuli
 *   height      metres above Bulbuli's position
 *   lookHeight  metres above Bulbuli's position that the camera aims at (higher = horizon lower
 *               in the frame, so more forest and sky)
 *   fov         vertical field of view in degrees; only applied when a map sets it, otherwise the
 *               canvas keeps the field of view it was created with (DEFAULT_FOV)
 */
export const DEFAULT_CAMERA = Object.freeze({ distance: 3.2, height: 1.8, lookHeight: 0.3 })
/** The field of view ExpeditionCanvas creates its camera with. */
export const DEFAULT_FOV = 50

/** Closest the camera may be pulled in (fraction of `distance`) when something is in the way. */
const MIN_PULL = 0.3
const PULL_STEP = 0.05
/** Camera height (metres above Bulbuli) when pulled all the way in. */
const CLOSE_HEIGHT = 1

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

/** Extra margin round a volume, so a line of sight sampled in steps cannot graze through it. */
const PAD = 0.2
const insideAny = (avoid, x, y, z) => avoid.some((c) => y < c.top && Math.hypot(x - c.x, z - c.z) < c.r + PAD)

/**
 * Where the camera wants to be and what it looks at, for Bulbuli at `pos` with camera yaw `yaw`.
 * @returns {{ position: number[], lookAt: number[], pull: number }}  pull is 1 when unobstructed
 */
export function cameraPose(pos, yaw, rig) {
  const dx = Math.sin(yaw) * rig.distance
  const dz = Math.cos(yaw) * rig.distance
  const y = pos[1] + rig.height
  let pull = 1
  if (rig.avoid.length) {
    // walk outwards from Bulbuli and stop just before the first blocked point, so the camera is
    // neither inside a volume nor behind one
    pull = MIN_PULL
    for (let t = MIN_PULL + PULL_STEP; t <= 1 + 1e-9; t += PULL_STEP) {
      if (insideAny(rig.avoid, pos[0] + dx * t, y, pos[2] + dz * t)) break
      pull = Math.min(1, t)
    }
  }
  // Pulled in close, the camera also comes down and aims lower (towards the default framing), so
  // it looks at Bulbuli from behind instead of straight down from its usual height.
  const k = (pull - MIN_PULL) / (1 - MIN_PULL)
  const lookHeight = DEFAULT_CAMERA.lookHeight + (rig.lookHeight - DEFAULT_CAMERA.lookHeight) * k
  const closeHeight = Math.min(rig.height, CLOSE_HEIGHT)
  let cy = pull < 1 ? pos[1] + closeHeight + (rig.height - closeHeight) * k : y
  // boxed in even at the closest point: rise above whatever is there
  for (const c of rig.avoid) {
    if (cy < c.top && Math.hypot(pos[0] + dx * pull - c.x, pos[2] + dz * pull - c.z) < c.r + PAD) cy = c.top + 0.3
  }
  return {
    position: [pos[0] + dx * pull, cy, pos[2] + dz * pull],
    lookAt: [pos[0], pos[1] + (pull < 1 ? lookHeight : rig.lookHeight), pos[2]],
    pull,
  }
}

/** How fast the camera swings round on its own when a volume is in its way (radians a second). */
export const AUTO_TURN_SPEED = 2.6
const YAW_STEP = Math.PI / 18

/**
 * The camera yaw nearest to `yaw` from which the view of Bulbuli is unobstructed at full
 * distance, or null when the view is already clear (or the map has nothing to avoid, or no clear
 * direction exists). Pulling the camera in is only a stopgap: right beside a house it would have
 * to look almost straight down, so the camera swings round the house instead.
 */
export function clearYaw(pos, yaw, rig) {
  if (!rig.avoid.length || cameraPose(pos, yaw, rig).pull >= 1) return null
  for (let k = 1; k <= 18; k += 1) {
    for (const side of [1, -1]) {
      const candidate = yaw + side * k * YAW_STEP
      if (cameraPose(pos, candidate, rig).pull >= 1) return candidate
    }
  }
  return null
}

/**
 * One frame of that swing: the yaw to use next. Returns `yaw` itself when nothing is in the way.
 * @param snap  true to jump straight there (reduced motion)
 */
export function settleYaw(pos, yaw, rig, dt, snap = false) {
  const target = clearYaw(pos, yaw, rig)
  if (target === null) return yaw
  const delta = target - yaw
  if (snap) return target
  const step = AUTO_TURN_SPEED * dt
  return yaw + Math.max(-step, Math.min(step, delta))
}
