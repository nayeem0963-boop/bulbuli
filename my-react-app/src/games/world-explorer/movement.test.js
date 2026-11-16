/**
 * Movement regression tests for World Explorer 3D, on the real maps.
 *
 * Each test drives Bulbuli the way the game does every frame: keys / the on-screen stick write the
 * shared input object (skyward-explorer/input.js), drive.js turns it into physics input relative to
 * the camera, stepPlayer moves Bulbuli against the map's real colliders, and the Sundarbans water
 * rule applies. Every frame is also checked for Bulbuli ending inside a solid trunk.
 *
 * World Explorer's controls (unchanged by these tests): arrows / WASD move relative to the camera,
 * Q / E turn the camera, and holding Space or forward flies (a tap of Space is a short flap).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BIOMES, collidersFor } from './biomes/index.js'
import { readExplorerControls, rescueFromWater } from './drive.js'
import { createInputState } from '../skyward-explorer/input.js'
import { contactRadius, createPlayer, PHYS, stepPlayer } from '../skyward-explorer/physics.js'

const DT = 1 / 60
const BIOME_IDS = ['sundarbans', 'amazon', 'sahara']

const isSolidPost = (c) => c.shape !== 'aabb' && !c.surfaceOnly && !c.supportOnly
  && (c.collisionKind === 'tree-trunk' || !c.walkable)
const inBand = (c, y) => y < c.top - 0.05 && y + PHYS.height > c.bottom
const depthInside = (c, x, y, z) => (inBand(c, y) ? contactRadius(c, y) - Math.hypot(x - c.x, z - c.z) : -Infinity)

/** Height of walkable ground at (x, z), or null over water / the void. */
function groundAt(colliders, x, z) {
  let top = null
  for (const c of colliders) {
    if (c.kind !== 'land' || !c.walkable || c.supportOnly) continue
    if (Math.hypot(x - c.x, z - c.z) > (c.supportRadius ?? c.r)) continue
    const h = c.heightAt ? c.heightAt(x, z) : c.top
    if (top === null || h > top) top = h
  }
  return top
}

