// Proves every built-in level can be finished, using the real physics engine and a brute-force
// search (src/features/voxelcraft/play/solver.js). Slow (a few minutes), so it's a separate script from `npm test`:
//   npm run check:voxelcraft-levels
import { createMockCommunityLevels } from '../src/features/voxelcraft/data/communityLevels.js'
import { mockStarterLevel } from '../src/features/voxelcraft/data/mockData.js'
import { parseLevel } from '../src/features/voxelcraft/level/levelSchema.js'
import { canReachFinish } from '../src/features/voxelcraft/play/solver.js'

const levels = [
  { title: `${mockStarterLevel.title} (Studio starter)`, level: parseLevel(mockStarterLevel).level },
  ...createMockCommunityLevels(),
]
let failed = 0
for (const { title, level } of levels) {
  const t0 = Date.now()
  const { beatable, spots } = canReachFinish(level, { maxSpots: 2500 })
  if (!beatable) failed++
  console.log(`${beatable ? 'ok  ' : 'FAIL'} ${title.padEnd(34)} ${String(spots).padStart(4)} spots  ${((Date.now() - t0) / 1000).toFixed(1)}s`)
}
process.exitCode = failed ? 1 : 0
