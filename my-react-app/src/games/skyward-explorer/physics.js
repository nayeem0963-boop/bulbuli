/**
 * Bulbuli: Skyward Explorer — the character's movement rules.
 *
 * A small hand-written kinematic controller, no physics engine: the world is a set of
 * upright cylinders ("colliders") you can stand on or bump into. Pure JavaScript with no
 * three.js, so physics.test.js can prove every platform in layout.js is reachable.
 *
 * Units: metres-ish, seconds. y is up.
 */
import { ISLAND, parkourRoute } from './layout.js'

export const PHYS = {
  gravity: 24,
  jumpSpeed: 9.5,          // apex ≈ 1.9 high (layout needs 1.3)
  lowJumpGravity: 2.2,     // let go of Space early = shorter hop
  runSpeed: 7,
  groundAccel: 45,         // how quickly Bulbuli reaches running speed (and stops)
  airAccel: 14,            // steering in the air
  glideSpeed: 9.5,         // gliding is faster than running…
  glideGravityScale: 0.25, // …and falls far slower
  glideMaxFall: 3,         // fastest sink while gliding
  glideAccel: 9,
  staminaDrain: 0.45,      // full meter ≈ 2.2 s of gliding
  staminaRegen: 0.65,      // refills on the ground
  coyoteTime: 0.12,        // a jump still works this long after running off an edge
  jumpBuffer: 0.14,        // Space pressed this long before landing still jumps
  radius: 0.35,
  boxPlayerRadius: 0.2,
  treeCollisionPadding: 0.2,
  treeRootPadding: 0.08,
  height: 1.05,
  avatarHeightOffset: 0.5,
  landingRayOriginOffset: 0.5,
  landingRayLength: 1.4,
  flightThrust: 22,
  maxFlightHeight: 24,
  fallLimit: -22,          // below this, Bulbuli is carried back to safety
}

// Walkable share of each chunk's radius: the rim is low-poly and jagged, so stay inside it.
const ISLAND_WALK = 0.93
const PLATFORM_WALK = 0.88

function isAabbCollider(collider) {
  return collider.shape === 'aabb'
}

function containsSupportPoint(collider, x, z) {
  if (isAabbCollider(collider)) {
    return x >= collider.minX && x <= collider.maxX && z >= collider.minZ && z <= collider.maxZ
  }
  const distance = Math.hypot(x - collider.x, z - collider.z)
  return distance <= (collider.supportRadius ?? collider.r)
    && (collider.innerRadius == null || distance >= collider.innerRadius)
}

function pushOutOfAabb(x, z, collider, radius) {
  const nearestX = Math.max(collider.minX, Math.min(collider.maxX, x))
  const nearestZ = Math.max(collider.minZ, Math.min(collider.maxZ, z))
  let dx = x - nearestX
  let dz = z - nearestZ
  let distance = Math.hypot(dx, dz)

  if (distance > 1e-8) {
    if (distance >= radius) return null
    dx /= distance
    dz /= distance
    return { x: nearestX + dx * radius, z: nearestZ + dz * radius, nx: dx, nz: dz }
  }

  const sides = [
    { distance: x - collider.minX, nx: -1, nz: 0, x: collider.minX - radius, z },
    { distance: collider.maxX - x, nx: 1, nz: 0, x: collider.maxX + radius, z },
    { distance: z - collider.minZ, nx: 0, nz: -1, x, z: collider.minZ - radius },
    { distance: collider.maxZ - z, nx: 0, nz: 1, x, z: collider.maxZ + radius },
  ]
  const side = sides.reduce((nearest, current) => current.distance < nearest.distance ? current : nearest)
  return { ...side, x: side.x, z: side.z }
}

/**
 * A non-walkable upright cylinder: a tree trunk, its root flare, a post. These are the colliders
 * Bulbuli must never end a step inside, so they get swept (continuous) tests and a final guard.
 */
function isSolidPost(collider) {
  if (isAabbCollider(collider) || collider.surfaceOnly || collider.supportOnly) return false
  return collider.collisionKind === 'tree-trunk' || collider.collisionKind === 'tree-root' || !collider.walkable
}

