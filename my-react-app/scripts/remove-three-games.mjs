#!/usr/bin/env node
/**
 * Removes Memory Match, Pattern Quest and Bulbuli 3D from the Bulbuli arcade.
 *
 *   node scripts/remove-three-games.mjs           dry run: checks every edit matches, changes nothing
 *   node scripts/remove-three-games.mjs --apply   backs up, deletes the files, applies the edits
 *
 * Every edit is an exact text match. If any file has drifted from what this script expects,
 * it stops before touching anything and tells you which edit missed.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const APPLY = process.argv.includes('--apply')
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
process.chdir(root)

// ---------------------------------------------------------------- 1. files to delete
const DELETE = [
  // the three game folders
  'src/games/memory-match',
  'src/games/pattern-quest',
  'src/games/bulbuli-3d',
  // used only by Bulbuli 3D (BulbuliModel.jsx, GameViewport.jsx, SceneReady.jsx stay: other games use them)
  'src/components/game/GameCanvas.jsx',
  'src/components/game/GameCanvas.css',
  // Pattern Quest is its own app, loaded in an iframe at /embed/pattern-quest. Nothing else imports these:
  'src/app',                       // its App, hash router, route utils (+ test), shell.css
  // src/core: everything except rng.js, which Skyward Explorer still imports
  'src/core/questions',            // question generators (+ test)
  'src/core/engine.js',
  'src/core/engine.test.js',
  'src/core/modes.js',
  'src/core/clock.js',
  'src/core/store.js',
  'src/features/game',
  'src/features/home',
  'src/features/leaderboard',
  'src/features/results',
  'src/state',                     // its settings + high scores (localStorage)
  'src/shared/audio',
  'src/shared/i18n',               // its own en/bn strings (+ test). The arcade uses src/arcade/text.js
  'src/shared/ui',
  'src/shared/hooks/useFlip.js',
  'src/shared/hooks/useKey.js',
  'src/shared/hooks/useStore.js',
  'src/shared/lib/cx.js',
  'src/styles/index.css',
  'src/styles/base.css',
  'src/styles/motion.css',
  'src/styles/tokens.css',
  'src/styles/ui.css',
]

// ---------------------------------------------------------------- 2. edits
const MAIN_JSX = `// Entry point: loads the Bulbuli arcade.
import { registerServiceWorker } from './pwa/installPrompt.js'

// Start listening for the browser's install prompt right away (it can fire before React renders),
// and register the service worker that makes Bulbuli installable.
registerServiceWorker()

// Old arcade links like /#/drive -> /drive (the arcade uses BrowserRouter, which ignores the hash).
if (window.location.pathname === '/' && window.location.hash.startsWith('#/')) {
  window.history.replaceState(null, '', window.location.hash.slice(1))
}

// One-time tidy-up: storage written only by Pattern Quest, which has been removed.
// (Arcade XP in 'bulbuli:game-progress' is kept, so no child loses XP they earned.)
try {
  for (const key of ['bulbuli:settings', 'bulbuli:bests', 'bulbuli:leaderboard', 'bulbuli:lang', 'bulbuli:muted', 'bulbuli:lb']) {
    window.localStorage.removeItem(key)
  }
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith('bulbuli:best:'))
    .forEach((key) => window.localStorage.removeItem(key))
  window.sessionStorage.removeItem('bulbuli:last')
} catch { /* storage blocked: nothing to tidy */ }

