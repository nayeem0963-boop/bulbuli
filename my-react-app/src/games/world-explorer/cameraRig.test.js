import test from 'node:test'
import assert from 'node:assert/strict'
import { BIOMES } from './biomes/index.js'
import { collidersFor } from './biomes/index.js'
import { readExplorerControls, rescueFromWater, TURN_SPEED } from './drive.js'
import { createInputState } from '../skyward-explorer/input.js'
import { createPlayer, stepPlayer } from '../skyward-explorer/physics.js'
import {
  AUTO_TURN_SPEED, BLOCKED_TURN_SPEED, DEFAULT_CAMERA, DEFAULT_FOV, MAX_PITCH, MAX_SWING_SPEED,
  advanceCamera, cameraPose, cameraRigFor, clearYaw, constrainCamera, createCameraState, steerYaw, viewBlocked,
} from './cameraRig.js'

const deg = (radians) => (radians * 180) / Math.PI

/** Where a world point lands in the frame: 0 = top edge, 1 = bottom edge (unobstructed camera). */
function frameY(rig, point) {
  const pitch = Math.atan2(rig.height - rig.lookHeight, rig.distance) // camera looks this far below level
  const below = Math.atan2(rig.height - point.up, rig.distance + point.ahead) // point's angle below level
  return 0.5 + Math.tan(below - pitch) / Math.tan(((rig.fov ?? DEFAULT_FOV) / 2) * (Math.PI / 180)) / 2
}

const SAMPLES = [
  [[0, 0, -2], 0], [[12.5, 0.4, -3.1], 1.3], [[-14.5, 2.2, -5], -2.4], [[3.3, 7.5, 18.2], 4.9], [[-20, 0, -8], Math.PI],
]

test('the default camera is the framing every destination had before per-destination settings', () => {
  assert.deepEqual(DEFAULT_CAMERA, { distance: 3.2, height: 1.8, lookHeight: 0.3 })
  assert.ok(Object.isFrozen(DEFAULT_CAMERA))
})

for (const id of ['amazon', 'sahara']) {
  test(`${id}: keeps exactly its existing camera (no own settings, no avoid volumes, identical poses)`, () => {
    const biome = BIOMES[id]
    assert.equal(biome.camera, undefined, `${id} must not define its own camera`)
    const rig = cameraRigFor(biome)
    assert.deepEqual(rig, { distance: 3.2, height: 1.8, lookHeight: 0.3, fov: null, avoid: [] })
    const positions = [...SAMPLES, [[...biome.spawn.position], biome.spawn.facing + Math.PI], ...biome.stations.map((s) => [[s.x, 0, s.z], 0.7])]
    for (const [pos, yaw] of positions) {
      const pose = cameraPose(pos, yaw, rig)
      // the exact expressions ExplorerController used before cameraRig.js existed
      assert.deepEqual(pose.position, [pos[0] + Math.sin(yaw) * 3.2, pos[1] + 1.8, pos[2] + Math.cos(yaw) * 3.2])
      assert.deepEqual(pose.lookAt, [pos[0], pos[1] + 0.3, pos[2]])
      // nothing to avoid, so the view is never blocked and the camera never turns on its own
      assert.equal(viewBlocked(pos, yaw, rig), false)
      assert.equal(clearYaw(pos, yaw, rig), null)
      for (const manual of [0, 1, -1]) {
        assert.equal(steerYaw(createCameraState(), pos, yaw, rig, 1 / 60, { manual }), yaw)
        assert.equal(steerYaw(createCameraState(), pos, yaw, rig, 1 / 60, { manual, snap: true }), yaw)
      }
      assert.deepEqual(constrainCamera(pose.position, pos, rig), pose.position)
    }
    assert.equal(biome.labels, undefined, `${id} keeps its fixed station labels`)
  })
}

