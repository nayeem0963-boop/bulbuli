/**
 * Moves Bulbuli around an expedition map with the Skyward Explorer movement rules
 * (skyward-explorer/physics.js and input.js), follows it with the camera,
 * and reports which station Bulbuli is standing next to.
 *
 *   inputRef    ref to the shared input object (keyboard + on-screen buttons), read each frame
 *   activeRef   false while a station panel or dialog is open: Bulbuli stands still
 *   teleportRef parent sets { x, y, z } to move Bulbuli (station list "Travel here")
 *   onNear(n)   called when the nearest station within reach changes (n or null)
 */
import { Suspense, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { createPlayer, stepPlayer } from '../skyward-explorer/physics.js'
import { sfx } from '../skyward-explorer/sfx.js'
import BulbuliAvatar from '../skyward-explorer/BulbuliAvatar.jsx'
import AmazonBirdAvatar from './AmazonBirdAvatar.jsx'
import { collidersFor } from './biomes/index.js'
import { nearestStation } from './proximity.js'
import { readExplorerControls, rescueFromWater } from './drive.js'
import { cameraPose, cameraRigFor, settleYaw } from './cameraRig.js'

const BIRD_SCALE = 0.3

export default function ExplorerController({ biome, inputRef, activeRef, teleportRef, onNear, reducedMotion }) {
  const colliders = useMemo(() => collidersFor(biome), [biome])
  const discTops = useMemo(() => Object.fromEntries(biome.discs.map((d) => [d.id, d.top])), [biome])
  // framing comes from the map (cameraRig.js): the defaults unless the destination sets its own
  const rig = useMemo(() => cameraRigFor(biome), [biome])
  // one player per mounted map (remounted per expedition); BulbuliAvatar reads player.current
  const player = useRef(createPlayer(biome.spawn))
  const avatar = useRef()
  const yaw = useRef(biome.spawn.facing + Math.PI)
  const near = useRef(null)
  const lastJumps = useRef(null) // jump-press count already handled (set on the first frame)
  const camTarget = useMemo(() => new Vector3(), [])
  const { camera } = useThree()

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30)
    const p = player.current
    if (teleportRef.current) {
      const t = teleportRef.current
      teleportRef.current = null
      p.pos = [t.x, t.y, t.z]
      p.vel = [0, 0, 0]
      p.grounded = false
      p.groundId = null
      p.checkpoint = [t.x, t.y, t.z]
    }
    const controls = readExplorerControls(inputRef.current, { active: activeRef.current, yaw: yaw.current, lastJumps: lastJumps.current, dt })
    yaw.current = controls.yaw
    lastJumps.current = controls.lastJumps
    const events = stepPlayer(p, controls.step, dt, colliders)
    rescueFromWater(p, biome, events)
    if (events.jumped) sfx.jump()
    if (events.landed) sfx.land(events.impact)
    if (events.fell) sfx.fall()

    if (avatar.current) {
      avatar.current.position.set(p.pos[0], p.pos[1], p.pos[2])
      avatar.current.rotation.y = p.facing
    }
    // camera: behind and above Bulbuli, eased (snapped when reduced motion is on)
    // a map with volumes to avoid (the Sundarbans village) swings the camera clear of them
    if (rig.avoid.length) yaw.current = settleYaw(p.pos, yaw.current, rig, dt, reducedMotion)
    const pose = cameraPose(p.pos, yaw.current, rig)
    if (rig.fov && state.camera.fov !== rig.fov) {
      state.camera.fov = rig.fov
      state.camera.updateProjectionMatrix()
    }
    camTarget.set(pose.position[0], pose.position[1], pose.position[2])
    if (reducedMotion) camera.position.copy(camTarget)
    else camera.position.lerp(camTarget, 1 - Math.exp(-dt * 6))
    camera.lookAt(pose.lookAt[0], pose.lookAt[1], pose.lookAt[2])

    const n = nearestStation(biome.stations, p.pos[0], p.pos[2], p.pos[1], discTops)
    if (n !== near.current) {
      near.current = n
      onNear(n)
    }
  })

  // The Amazon Rainforest has its own bird (a loaded, animated model); every other biome keeps
  // Bulbuli. Both read the same player object, so movement and the camera are identical.
  return (
    <group ref={avatar}>
      {biome.id === 'amazon' ? (
        <Suspense fallback={null}>
          <AmazonBirdAvatar motion={player} />
        </Suspense>
      ) : (
        <BulbuliAvatar motion={player} scale={BIRD_SCALE} />
      )}
    </group>
  )
}
