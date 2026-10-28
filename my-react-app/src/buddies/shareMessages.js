// Every word a Bulbuli invitation says, in one place (English and Bangla).
// Friendly, no pressure: no countdowns, no "you must", no rewards promised for sharing.

/** The kinds of invitation a player can send. */
export const SHARE_KINDS = ['general', 'play-learn', 'build-create', 'game']

export const SHARE_MESSAGES = {
  en: {
    general: 'Hey! I found Bulbuli, a fun place to play games, learn new skills, and explore creative activities. Come check it out! ✨',
    'play-learn': "Want to play something fun? Check out Bulbuli's Play & Learn games and see which one you like best! 🎮",
    'build-create': "Want to build something cool? Explore Bulbuli's coding and 3D creation activities. 🚀",
    game: 'I found this game on Bulbuli. Give it a try and see how far you can get! 🎮',
  },
  bn: {
    general: 'হেই! আমি Bulbuli খুঁজে পেয়েছি, খেলা, নতুন কিছু শেখা আর মজার সৃজনশীল কাজের একটা দারুণ জায়গা। চলে এসো, দেখে যাও! ✨',
    'play-learn': 'মজার কিছু খেলতে চাও? Bulbuli-এর খেলো ও শেখো খেলাগুলো দেখো, আর খুঁজে বের করো কোনটা তোমার সবচেয়ে ভালো লাগে! 🎮',
    'build-create': 'দারুণ কিছু বানাতে চাও? Bulbuli-এর কোডিং আর ৩ডি বানানোর কাজগুলো ঘুরে দেখো। 🚀',
    game: 'Bulbuli-এ এই খেলাটা পেয়েছি। একবার খেলে দেখো, কতদূর যেতে পারো! 🎮',
  },
}

/** The invitation text for a kind, in a language (English when either is unknown). */
export function shareMessage(kind, language = 'en') {
  const messages = SHARE_MESSAGES[language] ?? SHARE_MESSAGES.en
  return messages[kind] ?? messages.general
}

/** The title a share sheet shows: the game's name for a game, otherwise "Bulbuli". */
export function shareTitle(kind, gameTitle) {
  return kind === 'game' && gameTitle ? `${gameTitle} · Bulbuli` : 'Bulbuli'
}

/** What "Copy message" puts on the clipboard: the message, then the link on its own line. */
export function fullInvitation(message, url) {
  return `${message}\n${url}`
}