test('sundarbans: the camera raises the horizon and keeps Bulbuli above the controls bar', () => {
  const rig = cameraRigFor(BIOMES.sundarbans)
  const pitch = deg(Math.atan2(rig.height - rig.lookHeight, rig.distance))
  const before = deg(Math.atan2(DEFAULT_CAMERA.height - DEFAULT_CAMERA.lookHeight, DEFAULT_CAMERA.distance))
  assert.ok(before > 24, 'the default looks steeply down (horizon on the top edge of the frame)')
  assert.ok(pitch >= 9 && pitch <= 17, `sundarbans looks ${pitch.toFixed(1)}° below level`)
  assert.ok(rig.fov >= 50 && rig.fov <= 62, 'a slightly wider view, without fisheye distortion')
  // horizon: a point at camera height, far away
  const horizon = frameY(rig, { up: rig.height, ahead: 1e6 })
  assert.ok(horizon >= 0.18 && horizon <= 0.32, `horizon at ${(horizon * 100).toFixed(0)}% from the top`)
  assert.ok(frameY(DEFAULT_CAMERA, { up: DEFAULT_CAMERA.height, ahead: 1e6 }) < 0.02, 'default horizon is at the very top')
  // Bulbuli (about 0.15 m above its position): the controls bar starts about 80% down the frame
  const bird = frameY(rig, { up: 0.15, ahead: 0 })
  assert.ok(bird >= 0.55 && bird <= 0.72, `Bulbuli at ${(bird * 100).toFixed(0)}% from the top`)
  // a mature crown (6 m) on the far bank 30 m ahead is fully in frame
  assert.ok(frameY(rig, { up: 6, ahead: 30 }) > 0.05)
})

test('sundarbans: station labels are in frame when Bulbuli stands at a station ring', () => {
  const rig = cameraRigFor(BIOMES.sundarbans)
  // StationMarker: the label sprite is centred 2.8 m above the ring. Bulbuli stands beside the
  // pole, faces the station from the ring's edge (1.2 m), from a few steps back, and on the approach.
  for (const ahead of [-1.2, 0, 1.2, 3, 6, 12]) {
    const label = frameY(rig, { up: 2.8, ahead })
    assert.ok(label > 0.04 && label < 0.5, `label ${ahead} m ahead lands at ${(label * 100).toFixed(0)}%`)
  }
  for (const ahead of [1.2, 3]) assert.ok(frameY(DEFAULT_CAMERA, { up: 2.8, ahead }) < 0, 'with the default camera the label was above the frame')
})

/* ------------------------------------------------------------------ the village: obstruction handling */

const FPS = 60
const village = () => BIOMES.sundarbans.props.find((prop) => prop.type === 'village')
/** The real roofs (corners 1.3 m from the centre, tip 1.95 m up), for "is the camera inside a house". */
const inRoof = (rig, c) => rig.avoid.some((h) => c[1] < 1.95 && Math.hypot(c[0] - h.x, c[2] - h.z) < 1.3)

/**
 * Plays the Sundarbans exactly as ExplorerController does, frame by frame at 60 fps: the real
 * input → drive.js → physics → colliders, then one advanceCamera step. `keys` are held throughout.
 */
