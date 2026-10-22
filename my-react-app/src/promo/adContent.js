// Words and layout shared by the live ad card (DOM) and the PNG export (canvas).
// Every measurement is in "card units": 1 unit = 1% of the card's width, so the card is
// 100 units wide and 125 tall (4:5, the portrait size social apps show best).

export const AD_TEXT = {
  en: {
    brand: 'bulbuli',
    presents: 'presents',
    title: 'Math Hero',
    speech: 'Hey Explorer! 🚀 Ready to master math, solve fun puzzles, and level up your skills? Join me inside Bulbuli and let’s play to learn!',
    cta: 'Play Now on Bulbuli',
    imageAlt: 'Math Hero advert: Math Hero invites kids to play and learn on Bulbuli',
    share: 'Download & Share',
    saveOnly: 'Save image only',
    shareOnly: 'Share…',
    listen: 'Listen',
    pngLead: 'Play Math Hero free at',
    pngScan: 'Scan with a phone camera to play',
    talk: 'Hear Math Hero talk in Bangla',
    stopTalk: 'Stop Math Hero talking',
    tapHint: 'Tap me!',
    soundIsOff: 'Sound is off. Turn it on with the 🔊 button to hear Math Hero.',
    noVoice: 'Math Hero can’t talk on this device right now. Check the internet connection and try again.',
    working: 'Making your picture…',
    saved: 'Picture saved! Look in your downloads.',
    shared: 'Thanks for sharing!',
    failed: 'Sorry, the picture couldn’t be made. Please try again.',
    shareTitle: 'Math Hero on Bulbuli',
    shareText: 'Play Math Hero and learn through fun games on Bulbuli!',
    fileName: 'Bulbuli-MathHero-Ad.png',
  },
  bn: {
    brand: 'bulbuli',
    presents: 'নিয়ে এলো',
    title: 'ম্যাথ হিরো',
    speech: 'হ্যালো অভিযাত্রী! 🚀 অঙ্কে পাকা হতে, মজার ধাঁধা মেলাতে আর লেভেল বাড়াতে তৈরি? বুলবুলিতে আমার সাথে চলো, খেলতে খেলতে শিখি!',
    cta: 'বুলবুলিতে এখনই খেলো',
    imageAlt: 'ম্যাথ হিরোর বিজ্ঞাপন: ম্যাথ হিরো ছোটদের বুলবুলিতে খেলতে খেলতে শিখতে ডাকছে',
    share: 'ডাউনলোড ও শেয়ার',
    saveOnly: 'শুধু ছবি সেভ করো',
    shareOnly: 'শেয়ার করো…',
    listen: 'শোনো',
    pngLead: 'ম্যাথ হিরো বিনামূল্যে খেলো',
    pngScan: 'ক্যামেরায় স্ক্যান করে খেলো',
    talk: 'ম্যাথ হিরোর কথা শোনো',
    stopTalk: 'ম্যাথ হিরোর কথা থামাও',
    tapHint: 'ট্যাপ করো!',
    soundIsOff: 'শব্দ বন্ধ আছে। ম্যাথ হিরোর কথা শুনতে 🔊 বোতামে চাপ দাও।',
    noVoice: 'এই ডিভাইসে এখন ম্যাথ হিরো কথা বলতে পারছে না। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করো।',
    working: 'ছবি তৈরি হচ্ছে…',
    saved: 'ছবি সেভ হয়েছে! ডাউনলোড ফোল্ডারে দেখো।',
    shared: 'শেয়ার করার জন্য ধন্যবাদ!',
    failed: 'দুঃখিত, ছবি তৈরি করা যায়নি। আবার চেষ্টা করো।',
    shareTitle: 'বুলবুলিতে ম্যাথ হিরো',
    shareText: 'বুলবুলিতে ম্যাথ হিরো খেলো আর মজার খেলায় শেখো!',
    fileName: 'Bulbuli-MathHero-Ad.png',
  },
}

export const AD_COLORS = {
  ink: '#1b2a49',
  skyTop: '#7cc8f6',
  skyMid: '#c4e9ff',
  warm: '#fff0b8',
  rays: 'rgba(255, 255, 255, 0.34)',
  sun: '#ffc93c',
  berry: '#d42a37',
  hill: '#8fdcb2',
  hillDark: '#6fcb9b',
  white: '#ffffff',
}

export const AD_LAYOUT = {
  height: 125,
  border: 1.1,
  radius: 7,
  brand: { x: 6, y: 5, mark: 8.5, size: 5.6 },
  title: { x: 50, y: 25, size: 16, stroke: 2.6, rotate: -3 },
  rays: { cx: 24, cy: 78, count: 18 },
  bubble: { x: 43, y: 32, w: 52, pad: 4, size: 4.05, lineHeight: 1.32, radius: 6, border: 0.9, tailAt: 0.62, tailTip: { dx: -7.5, dy: 5 } },
  mascot: { x: -3, bottom: 22.5, h: 58 },
  hill: { cx: 50, cy: 138, rx: 80, ry: 36 },
  cta: { y: 104.5, w: 80, h: 12.5, size: 5.4, lift: 1.3 },
  url: { y: 121.2, size: 3.1 },
  // The downloaded picture can't be clicked, so instead of the Play button it gets this panel:
  // where to go (big web address) and a QR code that opens the game.
  pngFooter: { x: 5, y: 103.5, w: 90, h: 18.5, radius: 5, qr: 15, lead: 3.3, url: 8.2, scan: 2.9 },
  symbols: [
    { text: '+', x: 91, y: 8, size: 9, rotate: 14, color: '#8a4fd3' },
    { text: '×', x: 8, y: 38, size: 8, rotate: -10, color: '#d42a37' },
    { text: '7', x: 88, y: 88, size: 9, rotate: 10, color: '#2e7dd7' },
    { text: '÷', x: 64, y: 93, size: 7, rotate: -8, color: '#2e9e6b' },
    { text: '★', x: 72, y: 8, size: 5, rotate: 0, color: '#ffc93c' },
  ],
}

export const MASCOT_ASPECT = 520 / 638 // width / height of the Math Hero cutout
