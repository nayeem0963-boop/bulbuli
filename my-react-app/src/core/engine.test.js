import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameReducer, initGame, nextQuestion, isLastQuestion, summarize } from './engine.js';
import { levelFor, pointsFor } from './modes.js';
import { mulberry32 } from './rng.js';
import { Clock } from './clock.js';
import { createStore } from './store.js';

const rng = () => mulberry32(7);
const start = (mode, level = 1) => initGame({ mode, category: 'arithmetic', level, rng: rng() });
const right = (s) => s.question.answerIndex;
const wrong = (s) => (s.question.answerIndex + 1) % 4;

test('classic: scoring rewards speed and streaks', () => {
  assert.equal(pointsFor('classic', { fraction: 1, streak: 0 }), 150);
  assert.equal(pointsFor('classic', { fraction: 0, streak: 0 }), 100);
  assert.equal(pointsFor('classic', { fraction: 0.5, streak: 3 }), 155);
  assert.equal(pointsFor('classic', { fraction: 0, streak: 99 }), 150); // streak bonus capped at 5
});

test('endless: points grow with level, streak bonus capped at 8', () => {
  assert.equal(pointsFor('endless', { level: 1, streak: 0 }), 100);
  assert.equal(pointsFor('endless', { level: 3, streak: 0 }), 150);
  assert.equal(pointsFor('endless', { level: 1, streak: 99 }), 180);
});

test('endless: level climbs every 6 right answers and stops at 3', () => {
  assert.equal(levelFor('endless', 1, 5), 1);
  assert.equal(levelFor('endless', 1, 6), 2);
  assert.equal(levelFor('endless', 1, 12), 3);
  assert.equal(levelFor('endless', 1, 99), 3);
  assert.equal(levelFor('endless', 3, 0), 3);
  assert.equal(levelFor('classic', 2, 50), 2);
});

test('a right answer scores and extends the streak', () => {
  let s = start('classic');
  s = gameReducer(s, { type: 'ANSWER', idx: right(s), fraction: 1 });
  assert.equal(s.status, 'answered');
  assert.equal(s.correct, 1);
  assert.equal(s.streak, 1);
  assert.equal(s.score, 150);
});

test('a wrong answer or timeout resets the streak and scores nothing', () => {
  let s = start('classic');
  s = gameReducer(s, { type: 'ANSWER', idx: right(s), fraction: 1 });
  s = gameReducer(s, { type: 'NEXT', question: nextQuestion(s) });
  s = gameReducer(s, { type: 'ANSWER', idx: wrong(s), fraction: 1 });
  assert.equal(s.streak, 0);
  assert.equal(s.bestStreak, 1);
  assert.equal(s.score, 150);
  s = gameReducer(s, { type: 'NEXT', question: nextQuestion(s) });
  s = gameReducer(s, { type: 'ANSWER', idx: -1, fraction: 0 });
  assert.equal(s.picked, -1);
  assert.equal(s.total, 3);
});

test('a second answer to the same question is ignored', () => {
  let s = start('classic');
  s = gameReducer(s, { type: 'ANSWER', idx: right(s), fraction: 1 });
  const again = gameReducer(s, { type: 'ANSWER', idx: right(s), fraction: 1 });
  assert.equal(again, s);
});

test('classic ends after 10 questions', () => {
  let s = start('classic');
  for (let i = 0; i < 10; i++) {
    assert.equal(s.qIndex, i);
    s = gameReducer(s, { type: 'ANSWER', idx: right(s), fraction: 0 });
    if (isLastQuestion(s)) break;
    s = gameReducer(s, { type: 'NEXT', question: nextQuestion(s) });
  }
  assert.ok(isLastQuestion(s));
  // zero time bonus; streak bonus is 0,10,20,30,40 then capped at 50 for the other five answers
  assert.deepEqual(summarize(s), { score: 1000 + 100 + 250, correct: 10, total: 10, bestStreak: 10 });
});