function playVillage(start, yaw0, keys, seconds) {
  const biome = BIOMES.sundarbans
  const rig = cameraRigFor(biome)
  const colliders = collidersFor(biome)
  const p = createPlayer({ position: start, facing: biome.spawn.facing })
  const input = createInputState()
  for (const key of keys) input.held.add(key)
  const state = createCameraState()
  const dt = 1 / FPS
  let yaw = yaw0
  let lastJumps = null
  let lastTurn = 0
  let previous = null
  const m = { reversals: 0, against: 0, blocked: 0, pitch: 0, roof: 0, speed: 0, closest: Infinity, autoTurn: 0, relative: [0, 0], frames: seconds * FPS }
  for (let frame = 0; frame < m.frames; frame += 1) {
    const before = yaw
    const controls = readExplorerControls(input, { active: true, yaw, lastJumps, dt })
    const manual = Math.sign(controls.yaw - yaw)
    yaw = controls.yaw
    lastJumps = controls.lastJumps
    const from = [...p.pos]
    const events = stepPlayer(p, controls.step, dt, colliders)
    rescueFromWater(p, biome, events)
    const view = advanceCamera(state, p.pos, yaw, rig, dt, { manual, current: cameraPose(p.pos, yaw, rig).position })
    const auto = view.yaw - yaw
    if (manual && Math.sign(auto) === -manual) m.against += 1
    m.autoTurn += Math.abs(auto)
    yaw = view.yaw
    const turn = yaw - before
    if (Math.abs(turn) > 1e-9) {
      if (lastTurn && Math.sign(turn) !== Math.sign(lastTurn)) m.reversals += 1
      lastTurn = turn
    }
    if (viewBlocked(p.pos, yaw, rig)) m.blocked += 1
    const run = Math.hypot(view.position[0] - p.pos[0], view.position[2] - p.pos[2])
    m.closest = Math.min(m.closest, run)
    m.pitch = Math.max(m.pitch, deg(Math.atan2(view.position[1] - view.lookAt[1], run)))
    if (inRoof(rig, view.position)) m.roof += 1
    if (previous && !events.fell) m.speed = Math.max(m.speed, Math.hypot(view.position[0] - previous[0], view.position[1] - previous[1], view.position[2] - previous[2]) / dt)
    previous = view.position
    // camera-relative movement: where Bulbuli went, measured against the camera's own axes
    const step = [p.pos[0] - from[0], p.pos[2] - from[2]]
    const length = Math.hypot(step[0], step[1])
    if (length > 1e-4 && !events.fell) {
      m.relative[0] += 1
      const forward = (step[0] * -Math.sin(yaw) + step[1] * -Math.cos(yaw)) / length
      const right = (step[0] * Math.cos(yaw) + step[1] * -Math.sin(yaw)) / length
      const want = keys.includes('forward') ? forward : keys.includes('back') ? -forward : keys.includes('right') ? right : keys.includes('left') ? -right : 1
      if (want > 0.6) m.relative[1] += 1
    }
  }
  return { ...m, net: deg(yaw - yaw0), yaw, state, pos: [...p.pos], rig, view: previous }
}

test('sundarbans: the camera volumes are the three village houses', () => {
  const rig = cameraRigFor(BIOMES.sundarbans)
  const v = village()
  assert.equal(rig.avoid.length, 3)
  rig.avoid.forEach((house, i) => {
    assert.equal(house.x, v.x + i * 2.4)
    assert.equal(house.z, v.z + (i % 2))
    assert.ok(house.r >= 1.3 && house.r <= 1.5 && house.top >= 1.95 && house.top <= 2.2, 'the house and its roof, without a wide margin')
  })
})