/** A game session on a real map: the player, the shared input object and the camera yaw. */
function play(biomeId, { at, extra = [] } = {}) {
  const biome = BIOMES[biomeId]
  const colliders = [...collidersFor(biome), ...extra]
  const solids = colliders.filter(isSolidPost)
  const p = createPlayer(at ? { position: at, facing: biome.spawn.facing } : biome.spawn)
  const input = createInputState()
  const s = { biome, colliders, solids, p, input, yaw: biome.spawn.facing + Math.PI, lastJumps: null, falls: 0, embedded: [], peakY: p.pos[1] }

  s.frame = (dt = DT) => {
    const before = solids.filter((c) => depthInside(c, p.pos[0], p.pos[1], p.pos[2]) > 1e-3)
    const controls = readExplorerControls(input, { active: true, yaw: s.yaw, lastJumps: s.lastJumps, dt })
    s.yaw = controls.yaw
    s.lastJumps = controls.lastJumps
    const events = stepPlayer(p, controls.step, dt, colliders)
    rescueFromWater(p, biome, events)
    if (events.fell) s.falls += 1
    s.peakY = Math.max(s.peakY, p.pos[1])
    for (const c of solids) {
      if (before.includes(c)) continue // started inside (a teleport): may only escape
      const depth = depthInside(c, p.pos[0], p.pos[1], p.pos[2])
      if (depth > 1e-3) s.embedded.push(`${c.id} by ${depth.toFixed(3)} m`)
    }
    return events
  }
  s.run = (frames, dt) => { for (let i = 0; i < frames; i += 1) s.frame(dt) }
  /** Hold keyboard actions (forward/back/left/right/jump/turnLeft/turnRight) for some frames. */
  s.hold = (actions, frames) => {
    for (const a of actions) {
      if (a === 'jump' && !input.held.has('jump')) input.jumpPresses += 1
      input.held.add(a)
    }
    s.run(frames)
    for (const a of actions) input.held.delete(a)
  }
  /** Push the on-screen stick so Bulbuli heads along a world direction (dx, dz). */
  s.stick = (dx, dz) => {
    const len = Math.hypot(dx, dz) || 1
    const mx = dx / len
    const mz = dz / len
    const c = Math.cos(s.yaw)
    const sn = Math.sin(s.yaw)
    // inverse of cameraRelative (a reflection, so it is its own inverse)
    input.touchX = mx * c - mz * sn
    input.touchY = -mx * sn - mz * c
  }
  /**
   * Steer like a player: head for (dx, dz), and when a trunk is right in front, pick a side once and
   * walk round it on that side (along its surface) until it is no longer in the way.
   */
  s.avoiding = null
  s.steer = (dx, dz) => {
    const len = Math.hypot(dx, dz) || 1
    const mx = dx / len
    const mz = dz / len
    const [x, y, z] = p.pos
    let blocker = null
    // anything that blocks at body height: trunks, and ledges such as the giant tree's lowest step
    // ...and the cliff of a raised piece of ground (the Sahara's steps), which is a wall from below
    const obstacles = colliders.filter((c) => c.shape !== 'aabb' && !c.surfaceOnly && !c.supportOnly
      && (isSolidPost(c) || c.bottom > y + 0.05 || (c.kind === 'land' && c.top > y + 0.3)))
    for (const c of obstacles) {
      if (!inBand(c, y)) continue
      const ox = c.x - x
      const oz = c.z - z
      if (ox * mx + oz * mz <= 0) continue
      if (Math.hypot(ox, oz) - contactRadius(c, y) > 0.9) continue
      if (!blocker || c === s.avoiding?.c) blocker = c // stay with the obstacle already being rounded
    }
    if (!blocker) { s.avoiding = null; s.stick(mx, mz); return }
    if (s.avoiding?.c !== blocker) {
      const ox = blocker.x - x
      const oz = blocker.z - z
      s.avoiding = { c: blocker, side: ox * mz - oz * mx > 0 ? 1 : -1 } // pass on the side away from it
    }
    const ox = blocker.x - x
    const oz = blocker.z - z
    const d = Math.hypot(ox, oz) || 1
    const side = s.avoiding.side
    // walk along the trunk's surface on the chosen side, still leaning the way we want to go
    s.stick(side * oz / d * 1.5 + mx * 0.5, -side * ox / d * 1.5 + mz * 0.5)
  }
  s.release = () => { input.touchX = 0; input.touchY = 0; input.held.clear() }
  /** Camera-relative axes in the world: forward is where the camera looks. */
  s.axes = () => ({ fx: -Math.sin(s.yaw), fz: -Math.cos(s.yaw), rx: Math.cos(s.yaw), rz: -Math.sin(s.yaw) })
  /** Turn the camera so that the "back" key walks along the world direction (dx, dz). */
  s.faceBackAlong = (dx, dz) => { s.yaw = Math.atan2(dx, dz) }
  return s
}

const pos = (s) => ({ x: s.p.pos[0], y: s.p.pos[1], z: s.p.pos[2] })
const along = (a, b, dx, dz) => (b.x - a.x) * dx + (b.z - a.z) * dz

/** Whether a straight walk from (x, z) along (dx, dz) for `length` stays on ground, clear of trunks. */
function openPath(s, x, z, dx, dz, length, ignore = null) {
  const y = groundAt(s.colliders, x, z)
  if (y === null) return false
  for (let t = 0; t <= length; t += 0.25) {
    const px = x + dx * t
    const pz = z + dz * t
    const h = groundAt(s.colliders, px, pz)
    if (h === null || Math.abs(h - y) > 0.05) return false
    if (s.solids.some((c) => c !== ignore && inBand(c, y) && Math.hypot(px - c.x, pz - c.z) < contactRadius(c, y) + 0.3)) return false
  }
  return true
}

const DIRECTIONS = Array.from({ length: 16 }, (_, k) => [Math.cos((k / 16) * Math.PI * 2), Math.sin((k / 16) * Math.PI * 2)])

