// Seedable random helpers. Pass a seeded rng (e.g. mulberry32(dayNumber)) to get repeatable
// rounds, which is what a "daily challenge" or a reliable unit test needs.

/** Small, fast, good-enough seeded generator. Returns floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Bundle of helpers bound to one rng.
 * @param {() => number} [rng]
 */
export function createRand(rng = Math.random) {
  const int = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
  const pick = (list) => list[int(0, list.length - 1)];
  const chance = (p) => rng() < p;
  const shuffle = (list) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return { rng, int, pick, chance, shuffle };
}
