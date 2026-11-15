/**
 * Sky Science Explorer: Sky Watcher (wave 1). Observing the Sun, the sky's colours, day and night,
 * shadows and rainbows.
 *
 * STATUS: draft, AWAITING science-accuracy review AND Bangla review. Bangla is a first draft.
 * Every fact is tied to a quote in ./sources.js (fetched 2026-11-02).
 * Ages 4–6 items use pictures (pic keys, drawn in src/games/sky-science/pictures.jsx) and are spoken.
 */
import { a, d, objective, quickCheck } from '../build.js'

const B46 = { mission: 'sky-watcher', band: '4-6' }
const B78 = { mission: 'sky-watcher', band: '7-8' }
const B910 = { mission: 'sky-watcher', band: '9-10' }

const ages4to6 = [
  ...objective(B46, {
    slug: 'daylight-from-sun', skill: 'identify', src: 'sun', quote: 'The light of daytime comes from our closest star: the Sun.',
    explanation: ['Daylight comes from the Sun. Clouds and rain do not make light.', 'দিনের আলো আসে সূর্য থেকে। মেঘ বা বৃষ্টি আলো তৈরি করে না।'],
    primary: {
      prompt: ['Which one gives us daylight?', 'কোনটা আমাদের দিনের আলো দেয়?'],
      answer: a('The Sun', 'সূর্য', 'sun'),
      distractors: [
        d('A cloud', 'মেঘ', 'Clouds can hide the Sun, but they do not make light.', 'মেঘ সূর্যকে ঢেকে দিতে পারে, কিন্তু আলো তৈরি করে না।', 'cloud'),
        d('Rain', 'বৃষ্টি', 'Rain is water falling from clouds; it does not shine.', 'বৃষ্টি হলো মেঘ থেকে পড়া পানি; এটা আলো দেয় না।', 'rain'),
      ],
    },
    ret: {
      prompt: ['What makes the day bright?', 'দিন উজ্জ্বল হয় কীসের জন্য?'],
      answer: a('Sunshine', 'রোদ', 'sun'),
      distractors: [
        d('An umbrella', 'ছাতা', 'An umbrella blocks rain or sun; it makes no light.', 'ছাতা রোদ বা বৃষ্টি আটকায়; আলো তৈরি করে না।', 'umbrella'),
        d('A kite', 'ঘুড়ি', 'A kite flies in the wind; it does not light up the sky.', 'ঘুড়ি বাতাসে ওড়ে; আকাশ আলোকিত করে না।', 'kite'),
      ],
    },
  }),
  ...objective(B46, {
    slug: 'sun-warms-earth', skill: 'cause-effect', src: 'sun', quote: 'Heat from the Sun makes Earth warm enough to live on.',
    explanation: ['The Sun warms the Earth. That is why sunny places feel warm.', 'সূর্য পৃথিবীকে গরম রাখে। তাই রোদে গরম লাগে।'],
    primary: {
      prompt: ['What makes us feel warm on a sunny day?', 'রোদের দিনে আমাদের গরম লাগে কেন?'],
      answer: a('The Sun', 'সূর্য', 'sun'),
      distractors: [
        d('A snowman', 'বরফের মানুষ', 'Snow is cold; it cannot warm us.', 'বরফ ঠান্ডা; এটা আমাদের গরম করতে পারে না।', 'snowman'),
        d('Ice', 'বরফ', 'Ice is frozen water; it makes things colder.', 'বরফ জমে যাওয়া পানি; এটা জিনিস ঠান্ডা করে।', 'ice'),
      ],
    },
    ret: {
      prompt: ['A puddle feels warm at noon. What warmed it?', 'দুপুরে জমে থাকা পানি গরম লাগছে। কে গরম করল?'],
      answer: a('The Sun', 'সূর্য', 'sun'),
      distractors: [
        d('The wind', 'বাতাস', 'Wind moves air around; the heat comes from the Sun.', 'বাতাস বাতাসকে নাড়ায়; গরমটা আসে সূর্য থেকে।', 'wind'),
        d('Rain', 'বৃষ্টি', 'Rain usually cools things down.', 'বৃষ্টি সাধারণত জিনিস ঠান্ডা করে।', 'rain'),
      ],
    },
  }),
  ...objective(B46, {
    slug: 'clear-sky-blue', skill: 'identify', src: 'skyBlue', quote: 'The scattered violet and blue light dominates the sky, making it appear blue.',
    explanation: ['On a clear day the sky looks blue, because the air spreads blue sunlight all over the sky.', 'পরিষ্কার দিনে আকাশ নীল দেখায়, কারণ বাতাস সূর্যের নীল আলো চারদিকে ছড়িয়ে দেয়।'],
    primary: {
      prompt: ['On a clear sunny day, what colour is the sky?', 'পরিষ্কার রোদের দিনে আকাশের রং কী?'],
      answer: a('Blue', 'নীল', 'sky-blue'),
      distractors: [
        d('Green', 'সবুজ', 'Grass and leaves are green; a clear daytime sky is blue.', 'ঘাস আর পাতা সবুজ; দিনের পরিষ্কার আকাশ নীল।', 'sky-green'),
        d('Black', 'কালো', 'The sky looks dark at night, not on a sunny day.', 'রাতে আকাশ অন্ধকার দেখায়, রোদের দিনে নয়।', 'sky-night'),
      ],
    },
    ret: {
      prompt: ['Find the picture of a clear daytime sky.', 'দিনের পরিষ্কার আকাশের ছবিটা খোঁজো।'],
      answer: a('A blue sky with the Sun', 'সূর্যসহ নীল আকাশ', 'sky-blue'),
      distractors: [
        d('A dark sky with stars', 'তারাভরা অন্ধকার আকাশ', 'That is the night sky.', 'ওটা রাতের আকাশ।', 'sky-night'),
        d('A grey rainy sky', 'ধূসর বৃষ্টির আকাশ', 'Rain clouds cover the sky; it is not clear.', 'বৃষ্টির মেঘ আকাশ ঢেকে রাখে; আকাশ পরিষ্কার নয়।', 'sky-rain'),
      ],
    },
  }),
  ...objective(B46, {
    slug: 'day-or-night', skill: 'compare', src: 'dayNight', quote: 'When where you are is pointed toward the Sun, it is day.',
    explanation: ['It is day when our side of the Earth faces the Sun. It is night when it faces away.', 'পৃথিবীর আমাদের দিক যখন সূর্যের দিকে থাকে, তখন দিন। উল্টো দিকে থাকলে রাত।'],
    primary: {
      prompt: ['Which picture shows daytime?', 'কোন ছবিতে দিন দেখা যাচ্ছে?'],
      answer: a('Bright sky with the Sun', 'সূর্যসহ উজ্জ্বল আকাশ', 'day'),
      distractors: [
        d('Dark sky with stars', 'তারাভরা অন্ধকার আকাশ', 'Stars in a dark sky show night.', 'অন্ধকার আকাশে তারা মানে রাত।', 'night'),
        d('A sleeping child', 'ঘুমন্ত শিশু', 'People can sleep any time; the sky tells us if it is day.', 'মানুষ যেকোনো সময় ঘুমাতে পারে; দিন কিনা তা আকাশ দেখে বোঝা যায়।', 'sleep'),
      ],
    },
    ret: {
      prompt: ['Which picture shows night?', 'কোন ছবিতে রাত দেখা যাচ্ছে?'],
      answer: a('Dark sky with stars', 'তারাভরা অন্ধকার আকাশ', 'night'),
      distractors: [
        d('Bright sky with the Sun', 'সূর্যসহ উজ্জ্বল আকাশ', 'When the Sun lights our sky, it is day.', 'সূর্য আকাশ আলোকিত করলে তখন দিন।', 'day'),
        d('A rainbow', 'রংধনু', 'Rainbows need sunlight, so we see them in the day.', 'রংধনুর জন্য সূর্যের আলো লাগে, তাই আমরা দিনে দেখি।', 'rainbow'),
      ],
    },
  }),
  ...objective(B46, {
    slug: 'shadow-away-from-sun', skill: 'cause-effect', src: 'shadow', quote: "If the Sun's rays are incident on an object, the shadow is oriented away from the Sun.",
    explanation: ['Your body blocks the sunlight, so your shadow falls on the side away from the Sun.', 'তোমার শরীর রোদ আটকায়, তাই ছায়া পড়ে সূর্যের উল্টো দিকে।'],
    primary: {
      prompt: ['The Sun is on one side. Where does the shadow go?', 'সূর্য এক পাশে আছে। ছায়া কোন দিকে পড়বে?'],
      answer: a('Away from the Sun', 'সূর্যের উল্টো দিকে', 'shadow-away'),
      distractors: [
        d('Towards the Sun', 'সূর্যের দিকে', 'Light comes from the Sun, so the dark shadow is on the other side.', 'আলো আসে সূর্য থেকে, তাই অন্ধকার ছায়া থাকে অন্য পাশে।', 'shadow-toward'),
        d('There is no shadow', 'কোনো ছায়া নেই', 'Things that block sunlight always make a shadow.', 'যা রোদ আটকায়, তা সবসময় ছায়া তৈরি করে।', 'no-shadow'),
      ],
    },
    ret: {
      prompt: ['A tree in the sunshine. Which picture shows its shadow?', 'রোদে একটা গাছ। কোন ছবিতে তার ছায়া ঠিক আছে?'],
      answer: a('Shadow on the side away from the Sun', 'সূর্যের উল্টো পাশে ছায়া', 'tree-shadow-away'),
      distractors: [
        d('Shadow on the Sun side', 'সূর্যের পাশে ছায়া', 'The tree blocks light coming from the Sun, so the shadow is behind it.', 'গাছ সূর্যের আলো আটকায়, তাই ছায়া পড়ে গাছের পেছনে।', 'tree-shadow-toward'),
        d('Shadow in the sky', 'আকাশে ছায়া', 'Shadows fall on the ground or on things, not in the sky.', 'ছায়া পড়ে মাটিতে বা জিনিসের ওপর, আকাশে নয়।', 'tree-shadow-sky'),
      ],
    },
  }),
  ...objective(B46, {
    slug: 'rainbow-sun-and-rain', skill: 'predict', src: 'rainbow', quote: 'For a rainbow to appear, the Sun must be behind you and water droplets in front.',
    explanation: ['A rainbow appears when sunlight shines on raindrops.', 'রোদ যখন বৃষ্টির ফোঁটায় পড়ে, তখন রংধনু দেখা যায়।'],
    primary: {
      prompt: ['The Sun shines while it rains. What might you see?', 'বৃষ্টির সময় রোদ উঠেছে। তুমি কী দেখতে পারো?'],
      answer: a('A rainbow', 'রংধনু', 'rainbow'),
      distractors: [
        d('Stars', 'তারা', 'Stars are seen at night, not in sunshine.', 'তারা দেখা যায় রাতে, রোদে নয়।', 'stars'),
        d('A snowman', 'বরফের মানুষ', 'Snowmen need snow; sunshine and rain make rainbows.', 'বরফের মানুষ বানাতে বরফ লাগে; রোদ আর বৃষ্টিতে হয় রংধনু।', 'snowman'),
      ],
    },
    ret: {
      prompt: ['Which two together can make a rainbow?', 'কোন দুটো একসাথে হলে রংধনু হতে পারে?'],
      answer: a('Sunshine and raindrops', 'রোদ আর বৃষ্টির ফোঁটা', 'sun-rain'),
      distractors: [
        d('Night and stars', 'রাত আর তারা', 'A rainbow needs sunlight.', 'রংধনুর জন্য সূর্যের আলো লাগে।', 'night'),
        d('Wind and leaves', 'বাতাস আর পাতা', 'Wind and leaves cannot split sunlight into colours.', 'বাতাস আর পাতা সূর্যের আলোকে রঙে ভাগ করতে পারে না।', 'wind'),
      ],
    },
  }),
  quickCheck(B46, {
    slug: 'sun-gives', skill: 'identify', src: 'sun', quote: 'Heat from the Sun makes Earth warm enough to live on.',
    explanation: ['The Sun gives us light and warmth.', 'সূর্য আমাদের আলো আর উষ্ণতা দেয়।'],
    prompt: ['What does the Sun give us?', 'সূর্য আমাদের কী দেয়?'],
    answer: a('Light and warmth', 'আলো আর উষ্ণতা', 'sun'),
    distractors: [
      d('Rain', 'বৃষ্টি', 'Rain falls from clouds.', 'বৃষ্টি পড়ে মেঘ থেকে।', 'rain'),
      d('Snow', 'বরফ', 'Snow falls from cold clouds.', 'ঠান্ডা মেঘ থেকে বরফ পড়ে।', 'snowflake'),
    ],
  }),
  quickCheck(B46, {
    slug: 'rainbow-where', skill: 'predict', src: 'rainbow', quote: 'For a rainbow to appear, the Sun must be behind you and water droplets in front.',
    explanation: ['With the Sun behind you and rain in front, you can see a rainbow.', 'সূর্য পেছনে আর বৃষ্টি সামনে থাকলে রংধনু দেখা যায়।'],
    prompt: ['Sun behind you, rain in front. What can you see?', 'সূর্য পেছনে, বৃষ্টি সামনে। কী দেখতে পাবে?'],
    answer: a('A rainbow', 'রংধনু', 'rainbow'),
    distractors: [
      d('The Moon', 'চাঁদ', 'Sun and rain together make rainbows.', 'রোদ আর বৃষ্টি একসাথে হলে রংধনু হয়।', 'moon'),
      d('Lightning', 'বিদ্যুৎ চমকানো', 'Lightning comes from storms; a rainbow comes from sunlight on raindrops.', 'বিদ্যুৎ আসে ঝড় থেকে; রংধনু হয় বৃষ্টির ফোঁটায় রোদ পড়লে।', 'lightning'),
    ],
  }),
]

