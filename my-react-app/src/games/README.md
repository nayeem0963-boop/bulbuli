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

## Using the screen: the game frame and full screen

Every game page puts the game in a frame of its own (`src/arcade/GameFullscreen.jsx`, styled in
`src/arcade/game-shell.css`). The frame fills the screen under the game bar from the start, so a
game opens immersive without a button, and it is the element that goes browser full screen
(just the game, not the site) through `src/shared/hooks/useFullscreen.js`. The game stays
mounted, so scores, timers and levels carry through.

- Put `<GameFullscreenButton />` in the game's own header (inside the frame, so it is still
  there in full screen) and set `fullscreen: true` in the registry. A header made of a title and
  a line of text can take the `game-fs-header` class to line the button up on the right.
- Lay the game out under `.game-fs-<id>` in its CSS. The frame is a CSS size container named
  `game`: size things from it with `cqw` / `cqh` / `cqi` / `cqmin` and `@container game (...)`
  queries, not `100vw` / `100dvh`, so one layout works under the game bar and in full screen.
- Shared fluid tokens are defined on the frame: `--game-text-xs … --game-text-display`,
  `--game-gap`, `--game-gap-sm`, `--game-pad`, `--game-touch`, `--game-touch-lg`, `--game-radius`.
- A screen taller than the frame scrolls inside the frame (never the page). A game that must fit
  exactly (a 3D stage, a board) can take `flex: 1 1 0; min-height: 0` and fill the height.
- Canvases should size from their box (react-three-fiber does, and updates the camera).
- Pop-ups with `position: fixed` inside a game still cover the whole window (a size container
  doesn't contain layout), and the whole display in full screen.
