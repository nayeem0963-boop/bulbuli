// All words the Math Hero game shows or says, in English and Bangla.

export const MATH_HERO_LANGUAGES = ['en', 'bn']
const LANGUAGE_STORAGE_KEY = 'bulbuli.mathHero.language'

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']

/** Writes the digits of a number or string in the chosen language (12:05 -> ১২:০৫ in Bangla). */
export function formatDigits(value, language) {
  const text = String(value)
  return language === 'bn' ? text.replace(/[0-9]/g, (digit) => BANGLA_DIGITS[digit]) : text
}

export function loadMathHeroLanguage() {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return MATH_HERO_LANGUAGES.includes(saved) ? saved : 'en'
  } catch (error) {
    console.error('Unable to load the Math Hero language preference.', error)
    return 'en'
  }
}

export function saveMathHeroLanguage(language) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch (error) {
    console.error('Unable to save the Math Hero language preference.', error)
  }
}

const en = {
  back: '← Your learning space',
  eyebrow: 'A little math adventure',
  title: 'Math Hero',
  subtitle: 'Every question makes you stronger. You’ve got this!',
  switchLanguage: 'বাংলা',
  switchLanguageLabel: 'Play in Bangla',
  soundOn: 'Turn sound on',
  soundOff: 'Turn sound off',
  statsLabel: 'Math Hero progress',
  mathHeroXp: 'Math Hero XP',
  mathHeroXpLabel: (xp) => `${xp} Math Hero XP`,
  totalXp: 'Total Bulbuli XP',
  life: (count) => (count === 1 ? 'Life' : 'Lives'),
  livesLabel: (count, n) => `${n} ${count === 1 ? 'life' : 'lives'} remaining`,
  extraLife: '+1 Extra Life!',
  level: (n) => `Level ${n}`,
  question: (n, total) => `Question ${n} of ${total}`,
  timeRemaining: (time) => `${time} remaining`,
  levelProgressLabel: (n) => `Level ${n} progress`,
  levelProgress: (level, n, total) => `Level ${level} · ${n} of ${total}`,
  complexity: (n) => `COMPLEXITY INCREASED! Level ${n}`,
  greatWithBonus: '🌟 Amazing! +5 XP and a bonus life!',
  great: '🌟 Great job! +5 XP — here comes the next one!',
  timeUp: 'Time’s up!',
  almost: 'Almost!',
  theAnswerIs: (answer) => `The answer is ${answer}.`,
  nextReady: 'Keep going — the next question is ready!',
  chooseAnswer: 'Choose an answer',
  answerXp: '✓ +5 XP',
  earnXp: 'Get it right to earn 5 XP!',
  bonusRule: 'Every 10 correct answers earns a bonus life.',
  saveNote: 'Your adventure is saved automatically on this device.',
  gameOverEyebrow: 'Every hero can try again',
  gameOverTitle: 'Game Over',
  gameOverMessage: 'You gave it your best. Ready for another adventure?',
  finalScore: 'Final score',
  levelReached: 'Level reached',
  correctAnswers: 'Correct answers',
  newRun: 'Start a new run',
  talkToMascot: 'Talk to the Math Hero',
  hintPrefix: 'Hint: ',
  hintCountUp: (start, steps) => `Hint: start at ${start} and count up ${steps}.`,
  hintCountBack: (start, steps) => `Hint: start at ${start} and count back ${steps}.`,
  hintAddPlaces: (hundreds) => `Hint: add ${hundreds ? 'the hundreds, then the tens, then the ones' : 'the tens, then the ones'}.`,
  hintSubtractPlaces: (hundreds) => `Hint: take away ${hundreds ? 'the hundreds, then the tens, then the ones' : 'the tens, then the ones'}.`,
  mascotGameOver: 'Great effort! Start a new run and we’ll try again.',
  cheers: [
    'Hi! I’m your Math Hero. Let’s solve this one together!',
    'Take a deep breath. One step at a time.',
    'Mistakes help your brain grow. Keep going!',
    'Every right answer earns you 5 XP!',
    'You’re getting faster. I can tell!',
  ],
}

