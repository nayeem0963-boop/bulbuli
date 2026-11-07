/**
 * Bulbuli's learning catalogue: the cards on the home page (Phase 1 of the educational upgrade).
 *
 * The catalogue sits ON TOP of the game registry (src/games/registry.js); it never replaces it.
 * Every game keeps its own id, route, saved record (useGameProgress), XP id (award_xp game_id),
 * badges and certificates. A catalogue entry only decides how games are grouped and presented:
 *
 *   one entry  →  one or more modes  →  each mode opens an existing game route, unchanged
 *
 * So Math Hero's three modes still save and earn XP as 'math-hero', 'math-hero-pro' and
 * 'math-hero-pro-plus', exactly as before, and no stored progress needs migrating.
 *
 * No React and no JSX here, so node --test can check it (learningCatalog.test.js). The card
 * pictures are looked up by `art` in src/catalog/CatalogTile.jsx.
 *
 * Entry fields
 *   id            stable slug; the mode picker's address is /?learn=<id>
 *   zone          'play-learn' | 'build-create' (see src/games/categories.js)
 *   kind          'game' | 'course' (a standalone page, full page load) | 'tool' (a creative tool)
 *   category      one of LEARNING_CATEGORIES (the pills above the grid)
 *   title, tagline, learn   { en, bn }; `learn` is what the learner will learn (shown to grown-ups too)
 *   ages          age range shown on the card
 *   level         { en, bn } difficulty or learning level
 *   color         tile colour ('sun' | 'sky' | 'leaf' | 'berry' | 'grape')
 *   art           { game: <registry id> } | { game, tier } (Math Hero's series picture) | 'quiz' | 'studio'
 *   favoriteIds   registry ids whose ❤️ shows on this card; the first is the one a new ❤️ is saved under
 *   modes         the ways in. One mode: the card opens it directly. Several: the card opens the mode
 *                 picker. A mode has { id, title, learn, ages?, gameId, search? } or, for a course/tool,
 *                 { href } / { to }. A mode with `comingSoon: true` has no game and can't be opened.
 */

/** The pills above the grid. 'all' is the default and is not a category an entry can have. */
export const LEARNING_CATEGORIES = ['math', 'shapes', 'language', 'coding', 'create']
export const CATALOG_ALL = 'all'
export const CATALOG_FILTERS = [CATALOG_ALL, ...LEARNING_CATEGORIES]

export const CATEGORY_ICONS = { all: '📚', math: '🔢', shapes: '🔷', language: '🔤', coding: '💻', create: '🛠️' }

export const CATEGORY_LABELS = {
  en: {
    all: 'All',
    math: 'Maths & Numbers',
    shapes: 'Shapes & Space',
    language: 'Letters & Typing',
    coding: 'Coding',
    create: 'Create & Design',
  },
  bn: {
    all: 'সব',
    math: 'গণিত ও সংখ্যা',
    shapes: 'আকার ও স্থান',
    language: 'অক্ষর ও টাইপিং',
    coding: 'কোডিং',
    create: 'সৃষ্টি ও ডিজাইন',
  },
}

/** Old audience pills (before Phase 1): links like /?category=arcade still land somewhere sensible. */
export const LEGACY_CATEGORY_MODES = { young: 'play-learn', logic: 'play-learn', arcade: 'build-create' }

const PLAY_LEARN = 'play-learn'
const BUILD_CREATE = 'build-create'

