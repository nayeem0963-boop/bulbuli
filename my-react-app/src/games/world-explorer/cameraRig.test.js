import test from 'node:test'
import assert from 'node:assert/strict'
import { BIOMES } from './biomes/index.js'
import { DEFAULT_CAMERA, DEFAULT_FOV, cameraPose, cameraRigFor } from './cameraRig.js'

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
      assert.equal(pose.pull, 1)
    }
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

test('sundarbans: the camera never enters or looks through a village house', () => {
  const biome = BIOMES.sundarbans
  const rig = cameraRigFor(biome)
  const village = biome.props.find((prop) => prop.type === 'village')
  assert.equal(rig.avoid.length, 3)
  rig.avoid.forEach((house, i) => {
    assert.equal(house.x, village.x + i * 2.4)
    assert.equal(house.z, village.z + (i % 2))
    assert.ok(house.r >= 1.3 && house.top >= 1.95, 'covers the house box and its roof')
  })
  const inside = (x, y, z) => rig.avoid.some((c) => y < c.top && Math.hypot(x - c.x, z - c.z) < c.r)
  const station5 = biome.stations.find((s) => s.n === 5)
  let pulled = 0
  let checked = 0
  for (let x = village.x - 6; x <= station5.x + 3; x += 0.5) {
    for (let z = village.z - 6; z <= station5.z + 4; z += 0.5) {
      if (inside(x, 0.2, z)) continue // Bulbuli cannot stand inside a house
      for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 12) {
        const pos = [x, 0.2, z]
        const pose = cameraPose(pos, yaw, rig)
        checked += 1
        if (pose.pull < 1) pulled += 1
        assert.ok(!inside(...pose.position), `camera inside a house from (${x}, ${z}) yaw ${yaw.toFixed(2)}`)
        assert.ok(pose.pull >= 0.3 && pose.pull <= 1)
        // pulled in, it comes down behind Bulbuli rather than looking straight down
        const run = Math.hypot(pose.position[0] - pos[0], pose.position[2] - pos[2])
        const steep = deg(Math.atan2(pose.position[1] - pose.lookAt[1], run))
        if (pose.position[1] < 2.35) assert.ok(steep <= 36, `camera looks ${steep.toFixed(0)}° down from (${x}, ${z}) yaw ${yaw.toFixed(2)}`)
        assert.ok(pose.lookAt[1] >= pos[1] + 0.3 - 1e-9 && pose.lookAt[1] <= pos[1] + rig.lookHeight + 1e-9)
        // no house (roof radius 1.3 m, 1.95 m tall) stands between Bulbuli and the camera either
        for (let t = 0.05; t < 1; t += 0.05) {
          const p = [pos[0] + (pose.position[0] - pos[0]) * t, pose.position[1], pos[2] + (pose.position[2] - pos[2]) * t]
          const blocked = p[1] < 1.95 && rig.avoid.some((c) => Math.hypot(p[0] - c.x, p[2] - c.z) < 1.3)
          assert.ok(!blocked, `a house blocks the view from (${x}, ${z}) yaw ${yaw.toFixed(2)}`)
        }
      }
    }
  }
  assert.ok(checked > 1000 && pulled > 20, 'the village is close enough to matter, and the camera pulls in there')
  // standing at station 5 with the camera towards the village (the reported case)
  const towardsVillage = Math.atan2(village.x + 4.8 - station5.x, village.z - station5.z)
  assert.ok(!inside(...cameraPose([station5.x, 0.2, station5.z], towardsVillage, rig).position))
  // perched on a roof: the camera is above the houses and is not pulled in
  assert.equal(cameraPose([village.x, 1.95, village.z], 0, rig).pull, 1)
  // away from the village nothing changes the framing
  for (const s of biome.stations.filter((st) => st.n !== 5)) assert.equal(cameraPose([s.x, 0.2, s.z], 1.1, rig).pull, 1)
  const [sx, sy, sz] = biome.spawn.position
  const spawn = cameraPose([sx, sy, sz], biome.spawn.facing + Math.PI, rig)
  assert.equal(spawn.pull, 1)
  assert.deepEqual(spawn.lookAt, [sx, sy + rig.lookHeight, sz])
})
