import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// ES modules have no __dirname, so build it from this file's URL.
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Serves the standalone HTML Learning Quiz (quiz/index.html) at /quiz/ in `vite` (dev) and
 * `vite preview`. It runs before Vite's own middleware, so these addresses never reach the
 * SPA fallback, which would load the React hub (whose catch-all route redirects to /).
 *   /quiz        → 302 redirect to /quiz/
 *   /quiz/       → quiz/index.html
 * On Netlify the built dist/quiz/index.html is a real file, which wins over the /* redirect.
 */
function quizPagePlugin() {
  const serveQuiz = (req, res, next) => {
    const [pathname, query] = (req.url ?? '').split('?')
    const search = query ? `?${query}` : ''
    if (pathname === '/quiz') {
      res.statusCode = 302
      res.setHeader('Location', `/quiz/${search}`)
      res.end()
      return
    }
    if (pathname === '/quiz/') req.url = `/quiz/index.html${search}`
    next()
  }

  return {
    name: 'bulbuli-quiz-page',
    configureServer(server) {
      server.middlewares.use(serveQuiz)
      // Print the quiz address under Vite's usual "Local:" line.
      const printUrls = server.printUrls
      server.printUrls = () => {
        printUrls()
        const base = server.resolvedUrls?.local?.[0]
        if (base) server.config.logger.info(`  ➜  HTML Quiz: ${base}quiz/`)
      }
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveQuiz)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), quizPagePlugin()],
  build: {
    chunkSizeWarningLimit: 1000, // raises the warning limit to 1000 kB
    rolldownOptions: {
      // Three HTML pages. share/math-hero/index.html only adds its own link-preview tags,
      // so a shared Math Hero link shows the Math Hero card in chat apps.
      input: {
        main: path.resolve(__dirname, 'index.html'),
        mathHeroShare: path.resolve(__dirname, 'share/math-hero/index.html'),
        // HTML Learning Quiz: a standalone page served at /quiz/ (see quizPagePlugin above)
        quiz: path.resolve(__dirname, 'quiz/index.html'),
      },
    },
  },
})