import('./arcade-entry.jsx').then(({ mount }) => mount(document.getElementById('root')))
`

const between = (start, end) => ({ start, end }) // remove from `start` up to (not including) `end`

const EDITS = {
  'src/main.jsx': [
    { whole: MAIN_JSX, mustContain: "import('./games/pattern-quest/embed.jsx')" },
  ],

  'src/games/registry.js': [
    ["import MemoryMatchArt from './memory-match/Art.jsx'\n", ''],
    ["import PatternQuestArt from './pattern-quest/Art.jsx'\n", ''],
    ["import Bulbuli3DArt from './bulbuli-3d/Art.jsx'\n", ''],
    [" *                 (Pattern Quest has its own button in its own top bar, inside its frame.)\n", ''],
    between("  {\n    id: 'memory-match',", "  {\n    id: 'shape-hunt',"),
  ],

  'src/session/roundEvents.js': [
    [" * level / board / run ends) and Math Hero's game-over both report it here, and Pattern Quest\n * reports it from inside its frame with postMessage. A game can also call the\n",
     " * level / board / run ends) and Math Hero's game-over both report it here. A game can also call the\n"],
    ["const FRAME_MESSAGE = 'bulbuli:round-complete'\n", ''],
    ["export const CONTINUOUS_GAMES = new Set(['bulbuli-3d'])", 'export const CONTINUOUS_GAMES = new Set()'],
    between('/** For a game running inside a same-origin frame (Pattern Quest). */', 'export function onRoundComplete'),
    [`  const onEvent = (event) => listener(event.detail)
  const onMessage = (event) => {
    if (event.origin !== window.location.origin || event.data?.type !== FRAME_MESSAGE) return
    const { gameId, xp, score } = event.data
    if (typeof gameId === 'string') reportRoundComplete(gameId, { xp, score })
  }
  window.addEventListener(ROUND_COMPLETE_EVENT, onEvent)
  window.addEventListener('message', onMessage)
  return () => {
    window.removeEventListener(ROUND_COMPLETE_EVENT, onEvent)
    window.removeEventListener('message', onMessage)
  }`,
    `  const onEvent = (event) => listener(event.detail)
  window.addEventListener(ROUND_COMPLETE_EVENT, onEvent)
  return () => window.removeEventListener(ROUND_COMPLETE_EVENT, onEvent)`],
  ],

  'src/App.jsx': [
    [`              <Route path="/math-hero" element={<Navigate to="/games/math-hero" replace />} />\n`,
     `              <Route path="/math-hero" element={<Navigate to="/games/math-hero" replace />} />
              {/* Removed games: old links, bookmarks and search results go to the home page. */}
              <Route path="/games/memory-match" element={<Navigate to="/" replace />} />
              <Route path="/games/pattern-quest" element={<Navigate to="/" replace />} />
              <Route path="/games/bulbuli-3d" element={<Navigate to="/" replace />} />\n`],
  ],

  'src/arcade/arcade.css': [
    ['.art-math-sum,\n.art-pattern .is-unknown {', '.art-math-sum {'],
    between('.art-memory { gap: 0.45rem; }', '/* ---------- age zones'),
    between('.embedded-game-frame {\n  display: block;', '/* ---------- small screens ---------- */'),
    ['\n\n  .embedded-game-frame { height: calc(100dvh - 5.5rem); min-height: 520px; border-radius: 20px; }\n', '\n'],
    between('/* Bulbuli 3D tile: a bird circling on an orbit ring */', '/* SkyTypewriter 3D tile'),
  ],

  'src/arcade/GamePage.jsx': [
    ['  // The "How was it?" card shows on this page, so a game in full screen (including Pattern Quest,\n  // which goes full screen from inside its own frame) steps out of it first.',
     '  // The "How was it?" card shows on this page, so a game in full screen steps out of it first.'],
  ],

  'src/games/categories.test.js': [
    ["  'memory-match': 'play-learn',\n  'pattern-quest': 'play-learn',\n  'bulbuli-3d': 'play-learn',\n", ''],
  ],

  // comments that named the removed games
  'src/shared/lib/fullscreen.js': [["the arcade's hook, Pattern Quest's button and the tests", "the arcade's hook and the tests"]],
  'src/components/game/GameViewport.jsx': [["(Shape Hunt's .sh-canvas, Bulbuli 3D's\n * .bulbuli-canvas)", "(e.g. Shape Hunt's\n * .sh-canvas)"]],
  'src/hooks/useGameProgress.js': [["    // (Games without rounds, like Bulbuli 3D, are skipped in roundEvents.js.)\n", "    // (Games without rounds can be listed in CONTINUOUS_GAMES in roundEvents.js.)\n"]],
  'src/games/shape-sorting/speech.js': [['(Shape Hunt, Memory Match):', '(Shape Hunt):']],

  'src/games/README.md': [
    between('## A game that is its own app', '## Using the screen'),
  ],

  'README.md': [
    ['| Memory Match | `/games/memory-match` | memory, then matching pictures to written words |\n', ''],
    ['| Pattern Quest | `/games/pattern-quest` | number and shape patterns, quick sums |\n', ''],
  ],

  'public/sitemap.xml': [
    ['  <url>\n    <loc>https://bulbuli.org/games/memory-match</loc>\n  </url>\n', ''],
    ['  <url>\n    <loc>https://bulbuli.org/games/pattern-quest</loc>\n  </url>\n', ''],
    ['  <url>\n    <loc>https://bulbuli.org/games/bulbuli-3d</loc>\n  </url>\n', ''],
  ],

  'index.html': [
    ['math games for kids, memory matching game, typing games', 'math games for kids, typing games'],
    ['Free mini-games for kids: Math Hero, Memory Match, Pattern Quest, Shape Hunt, Logic Gate Builder and more.',
     'Free mini-games for kids: Math Hero, Shape Hunt, Sky Typewriter, HTML Architect and more.'],
    [`          Play mini-games with Bulbuli the bird: count and add in Math Hero, find the pairs in
          Memory Match, spot what comes next in Pattern Quest, and solve logic puzzles in Logic Gate
          Builder. Earn XP and level up, in English or Bangla.`,
     `          Play mini-games with Bulbuli the bird: count and add in Math Hero, find 3D shapes in
          Shape Hunt, type flying words in Sky Typewriter, and build with real HTML in HTML Architect.
          Earn XP and level up, in English or Bangla.`],
  ],
}

// ---------------------------------------------------------------- run
const problems = []
const results = {}
const normalize = (s) => s.replace(/\r\n/g, '\n') // Windows checkouts may use CRLF

for (const [file, edits] of Object.entries(EDITS)) {
  if (!fs.existsSync(file)) { problems.push(`${file}: file not found`); continue }
  const raw = fs.readFileSync(file, 'utf8')
  const crlf = raw.includes('\r\n')
  let text = normalize(raw)
  edits.forEach((edit, i) => {
    const where = `${file} edit #${i + 1}`
    if (Array.isArray(edit)) {
      const [from, to] = edit
      const count = text.split(from).length - 1
      if (count !== 1) return problems.push(`${where}: expected 1 match, found ${count}: ${JSON.stringify(from.slice(0, 70))}`)
      text = text.replace(from, () => to)
    } else if (edit.whole) {
      if (!text.includes(edit.mustContain)) return problems.push(`${where}: does not look like the expected file`)
      text = edit.whole
    } else {
      const a = text.indexOf(edit.start)
      const b = a < 0 ? -1 : text.indexOf(edit.end, a + edit.start.length)
      if (a < 0 || b < 0) return problems.push(`${where}: block markers not found: ${JSON.stringify(edit.start.slice(0, 60))}`)
      text = text.slice(0, a) + text.slice(b)
    }
  })
  results[file] = crlf ? text.replace(/\n/g, '\r\n') : text
}

