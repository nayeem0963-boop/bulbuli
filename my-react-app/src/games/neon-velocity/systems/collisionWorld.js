import { Box3, Vector3 } from 'three'

/*
 * collisionWorld: the game's own tiny physics, replacing Rapier.
 *
 * Everything in the course is an axis-aligned box (Box3) or a ramp, registered by
 * the component that draws it and removed when that component unmounts:
 *
 *   solids   platforms (standable) and wall-run panels (side-blocking only)
 *   ramps    sloped surfaces: height is a straight line from z0 (bottom) to z0 − length (top)
 *   sensors  hazards and pickups: no push, just an onEnter() callback the first frame
 *            the player overlaps them. A sensor either has a fixed `box` or a
 *            `getBox(out)` function for moving things (lasers).
 *
 * The player is a kinematic body: { pos, vel } where pos is the centre of the foot
 * sphere (feet = pos.y − footOffset), exactly like the old Rapier body. moveBody()
 * integrates it and resolves contacts, in sub-steps so nothing tunnels at top speed
 * (64 m/s at 20 fps would otherwise jump 3 m per frame):
 *
 *   1. gravity + position integration (semi-implicit Euler)
 *   2. ground: the highest standable top under the player that the feet reached from
 *      above (or from at most STEP_UP below) → snap onto it, kill downward velocity
 *   3. push-out: any other solid the player's box overlaps is resolved along its
 *      shallowest axis (side walls → x, the front face of a higher platform → z, a
 *      ceiling → y)
 *   4. sensors: tested against the box swept from the sub-step's start to its end,
 *      so a 0.5 m laser can't slip between two frames
 */

export const STEP_UP = 0.3      // feet this far below a top still land on it (forgiving edges)
const SKIN = 0.02               // contact tolerance
const EDGE_X = 0.15             // support extends this far past a platform's sides…
const EDGE_Z = 0.25             // …and front/back edges (lands the tip of a jump)
const MAX_SUBSTEP = 0.3         // metres travelled per sub-step
const MAX_SUBSTEPS = 16

const solids = new Map()   // id → { box: Box3, standable: boolean }
const ramps = new Map()    // id → { xMin, xMax, z0, z1, rise, slope }
const sensors = new Map()  // id → { box?: Box3, getBox?: (out: Box3) => Box3, onEnter: () => void }

export const collisionWorld = {
  addSolid(id, box, { standable = true } = {}) {
    solids.set(id, { box, standable })
    return () => solids.delete(id)
  },
  addRamp(id, { x, w, z0, length, rise }) {
    ramps.set(id, { xMin: x - w / 2, xMax: x + w / 2, z0, z1: z0 - length, rise, slope: rise / length })
    return () => ramps.delete(id)
  },
  addSensor(id, sensor) {
    sensors.set(id, sensor)
    return () => sensors.delete(id)
  },
  get size() { return { solids: solids.size, ramps: ramps.size, sensors: sensors.size } },
  clear() { solids.clear(); ramps.clear(); sensors.clear() },
}

/** Box3 from a centre and full size. */
export const boxFrom = (cx, cy, cz, sx, sy, sz) => new Box3(
  new Vector3(cx - sx / 2, cy - sy / 2, cz - sz / 2),
  new Vector3(cx + sx / 2, cy + sy / 2, cz + sz / 2),
)

export function createBody(x, y, z) {
  return {
    pos: new Vector3(x, y, z),
    vel: new Vector3(),
    grounded: true,      // starts on the start platform
    groundSlope: 0,      // rise/run of the ramp under the feet (0 on flat ground)
    landedVy: 0,         // downward speed at the last touchdown (for landing effects)
    blocked: false,      // pushed back by the front face of a platform this frame
    inside: new Set(),   // sensors overlapped last frame (onEnter fires only on entry)
  }
}

// scratch objects, reused every frame
const pBox = new Box3()
const sweep = new Box3()
const tmpBox = new Box3()
const touched = new Set()

function playerBox(out, pos, { radius, height, footOffset }) {
  const feet = pos.y - footOffset
  out.min.set(pos.x - radius, feet, pos.z - radius)
  out.max.set(pos.x + radius, feet + height, pos.z + radius)
  return out
}

/**
 * Move the body by its velocity for `dt` seconds and resolve contacts.
 * @param shape    { radius, height, footOffset } of the player's box
 * @param gravity  vertical acceleration for this frame (gravity × gravity scale)
 */