/** Whether the body standing at `y` (feet) overlaps the collider's height band. */
function bodyOverlapsBand(collider, y) {
  return y < collider.top - 0.05 && y + PHYS.height > collider.bottom
}

/**
 * How close Bulbuli's centre may come to a cylinder's axis with feet at `y`: the trunk (or the wider
 * root flare near its base) plus the body radius plus the per-kind clearance for the visible mesh.
 */
export function contactRadius(collider, y) {
  const rootRadius = collider.rootRadius && y < (collider.rootTop ?? collider.bottom) + PHYS.height
    ? collider.rootRadius
    : 0
  const colliderRadius = Math.max(collider.collisionRadius ?? collider.r, rootRadius)
  const extraPadding = collider.collisionKind === 'tree-trunk'
    ? PHYS.treeCollisionPadding
    : collider.collisionKind === 'tree-root'
      ? PHYS.treeRootPadding
      : 0
  return colliderRadius + PHYS.radius + extraPadding
}

/**
 * First time t in [0, 1] at which the segment (ax, az) → (bx, bz) touches the circle of radius `reach`
 * around the collider's axis, or null. Only called when the start point is outside the circle.
 */
function sweepCircle(ax, az, bx, bz, collider, reach) {
  const sx = bx - ax
  const sz = bz - az
  const a = sx * sx + sz * sz
  if (a < 1e-12) return null
  const fx = ax - collider.x
  const fz = az - collider.z
  const b = 2 * (fx * sx + fz * sz)
  const c = fx * fx + fz * fz - reach * reach
  if (b >= 0) return null // moving away from (or tangent to) the axis
  const disc = b * b - 4 * a * c
  if (disc < 0) return null
  const t = (-b - Math.sqrt(disc)) / (2 * a)
  return t >= 0 && t <= 1 ? t : null
}

/** Overlap smaller than this (0.1 mm) counts as touching, not inside: one tolerance everywhere. */
const CONTACT_SLOP = 1e-4

/** How far beyond its own extent a collider can still matter to one step (push chains included). */
const BROAD_PHASE_MARGIN = 3

/** Whether a collider's footprint comes within `margin` of the segment (ax, az) → (bx, bz). */
function nearSegment(collider, ax, az, bx, bz, margin) {
  let cx = collider.x
  let cz = collider.z
  let extent
  if (isAabbCollider(collider)) {
    cx = (collider.minX + collider.maxX) / 2
    cz = (collider.minZ + collider.maxZ) / 2
    extent = Math.hypot(collider.maxX - collider.minX, collider.maxZ - collider.minZ) / 2
  } else {
    extent = Math.max(collider.r ?? 0, collider.collisionRadius ?? 0, collider.rootRadius ?? 0, collider.supportRadius ?? 0)
  }
  const sx = bx - ax
  const sz = bz - az
  const len2 = sx * sx + sz * sz
  const t = len2 > 1e-12 ? Math.max(0, Math.min(1, ((cx - ax) * sx + (cz - az) * sz) / len2)) : 0
  return Math.hypot(ax + sx * t - cx, az + sz * t - cz) <= extent + margin
}

function removeInwardVelocity(p, nx, nz, normalize = false) {
  if (normalize) {
    const length = Math.hypot(nx, nz)
    if (length < 1e-9) return
    nx /= length
    nz /= length
  }
  const inward = p.vel[0] * nx + p.vel[2] * nz
  if (inward < 0) {
    p.vel[0] -= inward * nx
    p.vel[2] -= inward * nz
  }
}

/**
 * The nearest point to (x, z) that is clear of every post's contact circle at height `y`, or null.
 * The answer is either the point pushed straight out of one circle, or a point where two circles'
 * edges cross (the mouth of the gap between two trunks), so only those candidates are checked.
 */
