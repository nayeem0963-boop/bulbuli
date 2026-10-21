import { numberOptions } from './arithmetic.js';

const range = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));

// Each kind returns { terms: number[6], explain }. The 6th term is the answer.
const KINDS = {
  add: (R) => { const s = R.int(2, 9), a = R.int(1, 20); return { terms: range(6, (i) => a + s * i), explain: { key: 'up', params: { s } } }; },
  sub: (R) => { const s = R.int(2, 8), a = s * 5 + R.int(5, 20); return { terms: range(6, (i) => a - s * i), explain: { key: 'down', params: { s } } }; },
  add2: (R) => { const s = R.int(10, 25), a = R.int(5, 50); return { terms: range(6, (i) => a + s * i), explain: { key: 'up', params: { s } } }; },
  geo: (R) => { const m = R.pick([2, 3]), a = R.int(1, 4); return { terms: range(6, (i) => a * m ** i), explain: { key: 'times', params: { m } } }; },
  square: (R) => { const n = R.int(1, 5); return { terms: range(6, (i) => (n + i) ** 2), explain: { key: 'squares', params: { n, n1: n + 1 } } }; },
  cube: (R) => { const n = R.int(1, 3); return { terms: range(6, (i) => (n + i) ** 3), explain: { key: 'cubes', params: { n, n1: n + 1 } } }; },
  grow: (R) => {
    const d = R.int(1, 3), terms = [R.int(1, 10)];
    for (let i = 0; i < 5; i++) terms.push(terms[i] + d + i);
    return { terms, explain: { key: 'grow', params: { d, d1: d + 1, d2: d + 2 } } };
  },
  fib: (R) => {
    const terms = [R.int(1, 4), R.int(2, 6)];
    for (let i = 2; i < 6; i++) terms.push(terms[i - 1] + terms[i - 2]);
    return { terms, explain: { key: 'fib', params: {} } };
  },
  alt: (R) => {
    const x = R.int(4, 9), y = R.int(1, x - 1), terms = [R.int(5, 20)];
    for (let i = 0; i < 5; i++) terms.push(terms[i] + (i % 2 === 0 ? x : -y));
    return { terms, explain: { key: 'alt', params: { x, y } } };
  },
};

const BY_LEVEL = {
  1: ['add', 'sub'],
  2: ['add2', 'geo', 'square'],
  3: ['grow', 'fib', 'alt', 'cube'],
};

/** @returns {import('./constants.js').Question} */
export function sequence(level, R) {
  const { terms, explain } = KINDS[R.pick(BY_LEVEL[level])](R);
  const answer = terms[5];
  const nums = terms.slice(0, 5);
  return {
    kind: 'number',
    category: 'number',
    prompt: 'nextNumber',
    stem: { type: 'numbers', nums },
    explain,
    answer,
    ...numberOptions(R, answer, Math.max(3, Math.round(Math.abs(answer - nums[4]) / 2))),
  };
}
