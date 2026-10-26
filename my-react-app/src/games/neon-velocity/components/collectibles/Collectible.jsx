import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  IcosahedronGeometry, MeshBasicMaterial, MeshStandardMaterial, OctahedronGeometry,
} from 'three'
import { COLORS } from '../../config/constants'
import { useGameStore } from '../../stores/useGameStore'
import { useSensor } from '../../hooks/useCollision'
import { boxFrom } from '../../systems/collisionWorld'
import { EV, GameEvents } from '../../systems/events'

/*
 * Collectible — floating energy pickups.
 *   crystal: +10 score, +8% boost meter
 *   prism:   +50 score, +30% boost meter (placed on harder lines: apex of jumps, wall runs)
 * A sensor box in the collision world; on touch it reports to the store, plays a
 * short burst and removes its sensor.
 */

const glowMat = (color, intensity) => new MeshStandardMaterial({
  color, emissive: color, emissiveIntensity: intensity, toneMapped: false, flatShading: true,
})

const VARIANTS = {
  crystal: {
    geometry: new OctahedronGeometry(0.32, 0),
    material: glowMat(COLORS.cyan, 3.5),
    color: COLORS.cyan,
    radius: 0.65,
    points: 10,
    meter: 0.08,
  },
  prism: {
    geometry: new IcosahedronGeometry(0.45, 0),
    material: glowMat(COLORS.magenta, 4),
    color: COLORS.magenta,
    radius: 0.85,
    points: 50,
    meter: 0.3,
  },
}

const BURST_TIME = 0.3

export const Collectible = memo(function Collectible({ position, variant = 'crystal' }) {
  const cfg = VARIANTS[variant] ?? VARIANTS.crystal
  const [phase, setPhase] = useState('idle') // idle → burst → gone
  const done = useRef(false)
  const mesh = useRef()
  const burst = useRef()
  const burstAge = useRef(0)
  const wobble = position[2] * 0.37

  const onEnter = useCallback(() => {
    if (done.current) return
    done.current = true
    useGameStore.getState().collect(cfg.points, cfg.meter)
    GameEvents.emit(EV.PICKUP, { variant, position })
    setPhase('burst')
  }, [cfg, variant, position])

  // pickup radius as a cube around the crystal (generous on purpose)
  const [px, py, pz] = position
  const box = useMemo(() => boxFrom(px, py, pz, cfg.radius * 2, cfg.radius * 2, cfg.radius * 2), [px, py, pz, cfg.radius])
  useSensor(phase === 'idle', box, onEnter)

  useFrame((state, dt) => {
    if (phase === 'idle' && mesh.current) {
      mesh.current.rotation.y += dt * 2.5
      mesh.current.rotation.x += dt * (variant === 'prism' ? 1.5 : 0)
      mesh.current.position.y = Math.sin(state.clock.elapsedTime * 3 + wobble) * 0.15
    } else if (phase === 'burst' && burst.current) {
      burstAge.current += dt
      const t = Math.min(1, burstAge.current / BURST_TIME)
      burst.current.scale.setScalar(1 + t * 2.5)
      burst.current.material.opacity = 1 - t
      if (t >= 1) setPhase('gone')
    }
  })

  if (phase === 'gone') return null

  return (
    <group position={position}>
      {phase === 'idle' ? (
        <mesh ref={mesh} geometry={cfg.geometry} material={cfg.material} />
      ) : (
        <Burst ref={burst} geometry={cfg.geometry} color={cfg.color} />
      )}
    </group>
  )
})

/** Expanding, fading copy of the pickup. Owns a material, disposed on unmount. */
function Burst({ ref, geometry, color }) {
  const material = useMemo(() => {
    const m = new MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false, toneMapped: false, wireframe: true })
    m.color.multiplyScalar(3)
    return m
  }, [color])
  useEffect(() => () => material.dispose(), [material])
  return <mesh ref={ref} geometry={geometry} material={material} />
}