const bn = {
  back: '← তোমার শেখার জায়গা',
  eyebrow: 'ছোট্ট একটা অঙ্কের অভিযান',
  title: 'ম্যাথ হিরো',
  subtitle: 'প্রতিটি প্রশ্ন তোমাকে আরও শক্তিশালী করে। তুমি পারবে!',
  switchLanguage: 'English',
  switchLanguageLabel: 'ইংরেজিতে খেলো',
  soundOn: 'শব্দ চালু করো',
  soundOff: 'শব্দ বন্ধ করো',
  statsLabel: 'ম্যাথ হিরোর অগ্রগতি',
  mathHeroXp: 'ম্যাথ হিরো XP',
  mathHeroXpLabel: (xp) => `${xp} ম্যাথ হিরো XP`,
  totalXp: 'মোট Bulbuli XP',
  life: () => 'জীবন',
  livesLabel: (_count, n) => `${n}টি জীবন বাকি`,
  extraLife: '+১ বাড়তি জীবন!',
  level: (n) => `লেভেল ${n}`,
  question: (n, total) => `প্রশ্ন ${n} / ${total}`,
  timeRemaining: (time) => `${time} বাকি`,
  levelProgressLabel: (n) => `লেভেল ${n}-এর অগ্রগতি`,
  levelProgress: (level, n, total) => `লেভেল ${level} · ${total}টির মধ্যে ${n}`,
  complexity: (n) => `কঠিনতা বাড়ল! লেভেল ${n}`,
  greatWithBonus: '🌟 অসাধারণ! +৫ XP আর একটা বাড়তি জীবন!',
  great: '🌟 খুব ভালো! +৫ XP — পরের প্রশ্ন আসছে!',
  timeUp: 'সময় শেষ!',
  almost: 'প্রায় হয়ে গিয়েছিল!',
  theAnswerIs: (answer) => `সঠিক উত্তর ${answer}।`,
  nextReady: 'চালিয়ে যাও — পরের প্রশ্ন তৈরি!',
  chooseAnswer: 'একটি উত্তর বেছে নাও',
  answerXp: '✓ +৫ XP',
  earnXp: 'ঠিক উত্তরে পাবে ৫ XP!',
  bonusRule: 'প্রতি ১০টি সঠিক উত্তরে একটা বাড়তি জীবন।',
  saveNote: 'তোমার অভিযান এই ডিভাইসে নিজে থেকেই সেভ হয়ে যায়।',
  gameOverEyebrow: 'প্রত্যেক হিরোই আবার চেষ্টা করতে পারে',
  gameOverTitle: 'খেলা শেষ',
  gameOverMessage: 'তুমি তোমার সেরাটাই দিয়েছ। আরেকটা অভিযানের জন্য তৈরি?',
  finalScore: 'চূড়ান্ত স্কোর',
  levelReached: 'যে লেভেলে পৌঁছেছ',
  correctAnswers: 'সঠিক উত্তর',
  newRun: 'নতুন করে শুরু করো',
  talkToMascot: 'ম্যাথ হিরোর সাথে কথা বলো',
  hintPrefix: 'সংকেত: ',
  hintCountUp: (start, steps) => `সংকেত: ${start} থেকে শুরু করে আরও ${steps} গুনে এগোও।`,
  hintCountBack: (start, steps) => `সংকেত: ${start} থেকে শুরু করে ${steps} গুনে পিছিয়ে যাও।`,
  hintAddPlaces: (hundreds) => `সংকেত: ${hundreds ? 'আগে শতক, তারপর দশক, তারপর একক' : 'আগে দশক, তারপর একক'} যোগ করো।`,
  hintSubtractPlaces: (hundreds) => `সংকেত: ${hundreds ? 'আগে শতক, তারপর দশক, তারপর একক' : 'আগে দশক, তারপর একক'} বিয়োগ করো।`,
  mascotGameOver: 'দারুণ চেষ্টা! নতুন করে শুরু করো, আমরা আবার চেষ্টা করব।',
  cheers: [
    'হাই! আমি তোমার ম্যাথ হিরো। চলো একসাথে এটার সমাধান করি!',
    'একটা লম্বা শ্বাস নাও। এক পা এক পা করে এগোও।',
    'ভুল থেকেই শেখা হয়। চালিয়ে যাও!',
    'প্রতিটি সঠিক উত্তরে পাবে ৫ XP!',
    'তুমি তো দিন দিন আরও দ্রুত হচ্ছ!',
  ],
}

export const MATH_HERO_TEXT = { en, bn }
