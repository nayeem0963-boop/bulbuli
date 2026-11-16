/**
 * A small static import walker for the isolation tests (I3, I4). Follows relative imports
 * (static, re-exports and dynamic import()) from an entry file; records bare package imports
 * without following them.
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export const rel = (abs) => relative(REPO_ROOT, abs).split('\\').join('/')

const IMPORT_RE = /(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g
const EXTENSIONS = ['', '.js', '.jsx', '.mjs', '/index.js', '/index.jsx']

function resolveLocal(fromFile, spec) {
  // Vite asset queries (`./bird.glb?url`) name the file before the `?`
  const base = resolve(dirname(fromFile), spec.replace(/\?[\w=&-]*$/, ''))
  for (const ext of EXTENSIONS) {
    const candidate = base + ext
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

/** Strips comments so commented-out imports don't count. */
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

export function walkImports(entryAbs) {
  const files = new Set()
  const packages = new Set()
  const unresolved = []
  const stack = [entryAbs]
  while (stack.length) {
    const file = stack.pop()
    if (files.has(file)) continue
    files.add(file)
    if (!/\.(m?js|jsx)$/.test(file)) continue
    const source = stripComments(readFileSync(file, 'utf8'))
    for (const match of source.matchAll(IMPORT_RE)) {
      const spec = match[1] ?? match[2] ?? match[3]
      if (spec.startsWith('.') || spec.startsWith('/')) {
        const target = resolveLocal(file, spec)
        if (target) stack.push(target)
        else unresolved.push(`${rel(file)} → ${spec}`)
      } else {
        packages.add(spec)
      }
    }
  }
  return { files: [...files].map(rel).sort(), packages: [...packages].sort(), unresolved }
}

/** Modules a preview / new game must never reach (design 1.6 I3/I4). */
export const FORBIDDEN_FILES = [
  'src/supabaseClient.js',
  'src/lib/xp.js',
  'src/hooks/useGameProgress.js',
  'src/hooks/useScoreSync.js',
  'src/learning/adapters/live.js',
  'src/games/registry.js',
  'src/catalog/learningCatalog.js',
]
export const FORBIDDEN_PREFIXES = ['src/badges/', 'src/achievements/', 'src/auth/']
export const FORBIDDEN_PACKAGES = ['@supabase/supabase-js']

export function forbiddenReached({ files, packages }) {
  return [
    ...files.filter((f) => FORBIDDEN_FILES.includes(f) || FORBIDDEN_PREFIXES.some((p) => f.startsWith(p))),
    ...packages.filter((p) => FORBIDDEN_PACKAGES.includes(p)),
  ]
}