/** The nearest open spot to (x, z) with an open walk of `length` m in some direction. */
function openRun(s, x, z, length) {
  for (let ring = 0; ring < 40; ring += 1) {
    for (let k = 0; k < 12; k += 1) {
      const a = (k / 12) * Math.PI * 2
      const px = x + Math.cos(a) * ring * 0.5
      const pz = z + Math.sin(a) * ring * 0.5
      for (const [dx, dz] of DIRECTIONS) {
        if (openPath(s, px, pz, dx, dz, length)) return { x: px, y: groundAt(s.colliders, px, pz), z: pz, dx, dz }
      }
    }
  }
  return null
}

/**
 * A trunk standing on walkable ground that a walker can reach: approached along (dx, dz) from 2.5 m
 * away, with ground and no other trunk on the approach or for 2 m past it.
 */
function reachableTrunk(s) {
  for (const c of s.solids) {
    const y = groundAt(s.colliders, c.x, c.z)
    if (y === null || !inBand(c, y)) continue
    for (const [dx, dz] of DIRECTIONS) {
      const sx = c.x - dx * 2.6
      const sz = c.z - dz * 2.6
      if (!openPath(s, sx, sz, dx, dz, 1.2, c)) continue
      // room to pass on one side and carry on beyond the trunk
      const px = -dz
      const pz = dx
      const reach = contactRadius(c, y)
      if (!openPath(s, c.x + px * (reach + 0.4), c.z + pz * (reach + 0.4), dx, dz, 2, c)) continue
      if (!openPath(s, sx, sz, -dx, -dz, 2, c)) continue
      return { c, y, dx, dz, px, pz }
    }
  }
  return null
}

