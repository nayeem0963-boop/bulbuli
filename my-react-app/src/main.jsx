// Entry point: loads the Bulbuli arcade.
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
