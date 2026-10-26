import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import { FOOT_RADIUS } from '../../config/constants'
import { useCameraShake, useSpeedFov } from '../../hooks/useVisualFx'
import { runtime } from '../../stores/runtime'
import { GameStatus, useGameStore } from '../../stores/useGameStore'
import { vfx } from '../../systems/vfx'

/**
 * Chase camera.
 *  - Offset is tracked *relative to the player*, so it never lags at high speed.
 *  - Height follows a smoothed copy of the player's y (ramps, islands, falls).
 *  - Pulls in closer and lower as speed rises, and further back in Neon Surge
 *    (pairs with the wider FOV for a "stretched" hyper-speed look).
 *  - Rolls toward the wall while wall-running; drops lower while sliding.
 *  - FOV: spring-driven, from speed + surge + punches (useSpeedFov).
 *  - Shake: trauma-based (useCameraShake).
 *  - Portrait screens get a higher, wider view. Orbits Bulbuli on the START screen.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const applyShake = useCameraShake()
  const updateFov = useSpeedFov()

  const offset = useRef(new Vector3(0, 3.2, 7.5))
  const lookOffset = useRef(new Vector3(0, 1, -12))
  const desired = useRef(new Vector3())
  const desiredLook = useRef(new Vector3())
  const lookTarget = useRef(new Vector3())
  const smoothY = useRef(FOOT_RADIUS)
  const roll = useRef(0)

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const { status } = useGameStore.getState()
    const p = runtime.playerPosition
    const mode = runtime.playerMode
    const portrait = size.width < size.height
    const k = 1 - Math.exp(-dt * 5)

    smoothY.current = MathUtils.lerp(smoothY.current, Math.max(p.y, -4), 1 - Math.exp(-dt * 4))

    if (status === GameStatus.START) {
      const t = state.clock.elapsedTime * 0.3
      desired.current.set(Math.sin(t) * 5.5, 2.2, Math.cos(t) * 5.5)
      desiredLook.current.set(0, 0.8, 0)
    } else {
      const slideDrop = mode === 'SLIDE' ? 0.8 : 0
      const speedPull = vfx.speedFactor * 0.9 - vfx.surge * 1.2 // closer when fast, back out in surge
      desired.current.set(
        p.x * -0.35,
        (portrait ? 4.4 : 3.2) - slideDrop - vfx.speedFactor * 0.35,
        (portrait ? 9.5 : 7.5) - speedPull,
      )
      desiredLook.current.set(p.x * -0.6, 0.8, -12 - vfx.surge * 6)
    }

    offset.current.lerp(desired.current, k)
    lookOffset.current.lerp(desiredLook.current, k)

    camera.position.set(p.x + offset.current.x, smoothY.current + offset.current.y, p.z + offset.current.z)
    lookTarget.current.set(p.x + lookOffset.current.x, smoothY.current + lookOffset.current.y, p.z + lookOffset.current.z)
    camera.lookAt(lookTarget.current)

    const targetRoll = status === GameStatus.PLAYING ? runtime.wallSide * -0.16 : 0
    roll.current = MathUtils.lerp(roll.current, targetRoll, 1 - Math.exp(-dt * 6))
    if (Math.abs(roll.current) > 0.0005) camera.rotateZ(roll.current)

    applyShake(camera, state.clock.elapsedTime)
    updateFov(camera, dt, portrait ? 72 : 60)
  })

  return null
}
