// Controlled REVIEW build (docs/PHASE-2A-REVIEW-BUILD.md): the separate site built by
// `npm run build:review` (vite.review.config.js → dist-review/). The main build's exclusion is I1
// (isolation-build.test.js); these tests check the review build itself.
//   R1  output contains exactly the review page, its bundles, the decoder and the needed assets
//   R2  output contains no Supabase URL/key, no XP-queue/progress keys, no live adapter, and is
//       marked noindex; it shows the review-status banner
//   R3  the review entry's import graph reaches no Supabase, XP, progress, auth, badge,
//       achievement, registry or live-adapter code
//   R4  the review adapter exists only in the review build (or the dev server)
//   R5  a full review playthrough, even with a signed-in session seeded: zero network calls, zero
//       Supabase calls, zero localStorage writes, only the review database
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createReviewAdapter, isReviewBuild, REVIEW_DB_NAME, REVIEW_PLAYER_ID, ReviewOutsideReviewBuildError } from '../adapters/review.js'
import { LIVE_DB_NAME, PREVIEW_DB_NAME } from '../store/schema.js'
import { forbiddenReached, REPO_ROOT, walkImports } from './importGraph.js'
import { freshFactory, playFlight, playStation, reportAnswers, USER_A } from './helpers.js'

const abs = (p) => resolve(REPO_ROOT, p)
const REVIEW_BUILD_ENV = { PROD: true, DEV: false, VITE_BULBULI_REVIEW_BUILD: 'true' }
const STATUS_BANNER = 'REVIEW BUILD — EDUCATIONAL CONTENT PENDING APPROVAL — NO REAL XP'

