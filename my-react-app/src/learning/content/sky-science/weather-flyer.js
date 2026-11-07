/**
 * Sky Science Explorer: Weather Flyer (wave 1). Clouds, rain and snow, the water cycle, wind,
 * thunder and lightning, and fog.
 *
 * STATUS: draft, AWAITING science-accuracy review AND Bangla review. Bangla is a first draft.
 * Every fact is tied to a quote in ./sources.js (fetched 2026-11-02).
 */
import { a, d, objective, quickCheck } from '../build.js'

const B46 = { mission: 'weather-flyer', band: '4-6' }
const B78 = { mission: 'weather-flyer', band: '7-8' }
const B910 = { mission: 'weather-flyer', band: '9-10' }

const ages4to6 = [
  ...objective(B46, {
    slug: 'rain-from-clouds', skill: 'identify', src: 'clouds', quote: 'When that happens, gravity causes them to fall to Earth.',
    explanation: ['Rain falls from clouds when the water drops get heavy.', 'পানির ফোঁটা ভারী হলে মেঘ থেকে বৃষ্টি পড়ে।'],
    primary: {
      prompt: ['Where does rain come from?', 'বৃষ্টি কোথা থেকে আসে?'],
      answer: a('Clouds', 'মেঘ থেকে', 'rain'),
      distractors: [
        d('The Sun', 'সূর্য থেকে', 'The Sun gives light and heat, not rain.', 'সূর্য আলো আর তাপ দেয়, বৃষ্টি নয়।', 'sun'),
        d('Trees', 'গাছ থেকে', 'Rain drips off trees, but it falls from clouds first.', 'বৃষ্টি গাছ থেকে টুপটাপ পড়ে, কিন্তু প্রথমে আসে মেঘ থেকে।', 'tree'),
      ],
    },
    ret: {
      prompt: ['Raindrops are falling. Look up! What is above?', 'বৃষ্টির ফোঁটা পড়ছে। ওপরে তাকাও! ওপরে কী আছে?'],
      answer: a('Rain clouds', 'বৃষ্টির মেঘ', 'rain'),
      distractors: [
        d('A rainbow', 'রংধনু', 'Rainbows can appear in rain, but rain comes from clouds.', 'বৃষ্টিতে রংধনু দেখা যেতে পারে, কিন্তু বৃষ্টি আসে মেঘ থেকে।', 'rainbow'),
        d('Stars', 'তারা', 'Rain falls from clouds, not from stars.', 'বৃষ্টি পড়ে মেঘ থেকে, তারা থেকে নয়।', 'stars'),
      ],
    },
  }),
  ...objective(B46, {
    slug: 'cloud-made-of-drops', skill: 'identify', src: 'clouds', quote: 'A cloud is made of water drops or ice crystals floating in the sky.',
    explanation: ['A cloud is made of tiny drops of water floating in the sky.', 'মেঘ হলো আকাশে ভেসে থাকা ছোট ছোট পানির ফোঁটা।'],
    primary: {
      prompt: ['What is a cloud made of?', 'মেঘ কী দিয়ে তৈরি?'],
      answer: a('Tiny water drops', 'ছোট ছোট পানির ফোঁটা', 'drops'),
      distractors: [
        d('Cotton', 'তুলা', 'Clouds look fluffy like cotton, but they are water.', 'মেঘ তুলার মতো দেখায়, কিন্তু আসলে পানি।', 'cotton'),
        d('Smoke', 'ধোঁয়া', 'Clouds are water drops, not smoke from a fire.', 'মেঘ হলো পানির ফোঁটা, আগুনের ধোঁয়া নয়।', 'smoke'),
      ],
    },
    ret: {
      prompt: ['If you flew into a cloud, you would get…', 'তুমি যদি মেঘের ভেতর দিয়ে উড়ে যাও, তুমি হবে…'],
      answer: a('Wet', 'ভেজা', 'drops'),
      distractors: [
        d('Sticky', 'আঠালো', 'Clouds are water, so they make you wet.', 'মেঘ পানি, তাই ভিজিয়ে দেয়।', 'cotton'),
        d('Dusty', 'ধুলোমাখা', 'Clouds are made of water drops.', 'মেঘ পানির ফোঁটা দিয়ে তৈরি।', 'smoke'),
      ],
    },
  }),
  ...objective(B46, {
    slug: 'cold-makes-snow', skill: 'cause-effect', src: 'clouds', quote: 'When the air is colder, the water may form snowflakes instead.',
    explanation: ['When the air is very cold, clouds can make snowflakes instead of rain.', 'বাতাস খুব ঠান্ডা হলে মেঘ বৃষ্টির বদলে তুষার তৈরি করতে পারে।'],
    primary: {
      prompt: ['It is very, very cold. What may fall from the clouds?', 'খুব খুব ঠান্ডা। মেঘ থেকে কী পড়তে পারে?'],
      answer: a('Snowflakes', 'তুষারকণা', 'snowflake'),
      distractors: [
        d('Leaves', 'পাতা', 'Leaves fall from trees, not clouds.', 'পাতা পড়ে গাছ থেকে, মেঘ থেকে নয়।', 'leaf'),
        d('Sand', 'বালি', 'Clouds hold water, so cold clouds can make snow.', 'মেঘে পানি থাকে, তাই ঠান্ডা মেঘ তুষার বানাতে পারে।', 'sand'),
      ],
    },
    ret: {
      prompt: ['Snow is falling. Is the air warm or cold?', 'তুষার পড়ছে। বাতাস গরম না ঠান্ডা?'],
      answer: a('Cold', 'ঠান্ডা', 'snowman'),
      distractors: [
        d('Hot', 'গরম', 'Snow forms when the air is cold.', 'বাতাস ঠান্ডা হলে তুষার হয়।', 'sun'),
        d('It does not matter', 'কিছু যায় আসে না', 'In warmer air the water falls as rain instead.', 'গরম বাতাসে পানি বৃষ্টি হয়ে পড়ে।', 'rain'),
      ],
    },
  }),
  ...objective(B46, {
    slug: 'wind-moves-kite', skill: 'identify', src: 'wind', quote: 'Gases move from high-pressure areas to low-pressure areas.',
    explanation: ['Wind is moving air. Moving air can lift a kite and sway the trees.', 'বাতাস চলাচলই হলো হাওয়া। চলমান বাতাস ঘুড়ি ওড়াতে আর গাছ দোলাতে পারে।'],
    primary: {
      prompt: ['What makes a kite fly up high?', 'ঘুড়ি উঁচুতে ওড়ে কীসের জন্য?'],
      answer: a('Wind', 'বাতাস', 'kite'),
      distractors: [
        d('Rain', 'বৃষ্টি', 'Rain makes a kite wet and heavy; wind lifts it.', 'বৃষ্টি ঘুড়ি ভিজিয়ে ভারী করে; বাতাস তাকে ওড়ায়।', 'rain'),
        d('Snow', 'তুষার', 'Snow does not push a kite up; moving air does.', 'তুষার ঘুড়ি ওপরে ঠেলে না; চলমান বাতাস ঠেলে।', 'snowflake'),
      ],
    },
    ret: {
      prompt: ['The trees are swaying. What is moving them?', 'গাছগুলো দুলছে। কী তাদের দোলাচ্ছে?'],
      answer: a('Moving air: wind', 'চলমান বাতাস: হাওয়া', 'wind'),
      distractors: [
        d('Sunshine', 'রোদ', 'Sunshine warms trees but does not push them.', 'রোদ গাছ গরম করে, কিন্তু ঠেলে না।', 'sun'),
        d('A rainbow', 'রংধনু', 'Rainbows are light; they cannot push trees.', 'রংধনু আলো; এটা গাছ ঠেলতে পারে না।', 'rainbow'),
      ],
    },
  }),
  ...objective(B46, {
    slug: 'thunder-from-lightning', skill: 'cause-effect', src: 'thunder', quote: 'Thunder is created when lightning passes through the air.',
    explanation: ['Lightning makes the loud boom we call thunder.', 'বিদ্যুৎ চমকানো থেকেই বজ্রপাতের জোরালো গুড়ুম শব্দ হয়।'],
    primary: {
      prompt: ['What makes the loud boom of thunder?', 'বজ্রের জোরালো গুড়ুম শব্দ কী থেকে হয়?'],
      answer: a('Lightning', 'বিদ্যুৎ চমকানো', 'lightning'),
      distractors: [
        d('Rain on the roof', 'ছাদে বৃষ্টি', 'Rain pitter-patters; thunder comes from lightning.', 'বৃষ্টি টুপটাপ করে; বজ্রধ্বনি আসে বিদ্যুৎ চমকানো থেকে।', 'rain'),
        d('Clouds bumping together', 'মেঘে মেঘে ধাক্কা', 'Thunder is made by lightning, not by clouds hitting.', 'বজ্রধ্বনি তৈরি হয় বিদ্যুৎ চমকানো থেকে, মেঘের ধাক্কায় নয়।', 'cloud'),
      ],
    },
    ret: {
      prompt: ['You see a bright flash in a storm. What sound comes next?', 'ঝড়ে উজ্জ্বল ঝলক দেখলে। এরপর কোন শব্দ আসবে?'],
      answer: a('Thunder', 'বজ্রধ্বনি', 'thunder'),
      distractors: [
        d('Birdsong', 'পাখির গান', 'A lightning flash is followed by thunder.', 'বিদ্যুৎ চমকানোর পরে আসে বজ্রধ্বনি।', 'bird'),
        d('Nothing at all', 'কোনো শব্দ নেই', 'Lightning always makes thunder.', 'বিদ্যুৎ চমকালে বজ্রধ্বনি হয়।', 'no-sound'),
      ],
    },
  }),
  ...objective(B46, {
    slug: 'fog-cloud-ground', skill: 'identify', src: 'fog', quote: 'Fog can also be described as a cloud forming at ground level.',
    explanation: ['Fog is a cloud down near the ground.', 'কুয়াশা হলো মাটির কাছাকাছি নেমে আসা মেঘ।'],
    primary: {
      prompt: ['What is fog?', 'কুয়াশা কী?'],
      answer: a('A cloud near the ground', 'মাটির কাছের মেঘ', 'fog'),
      distractors: [
        d('Smoke', 'ধোঁয়া', 'Fog is made of tiny water drops, not smoke.', 'কুয়াশা হলো ছোট পানির ফোঁটা, ধোঁয়া নয়।', 'smoke'),
        d('Snow', 'তুষার', 'Fog is a cloud of water drops near the ground.', 'কুয়াশা মাটির কাছে পানির ফোঁটার মেঘ।', 'snowflake'),
      ],
    },
    ret: {
      prompt: ['On a foggy morning, you are walking inside a…', 'কুয়াশার সকালে তুমি হাঁটছ একটা…'],
      answer: a('Cloud', 'মেঘের ভেতরে', 'fog'),
      distractors: [
        d('Rainbow', 'রংধনুর ভেতরে', 'Fog is a cloud at ground level.', 'কুয়াশা হলো মাটির কাছের মেঘ।', 'rainbow'),
        d('Snowman', 'বরফের মানুষের ভেতরে', 'Fog is made of water drops, like a cloud.', 'কুয়াশা মেঘের মতোই পানির ফোঁটা দিয়ে তৈরি।', 'snowman'),
      ],
    },
  }),
  quickCheck(B46, {
    slug: 'puddle-dries', skill: 'cause-effect', src: 'waterCycle', quote: 'The sun is what makes the water cycle work.',
    explanation: ['The Sun warms the puddle and the water goes up into the air.', 'সূর্য জমে থাকা পানি গরম করে, আর পানি বাতাসে উঠে যায়।'],
    prompt: ['The Sun shines on a puddle. Where does the water go?', 'জমে থাকা পানিতে রোদ পড়ছে। পানি কোথায় যায়?'],
    answer: a('Up into the air', 'ওপরে বাতাসে', 'sun'),
    distractors: [
      d('Into a snowman', 'বরফের মানুষে', 'The Sun warms water so it rises into the air.', 'সূর্য পানি গরম করে, তাই তা বাতাসে উঠে যায়।', 'snowman'),
      d('It stays forever', 'চিরকাল থেকে যায়', 'Puddles dry up in the sunshine.', 'রোদে জমা পানি শুকিয়ে যায়।', 'drops'),
    ],
  }),
  quickCheck(B46, {
    slug: 'flash-then', skill: 'predict', src: 'thunder', quote: 'Thunder is created when lightning passes through the air.',
    explanation: ['Lightning comes first, then the thunder.', 'আগে বিদ্যুৎ চমকায়, পরে বজ্রধ্বনি।'],
    prompt: ['Lightning flashes. What will you hear?', 'বিদ্যুৎ চমকাল। কী শুনবে?'],
    answer: a('Thunder', 'বজ্রধ্বনি', 'thunder'),
    distractors: [
      d('A rainbow', 'রংধনু', 'Rainbows make no sound; lightning makes thunder.', 'রংধনুর শব্দ নেই; বিদ্যুৎ চমকালে বজ্রধ্বনি হয়।', 'rainbow'),
      d('Snow', 'তুষার', 'Lightning makes thunder.', 'বিদ্যুৎ চমকানো থেকে বজ্রধ্বনি হয়।', 'snowflake'),
    ],
  }),
]

