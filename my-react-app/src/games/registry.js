import MathHeroArt from './math-hero/Art.jsx'
import MemoryMatchArt from './memory-match/Art.jsx'
import PatternQuestArt from './pattern-quest/Art.jsx'
import TypeRunnerArt from './type-runner/Art.jsx'

/**
 * Every game in the arcade, in the order it appears on the home page.
 * Adding a game = a folder in src/games/<id>/ plus one entry here. See src/games/README.md.
 *
 * Fields:
 *   id            URL slug: the game lives at /games/<id>. Lowercase letters, digits and dashes.
 *   title         { en, bn } name shown on the tile and the game page.
 *   tagline       { en, bn } one short sentence a child can read.
 *   skill         { en, bn } what the game practises (shown to grown-ups on the tile).
 *   ages          age range, e.g. '5–9'.
 *   color         tile colour: 'sun' | 'sky' | 'leaf' | 'berry' | 'grape'.
 *   Art           small component drawn on the tile. Keep it light: it loads with the home page.
 *   load          () => import('./<id>/index.jsx'). The game itself loads only when opened.
 *   ownControls   true when the game draws its own language / sound buttons, so the frame hides them.
 *   isNew         shows a "New" badge on the tile.
 *
 * A game component receives { playerId, language } and should save through useTutorialProgress(playerId).
 */
export const GAMES = [
  {
    id: 'math-hero',
    title: { en: 'Math Hero', bn: 'ম্যাথ হিরো' },
    tagline: { en: 'Add and take away to beat the clock.', bn: 'যোগ-বিয়োগ করে ঘড়িকে হারাও।' },
    skill: { en: 'Addition & subtraction', bn: 'যোগ ও বিয়োগ' },
    ages: '6–10',
    color: 'sun',
    Art: MathHeroArt,
    load: () => import('./math-hero/index.jsx'),
  },
  {
    id: 'memory-match',
    title: { en: 'Memory Match', bn: 'মেমরি ম্যাচ' },
    tagline: { en: 'Flip the cards and find the pairs.', bn: 'কার্ড উল্টে জোড়া খুঁজে বের করো।' },
    skill: { en: 'Memory & first words', bn: 'স্মৃতি ও প্রথম শব্দ' },
    ages: '4–9',
    color: 'leaf',
    Art: MemoryMatchArt,
    load: () => import('./memory-match/index.jsx'),
    isNew: true,
  },
  {
    id: 'pattern-quest',
    title: { en: 'Pattern Quest', bn: 'প্যাটার্ন খোঁজ' },
    tagline: { en: 'What comes next? Spot the rule.', bn: 'এরপর কী আসবে? নিয়মটা খুঁজে বের করো।' },
    skill: { en: 'Number & shape patterns', bn: 'সংখ্যা ও আকারের নকশা' },
    ages: '7–11',
    color: 'sky',
    Art: PatternQuestArt,
    load: () => import('./pattern-quest/index.jsx'),
    ownControls: true,
    isNew: true,
  },
  {
    id: 'type-runner',
    title: { en: 'Type Runner', bn: 'টাইপ রানার' },
    tagline: { en: 'Press the right keys and race to the flag.', bn: 'ঠিক কী চেপে পতাকা পর্যন্ত দৌড়াও।' },
    skill: { en: 'Typing & Speed Keys', bn: 'টাইপিং ও স্পিড কী' },
    ages: '6–11',
    color: 'berry',
    Art: TypeRunnerArt,
    load: () => import('./type-runner/index.jsx'),
    isNew: true,
  },
]

export const getGame = (id) => GAMES.find((game) => game.id === id) ?? null
