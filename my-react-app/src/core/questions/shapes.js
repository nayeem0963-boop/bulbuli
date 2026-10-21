import { COLORS, SHAPES, lcm, shapeKey } from './constants.js';

/** Repeating shape/colour pattern. Harder levels make the two cycles overlap. */
export function shapePattern(level, R) {
  const [shapeLoop, colorLoop] =
    level === 1 ? [R.pick([2, 3]), 1] : level === 2 ? R.pick([[1, 3], [2, 2], [3, 1]]) : R.pick([[2, 3], [3, 2]]);
  const shapes = R.shuffle(SHAPES).slice(0, shapeLoop);
  const colors = R.shuffle(COLORS).slice(0, colorLoop);
  const at = (i) => ({ shape: shapes[i % shapeLoop], color: colors[i % colorLoop] });

  const period = lcm(shapeLoop, colorLoop);
  const length = Math.min(8, Math.max(6, period + 2));
  const answer = at(length);
  const seq = Array.from({ length }, (_, i) => at(i));

  // Distractors share either the shape or the colour with the answer, so you must check both.
  const pool = new Map([[shapeKey(answer), answer]]);
  let guard = 0;
  while (pool.size < 4 && guard++ < 80) {
    const roll = R.rng();
    const c = roll < 0.4
      ? { shape: R.pick(SHAPES), color: answer.color }
      : roll < 0.7
        ? { shape: answer.shape, color: R.pick(COLORS) }
        : { shape: R.pick(SHAPES), color: R.pick(COLORS) };
    pool.set(shapeKey(c), c);
  }
  const options = R.shuffle([...pool.values()]);
  const explain =
    shapeLoop > 1 && colorLoop > 1 ? { key: 'both', params: { ls: shapeLoop, lc: colorLoop, p: period } }
      : colorLoop > 1 ? { key: 'colorLoop', params: { n: colorLoop } }
        : { key: 'loop', params: { n: shapeLoop } };

  return {
    kind: 'shape', category: 'pattern', prompt: 'nextShape',
    stem: { type: 'shapes', seq },
    optionType: 'shape', options,
    answerIndex: options.findIndex((o) => shapeKey(o) === shapeKey(answer)),
    explain,
  };
}

/** Four shapes, one is different. Level 3 mixes in distracting colours. */
export function oddOneOut(level, R) {
  const [a, b] = R.shuffle(SHAPES);
  const [c1, c2] = R.shuffle(COLORS);
  const sh = (s) => ({ $t: `shape.${s}` });
  const co = (c) => ({ $t: `color.${c}` });
  let same, odd, explain;
  if (level === 1) {
    same = [0, 1, 2].map(() => ({ shape: a, color: c1 }));
    odd = { shape: b, color: c1 };
    explain = { key: 'oddShape', params: { a: sh(a), b: sh(b) } };
  } else if (level === 2) {
    same = [0, 1, 2].map(() => ({ shape: a, color: c1 }));
    odd = { shape: a, color: c2 };
    explain = { key: 'oddColor', params: { a: co(c1), b: co(c2) } };
  } else {
    same = R.shuffle(COLORS).slice(0, 3).map((color) => ({ shape: a, color }));
    odd = { shape: b, color: R.pick(COLORS) };
    explain = { key: 'oddHard', params: { a: sh(a), b: sh(b) } };
  }
  const options = R.shuffle([...same, odd]);
  return {
    kind: 'odd', category: 'pattern', prompt: 'odd', stem: null,
    optionType: 'shape', options, answerIndex: options.indexOf(odd), explain,
  };
}
