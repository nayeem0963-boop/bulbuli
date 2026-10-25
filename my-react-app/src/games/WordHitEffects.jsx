import { memo, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CylinderGeometry, Object3D, Vector3 } from 'three'

const PARTICLE_COUNT = 14
const BEAM_DURATION = 0.18
const BURST_DURATION = 0.38
const UP = new Vector3(0, 1, 0)

function WordHitEffects({ effectsRef, playerName = 'PlayerBird3D' }) {
  const beam = useRef()
  const beamMaterial = useRef()
  const particles = useRef()
  const { scene } = useThree()
  const geometry = useMemo(() => new CylinderGeometry(0.035, 0.035, 1, 6), [])
  const dummy = useMemo(() => new Object3D(), [])
  const start = useMemo(() => new Vector3(), [])
  const end = useMemo(() => new Vector3(), [])
  const direction = useMemo(() => new Vector3(), [])
  const queued = useRef([])
  const active = useRef(null)

  useFrame((_, delta) => {
    if (effectsRef?.current?.length) {
      queued.current.push(...effectsRef.current.splice(0))
    }

    if (!active.current && queued.current.length) {
      const player = scene.getObjectByName(playerName)
      if (player) {
        const event = queued.current.shift()
        player.getWorldPosition(start)
        active.current = {
          event,
          source: start.clone(),
          destination: new Vector3(event.position.x, event.position.y, event.position.z),
          elapsed: 0,
          burst: [],
        }
      }
    }

    const effect = active.current
    if (!effect) {
      if (beam.current) beam.current.visible = false
      if (particles.current) {
        for (let index = 0; index < PARTICLE_COUNT; index += 1) {
          dummy.position.set(0, -1000, 0)
          dummy.scale.setScalar(0)
          dummy.updateMatrix()
          particles.current.setMatrixAt(index, dummy.matrix)
        }
        particles.current.instanceMatrix.needsUpdate = true
      }
      return
    }

    effect.elapsed += delta
    if (effect.elapsed < BEAM_DURATION) {
      const progress = effect.elapsed / BEAM_DURATION
      end.copy(effect.source).lerp(effect.destination, progress)
      direction.copy(end).sub(effect.source)
      const beamLength = direction.length()
      if (beam.current) {
        beam.current.visible = true
        beam.current.position.copy(effect.source).add(end).multiplyScalar(0.5)
        beam.current.quaternion.setFromUnitVectors(UP, direction.normalize())
        beam.current.scale.set(1, Math.max(beamLength, 0.01), 1)
      }
      if (beamMaterial.current) beamMaterial.current.opacity = 1 - progress * 0.25
    } else {
      if (beam.current) beam.current.visible = false

      if (effect.burst.length === 0) {
        effect.burst = Array.from({ length: PARTICLE_COUNT }, () => ({
          velocity: new Vector3(
            (Math.random() - 0.5) * 5,
            Math.random() * 4 + 0.5,
            (Math.random() - 0.5) * 5,
          ),
          scale: Math.random() * 0.07 + (effect.event.completed ? 0.14 : 0.05),
        }))
      }

      const burstTime = effect.elapsed - BEAM_DURATION
      if (particles.current) {
        effect.burst.forEach((particle, index) => {
          const t = Math.min(burstTime, BURST_DURATION)
          dummy.position.set(
            effect.destination.x + particle.velocity.x * t,
            effect.destination.y + particle.velocity.y * t - 5 * t * t,
            effect.destination.z + particle.velocity.z * t,
          )
          dummy.scale.setScalar(particle.scale * (1 - t / BURST_DURATION))
          dummy.rotation.set(t * 4, t * 3, t * 2)
          dummy.updateMatrix()
          particles.current.setMatrixAt(index, dummy.matrix)
        })
        particles.current.instanceMatrix.needsUpdate = true
      }

      if (burstTime >= BURST_DURATION) active.current = null
    }
  })

  return (
    <>
      <mesh ref={beam} geometry={geometry} visible={false}>
        <meshBasicMaterial
          ref={beamMaterial}
          color="#b7f7ff"
          transparent
          opacity={1}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <instancedMesh
        ref={particles}
        args={[undefined, undefined, PARTICLE_COUNT]}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#ffd45c" toneMapped={false} />
      </instancedMesh>
    </>
  )
}

export default memo(WordHitEffects)
