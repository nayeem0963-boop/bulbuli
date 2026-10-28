import MathHeroArt from './math-hero/Art.jsx'
import ShapeHuntArt from './shape-hunt/Art.jsx'
import ShapeSortingArt from './shape-sorting/Art.jsx'
import SkyRunnerArt from './sky-runner/Art.jsx'
import BallDashArt from './ball-dash/Art.jsx'
import BouncyHopArt from './bouncy-hop/Art.jsx'
import SkywardExplorerArt from './skyward-explorer/Art.jsx'
import SkyTypewriterArt from './sky-typewriter/Art.jsx'
import NeonVelocityArt from './neon-velocity/Art.jsx'
import HTMLArchitectArt from './html-architect/Art.jsx'
import MathMasterArt from './math-master/Art.jsx'

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
 *   zone          the home-page section the tile sits in: 'play-learn' (Play & Learn, ages up to 12) |
 *                 'build-create' (Build & Create, ages 12+: coding, typing, advanced challenges). See categories.js.
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
 *   fullscreen    true when the game shows the full-screen button in its own header with
 *                 <GameFullscreenButton />. Every game's page puts it in a frame of its own
 *                 (GameFullscreen.jsx + arcade/game-shell.css) that fills the screen under the game bar
 *                 from the start, and is what goes browser full screen: the game, not the arcade page.
 *                 The game lays itself out under .game-fs-<id>, sized from the frame (container units).
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
    zone: 'play-learn',
    Art: MathHeroArt,
    load: () => import('./math-hero/index.jsx'),
    fullscreen: true,
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
    zone: 'play-learn',
    Art: ShapeHuntArt,
    // three.js loads only when the game is opened.
    load: () => import('./shape-hunt/index.jsx'),
    fullscreen: true,
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
    zone: 'play-learn',
    Art: ShapeSortingArt,
    // three.js loads only when the game is opened; the 3D scene itself is lazy-loaded inside.
    load: () => import('./shape-sorting/index.jsx'),
    fullscreen: true,
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
    zone: 'play-learn',
    Art: SkyRunnerArt,
    // three.js and the Bulbuli model load only when a run starts.
    load: () => import('./sky-runner/index.jsx'),
    fullscreen: true,
    isNew: true,
  },
  {
    id: 'ball-dash',
    title: { en: 'Bulbuli Ball Dash', bn: 'বুলবুলি বল ড্যাশ' },
    tagline: {
      en: 'Roll, jump, shrink, and dodge your way through a colourful 3D adventure!',
      bn: 'গড়িয়ে চলো, লাফাও, ছোট হও আর বাধা এড়িয়ে রঙিন ৩ডি অভিযানে এগিয়ে যাও!',
    },
    skill: { en: 'Reflexes & timing', bn: 'দ্রুত সাড়া ও সময়জ্ঞান' },
    ages: '5–11',
    color: 'sun',
    icon: '🟡',
    category: 'young',
    zone: 'play-learn',
    Art: BallDashArt,
    // three.js and the scene load only when the game is opened.
    load: () => import('./ball-dash/index.jsx'),
    fullscreen: true,
    isNew: true,
  },
  {
    id: 'bouncy-hop',
    title: { en: 'Bulbuli Bouncy Hop 3D', bn: 'বুলবুলি বাউন্সি হপ ৩ডি' },
    tagline: {
      en: 'Bounce across floating sky tiles and land on the right number or letter!',
      bn: 'ভাসমান আকাশ-টাইলে লাফিয়ে ঠিক সংখ্যা বা অক্ষরের ওপর নামো!',
    },
    skill: { en: 'Skip counting & vowels', bn: 'লাফিয়ে গোনা ও স্বরবর্ণ' },
    ages: '5–9',
    color: 'berry',
    icon: '🏀',
    category: 'young',
    zone: 'play-learn',
    Art: BouncyHopArt,
    // three.js and the scene load only when the game is opened.
    load: () => import('./bouncy-hop/index.jsx'),
    fullscreen: true,
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
    zone: 'build-create',
    Art: SkywardExplorerArt,
    // three.js and the scene load only when the game is opened.
    load: () => import('./skyward-explorer/index.jsx'),
    fullscreen: true,
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
    zone: 'build-create',
    Art: NeonVelocityArt,
    // three.js, Rapier physics and the post-processing load only when the game is opened.
    load: () => import('./neon-velocity/index.jsx'),
    fullscreen: true,
    launch: 'modal',
    controls: {
      en: 'A/D or arrows to switch lanes · W/Space to jump (again in the air to double jump, hold to glide) · S to slide · Esc to pause. On touch screens: swipe or use the buttons.',
      bn: 'A/D বা তীর চিহ্নে লেন বদলাও · W/Space-এ লাফ (শূন্যে আবার চাপলে ডাবল জাম্প, চেপে ধরলে গ্লাইড) · S-এ স্লাইড · Esc-এ থামাও। টাচ স্ক্রিনে: সোয়াইপ করো বা বোতাম চাপো।',
    },
    isNew: true,
  },
  {
    id: 'sky-typewriter',
    title: { en: 'Sky Typewriter 3D', bn: 'স্কাই টাইপরাইটার ৩ডি' },
    tagline: { en: 'Type the flying words before they reach Bulbuli.', bn: 'উড়ে আসা শব্দগুলো বুলবুলির কাছে পৌঁছানোর আগেই টাইপ করো।' },
    skill: { en: 'Typing & spelling', bn: 'টাইপিং ও বানান' },
    ages: '7–12',
    color: 'sky',
    icon: '⌨️',
    category: 'logic',
    zone: 'play-learn',
    Art: SkyTypewriterArt,
    // three.js and the scene load only when the game is opened.
    load: () => import('./sky-typewriter/index.jsx'),
    fullscreen: true,
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
    zone: 'play-learn',
    Art: HTMLArchitectArt,
    path: '/play/html-architect',
    // three.js and the code editor load only when the game is opened.
    load: () => import('./html-architect/index.jsx'),
    fullscreen: true,
    isNew: true,
  },
  {
    id: 'math-master',
    title: { en: 'Math Master', bn: 'ম্যাথ মাস্টার' },
    tagline: {
      en: 'Master mathematics through challenging puzzles, interactive 3D challenges and progressively harder questions.',
      bn: 'চ্যালেঞ্জিং ধাঁধা, ইন্টারঅ্যাকটিভ ৩ডি চ্যালেঞ্জ আর ধাপে ধাপে কঠিন প্রশ্নে গণিতে দক্ষ হও।',
    },
    skill: { en: 'Algebra, geometry & problem solving', bn: 'বীজগণিত, জ্যামিতি ও সমস্যা সমাধান' },
    ages: '12+',
    color: 'grape',
    icon: '📐',
    category: 'arcade',
    zone: 'build-create',
    Art: MathMasterArt,
    // three.js and the 3D lab load only when the game is opened. Separate from Math Hero (ages 6–10).
    load: () => import('./math-master/index.jsx'),
    fullscreen: true,
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
  GAME_ZONES, ZONE_ICONS, gamesInZone, zoneOf, categoryCountsInZone,
} from './categories.js'
