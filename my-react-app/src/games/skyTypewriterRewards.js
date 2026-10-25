/** Extra XP for finishing the whole flight (reaching the target score). */
export const SKY_TYPEWRITER_VICTORY_BONUS = 25

/**
 * XP for one flight:
 *   score / 10  +  2 per word typed  +  10 if accuracy ≥ 90%  +  25 for a victory.
 * Accuracy is the multiplier-like part: careless mashing costs the 10-XP bonus,
 * and wrong keys don't finish words, so they don't earn score or word XP either.
 */
export function calculateSkyTypewriterXp({ score = 0, wordsTyped = 0, accuracy = 100, won = false } = {}) {
  const safeScore = Number.isFinite(score) ? Math.max(0, score) : 0
  const safeWords = Number.isFinite(wordsTyped) ? Math.max(0, wordsTyped) : 0
  const safeAccuracy = Number.isFinite(accuracy) ? Math.max(0, Math.min(100, accuracy)) : 0

  return Math.floor(safeScore / 10)
    + (Math.floor(safeWords) * 2)
    + (safeWords > 0 && safeAccuracy >= 90 ? 10 : 0)
    + (won === true ? SKY_TYPEWRITER_VICTORY_BONUS : 0)
}
