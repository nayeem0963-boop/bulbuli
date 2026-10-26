import { useFrame, useThree } from '@react-three/fiber'
import { highlightRecorder, hypeScore } from '../../clip/highlightRecorder'
import { useVfxQuality } from '../../hooks/useVisualFx'
import { runtime } from '../../stores/runtime'
import { GameStatus, useGameStore } from '../../stores/useGameStore'
import { ghostRecorder, runStats } from '../../systems/runStats'
import { vfx } from '../../systems/vfx'

/**
 * Bridges the render loop to the run recorders:
 *   - run stats (top speed, air/grind/wall time)
 *   - ghost path (10 Hz)
 *   - highlight clip frames
 *
 * Runs at useFrame priority 2, i.e. AFTER <EffectComposer/> (priority 1) has
 * drawn the frame, so the canvas still holds this frame's pixels when we copy
 * it. (Note: any priority > 0 disables R3F's automatic render — that's fine
 * here because the EffectComposer already owns rendering.)
 */
export function CaptureBridge() {
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const quality = useVfxQuality()

  useFrame((_, delta) => {
    const { status, score } = useGameStore.getState()
    if (status !== GameStatus.PLAYING) return
    const dt = Math.min(delta, 0.05)
    const mode = runtime.playerMode
    const time = runtime.gameTime

    runStats.sample(dt, runtime.speed, mode)
    ghostRecorder.sample(dt, time, runtime.playerPosition, mode)

    highlightRecorder.configure(quality, size.width / Math.max(1, size.height))
    const hype = hypeScore({ speed: runtime.speed, surge: vfx.surge, mode })
    highlightRecorder.capture(gl.domElement, time, hype, {
      speedKmh: Math.round(runtime.speed * 3.6),
      score,
      mode,
      surge: vfx.surge > 0.5,
    })
  }, 2)

  return null
}
