import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { COLORS } from '../../config/constants'
import { useGameStore } from '../../stores/useGameStore'
import { CameraRig } from './CameraRig'
import { CaptureBridge } from './CaptureBridge'
import { PostFX } from './PostFX'
import { Backdrop } from '../environment/Backdrop'
import { Billboards } from '../environment/Billboards'
import { Lighting } from '../environment/Lighting'
import { Starfield } from '../environment/Starfield'
import { SynthSun } from '../environment/SynthSun'
import { GhostRunner } from '../player/GhostRunner'
import { PlayerPhysics } from '../player/PlayerPhysics'
import { TrackSegmentManager } from '../track/TrackSegmentManager'
import { ParticleSystem } from '../vfx/ParticleSystem'
import { PlayerTrail } from '../vfx/PlayerTrail'
import { SpeedLines } from '../vfx/SpeedLines'
import { VfxDirector } from '../vfx/VfxDirector'

/**
 * The 3D scene. No physics engine: the player moves itself every frame and collides
 * with axis-aligned boxes that the track pieces, hazards and pickups register in
 * systems/collisionWorld.js. Nothing to load up front, so no <Suspense> is needed.
 */
export function GameCanvas() {
  const runId = useGameStore((s) => s.runId)
  const setVfxQuality = useGameStore((s) => s.setVfxQuality)
  const [dpr, setDpr] = useState(() => Math.min(1.5, window.devicePixelRatio))

  return (
    <Canvas
      className="nv-game-canvas"
      dpr={dpr}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 60, near: 0.1, far: 800, position: [0, 3.2, 7.5] }}
    >
      {/* Adaptive resolution; if FPS keeps flip-flopping, drop to low VFX quality */}
      <PerformanceMonitor
        onIncline={() => setDpr(Math.min(2, window.devicePixelRatio))}
        onDecline={() => setDpr(1)}
        flipflops={3}
        onFallback={() => { setDpr(1); setVfxQuality('low') }}
      />

      <color attach="background" args={[COLORS.background]} />
      <fog attach="fog" args={[COLORS.fog, 30, 190]} />

      {/* Drives shared shader uniforms + event-based effects */}
      <VfxDirector />

      <Lighting />
      <SynthSun />
      <Starfield />
      <Billboards />
      <Backdrop />

      {/* key={runId}: a restart remounts the course and the player, so every collision
          shape unregisters and the new run starts from a clean world */}
      <group key={runId}>
        <TrackSegmentManager />
        <PlayerPhysics />
      </group>

      {/* Ghost replay + world-space VFX (they read runtime state) */}
      <GhostRunner />
      <PlayerTrail />
      <ParticleSystem />
      <SpeedLines />

      <CameraRig />
      <PostFX />
      {/* After the composer renders: feeds stats, ghost and highlight recorders */}
      <CaptureBridge />
    </Canvas>
  )
}
