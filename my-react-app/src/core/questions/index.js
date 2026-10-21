import { createRand } from '../rng.js';
import { arithmetic } from './arithmetic.js';
import { sequence } from './sequence.js';
import { oddOneOut, shapePattern } from './shapes.js';

export { CATEGORIES, LEVELS, SHAPES, COLORS } from './constants.js';

/**
 * One question for a topic and level.
 * @param {'mixed'|'number'|'pattern'|'arithmetic'} category
 * @param {1|2|3} level
 * @param {() => number} [rng]
 * @returns {import('./constants.js').Question}
 */
export function makeQuestion(category, level, rng) {
  const R = createRand(rng);
  const topic = category === 'mixed' ? R.pick(['number', 'pattern', 'arithmetic']) : category;
  if (topic === 'number') return sequence(level, R);
  if (topic === 'arithmetic') return arithmetic(level, R);
  return R.chance(0.65) ? shapePattern(level, R) : oddOneOut(level, R);
}

const fingerprint = (q) => JSON.stringify([q.stem, q.options]);

/** A round of unique questions. Using a seeded rng makes the whole round repeatable. */
export function makeRound(category, level, count = 10, rng) {
  const out = [];
  const seen = new Set();
  for (let guard = 0; out.length < count && guard < 400; guard++) {
    const q = makeQuestion(category, level, rng);
    const fp = fingerprint(q);
    if (!seen.has(fp)) {
      seen.add(fp);
      out.push(q);
    }
  }
  return out;
}
