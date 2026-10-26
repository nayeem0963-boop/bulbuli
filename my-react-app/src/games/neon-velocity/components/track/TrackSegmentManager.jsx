import { useCallback, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { DESPAWN_BEHIND, SPAWN_AHEAD } from '../../config/constants'
import { difficultyConfig } from '../../config/difficulty'
import { runtime } from '../../stores/runtime'
import { useGameStore } from '../../stores/useGameStore'
import { createSegmentGenerator } from './segmentGenerator'
import { TrackSegment } from './TrackSegment'

/**
 * TrackSegmentManager — streams the course around the player.
 *
 *   generate: keep descriptions generated until SPAWN_AHEAD metres ahead
 *   mount:    render segments whose near edge is within SPAWN_AHEAD
 *   despawn:  segments whose far edge is DESPAWN_BEHIND metres behind are
 *             unmounted (bodies removed from Rapier, rail/wall registries
 *             cleaned up by their effects) and dropped from memory
 *
 * React only re-renders when the set of live segment ids changes (a few times
 * per second at most), never per frame. It sits inside a <group key={runId}>,
 * so each run gets a fresh generator seeded from the current course.
 */
export function TrackSegmentManager() {
  const generator = useRef(null)
  const segments = useRef([])
  const visibleKey = useRef('')

  const compute = useCallback(() => {
    if (!generator.current) {
      // Daily course → shared deterministic seed (fair rankings, ghosts line up); otherwise random.
      // The difficulty shapes the layout too, so each mode's daily course is its own fixed track.
      const { course, difficulty } = useGameStore.getState()
      const seed = course?.seed ?? ((Math.random() * 2 ** 31) | 0)
      generator.current = createSegmentGenerator(seed, difficultyConfig(course?.difficulty ?? difficulty))
    }
    const pz = runtime.playerPosition.z
    const list = segments.current

    // Generate ahead
    while (!list.length || list[list.length - 1].z1 > pz - SPAWN_AHEAD) {
      list.push(generator.current.next())
    }
    // Discard behind
    while (list.length && list[0].z1 > pz + DESPAWN_BEHIND) list.shift()

    return list.filter((s) => s.z0 > pz - SPAWN_AHEAD)
  }, [])

  const [visible, setVisible] = useState(() => {
    const initial = compute()
    visibleKey.current = initial.map((s) => s.id).join()
    return initial
  })

  useFrame(() => {
    const next = compute()
    const key = next.map((s) => s.id).join()
    if (key !== visibleKey.current) {
      visibleKey.current = key
      setVisible(next)
    }
  })

  return visible.map((segment) => <TrackSegment key={segment.id} segment={segment} />)
}
