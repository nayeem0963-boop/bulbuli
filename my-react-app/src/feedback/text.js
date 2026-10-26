// Words for the "How was it?" card and the favourite heart. Short: many players are just learning to read.

const en = {
  titleCompleted: 'Well done! 🌟',
  titleExit: 'Leaving already?',
  question: (game) => `How was ${game}?`,
  reactionsLabel: 'How did it feel?',
  reactions: { fun: 'Fun!', okay: 'Okay', dislike: "Didn't like" },
  tagsPrompt: 'What happened? Tap any.',
  tags: { too_hard: 'Too Hard', boring: 'Boring', glitchy: 'Glitchy / Buggy', confusing: 'Confusing' },
  send: 'Send',
  skip: 'Skip',
  skipLabel: 'Skip this question',
  thanks: 'Thank you!',
  favAdd: (game) => `Add ${game} to my favourites`,
  favRemove: (game) => `Remove ${game} from my favourites`,
}

const bn = {
  titleCompleted: 'দারুণ! 🌟',
  titleExit: 'এখনই চলে যাচ্ছ?',
  question: (game) => `${game} কেমন লাগল?`,
  reactionsLabel: 'কেমন লাগল?',
  reactions: { fun: 'মজার!', okay: 'মোটামুটি', dislike: 'ভালো লাগেনি' },
  tagsPrompt: 'কী হয়েছিল? যেকোনোটা ছোঁও।',
  tags: { too_hard: 'খুব কঠিন', boring: 'একঘেয়ে', glitchy: 'গোলমেলে / বাগ', confusing: 'বুঝতে পারিনি' },
  send: 'পাঠাও',
  skip: 'বাদ দাও',
  skipLabel: 'এই প্রশ্নটা বাদ দাও',
  thanks: 'ধন্যবাদ!',
  favAdd: (game) => `${game} আমার প্রিয়তে রাখো`,
  favRemove: (game) => `${game} প্রিয় থেকে সরাও`,
}

export const FEEDBACK_TEXT = { en, bn }