test('sundarbans: holding Q or E turns the camera continuously past every village house, never back', () => {
  const biome = BIOMES.sundarbans
  const rig = cameraRigFor(biome)
  // the benchmark: an unobstructed station turns TURN_SPEED for 8 s (about 825°)
  const s1 = biome.stations.find((s) => s.n === 1)
  const open = playVillage([s1.x - 1.2, 0.3, s1.z - 1.2], 0, ['turnRight'], 8)
  const benchmark = deg(TURN_SPEED * 8)
  assert.ok(Math.abs(open.net - benchmark) < 0.5 && Math.abs(benchmark - 825) < 1, `unobstructed turn ${open.net.toFixed(1)}°`)
  assert.equal(open.autoTurn, 0)

  const s5 = biome.stations.find((s) => s.n === 5)
  const spots = [['the Travel-here spot at station 5', [s5.x - 1.2, 0.3, s5.z - 1.2]]]
  rig.avoid.forEach((house, i) => {
    for (const [side, dx, dz] of [['north', 0, 2.3], ['south', 0, -2.3], ['east', 2.3, 0], ['west', -2.3, 0]]) {
      const at = [house.x + dx, 0.3, house.z + dz]
      if (rig.avoid.some((c) => Math.hypot(at[0] - c.x, at[2] - c.z) < 1.5)) continue // inside the next house
      spots.push([`${side} of house ${i + 1}`, at])
    }
  })
  assert.ok(spots.length >= 9, 'every house is covered from several sides')
  for (const [name, at] of spots) {
    for (const key of ['turnRight', 'turnLeft']) {
      const r = playVillage(at, 0, [key], 8)
      const label = `${key === 'turnRight' ? 'E' : 'Q'} ${name}`
      assert.equal(r.reversals, 0, `${label}: the camera direction reversed ${r.reversals} times`)
      assert.equal(r.against, 0, `${label}: the automatic turn worked against the player`)
      assert.ok(Math.abs(r.net) >= benchmark - 1, `${label}: turned only ${r.net.toFixed(0)}° in 8 s (unobstructed: ${benchmark.toFixed(0)}°)`)
      assert.ok(Math.abs(r.net) <= benchmark * 1.6, `${label}: turned ${r.net.toFixed(0)}°, far faster than the player asked`)
      assert.equal(Math.sign(r.net), key === 'turnRight' ? 1 : -1, `${label}: Q and E keep their meaning`)
      assert.ok(r.pitch <= MAX_PITCH + 1e-6, `${label}: looked ${r.pitch.toFixed(0)}° down`)
      assert.equal(r.roof, 0, `${label}: camera inside a roof`)
      assert.ok(r.closest >= 2, `${label}: camera came within ${r.closest.toFixed(1)} m`)
      assert.ok(r.speed <= MAX_SWING_SPEED + 1.5, `${label}: camera moved at ${r.speed.toFixed(0)} m/s`)
    }
  }
})

test('sundarbans: beside a house the camera swings clear by itself, once, without a steep or close view', () => {
  const biome = BIOMES.sundarbans
  const rig = cameraRigFor(biome)
  const s5 = biome.stations.find((s) => s.n === 5)
  const landing = [s5.x - 1.2, 0.3, s5.z - 1.2] // where "Travel here" puts Bulbuli: right beside a house
  const comfortable = deg(Math.atan2(rig.height - rig.lookHeight, rig.distance))
  let swung = 0
  for (let k = 0; k < 24; k += 1) {
    const yaw = (k * Math.PI) / 12
    const startsBlocked = viewBlocked(landing, yaw, rig)
    const r = playVillage(landing, yaw, [], 3)
    const label = `from camera yaw ${deg(yaw).toFixed(0)}°`
    assert.ok(!viewBlocked(r.pos, r.yaw, rig), `${label}: view still blocked after 3 s`)
    assert.equal(r.reversals, 0, `${label}: the swing changed direction`)
    assert.ok(Math.abs(r.net) <= 185, `${label}: swung ${r.net.toFixed(0)}°`)
    assert.ok(r.blocked <= 0.5 * FPS, `${label}: view blocked for ${r.blocked} frames`)
    // the reported defect: a 62° top-down view while swinging
    assert.ok(r.pitch <= MAX_PITCH + 1e-6 && MAX_PITCH <= 30, `${label}: looked ${r.pitch.toFixed(0)}° down`)
    assert.ok(r.closest >= 2, `${label}: camera came within ${r.closest.toFixed(1)} m of Bulbuli`)
    assert.equal(r.roof, 0, `${label}: camera inside a roof`)
    assert.ok(r.speed <= MAX_SWING_SPEED + 1.5, `${label}: camera moved at ${r.speed.toFixed(0)} m/s`) // the glide limit, plus being kept clear of a wall
    // it ends in the normal third-person framing
    const rest = cameraPose(r.pos, r.yaw, rig)
    assert.ok(Math.hypot(r.view[0] - rest.position[0], r.view[1] - rest.position[1], r.view[2] - rest.position[2]) < 0.15, `${label}: did not settle`)
    assert.ok(Math.abs(deg(Math.atan2(r.view[1] - rest.lookAt[1], Math.hypot(r.view[0] - r.pos[0], r.view[2] - r.pos[2]))) - comfortable) < 2)
    if (startsBlocked) swung += 1
    else if (!viewBlocked(landing, yaw, rig, 0.8)) assert.equal(r.net, 0, `${label}: a clear view was turned`)
  }
  assert.ok(swung >= 3, 'the landing spot really is beside a house')

  // the swing is rate-limited, and reduced motion jumps straight to the clear direction
  const blockedYaw = Array.from({ length: 72 }, (_, k) => (k * Math.PI) / 36).find((y) => viewBlocked(landing, y, rig))
  const state = createCameraState()
  const next = steerYaw(state, landing, blockedYaw, rig, 1 / FPS)
  assert.ok(Math.abs(next - blockedYaw) > 0 && Math.abs(next - blockedYaw) <= BLOCKED_TURN_SPEED / FPS + 1e-9)
  assert.ok(BLOCKED_TURN_SPEED >= AUTO_TURN_SPEED)
  const snapped = advanceCamera(createCameraState(), landing, blockedYaw, rig, 1 / FPS, { snap: true })
  assert.ok(!viewBlocked(landing, snapped.yaw, rig))
  assert.deepEqual(snapped.position, cameraPose(landing, snapped.yaw, rig).position)
})

