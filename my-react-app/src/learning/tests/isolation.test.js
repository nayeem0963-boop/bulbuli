// L1/L2: development-preview isolation (design 1.6, I2–I9). I1 (production build) is in
// isolation-build.test.js. These are NOT real-browser proofs; the real-browser tests B1–B6 run in
// Stage 2A-2 against the actual preview page (design 1.6 test levels).
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { AdapterProvider, MissingAdapterError, useLearningAdapter } from '../adapters/adapterContext.js'
import * as previewModule from '../adapters/preview.js'
import { createPreviewAdapter, PreviewInProductionError } from '../adapters/preview.js'
import { LIVE_DB_NAME, PREVIEW_DB_NAME } from '../store/schema.js'
import { forbiddenReached, REPO_ROOT, rel, walkImports } from './importGraph.js'
import { freshFactory, playFlight, playStation, reportAnswers, USER_A } from './helpers.js'

const abs = (p) => resolve(REPO_ROOT, p)
const listFiles = (dir) => (existsSync(dir) ? readdirSync(dir, { recursive: true }).map((f) => join(dir, f)).filter((f) => statSync(f).isFile()) : [])

/* ------------------------------------------------------------------ I2 build configuration */

test('I2: vite.config.js still builds exactly the three existing pages; nothing under dev-preview/ is in public/', () => {
  const config = readFileSync(abs('vite.config.js'), 'utf8')
  const inputBlock = config.slice(config.indexOf('input: {'), config.indexOf('}', config.indexOf('input: {')) + 1)
  const inputs = [...inputBlock.matchAll(/path\.resolve\(__dirname,\s*'([^']+)'\)/g)].map((m) => m[1])
  assert.deepEqual(inputs, ['index.html', 'share/math-hero/index.html', 'quiz/index.html'])
  assert.ok(!/dev-preview|learning/.test(config), 'vite.config.js does not mention the preview or src/learning')
  assert.equal(existsSync(abs('public/dev-preview')), false)
  assert.equal(listFiles(abs('public')).some((f) => /phase2a|dev-preview/i.test(f)), false)
})

/* ------------------------------------------------------------------ I3 / I4 import graphs */

test('I3: the preview adapter\'s import graph reaches no Supabase, XP, progress, auth, badge, achievement, registry or live-adapter code', () => {
  const graph = walkImports(abs('src/learning/adapters/preview.js'))
  assert.deepEqual(graph.unresolved, [])
  assert.deepEqual(forbiddenReached(graph), [])
  assert.ok(graph.files.every((f) => f.startsWith('src/learning/')), `only src/learning/ files: ${graph.files.join(', ')}`)
})

test('I3: the dev-preview entry page\'s import graph is clean', { skip: !existsSync(abs('dev-preview/phase-2a/main.jsx')) && 'dev-preview/phase-2a/main.jsx is created in Stage 2A-2' }, () => {
  const graph = walkImports(abs('dev-preview/phase-2a/main.jsx'))
  assert.deepEqual(forbiddenReached(graph), [])
})

test('I4: files in the new game folders import none of the forbidden modules (vacuous until 2A-2 creates them)', () => {
  const files = [...listFiles(abs('src/games/sky-science')), ...listFiles(abs('src/games/world-explorer'))].filter((f) => /\.(js|jsx)$/.test(f))
  for (const file of files) assert.deepEqual(forbiddenReached(walkImports(file)), [], rel(file))
})

test('I4/I5: one-way dependencies: old games and the app never import src/learning, sky-science or world-explorer', () => {
  const NEW = ['src/learning/', 'src/games/sky-science/', 'src/games/world-explorer/']
  for (const entry of ['src/main.jsx', 'src/arcade-entry.jsx', 'src/App.jsx', 'src/games/registry.js']) {
    if (!existsSync(abs(entry))) continue
    const graph = walkImports(abs(entry))
    const hits = graph.files.filter((f) => NEW.some((p) => f.startsWith(p)))
    assert.deepEqual(hits, [], `${entry} reaches new Phase 2A code`)
  }
  for (const dir of ['src/games/sky-runner', 'src/games/skyward-explorer']) {
    for (const file of listFiles(abs(dir)).filter((f) => /\.(js|jsx)$/.test(f))) {
      const source = readFileSync(file, 'utf8')
      assert.ok(!/learning\/|sky-science|world-explorer/.test(source), `${rel(file)} imports new code`)
    }
  }
})

/* ------------------------------------------------------------------ I5 no fallback */

test('I5: a game rendered WITHOUT an adapter provider throws; there is no default adapter', () => {
  const Game = () => { useLearningAdapter(); return null }
  assert.throws(() => renderToString(createElement(Game)), MissingAdapterError)
  assert.throws(() => renderToString(createElement(AdapterProvider, { adapter: null }, createElement(Game))), MissingAdapterError)
  const adapter = createPreviewAdapter({ factory: freshFactory() })
  assert.doesNotThrow(() => renderToString(createElement(AdapterProvider, { adapter }, createElement(Game))))
  adapter.store.close()
  assert.equal(Object.keys(previewModule).some((k) => /live/i.test(k)), false, 'the preview module exposes nothing live')
})

/* ------------------------------------------------------------------ I8 production guard */

test('I8: createPreviewAdapter() throws in a production build', () => {
  assert.throws(() => createPreviewAdapter({ factory: freshFactory(), env: { PROD: true } }), PreviewInProductionError)
})

/* ------------------------------------------------------------------ I6 / I7 / I9 runtime */

function installSpies({ seed = {} } = {}) {
  const calls = { fetch: 0, xhr: 0, ws: 0, lsWrites: 0, supabase: 0, events: [] }
  const saved = {}
  const swap = (key, value) => { saved[key] = Object.getOwnPropertyDescriptor(globalThis, key); Object.defineProperty(globalThis, key, { value, configurable: true, writable: true }) }
  swap('fetch', async () => { calls.fetch += 1; throw new Error('network blocked by test') })
  swap('XMLHttpRequest', class { constructor() { calls.xhr += 1 } })
  swap('WebSocket', class { constructor() { calls.ws += 1 } })
  const data = new Map(Object.entries(seed))
  swap('localStorage', {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: () => { calls.lsWrites += 1 },
    removeItem: () => { calls.lsWrites += 1 },
    clear: () => { calls.lsWrites += 1 },
    key: (i) => [...data.keys()][i] ?? null,
    get length() { return data.size },
  })
  const counting = new Proxy({}, { get: () => { calls.supabase += 1; return () => counting } })
  swap('supabase', counting)
  const target = new EventTarget()
  const origDispatch = target.dispatchEvent.bind(target)
  target.dispatchEvent = (e) => { calls.events.push(e.type); return origDispatch(e) }
  swap('window', target)
  const restore = () => {
    for (const [key, desc] of Object.entries(saved)) {
      if (desc) Object.defineProperty(globalThis, key, desc)
      else delete globalThis[key]
    }
  }
  return { calls, data, restore }
}

async function fullPreviewPlaythrough(factory) {
  let a = createPreviewAdapter({ factory })
  await a.ready()
  for (const [band, gates, checks] of [['4-6', 6, 2], ['7-8', 8, 3], ['9-10', 8, 4]]) {
    await playFlight(a, { band, primary: Array(gates).fill(true), checks: Array(checks).fill(true) })
  }
  let v = (await a.world.startVisit('sundarbans')).visit.roundKey
  await playStation(a, v, 'sundarbans', 1)
  await playStation(a, v, 'sundarbans', 2, { wrongFirst: 1 })
  a._db().close() // abandonment
  a.store.close()
  a = createPreviewAdapter({ factory }) // resume
  await a.ready()
  v = (await a.world.startVisit('sundarbans')).visit.roundKey
  for (const n of [3, 4, 5]) await playStation(a, v, 'sundarbans', n)
  await a.world.fileReport(v, 'sundarbans', 'A', reportAnswers(3))
  v = (await a.world.startVisit('sundarbans')).visit.roundKey
  await a.world.fileReport(v, 'sundarbans', 'B', reportAnswers(5)) // retry
  await a.syncNow()
  return a
}

test('I6/I7: full preview playthrough → zero network calls, zero localStorage writes, only the preview database', async () => {
  const spies = installSpies()
  try {
    const factory = freshFactory()
    const a = await fullPreviewPlaythrough(factory)
    assert.deepEqual([spies.calls.fetch, spies.calls.xhr, spies.calls.ws], [0, 0, 0])
    assert.equal(spies.calls.lsWrites, 0)
    assert.deepEqual((await factory.databases()).map((d) => d.name), [PREVIEW_DB_NAME])
    assert.ok(!(await factory.databases()).some((d) => d.name === LIVE_DB_NAME))
    assert.deepEqual(spies.calls.events.filter((t) => /^bulbuli:(xp-awarded|game-progress|round-complete)$/.test(t)), [])
    // resumed adapter: the abandoned visit sealed on Continue (stations 1–2: 4 + 2 = 6 XP), then the
    // visit with stations 3–5 (12) + report A (3/5 → 9) + completion (20) = 41. The retry (set B)
    // pays 0 XP, so it produces no award at all.
    assert.deepEqual(a.wouldBeAwards().map((w) => w.amount), [6, 41], 'would-be awards are recorded in memory only')
    a.store.close()
  } finally {
    spies.restore()
  }
})

test('I9: with a SIMULATED SIGNED-IN SESSION seeded, the preview still makes zero Supabase calls and changes nothing', async () => {
  const seed = {
    'sb-testref-auth-token': JSON.stringify({ access_token: 'fake', user: { id: USER_A } }),
    [`bulbuli.tutorial-progress.v1.${USER_A}`]: JSON.stringify({ games: { 'sky-runner': { plays: 3 } }, gamification: { totalXp: 120 } }),
    'bulbuli.tutorial-progress.v1.guest': JSON.stringify({ games: {}, gamification: { totalXp: 40 } }),
    'bulbuli.xp-queue.v1': JSON.stringify([
      { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', userId: USER_A, gameId: 'math-hero', amount: 5, createdAt: '2026-11-01T00:00:00Z' },
      { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', userId: USER_A, gameId: 'shape-hunt', amount: 3, createdAt: '2026-11-01T00:00:00Z' },
    ]),
  }
  const spies = installSpies({ seed })
  const before = JSON.stringify([...spies.data.entries()])
  try {
    const factory = freshFactory()
    const a = await fullPreviewPlaythrough(factory)
    assert.equal(spies.calls.supabase, 0, 'the fake Supabase client was never touched')
    assert.deepEqual([spies.calls.fetch, spies.calls.xhr, spies.calls.ws], [0, 0, 0], 'zero RPC / network calls')
    assert.equal(spies.calls.lsWrites, 0)
    assert.equal(JSON.stringify([...spies.data.entries()]), before, 'XP queue, account progress and guest progress byte-identical')
    assert.equal(a.playerId(), 'phase2a-preview', 'never the signed-in user')
    assert.ok((await a._db().transaction(['rounds']).objectStore('rounds').getAll()) !== null)
    a.store.close()
  } finally {
    spies.restore()
  }
})