const ages7to8 = [
  ...objective(B78, {
    slug: 'sun-is-a-star', skill: 'identify', src: 'sun', quote: 'The light of daytime comes from our closest star: the Sun.',
    explanation: ['The Sun is a star: the closest star to Earth.', 'সূর্য একটি তারা: পৃথিবীর সবচেয়ে কাছের তারা।'],
    primary: {
      prompt: ['What kind of object is the Sun?', 'সূর্য কী ধরনের বস্তু?'],
      answer: a('A star', 'একটি তারা'),
      distractors: [
        d('A planet', 'একটি গ্রহ', 'The Sun is a star: a hot, glowing ball of gas, not a planet.', 'সূর্য একটি তারা: গরম, জ্বলজ্বলে গ্যাসের গোলা, গ্রহ নয়।'),
        d('A big cloud', 'একটি বড় মেঘ', 'Clouds are water drops in our sky; the Sun is far away in space.', 'মেঘ হলো আমাদের আকাশের পানির ফোঁটা; সূর্য অনেক দূরে মহাকাশে।'),
      ],
    },
    ret: {
      prompt: ['Which star is closest to Earth?', 'পৃথিবীর সবচেয়ে কাছের তারা কোনটি?'],
      answer: a('The Sun', 'সূর্য'),
      distractors: [
        d('The Moon', 'চাঁদ', 'Our closest star is the Sun, which gives us daylight.', 'আমাদের সবচেয়ে কাছের তারা হলো সূর্য, যা আমাদের দিনের আলো দেয়।'),
        d('A star we see at night', 'রাতে দেখা একটি তারা', 'Night stars look tiny because they are much farther away than the Sun.', 'রাতের তারাগুলো ছোট দেখায় কারণ সেগুলো সূর্যের চেয়ে অনেক দূরে।'),
      ],
    },
  }),
  ...objective(B78, {
    slug: 'sun-bigger-than-earth', skill: 'compare', src: 'sun', quote: 'Our Sun is about 100 times wider than Earth, but it is just an average sized star.',
    explanation: ['The Sun is about 100 times wider than Earth. It looks small only because it is far away.', 'সূর্য পৃথিবীর চেয়ে প্রায় ১০০ গুণ চওড়া। অনেক দূরে বলে ছোট দেখায়।'],
    primary: {
      prompt: ['Which is wider: the Sun or the Earth?', 'কোনটা বেশি চওড়া: সূর্য না পৃথিবী?'],
      answer: a('The Sun, by far', 'সূর্য, অনেক বেশি'),
      distractors: [
        d('The Earth', 'পৃথিবী', 'The Sun looks small because it is very far away.', 'সূর্য অনেক দূরে বলে ছোট দেখায়।'),
        d('They are the same size', 'দুটো সমান', 'The Sun is about 100 times wider than Earth.', 'সূর্য পৃথিবীর চেয়ে প্রায় ১০০ গুণ চওড়া।'),
      ],
    },
    ret: {
      prompt: ['The Sun looks small in the sky. Why?', 'আকাশে সূর্যকে ছোট দেখায় কেন?'],
      answer: a('It is huge but very far away', 'এটা বিশাল, কিন্তু অনেক দূরে'),
      distractors: [
        d('It is smaller than Earth', 'এটা পৃথিবীর চেয়ে ছোট', 'The Sun is about 100 times wider than Earth.', 'সূর্য পৃথিবীর চেয়ে প্রায় ১০০ গুণ চওড়া।'),
        d('It shrinks during the day', 'দিনের বেলা এটা ছোট হয়ে যায়', 'The Sun does not change size during the day.', 'দিনের বেলা সূর্যের আকার বদলায় না।'),
      ],
    },
  }),
  ...objective(B78, {
    slug: 'earth-spins-day-night', skill: 'cause-effect', src: 'dayNight', quote: 'When where you are is pointed toward the Sun, it is day.',
    explanation: ['Earth spins. When your side faces the Sun it is day; when it turns away it is night.', 'পৃথিবী ঘোরে। তোমার দিক সূর্যের দিকে থাকলে দিন; ঘুরে গেলে রাত।'],
    primary: {
      prompt: ['Why do we have day and night?', 'আমাদের দিন আর রাত হয় কেন?'],
      answer: a('The Earth spins', 'পৃথিবী ঘোরে'),
      distractors: [
        d('The Sun switches off', 'সূর্য নিভে যায়', 'The Sun keeps shining; our side of Earth turns away from it.', 'সূর্য সবসময় জ্বলে; পৃথিবীর আমাদের দিক ঘুরে সরে যায়।'),
        d('Clouds cover the Sun', 'মেঘ সূর্যকে ঢেকে দেয়', 'Clouds can make the day dull, but they do not make night.', 'মেঘ দিনকে মেঘলা করতে পারে, কিন্তু রাত তৈরি করে না।'),
      ],
    },
    ret: {
      prompt: ['Night here. Which way does our side of Earth face?', 'এখানে রাত। পৃথিবীর আমাদের দিক কোন দিকে মুখ করে?'],
      answer: a('Away from the Sun', 'সূর্যের উল্টো দিকে'),
      distractors: [
        d('Towards the Sun', 'সূর্যের দিকে', 'Facing the Sun gives day, not night.', 'সূর্যের দিকে থাকলে দিন হয়, রাত নয়।'),
        d('Towards the Moon only', 'শুধু চাঁদের দিকে', 'Night comes from facing away from the Sun.', 'সূর্যের উল্টো দিকে থাকলেই রাত হয়।'),
      ],
    },
  }),
  ...objective(B78, {
    slug: 'sky-blue-scattering', skill: 'cause-effect', src: 'skyBlue', quote: 'The scattered violet and blue light dominates the sky, making it appear blue.',
    explanation: ['Air scatters blue sunlight all over the sky, so the sky looks blue.', 'বাতাস সূর্যের নীল আলো চারদিকে ছড়িয়ে দেয়, তাই আকাশ নীল দেখায়।'],
    primary: {
      prompt: ['Why does a clear sky look blue?', 'পরিষ্কার আকাশ নীল দেখায় কেন?'],
      answer: a('Air scatters blue sunlight', 'বাতাস সূর্যের নীল আলো ছড়ায়'),
      distractors: [
        d('It reflects the sea', 'এটা সমুদ্রের প্রতিফলন', 'The sky is blue even far from any sea.', 'সমুদ্র থেকে অনেক দূরেও আকাশ নীল থাকে।'),
        d('Space is painted blue', 'মহাকাশের রং নীল', 'Space is dark; the blue comes from our air scattering light.', 'মহাকাশ অন্ধকার; নীল রং আসে আমাদের বাতাসে আলো ছড়ানো থেকে।'),
      ],
    },
    ret: {
      prompt: ['Which colour of sunlight does air scatter the most?', 'বাতাস সূর্যের আলোর কোন রং সবচেয়ে বেশি ছড়ায়?'],
      answer: a('Blue', 'নীল'),
      distractors: [
        d('Red', 'লাল', 'Red light mostly passes straight through the air.', 'লাল আলো বেশিরভাগই সোজা বাতাস পেরিয়ে যায়।'),
        d('Green', 'সবুজ', 'Blue and violet are scattered most, which is why the sky looks blue.', 'নীল আর বেগুনি সবচেয়ে বেশি ছড়ায়, তাই আকাশ নীল দেখায়।'),
      ],
    },
  }),
  ...objective(B78, {
    slug: 'sunlight-many-colours', skill: 'identify', src: 'skyBlue', quote: 'The white light coming from the Sun is really made up of all the colors of the rainbow.',
    explanation: ['White sunlight is a mix of all the rainbow colours.', 'সাদা সূর্যের আলো আসলে রংধনুর সব রঙের মিশ্রণ।'],
    primary: {
      prompt: ['White sunlight is really made of…', 'সাদা সূর্যের আলো আসলে তৈরি…'],
      answer: a('All the rainbow colours', 'রংধনুর সব রং দিয়ে'),
      distractors: [
        d('Only yellow light', 'শুধু হলুদ আলো দিয়ে', 'The Sun looks yellow-white, but its light holds every colour.', 'সূর্য হলুদ-সাদা দেখায়, কিন্তু এর আলোতে সব রং আছে।'),
        d('No colours at all', 'কোনো রং নেই', 'Rainbows show the colours hidden in sunlight.', 'রংধনু সূর্যের আলোয় লুকানো রংগুলো দেখায়।'),
      ],
    },
    ret: {
      prompt: ['A rainbow shows us colours hidden in…', 'রংধনু আমাদের যে রংগুলো দেখায় তা লুকানো থাকে…'],
      answer: a('Sunlight', 'সূর্যের আলোতে'),
      distractors: [
        d('The clouds', 'মেঘে', 'Clouds are water drops; the colours come from sunlight.', 'মেঘ হলো পানির ফোঁটা; রংগুলো আসে সূর্যের আলো থেকে।'),
        d('The wind', 'বাতাসে', 'Wind has no colours; sunlight does.', 'বাতাসের কোনো রং নেই; সূর্যের আলোর আছে।'),
      ],
    },
  }),
  ...objective(B78, {
    slug: 'morning-shadow', skill: 'predict', src: 'shadow', quote: "If the Sun's rays are incident on an object, the shadow is oriented away from the Sun.",
    explanation: ['Shadows point away from the Sun. In the morning the Sun is in the east, so shadows point west.', 'ছায়া সূর্যের উল্টো দিকে পড়ে। সকালে সূর্য পূর্বে, তাই ছায়া পশ্চিমে।'],
    primary: {
      prompt: ['Morning Sun in the east. Where does your shadow point?', 'সকালের সূর্য পূর্বে। তোমার ছায়া কোন দিকে পড়বে?'],
      answer: a('West', 'পশ্চিমে'),
      distractors: [
        d('East', 'পূর্বে', 'Shadows point away from the Sun, not towards it.', 'ছায়া সূর্যের দিকে নয়, উল্টো দিকে পড়ে।'),
        d('Straight up', 'সোজা ওপরে', 'Shadows fall on the ground, away from the Sun.', 'ছায়া মাটিতে পড়ে, সূর্যের উল্টো দিকে।'),
      ],
    },
    ret: {
      prompt: ['Your shadow points left. Where is the Sun?', 'তোমার ছায়া বাঁ দিকে পড়ছে। সূর্য কোথায়?'],
      answer: a('On your right', 'তোমার ডান দিকে'),
      distractors: [
        d('On your left', 'তোমার বাঁ দিকে', 'The shadow is on the side away from the Sun.', 'ছায়া থাকে সূর্যের উল্টো পাশে।'),
        d('Under the ground', 'মাটির নিচে', 'Sunlight comes from the sky, opposite the shadow.', 'সূর্যের আলো আসে আকাশ থেকে, ছায়ার উল্টো দিক থেকে।'),
      ],
    },
  }),
  ...objective(B78, {
    slug: 'rainbow-sun-behind', skill: 'predict', src: 'rainbow', quote: 'For a rainbow to appear, the Sun must be behind you and water droplets in front.',
    explanation: ['To see a rainbow, the Sun must be behind you and raindrops in front of you.', 'রংধনু দেখতে সূর্য থাকতে হবে তোমার পেছনে আর বৃষ্টির ফোঁটা সামনে।'],
    primary: {
      prompt: ['To see a rainbow, where should the Sun be?', 'রংধনু দেখতে সূর্য কোথায় থাকা উচিত?'],
      answer: a('Behind you', 'তোমার পেছনে'),
      distractors: [
        d('In front of you', 'তোমার সামনে', 'You look away from the Sun, towards the raindrops.', 'তুমি সূর্যের উল্টো দিকে, বৃষ্টির ফোঁটার দিকে তাকাও।'),
        d('Already set, at night', 'ডুবে গেছে, রাতে', 'A rainbow needs sunlight.', 'রংধনুর জন্য সূর্যের আলো লাগে।'),
      ],
    },
    ret: {
      prompt: ['You face the rain with the Sun behind. What appears?', 'সূর্য পেছনে রেখে বৃষ্টির দিকে তাকালে। কী দেখা যাবে?'],
      answer: a('A rainbow', 'রংধনু'),
      distractors: [
        d('A shadow of the rain', 'বৃষ্টির ছায়া', 'Sunlight bending in raindrops makes a rainbow.', 'বৃষ্টির ফোঁটায় সূর্যের আলো বেঁকে রংধনু হয়।'),
        d('Stars', 'তারা', 'Stars are hidden by daylight; this is a rainbow.', 'দিনের আলোয় তারা দেখা যায় না; এটা রংধনু।'),
      ],
    },
  }),
  ...objective(B78, {
    slug: 'sun-heat-life', skill: 'cause-effect', src: 'sun', quote: 'Heat from the Sun makes Earth warm enough to live on.',
    explanation: ['Heat from the Sun keeps Earth warm enough for living things.', 'সূর্যের তাপ পৃথিবীকে জীবনের জন্য যথেষ্ট উষ্ণ রাখে।'],
    primary: {
      prompt: ['What keeps Earth warm enough to live on?', 'কী পৃথিবীকে বসবাসের মতো উষ্ণ রাখে?'],
      answer: a('Heat from the Sun', 'সূর্যের তাপ'),
      distractors: [
        d('The Moon', 'চাঁদ', 'The Moon does not heat Earth; the Sun does.', 'চাঁদ পৃথিবীকে গরম করে না; সূর্য করে।'),
        d('The clouds', 'মেঘ', 'Clouds are water drops; the heat comes from the Sun.', 'মেঘ হলো পানির ফোঁটা; তাপ আসে সূর্য থেকে।'),
      ],
    },
    ret: {
      prompt: ['Without the Sun, Earth would be…', 'সূর্য না থাকলে পৃথিবী হতো…'],
      answer: a('Too cold for life', 'জীবনের জন্য খুব ঠান্ডা'),
      distractors: [
        d('Warmer', 'আরও গরম', 'The Sun is what warms Earth.', 'সূর্যই পৃথিবীকে গরম করে।'),
        d('Just the same', 'ঠিক একই রকম', 'Earth depends on the Sun’s heat.', 'পৃথিবী সূর্যের তাপের ওপর নির্ভর করে।'),
      ],
    },
  }),
  quickCheck(B78, {
    slug: 'morning-east', skill: 'identify', src: 'dayNight', quote: 'seems to move across the sky starting in the east in the morning',
    explanation: ['In the morning the Sun seems to start in the east.', 'সকালে সূর্য পূর্ব দিক থেকে যাত্রা শুরু করে বলে মনে হয়।'],
    prompt: ['In the morning, the Sun seems to start in the…', 'সকালে সূর্য যেন শুরু করে…'],
    answer: a('East', 'পূর্ব দিকে'),
    distractors: [
      d('West', 'পশ্চিম দিকে', 'In the morning the Sun starts in the east.', 'সকালে সূর্য পূর্ব দিকে থাকে।'),
      d('Straight overhead', 'ঠিক মাথার ওপরে', 'The Sun starts low in the east, then moves across the sky.', 'সূর্য পূর্বে নিচু থেকে শুরু করে, তারপর আকাশ পেরোয়।'),
    ],
  }),
  quickCheck(B78, {
    slug: 'star-meaning', skill: 'identify', src: 'sun', quote: 'A star is a hot, glowing ball of gas.',
    explanation: ['A star is a hot, glowing ball of gas, like our Sun.', 'তারা হলো গরম, জ্বলজ্বলে গ্যাসের গোলা, যেমন আমাদের সূর্য।'],
    prompt: ['What is a star?', 'তারা কী?'],
    answer: a('A hot, glowing ball of gas', 'গরম, জ্বলজ্বলে গ্যাসের গোলা'),
    distractors: [
      d('A tiny light hung in the sky', 'আকাশে ঝোলানো ছোট বাতি', 'Stars look tiny only because they are far away.', 'অনেক দূরে বলে তারা ছোট দেখায়।'),
      d('A cold rock', 'ঠান্ডা পাথর', 'Stars are hot and glow with their own light.', 'তারা গরম আর নিজের আলোয় জ্বলে।'),
    ],
  }),
  quickCheck(B78, {
    slug: 'day-facing-sun', skill: 'cause-effect', src: 'dayNight', quote: 'When where you are is pointed toward the Sun, it is day.',
    explanation: ['It is day where Earth faces the Sun.', 'পৃথিবীর যে দিক সূর্যের দিকে থাকে, সেখানে দিন।'],
    prompt: ['It is day where Earth is…', 'পৃথিবীর যেখানে দিন, সেই দিকটা…'],
    answer: a('Facing the Sun', 'সূর্যের দিকে মুখ করা'),
    distractors: [
      d('Facing away from the Sun', 'সূর্যের উল্টো দিকে', 'Facing away gives night.', 'উল্টো দিকে থাকলে রাত হয়।'),
      d('Covered by clouds', 'মেঘে ঢাকা', 'Cloudy places can still have daytime.', 'মেঘলা জায়গাতেও দিন হয়।'),
    ],
  }),
]

