import test from 'node:test'
import assert from 'node:assert/strict'
import { PerspectiveCamera, Vector3 } from 'three'
import { BIOMES } from './biomes/index.js'
import { cameraPose, cameraRigFor, createCameraState, steerYaw } from './cameraRig.js'
import { LABEL, stationLabelPlacement } from './stationLabel.js'

const ASPECTS = [1236 / 587, 16 / 9, 4 / 3] // the preview frame, full screen, a tablet

/** The follow camera exactly as ExplorerController leaves it, for Bulbuli at `pos` with `yaw`. */
function cameraAt(biome, pos, yaw, aspect) {
  const rig = cameraRigFor(biome)
  let settled = yaw
  const state = createCameraState()
  for (let i = 0; i < 90; i += 1) settled = steerYaw(state, pos, settled, rig, 1 / 30)
  const pose = cameraPose(pos, settled, rig)
  const camera = new PerspectiveCamera(rig.fov ?? 50, aspect, 0.1, 320)
  camera.position.set(...pose.position)
  camera.lookAt(...pose.lookAt)
  camera.updateMatrixWorld(true)
  return camera
}

/** Frame position of a world point: x and y in 0..1 from the top-left, or null behind the camera. */
function inFrame(camera, x, y, z) {
  const p = new Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse)
  if (p.z > -camera.near) return null
  p.applyMatrix4(camera.projectionMatrix)
  return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 }
}

test('station labels: only the Sundarbans opts in to camera-aware labels', () => {
  assert.deepEqual(BIOMES.sundarbans.labels, { cameraAware: true })
  assert.equal(BIOMES.amazon.labels, undefined)
  assert.equal(BIOMES.sahara.labels, undefined)
  assert.equal(LABEL.height, 2.8, 'the default label height is the fixed height other maps use')
  assert.deepEqual([LABEL.width, LABEL.tall], [2, 0.5])
})

test('station labels: far from the camera a label is exactly where and as large as it always was', () => {
  const biome = BIOMES.sundarbans
  for (const station of biome.stations) {
    for (const [dx, dz] of [[9, 0], [-12, 3], [0, 14], [7, -8]]) {
      const pos = [station.x + dx, 0.2, station.z + dz]
      const yaw = Math.atan2(pos[0] - station.x, pos[2] - station.z) // camera behind Bulbuli, looking at the station
      const camera = cameraAt(biome, pos, yaw, ASPECTS[0])
      assert.deepEqual(stationLabelPlacement(camera, [station.x, 0, station.z]), { height: LABEL.height, scale: 1 })
    }
  }
})

test('station labels: all five stay fully inside the frame, below the top buttons, from every side', () => {
  const biome = BIOMES.sundarbans
  let checked = 0
  let lowered = 0
  let tooClose = 0
  for (const aspect of ASPECTS) {
    for (const station of biome.stations) {
      const base = [station.x, 0, station.z]
      // where "Travel here" lands, on the ring, just outside it and a few steps away, all round
      const spots = [[-1.2, -1.2]]
      for (const r of [1.2, 1.7, 2.6, 4]) for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) spots.push([Math.cos(a) * r, Math.sin(a) * r])
      for (const [dx, dz] of spots) {
        const pos = [station.x + dx, 0.2, station.z + dz]
        for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 8) {
          const camera = cameraAt(biome, pos, yaw, aspect)
          const pole = Math.hypot(camera.position.x - station.x, camera.position.z - station.z)
          const { height, scale } = stationLabelPlacement(camera, base)
          assert.ok(height >= LABEL.minHeight - 1e-9 && height <= LABEL.height + 1e-9)
          assert.ok(scale >= LABEL.minScale && scale <= 1)
          const centre = inFrame(camera, station.x, height, station.z)
          if (!centre || centre.x < 0.08 || centre.x > 0.92) continue // the pole is behind the camera or off to the side
          // the camera standing almost on top of the pole cannot show a label above it
          if (pole < 1.5) { tooClose += 1; continue }
          checked += 1
          if (height < LABEL.height - 1e-6) lowered += 1
          const top = inFrame(camera, station.x, height + (LABEL.tall * scale) / 2, station.z)
          const bottom = inFrame(camera, station.x, height - (LABEL.tall * scale) / 2, station.z)
          const where = `station ${station.n} from (${dx.toFixed(1)}, ${dz.toFixed(1)}) yaw ${yaw.toFixed(2)}`
          assert.ok(top.y >= LABEL.topMargin - 0.01, `${where}: label top at ${(top.y * 100).toFixed(0)}% (clipped or under the buttons)`)
          assert.ok(bottom.y < 0.75, `${where}: label too low`)
          // readable: at least 3% of the frame height, never a banner across the screen
          assert.ok(bottom.y - top.y >= 0.03 && bottom.y - top.y <= 0.22, `${where}: label is ${((bottom.y - top.y) * 100).toFixed(0)}% of the frame tall`)
          // it stays above the pole's flag (1.9 m), so the label reads as part of the station
          assert.ok(height - (LABEL.tall * scale) / 2 >= 2.1)
        }
      }
    }
  }
  assert.ok(checked > 3000, `checked ${checked} views`)
  assert.ok(lowered > 200, 'close views do bring the label down')
  assert.ok(tooClose / (checked + tooClose) < 0.08, `${tooClose} views with the camera on top of the pole`)
})
