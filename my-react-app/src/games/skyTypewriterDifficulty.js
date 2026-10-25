const MAX_DIFFICULTY_LEVEL = 5

export function getSkyTypewriterDifficulty(score = 0) {
  const safeScore = Number.isFinite(score) ? Math.max(0, score) : 0
  const level = Math.min(MAX_DIFFICULTY_LEVEL, Math.floor(safeScore / 100))
  const progress = Math.min(MAX_DIFFICULTY_LEVEL, safeScore / 100)

  return {
    level,
    minWordLength: 3 + level,
    spawnIntervalMultiplier: 1 - (level * 0.15),
    speedMultiplier: 1 + (progress * 0.2),
    flightSpeed: 8 * (1 + (progress * 0.2)),
  }
}
