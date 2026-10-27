// Words the game shows, in English and Bangla. The words to type are always English letters
// (it is a keyboard game), so WORDS has one list.

export const SKY_TYPEWRITER_WORDS = [
  // 3–4 letters: the opening minutes
  'sky', 'fly', 'sun', 'nest', 'wing', 'bird', 'star', 'moon', 'leaf', 'rain', 'kite', 'wind',
  // 5–6 letters: difficulty levels 1–3
  'cloud', 'feather', 'flower', 'breeze', 'puffy', 'sunny', 'glide', 'river', 'forest', 'planet',
  // 7+ letters: levels 4–5
  'rainbow', 'sunshine', 'butterfly', 'adventure', 'mountain', 'thunder', 'starlight', 'treetop',
]

const en = {
  title: 'SkyTypewriter 3D',
  loading: 'Getting the sky ready…',
  intro: 'Words are flying at Bulbuli! Type each word before it reaches you.',
  howTo: 'Type the letters of any word. Esc pauses.',
  goal: (n) => `Reach ${n} points to finish the flight.`,
  best: (n) => `Best score: ${n}`,
  start: 'Start flying',
  paused: 'Paused',
  resume: 'Resume',
  stage: 'The sky. Type the words flying toward Bulbuli.',

  victoryEyebrow: 'FLIGHT COMPLETE',
  victoryTitle: 'Mission Accomplished!',
  victoryCopy: 'You typed your way across the whole sky!',
  overEyebrow: 'NICE TRY, FLYER',
  overTitle: 'Flight Ended',
  overCopy: 'Bulbuli needs a little rest. Your next flight will be even better!',

  finalScore: 'Final score',
  wordsTyped: 'Words typed',
  accuracy: 'Accuracy',
  bestCombo: 'Best combo',
  xpEarned: 'XP earned',
  totalXp: (n) => `Total XP: ${n}`,
  newBest: 'New best!',
  savedDevice: 'Saved on this device.',
  savedAccount: 'Saved to your account.',
  saveFailed: "Your XP couldn't be saved in this browser.",

  playAgain: 'Play Again',
  exit: 'Exit to Menu',
}

const bn = {
  title: 'স্কাই টাইপরাইটার ৩ডি',
  loading: 'আকাশ তৈরি হচ্ছে…',
  intro: 'বুলবুলির দিকে শব্দ উড়ে আসছে! কাছে আসার আগেই প্রতিটা শব্দ টাইপ করো।',
  howTo: 'যেকোনো শব্দের অক্ষরগুলো টাইপ করো। Esc চাপলে থামবে।',
  goal: (n) => `উড়ান শেষ করতে ${n} পয়েন্ট পাও।`,
  best: (n) => `সেরা স্কোর: ${n}`,
  start: 'ওড়া শুরু করো',
  paused: 'থামানো আছে',
  resume: 'আবার চালাও',
  stage: 'আকাশ। বুলবুলির দিকে উড়ে আসা শব্দগুলো টাইপ করো।',

  victoryEyebrow: 'উড়ান সম্পূর্ণ',
  victoryTitle: 'মিশন সফল!',
  victoryCopy: 'টাইপ করে তুমি পুরো আকাশ পাড়ি দিয়েছ!',
  overEyebrow: 'ভালো চেষ্টা, উড়ুক্কু',
  overTitle: 'উড়ান শেষ',
  overCopy: 'বুলবুলির একটু বিশ্রাম দরকার। পরের উড়ান আরও ভালো হবে!',

  finalScore: 'চূড়ান্ত স্কোর',
  wordsTyped: 'টাইপ করা শব্দ',
  accuracy: 'নির্ভুলতা',
  bestCombo: 'সেরা কম্বো',
  xpEarned: 'অর্জিত XP',
  totalXp: (n) => `মোট XP: ${n}`,
  newBest: 'নতুন রেকর্ড!',
  savedDevice: 'এই ডিভাইসে সংরক্ষিত।',
  savedAccount: 'তোমার অ্যাকাউন্টে সংরক্ষিত।',
  saveFailed: 'এই ব্রাউজারে তোমার XP সংরক্ষণ করা গেল না।',

  playAgain: 'আবার খেলো',
  exit: 'মেনুতে ফেরো',
}

export const SKY_TYPEWRITER_TEXT = { en, bn }