function nearestClearPoint(x, z, y, posts) {
  const clearance = 1e-5
  const circles = posts
    .map((c) => ({ x: c.x, z: c.z, r: contactRadius(c, y) + clearance }))
    .filter((c) => Math.hypot(x - c.x, z - c.z) < c.r + 4)
  const isClear = (px, pz) => circles.every((c) => Math.hypot(px - c.x, pz - c.z) >= c.r - 1e-9)
  let best = null
  let bestDistance = Infinity
  const consider = (px, pz) => {
    const distance = Math.hypot(px - x, pz - z)
    if (distance < bestDistance && isClear(px, pz)) {
      best = { x: px, z: pz }
      bestDistance = distance
    }
  }
  for (const c of circles) {
    const d = Math.hypot(x - c.x, z - c.z)
    const nx = d > 1e-8 ? (x - c.x) / d : 1
    const nz = d > 1e-8 ? (z - c.z) / d : 0
    consider(c.x + nx * c.r, c.z + nz * c.r)
  }
  for (let i = 0; i < circles.length; i += 1) {
    for (let j = i + 1; j < circles.length; j += 1) {
      const a = circles[i]
      const b = circles[j]
      const d = Math.hypot(b.x - a.x, b.z - a.z)
      if (d < 1e-8 || d >= a.r + b.r || d <= Math.abs(a.r - b.r)) continue
      const along = (a.r * a.r - b.r * b.r + d * d) / (2 * d)
      const half = Math.sqrt(Math.max(0, a.r * a.r - along * along))
      const ux = (b.x - a.x) / d
      const uz = (b.z - a.z) / d
      const mx = a.x + ux * along
      const mz = a.z + uz * along
      consider(mx - uz * half, mz + ux * half)
      consider(mx + uz * half, mz - ux * half)
    }
  }
  return best
}

function pushOutOfCylinder(x, z, collider, radius, fallbackX, fallbackZ) {
  const dx = x - collider.x
  const dz = z - collider.z
  const distance = Math.hypot(dx, dz)
  if (distance >= radius) return null

  const nx = distance > 1e-8 ? dx / distance : fallbackX
  const nz = distance > 1e-8 ? dz / distance : fallbackZ
  return {
    x: collider.x + nx * radius,
    z: collider.z + nz * radius,
    nx,
    nz,
  }
}

/**
 * The surface Bulbuli stands on (or lands on this step) at (x, z): the ground it already stood on
 * while that is still underfoot, or the highest surface a short downward probe from last frame's
 * height reaches. `y` is the unsnapped height this step would move to.
 */
function findGround(colliders, x, z, y, { rayOriginY, wasGrounded, groundId, vy, avatarHeightOffset }) {
  let ground = null
  let groundTop = -Infinity
  // A terrain apron (surfaceOnly) gives way to real ground at the same spot, but only to ground
  // Bulbuli could actually stand on from here: a branch perch overhead must not hide the mud
  // underfoot (that dropped Bulbuli into the water under every Sundarbans mangrove).
  const hasCoreSupport = colliders.some((c) => {
    if (!c.walkable || c.surfaceOnly || c.supportOnly) return false
    if (!containsSupportPoint(c, x, z)) return false
    return (c.heightAt ? c.heightAt(x, z) : c.top) <= rayOriginY
  })
  for (const c of colliders) {
    if (!c.walkable) continue
    if (c.surfaceOnly && hasCoreSupport) continue
    if (!containsSupportPoint(c, x, z)) continue
    const surfaceTop = c.heightAt ? c.heightAt(x, z) : c.top
    const perchOffset = c.surfaceType ? avatarHeightOffset : 0
    const standingTop = surfaceTop + perchOffset
    const standing = wasGrounded && groundId === (c.groundId ?? c.id) && vy <= 0
    const rayHit = rayOriginY >= surfaceTop && rayOriginY - surfaceTop <= PHYS.landingRayLength
    const landing = vy <= 0 && rayHit && y <= standingTop + 0.02
    const sameLevel = Math.abs(standingTop - groundTop) <= 0.15
    const replacesGround = !ground
      || standingTop > groundTop + 0.15
      || (sameLevel && ground.surfaceOnly && !c.surfaceOnly)
    if ((standing || landing) && replacesGround) {
      ground = c
      groundTop = standingTop
    }
  }
  return { ground, groundTop }
}