test('sundarbans: walking round the village the swing starts early, recovers cleanly and keeps movement camera-relative', () => {
  const biome = BIOMES.sundarbans
  const s5 = biome.stations.find((s) => s.n === 5)
  const cases = [
    ['back towards the houses from station 5', [s5.x, 0.3, s5.z], Math.PI, ['back'], 3],
    ['right along the north side, camera south', [s5.x - 6, 0.3, s5.z - 0.8], Math.PI, ['right'], 4],
    ['left along the north side, camera north', [s5.x + 1, 0.3, s5.z - 0.5], 0, ['left'], 4],
    ['back into the gap between two houses', [-16.4, 0.3, -5.2], Math.PI, ['back'], 4],
    ['forward past the houses', [s5.x, 0.3, s5.z + 0.5], Math.PI / 2, ['forward'], 5],
    ['away to the north from the landing spot', [s5.x - 1.2, 0.3, s5.z - 1.2], Math.PI, ['back'], 3],
  ]
  for (const [name, start, yaw, keys, seconds] of cases) {
    const r = playVillage(start, yaw, keys, seconds)
    assert.ok(r.reversals <= 1, `${name}: the camera direction reversed ${r.reversals} times`)
    assert.ok(r.blocked <= 0.4 * FPS, `${name}: the view was blocked for ${r.blocked} frames (the swing should start before that)`)
    assert.ok(r.pitch <= MAX_PITCH + 1e-6, `${name}: looked ${r.pitch.toFixed(0)}° down`)
    assert.equal(r.roof, 0, `${name}: camera inside a roof`)
    assert.ok(r.closest >= 2, `${name}: camera came within ${r.closest.toFixed(1)} m`)
    // every step Bulbuli took went the way the key means, as seen from the camera at that moment
    assert.ok(r.relative[0] > 30 && r.relative[1] / r.relative[0] >= 0.97, `${name}: ${r.relative[1]}/${r.relative[0]} steps matched the key`)
    // recovery: stop and wait a second; the camera is at rest in its normal place and stays there
    const rig = r.rig
    let yawNow = r.yaw
    let view = null
    for (let frame = 0; frame < FPS * 2; frame += 1) {
      view = advanceCamera(r.state, r.pos, yawNow, rig, 1 / FPS)
      yawNow = view.yaw
    }
    const settled = yawNow
    for (let frame = 0; frame < FPS; frame += 1) {
      view = advanceCamera(r.state, r.pos, yawNow, rig, 1 / FPS)
      yawNow = view.yaw
    }
    assert.equal(yawNow, settled, `${name}: the camera keeps turning after Bulbuli has stopped`)
    assert.ok(!viewBlocked(r.pos, yawNow, rig), `${name}: ends with the view blocked`)
    const rest = cameraPose(r.pos, yawNow, rig)
    assert.ok(Math.hypot(view.position[0] - rest.position[0], view.position[1] - rest.position[1], view.position[2] - rest.position[2]) < 0.05, `${name}: the camera did not return to its normal place`)
  }
})

