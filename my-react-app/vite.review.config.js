/**
 * CONTROLLED REVIEW BUILD of the Phase 2A games (World Explorer 3D + Sky Science Explorer).
 *
 *   npm run build:review     → dist-review/  (deploy as its OWN site; see docs/PHASE-2A-REVIEW-BUILD.md)
 *   npm run preview:review   → serves dist-review/ locally, exactly as built
 *
 * The normal build (vite.config.js → dist/) is completely separate and unchanged: it never sees
 * review/, the review adapter or the Phase 2A games (test I1).
 *
 * What this build contains, and nothing else:
 *   - review/index.html as the site's only page (root: review/), with every route served by it
 *   - the review adapter, allowed to exist because this config defines VITE_BULBULI_REVIEW_BUILD
 *   - the five public assets the two games load (Bulbuli model + four sounds) and the favicon:
 *     NOT the main site's service worker, manifest, sitemap or robots.txt
 *   - three's bundled Draco decoder at /draco/ (the release-time self-hosting of design 1.8,
 *     limited to this review site; the main site's public/ is untouched)
 *   - Netlify _headers (noindex, no referrer, no framing) and a robots.txt that disallows all
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** The only public/ files the review page needs (checked by test R1). */
export const REVIEW_PUBLIC_ASSETS = [
  'favicon.svg',
  'models/bulbuli.glb',
  'sounds/click.mp3',
  'sounds/complete.mp3',
  'sounds/correct.mp3',
  'sounds/wrong.mp3',
]
const DRACO_DIR = 'node_modules/three/examples/jsm/libs/draco/gltf'
export const DRACO_FILES = ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js']

export const REVIEW_HEADERS = `/*
  X-Robots-Tag: noindex, nofollow, noarchive
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
/draco/*
  Cache-Control: public, max-age=604800
`
export const REVIEW_ROBOTS = 'User-agent: *\nDisallow: /\n'

function reviewSiteFiles() {
  return {
    name: 'bulbuli-review-site-files',
    apply: 'build',
    generateBundle() {
      const emit = (fileName, source) => this.emitFile({ type: 'asset', fileName, source })
      for (const asset of REVIEW_PUBLIC_ASSETS) emit(asset, readFileSync(path.resolve(__dirname, 'public', asset)))
      for (const file of DRACO_FILES) emit(`draco/${file}`, readFileSync(path.resolve(__dirname, DRACO_DIR, file)))
      emit('_headers', REVIEW_HEADERS)
      emit('robots.txt', REVIEW_ROBOTS)
    },
  }
}

export default defineConfig(({ command }) => ({
  root: path.resolve(__dirname, 'review'),
  // the dev server (vite --config vite.review.config.js) serves public/ as usual; the build
  // copies only the files listed above
  publicDir: command === 'build' ? false : path.resolve(__dirname, 'public'),
  // Read env files ONLY from review/ (which has none), never the project's .env: the review build
  // must not contain the main site's Supabase URL or key, even unused (test R2 checks the output).
  envDir: path.resolve(__dirname, 'review'),
  plugins: [react(), reviewSiteFiles()],
  define: {
    'import.meta.env.VITE_BULBULI_REVIEW_BUILD': JSON.stringify('true'),
  },
  server: { fs: { allow: [__dirname] } },
  build: {
    outDir: path.resolve(__dirname, 'dist-review'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
  },
}))
