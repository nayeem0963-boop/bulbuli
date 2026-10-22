// Two entry points share this page:
//  - /embed/pattern-quest loads Pattern Quest on its own, inside the arcade's game frame;
//  - everything else loads the Bulbuli arcade.
// Each one imports only its own styles, so the two never clash.
const root = document.getElementById('root')

if (window.location.pathname.startsWith('/embed/pattern-quest')) {
  import('./games/pattern-quest/embed.jsx').then(({ mount }) => mount(root))
} else {
  import('./arcade-entry.jsx').then(({ mount }) => mount(root))
}
