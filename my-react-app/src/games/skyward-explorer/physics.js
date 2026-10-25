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
  height: 1.05,
  fallLimit: -22,          // below this, Bulbuli is carried back to safety
}

// Walkable share of each chunk's radius: the rim is low-poly and jagged, so stay inside it.
const ISLAND_WALK = 0.93
const PLATFORM_WALK = 0.88

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
    checkpoint: [...spawn.position],
  }
}

/**
 * Advance the player by dt seconds.
 * @param input { moveX, moveZ, jumpHeld, jumpPressed }  move is a world-space direction, length ≤ 1
 * @returns events { jumped, landed, glideStart, fell, impact } for sound and animation
 */
export function stepPlayer(p, input, dt, colliders) {
  const events = { jumped: false, landed: false, glideStart: false, fell: false, impact: 0 }
  const wasGrounded = p.grounded
  const wasGliding = p.gliding

  // --- timers that make jumping forgiving
  p.coyote = p.grounded ? PHYS.coyoteTime : Math.max(0, p.coyote - dt)
  p.buffer = input.jumpPressed ? PHYS.jumpBuffer : Math.max(0, p.buffer - dt)

  // --- jump
  if (p.buffer > 0 && (p.grounded || p.coyote > 0)) {
    p.vel[1] = PHYS.jumpSpeed
    p.grounded = false
    p.groundId = null
    p.coyote = 0
    p.buffer = 0
    events.jumped = true
  }

  // --- glide: hold Space while falling, if there is stamina left
  p.gliding = !p.grounded && input.jumpHeld && p.vel[1] <= 0.5 && p.stamina > 0
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
  if (!p.grounded) {
    let g = PHYS.gravity
    if (p.gliding) g *= PHYS.glideGravityScale
    else if (p.vel[1] > 0 && !input.jumpHeld) g *= PHYS.lowJumpGravity
    p.vel[1] -= g * dt
    if (p.gliding) p.vel[1] = Math.max(p.vel[1], -PHYS.glideMaxFall)
  }

  // --- move, then resolve against the world
  const prevY = p.pos[1]
  let x = p.pos[0] + p.vel[0] * dt
  let y = p.pos[1] + p.vel[1] * dt
  let z = p.pos[2] + p.vel[2] * dt

  // stay on the ground we stood on while it is still under our feet
  let ground = null
  for (const c of colliders) {
    if (!c.walkable) continue
    const d = Math.hypot(x - c.x, z - c.z)
    if (d > c.r) continue
    const standing = wasGrounded && p.groundId === c.id && p.vel[1] <= 0
    const landing = p.vel[1] <= 0 && prevY >= c.top - 0.05 && y <= c.top
    if ((standing || landing) && (!ground || c.top > ground.top)) ground = c
  }

  // walls and ceilings
  for (const c of colliders) {
    if (c === ground) continue
    const d = Math.hypot(x - c.x, z - c.z)
    const reach = c.r + PHYS.radius
    if (d >= reach) continue
    const feetBelowTop = y < c.top - 0.05
    const headAboveBottom = y + PHYS.height > c.bottom
    if (!feetBelowTop || !headAboveBottom) continue
    if (prevY + PHYS.height <= c.bottom + 0.05 && p.vel[1] > 0) {
      // bumped a head on the underside
      y = c.bottom - PHYS.height
      p.vel[1] = 0
      continue
    }
    const nx = d > 1e-4 ? (x - c.x) / d : Math.sin(p.facing)
    const nz = d > 1e-4 ? (z - c.z) / d : Math.cos(p.facing)
    x = c.x + nx * reach
    z = c.z + nz * reach
    const inward = p.vel[0] * nx + p.vel[2] * nz
    if (inward < 0) {
      p.vel[0] -= inward * nx
      p.vel[2] -= inward * nz
    }
  }

  if (ground) {
    if (!wasGrounded) {
      events.landed = true
      events.impact = Math.max(0, -p.vel[1])
    }
    y = ground.top
    p.vel[1] = 0
    p.grounded = true
    p.groundId = ground.id
    p.gliding = false
    if (ground.kind === 'land') {
      // a safe spot to come back to: this platform's middle, or here on the big island
      p.checkpoint = ground.id === 'island'
        ? clampToRadius(x, z, ground.r * 0.7, ground.top)
        : [ground.x, ground.top, ground.z]
    }
  } else {
    p.grounded = false
    p.groundId = null
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
