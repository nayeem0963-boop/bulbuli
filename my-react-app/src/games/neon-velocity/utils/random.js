/** mulberry32 — tiny, fast, seedable PRNG returning floats in [0, 1). */
export function createRng(seed) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  next.range = (min, max) => min + next() * (max - min)
  next.int = (min, maxInclusive) => Math.floor(min + next() * (maxInclusive - min + 1))
  next.pick = (arr) => arr[Math.floor(next() * arr.length)]
  next.chance = (p) => next() < p
  next.shuffle = (arr) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  /** weights: [[value, weight], ...] */
  next.weighted = (weights) => {
    const total = weights.reduce((sum, [, w]) => sum + w, 0)
    let r = next() * total
    for (const [value, w] of weights) {
      if ((r -= w) <= 0) return value
    }
    return weights[weights.length - 1][0]
  }
  return next
}