export const CATALOG = [
  /* ---------------- Play & Learn (ages up to 12) ---------------- */
  {
    id: 'math-hero',
    zone: PLAY_LEARN,
    kind: 'game',
    category: 'math',
    title: { en: 'Math Hero', bn: 'ম্যাথ হিরো' },
    tagline: {
      en: 'Three modes, one hero: start with adding and finish with pre-algebra.',
      bn: 'তিনটি মোড, একজন হিরো: যোগ দিয়ে শুরু, প্রাক-বীজগণিতে শেষ।',
    },
    learn: {
      en: 'Adding, taking away, times tables, fractions, percentages and pre-algebra',
      bn: 'যোগ, বিয়োগ, গুণ, ভগ্নাংশ, শতকরা ও প্রাক-বীজগণিত',
    },
    ages: '6–12',
    level: { en: 'Starter → Advanced', bn: 'শুরু → উন্নত' },
    color: 'sun',
    art: { game: 'math-hero', tier: 1 },
    series: true,
    favoriteIds: ['math-hero', 'math-hero-pro', 'math-hero-pro-plus'],
    modes: [
      {
        id: 'starter',
        title: { en: 'Starter', bn: 'শুরু' },
        learn: { en: 'Add and take away to beat the clock.', bn: 'যোগ-বিয়োগ করে ঘড়িকে হারাও।' },
        ages: '6–10',
        gameId: 'math-hero',
      },
      {
        id: 'challenge',
        title: { en: 'Challenge', bn: 'চ্যালেঞ্জ' },
        learn: {
          en: 'Five missions: add, multiply, share, fractions and word puzzles.',
          bn: 'পাঁচটি মিশন: যোগ, গুণ, ভাগ, ভগ্নাংশ আর গল্পের ধাঁধা।',
        },
        ages: '6–11',
        gameId: 'math-hero-pro',
      },
      {
        id: 'advanced',
        title: { en: 'Advanced', bn: 'উন্নত' },
        learn: {
          en: 'Order of operations, percentages, ratios, pre-algebra and geometry.',
          bn: 'কাজের ক্রম, শতকরা, অনুপাত, প্রাক-বীজগণিত ও জ্যামিতি।',
        },
        ages: '10–12',
        gameId: 'math-hero-pro-plus',
      },
    ],
  },
  {
    id: 'shape-lab',
    zone: PLAY_LEARN,
    kind: 'game',
    category: 'shapes',
    title: { en: 'Shape Lab 3D', bn: 'শেপ ল্যাব ৩ডি' },
    tagline: {
      en: 'Find 3D shapes, then sort them in the factory.',
      bn: '৩ডি আকার খুঁজে বের করো, তারপর কারখানায় সাজাও।',
    },
    learn: {
      en: 'Naming 3D shapes, and sorting by shape and colour',
      bn: '৩ডি আকারের নাম, আর আকার ও রং অনুযায়ী সাজানো',
    },
    ages: '4–8',
    level: { en: 'Beginner', bn: 'প্রাথমিক' },
    color: 'leaf',
    art: { game: 'shape-hunt' },
    favoriteIds: ['shape-hunt', 'shape-sorting'],
    modes: [
      {
        id: 'explorer',
        title: { en: 'Shape Explorer', bn: 'আকার অভিযাত্রী' },
        learn: { en: 'Find the cube, cone or sphere Bulbuli asks for.', bn: 'বুলবুলি যে ঘনক, কোণক বা গোলক চায়, খুঁজে বের করো।' },
        gameId: 'shape-hunt',
      },
      {
        id: 'sorting',
        title: { en: 'Shape Sorting', bn: 'আকার সাজানো' },
        learn: {
          en: 'Drag each shape into the right bin before it falls off the belt.',
          bn: 'বেল্ট থেকে পড়ার আগে প্রতিটা আকার ঠিক ঝুড়িতে রাখো।',
        },
        gameId: 'shape-sorting',
      },
    ],
  },
  {
    id: 'adventure-run',
    zone: PLAY_LEARN,
    kind: 'game',
    category: 'math',
    title: { en: 'Bulbuli Adventure Run 3D', bn: 'বুলবুলি অ্যাডভেঞ্চার রান ৩ডি' },
    tagline: {
      en: 'Hop onto the right number or letter, or dash through the obstacle course.',
      bn: 'ঠিক সংখ্যা বা অক্ষরে লাফিয়ে নামো, কিংবা বাধার পথ পেরিয়ে ছোটো।',
    },
    learn: {
      en: 'Counting in 2s, 3s, 5s and 10s, vowels, and timing',
      bn: '২, ৩, ৫ ও ১০ করে গোনা, স্বরবর্ণ, আর সময়জ্ঞান',
    },
    ages: '5–11',
    level: { en: 'Beginner → Intermediate', bn: 'প্রাথমিক → মাঝারি' },
    color: 'berry',
    art: { game: 'bouncy-hop' },
    favoriteIds: ['bouncy-hop', 'ball-dash'],
    modes: [
      {
        id: 'multiplication-hop',
        title: { en: 'Multiplication Hop', bn: 'গুণের লাফ' },
        learn: {
          en: 'Count in 2s, 3s, 5s and 10s: the steps of the times tables.',
          bn: '২, ৩, ৫ ও ১০ করে গোনো: নামতার ধাপগুলো।',
        },
        ages: '5–9',
        gameId: 'bouncy-hop',
        search: '?track=count',
      },
      {
        id: 'letter-hop',
        title: { en: 'Letter Hop', bn: 'অক্ষরের লাফ' },
        learn: { en: 'Hop onto the vowels.', bn: 'স্বরবর্ণের ওপর লাফিয়ে নামো।' },
        ages: '5–9',
        gameId: 'bouncy-hop',
        search: '?track=letters',
      },
      {
        id: 'free-practice',
        title: { en: 'Free Practice', bn: 'মুক্ত অনুশীলন' },
        learn: {
          en: 'The classic obstacle run: roll, jump and shrink with good timing.',
          bn: 'ক্লাসিক বাধা-দৌড়: সময় মেপে গড়াও, লাফাও আর ছোট হও।',
        },
        ages: '5–11',
        gameId: 'ball-dash',
      },
      {
        id: 'number-dash',
        title: { en: 'Number Dash', bn: 'নম্বর ড্যাশ' },
        learn: { en: 'Coming soon.', bn: 'শীঘ্রই আসছে।' },
        comingSoon: true,
      },
      {
        id: 'pattern-run',
        title: { en: 'Pattern Run', bn: 'প্যাটার্ন রান' },
        learn: { en: 'Coming soon.', bn: 'শীঘ্রই আসছে।' },
        comingSoon: true,
      },
    ],
  },
  {
    // Keeps its name and gameplay until Phase 2 adds its science content.
    id: 'sky-runner',
    zone: PLAY_LEARN,
    kind: 'game',
    category: 'shapes',
    title: { en: "Bulbuli's Sky Runner", bn: 'বুলবুলির আকাশ দৌড়' },
    tagline: { en: 'Fly through the sky, collect stars and dodge the rain clouds.', bn: 'আকাশে উড়ে তারা জমাও, বৃষ্টির মেঘ এড়িয়ে চলো।' },
    learn: { en: 'Left and right, and quick decisions', bn: 'বাঁ ও ডান, আর দ্রুত সিদ্ধান্ত' },
    ages: '4–9',
    level: { en: 'Beginner', bn: 'প্রাথমিক' },
    color: 'sky',
    art: { game: 'sky-runner' },
    favoriteIds: ['sky-runner'],
    modes: [{ id: 'play', gameId: 'sky-runner' }],
  },
  {
    id: 'sky-typewriter',
    zone: PLAY_LEARN,
    kind: 'game',
    category: 'language',
    title: { en: 'Sky Typewriter 3D', bn: 'স্কাই টাইপরাইটার ৩ডি' },
    tagline: { en: 'Type the flying words before they reach Bulbuli.', bn: 'উড়ে আসা শব্দগুলো বুলবুলির কাছে পৌঁছানোর আগেই টাইপ করো।' },
    learn: { en: 'Typing accuracy, the keyboard and spelling', bn: 'নির্ভুল টাইপিং, কিবোর্ড চেনা ও বানান' },
    ages: '7–12',
    level: { en: 'Beginner → Intermediate', bn: 'প্রাথমিক → মাঝারি' },
    color: 'sky',
    art: { game: 'sky-typewriter' },
    favoriteIds: ['sky-typewriter'],
    modes: [{ id: 'play', gameId: 'sky-typewriter' }],
  },
  {
    id: 'html-architect',
    zone: PLAY_LEARN,
    kind: 'game',
    category: 'coding',
    title: { en: 'Bulbuli’s HTML Architect 3D', bn: 'বুলবুলির HTML আর্কিটেক্ট ৩ডি' },
    tagline: { en: 'Write real HTML tags and watch Bulbuli’s building rise in 3D.', bn: 'আসল HTML ট্যাগ লেখো, আর দেখো বুলবুলির দালান ৩ডিতে গড়ে উঠছে।' },
    learn: { en: 'Your first HTML tags and how a web page is built', bn: 'প্রথম HTML ট্যাগ, আর ওয়েব পেজ কীভাবে গড়া হয়' },
    ages: '8–12',
    level: { en: 'Beginner', bn: 'প্রাথমিক' },
    color: 'grape',
    art: { game: 'html-architect' },
    favoriteIds: ['html-architect'],
    modes: [{ id: 'play', gameId: 'html-architect' }],
  },

  /* ---------------- Build & Create (ages 12+) ---------------- */
  {
    id: 'math-master',
    zone: BUILD_CREATE,
    kind: 'game',
    category: 'math',
    title: { en: 'Math Master', bn: 'ম্যাথ মাস্টার' },
    tagline: {
      en: 'Challenging puzzles, interactive 3D challenges and progressively harder questions.',
      bn: 'চ্যালেঞ্জিং ধাঁধা, ইন্টারঅ্যাকটিভ ৩ডি চ্যালেঞ্জ আর ধাপে ধাপে কঠিন প্রশ্ন।',
    },
    learn: { en: 'Algebra, geometry, percentages and problem solving', bn: 'বীজগণিত, জ্যামিতি, শতকরা ও সমস্যা সমাধান' },
    ages: '12+',
    level: { en: 'Advanced', bn: 'উন্নত' },
    color: 'grape',
    art: { game: 'math-master' },
    favoriteIds: ['math-master'],
    modes: [{ id: 'play', gameId: 'math-master' }],
  },
  {
    id: 'pro-coder',
    zone: BUILD_CREATE,
    kind: 'course',
    category: 'coding',
    title: { en: 'Pro Coder', bn: 'Pro Coder' },
    tagline: {
      en: 'Levels from <html> to forms, semantic HTML and accessibility. Each question has a mini-lesson.',
      bn: '<html> থেকে ফর্ম, সেমান্টিক HTML আর অ্যাক্সেসিবিলিটি পর্যন্ত লেভেল, প্রতিটি প্রশ্নের সাথে ছোট্ট পাঠ (ইংরেজিতে)।',
    },
    learn: { en: 'HTML for real web pages: structure, forms and accessibility', bn: 'আসল ওয়েব পেজের HTML: কাঠামো, ফর্ম ও অ্যাক্সেসিবিলিটি' },
    ages: '12+',
    level: { en: 'Beginner → Advanced', bn: 'প্রাথমিক → উন্নত' },
    color: 'leaf',
    art: 'quiz',
    // no registry game: the course is its own page (quiz/index.html), opened with a full page load
    favoriteIds: [],
    modes: [{ id: 'play', href: '/quiz/?course=html' }],
  },
  {
    id: 'game-studio',
    zone: BUILD_CREATE,
    kind: 'tool',
    category: 'create',
    title: { en: '3D Game Studio', bn: '৩ডি গেম স্টুডিও' },
    tagline: {
      en: 'Build your own 3D levels block by block, play them, and share them with friends.',
      bn: 'ব্লক দিয়ে নিজের ৩ডি লেভেল বানাও, খেলো, আর বন্ধুদের সাথে শেয়ার করো।',
    },
    learn: { en: '3D design, level design and spatial building', bn: '৩ডি ডিজাইন, লেভেল ডিজাইন ও স্থানিক নির্মাণ' },
    ages: '12+',
    level: { en: 'All levels', bn: 'সব স্তর' },
    color: 'leaf',
    art: 'studio',
    favoriteIds: [],
    modes: [{ id: 'open', to: '/game' }],
  },
  {
    // Keeps its name and gameplay until Phase 2 adds its exploration content.
    id: 'skyward-explorer',
    zone: BUILD_CREATE,
    kind: 'game',
    category: 'shapes',
    title: { en: 'Bulbuli: Skyward Explorer 3D', bn: 'বুলবুলি: আকাশ অভিযাত্রী ৩ডি' },
    tagline: { en: 'Climb floating islands and gather energy crystals.', bn: 'ভাসমান দ্বীপ বেয়ে ওঠো, শক্তি-স্ফটিক জমাও।' },
    learn: { en: 'Moving and finding your way in 3D space', bn: '৩ডি জগতে চলা আর পথ খুঁজে নেওয়া' },
    ages: '12+',
    level: { en: 'Intermediate', bn: 'মাঝারি' },
    color: 'sky',
    art: { game: 'skyward-explorer' },
    favoriteIds: ['skyward-explorer'],
    modes: [{ id: 'play', gameId: 'skyward-explorer' }],
  },
]

