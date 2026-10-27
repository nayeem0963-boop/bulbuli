import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import AvatarTrail from '../play/AvatarTrail.jsx'
import PlayerAvatar from '../play/PlayerAvatar.jsx'

const RADIUS = 1.15
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * The avatar jogs a small loop on a glowing pad so the trail is visible. Drag to turn the stage.
 * Everything animates by mutating refs in useFrame (no React renders per frame).
 */
function Stage({ look, spin }) {
  const runner = useRef(null)
  const body = useRef(null)
  const stage = useRef(null)
  const still = useRef(reducedMotion())
  const angle = useRef(0)

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = clock.elapsedTime
    if (!still.current) angle.current += dt * 1.25
    const a = angle.current
    if (runner.current) {
      runner.current.position.set(Math.cos(a) * RADIUS, Math.abs(Math.sin(t * 9)) * 0.06, Math.sin(a) * RADIUS)
      runner.current.rotation.y = -a // face along the loop (tangent)
    }
    if (body.current) body.current.scale.y = 1 + Math.sin(t * 18) * 0.02
    if (stage.current) {
      const s = spin.current
      if (!s.dragging) s.yaw += (0 - s.yaw) * Math.min(1, dt * 0.6) // drift back to front
      stage.current.rotation.y = s.yaw
    }
  })

  return (
    <>
      <ambientLight intensity={0.55} color="#c7d2fe" />
      <hemisphereLight args={['#a5b4fc', '#0f172a', 0.6]} />
      <directionalLight position={[3, 6, 4]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 3, -3]} intensity={0.6} color="#a855f7" />
      <group ref={stage}>
        <mesh position-y={-0.06} receiveShadow>
          <cylinderGeometry args={[2, 2.15, 0.12, 48]} />
          <meshStandardMaterial color="#1e1b4b" roughness={0.6} />
        </mesh>
        <mesh position-y={0.002} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[1.95, 2.02, 64]} />
          <meshBasicMaterial color="#818cf8" toneMapped={false} />
        </mesh>
        <PlayerAvatar ref={runner} bodyRef={body} look={look} />
      </group>
      {/* the trail lives in world space so it streams behind the runner */}
      <AvatarTrail target={runner} trail={look.trail} />
    </>
  )
}

export default function AvatarPreview({ look, className = '' }) {
  const spin = useRef({ yaw: 0, dragging: false, lastX: 0 })
  const el = useRef(null)

  useEffect(() => {
    const node = el.current
    if (!node) return
    const down = (e) => Object.assign(spin.current, { dragging: true, lastX: e.clientX })
    const move = (e) => {
      const s = spin.current
      if (!s.dragging) return
      s.yaw += (e.clientX - s.lastX) * 0.012
      s.lastX = e.clientX
    }
    const up = () => (spin.current.dragging = false)
    node.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      node.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [])

  return (
    <div ref={el} className={`cursor-grab touch-pan-y active:cursor-grabbing ${className}`} aria-label="3D avatar preview. Drag to turn." role="img">
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ position: [0, 2.9, 5.6], fov: 40 }}
        onCreated={({ camera }) => camera.lookAt(0, 0.6, 0)}
        gl={{ antialias: true, alpha: true }}
        fallback={<p className="grid h-full place-items-center p-4 text-center text-sm text-slate-400">3D preview needs WebGL.</p>}
      >
        <Stage look={look} spin={spin} />
      </Canvas>
    </div>
  )
}
