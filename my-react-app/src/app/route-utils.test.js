import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchPath, parseHash, resolve, withQuery } from './route-utils.js';

test('parseHash splits path and query, and defaults to /', () => {
  const a = parseHash('#/play/endless?cat=mixed&lvl=2');
  assert.equal(a.path, '/play/endless');
  assert.equal(a.query.get('lvl'), '2');
  assert.equal(parseHash('').path, '/');
  assert.equal(parseHash('#').path, '/');
});

test('matchPath extracts params and rejects other shapes', () => {
  assert.deepEqual(matchPath('/play/:mode', '/play/classic'), { mode: 'classic' });
  assert.equal(matchPath('/play/:mode', '/play'), null);
  assert.equal(matchPath('/play/:mode', '/results/classic'), null);
  assert.deepEqual(matchPath('/', '/'), {});
});

test('resolve returns the first matching route', () => {
  const routes = [{ path: '/' }, { path: '/play/:mode' }];
  assert.equal(resolve(routes, '/play/x').params.mode, 'x');
  assert.equal(resolve(routes, '/nope'), null);
});

test('withQuery drops empty values', () => {
  assert.equal(withQuery('/leaderboard', { mode: 'classic', cat: '', lvl: 0 }), '/leaderboard?mode=classic');
  assert.equal(withQuery('/', {}), '/');
});