const ages9to10 = [
  ...objective(B910, {
    slug: 'star-hot-gas', skill: 'identify', src: 'sun', quote: 'A star is a hot, glowing ball of gas.',
    explanation: ['Scientists call the Sun a star because it is a hot, glowing ball of gas that makes its own light.', 'বিজ্ঞানীরা সূর্যকে তারা বলেন, কারণ এটা গরম, জ্বলজ্বলে গ্যাসের গোলা যা নিজের আলো তৈরি করে।'],
    primary: {
      prompt: ['Scientists call the Sun a star. Which description fits a star?', 'বিজ্ঞানীরা সূর্যকে তারা বলেন। কোন বর্ণনাটি তারার সাথে মেলে?'],
      answer: a('A hot, glowing ball of gas', 'গরম, জ্বলজ্বলে গ্যাসের গোলা'),
      distractors: [
        d('A cold rocky world', 'ঠান্ডা পাথুরে জগৎ', 'A star is hot and glowing, not a cold rock.', 'তারা গরম ও জ্বলজ্বলে, ঠান্ডা পাথর নয়।'),
        d('A ball of ice and dust', 'বরফ আর ধুলোর গোলা', 'Stars are hot and glowing, not icy.', 'তারা গরম ও জ্বলজ্বলে, বরফের নয়।'),
      ],
    },
    ret: {
      prompt: ['Which of these is a hot, glowing ball of gas: the Sun, the Moon or Earth?', 'কোনটি গরম, জ্বলজ্বলে গ্যাসের গোলা: সূর্য, চাঁদ না পৃথিবী?'],
      answer: a('The Sun', 'সূর্য'),
      distractors: [
        d('The Moon', 'চাঁদ', 'The Sun is the star here; a star is a hot, glowing ball of gas.', 'এখানে তারা হলো সূর্য; তারা মানে গরম, জ্বলজ্বলে গ্যাসের গোলা।'),
        d('Earth', 'পৃথিবী', 'Earth is not a hot, glowing ball of gas; the Sun is.', 'পৃথিবী গরম, জ্বলজ্বলে গ্যাসের গোলা নয়; সূর্য তা।'),
      ],
    },
  }),
  ...objective(B910, {
    slug: 'sun-average-star', skill: 'compare', src: 'sun', quote: 'Our Sun is about 100 times wider than Earth, but it is just an average sized star.',
    explanation: ['The Sun is about 100 times wider than Earth, yet it is only an average-sized star.', 'সূর্য পৃথিবীর চেয়ে প্রায় ১০০ গুণ চওড়া, তবুও এটা মাঝারি আকারের একটি তারা।'],
    primary: {
      prompt: ['The Sun is about 100 times wider than Earth. Compared with other stars, it is…', 'সূর্য পৃথিবীর চেয়ে প্রায় ১০০ গুণ চওড়া। অন্য তারার তুলনায় এটি…'],
      answer: a('An average-sized star', 'মাঝারি আকারের তারা'),
      distractors: [
        d('The biggest star there is', 'সবচেয়ে বড় তারা', 'Many stars are bigger; the Sun just looks biggest because it is closest.', 'অনেক তারা আরও বড়; সূর্য সবচেয়ে কাছে বলে সবচেয়ে বড় দেখায়।'),
        d('Smaller than most planets', 'বেশিরভাগ গ্রহের চেয়ে ছোট', 'The Sun is far wider than Earth and the other planets.', 'সূর্য পৃথিবী ও অন্য গ্রহগুলোর চেয়ে অনেক চওড়া।'),
      ],
    },
    ret: {
      prompt: ['Why does the Sun look much bigger than night-time stars?', 'রাতের তারাগুলোর চেয়ে সূর্যকে অনেক বড় দেখায় কেন?'],
      answer: a('It is much closer to us', 'এটা আমাদের অনেক কাছে'),
      distractors: [
        d('It is the largest star in space', 'এটা মহাকাশের সবচেয়ে বড় তারা', 'The Sun is an average-sized star.', 'সূর্য মাঝারি আকারের তারা।'),
        d('Night stars are tiny sparks', 'রাতের তারারা ছোট ফুলকি', 'Many night stars are huge; they are just very far away.', 'রাতের অনেক তারা বিশাল; শুধু অনেক দূরে।'),
      ],
    },
  }),
  ...objective(B910, {
    slug: 'blue-short-waves', skill: 'cause-effect', src: 'skyBlue', quote: 'Blue light is scattered more than other colors because it travels as shorter, smaller waves.',
    explanation: ['Blue light travels as shorter, smaller waves, so air molecules scatter it more than other colours.', 'নীল আলো ছোট, খাটো তরঙ্গে চলে, তাই বাতাসের অণু অন্য রঙের চেয়ে নীলকে বেশি ছড়ায়।'],
    primary: {
      prompt: ['Air scatters blue light more than red. What is different about blue light?', 'বাতাস লালের চেয়ে নীল আলো বেশি ছড়ায়। নীল আলোর বিশেষত্ব কী?'],
      answer: a('It travels as shorter, smaller waves', 'এটা ছোট, খাটো তরঙ্গে চলে'),
      distractors: [
        d('It is heavier than red light', 'এটা লাল আলোর চেয়ে ভারী', 'Light has no weight; wave size is what matters.', 'আলোর ওজন নেই; তরঙ্গের আকারই আসল।'),
        d('It comes from the ocean', 'এটা সমুদ্র থেকে আসে', 'Blue light is part of sunlight, not the sea.', 'নীল আলো সূর্যের আলোর অংশ, সমুদ্রের নয়।'),
      ],
    },
    ret: {
      prompt: ['Which part of sunlight bounces off air molecules most easily?', 'সূর্যের আলোর কোন অংশ বাতাসের অণুতে সবচেয়ে সহজে ধাক্কা খেয়ে ছড়ায়?'],
      answer: a('Short blue and violet waves', 'ছোট নীল ও বেগুনি তরঙ্গ'),
      distractors: [
        d('Long red waves', 'লম্বা লাল তরঙ্গ', 'Red waves mostly pass straight through.', 'লাল তরঙ্গ বেশিরভাগই সোজা পেরিয়ে যায়।'),
        d('All colours equally', 'সব রং সমানভাবে', 'If all were scattered equally the sky would look white, not blue.', 'সব রং সমান ছড়ালে আকাশ সাদা দেখাত, নীল নয়।'),
      ],
    },
  }),
  ...objective(B910, {
    slug: 'sunset-colours', skill: 'cause-effect', src: 'skyBlue', quote: 'As the Sun gets lower in the sky, its light passes through more of the atmosphere to reach you.',
    explanation: ['Near sunset, sunlight crosses more air. More blue is scattered away, so reds and yellows reach your eyes.', 'সূর্যাস্তের সময় আলো বেশি বাতাস পেরোয়। নীল বেশি ছড়িয়ে যায়, তাই লাল-হলুদ চোখে পৌঁছায়।'],
    primary: {
      prompt: ['Why does the sky near the setting Sun often look red and yellow?', 'অস্ত যাওয়া সূর্যের কাছে আকাশ প্রায়ই লাল-হলুদ দেখায় কেন?'],
      answer: a('Light crosses more air, so blue is scattered away', 'আলো বেশি বাতাস পেরোয়, তাই নীল ছড়িয়ে যায়'),
      distractors: [
        d('The Sun cools down and changes colour', 'সূর্য ঠান্ডা হয়ে রং বদলায়', 'The Sun is the same; its light takes a longer path through air.', 'সূর্য একই থাকে; আলো বাতাসের মধ্যে দিয়ে লম্বা পথ পেরোয়।'),
        d('Clouds paint the light red', 'মেঘ আলোকে লাল রাঙায়', 'Even a cloudless sunset can glow red; the air does it.', 'মেঘ ছাড়াও সূর্যাস্ত লাল হতে পারে; কাজটা বাতাসের।'),
      ],
    },
    ret: {
      prompt: ['The Sun is high at noon, low at sunset. When does its light cross more air?', 'দুপুরে সূর্য উঁচুতে, সূর্যাস্তে নিচুতে। কখন আলো বেশি বাতাস পেরোয়?'],
      answer: a('At sunset', 'সূর্যাস্তে'),
      distractors: [
        d('At noon', 'দুপুরে', 'A high Sun shines through the shortest path of air.', 'উঁচু সূর্যের আলো সবচেয়ে কম বাতাস পেরোয়।'),
        d('It is always the same', 'সবসময় একই', 'A low Sun’s light crosses much more atmosphere.', 'নিচু সূর্যের আলো অনেক বেশি বায়ুমণ্ডল পেরোয়।'),
      ],
    },
  }),
  ...objective(B910, {
    slug: 'rotation-24h', skill: 'cause-effect', src: 'dayNight', quote: 'one complete spin in 24 hours',
    explanation: ['Earth rotates on its axis, one complete spin in about 24 hours, carrying each place into daylight and then into night.', 'পৃথিবী নিজের অক্ষে ঘোরে, প্রায় ২৪ ঘণ্টায় এক পাক; তাই প্রতিটি জায়গা একবার দিনে, একবার রাতে যায়।'],
    primary: {
      prompt: ['About how long does Earth take to spin once on its axis?', 'পৃথিবী নিজের অক্ষে একবার ঘুরতে মোটামুটি কত সময় নেয়?'],
      answer: a('About 24 hours', 'প্রায় ২৪ ঘণ্টা'),
      distractors: [
        d('About one year', 'প্রায় এক বছর', 'One complete spin takes about 24 hours, not a year.', 'এক পাক ঘুরতে লাগে প্রায় ২৪ ঘণ্টা, এক বছর নয়।'),
        d('About one hour', 'প্রায় এক ঘণ্টা', 'Then day and night would last only minutes each.', 'তাহলে দিন-রাত প্রতিটা মাত্র কয়েক মিনিট হতো।'),
      ],
    },
    ret: {
      prompt: ['Daylight here, night on the other side of Earth. What causes this difference?', 'এখানে দিন, পৃথিবীর অন্য পাশে রাত। এই পার্থক্যের কারণ কী?'],
      answer: a('Only one side faces the Sun as Earth rotates', 'পৃথিবী ঘোরার সময় শুধু এক দিক সূর্যের দিকে থাকে'),
      distractors: [
        d('The Sun moves around Earth each day', 'সূর্য প্রতিদিন পৃথিবীর চারপাশে ঘোরে', 'The Sun only seems to move; Earth is the one spinning.', 'সূর্য শুধু চলছে বলে মনে হয়; ঘুরছে পৃথিবী।'),
        d('The other side has more clouds', 'অন্য পাশে মেঘ বেশি', 'Clouds do not cause night; facing away from the Sun does.', 'মেঘ রাত তৈরি করে না; সূর্যের উল্টো দিকে থাকাই কারণ।'),
      ],
    },
  }),
  ...objective(B910, {
    slug: 'shadow-length-changes', skill: 'predict', src: 'shadow', quote: 'The shadow length changes through the course of a day as well as through the year',
    explanation: ['As the Sun’s position in the sky changes, the length of a shadow changes through the day.', 'আকাশে সূর্যের অবস্থান বদলায় বলে দিনের মধ্যে ছায়ার দৈর্ঘ্যও বদলায়।'],
    primary: {
      prompt: ['You mark a stick’s shadow at 9 am, 12 noon and 3 pm. What will you find?', 'সকাল ৯টা, দুপুর ১২টা আর বিকেল ৩টায় একটা লাঠির ছায়া চিহ্নিত করলে। কী দেখবে?'],
      answer: a('The shadow’s length changes', 'ছায়ার দৈর্ঘ্য বদলায়'),
      distractors: [
        d('The shadow never changes', 'ছায়া কখনো বদলায় না', 'The Sun’s position changes, so the shadow changes too.', 'সূর্যের অবস্থান বদলায়, তাই ছায়াও বদলায়।'),
        d('The shadow points at the Sun', 'ছায়া সূর্যের দিকে থাকে', 'Shadows always point away from the Sun.', 'ছায়া সবসময় সূর্যের উল্টো দিকে থাকে।'),
      ],
    },
    ret: {
      prompt: ['A sundial’s shadow moves during the day. What makes it move?', 'সূর্যঘড়ির ছায়া দিনভর সরে যায়। কেন সরে?'],
      answer: a('The Sun’s position in the sky changes', 'আকাশে সূর্যের অবস্থান বদলায়'),
      distractors: [
        d('The wind pushes the shadow', 'বাতাস ছায়াকে ঠেলে', 'Shadows are missing light; wind cannot push them.', 'ছায়া হলো আলোর অনুপস্থিতি; বাতাস তা ঠেলতে পারে না।'),
        d('The stick slowly grows', 'লাঠিটা ধীরে বড় হয়', 'The stick stays the same; the sunlight’s direction changes.', 'লাঠি একই থাকে; সূর্যের আলোর দিক বদলায়।'),
      ],
    },
  }),
  ...objective(B910, {
    slug: 'find-the-rainbow', skill: 'apply', src: 'rainbow', quote: 'For a rainbow to appear, the Sun must be behind you and water droplets in front.',
    explanation: ['A rainbow appears opposite the Sun: Sun behind you, raindrops in front.', 'রংধনু দেখা যায় সূর্যের উল্টো দিকে: সূর্য পেছনে, বৃষ্টির ফোঁটা সামনে।'],
    primary: {
      prompt: ['After an afternoon shower the Sun is in the west. Where should you look for a rainbow?', 'বিকেলের বৃষ্টির পর সূর্য পশ্চিমে। রংধনু দেখতে কোন দিকে তাকাবে?'],
      answer: a('East, with the Sun behind you', 'পূর্বে, সূর্য পেছনে রেখে'),
      distractors: [
        d('West, towards the Sun', 'পশ্চিমে, সূর্যের দিকে', 'Looking at the Sun you cannot see a rainbow; it is opposite.', 'সূর্যের দিকে তাকালে রংধনু দেখা যায় না; এটা উল্টো দিকে।'),
        d('Straight down at the ground', 'সোজা নিচে মাটির দিকে', 'Rainbows form in the drops in front of you, opposite the Sun.', 'রংধনু হয় সামনের ফোঁটায়, সূর্যের উল্টো দিকে।'),
      ],
    },
    ret: {
      prompt: ['Morning Sun in the east, rain falling in the west. Where could a rainbow appear?', 'সকালে সূর্য পূর্বে, পশ্চিমে বৃষ্টি হচ্ছে। রংধনু কোথায় দেখা যেতে পারে?'],
      answer: a('In the west', 'পশ্চিমে'),
      distractors: [
        d('In the east', 'পূর্বে', 'That is where the Sun is; the rainbow is opposite it.', 'সেখানে সূর্য; রংধনু হয় তার উল্টো দিকে।'),
        d('Nowhere: rainbows only happen at noon', 'কোথাও না: রংধনু শুধু দুপুরে হয়', 'Rainbows often appear when the Sun is low.', 'সূর্য নিচু থাকলে প্রায়ই রংধনু দেখা যায়।'),
      ],
    },
  }),
  ...objective(B910, {
    slug: 'droplets-split-light', skill: 'apply', src: 'rainbow', quote: 'When sunlight passes through a raindrop, it slows down and bends (refracts), splitting into its component colours.',
    explanation: ['Sunlight slows down and bends in water drops, splitting into its colours. Any spray of drops in sunshine can do this.', 'পানির ফোঁটায় সূর্যের আলো ধীর হয়ে বেঁকে যায় ও রঙে ভাগ হয়। রোদে যেকোনো পানির ছিটায় এটা হতে পারে।'],
    primary: {
      prompt: ['A garden hose sprays water in sunshine and colours appear. What is happening?', 'রোদে বাগানের পাইপ থেকে পানি ছিটালে রং দেখা যায়। কী ঘটছে?'],
      answer: a('Water drops bend sunlight and split it into colours', 'পানির ফোঁটা সূর্যের আলো বাঁকিয়ে রঙে ভাগ করে'),
      distractors: [
        d('The water has paint in it', 'পানিতে রং মেশানো আছে', 'Clean water makes the same colours; they come from sunlight.', 'পরিষ্কার পানিতেও একই রং হয়; রং আসে সূর্যের আলো থেকে।'),
        d('The hose makes its own light', 'পাইপ নিজেই আলো তৈরি করে', 'No light is made; sunlight is being bent and split.', 'নতুন আলো তৈরি হয় না; সূর্যের আলো বেঁকে ভাগ হচ্ছে।'),
      ],
    },
    ret: {
      prompt: ['When sunlight enters a raindrop it slows down and bends. What is this bending called?', 'সূর্যের আলো বৃষ্টির ফোঁটায় ঢুকে ধীর হয়ে বেঁকে যায়। এই বাঁকাকে কী বলে?'],
      answer: a('Refraction', 'প্রতিসরণ'),
      distractors: [
        d('Evaporation', 'বাষ্পীভবন', 'Evaporation is water turning into vapour, not light bending.', 'বাষ্পীভবন হলো পানির বাষ্প হওয়া, আলো বাঁকা নয়।'),
        d('Erosion', 'ক্ষয়', 'Erosion is land being worn away.', 'ক্ষয় হলো মাটি বা পাথর ক্ষয়ে যাওয়া।'),
      ],
    },
  }),
  quickCheck(B910, {
    slug: 'rainbow-order', skill: 'identify', src: 'rainbow', quote: 'The classic order is red, orange, yellow, green, blue, indigo, and violet (ROYGBIV), with red having the longest wavelength and violet the shortest.',
    explanation: ['Red has the longest wavelength of the rainbow colours; violet has the shortest.', 'রংধনুর রংগুলোর মধ্যে লালের তরঙ্গদৈর্ঘ্য সবচেয়ে লম্বা; বেগুনির সবচেয়ে ছোট।'],
    prompt: ['Which rainbow colour has the longest wavelength?', 'রংধনুর কোন রঙের তরঙ্গদৈর্ঘ্য সবচেয়ে লম্বা?'],
    answer: a('Red', 'লাল'),
    distractors: [
      d('Violet', 'বেগুনি', 'Violet has the shortest wavelength.', 'বেগুনির তরঙ্গদৈর্ঘ্য সবচেয়ে ছোট।'),
      d('Green', 'সবুজ', 'Green is in the middle of the order.', 'সবুজ ক্রমের মাঝখানে।'),
    ],
  }),
  quickCheck(B910, {
    slug: 'sun-mass', skill: 'compare', src: 'sun', quote: 'The Sun contains almost ALL of the material in our solar system. 99% of it.',
    explanation: ['About 99% of all the material in our solar system is in the Sun.', 'আমাদের সৌরজগতের প্রায় ৯৯% উপাদান সূর্যের মধ্যে।'],
    prompt: ['How much of the solar system’s material is in the Sun?', 'সৌরজগতের কতটা উপাদান সূর্যে আছে?'],
    answer: a('About 99%', 'প্রায় ৯৯%'),
    distractors: [
      d('About half', 'প্রায় অর্ধেক', 'The Sun holds almost all of it.', 'সূর্যে প্রায় সবটুকুই।'),
      d('Less than Earth', 'পৃথিবীর চেয়েও কম', 'The Sun is far bigger than all the planets together.', 'সূর্য সব গ্রহ মিলিয়েও অনেক বড়।'),
    ],
  }),
  quickCheck(B910, {
    slug: 'plants-need-sun', skill: 'apply', src: 'sun', quote: 'Without light from the Sun, there would be no plants or animals—and, therefore, no food and we wouldn\'t exist.',
    explanation: ['Plants need sunlight, animals eat plants, and we need both for food: all of it depends on the Sun.', 'গাছের সূর্যের আলো লাগে, প্রাণীরা গাছ খায়, আর খাবারের জন্য আমাদের দুটোই লাগে: সবকিছু সূর্যের ওপর নির্ভর করে।'],
    prompt: ['A seedling stays in a dark cupboard for weeks. Using what you know, predict what happens.', 'একটি চারাগাছ কয়েক সপ্তাহ অন্ধকার আলমারিতে থাকল। যা জানো তা দিয়ে অনুমান করো কী হবে।'],
    answer: a('It cannot grow well without sunlight', 'সূর্যের আলো ছাড়া এটা ভালোভাবে বাড়তে পারে না'),
    distractors: [
      d('It grows faster in the dark', 'অন্ধকারে আরও দ্রুত বাড়ে', 'Plants depend on light from the Sun.', 'গাছ সূর্যের আলোর ওপর নির্ভর করে।'),
      d('Nothing changes', 'কিছুই বদলায় না', 'Without sunlight, plants cannot live and grow.', 'সূর্যের আলো ছাড়া গাছ বাঁচতে ও বাড়তে পারে না।'),
    ],
  }),
  quickCheck(B910, {
    slug: 'refraction-reflection', skill: 'cause-effect', src: 'rainbow', quote: 'A rainbow is created through the refraction and reflection of sunlight in water droplets.',
    explanation: ['A rainbow forms when sunlight is refracted and reflected inside water droplets.', 'পানির ফোঁটার ভেতরে সূর্যের আলো প্রতিসরিত ও প্রতিফলিত হলে রংধনু তৈরি হয়।'],
    prompt: ['Which two things happen to sunlight inside raindrops to make a rainbow?', 'রংধনু তৈরি করতে বৃষ্টির ফোঁটার ভেতরে সূর্যের আলোর কোন দুটি ঘটনা ঘটে?'],
    answer: a('Refraction and reflection', 'প্রতিসরণ ও প্রতিফলন'),
    distractors: [
      d('Freezing and melting', 'জমে যাওয়া ও গলে যাওয়া', 'Those are changes of water, not of light.', 'এগুলো পানির পরিবর্তন, আলোর নয়।'),
      d('Burning and smoke', 'পোড়া ও ধোঁয়া', 'Nothing burns; light is bent and bounced.', 'কিছু পোড়ে না; আলো বাঁকে ও প্রতিফলিত হয়।'),
    ],
  }),
]

export const SKY_WATCHER_ITEMS = Object.freeze([...ages4to6, ...ages7to8, ...ages9to10])
