import MathHeroArt from './math-hero/Art.jsx'
import MemoryMatchArt from './memory-match/Art.jsx'
import PatternQuestArt from './pattern-quest/Art.jsx'
import DevCraftArt from './devcraft-studio/Art.jsx'
import LogicGateArt from './logic-gate-builder/Art.jsx'
import Bulbuli3DArt from './bulbuli-3d/Art.jsx'
import ShapeHuntArt from './shape-hunt/Art.jsx'
import ShapeSortingArt from './shape-sorting/Art.jsx'
import SkyRunnerArt from './sky-runner/Art.jsx'
import SkywardExplorerArt from './skyward-explorer/Art.jsx'
import SkyTypewriterArt from './sky-typewriter/Art.jsx'
import NeonVelocityArt from './neon-velocity/Art.jsx'
import HTMLArchitectArt from './html-architect/Art.jsx'

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
 *   icon          one emoji standing for the game in small places (the dashboard's activity list).
 *   category      the audience pill the tile shows under: 'young' (3–8) | 'logic' (6–12) | 'arcade' (12+)
 *                 (see categories.js). Every game also shows under All Games.
 *   Art           small component drawn on the tile. Keep it light: it loads with the home page.
 *   load          () => import('./<id>/index.jsx'). The game itself loads only when opened.
 *   ownControls   true when the game draws its own language / sound buttons, so the frame hides them.
 *   isNew         shows a "New" badge on the tile.
 *   hidden        true keeps the tile off the home page; the game still opens at /games/<id> (for work in progress).
 *   launch        'modal' opens the game in the launcher dialog on the Play page (GameModal.jsx), embedded or
 *                 full screen; the game gets { embedded, autoStart }. Without it the tile opens /games/<id>.
 *   controls      { en, bn } one line on how to play, shown on the launcher.
 *   path          the game's own address instead of /games/<id> (the tile and dashboard link there;
 *                 App.jsx must have a matching route, and /games/<id> redirects to it).
 *
 * A game component receives { playerId, language } and should save through useGameProgress(playerId).
 */
