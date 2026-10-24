const en = {
  title: 'Bulbuli 3D',
  intro: 'Tap Bulbuli to collect stars. Drag to spin the bird around!',
  stars: 'Stars',
  xp: 'XP today',
  saving: 'Saving…',
  offline: 'Offline – will save soon',
  guest: 'Sign in to keep your stars',
  xpCapped: 'Great tapping! Come back tomorrow for more XP.',
  canvas: {
    loading: (pct) => `Bulbuli is hatching… ${pct}%`,
    modelError: 'Bulbuli flew away!',
    retry: 'Try again',
    noWebgl: "This device can't show the 3D bird right now.",
    ariaLabel: 'Bulbuli the bird. Tap to collect stars.',
  },
}

const bn = {
  title: 'বুলবুলি ৩ডি',
  intro: 'বুলবুলিকে ছুঁয়ে তারা জমাও। টেনে পাখিটাকে ঘোরাও!',
  stars: 'তারা',
  xp: 'আজকের XP',
  saving: 'সেভ হচ্ছে…',
  offline: 'অফলাইন – একটু পরে সেভ হবে',
  guest: 'তারা রাখতে সাইন ইন করো',
  xpCapped: 'দারুণ! আরও XP পেতে কাল আবার এসো।',
  canvas: {
    loading: (pct) => `বুলবুলি ডিম ফুটে বের হচ্ছে… ${pct}%`,
    modelError: 'বুলবুলি উড়ে গেছে!',
    retry: 'আবার চেষ্টা করো',
    noWebgl: 'এই ডিভাইসে এখন ৩ডি পাখি দেখানো যাচ্ছে না।',
    ariaLabel: 'বুলবুলি পাখি। তারা জমাতে ছুঁয়ে দাও।',
  },
}

export const BULBULI_3D_TEXT = { en, bn }
