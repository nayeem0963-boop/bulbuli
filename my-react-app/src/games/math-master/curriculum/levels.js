/**
 * Math Master's ten levels: who they are for, what they teach and what clearing them earns.
 * The questions live next door in questions/level-NN.js (one file per level).
 *
 * Fields:
 *   id          1–10, the order players meet them in
 *   tier        rank band: novice | apprentice | solver | expert | master (see TIERS)
 *   difficulty  1–5 pips shown on the level card
 *   title       { en, bn } topic name
 *   objective   { en, bn } one-sentence learning objective
 *   badge       { en, bn } badge earned on the first clear
 *   color       accent used by the level card and the 3D arena ring
 *   glyph       symbol floating in the arena when a question has no figure of its own
 */
export const TIERS = {
  novice: { en: 'Novice', bn: 'নবিশ' },
  apprentice: { en: 'Apprentice', bn: 'শিক্ষানবিশ' },
  solver: { en: 'Solver', bn: 'সমাধানকারী' },
  expert: { en: 'Expert', bn: 'বিশেষজ্ঞ' },
  master: { en: 'Math Master', bn: 'ম্যাথ মাস্টার' },
}

export const TIER_ORDER = ['novice', 'apprentice', 'solver', 'expert', 'master']

export const LEVEL_META = [
  {
    id: 1,
    tier: 'novice',
    difficulty: 1,
    title: { en: 'Number Sense & Arithmetic', bn: 'সংখ্যাবোধ ও পাটিগণিত' },
    objective: {
      en: 'Work fluently with integers, fractions, decimals, percentages, powers and primes.',
      bn: 'পূর্ণসংখ্যা, ভগ্নাংশ, দশমিক, শতকরা, ঘাত ও মৌলিক সংখ্যা নিয়ে সাবলীলভাবে কাজ করা।',
    },
    badge: { en: 'Number Navigator', bn: 'সংখ্যার নাবিক' },
    color: '#ffc93c',
    glyph: '±',
  },
  {
    id: 2,
    tier: 'apprentice',
    difficulty: 2,
    title: { en: 'Pre-Algebra', bn: 'প্রাক-বীজগণিত' },
    objective: {
      en: 'Write, simplify and evaluate expressions, and solve one- and two-step equations.',
      bn: 'রাশি লেখা, সরল করা ও মান বের করা, এবং এক-দুই ধাপের সমীকরণ সমাধান করা।',
    },
    badge: { en: 'Variable Voyager', bn: 'চলকের যাত্রী' },
    color: '#4fc58d',
    glyph: 'x',
  },
  {
    id: 3,
    tier: 'apprentice',
    difficulty: 2,
    title: { en: 'Algebra & Equations', bn: 'বীজগণিত ও সমীকরণ' },
    objective: {
      en: 'Solve linear, simultaneous and simple quadratic equations and rearrange formulas.',
      bn: 'সরল, যুগপৎ ও সহজ দ্বিঘাত সমীকরণ সমাধান এবং সূত্র পুনর্বিন্যাস করা।',
    },
    badge: { en: 'Equation Engineer', bn: 'সমীকরণ প্রকৌশলী' },
    color: '#5db8ff',
    glyph: '=',
  },
  {
    id: 4,
    tier: 'solver',
    difficulty: 3,
    title: { en: 'Geometry & Measurement', bn: 'জ্যামিতি ও পরিমাপ' },
    objective: {
      en: 'Use angle facts, Pythagoras, area, surface area and volume on real 2D and 3D shapes.',
      bn: 'কোণের নিয়ম, পিথাগোরাস, ক্ষেত্রফল, পৃষ্ঠতল ও আয়তন বাস্তব ২ডি ও ৩ডি আকারে প্রয়োগ করা।',
    },
    badge: { en: 'Shape Architect', bn: 'আকারের স্থপতি' },
    color: '#b48cff',
    glyph: '△',
  },
  {
    id: 5,
    tier: 'solver',
    difficulty: 3,
    title: { en: 'Ratios, Percentages & Money', bn: 'অনুপাত, শতকরা ও অর্থ' },
    objective: {
      en: 'Apply percentages, proportion, rates and interest to everyday money and travel problems.',
      bn: 'দৈনন্দিন টাকা-পয়সা ও যাতায়াতের সমস্যায় শতকরা, সমানুপাত, হার ও সুদ প্রয়োগ করা।',
    },
    badge: { en: 'Smart Spender', bn: 'বুদ্ধিমান ক্রেতা' },
    color: '#ff9f43',
    glyph: '%',
  },
  {
    id: 6,
    tier: 'expert',
    difficulty: 3,
    title: { en: 'Statistics & Probability', bn: 'পরিসংখ্যান ও সম্ভাবনা' },
    objective: {
      en: 'Summarise data with averages and charts, and calculate simple and combined probabilities.',
      bn: 'গড় ও চার্ট দিয়ে উপাত্ত সংক্ষেপ করা এবং সরল ও যৌগিক সম্ভাবনা নির্ণয় করা।',
    },
    badge: { en: 'Data Detective', bn: 'উপাত্ত গোয়েন্দা' },
    color: '#ff5f6d',
    glyph: 'P',
  },
  {
    id: 7,
    tier: 'expert',
    difficulty: 4,
    title: { en: 'Functions & Graphs', bn: 'ফাংশন ও লেখচিত্র' },
    objective: {
      en: 'Evaluate functions, read coordinates and connect equations, tables and straight-line graphs.',
      bn: 'ফাংশনের মান বের করা, স্থানাঙ্ক পড়া এবং সমীকরণ, সারণি ও সরলরেখার লেখচিত্র মেলানো।',
    },
    badge: { en: 'Graph Guru', bn: 'লেখচিত্র গুরু' },
    color: '#2ee6c8',
    glyph: 'ƒ',
  },
  {
    id: 8,
    tier: 'expert',
    difficulty: 4,
    title: { en: 'Exponents, Roots & Advanced Number', bn: 'সূচক, মূল ও উচ্চতর সংখ্যা' },
    objective: {
      en: 'Use the laws of exponents, roots, surds and scientific notation with confidence.',
      bn: 'সূচকের নিয়ম, মূল, করণী ও বৈজ্ঞানিক প্রকাশ আত্মবিশ্বাসের সঙ্গে ব্যবহার করা।',
    },
    badge: { en: 'Power Player', bn: 'ঘাতের খেলোয়াড়' },
    color: '#ffd25e',
    glyph: '√',
  },
  {
    id: 9,
    tier: 'expert',
    difficulty: 4,
    title: { en: 'Logical & Mathematical Reasoning', bn: 'যৌক্তিক ও গাণিতিক যুক্তি' },
    objective: {
      en: 'Spot patterns, reason through constraints and find the mistake in a worked solution.',
      bn: 'প্যাটার্ন চেনা, শর্ত মেনে যুক্তি করা এবং সমাধানের ভুল ধাপ খুঁজে বের করা।',
    },
    badge: { en: 'Logic Legend', bn: 'যুক্তির কিংবদন্তি' },
    color: '#7b9cff',
    glyph: '∴',
  },
  {
    id: 10,
    tier: 'master',
    difficulty: 5,
    title: { en: 'Master Challenges', bn: 'মাস্টার চ্যালেঞ্জ' },
    objective: {
      en: 'Combine algebra, geometry, probability and percentages to solve multi-step problems.',
      bn: 'বীজগণিত, জ্যামিতি, সম্ভাবনা ও শতকরা মিলিয়ে বহু-ধাপের সমস্যা সমাধান করা।',
    },
    badge: { en: 'Math Master', bn: 'ম্যাথ মাস্টার' },
    color: '#ff7cc4',
    glyph: '∞',
  },
]
