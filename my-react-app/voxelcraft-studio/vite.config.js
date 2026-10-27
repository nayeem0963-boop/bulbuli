import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Pinned Tailwind v4 browser build, used only when @tailwindcss/vite is not installed yet.
const TAILWIND_CDN = 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.1.11'

/**
 * Tailwind is compiled at build time by @tailwindcss/vite (the production path).
 * Until `npm install` has run in this folder, the project borrows React/three/Vite from the
 * parent app's node_modules, which has no Tailwind. In that case we redirect the Tailwind entry
 * stylesheet to a near-empty stub and inject Tailwind's browser build instead, so `npm run dev`
 * still renders correctly. Once Tailwind is installed, this fallback switches itself off.
 */
async function loadTailwind() {
  try {
    const { default: tailwindcss } = await import('@tailwindcss/vite')
    return [tailwindcss()]
  } catch {
    console.warn(
      '\n[voxelcraft] @tailwindcss/vite not found: using the Tailwind browser CDN fallback.' +
        '\n             Run `npm install` in voxelcraft-studio/ for the compiled, production build.\n',
    )
    const fallbackCss = path.resolve(__dirname, 'src/styles/tailwind-fallback.css')
    return [
      {
        name: 'voxelcraft-tailwind-cdn-fallback',
        enforce: 'pre',
        // `@import "tailwindcss"` can't resolve without the package, so serve the stub instead.
        resolveId(source) {
          if (source.replaceAll('\\', '/').endsWith('styles/tailwind.css')) return fallbackCss
          return null
        },
        transformIndexHtml: () => [
          { tag: 'script', attrs: { src: TAILWIND_CDN }, injectTo: 'head-prepend' },
        ],
      },
    ]
  }
}

export default defineConfig(async () => {
  const tailwindPlugins = await loadTailwind()

  return {
    plugins: [react(), ...tailwindPlugins],
    resolve: {
      // One copy of React and three, even when resolved from the parent folder's node_modules.
      dedupe: ['react', 'react-dom', 'three'],
    },
    optimizeDeps: {
      include: ['three', '@react-three/fiber', '@react-three/drei', 'lucide-react'],
    },
    server: {
      // Allow serving dependencies from ../node_modules while this folder has none of its own.
      fs: { allow: [path.resolve(__dirname, '..')] },
    },
    build: {
      // three + drei land in their own lazily loaded chunk (see Viewport3D import in BuildStudio).
      chunkSizeWarningLimit: 1200,
    },
  }
})
