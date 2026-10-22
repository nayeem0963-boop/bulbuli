import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000, // raises the warning limit to 1000 kB
    rolldownOptions: {
      // Two HTML pages, one app. share/math-hero/index.html only adds its own link-preview tags,
      // so a shared Math Hero link shows the Math Hero card in chat apps.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        mathHeroShare: fileURLToPath(new URL('./share/math-hero/index.html', import.meta.url)),
      },
    },
  },
})
