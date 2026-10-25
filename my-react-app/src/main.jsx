// Two entry points share this page:
//  - /embed/pattern-quest loads Pattern Quest on its own, inside the arcade's game frame;
//  - everything else loads the Bulbuli arcade.
// Each one imports only its own styles, so the two never clash.
import { registerServiceWorker } from './pwa/installPrompt.js'

// Start listening for the browser's install prompt right away (it can fire before React renders),
// and register the service worker that makes Bulbuli installable.
registerServiceWorker()

const root = document.getElementById('root')

if (window.location.pathname.startsWith('/embed/pattern-quest')) {
  import('./games/pattern-quest/embed.jsx').then(({ mount }) => mount(root))
} else {
  import('./arcade-entry.jsx').then(({ mount }) => mount(root))
}