const ages7to8 = [
  ...objective(B78, {
    slug: 'sun-evaporates-water', skill: 'cause-effect', src: 'waterCycle', quote: 'Evaporation changes liquid and frozen water into water-vapor gas, which then floats up into the skies to become clouds.',
    explanation: ['The Sun’s heat turns liquid water into water vapour. This is called evaporation.', 'সূর্যের তাপ তরল পানিকে জলীয় বাষ্পে পরিণত করে। একে বলে বাষ্পীভবন।'],
    primary: {
      prompt: ['What turns puddle water into water vapour?', 'জমে থাকা পানিকে জলীয় বাষ্পে পরিণত করে কী?'],
      answer: a('The Sun’s heat', 'সূর্যের তাপ'),
      distractors: [
        d('The Moon', 'চাঁদ', 'Heat from the Sun drives evaporation.', 'সূর্যের তাপেই বাষ্পীভবন হয়।'),
        d('Cold wind only', 'শুধু ঠান্ডা বাতাস', 'Heat makes water evaporate; cooling turns vapour back to drops.', 'তাপ পানিকে বাষ্প করে; ঠান্ডা হলে বাষ্প আবার ফোঁটা হয়।'),
      ],
    },
    ret: {
      prompt: ['Wet clothes dried in sunshine. Where did the water go?', 'রোদে ভেজা কাপড় শুকাল। পানি কোথায় গেল?'],
      answer: a('It evaporated into the air', 'বাষ্প হয়ে বাতাসে মিশে গেল'),
      distractors: [
        d('It soaked into the rope', 'দড়িতে শুষে গেল', 'The water became vapour and went into the air.', 'পানি বাষ্প হয়ে বাতাসে চলে গেল।'),
        d('It turned into cloth', 'কাপড়ে পরিণত হলো', 'Water cannot become cloth; it evaporated.', 'পানি কাপড় হতে পারে না; বাষ্প হয়ে গেছে।'),
      ],
    },
  }),
  ...objective(B78, {
    slug: 'vapour-invisible', skill: 'identify', src: 'waterCycle', quote: 'All air contains water molecules in the form of water vapor, which is an invisible gas.',
    explanation: ['Water vapour is water as an invisible gas. All air has some in it.', 'জলীয় বাষ্প হলো পানির অদৃশ্য গ্যাস রূপ। সব বাতাসেই কিছু থাকে।'],
    primary: {
      prompt: ['What is water vapour?', 'জলীয় বাষ্প কী?'],
      answer: a('Water as an invisible gas', 'পানির অদৃশ্য গ্যাস রূপ'),
      distractors: [
        d('White smoke', 'সাদা ধোঁয়া', 'Water vapour is invisible.', 'জলীয় বাষ্প অদৃশ্য।'),
        d('Tiny bits of ice', 'ছোট ছোট বরফকণা', 'Vapour is a gas, not solid ice.', 'বাষ্প গ্যাস, কঠিন বরফ নয়।'),
      ],
    },
    ret: {
      prompt: ['Is there water in the air around you right now?', 'এখন তোমার চারপাশের বাতাসে কি পানি আছে?'],
      answer: a('Yes, as invisible water vapour', 'হ্যাঁ, অদৃশ্য জলীয় বাষ্প হিসেবে'),
      distractors: [
        d('No, only when it rains', 'না, শুধু বৃষ্টির সময়', 'All air contains some water vapour.', 'সব বাতাসেই কিছু জলীয় বাষ্প থাকে।'),
        d('Only near the sea', 'শুধু সমুদ্রের কাছে', 'Air everywhere contains water vapour.', 'সব জায়গার বাতাসেই জলীয় বাষ্প আছে।'),
      ],
    },
  }),
  ...objective(B78, {
    slug: 'vapour-cools-cloud', skill: 'cause-effect', src: 'cloudBottle', quote: 'Water vapor in the atmosphere cools and condenses on particles in the air, creating a cloud.',
    explanation: ['When water vapour cools high up, it condenses into tiny drops that make a cloud.', 'ওপরে জলীয় বাষ্প ঠান্ডা হলে ঘনীভূত হয়ে ছোট ফোঁটা হয়, যা দিয়ে মেঘ তৈরি হয়।'],
    primary: {
      prompt: ['Water vapour rises and cools. What forms?', 'জলীয় বাষ্প ওপরে উঠে ঠান্ডা হলো। কী তৈরি হয়?'],
      answer: a('A cloud of tiny drops', 'ছোট ফোঁটার মেঘ'),
      distractors: [
        d('More invisible vapour', 'আরও অদৃশ্য বাষ্প', 'Cooling turns vapour into liquid drops.', 'ঠান্ডা হলে বাষ্প তরল ফোঁটায় পরিণত হয়।'),
        d('A rainbow', 'রংধনু', 'Rainbows need sunlight on drops; cooling vapour makes clouds.', 'রংধনুর জন্য ফোঁটায় রোদ লাগে; বাষ্প ঠান্ডা হলে মেঘ হয়।'),
      ],
    },
    ret: {
      prompt: ['On hot days, why do cold glasses get wet outside?', 'গরমের দিনে ঠান্ডা গ্লাসের বাইরে পানি জমে কেন?'],
      answer: a('Vapour in the air cools and condenses', 'বাতাসের বাষ্প ঠান্ডা হয়ে ঘনীভূত হয়'),
      distractors: [
        d('Water leaks through the glass', 'গ্লাস দিয়ে পানি চুঁইয়ে বের হয়', 'Glass does not leak; the water comes from the air.', 'গ্লাস চুঁইয়ে পানি বের হয় না; পানি আসে বাতাস থেকে।'),
        d('The glass is melting', 'গ্লাস গলে যাচ্ছে', 'The drops are water from cooled vapour.', 'ফোঁটাগুলো ঠান্ডা হওয়া বাষ্পের পানি।'),
      ],
    },
  }),
  ...objective(B78, {
    slug: 'precipitation', skill: 'identify', src: 'clouds', quote: 'When the air is colder, the water may form snowflakes instead.',
    explanation: ['Water falling from clouds is called precipitation. It can be rain or, in colder air, snow.', 'মেঘ থেকে পানি পড়াকে বলে বৃষ্টিপাত। এটা বৃষ্টি হতে পারে, আর বেশি ঠান্ডায় তুষার।'],
    primary: {
      prompt: ['Rain and snow falling from clouds are called…', 'মেঘ থেকে পড়া বৃষ্টি আর তুষারকে বলে…'],
      answer: a('Precipitation', 'বৃষ্টিপাত (অধঃক্ষেপণ)'),
      distractors: [
        d('Evaporation', 'বাষ্পীভবন', 'Evaporation is water rising as vapour.', 'বাষ্পীভবন হলো পানির বাষ্প হয়ে ওপরে ওঠা।'),
        d('Condensation', 'ঘনীভবন', 'Condensation makes cloud drops; falling water is precipitation.', 'ঘনীভবনে মেঘের ফোঁটা হয়; পড়ন্ত পানি হলো বৃষ্টিপাত।'),
      ],
    },
    ret: {
      prompt: ['Which of these is precipitation?', 'এর মধ্যে কোনটি বৃষ্টিপাত?'],
      answer: a('Snow falling from a cloud', 'মেঘ থেকে তুষার পড়া'),
      distractors: [
        d('Steam rising from tea', 'চা থেকে ধোঁয়া ওঠা', 'Rising steam is evaporation, not falling water.', 'ওঠা বাষ্প হলো বাষ্পীভবন, পড়ন্ত পানি নয়।'),
        d('A puddle drying up', 'জমা পানি শুকানো', 'Drying is evaporation.', 'শুকানো হলো বাষ্পীভবন।'),
      ],
    },
  }),
  ...objective(B78, {
    slug: 'uneven-heating-wind', skill: 'cause-effect', src: 'wind', quote: 'The sun warms up the air, but it does so unevenly.',
    explanation: ['The Sun warms some places more than others. Air moves between them, and that moving air is wind.', 'সূর্য কিছু জায়গা বেশি গরম করে, কিছু কম। এদের মধ্যে বাতাস চলাচল করে, সেটাই হাওয়া।'],
    primary: {
      prompt: ['What starts the wind blowing?', 'হাওয়া বইতে শুরু করে কী থেকে?'],
      answer: a('The Sun warming air unevenly', 'সূর্য বাতাসকে অসমানভাবে গরম করে'),
      distractors: [
        d('Trees waving their branches', 'গাছ ডাল নাড়ায়', 'Trees move because of wind, not the other way round.', 'হাওয়ার কারণে গাছ নড়ে, উল্টোটা নয়।'),
        d('Clouds blowing on us', 'মেঘ আমাদের দিকে ফুঁ দেয়', 'Clouds are water drops; wind is air moving between warm and cool places.', 'মেঘ পানির ফোঁটা; হাওয়া হলো গরম আর ঠান্ডা জায়গার মধ্যে বাতাসের চলাচল।'),
      ],
    },
    ret: {
      prompt: ['Sun warms one place more. What does the air do?', 'সূর্য এক জায়গা বেশি গরম করল। বাতাস কী করে?'],
      answer: a('It starts to move: wind', 'বাতাস চলতে শুরু করে: হাওয়া'),
      distractors: [
        d('It stays perfectly still', 'একদম স্থির থাকে', 'Uneven warming makes air move.', 'অসমান উষ্ণতা বাতাসকে নাড়ায়।'),
        d('It turns into water', 'পানিতে পরিণত হয়', 'Warming makes air move, not turn into water.', 'গরম হলে বাতাস চলে, পানি হয় না।'),
      ],
    },
  }),
  ...objective(B78, {
    slug: 'see-then-hear', skill: 'compare', src: 'thunder', quote: 'it takes the sound of thunder about 5 seconds to travel a mile',
    explanation: ['You see lightning almost at once, but thunder’s sound travels slowly, so it arrives later.', 'বিদ্যুৎ চমকানো প্রায় সাথে সাথে দেখা যায়, কিন্তু বজ্রের শব্দ ধীরে চলে, তাই পরে পৌঁছায়।'],
    primary: {
      prompt: ['Why do we see lightning before we hear thunder?', 'আমরা বজ্রধ্বনি শোনার আগে বিদ্যুৎ চমকানো দেখি কেন?'],
      answer: a('Sound travels slower than light', 'শব্দ আলোর চেয়ে ধীরে চলে'),
      distractors: [
        d('Thunder happens later', 'বজ্রধ্বনি পরে তৈরি হয়', 'Both happen together; the sound just takes longer to arrive.', 'দুটো একসাথে হয়; শুধু শব্দ পৌঁছাতে বেশি সময় নেয়।'),
        d('Our ears are slow', 'আমাদের কান ধীর', 'Our ears are fine; sound itself travels slowly.', 'আমাদের কান ঠিক আছে; শব্দই ধীরে চলে।'),
      ],
    },
    ret: {
      prompt: ['Which reaches you first from a storm far away?', 'দূরের ঝড় থেকে কোনটা আগে তোমার কাছে পৌঁছায়?'],
      answer: a('The flash of light', 'আলোর ঝলক'),
      distractors: [
        d('The boom of thunder', 'বজ্রের গুড়ুম শব্দ', 'Sound is slower, so thunder arrives later.', 'শব্দ ধীর, তাই বজ্রধ্বনি পরে আসে।'),
        d('Both at the same moment', 'দুটো একই মুহূর্তে', 'Light arrives almost at once; sound takes longer.', 'আলো প্রায় সাথে সাথে আসে; শব্দ সময় নেয়।'),
      ],
    },
  }),
  ...objective(B78, {
    slug: 'fog-is-cloud', skill: 'identify', src: 'fog', quote: 'Fog can also be described as a cloud forming at ground level.',
    explanation: ['Fog is a cloud that forms at ground level, made of tiny water droplets.', 'কুয়াশা হলো মাটির কাছে তৈরি মেঘ, ছোট ছোট পানির ফোঁটা দিয়ে গড়া।'],
    primary: {
      prompt: ['Fog is really a kind of…', 'কুয়াশা আসলে এক ধরনের…'],
      answer: a('Cloud at ground level', 'মাটির কাছের মেঘ'),
      distractors: [
        d('Smoke from fires', 'আগুনের ধোঁয়া', 'Fog is water droplets, not smoke.', 'কুয়াশা পানির ফোঁটা, ধোঁয়া নয়।'),
        d('Falling rain', 'পড়ন্ত বৃষ্টি', 'Fog droplets are smaller than raindrops and float.', 'কুয়াশার ফোঁটা বৃষ্টির ফোঁটার চেয়ে ছোট এবং ভেসে থাকে।'),
      ],
    },
    ret: {
      prompt: ['Are fog droplets bigger or smaller than raindrops?', 'কুয়াশার ফোঁটা বৃষ্টির ফোঁটার চেয়ে বড় না ছোট?'],
      answer: a('Smaller', 'ছোট'),
      distractors: [
        d('Bigger', 'বড়', 'Fog droplets are smaller than raindrops.', 'কুয়াশার ফোঁটা বৃষ্টির ফোঁটার চেয়ে ছোট।'),
        d('Fog has no droplets', 'কুয়াশায় কোনো ফোঁটা নেই', 'Fog is made of water droplets.', 'কুয়াশা পানির ফোঁটা দিয়ে তৈরি।'),
      ],
    },
  }),
  ...objective(B78, {
    slug: 'cold-air-snow', skill: 'predict', src: 'clouds', quote: 'When the air is colder, the water may form snowflakes instead.',
    explanation: ['In colder air, the water in clouds may form snowflakes instead of raindrops.', 'বেশি ঠান্ডা বাতাসে মেঘের পানি বৃষ্টির ফোঁটার বদলে তুষারকণা হতে পারে।'],
    primary: {
      prompt: ['Tomorrow will be freezing cold. Predict what may fall.', 'আগামীকাল জমাট ঠান্ডা পড়বে। অনুমান করো কী পড়তে পারে।'],
      answer: a('Snow', 'তুষার'),
      distractors: [
        d('Warm rain only', 'শুধু গরম বৃষ্টি', 'Colder air can turn cloud water into snowflakes.', 'বেশি ঠান্ডা বাতাসে মেঘের পানি তুষার হতে পারে।'),
        d('Nothing ever falls in cold', 'ঠান্ডায় কিছুই পড়ে না', 'Cold clouds can still drop snow.', 'ঠান্ডা মেঘ থেকেও তুষার পড়ে।'),
      ],
    },
    ret: {
      prompt: ['Rain turns into snow as the evening gets colder. Why?', 'সন্ধ্যা ঠান্ডা হতেই বৃষ্টি তুষার হয়ে গেল। কেন?'],
      answer: a('Colder air makes snowflakes form', 'ঠান্ডা বাতাসে তুষারকণা তৈরি হয়'),
      distractors: [
        d('The clouds ran out of rain', 'মেঘের বৃষ্টি শেষ হয়ে গেছে', 'The water is still there; cold makes it snow.', 'পানি এখনো আছে; ঠান্ডায় তা তুষার হয়।'),
        d('The wind made it white', 'বাতাস তা সাদা করেছে', 'Temperature, not wind colour, changes rain to snow.', 'তাপমাত্রাই বৃষ্টিকে তুষার করে, বাতাস নয়।'),
      ],
    },
  }),
  quickCheck(B78, {
    slug: 'sun-drives-cycle', skill: 'identify', src: 'waterCycle', quote: 'The sun is what makes the water cycle work.',
    explanation: ['The Sun powers the water cycle by heating water so it evaporates.', 'সূর্য পানি গরম করে বাষ্প বানায়, এভাবেই পানিচক্র চালায়।'],
    prompt: ['What makes the water cycle work?', 'পানিচক্র কে চালায়?'],
    answer: a('The Sun', 'সূর্য'),
    distractors: [
      d('The Moon', 'চাঁদ', 'The Sun’s heat drives the water cycle.', 'সূর্যের তাপ পানিচক্র চালায়।'),
      d('The wind alone', 'শুধু বাতাস', 'Wind moves clouds, but the Sun powers the cycle.', 'বাতাস মেঘ সরায়, কিন্তু চক্র চালায় সূর্য।'),
    ],
  }),
  quickCheck(B78, {
    slug: 'runoff', skill: 'identify', src: 'waterCycle', quote: 'Runoff is nothing more than water "running off" the land surface.',
    explanation: ['Runoff is rainwater running off the land into streams and rivers.', 'রানঅফ হলো বৃষ্টির পানি মাটির ওপর দিয়ে গড়িয়ে নালা-নদীতে যাওয়া।'],
    prompt: ['Rainwater flowing over the ground is called…', 'মাটির ওপর দিয়ে গড়িয়ে যাওয়া বৃষ্টির পানিকে বলে…'],
    answer: a('Runoff', 'রানঅফ (গড়িয়ে যাওয়া পানি)'),
    distractors: [
      d('Evaporation', 'বাষ্পীভবন', 'Evaporation sends water up as vapour.', 'বাষ্পীভবনে পানি বাষ্প হয়ে ওপরে যায়।'),
      d('Fog', 'কুয়াশা', 'Fog is a cloud at ground level.', 'কুয়াশা হলো মাটির কাছের মেঘ।'),
    ],
  }),
  quickCheck(B78, {
    slug: 'clouds-float', skill: 'cause-effect', src: 'clouds', quote: 'The droplets are so light they float in the air.',
    explanation: ['Cloud droplets are so light that they float in the air.', 'মেঘের ফোঁটাগুলো এত হালকা যে বাতাসে ভেসে থাকে।'],
    prompt: ['Why can clouds float?', 'মেঘ ভেসে থাকতে পারে কেন?'],
    answer: a('Their droplets are very light', 'এদের ফোঁটাগুলো খুব হালকা'),
    distractors: [
      d('They are tied to the sky', 'আকাশে বাঁধা থাকে', 'Nothing holds them; the drops are just very light.', 'কিছুই ধরে রাখে না; ফোঁটাগুলো শুধু খুব হালকা।'),
      d('They are full of air bubbles like balloons', 'বেলুনের মতো বাতাসে ভরা', 'Clouds are tiny drops, light enough to float.', 'মেঘ হলো ছোট ফোঁটা, ভেসে থাকার মতো হালকা।'),
    ],
  }),
]