/**
 * Registry games kept out of the catalogue on purpose. They stay playable at their own address
 * (/games/<id>), keep their code, assets and saved data, and never show as cards, in counts or filters.
 */
export const ARCHIVED_GAME_IDS = ['neon-velocity']

export const getCatalogEntry = (id) => CATALOG.find((entry) => entry.id === id) ?? null

/** The modes a player can actually open (not "coming soon"). */
export const playableModes = (entry) => (entry?.modes ?? []).filter((mode) => !mode.comingSoon)

/** True when the card opens the mode picker rather than going straight in. */
export const hasModePicker = (entry) => (entry?.modes?.length ?? 0) > 1

/** Every registry game id the catalogue opens (each appears once per mode that uses it). */
export const catalogGameIds = () => CATALOG.flatMap((entry) => playableModes(entry).map((mode) => mode.gameId).filter(Boolean))

/** The entries for one zone and one pill, in catalogue order. */
export function entriesFor(zone, filter = CATALOG_ALL) {
  return CATALOG.filter((entry) => entry.zone === zone && (filter === CATALOG_ALL || entry.category === filter))
}

/** Pill counts for one zone: { all, math, shapes, language, coding, create }. */
export function catalogCounts(zone) {
  return Object.fromEntries(CATALOG_FILTERS.map((filter) => [filter, entriesFor(zone, filter).length]))
}

/** The catalogue entry a registry game belongs to (e.g. 'math-hero-pro' → Math Hero), or null. */
export const entryForGame = (gameId) => CATALOG.find((entry) => entry.modes.some((mode) => mode.gameId === gameId)) ?? null
