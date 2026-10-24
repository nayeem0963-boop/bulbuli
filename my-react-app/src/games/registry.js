import MathHeroArt from './math-hero/Art.jsx'
import MemoryMatchArt from './memory-match/Art.jsx'
import PatternQuestArt from './pattern-quest/Art.jsx'
import TypeRunnerArt from './type-runner/Art.jsx'
import CodeCritterArt from './code-critter/Art.jsx'
import BugHunterArt from './bug-hunter/Art.jsx'
import DevCraftArt from './devcraft-studio/Art.jsx'
import LogicGateArt from './logic-gate-builder/Art.jsx'

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
  {
    id: 'code-critter',
    title: { en: 'Code Critter', bn: 'কোড ক্রিটার' },
    tagline: { en: 'Line up code blocks to guide Bulbuli home.', bn: 'কোড ব্লক সাজিয়ে বুলবুলিকে বাসায় ফেরাও।' },
    skill: { en: 'Coding & Logic', bn: 'কোডিং ও যুক্তি' },
    ages: '7–12',
    color: 'grape',
    Art: CodeCritterArt,
    load: () => import('./code-critter/index.jsx'),
    isNew: true,
  },
  {
    id: 'bug-hunter',
    title: { en: 'Bug Hunter', bn: 'বাগ হান্টার' },
    tagline: { en: 'Find the bug in Bulbuli\'s code and fix it.', bn: 'বুলবুলির কোডের বাগ খুঁজে ঠিক করো।' },
    skill: { en: 'Debugging & Logic', bn: 'ডিবাগিং ও যুক্তি' },
    ages: '7–12',
    color: 'leaf',
    Art: BugHunterArt,
    load: () => import('./bug-hunter/index.jsx'),
    isNew: true,
  },
  {
    id: 'devcraft-studio',
    title: { en: 'DevCraft Studio', bn: 'ডেভক্রাফট স্টুডিও' },
    tagline: { en: 'Style real CSS until your design matches the target.', bn: 'আসল CSS দিয়ে ডিজাইনকে টার্গেটের মতো বানাও।' },
    skill: { en: 'Web Dev & CSS', bn: 'ওয়েব ডেভ ও CSS' },
    ages: '12+',
    color: 'sky',
    Art: DevCraftArt,
    load: () => import('./devcraft-studio/index.jsx'),
    isNew: true,
  },
  {
    id: 'logic-gate-builder',
    title: { en: 'Logic Gate Builder', bn: 'লজিক গেট বিল্ডার' },
    tagline: { en: 'Wire logic gates to light the bulb and open the door.', bn: 'লজিক গেট জুড়ে বাল্ব জ্বালাও, দরজা খোলো।' },
    skill: { en: 'Logic & Circuits', bn: 'লজিক ও সার্কিট' },
    ages: '12+',
    color: 'sun',
    Art: LogicGateArt,
    load: () => import('./logic-gate-builder/index.jsx'),
    isNew: true,
  },
]

export const getGame = (id) => GAMES.find((game) => game.id === id) ?? null