/**
 * Upright cylinders: { id, kind, x, z, r, top, bottom, walkable }.
 * Land is solid only from its grass top down through the dirt; the rock cone below is decoration.
 */
export function buildColliders(world) {
  const landDepth = (radius) => Math.max(0.35, radius * 0.06) + Math.max(0.6, radius * 0.14)
  const out = [
    { id: 'island', kind: 'land', x: 0, z: 0, r: ISLAND.radius * ISLAND_WALK, top: 0, bottom: -(ISLAND.grassDepth + ISLAND.dirtDepth), walkable: true },
    { id: 'altar', kind: 'prop', x: 0, z: 0, r: 0.72, top: 0.6, bottom: -1, walkable: true },
  ]
  for (const p of world.platforms) {
    const [x, y, z] = p.position
    out.push({ id: p.id, kind: 'land', x, z, r: p.radius * PLATFORM_WALK, top: y, bottom: y - landDepth(p.radius), walkable: true })
  }
  for (const p of world.pillars) {
    const [x, , z] = p.position
    out.push({ id: p.id, kind: 'prop', x, z, r: 0.5, top: 0.3 + p.height + (p.broken ? 0 : 0.26), bottom: -1, walkable: true })
  }
  for (const r of world.rubble) {
    out.push({ id: r.id, kind: 'prop', x: r.position[0], z: r.position[2], r: 0.6, top: 0.75, bottom: -1, walkable: true })
  }
  for (const t of world.trees) {
    // trunks block; leaves are left soft so they never snag a jump
    out.push({ id: t.id, kind: 'prop', x: t.position[0], z: t.position[2], r: 0.3, top: 50, bottom: -1, walkable: false })
  }
  for (const r of world.rocks) {
    const [sx, sy, sz] = r.scale
    out.push({ id: r.id, kind: 'prop', x: r.position[0], z: r.position[2], r: Math.max(sx, sz) * 0.8, top: sy * 1.3, bottom: -1, walkable: true })
  }
  return out
}

/** Where a run starts: on the island's edge, facing the first platform. */
export function spawnPoint(world) {
  const [start, first] = parkourRoute(world)
  return { position: [start[0], 0, start[2]], facing: Math.atan2(first[0] - start[0], first[2] - start[2]) }
}

/** A fresh player at the spawn point. Everything the controller changes lives in this object. */
export function createPlayer(spawn) {
  return {
    pos: [...spawn.position],
    vel: [0, 0, 0],
    facing: spawn.facing,
    grounded: true,
    groundId: 'island',
    coyote: 0,
    buffer: 0,
    stamina: 1,
    gliding: false,
    isPerched: false,
    checkpoint: [...spawn.position],
  }
}

/**
 * Advance the player by dt seconds.
 * @param input { moveX, moveZ, jumpHeld, jumpPressed, flightHeld }  flightHeld is opt-in per controller
 * @returns events { jumped, landed, glideStart, fell, impact } for sound and animation
 */
