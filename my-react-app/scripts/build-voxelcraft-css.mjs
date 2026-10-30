#!/usr/bin/env node
/**
 * Builds src/features/voxelcraft/styles/voxelcraft.css: VoxelCraft's Tailwind styles, compiled
 * ahead of time (Bulbuli doesn't use Tailwind) and scoped so they can't leak in either direction.
 *
 *   npm run build:voxelcraft-css                 compile with the Tailwind CLI (npx), then scope
 *   node scripts/build-voxelcraft-css.mjs --from <tailwind-output.css>   scope an existing build
 *
 * What scoping does to Tailwind's output:
 *   1. Every rule is prefixed with #voxelcraft-root. `:root`, `:host`, `html` and `body` become
 *      the root element itself. Nothing matches outside the game.
 *   2. Cascade layers are removed. Layered rules lose to every unlayered host rule (Bulbuli's
 *      global `button { … }` would restyle the game's buttons). Unlayered and ID-prefixed, the
 *      game's rules outrank any host selector that doesn't use an ID.
 *   3. Reset (preflight) and theme rules are wrapped in :where(), so they keep the lowest
 *      priority inside the game and every utility still beats them, as layers would ensure.
 *   4. Tailwind's keyframes (spin, ping, pulse, bounce) are renamed vc-*, because @keyframes are
 *      global and Bulbuli has its own `pulse`.
 *   5. An isolation block goes in front of everything. The root gets `all: initial`, so nothing is
 *      inherited from the host page (its font size, weight, colour…). Elements the host styles
 *      globally (button, a, h1…) get `all: revert`: browser defaults, which Tailwind's reset and
 *      the game's utilities then build on, exactly as in a page of its own. SVG, img, canvas and
 *      video can't take `all` (it would drop their width/height/stroke attributes), so only their
 *      box and layout properties are reverted.
 * The script fails if any rule ends up unscoped.
 */