const missing = DELETE.filter((p) => !fs.existsSync(p))
if (missing.length) problems.push(...missing.map((p) => `${p}: already gone (fine if you ran this before)`))

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} in ${root}\n`)
console.log('Delete:'); DELETE.forEach((p) => console.log(`  ${fs.existsSync(p) ? '-' : '·'} ${p}`))
console.log('\nEdit:'); Object.keys(EDITS).forEach((f) => console.log(`  ~ ${f}`))

const blocking = problems.filter((p) => !p.includes('already gone'))
if (problems.length) { console.log('\nNotes / problems:'); problems.forEach((p) => console.log(`  ! ${p}`)) }
if (blocking.length) { console.error('\nStopped: nothing was changed. Fix or tell Claude about the edits above.'); process.exit(1) }
if (!APPLY) { console.log('\nAll edits match. Run again with --apply to make the changes.'); process.exit(0) }

// backup first, same style as the other _backup-before-*.tar.gz files
const stamp = new Date().toISOString().slice(0, 10)
const backup = `_backup-before-remove-mm-pq-b3d-${stamp}.tar.gz`
execFileSync('tar', ['-czf', backup, 'src', 'index.html', 'README.md', 'public/sitemap.xml', 'package.json', 'package-lock.json'], { stdio: 'inherit' })
console.log(`\nBackup: ${backup}`)

for (const p of DELETE) if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true })
for (const [file, text] of Object.entries(results)) fs.writeFileSync(file, text)
console.log('Done. Now run: npm uninstall @dimforge/rapier3d-compat && npm test && npm run lint && npm run build')
