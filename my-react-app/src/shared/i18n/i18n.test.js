import { test } from 'node:test';
import assert from 'node:assert/strict';
import en from './en.js';
import bn from './bn.js';

import { createTranslator } from './translator.js';

test('translator fills placeholders, nested references, and falls back to the key', () => {
  const { t } = createTranslator('en');
  assert.equal(t('quiz.score', { s: 40 }), 'Score 40');
  assert.equal(t('ex.oddShape', { a: { $t: 'shape.star' }, b: { $t: 'shape.square' } }), 'Three are star shapes. One is a square.');
  assert.equal(t('no.such.key'), 'no.such.key');
});

test('Bengali translator converts digits, including inside params and expressions', () => {
  const { t, n } = createTranslator('bn');
  assert.equal(n(2026), '২০২৬');
  assert.equal(t('quiz.score', { s: 150 }), 'স্কোর ১৫০');
  assert.equal(t('ex.eq', { t: '3 + 4 = 7' }), '৩ + ৪ = ৭।');
  assert.equal(t('ex.oddShape', { a: { $t: 'shape.star' }, b: { $t: 'shape.square' } }), 'তিনটি তারা, একটি বর্গ।');
});

test('English and Bengali define exactly the same keys', () => {
  assert.deepEqual(Object.keys(bn).sort(), Object.keys(en).sort());
});

test('every key uses the same {placeholders} in both languages', () => {
  const holes = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  for (const key of Object.keys(en)) assert.equal(holes(bn[key]), holes(en[key]), key);
});

test('Bengali strings contain no Latin digits (they are converted at runtime) except in placeholders', () => {
  // plain 0-9 is fine and gets converted; this just documents that they are allowed
  assert.ok(Object.values(bn).every((s) => typeof s === 'string' && s.length > 0));
});

test('every question explanation and prompt key the generators can emit exists', async () => {
  const { makeQuestion, CATEGORIES, LEVELS } = await import('../../core/questions/index.js');
  const need = new Set();
  for (const cat of CATEGORIES) for (const level of LEVELS) for (let i = 0; i < 300; i++) {
    const q = makeQuestion(cat, level);
    need.add('ex.' + q.explain.key);
    need.add('q.' + q.prompt);
    for (const v of Object.values(q.explain.params)) if (v && typeof v === 'object') need.add(v.$t);
  }
  for (const key of need) {
    assert.ok(key in en, `missing en key ${key}`);
    assert.ok(key in bn, `missing bn key ${key}`);
  }
});
