import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import SkyTypewriterHUD from './SkyTypewriterHUD.jsx'
import WordHitEffects from './WordHitEffects.jsx'

function CameraFollow() {
  const player = useRef(null)
  const { camera, scene } = useThree()
  const cameraOffset = useMemo(() => new Vector3(0, 1.2, -5), [])
  const lookAhead = useMemo(() => new Vector3(0, 0.2, 2.5), [])
  const playerPosition = useMemo(() => new Vector3(), [])
  const cameraPosition = useMemo(() => new Vector3(), [])
  const lookAtPosition = useMemo(() => new Vector3(), [])

  useFrame((_, delta) => {
    if (!player.current) player.current = scene.getObjectByName('PlayerBird3D')
    if (!player.current) return

    player.current.getWorldPosition(playerPosition)
    cameraPosition.copy(playerPosition).add(cameraOffset)
    lookAtPosition.copy(playerPosition).add(lookAhead)

    const smoothing = 1 - Math.exp(-4 * delta)
    camera.position.lerp(cameraPosition, smoothing)
    camera.lookAt(lookAtPosition)
  })

  return null
}

export default function SkyTypewriter3D({
  children,
  className,
  style,
  effectsRef,
  score = 0,
  lives = 3,
  combo = 0,
  paused = false,
  onTogglePause,
  status = 'PLAYING',
}) {
  return (
    <Canvas
      className={className}
      style={{ width: '100%', height: '100%', ...style }}
      camera={{ position: [0, 0.2, -5], fov: 45, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      shadows="soft"
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#87CEEB']} />
      <ambientLight intensity={0.7} />
      <directionalLight
        castShadow
        position={[5, 8, 5]}
        intensity={1.2}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
        shadow-radius={4}
      />
      <CameraFollow />
      <WordHitEffects effectsRef={effectsRef} />
      <SkyTypewriterHUD
        score={score}
        lives={lives}
        combo={combo}
        paused={paused}
        onTogglePause={onTogglePause}
        status={status}
      />
      {children}
    </Canvas>
  )
}
