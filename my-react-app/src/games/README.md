# Adding a game to the Bulbuli arcade

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
| `playerId` | signed-in user ID, or `'guest'`. Pass it to `useTutorialProgress(playerId)`. |
| `language` | `'en'` or `'bn'`. Re-renders when the player switches language. |
| `game`     | the game's own registry entry. |

The page already has an `<h1>`-free game bar and a `<main>`; the game renders
its own `<h1>` inside a `<div>`.

## 2. Save progress and XP

```js
const { games, saveGameResult } = useTutorialProgress(playerId)
const record = games['my-game'] ?? {}
saveGameResult('my-game', (previous) => ({ ...previous, best: 10 }), xpEarned)
```

`saveGameResult` stores any plain object under the game's ID and adds
`xpEarned` to the player's total XP shown on the home page. Progress is kept in
localStorage, per player, on this device.

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
  Art: MyGameArt,
  load: () => import('./my-game/index.jsx'),
  isNew: true,
}
```

Also add `https://bulbuli.org/games/my-game` to `public/sitemap.xml`.

## Shared helpers

- Sounds: `playSound('click' | 'correct' | 'wrong' | 'complete')` from `src/utils/sound.js` (respects the mute switch).
- Bangla digits: `formatDigits(value, language)` from `src/utils/mathHeroText.js`.
- Grid map for coding games: `GridMap` from `src/shared/ui/GridMap.jsx`, driven by `run()` from `src/games/code-critter/engine.js` (Code Critter and Bug Hunter use both).
- Toy styling tokens: `--ink`, `--toy-border`, `--toy-lift`, `--sun`, `--leaf`, `--berry`, `--sky`, `--grape` in `src/styles/global.css`.

## A game that is its own app

Pattern Quest (`pattern-quest/`) is a complete app with its own styles, so it
runs inside a frame (`/embed/pattern-quest`, see `src/main.jsx`) and sets
`ownControls: true` so the game bar hides the language and sound buttons.