const ages9to10 = [
  ...objective(B910, {
    slug: 'evaporation-energy', skill: 'cause-effect', src: 'waterCycle', quote: "The sun's energy breaks the bonds that hold liquid water's molecules together and turns them into water vapor gas.",
    explanation: ['The Sun’s energy breaks the bonds holding liquid water’s molecules together, turning them into water vapour.', 'সূর্যের শক্তি তরল পানির অণুগুলোর বন্ধন ভেঙে দেয় এবং সেগুলোকে জলীয় বাষ্পে পরিণত করে।'],
    primary: {
      prompt: ['During evaporation, what does the Sun’s energy do to liquid water’s molecules?', 'বাষ্পীভবনের সময় সূর্যের শক্তি তরল পানির অণুগুলোর কী করে?'],
      answer: a('Breaks the bonds holding them together', 'তাদের ধরে রাখা বন্ধন ভেঙে দেয়'),
      distractors: [
        d('Squeezes them into ice', 'চেপে বরফ বানায়', 'Energy from the Sun frees molecules into vapour, not ice.', 'সূর্যের শক্তি অণুগুলোকে বাষ্পে মুক্ত করে, বরফে নয়।'),
        d('Turns them into salt', 'লবণে পরিণত করে', 'Water molecules stay water; they become a gas.', 'পানির অণু পানিই থাকে; শুধু গ্যাস হয়।'),
      ],
    },
    ret: {
      prompt: ['Two identical bowls of water: one in the sun, one in the shade. Which empties faster, and why?', 'দুটো একই রকম পানির বাটি: একটা রোদে, একটা ছায়ায়। কোনটা দ্রুত খালি হবে, কেন?'],
      answer: a('The sunny one: more energy for evaporation', 'রোদেরটা: বাষ্পীভবনের জন্য বেশি শক্তি'),
      distractors: [
        d('The shady one: cool water escapes faster', 'ছায়ারটা: ঠান্ডা পানি দ্রুত বের হয়', 'Evaporation needs energy, which the Sun supplies.', 'বাষ্পীভবনে শক্তি লাগে, যা সূর্য দেয়।'),
        d('Both the same: sunlight has no effect', 'দুটো সমান: রোদের প্রভাব নেই', 'The Sun’s energy is what drives evaporation.', 'সূর্যের শক্তিই বাষ্পীভবন চালায়।'),
      ],
    },
  }),
  ...objective(B910, {
    slug: 'condense-on-particles', skill: 'cause-effect', src: 'cloudBottle', quote: 'Water vapor in the atmosphere cools and condenses on particles in the air, creating a cloud.',
    explanation: ['Cloud droplets form when water vapour cools and condenses on tiny particles in the air.', 'জলীয় বাষ্প ঠান্ডা হয়ে বাতাসের ছোট কণার ওপর ঘনীভূত হলে মেঘের ফোঁটা তৈরি হয়।'],
    primary: {
      prompt: ['Cloud droplets form when cooling water vapour condenses onto what?', 'ঠান্ডা হতে থাকা জলীয় বাষ্প কীসের ওপর ঘনীভূত হয়ে মেঘের ফোঁটা তৈরি করে?'],
      answer: a('Tiny particles in the air', 'বাতাসের ছোট ছোট কণা'),
      distractors: [
        d('Nothing: drops appear from empty air', 'কিছুর ওপর না: খালি বাতাসে ফোঁটা হয়', 'Vapour condenses on particles in the air.', 'বাষ্প বাতাসের কণার ওপর ঘনীভূত হয়।'),
        d('Birds flying past', 'উড়ে যাওয়া পাখি', 'The surfaces are tiny particles, not birds.', 'তলগুলো হলো ছোট কণা, পাখি নয়।'),
      ],
    },
    ret: {
      prompt: ['In the cloud-in-a-bottle experiment, a little smoke is added. What does the smoke provide?', 'বোতলে মেঘ বানানোর পরীক্ষায় একটু ধোঁয়া দেওয়া হয়। ধোঁয়া কী জোগায়?'],
      answer: a('Particles for vapour to condense on', 'বাষ্প ঘনীভূত হওয়ার কণা'),
      distractors: [
        d('Extra heat to make rain', 'বৃষ্টির জন্য বাড়তি তাপ', 'Cooling, not heat, makes vapour condense.', 'তাপ নয়, ঠান্ডা হলে বাষ্প ঘনীভূত হয়।'),
        d('A grey colour only', 'শুধু ধূসর রং', 'The smoke particles give vapour a surface to condense on.', 'ধোঁয়ার কণা বাষ্পকে ঘনীভূত হওয়ার তল দেয়।'),
      ],
    },
  }),
  ...objective(B910, {
    slug: 'gravity-precipitation', skill: 'cause-effect', src: 'clouds', quote: 'When that happens, gravity causes them to fall to Earth.',
    explanation: ['When cloud drops grow heavy, gravity pulls them down as precipitation.', 'মেঘের ফোঁটা ভারী হলে মাধ্যাকর্ষণ তাদের বৃষ্টিপাত হিসেবে নিচে টানে।'],
    primary: {
      prompt: ['Cloud droplets grow until they are heavy. Which force brings them down as rain?', 'মেঘের ফোঁটা বড় হয়ে ভারী হয়। কোন বল তাদের বৃষ্টি হিসেবে নামায়?'],
      answer: a('Gravity', 'মাধ্যাকর্ষণ'),
      distractors: [
        d('Wind pushing down', 'নিচের দিকে বাতাসের ধাক্কা', 'Wind blows drops sideways; gravity pulls them down.', 'বাতাস ফোঁটাকে পাশে সরায়; মাধ্যাকর্ষণ নিচে টানে।'),
        d('Magnetism', 'চুম্বকত্ব', 'Water drops are not pulled by magnets; gravity pulls them.', 'পানির ফোঁটাকে চুম্বক টানে না; মাধ্যাকর্ষণ টানে।'),
      ],
    },
    ret: {
      prompt: ['Tiny cloud droplets float, but big raindrops fall. What changed?', 'ছোট মেঘের ফোঁটা ভাসে, কিন্তু বড় বৃষ্টির ফোঁটা পড়ে। কী বদলাল?'],
      answer: a('They became heavy enough for gravity to pull them down', 'এত ভারী হলো যে মাধ্যাকর্ষণ নিচে টানল'),
      distractors: [
        d('Gravity switched on', 'মাধ্যাকর্ষণ চালু হলো', 'Gravity always acts; tiny drops are just light enough to float.', 'মাধ্যাকর্ষণ সবসময় কাজ করে; ছোট ফোঁটা শুধু ভাসার মতো হালকা।'),
        d('The cloud got warmer and let go', 'মেঘ গরম হয়ে ছেড়ে দিল', 'The drops grew heavy; gravity did the rest.', 'ফোঁটা ভারী হলো; বাকিটা মাধ্যাকর্ষণের কাজ।'),
      ],
    },
  }),
  ...objective(B910, {
    slug: 'warm-air-rises', skill: 'cause-effect', src: 'wind', quote: 'When gases warm up, the atoms and molecules move faster, spread out, and rise.',
    explanation: ['Warmed air’s molecules move faster, spread out and rise, leaving lower pressure behind; air flows in, making wind.', 'গরম বাতাসের অণু দ্রুত চলে, ছড়িয়ে পড়ে আর ওপরে ওঠে; পেছনে কম চাপ থাকে, অন্য বাতাস ছুটে আসে, তৈরি হয় হাওয়া।'],
    primary: {
      prompt: ['When air is warmed by the Sun, what do its molecules do?', 'সূর্য বাতাস গরম করলে তার অণুগুলো কী করে?'],
      answer: a('Move faster, spread out and rise', 'দ্রুত চলে, ছড়িয়ে পড়ে ও ওপরে ওঠে'),
      distractors: [
        d('Slow down and sink', 'ধীর হয়ে নিচে নামে', 'Warming speeds molecules up; they rise.', 'গরম হলে অণু দ্রুত হয়; ওপরে ওঠে।'),
        d('Turn into water', 'পানি হয়ে যায়', 'Air stays gas when warmed; it rises.', 'গরম হলেও বাতাস গ্যাস থাকে; ওপরে ওঠে।'),
      ],
    },
    ret: {
      prompt: ['A hot-air balloon rises. Which wind fact does it show?', 'গরম বাতাসের বেলুন ওপরে ওঠে। এটা হাওয়ার কোন তথ্য দেখায়?'],
      answer: a('Warm air rises', 'গরম বাতাস ওপরে ওঠে'),
      distractors: [
        d('Cold air rises', 'ঠান্ডা বাতাস ওপরে ওঠে', 'Warm air rises; that is why heating the balloon lifts it.', 'গরম বাতাস ওপরে ওঠে; তাই বেলুন গরম করলে ওঠে।'),
        d('Air has no weight', 'বাতাসের কোনো ওজন নেই', 'Warm air spreads out and rises above cooler air.', 'গরম বাতাস ছড়িয়ে ঠান্ডা বাতাসের ওপরে ওঠে।'),
      ],
    },
  }),
  ...objective(B910, {
    slug: 'pressure-difference-speed', skill: 'predict', src: 'wind', quote: 'the bigger the difference between the pressures, the faster the air will move from the high to the low pressure.',
    explanation: ['Air moves from high to low pressure, and the bigger the difference, the faster it moves.', 'বাতাস উচ্চচাপ থেকে নিম্নচাপের দিকে যায়; পার্থক্য যত বেশি, গতি তত বেশি।'],
    primary: {
      prompt: ['Two places have a big pressure difference today and a small one tomorrow. When is the wind stronger?', 'আজ দুই জায়গার চাপের পার্থক্য বেশি, কাল কম। কবে হাওয়া বেশি জোরালো?'],
      answer: a('Today, with the bigger difference', 'আজ, পার্থক্য বেশি বলে'),
      distractors: [
        d('Tomorrow, with the smaller difference', 'কাল, পার্থক্য কম বলে', 'A bigger difference makes faster air.', 'পার্থক্য বেশি হলে বাতাস দ্রুত চলে।'),
        d('The same both days', 'দুদিনই সমান', 'Wind speed depends on the pressure difference.', 'হাওয়ার গতি চাপের পার্থক্যের ওপর নির্ভর করে।'),
      ],
    },
    ret: {
      prompt: ['Which way does air flow between high and low pressure?', 'উচ্চচাপ আর নিম্নচাপের মধ্যে বাতাস কোন দিকে যায়?'],
      answer: a('From high pressure to low pressure', 'উচ্চচাপ থেকে নিম্নচাপের দিকে'),
      distractors: [
        d('From low pressure to high pressure', 'নিম্নচাপ থেকে উচ্চচাপের দিকে', 'Gases move from high to low pressure.', 'গ্যাস উচ্চচাপ থেকে নিম্নচাপে যায়।'),
        d('It does not flow at all', 'একদমই চলে না', 'A pressure difference makes air move.', 'চাপের পার্থক্য বাতাসকে চালায়।'),
      ],
    },
  }),
  ...objective(B910, {
    slug: 'count-to-thunder', skill: 'apply', src: 'thunder', quote: 'it takes the sound of thunder about 5 seconds to travel a mile',
    explanation: ['Thunder’s sound travels about a mile every 5 seconds, so 10 seconds means about 2 miles away.', 'বজ্রের শব্দ প্রায় প্রতি ৫ সেকেন্ডে ১ মাইল যায়, তাই ১০ সেকেন্ড মানে প্রায় ২ মাইল দূরে।'],
    primary: {
      prompt: ['You see lightning and count 10 seconds until thunder. About how far away was it?', 'বিদ্যুৎ চমকানোর পর বজ্রধ্বনি পর্যন্ত ১০ সেকেন্ড গুনলে। মোটামুটি কত দূরে?'],
      answer: a('About 2 miles', 'প্রায় ২ মাইল'),
      distractors: [
        d('About 10 miles', 'প্রায় ১০ মাইল', 'Sound covers about a mile every 5 seconds: 10 ÷ 5 = 2.', 'শব্দ প্রায় প্রতি ৫ সেকেন্ডে ১ মাইল যায়: ১০ ÷ ৫ = ২।'),
        d('Right overhead', 'ঠিক মাথার ওপরে', 'A 10-second gap means it was some distance away.', '১০ সেকেন্ডের ফারাক মানে কিছুটা দূরে ছিল।'),
      ],
    },
    ret: {
      prompt: ['Thunder arrives 15 seconds after the flash. Roughly how many miles away is the storm?', 'ঝলকের ১৫ সেকেন্ড পরে বজ্রধ্বনি এল। ঝড় মোটামুটি কত মাইল দূরে?'],
      answer: a('About 3 miles', 'প্রায় ৩ মাইল'),
      distractors: [
        d('About 15 miles', 'প্রায় ১৫ মাইল', 'Divide the seconds by 5: 15 ÷ 5 = 3.', 'সেকেন্ডকে ৫ দিয়ে ভাগ করো: ১৫ ÷ ৫ = ৩।'),
        d('About 1 mile', 'প্রায় ১ মাইল', 'One mile takes about 5 seconds; 15 seconds is about 3 miles.', '১ মাইল যেতে প্রায় ৫ সেকেন্ড লাগে; ১৫ সেকেন্ড মানে প্রায় ৩ মাইল।'),
      ],
    },
  }),
  ...objective(B910, {
    slug: 'thunder-air-expands', skill: 'cause-effect', src: 'thunder', quote: 'The lightning discharge heats the air rapidly and causes it to expand.',
    explanation: ['Lightning heats the air very quickly; the air expands suddenly, which we hear as thunder.', 'বিদ্যুৎ চমকানো বাতাসকে খুব দ্রুত গরম করে; বাতাস হঠাৎ প্রসারিত হয়, সেটাই আমরা বজ্রধ্বনি হিসেবে শুনি।'],
    primary: {
      prompt: ['How does lightning produce the sound of thunder?', 'বিদ্যুৎ চমকানো কীভাবে বজ্রধ্বনি তৈরি করে?'],
      answer: a('It heats the air so fast that the air expands', 'বাতাসকে এত দ্রুত গরম করে যে বাতাস প্রসারিত হয়'),
      distractors: [
        d('Two clouds crash into each other', 'দুটো মেঘ পরস্পরকে ধাক্কা দেয়', 'Thunder comes from rapidly heated air, not colliding clouds.', 'বজ্রধ্বনি আসে দ্রুত গরম হওয়া বাতাস থেকে, মেঘের ধাক্কা থেকে নয়।'),
        d('Rain hits the ground very hard', 'বৃষ্টি জোরে মাটিতে পড়ে', 'Rain does not make thunder; heated air does.', 'বৃষ্টি বজ্রধ্বনি তৈরি করে না; গরম বাতাস করে।'),
      ],
    },
    ret: {
      prompt: ['What happens to the air right along a lightning flash?', 'বিদ্যুৎ চমকানোর ঠিক পথের বাতাসের কী হয়?'],
      answer: a('It is heated rapidly and expands', 'দ্রুত গরম হয়ে প্রসারিত হয়'),
      distractors: [
        d('It freezes into ice', 'জমে বরফ হয়', 'Lightning heats the air; it does not freeze it.', 'বিদ্যুৎ বাতাস গরম করে; জমায় না।'),
        d('Nothing happens to it', 'কিছুই হয় না', 'The air is heated so fast that it expands, making thunder.', 'বাতাস এত দ্রুত গরম হয় যে প্রসারিত হয়ে বজ্রধ্বনি হয়।'),
      ],
    },
  }),
  ...objective(B910, {
    slug: 'fog-forms', skill: 'apply', src: 'fog', quote: 'Fog often forms when warm, moist air is cooled by cold surfaces.',
    explanation: ['When warm, moist air is cooled by a cold surface, its water vapour forms droplets: fog.', 'উষ্ণ, আর্দ্র বাতাস ঠান্ডা তলের সংস্পর্শে ঠান্ডা হলে তার বাষ্প ফোঁটা হয়: কুয়াশা।'],
    primary: {
      prompt: ['Warm, moist air drifts over a cold lake on a winter night. What is likely to form?', 'শীতের রাতে উষ্ণ, আর্দ্র বাতাস ঠান্ডা হ্রদের ওপর দিয়ে যায়। কী তৈরি হওয়ার সম্ভাবনা?'],
      answer: a('Fog', 'কুয়াশা'),
      distractors: [
        d('A rainbow', 'রংধনু', 'Rainbows need sunlight; cooled moist air makes fog.', 'রংধনুর জন্য রোদ লাগে; ঠান্ডা আর্দ্র বাতাসে কুয়াশা হয়।'),
        d('A drought', 'খরা', 'Moist air being cooled adds droplets; it does not dry things.', 'আর্দ্র বাতাস ঠান্ডা হলে ফোঁটা হয়; শুকায় না।'),
      ],
    },
    ret: {
      prompt: ['Why does fog often form when warm, moist air meets a cold surface?', 'উষ্ণ, আর্দ্র বাতাস ঠান্ডা তলের সংস্পর্শে এলে প্রায়ই কুয়াশা হয় কেন?'],
      answer: a('The air cools and its vapour forms droplets', 'বাতাস ঠান্ডা হয় আর বাষ্প ফোঁটা হয়'),
      distractors: [
        d('The cold surface makes smoke', 'ঠান্ডা তল ধোঁয়া তৈরি করে', 'Fog is water droplets, not smoke.', 'কুয়াশা পানির ফোঁটা, ধোঁয়া নয়।'),
        d('The warm air turns into ice', 'উষ্ণ বাতাস বরফ হয়ে যায়', 'The vapour forms liquid droplets.', 'বাষ্প তরল ফোঁটা হয়।'),
      ],
    },
  }),
  quickCheck(B910, {
    slug: 'drying-apply', skill: 'apply', src: 'waterCycle', quote: "The sun's energy breaks the bonds that hold liquid water's molecules together and turns them into water vapor gas.",
    explanation: ['In sunshine, the Sun’s energy evaporates the water faster, so clothes dry sooner.', 'রোদে সূর্যের শক্তি পানিকে দ্রুত বাষ্প করে, তাই কাপড় তাড়াতাড়ি শুকায়।'],
    prompt: ['You must dry washing quickly. Where should you hang it, and which process are you using?', 'কাপড় তাড়াতাড়ি শুকাতে হবে। কোথায় মেলবে, আর কোন প্রক্রিয়া কাজে লাগাচ্ছ?'],
    answer: a('In the sunshine: evaporation', 'রোদে: বাষ্পীভবন'),
    distractors: [
      d('In a dark cupboard: condensation', 'অন্ধকার আলমারিতে: ঘনীভবন', 'Condensation makes things wetter; the Sun drives evaporation.', 'ঘনীভবনে জিনিস আরও ভেজে; সূর্য বাষ্পীভবন চালায়।'),
      d('In the shade: precipitation', 'ছায়ায়: বৃষ্টিপাত', 'Precipitation is water falling from clouds.', 'বৃষ্টিপাত হলো মেঘ থেকে পানি পড়া।'),
    ],
  }),
  quickCheck(B910, {
    slug: 'snowmelt', skill: 'predict', src: 'waterCycle', quote: 'In many places, the snow builds up all winter and does not begin to melt until spring.',
    explanation: ['In many places snow builds up all winter and only begins to melt in spring.', 'অনেক জায়গায় সারা শীত তুষার জমে, আর বসন্তে গলতে শুরু করে।'],
    prompt: ['Snow piles up on mountains all winter. When does it usually begin to melt?', 'সারা শীত পাহাড়ে তুষার জমে। সাধারণত কখন গলতে শুরু করে?'],
    answer: a('In spring', 'বসন্তে'),
    distractors: [
      d('Right after it falls', 'পড়ার সাথে সাথে', 'In cold places it builds up all winter.', 'ঠান্ডা জায়গায় এটা সারা শীত জমে থাকে।'),
      d('Never', 'কখনো না', 'Snow melts and joins the water cycle.', 'তুষার গলে পানিচক্রে যোগ দেয়।'),
    ],
  }),
  quickCheck(B910, {
    slug: 'vapour-everywhere', skill: 'identify', src: 'waterCycle', quote: 'All air contains water molecules in the form of water vapor, which is an invisible gas.',
    explanation: ['All air contains invisible water vapour.', 'সব বাতাসেই অদৃশ্য জলীয় বাষ্প থাকে।'],
    prompt: ['Which statement about water vapour is true?', 'জলীয় বাষ্প সম্পর্কে কোন কথাটি সত্য?'],
    answer: a('All air contains some, as an invisible gas', 'সব বাতাসে কিছু থাকে, অদৃশ্য গ্যাস হিসেবে'),
    distractors: [
      d('You can always see it as white mist', 'সাদা কুয়াশা হিসেবে সবসময় দেখা যায়', 'Vapour itself is invisible; mist is droplets.', 'বাষ্প নিজে অদৃশ্য; কুয়াশা হলো ফোঁটা।'),
      d('It exists only over the ocean', 'শুধু সমুদ্রের ওপরে থাকে', 'All air contains water vapour.', 'সব বাতাসেই জলীয় বাষ্প আছে।'),
    ],
  }),
  quickCheck(B910, {
    slug: 'thunder-range', skill: 'identify', src: 'thunder', quote: 'can be heard for a distance of only about 10 miles from the lightning strike',
    explanation: ['Thunder can usually be heard only up to about 10 miles from the lightning strike.', 'বজ্রধ্বনি সাধারণত বিদ্যুৎ চমকানোর জায়গা থেকে প্রায় ১০ মাইল পর্যন্ত শোনা যায়।'],
    prompt: ['About how far from a lightning strike can thunder usually be heard?', 'বিদ্যুৎ চমকানোর জায়গা থেকে সাধারণত কত দূর পর্যন্ত বজ্রধ্বনি শোনা যায়?'],
    answer: a('About 10 miles', 'প্রায় ১০ মাইল'),
    distractors: [
      d('About 100 miles', 'প্রায় ১০০ মাইল', 'Thunder fades within about 10 miles.', 'প্রায় ১০ মাইলের মধ্যেই বজ্রধ্বনি মিলিয়ে যায়।'),
      d('Anywhere in the country', 'দেশের যেকোনো জায়গায়', 'Thunder can only be heard about 10 miles away.', 'বজ্রধ্বনি প্রায় ১০ মাইল দূর পর্যন্তই শোনা যায়।'),
    ],
  }),
]

export const WEATHER_FLYER_ITEMS = Object.freeze([...ages4to6, ...ages7to8, ...ages9to10])
