import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeQuestion, makeRound, CATEGORIES, LEVELS } from './index.js';
import { mulberry32 } from '../rng.js';
import { shapeKey } from './constants.js';

const topics = CATEGORIES.filter((c) => c !== 'mixed');

test('every generated question is well-formed (all topics, all levels)', () => {
  for (const cat of topics) for (const level of LEVELS) for (let i = 0; i < 400; i++) {
    const q = makeQuestion(cat, level);
    assert.equal(q.options.length, 4, `${cat}/${level} needs 4 options`);
    assert.ok(q.answerIndex >= 0 && q.answerIndex < 4, 'answerIndex in range');
    const keys = q.options.map((o) => (q.optionType === 'shape' ? shapeKey(o) : o));
    // odd-one-out deliberately repeats the same shape three times
    if (q.kind !== 'odd') assert.equal(new Set(keys).size, 4, `${cat}/${level} options must be unique: ${keys}`);
    assert.ok(q.explain.key, 'has explanation');
    assert.ok(q.prompt, 'has prompt');
  }
});

test('arithmetic: the marked answer really solves the equation', () => {
  for (const level of LEVELS) for (let i = 0; i < 500; i++) {
    const q = makeQuestion('arithmetic', level);
    const given = q.options[q.answerIndex];
    const filled = q.stem.text.replace('?', given).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    const [left, right] = filled.split('=');
    assert.equal(Function(`return (${left})`)(), Function(`return (${right})`)(), `${q.stem.text} with ${given}`);
  }
});

test('arithmetic: no other option also solves it', () => {
  for (const level of LEVELS) for (let i = 0; i < 300; i++) {
    const q = makeQuestion('arithmetic', level);
    const ok = q.options.filter((opt) => {
      const [l, r] = q.stem.text.replace('?', opt).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').split('=');
      return Function(`return (${l})`)() === Function(`return (${r})`)();
    });
    assert.equal(ok.length, 1, q.stem.text + ' -> ' + q.options);
  }
});

test('sequences: answer continues the same rule', () => {
  for (const level of LEVELS) for (let i = 0; i < 300; i++) {
    const q = makeQuestion('number', level);
    assert.equal(q.stem.nums.length, 5);
    assert.equal(Number(q.options[q.answerIndex]), q.answer);
  }
});

test('shape patterns: the answer follows the loop', () => {
  for (const level of LEVELS) for (let i = 0; i < 300; i++) {
    const q = makeQuestion('pattern', level);
    if (q.kind !== 'shape') continue;
    const seq = q.stem.seq;
    // find the smallest period that explains the visible sequence, then check the answer
    const period = [1, 2, 3, 4, 5, 6].find((p) => seq.every((it, k) => k < p || shapeKey(it) === shapeKey(seq[k - p])));
    assert.ok(period, 'sequence is periodic');
    const expected = seq[seq.length - period];
    assert.equal(shapeKey(q.options[q.answerIndex]), shapeKey(expected));
  }
});

test('odd-one-out: exactly one option differs from the other three', () => {
  for (const level of LEVELS) for (let i = 0; i < 300; i++) {
    let q;
    do { q = makeQuestion('pattern', level); } while (q.kind !== 'odd');
    const oddKey = shapeKey(q.options[q.answerIndex]);
    const others = q.options.filter((_, k) => k !== q.answerIndex);
    if (level === 1) assert.ok(others.every((o) => o.shape === others[0].shape) && q.options[q.answerIndex].shape !== others[0].shape);
    if (level === 2) assert.ok(others.every((o) => o.color === others[0].color) && q.options[q.answerIndex].color !== others[0].color);
    if (level === 3) assert.ok(others.every((o) => o.shape === others[0].shape) && q.options[q.answerIndex].shape !== others[0].shape);
    assert.ok(!others.some((o) => shapeKey(o) === oddKey));
  }
});

test('a seeded rng reproduces the same round', () => {
  const a = makeRound('mixed', 2, 10, mulberry32(42));
  const b = makeRound('mixed', 2, 10, mulberry32(42));
  const c = makeRound('mixed', 2, 10, mulberry32(43));
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test('rounds contain 10 unique questions', () => {
  for (const cat of CATEGORIES) for (const level of LEVELS) {
    const round = makeRound(cat, level, 10);
    assert.equal(round.length, 10, `${cat}/${level}`);
    assert.equal(new Set(round.map((q) => JSON.stringify([q.stem, q.options]))).size, 10);
  }
});