export const GAMES = [
  {
    id: 'math-hero',
    title: { en: 'Math Hero', bn: 'ম্যাথ হিরো' },
    tagline: { en: 'Add and take away to beat the clock.', bn: 'যোগ-বিয়োগ করে ঘড়িকে হারাও।' },
    skill: { en: 'Addition & subtraction', bn: 'যোগ ও বিয়োগ' },
    ages: '6–10',
    color: 'sun',
    icon: '➕',
    category: 'logic',
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
    icon: '🃏',
    category: 'young',
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
    icon: '🔷',
    category: 'logic',
    Art: PatternQuestArt,
    load: () => import('./pattern-quest/index.jsx'),
    ownControls: true,
    isNew: true,
  },
  {
    id: 'devcraft-studio',
    title: { en: 'DevCraft Studio', bn: 'ডেভক্রাফট স্টুডিও' },
    tagline: { en: 'Style real CSS until your design matches the target.', bn: 'আসল CSS দিয়ে ডিজাইনকে টার্গেটের মতো বানাও।' },
    skill: { en: 'Web Dev & CSS', bn: 'ওয়েব ডেভ ও CSS' },
    ages: '12+',
    color: 'sky',
    icon: '🎨',
    category: 'arcade',
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
    icon: '💡',
    category: 'arcade',
    Art: LogicGateArt,
    load: () => import('./logic-gate-builder/index.jsx'),
    isNew: true,
  },
  {
    id: 'bulbuli-3d',
    title: { en: 'Bulbuli 3D', bn: 'বুলবুলি ৩ডি' },
    tagline: { en: 'Tap the 3D bird to collect stars.', bn: '৩ডি পাখিটাকে ছুঁয়ে তারা জমাও।' },
    skill: { en: 'Tapping & 3D play', bn: 'ছোঁয়া ও ৩ডি খেলা' },
    ages: '3–8',
    color: 'sky',
    icon: '🐦',
    category: 'young',
    Art: Bulbuli3DArt,
    // three.js + the 3 MB model load only when this game is opened.
    load: () => import('./bulbuli-3d/index.jsx'),
    isNew: true,
  },
  {
    id: 'shape-hunt',
    title: { en: 'Shape Hunt 3D', bn: 'আকার খোঁজ ৩ডি' },
    tagline: { en: 'Find the cube, cone or sphere Bulbuli asks for.', bn: 'বুলবুলি যে ঘনক, কোণক বা গোলক চায়, খুঁজে বের করো।' },
    skill: { en: '3D shapes', bn: 'ত্রিমাত্রিক আকার' },
    ages: '4–8',
    color: 'leaf',
    icon: '🔺',
    category: 'young',
    Art: ShapeHuntArt,
    // three.js loads only when the game is opened.
    load: () => import('./shape-hunt/index.jsx'),
    isNew: true,
  },
  {
    id: 'shape-sorting',
    title: { en: 'Shape Sorting Factory', bn: 'আকার সাজানোর কারখানা' },
    tagline: { en: 'Drag each shape into the right bin before it falls off the belt.', bn: 'বেল্ট থেকে পড়ার আগে প্রতিটা আকার ঠিক ঝুড়িতে রাখো।' },
    skill: { en: 'Shapes, colours & sorting', bn: 'আকার, রং ও সাজানো' },
    ages: '4–8',
    color: 'grape',
    icon: '🧩',
    category: 'young',
    Art: ShapeSortingArt,
    // three.js loads only when the game is opened; the 3D scene itself is lazy-loaded inside.
    load: () => import('./shape-sorting/index.jsx'),
    isNew: true,
  },
  {
    id: 'sky-runner',
    title: { en: "Bulbuli's Sky Runner", bn: 'বুলবুলির আকাশ দৌড়' },
    tagline: { en: 'Fly through the sky, collect stars and dodge the rain clouds.', bn: 'আকাশে উড়ে তারা জমাও, বৃষ্টির মেঘ এড়িয়ে চলো।' },
    skill: { en: 'Reflexes & left / right', bn: 'দ্রুত সাড়া ও বাঁ / ডান' },
    ages: '4–9',
    color: 'sky',
    icon: '☁️',
    category: 'young',
    Art: SkyRunnerArt,
    // three.js and the Bulbuli model load only when a run starts.
    load: () => import('./sky-runner/index.jsx'),
    isNew: true,
  },
  {
    id: 'skyward-explorer',
    title: { en: 'Bulbuli: Skyward Explorer 3D', bn: 'বুলবুলি: আকাশ অভিযাত্রী ৩ডি' },
    tagline: { en: 'Climb floating islands and gather energy crystals.', bn: 'ভাসমান দ্বীপ বেয়ে ওঠো, শক্তি-স্ফটিক জমাও।' },
    skill: { en: '3D parkour & exploring', bn: '৩ডি পার্কুর ও অভিযান' },
    ages: '12+',
    color: 'sky',
    icon: '🏝️',
    category: 'arcade',
    Art: SkywardExplorerArt,
    // three.js and the scene load only when the game is opened.
    load: () => import('./skyward-explorer/index.jsx'),
    launch: 'modal',
    controls: {
      en: 'WASD or arrows to run · Space to jump, hold it in the air to glide · drag to look. On touch screens: stick to move, button to jump.',
      bn: 'WASD বা তীর চিহ্নে দৌড়াও · Space-এ লাফ, শূন্যে চেপে ধরলে গ্লাইড · টেনে চারপাশ দেখো। টাচ স্ক্রিনে: স্টিকে চলো, বোতামে লাফাও।',
    },
    isNew: true,
  },
  {
    id: 'neon-velocity',
    title: { en: 'Bulbuli: Neon Velocity', bn: 'বুলবুলি: নিয়ন ভেলোসিটি' },
    tagline: {
      en: 'High-speed 3D parkour and speedrunning through neon skyways.',
      bn: 'নিয়ন আকাশপথে দুর্দান্ত গতির ৩ডি পার্কুর আর স্পিডরান।',
    },
    skill: { en: '3D parkour & speedrun', bn: '৩ডি পার্কুর ও স্পিডরান' },
    ages: '13+',
    color: 'grape',
    icon: '⚡',
    category: 'arcade',
    Art: NeonVelocityArt,
    // three.js, Rapier physics and the post-processing load only when the game is opened.
    load: () => import('./neon-velocity/index.jsx'),
    launch: 'modal',
    controls: {
      en: 'A/D or arrows to switch lanes · W/Space to jump (again in the air to double jump, hold to glide) · S to slide · Esc to pause. On touch screens: swipe or use the buttons.',
      bn: 'A/D বা তীর চিহ্নে লেন বদলাও · W/Space-এ লাফ (শূন্যে আবার চাপলে ডাবল জাম্প, চেপে ধরলে গ্লাইড) · S-এ স্লাইড · Esc-এ থামাও। টাচ স্ক্রিনে: সোয়াইপ করো বা বোতাম চাপো।',
    },
    isNew: true,
  },
  {
    id: 'sky-typewriter',
    title: { en: 'SkyTypewriter 3D', bn: 'স্কাই টাইপরাইটার ৩ডি' },
    tagline: { en: 'Type the flying words before they reach Bulbuli.', bn: 'উড়ে আসা শব্দগুলো বুলবুলির কাছে পৌঁছানোর আগেই টাইপ করো।' },
    skill: { en: 'Typing & spelling', bn: 'টাইপিং ও বানান' },
    ages: '7–12',
    color: 'sky',
    icon: '⌨️',
    category: 'logic',
    Art: SkyTypewriterArt,
    // three.js and the scene load only when the game is opened.
    load: () => import('./sky-typewriter/index.jsx'),
    launch: 'modal',
    controls: {
      en: 'Type the letters of a flying word to zap it · Esc to pause. Needs a keyboard.',
      bn: 'উড়ন্ত শব্দের অক্ষর টাইপ করে সেটাকে ধরো · Esc চাপলে থামবে। কিবোর্ড লাগবে।',
    },
    isNew: true,
  },
  {
    id: 'html-architect',
    title: { en: 'Bulbuli’s HTML Architect 3D', bn: 'বুলবুলির HTML আর্কিটেক্ট ৩ডি' },
    tagline: {
      en: 'Write real HTML tags and watch Bulbuli’s building rise in 3D.',
      bn: 'আসল HTML ট্যাগ লেখো, আর দেখো বুলবুলির দালান ৩ডিতে গড়ে উঠছে।',
    },
    skill: { en: 'Web Dev & HTML', bn: 'ওয়েব ডেভ ও HTML' },
    ages: '8–12',
    color: 'grape',
    icon: '🏗️',
    category: 'logic',
    Art: HTMLArchitectArt,
    path: '/play/html-architect',
    // three.js and the code editor load only when the game is opened.
    load: () => import('./html-architect/index.jsx'),
    isNew: true,
  },
]

/** Where a game's page lives: its own `path`, or /games/<id>. */
export const gamePath = (game) => game?.path ?? `/games/${game?.id}`

/** The game whose own `path` is this address, if any. */
export const getGameByPath = (pathname) => GAMES.find((game) => game.path && game.path === pathname) ?? null

export const getGame = (id) => GAMES.find((game) => game.id === id) ?? null

export {
  ALL_GAMES, CATEGORY_AGES, CATEGORY_FILTERS, CATEGORY_ICONS, DEFAULT_FILTER, GAME_CATEGORIES,
  categoryCounts, categoryOf, gamesInCategory,
} from './categories.js'