test('endless never runs out of questions and gets harder', () => {
  let s = start('endless');
  for (let i = 0; i < 13; i++) {
    s = gameReducer(s, { type: 'ANSWER', idx: right(s), fraction: 0 });
    s = gameReducer(s, { type: 'NEXT', question: nextQuestion(s) });
  }
  assert.equal(s.level, 3);
  assert.equal(isLastQuestion(s), false);
});

test('FINISH locks the run: nothing changes afterwards', () => {
  let s = start('endless');
  s = gameReducer(s, { type: 'FINISH' });
  assert.equal(s.status, 'over');
  assert.equal(gameReducer(s, { type: 'ANSWER', idx: right(s), fraction: 0 }), s);
  assert.equal(gameReducer(s, { type: 'NEXT', question: s.question }), s);
});

/* ---------------- Clock ---------------- */
function fakeClock(opts = {}) {
  let t = 0;
  const fired = [];
  const clock = new Clock({ now: () => t, setTimer: () => 1, clearTimer: () => {}, onExpire: () => fired.push(t), ...opts });
  return { clock, fired, advance: (ms) => { t += ms; clock.tick(); } };
}

test('clock counts down and reports whole seconds rounded up', () => {
  const { clock, advance } = fakeClock();
  clock.start(10);
  assert.equal(clock.getSecond(), 10);
  advance(2500);
  assert.equal(clock.remaining(), 7.5);
  assert.equal(clock.getSecond(), 8);
});

test('clock pause freezes time and resume continues', () => {
  const { clock, advance } = fakeClock();
  clock.start(10);
  advance(3000);
  clock.pause();
  advance(5000);
  assert.equal(clock.remaining(), 7);
  clock.resume();
  advance(1000);
  assert.equal(clock.remaining(), 6);
});

test('clock add is clamped to the cap and to zero, and expiry fires once', () => {
  const { clock, fired, advance } = fakeClock({ cap: 90 });
  clock.start(60);
  clock.add(100);
  assert.equal(clock.remaining(), 90);
  clock.add(-85);
  assert.equal(clock.remaining(), 5);
  advance(5000);
  assert.deepEqual(fired, [5000]);
  advance(5000);
  assert.equal(fired.length, 1);
  assert.equal(clock.running, false);
});

test('clock add that reaches zero expires immediately', () => {
  const { clock, fired } = fakeClock();
  clock.start(4);
  clock.add(-5);
  assert.equal(fired.length, 1);
  assert.equal(clock.remaining(), 0);
});

test('clock notifies subscribers only when the displayed second changes', () => {
  const { clock, advance } = fakeClock();
  let calls = 0;
  clock.subscribe(() => calls++);
  clock.start(10);
  const base = calls;
  for (let i = 0; i < 9; i++) advance(100); // 0.9s: ceil goes 10 -> 10 ... stays 10 until 1.0s
  assert.equal(calls - base, 0);
  advance(100);
  assert.equal(calls - base, 1);
});

/* ---------------- Store ---------------- */
function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m };
}

test('store persists, reloads, and notifies', () => {
  const storage = fakeStorage();
  const a = createStore({ n: 0, tag: 'x' }, { key: 'k', storage });
  let seen = 0;
  a.subscribe(() => seen++);
  a.set({ n: 5 });
  a.set((s) => ({ n: s.n + 1 }));
  assert.equal(a.get().n, 6);
  assert.equal(seen, 2);
  const b = createStore({ n: 0, tag: 'x' }, { key: 'k', storage });
  assert.equal(b.get().n, 6);
  assert.equal(b.get().tag, 'x');
});

test('store ignores corrupt or old-version data and can migrate legacy keys', () => {
  const storage = fakeStorage();
  storage.setItem('k', '{not json');
  assert.equal(createStore({ n: 1 }, { key: 'k', storage }).get().n, 1);
  storage.setItem('k', JSON.stringify({ v: 0, data: { n: 9 } }));
  assert.equal(createStore({ n: 1 }, { key: 'k', storage }).get().n, 1);
  storage.setItem('legacy', '42');
  const s = createStore({ n: 1 }, { key: 'k2', storage, migrate: (st) => ({ n: Number(st.getItem('legacy')) }) });
  assert.equal(s.get().n, 42);
});