/** Values from the project's .env (if any): none may appear in the review build. */
function envValues() {
  const file = abs('.env')
  if (!existsSync(file)) return []
  return readFileSync(file, 'utf8').split(/\r?\n/)
    .map((line) => line.match(/^\s*[A-Z0-9_]+\s*=\s*(.+?)\s*$/)?.[1]?.replace(/^['"]|['"]$/g, ''))
    .filter((v) => v && v.length >= 12)
}

let built = null
function buildReview(t) {
  if (built) return built
  const out = mkdtempSync(join(tmpdir(), 'bulbuli-review-'))
  const vite = abs('node_modules/vite/bin/vite.js')
  const run = spawnSync(process.execPath, [vite, 'build', '--config', 'vite.review.config.js', '--outDir', out, '--emptyOutDir', '--logLevel', 'error'], { cwd: REPO_ROOT, encoding: 'utf8' })
  if (run.status !== 0 && /native binding|Cannot find module '@rolldown|bindings/i.test(`${run.stderr}${run.stdout}`)) {
    rmSync(out, { recursive: true, force: true })
    t.skip('vite cannot run on this platform (native binding missing); run npm test on the development machine')
    return null
  }
  assert.equal(run.status, 0, `review build failed:\n${run.stderr}`)
  const files = readdirSync(out, { recursive: true }).map((f) => String(f).split('\\').join('/')).filter((f) => statSync(join(out, f)).isFile()).sort()
  built = { out, files }
  return built
}
test.after(() => { if (built) rmSync(built.out, { recursive: true, force: true }) })

test('R1: the review build contains exactly the review page, its bundles, the Draco decoder and the assets it uses', { timeout: 300000 }, (t) => {
  const b = buildReview(t)
  if (!b) return
  const fixed = b.files.filter((f) => !f.startsWith('assets/'))
  assert.deepEqual(fixed, [
    '_headers',
    'draco/draco_decoder.js',
    'draco/draco_decoder.wasm',
    'draco/draco_wasm_wrapper.js',
    'favicon.svg',
    'index.html',
    'models/bulbuli.glb',
    'robots.txt',
    'sounds/click.mp3',
    'sounds/complete.mp3',
    'sounds/correct.mp3',
    'sounds/wrong.mp3',
  ])
  // assets/ holds only bundles, plus the Amazon bird model (imported with ?url; licence in
  // src/games/world-explorer/assets/bird_orange.LICENSE.md)
  const assets = b.files.filter((f) => f.startsWith('assets/'))
  assert.deepEqual(assets.filter((f) => !/\.(js|css)$/.test(f)).map((f) => f.replace(/-[A-Za-z0-9_-]{8}\./, '-[hash].')), ['assets/bird_orange-[hash].glb'])
  // none of the main site's service worker, manifest, sitemap or offline page
  for (const f of ['sw.js', 'manifest.webmanifest', 'sitemap.xml', 'offline.html']) assert.ok(!b.files.includes(f), `${f} must not be in the review site`)
})

test('R2: the review build holds no Supabase URL or key and no account/XP code, is noindex, and shows the review banner', { timeout: 300000 }, (t) => {
  const b = buildReview(t)
  if (!b) return
  const forbidden = [
    ...envValues(),
    'supabase.co', 'VITE_SUPABASE', 'award_xp', 'record_badges', 'issue_certificate',
    'bulbuli.xp-queue', 'bulbuli.tutorial-progress', 'bulbuli.guest-xp-claimed', 'bulbuli:xp-awarded',
    LIVE_DB_NAME, 'createLiveAdapter', PREVIEW_DB_NAME, 'createPreviewAdapter',
  ]
  let banner = false
  for (const f of b.files.filter((name) => /\.(js|css|html|txt)$/.test(name) || name === '_headers')) {
    if (f.startsWith('draco/')) continue // three's decoder, unmodified
    const text = readFileSync(join(b.out, f), 'utf8')
    for (const marker of forbidden) assert.ok(!text.includes(marker), `${f} contains "${marker.length > 24 ? `${marker.slice(0, 8)}…` : marker}"`)
    if (text.includes(STATUS_BANNER)) banner = true
  }
  assert.ok(banner, 'the review-status banner text is in the bundle')
  assert.match(readFileSync(join(b.out, '_headers'), 'utf8'), /X-Robots-Tag: noindex/)
  assert.equal(readFileSync(join(b.out, 'robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /\n')
  assert.match(readFileSync(join(b.out, 'index.html'), 'utf8'), /<meta name="robots" content="noindex/)
})

test('R3: the review entry\'s import graph reaches no Supabase, XP, progress, auth, badge, achievement, registry or live-adapter code', () => {
  const graph = walkImports(abs('review/main.jsx'))
  assert.deepEqual(forbiddenReached(graph), [])
  assert.deepEqual(graph.unresolved, [])
  assert.ok(graph.files.includes('src/learning/adapters/review.js'))
  assert.ok(!graph.files.includes('src/learning/adapters/preview.js'), 'the review build uses only the review adapter')
  assert.ok(!graph.files.includes('src/App.jsx'), 'the main app is not part of the review site')
  assert.ok(!graph.packages.some((p) => p.startsWith('@supabase/')), 'no Supabase package')
})

test('R3: the main build config never mentions the review build; the review config never builds the main pages', () => {
  const main = readFileSync(abs('vite.config.js'), 'utf8')
  // ("preview" contains "review", so match the review build's own names, not the bare word)
  assert.ok(!/vite\.review|review\/|\bphase2a-review\b|learning|dev-preview/.test(main), 'vite.config.js does not mention the review build, src/learning or the preview')
  const reviewConfig = readFileSync(abs('vite.review.config.js'), 'utf8')
  assert.ok(!/['"]index\.html['"]|share\/math-hero|quiz\/index/.test(reviewConfig.replace(/review\/index\.html/g, '')), 'the review config builds only review/')
  assert.match(reviewConfig, /envDir: path\.resolve\(__dirname, 'review'\)/, 'the review build never reads the project .env')
})

test('R4: the review adapter exists only in the review build or the dev server', () => {
  assert.throws(() => createReviewAdapter({ factory: freshFactory(), env: { PROD: true } }), ReviewOutsideReviewBuildError)
  assert.throws(() => createReviewAdapter({ factory: freshFactory(), env: { PROD: true, VITE_BULBULI_REVIEW_BUILD: 'yes' } }), ReviewOutsideReviewBuildError)
  assert.throws(() => createReviewAdapter({ factory: freshFactory(), env: {} }), ReviewOutsideReviewBuildError)
  assert.equal(isReviewBuild(REVIEW_BUILD_ENV), true)
  assert.equal(isReviewBuild({ DEV: true }), true)
  const a = createReviewAdapter({ factory: freshFactory(), env: REVIEW_BUILD_ENV })
  assert.equal(a.kind, 'review')
  assert.equal(a.decoderPath, '/draco/', 'production review build: self-hosted decoder, never the gstatic CDN')
  assert.notEqual(REVIEW_DB_NAME, LIVE_DB_NAME)
  assert.notEqual(REVIEW_DB_NAME, PREVIEW_DB_NAME)
  a.store.close()
})

/* ------------------------------------------------------------------ R5 runtime */

function installSpies(seed) {
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

test('R5: a full review playthrough with a SIMULATED SIGNED-IN SESSION makes zero network/Supabase calls and writes only the review database', async () => {
  const seed = {
    'sb-testref-auth-token': JSON.stringify({ access_token: 'fake', user: { id: USER_A } }),
    [`bulbuli.tutorial-progress.v1.${USER_A}`]: JSON.stringify({ games: { 'sky-runner': { plays: 3 } }, gamification: { totalXp: 120 } }),
    'bulbuli.xp-queue.v1': JSON.stringify([{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', userId: USER_A, gameId: 'math-hero', amount: 5, createdAt: '2026-11-01T00:00:00Z' }]),
  }
  const spies = installSpies(seed)
  const before = JSON.stringify([...spies.data.entries()])
  try {
    const factory = freshFactory()
    const a = createReviewAdapter({ factory, env: REVIEW_BUILD_ENV })
    await a.ready()
    for (const [band, gates, checks] of [['4-6', 6, 2], ['7-8', 8, 3], ['9-10', 8, 4]]) {
      await playFlight(a, { band, primary: Array(gates).fill(true), checks: Array(checks).fill(true) })
    }
    for (const expedition of ['sundarbans', 'amazon']) {
      const v = (await a.world.startVisit(expedition)).visit.roundKey
      for (const n of [1, 2, 3, 4, 5]) await playStation(a, v, expedition, n)
      await a.world.fileReport(v, expedition, 'A', reportAnswers(5))
    }
    await a.syncNow()
    assert.equal(spies.calls.supabase, 0, 'the fake Supabase client was never touched')
    assert.deepEqual([spies.calls.fetch, spies.calls.xhr, spies.calls.ws], [0, 0, 0], 'zero network calls')
    assert.equal(spies.calls.lsWrites, 0, 'zero localStorage writes')
    assert.equal(JSON.stringify([...spies.data.entries()]), before, 'XP queue and account progress byte-identical')
    assert.deepEqual((await factory.databases()).map((d) => d.name), [REVIEW_DB_NAME], 'only the review database exists')
    assert.deepEqual(spies.calls.events.filter((type) => /^bulbuli:(xp-awarded|game-progress|round-complete)$/.test(type)), [])
    assert.equal(a.playerId(), REVIEW_PLAYER_ID, 'never the signed-in user')
    assert.ok(a.wouldBeAwards().length > 0, 'would-be awards are only recorded in memory')
    // reset removes only the review database
    a.store.close()
    assert.equal(await a.resetPreviewData(), true)
    assert.deepEqual((await factory.databases()).map((d) => d.name), [])
  } finally {
    spies.restore()
  }
})