for (const biomeId of BIOME_IDS) {
  test(`${biomeId}: walking from the spawn point moves Bulbuli forward, back, left, right and diagonally`, () => {
    const cases = [
      { keys: ['forward'], want: (ax) => [ax.fx, ax.fz] },
      { keys: ['back'], want: (ax) => [-ax.fx, -ax.fz] },
      { keys: ['left'], want: (ax) => [-ax.rx, -ax.rz] },
      { keys: ['right'], want: (ax) => [ax.rx, ax.rz] },
      { keys: ['back', 'right'], want: (ax) => [(-ax.fx + ax.rx) / Math.SQRT2, (-ax.fz + ax.rz) / Math.SQRT2] },
      { keys: ['back', 'left'], want: (ax) => [(-ax.fx - ax.rx) / Math.SQRT2, (-ax.fz - ax.rz) / Math.SQRT2] },
    ]
    for (const { keys, want } of cases) {
      const s = play(biomeId)
      s.run(10) // settle on the ground as the game does after loading
      const a = pos(s)
      const [dx, dz] = want(s.axes())
      s.hold(keys, 60) // one second of holding the keys
      const moved = along(a, pos(s), dx, dz)
      assert.ok(moved > 2.5, `${keys.join('+')}: moved ${moved.toFixed(2)} m the right way in 1 s`)
      assert.deepEqual(s.embedded, [], `${keys.join('+')}: ended inside a trunk`)
      assert.equal(s.falls, 0)
    }
  })

  test(`${biomeId}: holding a key keeps Bulbuli moving every frame along an open path, and turning the camera changes direction`, () => {
    const s0 = play(biomeId)
    const run = openRun(s0, s0.biome.spawn.position[0], s0.biome.spawn.position[2], 7)
    assert.ok(run, 'found an open path')
    const s = play(biomeId, { at: [run.x, run.y, run.z] })
    s.faceBackAlong(run.dx, run.dz)
    s.run(10)
    s.input.held.add('back')
    let still = 0
    let prev = pos(s)
    for (let i = 0; i < 70; i += 1) {
      s.frame()
      const now = pos(s)
      if (Math.hypot(now.x - prev.x, now.z - prev.z) < 1e-4) still += 1
      prev = now
    }
    s.input.held.delete('back')
    assert.ok(still === 0, `Bulbuli stood still on ${still} of 70 frames while the key was held on an open path`)
    const before = s.axes()
    s.hold(['turnRight'], 30)
    const after = s.axes()
    assert.ok(Math.abs(after.fx - before.fx) + Math.abs(after.fz - before.fz) > 0.5, 'the camera turned')
    const a = pos(s)
    s.hold(['left'], 30)
    assert.ok(along(a, pos(s), -after.rx, -after.rz) > 1, '"left" follows the turned camera')
    assert.deepEqual(s.embedded, [])
  })

  test(`${biomeId}: a tap of Space flaps Bulbuli up while it keeps moving, then it lands`, () => {
    const s = play(biomeId)
    s.run(10)
    const ax = s.axes()
    s.input.held.add('right')
    s.run(15)
    const a = pos(s)
    s.input.jumpPresses += 1
    s.input.held.add('jump')
    let airborneFrames = 0
    for (let i = 0; i < 12; i += 1) { s.frame(); if (!s.p.grounded) airborneFrames += 1 }
    s.input.held.delete('jump')
    for (let i = 0; i < 120 && !s.p.grounded; i += 1) { s.frame(); airborneFrames += 1 }
    s.input.held.delete('right')
    assert.ok(airborneFrames > 15, `airborne for ${airborneFrames} frames`)
    assert.ok(s.peakY - a.y > 0.4, `rose ${(s.peakY - a.y).toFixed(2)} m`)
    assert.ok(along(a, pos(s), ax.rx, ax.rz) > 2, 'kept moving sideways through the air')
    assert.equal(s.p.grounded, true, 'landed again')
    assert.deepEqual(s.embedded, [])
    assert.equal(s.falls, 0)
  })

  test(`${biomeId}: holding Space flies Bulbuli up and it can steer while flying`, () => {
    const s = play(biomeId)
    s.run(10)
    const a = pos(s)
    const ax = s.axes()
    s.input.held.add('jump')
    s.input.jumpPresses += 1
    s.input.held.add('right')
    s.run(60)
    s.release()
    assert.ok(s.peakY - a.y > 3, `flew up ${(s.peakY - a.y).toFixed(2)} m`)
    assert.ok(along(a, pos(s), ax.rx, ax.rz) > 2, 'steered while flying')
    assert.deepEqual(s.embedded, [])
  })

  test(`${biomeId}: walking into a tree stops at it, and steering round it gets past without sticking`, () => {
    const found = reachableTrunk(play(biomeId))
    assert.ok(found, `a trunk a walker can reach in ${biomeId}`)
    const { c, y, dx, dz, px, pz } = found
    const s = play(biomeId, { at: [c.x - dx * 2.6, y, c.z - dz * 2.6] })
    s.run(5)
    s.stick(dx, dz)
    s.run(60) // straight at the trunk: stops at its surface
    assert.ok(Math.hypot(s.p.pos[0] - c.x, s.p.pos[2] - c.z) >= contactRadius(c, s.p.pos[1]) - 1e-3, 'stopped outside the trunk')
    s.stick(dx + px * 0.7, dz + pz * 0.7) // lean round the free side, still pressing on
    const beyond = () => (s.p.pos[0] - c.x) * dx + (s.p.pos[2] - c.z) * dz
    for (let i = 0; i < 90 && beyond() <= 0.5; i += 1) s.frame()
    s.release()
    const past = beyond()
    assert.ok(past > 0.5, `got past the trunk (${past.toFixed(2)} m beyond it)`)
    assert.deepEqual(s.embedded, [])
    assert.equal(s.falls, 0)
  })

  test(`${biomeId}: after being pinned against a tree for two seconds, Bulbuli walks straight back out and on`, () => {
    const found = reachableTrunk(play(biomeId))
    assert.ok(found)
    const { c, y, dx, dz } = found
    const s = play(biomeId, { at: [c.x - dx * 2.6, y, c.z - dz * 2.6] })
    s.run(5)
    s.stick(dx, dz)
    s.run(120)
    const pinned = pos(s)
    s.stick(-dx, -dz)
    s.run(40)
    s.release()
    const back = along(pos(s), pinned, dx, dz)
    assert.ok(back > 1.5, `backed away ${back.toFixed(2)} m`)
    assert.deepEqual(s.embedded, [])
    assert.equal(s.falls, 0)
  })

  test(`${biomeId}: a teleport into the middle of a tree escapes it at once and Bulbuli can walk away`, () => {
    const found = reachableTrunk(play(biomeId))
    assert.ok(found)
    const { c, y, dx, dz } = found
    const s = play(biomeId)
    // what WorldExplorerGame's teleport does, but aimed inside the trunk
    s.p.pos = [c.x - dx * 0.05, y, c.z - dz * 0.05]
    s.p.vel = [0, 0, 0]
    s.p.grounded = false
    s.p.groundId = null
    s.p.checkpoint = [...s.p.pos]
    s.run(2)
    assert.ok(depthInside(c, ...s.p.pos) <= 1e-3, 'pushed clear of the trunk')
    const a = pos(s)
    s.stick(-dx, -dz) // back along the open approach
    s.run(40)
    s.release()
    assert.ok(along(a, pos(s), -dx, -dz) > 1.5, 'walks away afterwards')
  })

  test(`${biomeId}: travelling to every station lands Bulbuli somewhere it can walk away from`, () => {
    const discTop = (id) => BIOMES[biomeId].discs.find((d) => d.id === id)?.top ?? 0
    for (const station of BIOMES[biomeId].stations) {
      // exactly what "Travel here" does (WorldExplorerGame: teleportRef)
      const s = play(biomeId)
      s.run(5)
      s.p.pos = [station.x - 1.2, discTop(station.disc), station.z - 1.2]
      s.p.vel = [0, 0, 0]
      s.p.grounded = false
      s.p.groundId = null
      s.p.checkpoint = [...s.p.pos]
      s.run(10)
      let free = 0
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = pos(s)
        s.stick(dx, dz)
        s.run(30)
        s.release()
        if (Math.hypot(s.p.pos[0] - a.x, s.p.pos[2] - a.z) > 0.8) free += 1
        s.run(5)
      }
      assert.ok(free >= 3, `station ${station.n}: could walk away in only ${free} of 4 directions`)
      assert.deepEqual(s.embedded, [], `station ${station.n}`)
    }
  })

  test(`${biomeId}: a narrow but passable gap between two trees lets Bulbuli through; a too-narrow one stops it outside`, () => {
    const s0 = play(biomeId)
    const run = openRun(s0, s0.biome.spawn.position[0], s0.biome.spawn.position[2], 5)
    assert.ok(run, 'found open ground')
    const { x, y, z, dx, dz } = run
    const px = -dz
    const pz = dx
    const tree = (id, side) => ({
      id, kind: 'prop', collisionKind: 'tree-trunk', x: x + dx * 2.5 + px * side, z: z + dz * 2.5 + pz * side,
      r: 0.25, collisionRadius: 0.25, top: y + 6, bottom: y - 0.1, walkable: false,
    })
    const clearance = 0.25 + PHYS.radius + PHYS.treeCollisionPadding // 0.8 m from each trunk's axis
    for (const [gap, passable] of [[2 * clearance + 0.15, true], [2 * clearance - 0.2, false]]) {
      const s = play(biomeId, { at: [x, y, z], extra: [tree('gap-a', -gap / 2), tree('gap-b', gap / 2)] })
      s.run(5)
      s.stick(dx, dz)
      s.run(90)
      s.release()
      const progress = along({ x, z }, pos(s), dx, dz)
      if (passable) assert.ok(progress > 3.2, `gap ${gap.toFixed(2)} m: got through (${progress.toFixed(2)} m)`)
      else assert.ok(progress < 2.5, `gap ${gap.toFixed(2)} m: should not squeeze through (${progress.toFixed(2)} m)`)
      assert.deepEqual(s.embedded, [], `gap ${gap.toFixed(2)}`)
    }
  })

  test(`${biomeId}: running round the edge of the home ground keeps Bulbuli on it; walking off the edge still works`, () => {
    const s0 = play(biomeId)
    const [sx, , sz] = s0.biome.spawn.position
    const home = s0.biome.discs.filter((d) => Math.hypot(sx - d.x, sz - d.z) < d.r).sort((a, b) => a.r - b.r)[0]
    const rim = home.r * 0.88
    // start on the rim at the first spot that is clear of trunks
    let start = null
    for (let k = 0; k < 36 && !start; k += 1) {
      const a = (k / 36) * Math.PI * 2
      const px = home.x + Math.cos(a) * rim
      const pz = home.z + Math.sin(a) * rim
      if (!s0.solids.some((c) => inBand(c, home.top) && Math.hypot(px - c.x, pz - c.z) < contactRadius(c, home.top) + 0.5)) start = [px, pz, a]
    }
    assert.ok(start)
    const s = play(biomeId, { at: [start[0], home.top, start[1]] })
    s.run(5)
    let groundedFrames = 0
    let travelled = 0
    let prevAngle = start[2]
    let lastProgress = pos(s)
    for (let i = 0; i < 300; i += 1) {
      // like a player: if walking round an obstacle gets nowhere (a corner), go round the other way
      if (i % 20 === 19) {
        const now = pos(s)
        if (Math.hypot(now.x - lastProgress.x, now.z - lastProgress.z) < 0.2 && s.avoiding) s.avoiding.side *= -1
        lastProgress = now
      }
      // tangent to the rim, pulled back in when drifting out, veering round trunks like a player
      const px = s.p.pos[0] - home.x
      const pz = s.p.pos[2] - home.z
      const d = Math.hypot(px, pz)
      const pull = d > rim ? 0.4 : 0
      s.steer(-pz / d - (px / d) * pull, px / d - (pz / d) * pull)
      s.frame()
      if (s.p.grounded) groundedFrames += 1
      const angle = Math.atan2(s.p.pos[2] - home.z, s.p.pos[0] - home.x)
      let delta = angle - prevAngle
      if (delta > Math.PI) delta -= 2 * Math.PI
      if (delta < -Math.PI) delta += 2 * Math.PI
      travelled += delta
      prevAngle = angle
    }
    s.release()
    assert.equal(s.falls, 0, 'never fell off or into the water')
    assert.ok(groundedFrames > 285, `on the ground ${groundedFrames} of 300 frames`)
    assert.ok(travelled * rim > 12, `went ${(travelled * rim).toFixed(1)} m round the rim`)
    assert.deepEqual(s.embedded, [])
    // the edge is not a wall: steering outward goes over it
    const [ex, ez] = [Math.cos(start[2]), Math.sin(start[2])]
    const out = play(biomeId, { at: [home.x + ex * (home.r - 0.6), home.top, home.z + ez * (home.r - 0.6)] })
    out.run(5)
    out.stick(ex, ez)
    out.run(60)
    const beyond = Math.hypot(out.p.pos[0] - home.x, out.p.pos[2] - home.z) > home.r
    assert.ok(beyond || out.falls > 0, 'stepped off the edge when steering outward')
  })
}

test('the controls reject the input ref itself with a clear message (the lint-cleanup regression)', () => {
  const inputRef = { current: createInputState() }
  assert.throws(
    () => readExplorerControls(inputRef, { active: true, yaw: 0, lastJumps: null, dt: DT }),
    /inputRef\.current/,
  )
  const ok = readExplorerControls(inputRef.current, { active: true, yaw: 0, lastJumps: null, dt: DT })
  assert.equal(ok.step.moveX, 0)
})

test('the first frame never replays a jump pressed before the map opened', () => {
  const input = createInputState()
  input.jumpPresses = 3
  const first = readExplorerControls(input, { active: true, yaw: 0, lastJumps: null, dt: DT })
  assert.equal(first.step.jumpPressed, false)
  input.jumpPresses = 4
  const next = readExplorerControls(input, { active: true, yaw: 0, lastJumps: first.lastJumps, dt: DT })
  assert.equal(next.step.jumpPressed, true)
})