test('sundarbans: at spawn and stations 1 to 4 the camera is the plain eased follow, untouched by the obstruction code', () => {
  const biome = BIOMES.sundarbans
  const rig = cameraRigFor(biome)
  const dt = 1 / FPS
  const places = [[...biome.spawn.position], ...biome.stations.filter((s) => s.n !== 5).map((s) => [s.x - 1.2, 0.2, s.z - 1.2])]
  for (const pos of places) {
    for (let k = 0; k < 8; k += 1) {
      const yaw0 = (k * Math.PI) / 4
      assert.equal(viewBlocked(pos, yaw0, rig, 0.8), false)
      // standing still: never turns, sits exactly on the normal pose
      const still = createCameraState()
      let view = null
      for (let frame = 0; frame < 30; frame += 1) view = advanceCamera(still, pos, yaw0, rig, dt, { current: cameraPose(pos, yaw0, rig).position })
      assert.equal(view.yaw, yaw0)
      assert.deepEqual(view.position, cameraPose(pos, yaw0, rig).position)
      // turning with E: identical, frame for frame, to the eased follow ExplorerController has always done
      const state = createCameraState()
      let yaw = yaw0
      const reference = [...cameraPose(pos, yaw0, rig).position]
      for (let frame = 0; frame < 120; frame += 1) {
        yaw += TURN_SPEED * dt
        view = advanceCamera(state, pos, yaw, rig, dt, { manual: 1, current: reference })
        const target = cameraPose(pos, yaw, rig).position
        const ease = 1 - Math.exp(-dt * 6)
        for (let i = 0; i < 3; i += 1) reference[i] += (target[i] - reference[i]) * ease
        assert.equal(view.yaw, yaw)
        for (let i = 0; i < 3; i += 1) assert.ok(Math.abs(view.position[i] - reference[i]) < 1e-12)
        assert.deepEqual(view.lookAt, [pos[0], pos[1] + rig.lookHeight, pos[2]])
      }
    }
  }
})

test('sundarbans: an eased camera is kept out of the houses, off Bulbuli and at a comfortable angle', () => {
  const biome = BIOMES.sundarbans
  const rig = cameraRigFor(biome)
  const house = rig.avoid[1]
  const bird = [house.x, 0.2, house.z + 2.6]
  // inside a house → pushed out to its wall
  const out = constrainCamera([house.x + 0.3, 1.2, house.z + 0.2], bird, rig)
  assert.ok(!inRoof(rig, out) && Math.hypot(out[0] - house.x, out[2] - house.z) >= house.r - 1e-9)
  // right on top of Bulbuli → moved back, and not looking straight down
  const above = constrainCamera([bird[0] + 0.1, bird[1] + rig.height, bird[2] + 0.1], bird, rig)
  const run = Math.hypot(above[0] - bird[0], above[2] - bird[2])
  assert.ok(run >= 2)
  assert.ok(deg(Math.atan2(above[1] - (bird[1] + rig.lookHeight), run)) <= MAX_PITCH + 1e-6)
  // the normal pose is left exactly as it is, near the village and far from it
  for (const [pos, yaw] of [[bird, 0], [[...biome.spawn.position], 1], [[40, 0, 40], 2]]) {
    if (viewBlocked(pos, yaw, rig)) continue
    const pose = cameraPose(pos, yaw, rig)
    assert.deepEqual(constrainCamera(pose.position, pos, rig), pose.position)
  }
  // perched on a roof the camera is above the houses: nothing is blocked
  assert.equal(viewBlocked([house.x, 1.95, house.z], 0, rig), false)
})
