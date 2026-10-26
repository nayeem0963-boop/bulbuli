import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { CourseMode } from '../../services/course'
import { sampleGhost } from '../../services/ghostCodec'
import { runtime } from '../../stores/runtime'
import { useGameStore } from '../../stores/useGameStore'
import { useLeaderboardStore } from '../../stores/useLeaderboardStore'
import { BulbuliModel } from './BulbuliModel'

/**
 * Translucent replay of a previous run on the same Daily course.
 * Plays back by run time (runtime.gameTime), so it pauses with the game and
 * stays in sync regardless of frame rate. Publishes runtime.ghostLead
 * (metres the player is ahead; negative = behind) for the HUD.
 */
export function GhostRunner() {
  const course = useGameStore((s) => s.course)
  const raceGhost = useGameStore((s) => s.raceGhost)
  const status = useGameStore((s) => s.status)
  const ghost = useLeaderboardStore((s) => (course ? s.ghosts[course.boardId] : null))
  const group = useRef()
  const cursor = useMemo(() => ({ i: 0 }), [ghost])
  const sample = useMemo(() => ({ x: 0, y: 0, z: 0, mode: 'RUN' }), [])

  const enabled = !!ghost?.data && raceGhost !== 'off' && course?.mode === CourseMode.DAILY
    && status !== 'START'

  useFrame(() => {
    if (!group.current) return
    if (!enabled) { group.current.visible = false; runtime.ghostLead = null; return }
    const alive = sampleGhost(ghost.data, runtime.gameTime, cursor, sample)
    group.current.visible = alive
    if (!alive) { runtime.ghostLead = null; return }
    group.current.position.set(sample.x, sample.y, sample.z)
    runtime.ghostLead = sample.z - runtime.playerPosition.z
  })

  if (!enabled) return null
  return (
    <group ref={group} visible={false}>
      <group position={[0, 0.35, 0]}>
        <BulbuliModel ghost />
      </group>
      <Html center position={[0, 1.55, 0]} zIndexRange={[10, 0]} wrapperClass="nv-ghost-tag-wrap">
        <span className="nv-ghost-tag">{ghost.source === 'top' ? `#1 ${ghost.name}` : 'Your best'}</span>
      </Html>
    </group>
  )
}
