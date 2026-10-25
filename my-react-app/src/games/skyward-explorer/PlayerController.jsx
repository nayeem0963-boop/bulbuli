/**
 * Bulbuli the player: input → physics (physics.js) → the avatar, the chase camera,
 * and crystal pick-ups.
 *
 * Movement is relative to the camera: W/↑ always runs away from the camera.
 * The camera orbits Bulbuli: drag on the scene (mouse or finger) or Q / E to turn it,
 * the mouse wheel to zoom. Everything per-frame lives in refs; React never re-renders
 * while you play.
 *
 * Props:
 *   world, colliders   from layout.js / physics.js
 *   input              the shared input object (input.js)
 *   active             true while the game is being played (input counts)
 *   crystals           world.crystals
 *   collectedRef       Map of crystal id → time taken (read here, written by the parent)
 *   onCollect(crystal) Bulbuli touched a crystal
 *   live               object the HUD reads: stamina and gliding are written here
 */
import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import BulbuliAvatar from './BulbuliAvatar.jsx'
import { cameraTurn, isJumpHeld, readStick } from './input.js'
import { cameraRelative, createPlayer, spawnPoint, stepPlayer } from './physics.js'
import { sfx } from './sfx.js'

const PICKUP_RADIUS = 1.0      // crystal centre to Bulbuli's middle
const CAMERA = { pitch: 0.38, distance: 8.5, minPitch: 0.06, maxPitch: 1.2, minDistance: 4.5, maxDistance: 16 }
const MAX_STEP = 1 / 30        // physics never takes a bigger step than this (stable after a hitch)

/** Mouse/touch drag and wheel on the canvas turn and zoom the camera. */
function useCameraDrag(view) {
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    const el = gl.domElement
    let pointer = null
    let lastX = 0
    let lastY = 0
    const down = (e) => {
      if (pointer !== null) return
      pointer = e.pointerId
      lastX = e.clientX
      lastY = e.clientY
      el.setPointerCapture?.(e.pointerId)
    }
    const move = (e) => {
      if (e.pointerId !== pointer) return
      const v = view.current
      v.yaw -= (e.clientX - lastX) * 0.006
      v.pitch = MathUtils.clamp(v.pitch + (e.clientY - lastY) * 0.004, CAMERA.minPitch, CAMERA.maxPitch)
      lastX = e.clientX
      lastY = e.clientY
    }
    const up = (e) => {
      if (e.pointerId === pointer) pointer = null
    }
    const wheel = (e) => {
      e.preventDefault()
      const v = view.current
      v.distance = MathUtils.clamp(v.distance * (1 + Math.sign(e.deltaY) * 0.1), CAMERA.minDistance, CAMERA.maxDistance)
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl, view])
}

function PlayerController({ world, colliders, input, active, crystals, collectedRef, onCollect, live }) {
  const spawn = useMemo(() => spawnPoint(world), [world])
  const player = useRef(null)
  if (!player.current) player.current = createPlayer(spawn)

  const root = useRef()
  const camera = useThree((state) => state.camera)
  const view = useRef({ yaw: spawn.facing + Math.PI, pitch: CAMERA.pitch, distance: CAMERA.distance })
  const cam = useRef({ ready: false, look: new Vector3(), want: new Vector3(), desired: new Vector3() })
  const seenPresses = useRef(input.jumpPresses)
  const activeRef = useRef(active)
  activeRef.current = active

  useCameraDrag(view)

  useFrame((_, delta) => {
    const p = player.current
    const dt = Math.min(delta, 0.1)
    const playing = activeRef.current

    // ---- input (ignored unless playing; presses made before the start don't count)
    const v = view.current
    v.yaw += cameraTurn(input) * 2.2 * dt
    const stick = playing ? readStick(input) : { right: 0, forward: 0 }
    const move = cameraRelative(stick.right, stick.forward, v.yaw)
    const jumpPressed = playing && input.jumpPresses !== seenPresses.current
    seenPresses.current = input.jumpPresses
    const frameInput = { ...move, jumpHeld: playing && isJumpHeld(input), jumpPressed }

    // ---- physics, in small steps
    let remaining = dt
    let pressed = frameInput.jumpPressed
    while (remaining > 1e-6) {
      const step = Math.min(MAX_STEP, remaining)
      remaining -= step
      const events = stepPlayer(p, { ...frameInput, jumpPressed: pressed }, step, colliders)
      pressed = false
      if (events.jumped) sfx.jump()
      if (events.glideStart) sfx.glide()
      if (events.landed) sfx.land(events.impact)
      if (events.fell) {
        sfx.fall()
        cam.current.ready = false // snap the camera back with Bulbuli
      }
    }

    // ---- the avatar
    const g = root.current
    if (g) {
      g.position.set(p.pos[0], p.pos[1], p.pos[2])
      // turn smoothly the short way round
      let diff = p.facing - g.rotation.y
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      g.rotation.y += diff * (1 - Math.exp(-14 * dt))
    }

    // ---- crystals
    if (playing) {
      const cx = p.pos[0]
      const cy = p.pos[1] + 0.55
      const cz = p.pos[2]
      for (const c of crystals) {
        if (collectedRef.current.has(c.id)) continue
        const [x, y, z] = c.position
        if (Math.abs(x - cx) > 2 || Math.abs(z - cz) > 2) continue // quick reject
        if (Math.hypot(x - cx, y - cy, z - cz) < PICKUP_RADIUS) onCollect(c)
      }
    }

    // ---- HUD values
    live.stamina = p.stamina
    live.gliding = p.gliding
    live.focus = p.pos // the sun's shadow box follows Bulbuli

    // ---- chase camera
    const c = cam.current
    const target = c.want.set(p.pos[0], p.pos[1] + 1.1, p.pos[2])
    const flat = Math.cos(v.pitch) * v.distance
    const desired = c.desired.set(
      target.x + Math.sin(v.yaw) * flat,
      target.y + Math.sin(v.pitch) * v.distance,
      target.z + Math.cos(v.yaw) * flat,
    )
    if (!c.ready) {
      camera.position.copy(desired)
      c.look.copy(target)
      c.ready = true
    } else {
      camera.position.lerp(desired, 1 - Math.exp(-10 * dt))
      c.look.lerp(target, 1 - Math.exp(-14 * dt))
    }
    camera.lookAt(c.look)
  })

  return (
    <group ref={root} position={spawn.position} rotation-y={spawn.facing}>
      <BulbuliAvatar motion={player} />
    </group>
  )
}

export default memo(PlayerController)
