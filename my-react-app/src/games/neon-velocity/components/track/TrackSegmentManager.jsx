import { useState } from 'react'
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
/**
 * The streaming state (generator, generated descriptions, which ids are live) as plain JS, outside
 * React. `update()` advances it with the player and returns the live segments when that set
 * changed, or null when it didn't.
 */
function createTrackStream() {
  let generator = null
  const list = []
  let liveKey = null

  return {
    update() {
      if (!generator) {
        // Daily course → shared deterministic seed (fair rankings, ghosts line up); otherwise random.
        // The difficulty shapes the layout too, so each mode's daily course is its own fixed track.
        const { course, difficulty } = useGameStore.getState()
        const seed = course?.seed ?? ((Math.random() * 2 ** 31) | 0)
        generator = createSegmentGenerator(seed, difficultyConfig(course?.difficulty ?? difficulty))
      }
      const pz = runtime.playerPosition.z

      // Generate ahead
      while (!list.length || list[list.length - 1].z1 > pz - SPAWN_AHEAD) {
        list.push(generator.next())
      }
      // Discard behind
      while (list.length && list[0].z1 > pz + DESPAWN_BEHIND) list.shift()

      const live = list.filter((seg) => seg.z0 > pz - SPAWN_AHEAD)
      const key = live.map((seg) => seg.id).join()
      if (key === liveKey) return null
      liveKey = key
      return live
    },
  }
}

export function TrackSegmentManager() {
  // one stream per mount (the parent keys this by run); the first segments exist from the first
  // render, so physics never steps before the track is there
  const [stream] = useState(createTrackStream)
  const [visible, setVisible] = useState(() => stream.update() ?? [])

  useFrame(() => {
    const next = stream.update()
    if (next) setVisible(next)
  })

  return visible.map((segment) => <TrackSegment key={segment.id} segment={segment} />)
}
