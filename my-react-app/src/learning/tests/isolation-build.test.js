// L1: I1 production-build exclusion (design 1.6). Builds the real app into a temporary folder and
// checks the output against the baseline file list (docs/qa/dist-baseline.txt) and for preview and
// review-build markers. Does not touch the project's own dist/.
//
// File names are compared with their content hashes masked (name-XXXXXXXX.js → name-[hash].js):
// a hash changes whenever an existing game's code changes, which says nothing about whether
// preview code leaked in. Any added, removed or renamed file still fails. The markers below are
// checked in every text file, so preview/review code can't hide inside an existing chunk.
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { REPO_ROOT } from './importGraph.js'

const MARKERS = [
  'dev-preview', 'phase2a-preview', 'bulbuli-learning-preview', 'createPreviewAdapter', 'sky-science', 'world-explorer', 'bulbuli-learning-v1',
  // the controlled review build (vite.review.config.js) must never reach the main site either
  'phase2a-review', 'bulbuli-learning-review', 'createReviewAdapter', 'VITE_BULBULI_REVIEW_BUILD', 'PENDING APPROVAL',
]

/** name-Ab12_-yZ.js → name-[hash].js (Vite/Rolldown's 8-character content hash). */
const maskHash = (file) => file.replace(/-[A-Za-z0-9_-]{8}\.(js|css)$/, '-[hash].$1')

test('I1: the production build is identical in file list to the baseline and contains no preview code', { timeout: 300000 }, (t) => {
  const out = mkdtempSync(join(tmpdir(), 'bulbuli-i1-'))
  try {
    const vite = resolve(REPO_ROOT, 'node_modules/vite/bin/vite.js')
    const run = spawnSync(process.execPath, [vite, 'build', '--outDir', out, '--emptyOutDir', '--logLevel', 'error'], { cwd: REPO_ROOT, encoding: 'utf8' })
    if (run.status !== 0 && /native binding|Cannot find module '@rolldown|bindings/i.test(`${run.stderr}${run.stdout}`)) {
      t.skip('vite cannot run on this platform (native binding missing); run npm test on the development machine')
      return
    }
    assert.equal(run.status, 0, `vite build failed:\n${run.stderr}`)
    const files = readdirSync(out, { recursive: true }).map((f) => `./${String(f).split('\\').join('/')}`).filter((f) => statSync(join(out, f)).isFile()).sort()
    const baseline = readFileSync(resolve(REPO_ROOT, 'docs/qa/dist-baseline.txt'), 'utf8').split(/\r?\n/).filter(Boolean).sort()
    assert.deepEqual(files.map(maskHash).sort(), baseline.map(maskHash).sort(), 'dist/ file list (hashes masked) must equal the baseline exactly')
    for (const f of files) {
      if (!/\.(js|css|html|json|webmanifest|svg|txt|xml)$/.test(f)) continue
      const text = readFileSync(join(out, f), 'utf8')
      for (const marker of MARKERS) assert.ok(!text.includes(marker), `${f} contains "${marker}"`)
    }
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
})
