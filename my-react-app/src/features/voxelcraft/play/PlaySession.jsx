import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { playSfx } from '../audio/sfx.js'
import BlockLayer from '../components/viewport/blocks/BlockLayer.jsx'
import { CAMERA, cellCenter } from '../components/viewport/sceneConfig.js'
import ConfettiBurst from './ConfettiBurst.jsx'
import { PHYSICS, createPlayer, createWorld, respawn, solidAt, stepPlayer } from './physics.js'
import AvatarTrail from './AvatarTrail.jsx'
import PlayerAvatar from './PlayerAvatar.jsx'
import useKeyboardInput from './useKeyboardInput.js'

// Blocks are inert in play mode: no placing / deleting.
const NO_HANDLERS = { onPointerMove: undefined, onPointerOut: undefined, onClick: undefined, onContextMenu: undefined }
const noRaycast = () => null

const CAM = { distance: 7.5, minDistance: 3, maxDistance: 14, pitch: 0.42, minPitch: -0.05, maxPitch: 1.25, lookHeight: 1.1 }
const damp = (rate, dt) => 1 - Math.exp(-rate * dt) // frame-rate independent smoothing factor
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a))

/** Faint grid at the death height so players can see where the void begins. */
function VoidPlane() {
  return (
    <group position-y={PHYSICS.VOID_Y}>
      <gridHelper args={[60, 60, '#7c3aed', '#3b0764']} raycast={noRaycast} material-transparent material-opacity={0.35} material-depthWrite={false} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01} raycast={noRaycast}>
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial color="#1e1033" transparent opacity={0.6} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** The per-run state the game loop mutates every frame (camera, interpolation, input bookkeeping). */
function createLoopState(world, runId) {
  const f = world.finishCell
  const s = world.spawnPosition
  // Start looking from spawn toward the finish, so "forward" (W) heads the right way.
  const yaw = f ? Math.atan2(-(cellCenter(f.x) - s.x), -(cellCenter(f.z) - s.z)) : Math.PI / 4
  return {
    acc: 0,
    prev: new THREE.Vector3(s.x, s.y, s.z),
    yaw, pitch: CAM.pitch, distance: CAM.distance, curDistance: CAM.distance,
    target: new THREE.Vector3(s.x, s.y + CAM.lookHeight, s.z),
    facing: yaw + Math.PI, squash: 1, runId, consumedJumps: 0,
  }
}

/**
 * Play/Test mode scene: owns the game loop. Physics runs at a fixed 120 Hz with an accumulator,
 * and rendering interpolates between the last two physics states, so motion is smooth and
 * identical at 30, 60 or 144 fps. Nothing in the loop sets React state.
 */
/**
 * look:  the player's equipped cosmetics (skin, shirt, trail)
 * onWin(ms): called once when a run reaches the finish (progress: best times, Parkour King)
 */
export default function PlaySession({ level, store, look, onWin }) {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)

  const world = useMemo(() => createWorld(level), [level])
  const player = useMemo(() => createPlayer(world), [world])
  const input = useKeyboardInput(true)

  const avatar = useRef(null)
  const body = useRef(null)
  const confetti = useRef(null)
  const trail = useRef(null)

  // Everything the loop mutates per frame lives in one ref, created once per mount.
  // It's created in a layout effect, not during render: layout effects run in declaration order
  // during the commit, so it exists before the camera effect below, before any pointer event and
  // before the first useFrame tick. `??=` keeps the same object if the effect runs again.
  const loop = useRef(null)
  useLayoutEffect(() => {
    loop.current ??= createLoopState(world, store.get().runId)
  }, [world, store])

  const resetPlayer = () => {
    respawn(player)
    const L = loop.current
    L.prev.set(player.x, player.y, player.z)
    L.target.set(player.x, player.y + CAM.lookHeight, player.z) // snap camera, no cross-map swoop
    L.acc = 0
    trail.current?.clear() // no particles survive a respawn, so nothing streaks to the spawn
  }

  // Third-person camera: drag (any mouse button) to orbit, wheel to zoom. Restored on exit.
  useLayoutEffect(() => {
    const el = gl.domElement
    const L = loop.current
    let drag = null
    const down = (e) => {
      drag = { x: e.clientX, y: e.clientY }
      el.setPointerCapture?.(e.pointerId)
    }
    const move = (e) => {
      if (!drag) return
      L.yaw -= (e.clientX - drag.x) * 0.006
      L.pitch = THREE.MathUtils.clamp(L.pitch + (e.clientY - drag.y) * 0.004, CAM.minPitch, CAM.maxPitch)
      drag = { x: e.clientX, y: e.clientY }
    }
    const up = () => (drag = null)
    const wheel = (e) => {
      e.preventDefault()
      L.distance = THREE.MathUtils.clamp(L.distance * Math.exp(e.deltaY * 0.001), CAM.minDistance, CAM.maxDistance)
    }
    const noMenu = (e) => e.preventDefault()
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('contextmenu', noMenu)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('contextmenu', noMenu)
      // Hand the camera back to the Studio exactly where Build mode expects it.
      camera.position.set(...CAMERA.position)
      camera.lookAt(0, 0, 0)
    }
  }, [gl, camera])

  useFrame((_, delta) => {
    const L = loop.current
    const keys = input.current
    const play = store.get()
    const dt = Math.min(delta, 0.1)

    // "Play again" from the HUD
    if (play.runId !== L.runId) {
      L.runId = play.runId
      // Drop jump presses made before the restart. The press counter belongs to
      // useKeyboardInput, so mark them consumed here instead of resetting it.
      L.consumedJumps = keys.jumpPresses
      resetPlayer()
    }

    // --- input → camera-relative wish direction
    const won = play.status === 'won'
    let ix = 0
    let iz = 0
    if (!won) {
      ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
      iz = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0)
    }
    const sin = Math.sin(L.yaw)
    const cos = Math.cos(L.yaw)
    let moveX = cos * ix - sin * iz
    let moveZ = -sin * ix - cos * iz
    const len = Math.hypot(moveX, moveZ)
    if (len > 1) { moveX /= len; moveZ /= len }
    let jumpPressed = !won && keys.jumpPresses > L.consumedJumps
    L.consumedJumps = keys.jumpPresses

    // speedrun timer starts on the first input
    if (play.status === 'ready' && (ix || iz || jumpPressed)) {
      store.start()
      playSfx('play_start')
    }

    // --- fixed-step physics
    L.acc += dt
    let steps = 0
    while (L.acc >= PHYSICS.STEP && steps < PHYSICS.MAX_STEPS_PER_FRAME) {
      L.prev.set(player.x, player.y, player.z)
      const events = stepPlayer(player, { moveX, moveZ, jumpPressed, jumpHeld: !won && keys.jump })
      jumpPressed = false // a press is consumed by the first step that sees it (the buffer keeps it alive)
      L.acc -= PHYSICS.STEP
      steps++
      for (const ev of events) {
        if (ev.type === 'jump') { playSfx('jump'); L.squash = 1.18 }
        else if (ev.type === 'land') { if (ev.speed > 6) playSfx('land', ev); L.squash = 1 - Math.min(0.35, ev.speed * 0.02) }
        else if (ev.type === 'bounce') { playSfx('bounce'); L.squash = 0.6 }
        else if (ev.type === 'lava' || ev.type === 'void') {
          store.die(ev.type)
          playSfx(ev.type === 'lava' ? 'death_lava' : 'death_void')
          playSfx('respawn')
          resetPlayer()
        } else if (ev.type === 'finish' && store.win()) {
          playSfx('victory')
          onWin?.(store.get().finalMs)
          const f = world.finishCell
          confetti.current?.fire({ x: cellCenter(f.x), y: f.y + 0.6, z: cellCenter(f.z) })
        }
      }
    }
    if (steps === PHYSICS.MAX_STEPS_PER_FRAME) L.acc = 0 // long hitch: drop the backlog

    // --- render state, interpolated between physics steps
    const a = L.acc / PHYSICS.STEP
    const rx = L.prev.x + (player.x - L.prev.x) * a
    const ry = L.prev.y + (player.y - L.prev.y) * a
    const rz = L.prev.z + (player.z - L.prev.z) * a

    const g = avatar.current
    if (g) {
      g.position.set(rx, ry, rz)
      const speed = Math.hypot(player.vx, player.vz)
      if (speed > 0.4) L.facing += wrapAngle(Math.atan2(player.vx, player.vz) - L.facing) * damp(14, dt)
      g.rotation.y = L.facing
      // squash & stretch spring back to 1; slight stretch while rising fast
      L.squash += (1 - L.squash) * damp(10, dt)
      const sy = L.squash * (1 + THREE.MathUtils.clamp(player.vy / 80, -0.06, 0.12))
      body.current.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy))
    }

    // --- third-person follow camera
    L.target.x += (rx - L.target.x) * damp(12, dt)
    L.target.y += (ry + CAM.lookHeight - L.target.y) * damp(7, dt)
    L.target.z += (rz - L.target.z) * damp(12, dt)
    const cp = Math.cos(L.pitch)
    const dx = Math.sin(L.yaw) * cp
    const dy = Math.sin(L.pitch)
    const dz = Math.cos(L.yaw) * cp
    // pull in when a block is between the player and the camera
    let d = L.distance
    for (let t = 0.6; t < L.distance; t += 0.2) {
      if (solidAt(world, L.target.x + dx * t, L.target.y + dy * t, L.target.z + dz * t)) {
        d = Math.max(1.2, t - 0.35)
        break
      }
    }
    L.curDistance += (d - L.curDistance) * (d < L.curDistance ? 1 : damp(4, dt))
    camera.position.set(L.target.x + dx * L.curDistance, L.target.y + dy * L.curDistance, L.target.z + dz * L.curDistance)
    camera.lookAt(L.target)
  })

  return (
    <>
      <BlockLayer blocks={level.blocks} handlers={NO_HANDLERS} />
      <VoidPlane />
      <PlayerAvatar ref={avatar} bodyRef={body} look={look} />
      <AvatarTrail ref={trail} target={avatar} trail={look?.trail} />
      <ConfettiBurst ref={confetti} />
    </>
  )
}