import { execFileSync, execSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'

const TAILWIND_CLI = '@tailwindcss/cli@4.1.11'
const ROOT = '#voxelcraft-root'
const KEYFRAME_PREFIX = 'vc-'

const here = path.dirname(fileURLToPath(import.meta.url))
const stylesDir = path.resolve(here, '../src/features/voxelcraft/styles')
const input = path.join(stylesDir, 'tailwind.input.css')
const output = path.join(stylesDir, 'voxelcraft.css')

export function compileTailwind(inputFile = input) {
  const dir = mkdtempSync(path.join(tmpdir(), 'voxelcraft-css-'))
  const out = path.join(dir, 'tailwind.css')
  try {
    const args = ['--yes', TAILWIND_CLI, '-i', inputFile, '-o', out, '--optimize']
    if (process.platform === 'win32') {
      // npx is a .cmd on Windows, which needs a shell: quote the paths (they may contain spaces)
      execSync(`npx ${args.map((a) => `"${a}"`).join(' ')}`, { stdio: 'inherit' })
    } else {
      execFileSync('npx', args, { stdio: 'inherit' })
    }
    return readFileSync(out, 'utf8')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// Elements Bulbuli (or any host) may style with bare element selectors.
const REVERTED = 'a, abbr, article, aside, b, blockquote, button, code, dd, details, dialog, dl, dt, em, fieldset, figcaption, figure, footer, form, h1, h2, h3, h4, h5, h6, header, hr, i, input, kbd, label, legend, li, main, mark, nav, ol, optgroup, option, p, pre, progress, q, s, samp, section, select, small, span, strong, sub, summary, sup, table, tbody, td, textarea, tfoot, th, thead, tr, u, ul'
const isolationFor = (root) => `/* Isolation from the host page (see scripts/build-voxelcraft-css.mjs, step 5). */
${root} { all: initial; display: block; }
${root} :where(${REVERTED}) { all: revert; }
${root} :where(svg, img, canvas, video) {
  display: revert; position: revert; float: revert; vertical-align: revert;
  margin: revert; padding: revert; border: revert; border-radius: revert; outline: revert;
  min-width: revert; max-width: revert; min-height: revert; max-height: revert;
  background: revert; box-shadow: revert; opacity: revert; filter: revert;
  transform: revert; transition: revert; animation: revert; cursor: revert; object-fit: revert;
}
`

const ROOT_ALIAS = /^(?::root|:host|html|body)(?=$|[\s>+~:.[#])/

// CSS2 pseudo-elements may be written with one colon (the optimizer prefers `:before`).
const LEGACY_PSEUDO_ELEMENT = /^:(before|after|first-line|first-letter)(?![\w-])/

/**
 * Splits "input::placeholder" into ["input", "::placeholder"] at the first top-level
 * pseudo-element, so the element part can go in :where() (pseudo-elements can't).
 */
function splitPseudoElement(selector) {
  let depth = 0
  for (let i = 0; i < selector.length; i++) {
    const c = selector[i]
    if (c === '(' || c === '[') depth++
    else if (c === ')' || c === ']') depth--
    else if (depth === 0 && c === ':') {
      if (selector[i + 1] === ':') return [selector.slice(0, i), selector.slice(i)]
      const legacy = selector.slice(i).match(LEGACY_PSEUDO_ELEMENT)
      if (legacy) return [selector.slice(0, i), `:${selector.slice(i)}`]
    }
  }
  return [selector, '']
}

/**
 * Scopes one selector. `weak` = reset/theme rule (keeps zero specificity under the root id).
 * `root` is the game's root selector (VoxelCraft's by default; other games pass their own).
 */
export function scopeSelector(selector, weak, root = ROOT) {
  const sel = selector.trim()
  if (ROOT_ALIAS.test(sel)) {
    const rest = sel.replace(ROOT_ALIAS, '')
    return rest ? `${root}${rest}` : root
  }
  if (!weak) return sel === '*' ? `${root}, ${root} *` : `${root} ${sel}`
  const [head, pseudo] = splitPseudoElement(sel)
  if (!head) return `${root} ${pseudo}` // ::before, ::backdrop…
  const scoped = `${root} :where(${head})${pseudo}`
  return head === '*' && !pseudo ? `${root}, ${scoped}` : scoped
}

const layerOf = (node) => {
  for (let p = node.parent; p; p = p.parent) if (p.type === 'atrule' && p.name === 'layer') return p.params.trim()
  return null
}
const insideKeyframes = (node) => {
  for (let p = node.parent; p; p = p.parent) if (p.type === 'atrule' && /keyframes$/.test(p.name)) return true
  return false
}
const nestedInRule = (node) => {
  for (let p = node.parent; p; p = p.parent) if (p.type === 'rule') return true
  return false
}

/**
 * Scopes a whole Tailwind build. Options let other precompiled-Tailwind games reuse this:
 *   root            the game's root id selector, e.g. '#math-hero-pro-root'
 *   keyframePrefix  prefix for its (global) @keyframes names, e.g. 'mhp-'
 */
export function scopeCss(css, { root: rootSelector = ROOT, keyframePrefix = KEYFRAME_PREFIX } = {}) {
  const ast = postcss.parse(css)

  // 4. global keyframe names → vc-*
  const renames = new Map()
  ast.walkAtRules(/keyframes$/, (at) => {
    const name = at.params.trim()
    if (!name.startsWith(keyframePrefix)) {
      renames.set(name, keyframePrefix + name)
      at.params = keyframePrefix + name
    }
  })
  if (renames.size) {
    const pattern = new RegExp(`(^|[\\s,])(${[...renames.keys()].join('|')})(?=$|[\\s,])`, 'g')
    ast.walkDecls((decl) => {
      if (/^(animation|animation-name)$/.test(decl.prop) || decl.prop.startsWith('--animate')) {
        decl.value = decl.value.replace(pattern, (_, pre, name) => pre + renames.get(name))
      }
    })
  }

  // 1 + 3. scope every rule
  ast.walkRules((rule) => {
    if (insideKeyframes(rule) || nestedInRule(rule)) return
    const layer = layerOf(rule)
    const weak = layer === 'theme' || layer === 'base' || layer === 'properties'
    rule.selectors = rule.selectors.map((s) => scopeSelector(s, weak, rootSelector))
  })

  // 2. remove cascade layers (keep their contents, in order)
  ast.walkAtRules('layer', (at) => {
    if (at.nodes?.length) at.replaceWith(at.nodes)
    else at.remove()
  })

  // guard: nothing may match outside the game
  ast.walkRules((rule) => {
    if (insideKeyframes(rule) || nestedInRule(rule)) return
    for (const s of rule.selectors) {
      if (!s.startsWith(rootSelector)) throw new Error(`Unscoped selector in ${rootSelector} CSS: "${s}"`)
    }
  })
  ast.walkAtRules(/keyframes$/, (at) => {
    if (!at.params.trim().startsWith(keyframePrefix)) throw new Error(`Unprefixed @keyframes ${at.params}`)
  })

  return isolationFor(rootSelector) + ast.toString()
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const fromIdx = process.argv.indexOf('--from')
  const raw = fromIdx > -1 ? readFileSync(process.argv[fromIdx + 1], 'utf8') : compileTailwind()
  const banner =
    '/* GENERATED by scripts/build-voxelcraft-css.mjs from tailwind.input.css. Do not edit by hand.\n' +
    `   Every rule is scoped to ${ROOT}; see the script for why. */\n`
  writeFileSync(output, banner + scopeCss(raw).trim() + '\n')
  console.log(`voxelcraft.css written (${(readFileSync(output).length / 1024).toFixed(1)} KB)`)
}