export function moveBody(body, dt, shape, gravity) {
  const { pos, vel } = body
  const travel = Math.hypot(vel.x, vel.y, vel.z) * dt
  const steps = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(travel / MAX_SUBSTEP)))
  const h = dt / steps

  let wasGrounded = body.grounded
  body.grounded = false
  body.groundSlope = 0
  body.blocked = false
  touched.clear()

  for (let i = 0; i < steps; i++) {
    const prevFeet = pos.y - shape.footOffset
    playerBox(sweep, pos, shape)                 // sweep starts at the sub-step's start

    vel.y += gravity * h
    pos.addScaledVector(vel, h)

    const support = resolveGround(body, prevFeet, shape, wasGrounded)
    resolveSolids(body, shape, support)
    wasGrounded = body.grounded

    sweep.union(playerBox(pBox, pos, shape))     // …and ends where it ended up
    testSensors(body)
  }

  // sensors left this frame can trigger again next time they're entered
  for (const id of body.inside) if (!touched.has(id)) body.inside.delete(id)
  return body
}

function resolveGround(body, prevFeet, shape, wasGrounded) {
  const { pos, vel } = body
  const feet = pos.y - shape.footOffset
  let bestTop = -Infinity
  let bestSlope = 0
  let bestSolid = null

  const canLand = (top) => feet <= top + SKIN && prevFeet >= top - STEP_UP && (vel.y <= 0 || feet < top)

  for (const solid of solids.values()) {
    if (!solid.standable) continue
    const b = solid.box
    if (pos.x < b.min.x - EDGE_X || pos.x > b.max.x + EDGE_X) continue
    if (pos.z < b.min.z - EDGE_Z || pos.z > b.max.z + EDGE_Z) continue
    const top = b.max.y
    if (top > bestTop && canLand(top)) { bestTop = top; bestSlope = 0; bestSolid = solid }
  }
  for (const r of ramps.values()) {
    if (pos.x < r.xMin - EDGE_X || pos.x > r.xMax + EDGE_X) continue
    if (pos.z > r.z0 || pos.z < r.z1) continue
    const top = (r.z0 - pos.z) * r.slope
    if (top > bestTop && canLand(top)) { bestTop = top; bestSlope = r.slope; bestSolid = r }
  }

  if (bestTop === -Infinity) return null
  pos.y = bestTop + shape.footOffset
  if (vel.y < 0) {
    if (!wasGrounded) body.landedVy = vel.y   // touchdown, not just standing
    vel.y = 0
  }
  body.grounded = true
  body.groundSlope = bestSlope
  return bestSolid
}

function resolveSolids(body, shape, support) {
  const { pos, vel } = body
  for (const solid of solids.values()) {
    if (solid === support) continue
    const b = solid.box
    playerBox(pBox, pos, shape)
    if (!pBox.intersectsBox(b)) continue
    // standing on top of it (within the step tolerance) is not a collision
    if (solid.standable && pBox.min.y >= b.max.y - STEP_UP) continue

    const ox = Math.min(pBox.max.x - b.min.x, b.max.x - pBox.min.x)
    const oy = Math.min(pBox.max.y - b.min.y, b.max.y - pBox.min.y)
    const oz = Math.min(pBox.max.z - b.min.z, b.max.z - pBox.min.z)

    if (ox <= oy && ox <= oz) {
      // side: push out sideways
      pos.x += pos.x < (b.min.x + b.max.x) / 2 ? -ox : ox
      vel.x = 0
    } else if (oz <= oy) {
      // front (or back) face: the runner is stopped against it and slides down
      pos.z += pos.z > (b.min.z + b.max.z) / 2 ? oz : -oz
      body.blocked = true
    } else if (pos.y < (b.min.y + b.max.y) / 2) {
      // ceiling: bump the head
      pos.y -= oy
      vel.y = Math.min(vel.y, 0)
    } else {
      // on top but below the step tolerance (deep landing): lift out
      pos.y += oy
      if (vel.y < 0) vel.y = 0
      body.grounded = true
    }
  }
}

function testSensors(body) {
  for (const [id, sensor] of sensors) {
    const box = sensor.getBox ? sensor.getBox(tmpBox) : sensor.box
    if (!box || !sweep.intersectsBox(box)) continue
    touched.add(id)
    if (body.inside.has(id)) continue
    body.inside.add(id)
    sensor.onEnter()
  }
}
