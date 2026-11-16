// L1: files Phase 2A development must not change (design 1.3, 1.4, I4). Compares against the
// sha256 manifest recorded before Stage 2A-1 started (docs/qa/phase-2a-untouched.sha256).
// If one of these files is changed on purpose, that change needs owner approval and a new manifest.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { REPO_ROOT } from './importGraph.js'

test('every protected file is byte-identical to the pre-Stage-2A-1 manifest (old games, shared XP/progress code, routes, config, public/, supabase/)', () => {
  const manifest = readFileSync(resolve(REPO_ROOT, 'docs/qa/phase-2a-untouched.sha256'), 'utf8').split(/\r?\n/).filter(Boolean)
  assert.ok(manifest.length > 100)
  const changed = []
  for (const line of manifest) {
    const [hash, ...rest] = line.split(/\s+/)
    const file = rest.join(' ').replace(/^\*/, '')
    const path = resolve(REPO_ROOT, file)
    if (!existsSync(path)) { changed.push(`${file} (missing)`); continue }
    const actual = createHash('sha256').update(readFileSync(path)).digest('hex')
    if (actual !== hash) changed.push(file)
  }
  assert.deepEqual(changed, [])
})
