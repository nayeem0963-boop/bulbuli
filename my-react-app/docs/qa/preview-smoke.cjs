/**
 * Phase 2A real-browser smoke tests (design 1.6, test level L3: B1–B6, plus S1 with two real tabs).
 * B3 plays one World Explorer station (Sundarbans) through Record and leaves (seal), signed out.
 *
 * Tooling (owner decision D15, option a): runs with a Playwright installation OUTSIDE the project;
 * nothing is added to package.json. It drives the ACTUAL dev-preview page served by `vite`.
 *
 *   npx vite --port 5179 --strictPort            # in my-react-app, in another terminal
 *   node docs/qa/preview-smoke.cjs http://localhost:5179 ./qa-out
 *
 * B6 (positive control) needs the main app to try to reach Supabase: run vite with a FAKE
 * VITE_SUPABASE_URL (e.g. https://example-test.supabase.co) so every such request is intercepted
 * and aborted here; no real backend is ever contacted. Without it, B6 reports "skipped".
 *
 * Exit code 0 = all run tests passed.
 */
const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')

const BASE = process.argv[2] ?? 'http://localhost:5179'
const OUT = process.argv[3] ?? path.join(process.cwd(), 'qa-out')
const PREVIEW = `${BASE}/dev-preview/phase-2a/`
const USER = '11111111-1111-4111-8111-111111111111'
const FORBIDDEN = [/supabase\.co/i, /\/rest\/v1\//, /\/auth\/v1\//, /\/rpc\//, /gstatic\.com/i]
fs.mkdirSync(OUT, { recursive: true })

const SEED = {
  [`bulbuli.tutorial-progress.v1.${USER}`]: JSON.stringify({ games: { 'sky-runner': { plays: 3 } }, gamification: { totalXp: 120 } }),
  'bulbuli.tutorial-progress.v1.guest': JSON.stringify({ games: {}, gamification: { totalXp: 40 } }),
  'bulbuli.xp-queue.v1': JSON.stringify([
    { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', userId: USER, gameId: 'math-hero', amount: 5, createdAt: '2026-11-01T00:00:00Z' },
    { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', userId: USER, gameId: 'shape-hunt', amount: 3, createdAt: '2026-11-01T00:00:00Z' },
  ]),
}
const SESSION_KEY = 'sb-example-test-auth-token'
const SESSION = JSON.stringify({
  access_token: 'fake.jwt.token', refresh_token: 'fake-refresh', token_type: 'bearer',
  expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user: { id: USER, aud: 'authenticated', role: 'authenticated' },
})

async function dumpStorage(page) {
  return page.evaluate(async () => {
    const ls = {}
    for (let i = 0; i < localStorage.length; i += 1) { const k = localStorage.key(i); ls[k] = localStorage.getItem(k) }
    const dbs = indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name).sort() : []
    return { ls, dbs }
  })
}

/** Opens a same-origin blank page, seeds storage, records the B1 snapshot. */
async function seed(context, { signedIn }) {
  const page = await context.newPage()
  await page.route(`${BASE}/__qa_seed`, (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>seed</title>' }))
  await page.goto(`${BASE}/__qa_seed`)
  await page.evaluate(({ seedData, signedIn: si, key, session }) => {
    localStorage.clear()
    for (const [k, v] of Object.entries(seedData)) localStorage.setItem(k, v)
    if (si) localStorage.setItem(key, session)
  }, { seedData: SEED, signedIn, key: SESSION_KEY, session: SESSION })
  const before = await dumpStorage(page)
  await page.close()
  return before
}

function watchNetwork(page) {
  const log = { all: [], external: [], forbidden: [], supabaseAborted: 0 }
  page.on('request', (r) => {
    const url = r.url()
    log.all.push(url)
    if (!url.startsWith(BASE) && !url.startsWith('data:') && !url.startsWith('blob:')) log.external.push(url)
    if (FORBIDDEN.some((re) => re.test(url))) log.forbidden.push(url)
  })
  return log
}

async function playFlight(page, { band, mission, shots }) {
  await page.goto(PREVIEW, { waitUntil: 'networkidle' })
  await page.click(`[data-band="${band}"]`)
  await page.click(`[data-mission="${mission}"]`)
  await page.waitForFunction(() => window.__phase2aQA?.step, null, { timeout: 20000 })
  if (shots) {
    await page.waitForTimeout(3500)
    await page.screenshot({ path: path.join(OUT, `${shots}-gate.png`) })
  }
  for (let i = 0; i < 60; i += 1) {
    if (await page.$('[data-testid="ssx-xp"]')) break
    const cont = await page.$('.ssx-feedback button')
    if (cont) { await cont.click(); await page.waitForTimeout(120); continue }
    const lane = await page.evaluate(() => window.__phase2aQA.correctLane())
    const btn = lane >= 0 ? await page.$(`.ssx-option[data-lane="${lane}"]:not([disabled])`) : null
    if (btn) { await btn.click(); await page.waitForTimeout(250) } else await page.waitForTimeout(400)
  }
  const xpText = await page.textContent('[data-testid="ssx-xp"]').catch(() => null)
  if (shots) await page.screenshot({ path: path.join(OUT, `${shots}-results.png`), fullPage: true })
  return xpText
}

/** Completes a station's hands-on Investigate activity the way a learner would (predict + test every condition, or order the steps). */
async function doInvestigate(page, shot) {
  const x = await page.evaluate(() => window.__phase2aQA.world.interaction)
  if (x.kind === 'compare') {
    await page.click(`[data-predict="${x.expect}"]`)
    for (const c of x.conditions) await page.click(`[data-condition="${c.id}"]`)
  } else {
    for (const i of x.items) await page.click(`[data-order-item="${i.id}"]`)
    await page.click('[data-action="check-order"]')
  }
  await page.waitForSelector('[data-testid="wx-investigation-result"]')
  if (shot) await page.locator('[data-testid="wx-station"]').screenshot({ path: path.join(OUT, shot) })
  await page.click('[data-action="investigate"]')
  return x.kind
}

async function main() {
  const results = []
  const record = (id, pass, detail) => { results.push({ id, pass, detail }); console.log(`${pass === null ? 'SKIP' : pass ? 'PASS' : 'FAIL'} ${id}: ${detail}`) }
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })

  for (const signedIn of [false, true]) {
    const label = signedIn ? 'signed-in' : 'signed-out'
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    // B5: every Supabase request is intercepted, counted and ABORTED (no real backend contact)
    let supabaseHits = 0
    await context.route(/supabase\.co/i, (route) => { supabaseHits += 1; route.abort() })
    const before = await seed(context, { signedIn })
    if (!signedIn) record('B1', Object.keys(before.ls).length === 3, `seeded ${Object.keys(before.ls).length} localStorage keys; IndexedDB before: [${before.dbs.join(', ')}]`)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    const net = watchNetwork(page)
    const xp = await playFlight(page, { band: '7-8', mission: 'sky-watcher', shots: signedIn ? null : 'b2' })
    const after = await dumpStorage(page)
    const sameLs = JSON.stringify(after.ls) === JSON.stringify(before.ls)
    const extraDbs = after.dbs.filter((d) => !before.dbs.includes(d))
    const id = signedIn ? 'B5' : 'B2'
    record(id, net.external.length === 0 && net.forbidden.length === 0 && supabaseHits === 0 && Boolean(xp) && errors.length === 0,
      `${label}: flight finished (${xp?.trim()}); ${net.all.length} requests, ${net.external.length} external, ${net.forbidden.length} forbidden, ${supabaseHits} Supabase; page errors ${errors.length}`)
    record(signedIn ? 'B5-storage' : 'B4', sameLs && extraDbs.length <= 1 && extraDbs.every((d) => d === 'bulbuli-learning-preview-v1') && !after.dbs.includes('bulbuli-learning-v1'),
      `${label}: localStorage byte-identical=${sameLs}; new IndexedDB databases: [${extraDbs.join(', ')}]`)
    await context.close()
  }

  // B3: one World Explorer station, signed out, same network rule as B2; then S1 with two real tabs
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    let supabaseHits = 0
    await context.route(/supabase\.co/i, (route) => { supabaseHits += 1; route.abort() })
    const before = await seed(context, { signedIn: false })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    const net = watchNetwork(page)
    await page.goto(PREVIEW, { waitUntil: 'networkidle' })
    await page.click('[data-tab="world"]')
    await page.click('[data-start="sundarbans"]')
    await page.waitForTimeout(2500)
    await page.click('[data-action="mission-log"]')
    await page.click('[data-travel="1"]')
    await page.click('[data-action="observe"]')
    const kind1 = await doInvestigate(page, 'b3-investigate-1.png')
    const key = await page.evaluate(() => window.__phase2aQA.world.correctKey)
    await page.click(`[data-testid="wx-station"] [data-key="${key}"]`)
    await page.click('[data-action="record"]')
    await page.waitForSelector('[data-testid="wx-station-xp"]')
    const xp = (await page.textContent('[data-testid="wx-station-xp"]')).trim()
    await page.screenshot({ path: path.join(OUT, 'b3-station.png'), fullPage: true })
    await page.click('[data-testid="wx-station"] button.wx-small')
    await page.click('[data-action="leave"]')
    await page.waitForSelector('[data-start="sundarbans"]')
    const awards = await page.evaluate(() => window.__phase2aQA.adapter.wouldBeAwards())
    const after = await dumpStorage(page)
    const sameLs = JSON.stringify(after.ls) === JSON.stringify(before.ls)
    record('B3', xp === '+4 XP' && awards.length === 1 && awards[0].amount === 4 && net.external.length === 0 && net.forbidden.length === 0 && supabaseHits === 0 && errors.length === 0 && sameLs && !after.dbs.includes('bulbuli-learning-v1'),
      `signed-out: station 1 Investigate activity (${kind1}) completed by predicting/testing; station recorded (${xp}); leaving sealed the visit → ${awards.length} would-be award(s) [${awards.map((a) => a.amount).join(', ')}] XP; ${net.all.length} requests, ${net.external.length} external, ${supabaseHits} Supabase; localStorage byte-identical=${sameLs}; page errors ${errors.length}`)

    // S1 (owner's scenario) in a real browser: tab A starts a visit, tab B starts one (sealing A's), tab A presses Record
    const tabA = page
    await tabA.click('[data-start="sundarbans"]')
    await tabA.waitForTimeout(1500)
    await tabA.click('[data-action="mission-log"]')
    await tabA.click('[data-travel="2"]')
    await tabA.click('[data-action="observe"]')
    const kind2 = await doInvestigate(tabA, 'b3-investigate-2.png')
    const keyA = await tabA.evaluate(() => window.__phase2aQA.world.correctKey)
    await tabA.click(`[data-testid="wx-station"] [data-key="${keyA}"]`)
    const tabB = await context.newPage()
    await tabB.goto(PREVIEW, { waitUntil: 'networkidle' })
    await tabB.click('[data-tab="world"]')
    await tabB.click('[data-start="sundarbans"]')
    await tabB.waitForTimeout(1000)
    const totalBefore = await tabA.evaluate(() => window.__phase2aQA.adapter.store.getSnapshot().learningXp)
    await tabA.click('[data-action="record"]')
    await tabA.waitForSelector('[data-testid="wx-stale"]')
    await tabA.screenshot({ path: path.join(OUT, 's1-stale-dialog.png') })
    await tabA.waitForTimeout(500)
    const snapA = await tabA.evaluate(() => { const s = window.__phase2aQA.adapter.store.getSnapshot(); return { xp: s.learningXp, s2: s.world?.expeditions?.sundarbans?.stations?.[2]?.complete ?? false } })
    record('S1-browser', snapA.xp === totalBefore && snapA.s2 === false,
      `two real tabs (station 2 activity: ${kind2}): tab A's Record after tab B started a visit was refused (dialog shown); local total unchanged (${totalBefore} XP); station 2 complete=${snapA.s2}`)
    await context.close()
  }

  // B6 positive control: the normal app with the same seeded session must TRY to reach Supabase
  {
    const context = await browser.newContext()
    let supabaseHits = 0
    await context.route(/supabase\.co/i, (route) => { supabaseHits += 1; route.abort() })
    await seed(context, { signedIn: true })
    const page = await context.newPage()
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(2500)
    if (supabaseHits > 0) record('B6', true, `normal app attempted ${supabaseHits} Supabase request(s); all intercepted and aborted, so the monitor works`)
    else record('B6', null, 'skipped: this dev server has no (fake) VITE_SUPABASE_URL, so the app never tries Supabase')
    await context.close()
  }

  await browser.close()
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2))
  process.exitCode = results.some((r) => r.pass === false) ? 1 : 0
}

main().catch((e) => { console.error(e); process.exitCode = 1 })
