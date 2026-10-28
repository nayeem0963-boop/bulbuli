# Adding a game to the Pro Coder arcade

Every game is a folder in `src/games/` and one entry in `src/games/registry.js`.
The arcade home page, the `/games/<id>` page, the page title and the shared
game bar (back button, language, sound, day/night) all come from that entry.

## 1. Make the folder

```
src/games/my-game/
  Art.jsx        small picture for the home-page tile (loads with the home page, keep it light)
  index.jsx      the game itself (loads only when a player opens it)
  text.js        { en, bn } words the game shows
  engine.js      rules with no React in them, so they can be tested
  engine.test.js node:test tests, run with `npm test`
  my-game.css    styles, imported from index.jsx
```

`index.jsx` default-exports a component. It receives:

| prop       | what it is |
|------------|------------|
| `playerId` | signed-in user ID, or `'guest'`. Pass it to `useGameProgress(playerId)`. |
| `language` | `'en'` or `'bn'`. Re-renders when the player switches language. |
| `game`     | the game's own registry entry. |

The page already has an `<h1>`-free game bar and a `<main>`; the game renders
its own `<h1>` inside a `<div>`.

## 2. Save progress and XP

```js
const { games, saveGameResult } = useGameProgress(playerId)
const record = games['my-game'] ?? {}
saveGameResult('my-game', (previous) => ({ ...previous, best: 10 }), xpEarned)
```

`saveGameResult` stores any plain object under the game's ID and adds
`xpEarned` to the player's total XP shown on the home page. Progress is kept in
localStorage, per player, on this device.

**Signed-in players' XP is also saved to their account automatically.** You don't
need to do anything: `saveGameResult` calls `awardXp(playerId, gameId, xpEarned)`
from `src/lib/xp.js`, which does nothing for guests and, for signed-in players,
batches the award and sends it to the `award_xp()` SQL function (retried safely,
never counted twice). Games must never check whether someone is signed in.

For an activity that isn't a game (say, a daily challenge), call it directly:

```js
import { awardXp } from '../../lib/xp.js'

function onChallengeFinished(playerId, correctAnswers) {
  const xp = correctAnswers * 10
  showStars(xp)                              // guests see their reward too
  awardXp(playerId, 'daily-challenge', xp)   // saved only if signed in
}
```

## 3. Register it

Add an entry to `GAMES` in `registry.js` (the fields are documented there):

```js
{
  id: 'my-game',
  title: { en: 'My Game', bn: 'আমার খেলা' },
  tagline: { en: 'One short sentence.', bn: '…' },
  skill: { en: 'What it practises', bn: '…' },
  ages: '5–9',
  color: 'berry',            // sun | sky | leaf | berry | grape
  category: 'young',         // young | logic | arcade: the audience pill it shows under
  zone: 'play-learn',        // play-learn (ages up to 12) | build-create (12+): its home-page section
  Art: MyGameArt,
  load: () => import('./my-game/index.jsx'),
  isNew: true,
}
```

Also add `https://bulbuli.org/games/my-game` to `public/sitemap.xml`.

### Opening in the launcher instead of a page

Add `launch: 'modal'` (and a one-line `controls: { en, bn }`) to open the game from its tile
in the launcher dialog on the Play page (`src/arcade/GameModal.jsx`), embedded or full screen.
The address becomes `/?category=<category>&play=<id>`, so Back closes it; `/games/<id>` still works.
The game then also receives:

| prop        | what it is |
|-------------|------------|
| `embedded`  | `true` in the launcher: skip your page header and fill the parent's height. |
| `autoStart` | `true` in the launcher: the player already pressed Start, so skip your own start screen. |


## Shared helpers

- Sounds: `playSound('click' | 'correct' | 'wrong' | 'complete')` from `src/utils/sound.js` (respects the mute switch).
- Bangla digits: `formatDigits(value, language)` from `src/utils/mathHeroText.js`.
- Toy styling tokens: `--ink`, `--toy-border`, `--toy-lift`, `--sun`, `--leaf`, `--berry`, `--sky`, `--grape` in `src/styles/global.css`.

## A game that is its own app

Pattern Quest (`pattern-quest/`) is a complete app with its own styles, so it
runs inside a frame (`/embed/pattern-quest`, see `src/main.jsx`) and sets
`ownControls: true` so the game bar hides the language and sound buttons.

Add `fullscreen: true` to give the game a full-screen button in its game bar. It uses the
browser Fullscreen API on the game frame (game bar + game, not the whole site) through
`src/shared/hooks/useFullscreen.js`, and keeps the game mounted, so scores and levels carry
through. Canvases should size from their frame (react-three-fiber does) so they follow along.