export function stepPlayer(p, input, dt, colliders) {
  const events = { jumped: false, landed: false, glideStart: false, fell: false, impact: 0 }
  const flightHeld = Boolean(input.flightHeld)
  const avatarHeightOffset = input.avatarHeightOffset ?? PHYS.avatarHeightOffset
  const wasGrounded = p.grounded && !flightHeld
  const wasGliding = p.gliding

  // --- timers that make jumping forgiving
  p.coyote = p.grounded ? PHYS.coyoteTime : Math.max(0, p.coyote - dt)
  p.buffer = input.jumpPressed ? PHYS.jumpBuffer : Math.max(0, p.buffer - dt)

  // --- jump
  if (!flightHeld && p.buffer > 0 && (p.grounded || p.coyote > 0)) {
    p.vel[1] = PHYS.jumpSpeed
    p.grounded = false
    p.groundId = null
    p.isPerched = false
    p.coyote = 0
    p.buffer = 0
    events.jumped = true
  }

  if (flightHeld) {
    p.grounded = false
    p.groundId = null
    p.isPerched = false
    p.coyote = 0
    p.gliding = false
  }

  // --- glide: hold Space while falling, if there is stamina left
  p.gliding = !flightHeld && !p.grounded && input.jumpHeld && p.vel[1] <= 0.5 && p.stamina > 0
  if (p.gliding && !wasGliding) events.glideStart = true
  if (p.gliding) p.stamina = Math.max(0, p.stamina - PHYS.staminaDrain * dt)
  else if (p.grounded) p.stamina = Math.min(1, p.stamina + PHYS.staminaRegen * dt)

  // --- horizontal speed: ease towards where the stick points
  let mx = input.moveX
  let mz = input.moveZ
  const amount = Math.min(1, Math.hypot(mx, mz))
  if (p.gliding && amount < 0.1) {
    // a glider keeps sailing forward even with no input
    mx = Math.sin(p.facing) * 0.6
    mz = Math.cos(p.facing) * 0.6
  }
  const topSpeed = p.gliding ? PHYS.glideSpeed : PHYS.runSpeed
  const accel = p.grounded ? PHYS.groundAccel : p.gliding ? PHYS.glideAccel : PHYS.airAccel
  const tx = mx * topSpeed
  const tz = mz * topSpeed
  const dx = tx - p.vel[0]
  const dz = tz - p.vel[2]
  const gap = Math.hypot(dx, dz)
  const step = accel * dt
  if (gap <= step) {
    p.vel[0] = tx
    p.vel[2] = tz
  } else {
    p.vel[0] += (dx / gap) * step
    p.vel[2] += (dz / gap) * step
  }

  // --- gravity
  if (flightHeld) {
    if (p.pos[1] < PHYS.maxFlightHeight) {
      p.vel[1] += PHYS.flightThrust * dt
    } else {
      p.vel[1] = Math.max(0, p.vel[1])
    }
  } else if (!p.grounded) {
    let g = PHYS.gravity
    if (p.gliding) g *= PHYS.glideGravityScale
    else if (p.vel[1] > 0 && !input.jumpHeld) g *= PHYS.lowJumpGravity
    p.vel[1] -= g * dt
    if (p.gliding) p.vel[1] = Math.max(p.vel[1], -PHYS.glideMaxFall)
  }

  // --- move, then resolve against the world
  const prevX = p.pos[0]
  const prevY = p.pos[1]
  const prevZ = p.pos[2]
  let x = prevX + p.vel[0] * dt
  const airY = prevY + p.vel[1] * dt
  let y = airY
  let z = prevZ + p.vel[2] * dt

  // stay on the ground we stood on while it is still under our feet
  const groundQuery = {
    rayOriginY: prevY + PHYS.landingRayOriginOffset,
    wasGrounded,
    groundId: p.groundId,
    vy: p.vel[1],
    avatarHeightOffset,
  }
  let { ground, groundTop } = findGround(colliders, x, z, airY, groundQuery)
  // Test the body where it will actually end the step: snapping onto the ground after the
  // push-out could otherwise drop it into a trunk's wider root flare.
  if (ground) y = groundTop

  // Only colliders near this step can touch it (the Amazon map has ~1,800): a cheap broad phase.
  const stepReach = Math.hypot(x - prevX, z - prevZ) + BROAD_PHASE_MARGIN
  const local = colliders.filter((c) => nearSegment(c, prevX, prevZ, x, z, stepReach))

  // Solid posts (trunks, roots) the body already overlaps at the start of the step: an embedded
  // spawn or teleport may only escape them, never be pinned back inside.
  const startInside = new Set()
  for (const c of local) {
    if (!isSolidPost(c) || c === ground || !bodyOverlapsBand(c, prevY)) continue
    if (Math.hypot(prevX - c.x, prevZ - c.z) < contactRadius(c, prevY) - CONTACT_SLOP) startInside.add(c)
  }
  // Flying straight up from below a trunk's base (out of the water, say) is not a head bump on a
  // roof: the trunk still blocks sideways. Only real ceilings stop an upward move.
  const bumpsHead = (c) => prevY + PHYS.height <= c.bottom + 0.05 && p.vel[1] > 0
    && !(flightHeld && isSolidPost(c) && c.surfaceType !== 'roof')

  // 1) Swept pass: stop at the first trunk the step's path touches (so a long frame can't carry
  //    Bulbuli through or deep into it), then slide the rest of the step along its surface.
  let sx = prevX
  let sz = prevZ
  for (let hits = 0; hits < 4; hits += 1) {
    let first = null
    let firstT = Infinity
    let firstReach = 0
    for (const c of local) {
      if (!isSolidPost(c) || c === ground || startInside.has(c) || !bodyOverlapsBand(c, y) || bumpsHead(c)) continue
      const reach = contactRadius(c, y)
      if (Math.hypot(sx - c.x, sz - c.z) < reach) continue
      const t = sweepCircle(sx, sz, x, z, c, reach)
      if (t !== null && t < firstT) {
        first = c
        firstT = t
        firstReach = reach
      }
    }
    if (!first) break
    const hitX = sx + (x - sx) * firstT
    const hitZ = sz + (z - sz) * firstT
    const nx = (hitX - first.x) / firstReach
    const nz = (hitZ - first.z) / firstReach
    // slide what is left of the step along the surface (drop the part that points inward)
    let restX = (x - sx) * (1 - firstT)
    let restZ = (z - sz) * (1 - firstT)
    const restIn = restX * nx + restZ * nz
    if (restIn < 0) {
      restX -= restIn * nx
      restZ -= restIn * nz
    }
    removeInwardVelocity(p, nx, nz)
    sx = first.x + nx * (firstReach + 1e-6)
    sz = first.z + nz * (firstReach + 1e-6)
    x = sx + restX
    z = sz + restZ
  }

  // 2) Discrete pass: resolve every overlap, repeatedly, so embedded starts and tight clusters of
  //    trunks (where escaping one pushes into the next) settle on a spot clear of all of them.
  for (let pass = 0; pass < 4; pass += 1) {
    let resolvedCollision = false
    for (const c of local) {
      if (c === ground || c.surfaceOnly || c.supportOnly) continue
      if (isAabbCollider(c)) {
        if (y >= c.top - 0.05 || y + PHYS.height <= c.bottom) continue
        if (prevY + PHYS.height <= c.bottom + 0.05 && p.vel[1] > 0) {
          y = c.bottom - PHYS.height
          p.vel[1] = 0
          resolvedCollision = true
          continue
        }
        const pushed = pushOutOfAabb(x, z, c, PHYS.boxPlayerRadius)
        if (!pushed) continue
        x = pushed.x
        z = pushed.z
        resolvedCollision = true
        removeInwardVelocity(p, pushed.nx, pushed.nz)
        continue
      }

      if (!bodyOverlapsBand(c, y)) continue
      const reach = contactRadius(c, y)
      if (Math.hypot(x - c.x, z - c.z) >= reach) continue

      if (prevY + PHYS.height <= c.bottom + 0.05 && p.vel[1] > 0) {
        if (flightHeld && c.surfaceType !== 'roof' && !isSolidPost(c)) continue // fly up through branches
        if (bumpsHead(c)) {
          y = c.bottom - PHYS.height
          p.vel[1] = 0
          resolvedCollision = true
          continue
        }
        // flying up beside a trunk from below its base: still pushed sideways, below
      }

      const pushed = pushOutOfCylinder(x, z, c, reach, Math.sin(p.facing), Math.cos(p.facing))
      if (!pushed) continue
      x = pushed.x
      z = pushed.z
      resolvedCollision = true
      removeInwardVelocity(p, pushed.nx, pushed.nz)
    }
    if (!resolvedCollision) break
  }

  // 3) Pinch between trunks: pushing out of one trunk at a time can ping-pong between two whose
  //    clearances overlap (typical when the root flares switch on during a descent). Solve for the
  //    nearest spot clear of all of them at once instead.
  const blockingPosts = (px, pz, py) => local.filter((c) => isSolidPost(c) && c !== ground && !startInside.has(c)
    && bodyOverlapsBand(c, py) && Math.hypot(px - c.x, pz - c.z) < contactRadius(c, py) - CONTACT_SLOP)
  if (blockingPosts(x, z, y).length) {
    const free = nearestClearPoint(x, z, y, local.filter((c) => isSolidPost(c) && c !== ground && !startInside.has(c) && bodyOverlapsBand(c, y)))
    if (free) {
      removeInwardVelocity(p, free.x - x, free.z - z, true)
      x = free.x
      z = free.z
    }
  }

  // 4) The ground was picked where the step aimed; if a trunk moved Bulbuli, look again where it
  //    really is (a slope's height differs, and the push may have left the platform entirely).
  const supportedBeforePush = Boolean(ground)
  const reprobe = () => {
    const found = findGround(colliders, x, z, airY, groundQuery)
    ground = found.ground
    groundTop = found.groundTop
    y = ground ? groundTop : Math.min(y, airY)
  }
  reprobe()

  // 5) Final guard: never end a step inside a trunk the step started outside of, and never let a
  //    trunk shove Bulbuli off the platform it is standing on (into the water). Stay where the step
  //    began instead; if even that spot is blocked at the new height, cancel the step entirely.
  const pushedOffSupport = wasGrounded && supportedBeforePush && !ground
  if (pushedOffSupport || blockingPosts(x, z, y).length) {
    x = prevX
    z = prevZ
    p.vel[0] = 0
    p.vel[2] = 0
    reprobe()
    if (blockingPosts(x, z, y).length) {
      // e.g. root flares switching on beneath a descent: hold this frame's height too
      y = prevY
      p.vel[1] = Math.min(0, p.vel[1])
      const held = wasGrounded ? findGround(colliders, x, z, prevY, groundQuery) : { ground: null, groundTop: prevY }
      ground = held.ground
      groundTop = held.groundTop
    }
  }

  if (ground) {
    if (!wasGrounded) {
      events.landed = true
      events.impact = Math.max(0, -p.vel[1])
    }
    y = groundTop
    p.vel[1] = 0
    p.grounded = true
    p.groundId = ground.groundId ?? ground.id
    p.isPerched = Boolean(ground.surfaceType || ground.kind === 'prop')
    p.gliding = false
    if (ground.kind === 'land') {
      // a safe spot to come back to: this platform's middle, or here on the big island
      const checkpointHeight = ground.heightAt
        ? ground.heightAt(ground.x, ground.z) + (ground.surfaceType ? avatarHeightOffset : 0)
        : groundTop
      p.checkpoint = ground.id === 'island'
        ? clampToRadius(x, z, ground.r * 0.7, ground.top)
        : [ground.x, checkpointHeight, ground.z]
    }
  } else {
    p.grounded = false
    p.groundId = null
    p.isPerched = false
  }

  if (flightHeld && y >= PHYS.maxFlightHeight) {
    y = PHYS.maxFlightHeight
    p.vel[1] = 0
  }

  p.pos[0] = x
  p.pos[1] = y
  p.pos[2] = z

  const flat = Math.hypot(p.vel[0], p.vel[2])
  if (flat > 0.4) p.facing = Math.atan2(p.vel[0], p.vel[2])

  if (y < PHYS.fallLimit) {
    p.pos = [...p.checkpoint]
    p.vel = [0, 0, 0]
    p.grounded = true
    p.gliding = false
    p.groundId = null // first frame back counts as a landing on whatever is below
    events.fell = true
  }

  return events
}

function clampToRadius(x, z, r, y) {
  const d = Math.hypot(x, z)
  if (d <= r) return [x, y, z]
  return [(x / d) * r, y, (z / d) * r]
}

/** Turn camera-relative stick input (right, forward) into a world direction, for a camera at `yaw`. */
export function cameraRelative(right, forward, yaw) {
  const s = Math.sin(yaw)
  const c = Math.cos(yaw)
  // camera looks along (-sin yaw, -cos yaw); its right is (cos yaw, -sin yaw)
  return { moveX: right * c - forward * s, moveZ: -right * s - forward * c }
}
