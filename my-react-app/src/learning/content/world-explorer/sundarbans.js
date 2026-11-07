/**
 * World Explorer 3D: Sundarbans expedition (wave 1, ages 12+).
 * Five stations (Observe → Investigate → Explain → Record) and two 5-question report sets.
 *
 * STATUS: draft, AWAITING science-accuracy review AND Bangla review. Bangla is a first draft.
 * Every fact is tied to a quote in ../sources.js (fetched 2026-11-02).
 */
import { a, d, reportItem, station } from '../build.js'

const X = 'sundarbans'

export const SUNDARBANS_STATIONS = [
  station(X, {
    n: 1, slug: 'delta', skill: 'cause-effect', src: 'sundarbans',
    quote: 'formed from sediments deposited by three great rivers; the Ganges, Brahmaputra and Meghna,',
    title: ['Where three rivers meet', 'যেখানে তিন নদী মেশে'],
    observe: ['Three wide channels of brown water meet here and spread out towards the sea.', 'এখানে বাদামি পানির তিনটি চওড়া চ্যানেল মিলে সাগরের দিকে ছড়িয়ে পড়েছে।'],
    investigate: ['Dig a small hole in the bank and look at the side of it.', 'তীরে একটি ছোট গর্ত খুঁড়ে তার পাশটা দেখো।'],
    finding: ['The bank is made of thin layers of fine mud and silt, one on top of another.', 'তীরটি মিহি কাদা আর পলির পাতলা স্তর দিয়ে তৈরি, একটির ওপর আরেকটি।'],
    hint: ['The river water is brown. What is it carrying, and where does that go when the water slows down?', 'নদীর পানি বাদামি। পানি কী বয়ে আনছে, আর পানি ধীর হলে সেটা কোথায় যায়?'],
    record: ['The Sundarbans was built from sediment carried by the Ganges, Brahmaputra and Meghna rivers.', 'গঙ্গা, ব্রহ্মপুত্র আর মেঘনা নদীর বয়ে আনা পলি দিয়ে সুন্দরবন তৈরি হয়েছে।'],
    prompt: ['How did the land of the Sundarbans form?', 'সুন্দরবনের ভূমি কীভাবে তৈরি হয়েছে?'],
    answer: a('Three great rivers deposited sediment here', 'তিনটি বড় নদী এখানে পলি জমিয়েছে'),
    distractors: [
      d('A volcano pushed up new rock', 'একটি আগ্নেয়গিরি নতুন পাথর ঠেলে তুলেছে', 'Delta land is built from river sediment, not volcanic rock.', 'ব-দ্বীপের ভূমি নদীর পলি দিয়ে তৈরি, আগ্নেয় শিলা দিয়ে নয়।'),
      d('A coral reef grew until it became land', 'একটি প্রবাল প্রাচীর বড় হয়ে ভূমি হয়ে গেছে', 'Coral reefs grow in clear seas; this land is layers of river mud.', 'প্রবাল প্রাচীর হয় পরিষ্কার সাগরে; এই ভূমি নদীর কাদার স্তর।'),
      d('A glacier left soil behind when it melted', 'একটি হিমবাহ গলে যাওয়ার সময় মাটি রেখে গেছে', 'There are no glaciers here; the layers came from the rivers.', 'এখানে কোনো হিমবাহ নেই; স্তরগুলো এসেছে নদী থেকে।'),
    ],
    explanation: ['UNESCO says the Sundarbans was formed from sediments deposited by the Ganges, Brahmaputra and Meghna. Slow water drops the mud it carries, layer by layer.', 'ইউনেস্কো বলে, গঙ্গা, ব্রহ্মপুত্র আর মেঘনার জমানো পলি দিয়ে সুন্দরবন তৈরি। ধীর পানি তার বয়ে আনা কাদা স্তরে স্তরে ফেলে যায়।'],
  }),
  station(X, {
    n: 2, slug: 'brackish', skill: 'identify', src: 'sundarbans',
    quote: 'perennially washed by brackish water shrilling in and around the endless and mind-boggling labyrinths of water channels.',
    title: ['River meets sea', 'নদী মেশে সাগরে'],
    observe: ['The tide is coming in. Water flows up this channel from the Bay of Bengal.', 'জোয়ার আসছে। বঙ্গোপসাগর থেকে পানি এই চ্যানেল বেয়ে উঠে আসছে।'],
    investigate: ['Test a water sample with the salt meter, then test rainwater from your bottle.', 'লবণ-মাপক দিয়ে পানির নমুনা পরীক্ষা করো, তারপর তোমার বোতলের বৃষ্টির পানি পরীক্ষা করো।'],
    finding: ['The channel water is a little salty. The rainwater has almost no salt.', 'চ্যানেলের পানি একটু লবণাক্ত। বৃষ্টির পানিতে প্রায় কোনো লবণ নেই।'],
    hint: ['Fresh water comes down the rivers. Salty water comes in with the tide. What happens when they meet?', 'নদী দিয়ে মিঠা পানি নামে। জোয়ারের সাথে লোনা পানি ঢোকে। দুটো মিললে কী হয়?'],
    record: ['The channels are washed by brackish water: river water mixed with sea water.', 'চ্যানেলগুলো লোনা-মিঠা মেশানো (ঈষৎ লোনা) পানিতে ধোয়া: নদীর পানি আর সাগরের পানি মিশে।'],
    prompt: ['What kind of water washes the channels of the Sundarbans?', 'সুন্দরবনের চ্যানেলগুলো কেমন পানিতে ধোয়া?'],
    answer: a('Brackish water: slightly salty, a mix of river and sea water', 'ঈষৎ লোনা পানি: নদী আর সাগরের পানির মিশ্রণ'),
    distractors: [
      d('Pure fresh water, like rain', 'বৃষ্টির মতো খাঁটি মিঠা পানি', 'The tide brings sea water in, so the water is not fully fresh.', 'জোয়ার সাগরের পানি নিয়ে আসে, তাই পানি পুরোপুরি মিঠা নয়।'),
      d('Water exactly as salty as the open ocean', 'খোলা সাগরের মতো ঠিক ততটাই লোনা পানি', 'River water keeps flowing in, so it is less salty than the open sea.', 'নদীর পানি অনবরত ঢোকে, তাই এটি খোলা সাগরের চেয়ে কম লোনা।'),
      d('Frozen meltwater from mountains', 'পাহাড় থেকে আসা জমাট বরফ-গলা পানি', 'Melted snow may feed the rivers far away, but here the water is liquid and mixed with sea water.', 'দূরে বরফ-গলা পানি নদীতে মিশতে পারে, কিন্তু এখানে পানি তরল এবং সাগরের পানির সাথে মেশানো।'),
    ],
    explanation: ['UNESCO describes the Sundarbans as washed by brackish water. The rivers bring fresh water and the tides from the Bay of Bengal bring salt water.', 'ইউনেস্কো বলে, সুন্দরবন ঈষৎ লোনা পানিতে ধোয়া। নদী আনে মিঠা পানি, আর বঙ্গোপসাগরের জোয়ার আনে লোনা পানি।'],
  }),
  station(X, {
    n: 3, slug: 'breathing-roots', skill: 'cause-effect', src: 'mangroveRoots',
    quote: 'These aerial roots (also known as breathing roots) allow mangroves to exchange gases, including oxygen, with the air.',
    title: ['Roots that breathe', 'যে শিকড় শ্বাস নেয়'],
    observe: ['Hundreds of thin roots poke straight up out of the mud around these mangrove trees.', 'এই ম্যানগ্রোভ গাছগুলোর চারপাশে কাদা থেকে শত শত সরু শিকড় সোজা ওপরে উঠে আছে।'],
    investigate: ['Push the probe into the mud and read the oxygen meter. Then hold it in the air.', 'প্রোবটি কাদায় ঢুকিয়ে অক্সিজেন-মাপক দেখো। তারপর বাতাসে ধরো।'],
    finding: ['The wet mud has very little oxygen. The air above it has plenty.', 'ভেজা কাদায় অক্সিজেন খুব কম। ওপরের বাতাসে অনেক।'],
    hint: ['Roots need oxygen too. Where is the oxygen: in the mud or in the air?', 'শিকড়েরও অক্সিজেন লাগে। অক্সিজেন কোথায়: কাদায় না বাতাসে?'],
    record: ['Mangrove breathing roots take in oxygen from the air, because the mud has little oxygen.', 'কাদায় অক্সিজেন কম, তাই ম্যানগ্রোভের শ্বাসমূল বাতাস থেকে অক্সিজেন নেয়।'],
    prompt: ['Why do many mangroves grow roots that stick up out of the mud?', 'অনেক ম্যানগ্রোভ গাছের শিকড় কেন কাদা ফুঁড়ে ওপরে উঠে থাকে?'],
    answer: a('To take in oxygen from the air, since the mud has little', 'বাতাস থেকে অক্সিজেন নিতে, কারণ কাদায় অক্সিজেন কম'),
    distractors: [
      d('To catch insects for food', 'খাবারের জন্য পোকা ধরতে', 'Mangroves make their food with their leaves; their roots do not catch animals.', 'ম্যানগ্রোভ পাতা দিয়ে খাবার তৈরি করে; শিকড় প্রাণী ধরে না।'),
      d('To soak up sunlight like leaves do', 'পাতার মতো সূর্যের আলো শুষে নিতে', 'Leaves use sunlight; these roots exchange gases with the air.', 'পাতা সূর্যের আলো ব্যবহার করে; এই শিকড়গুলো বাতাসের সাথে গ্যাস বিনিময় করে।'),
      d('To drink rainwater before it reaches the mud', 'কাদায় পৌঁছানোর আগেই বৃষ্টির পানি খেতে', 'Water is all around them; what the mud lacks is oxygen.', 'চারপাশে পানির অভাব নেই; কাদায় যার অভাব তা হলো অক্সিজেন।'),
    ],
    explanation: ['Oxygen is scarce in mangrove mud. Aerial "breathing" roots let the tree exchange gases, including oxygen, with the air.', 'ম্যানগ্রোভের কাদায় অক্সিজেন কম। বাতাসে থাকা "শ্বাসমূল" গাছকে বাতাসের সাথে অক্সিজেনসহ গ্যাস বিনিময় করতে দেয়।'],
  }),
  station(X, {
    n: 4, slug: 'tiger', skill: 'compare', src: 'sundarbans',
    quote: 'It is the only mangrove habitat in the world for Panthera tigris tigris species.',
    title: ['Tracks in the mud', 'কাদায় পায়ের ছাপ'],
    observe: ['Big round paw prints cross the mudflat and lead straight into the water.', 'বড় গোল থাবার ছাপ কাদার চর পেরিয়ে সোজা পানিতে নেমে গেছে।'],
    investigate: ['Measure one print and compare it with the field guide.', 'একটি ছাপ মেপে মাঠ-নির্দেশিকার সাথে মিলিয়ে দেখো।'],
    finding: ['The prints match a Bengal tiger, a big cat living in a mangrove forest.', 'ছাপগুলো রয়েল বেঙ্গল টাইগারের সাথে মেলে, ম্যানগ্রোভ বনে থাকা একটি বড় বিড়াল।'],
    hint: ['Tigers live in several kinds of forest around the world. What kind of forest is this one?', 'পৃথিবীর নানা ধরনের বনে বাঘ থাকে। এটা কোন ধরনের বন?'],
    record: ['The Sundarbans is the only mangrove forest in the world where tigers live.', 'সুন্দরবন পৃথিবীর একমাত্র ম্যানগ্রোভ বন যেখানে বাঘ থাকে।'],
    prompt: ['What makes the Sundarbans special for tigers?', 'বাঘের জন্য সুন্দরবন বিশেষ কেন?'],
    answer: a('It is the only mangrove forest in the world where tigers live', 'এটি পৃথিবীর একমাত্র ম্যানগ্রোভ বন যেখানে বাঘ থাকে'),
    distractors: [
      d('It is the only place in the world where tigers live', 'এটি পৃথিবীর একমাত্র জায়গা যেখানে বাঘ থাকে', 'Tigers live in other forests too; this is the only MANGROVE forest they live in.', 'অন্য বনেও বাঘ থাকে; এটি একমাত্র ম্যানগ্রোভ বন যেখানে তারা থাকে।'),
      d('Its tigers never go into water', 'এখানকার বাঘ কখনো পানিতে নামে না', 'The tracks lead into the water: this forest is full of tidal channels.', 'ছাপগুলো পানিতে নেমে গেছে: এই বন জোয়ারের চ্যানেলে ভরা।'),
      d('It is a snowy mountain forest', 'এটি বরফে ঢাকা পাহাড়ি বন', 'The Sundarbans is a low, muddy delta by the sea.', 'সুন্দরবন সাগরের পাশে নিচু, কাদাময় ব-দ্বীপ।'),
    ],
    explanation: ['UNESCO notes that the Sundarbans is the only mangrove habitat in the world for the Bengal tiger. Tigers live elsewhere too, but not in other mangroves.', 'ইউনেস্কো জানায়, সুন্দরবন পৃথিবীতে বাঘের একমাত্র ম্যানগ্রোভ আবাস। অন্য জায়গায়ও বাঘ থাকে, কিন্তু অন্য কোনো ম্যানগ্রোভে নয়।'],
  }),
  station(X, {
    n: 5, slug: 'storm-shield', skill: 'predict', src: 'sundarbans',
    quote: 'acts as a shelter belt to protect the people from storms, cyclones, tidal surges, sea water seepage and intrusion.',
    title: ['The storm shield', 'ঝড়ের ঢাল'],
    observe: ['A thick band of mangroves stands between the open sea and a village.', 'খোলা সাগর আর একটি গ্রামের মাঝখানে ম্যানগ্রোভের ঘন সারি দাঁড়িয়ে আছে।'],
    investigate: ['In the wave tank, send the same wave at a bare bank and at a bank planted with model mangroves.', 'ঢেউয়ের ট্যাংকে একই ঢেউ একবার খালি তীরে, আরেকবার মডেল ম্যানগ্রোভ লাগানো তীরে পাঠাও।'],
    finding: ['Behind the model mangroves the wave is much smaller when it reaches the shore.', 'মডেল ম্যানগ্রোভের পেছনে তীরে পৌঁছানো ঢেউ অনেক ছোট।'],
    hint: ['Think about what stands in the way of a storm wave before it reaches the village.', 'ঝড়ের ঢেউ গ্রামে পৌঁছানোর আগে পথে কী দাঁড়িয়ে আছে, ভাবো।'],
    record: ['The mangrove forest is a shelter belt that protects people from storms, cyclones and tidal surges.', 'ম্যানগ্রোভ বন একটি রক্ষাবেষ্টনী, যা মানুষকে ঝড়, ঘূর্ণিঝড় আর জলোচ্ছ্বাস থেকে রক্ষা করে।'],
    prompt: ['Why does protecting the mangroves matter to people living nearby?', 'কাছে বাস করা মানুষের জন্য ম্যানগ্রোভ রক্ষা করা কেন জরুরি?'],
    answer: a('The forest shelters them from storms, cyclones and tidal surges', 'বনটি তাদের ঝড়, ঘূর্ণিঝড় আর জলোচ্ছ্বাস থেকে আড়াল করে'),
    distractors: [
      d('The forest stops rain from falling on the villages', 'বন গ্রামে বৃষ্টি পড়া থামিয়ে দেয়', 'Trees do not stop rain; they slow down waves and wind from the sea.', 'গাছ বৃষ্টি থামায় না; তারা সাগরের ঢেউ আর বাতাসের গতি কমায়।'),
      d('The forest turns sea water into drinking water', 'বন সাগরের পানিকে খাবার পানিতে পরিণত করে', 'The channels stay brackish; the forest does not make drinking water.', 'চ্যানেলগুলো ঈষৎ লোনাই থাকে; বন খাবার পানি তৈরি করে না।'),
      d('It does not matter: the forest has no effect on storms', 'কিছু যায় আসে না: ঝড়ের ওপর বনের কোনো প্রভাব নেই', 'The forest acts as a shelter belt, so losing it leaves people more exposed.', 'বনটি রক্ষাবেষ্টনীর কাজ করে, তাই বন হারালে মানুষ বেশি বিপদে পড়ে।'),
    ],
    explanation: ['UNESCO describes the Sundarbans as a shelter belt protecting people from storms, cyclones and tidal surges. Mangroves slow waves before they reach land.', 'ইউনেস্কো বলে, সুন্দরবন মানুষকে ঝড়, ঘূর্ণিঝড় আর জলোচ্ছ্বাস থেকে রক্ষা করা একটি রক্ষাবেষ্টনী। ম্যানগ্রোভ ঢেউ ডাঙায় পৌঁছানোর আগেই তার গতি কমায়।'],
  }),
]

export const SUNDARBANS_REPORT_A = [
  reportItem(X, 'A', {
    n: 1, slug: 'three-rivers', skill: 'identify', src: 'sundarbans',
    quote: 'lies on the delta of the Ganges, Brahmaputra and Meghna rivers on the Bay of Bengal.',
    prompt: ['Which three rivers formed the delta that the Sundarbans lies on?', 'সুন্দরবন যে ব-দ্বীপে, সেটি কোন তিনটি নদী তৈরি করেছে?'],
    answer: a('Ganges, Brahmaputra and Meghna', 'গঙ্গা, ব্রহ্মপুত্র ও মেঘনা'),
    distractors: [
      d('Nile, Congo and Niger', 'নীল, কঙ্গো ও নাইজার', 'These are great African rivers, far from the Bay of Bengal.', 'এগুলো আফ্রিকার বড় নদী, বঙ্গোপসাগর থেকে অনেক দূরে।'),
      d('Indus, Jhelum and Chenab', 'সিন্ধু, ঝিলম ও চেনাব', 'These rivers flow to the Arabian Sea, not the Bay of Bengal.', 'এই নদীগুলো আরব সাগরে যায়, বঙ্গোপসাগরে নয়।'),
      d('Amazon, Orinoco and Paraná', 'আমাজন, ওরিনোকো ও পারানা', 'These are South American rivers.', 'এগুলো দক্ষিণ আমেরিকার নদী।'),
    ],
    explanation: ['The Sundarbans lies on the delta of the Ganges, Brahmaputra and Meghna, on the Bay of Bengal.', 'সুন্দরবন বঙ্গোপসাগরের তীরে গঙ্গা, ব্রহ্মপুত্র ও মেঘনার ব-দ্বীপে অবস্থিত।'],
  }),
  reportItem(X, 'A', {
    n: 2, slug: 'lenticels', skill: 'identify', src: 'mangroveRoots',
    quote: 'This gas exchange happens through tiny openings in the roots called lenticels.',
    prompt: ['Air gets into mangrove breathing roots through tiny openings. What are they called?', 'ম্যানগ্রোভের শ্বাসমূলে ছোট ছোট ছিদ্র দিয়ে বাতাস ঢোকে। এগুলোর নাম কী?'],
    answer: a('Lenticels', 'লেন্টিসেল'),
    distractors: [
      d('Gills', 'ফুলকা', 'Gills are how fish take oxygen from water; roots use lenticels.', 'ফুলকা দিয়ে মাছ পানি থেকে অক্সিজেন নেয়; শিকড় ব্যবহার করে লেন্টিসেল।'),
      d('Petals', 'পাপড়ি', 'Petals are parts of flowers, not openings in roots.', 'পাপড়ি ফুলের অংশ, শিকড়ের ছিদ্র নয়।'),
      d('Thorns', 'কাঁটা', 'Thorns are sharp points for protection, not air openings.', 'কাঁটা সুরক্ষার জন্য ধারালো অংশ, বাতাস ঢোকার ছিদ্র নয়।'),
    ],
    explanation: ['Gas exchange happens through tiny openings in the roots called lenticels.', 'শিকড়ের লেন্টিসেল নামের ছোট ছিদ্র দিয়ে গ্যাস বিনিময় হয়।'],
  }),
  reportItem(X, 'A', {
    n: 3, slug: 'countries', skill: 'identify', src: 'sundarbans',
    quote: '60% of the property lies in Bangladesh and the rest in India.',
    prompt: ['Which countries share the Sundarbans?', 'কোন কোন দেশ সুন্দরবন ভাগ করে নিয়েছে?'],
    answer: a('Bangladesh (about 60%) and India', 'বাংলাদেশ (প্রায় ৬০%) ও ভারত'),
    distractors: [
      d('India only', 'শুধু ভারত', 'Most of it lies in Bangladesh.', 'এর বেশির ভাগ বাংলাদেশে।'),
      d('Bangladesh and Myanmar', 'বাংলাদেশ ও মিয়ানমার', 'The rest of the forest lies in India, not Myanmar.', 'বনের বাকি অংশ ভারতে, মিয়ানমারে নয়।'),
      d('Nepal and Bhutan', 'নেপাল ও ভুটান', 'These countries have no coast; the Sundarbans is on the sea.', 'এই দেশগুলোর সমুদ্রতীর নেই; সুন্দরবন সাগরের তীরে।'),
    ],
    explanation: ['UNESCO notes that about 60% of the Sundarbans lies in Bangladesh and the rest in India.', 'ইউনেস্কো জানায়, সুন্দরবনের প্রায় ৬০% বাংলাদেশে আর বাকিটা ভারতে।'],
  }),
  reportItem(X, 'A', {
    n: 4, slug: 'salty-flooded', skill: 'compare', src: 'mangroveRoots',
    quote: 'In addition, mangroves thrive in salty, flooded environments where most trees cannot survive.',
    prompt: ['How are mangroves different from most trees?', 'ম্যানগ্রোভ বেশির ভাগ গাছ থেকে কীভাবে আলাদা?'],
    answer: a('They thrive in salty, flooded places where most trees cannot survive', 'যেখানে বেশির ভাগ গাছ বাঁচে না, সেই লোনা ও প্লাবিত জায়গায় এরা ভালো থাকে'),
    distractors: [
      d('They grow only in dry sand', 'এরা শুধু শুকনো বালিতে জন্মায়', 'Mangroves grow in wet, flooded mud.', 'ম্যানগ্রোভ ভেজা, প্লাবিত কাদায় জন্মায়।'),
      d('They need no oxygen at all', 'এদের একদম অক্সিজেন লাগে না', 'They do need oxygen; that is why they have breathing roots.', 'এদের অক্সিজেন লাগে; সেজন্যই শ্বাসমূল আছে।'),
      d('They grow only high in the mountains', 'এরা শুধু উঁচু পাহাড়ে জন্মায়', 'Mangroves grow at the coast, where land meets sea.', 'ম্যানগ্রোভ জন্মায় উপকূলে, যেখানে ডাঙা সাগরে মেশে।'),
    ],
    explanation: ['Mangroves thrive in salty, flooded environments where most trees cannot survive.', 'যে লোনা, প্লাবিত পরিবেশে বেশির ভাগ গাছ বাঁচতে পারে না, ম্যানগ্রোভ সেখানে ভালো থাকে।'],
  }),
  reportItem(X, 'A', {
    n: 5, slug: 'erosion', skill: 'predict', src: 'mangroveRoots',
    quote: 'For example, they help stabilize the soil and prevent erosion in coastal areas.',
    prompt: ['If the mangroves along a muddy bank were cut down, what would most likely happen?', 'কাদাময় তীরের ম্যানগ্রোভ কেটে ফেললে সবচেয়ে সম্ভাব্য কী ঘটবে?'],
    answer: a('The bank would wash away (erode) more easily', 'তীর আরও সহজে ক্ষয়ে যাবে'),
    distractors: [
      d('The bank would grow faster', 'তীর আরও দ্রুত বাড়বে', 'Mangrove roots hold soil in place; without them more soil is lost.', 'ম্যানগ্রোভের শিকড় মাটি ধরে রাখে; শিকড় না থাকলে বেশি মাটি হারায়।'),
      d('Nothing would change', 'কিছুই বদলাবে না', 'Mangroves stabilise soil, so removing them changes the bank.', 'ম্যানগ্রোভ মাটি স্থির রাখে, তাই কেটে ফেললে তীর বদলে যায়।'),
      d('The water would become fresh', 'পানি মিঠা হয়ে যাবে', 'Cutting trees does not change how salty the tide is.', 'গাছ কাটলে জোয়ারের পানির লবণাক্ততা বদলায় না।'),
    ],
    explanation: ['Mangroves help stabilise the soil and prevent erosion in coastal areas, so losing them lets banks wash away.', 'ম্যানগ্রোভ উপকূলের মাটি স্থির রাখে আর ক্ষয় ঠেকায়, তাই এদের হারালে তীর ক্ষয়ে যায়।'],
  }),
]

export const SUNDARBANS_REPORT_B = [
  reportItem(X, 'B', {
    n: 1, slug: 'landform', skill: 'identify', src: 'sundarbans',
    quote: 'lies on the delta of the Ganges, Brahmaputra and Meghna rivers on the Bay of Bengal.',
    prompt: ['What kind of landform is the Sundarbans on?', 'সুন্দরবন কোন ধরনের ভূমিরূপের ওপর?'],
    answer: a('A river delta', 'একটি নদী ব-দ্বীপ'),
    distractors: [
      d('A volcanic island', 'একটি আগ্নেয় দ্বীপ', 'The land is river sediment, not volcanic rock.', 'এই ভূমি নদীর পলি, আগ্নেয় শিলা নয়।'),
      d('A high plateau', 'একটি উঁচু মালভূমি', 'The Sundarbans is low, flat land at sea level.', 'সুন্দরবন সাগরপৃষ্ঠের সমান নিচু, সমতল ভূমি।'),
      d('A desert basin', 'একটি মরু অববাহিকা', 'It is wet and flooded, not a desert.', 'এটি ভেজা ও প্লাবিত, মরুভূমি নয়।'),
    ],
    explanation: ['The Sundarbans lies on the delta of the Ganges, Brahmaputra and Meghna rivers.', 'সুন্দরবন গঙ্গা, ব্রহ্মপুত্র ও মেঘনা নদীর ব-দ্বীপে অবস্থিত।'],
  }),
  reportItem(X, 'B', {
    n: 2, slug: 'bay', skill: 'identify', src: 'sundarbans',
    quote: 'lies on the delta of the Ganges, Brahmaputra and Meghna rivers on the Bay of Bengal.',
    prompt: ['Which sea does the Sundarbans face?', 'সুন্দরবন কোন সাগরের দিকে মুখ করে আছে?'],
    answer: a('The Bay of Bengal', 'বঙ্গোপসাগর'),
    distractors: [
      d('The Arabian Sea', 'আরব সাগর', 'The Arabian Sea is on the other side of India.', 'আরব সাগর ভারতের অন্য পাশে।'),
      d('The Mediterranean Sea', 'ভূমধ্যসাগর', 'The Mediterranean is between Europe and Africa.', 'ভূমধ্যসাগর ইউরোপ আর আফ্রিকার মাঝে।'),
      d('The Caspian Sea', 'কাস্পিয়ান সাগর', 'The Caspian is a closed sea far to the north-west.', 'কাস্পিয়ান অনেক উত্তর-পশ্চিমে একটি বদ্ধ সাগর।'),
    ],
    explanation: ['The Sundarbans lies on the Bay of Bengal, which brings in the tides.', 'সুন্দরবন বঙ্গোপসাগরের তীরে, যেখান থেকে জোয়ার আসে।'],
  }),
  reportItem(X, 'B', {
    n: 3, slug: 'mud-oxygen', skill: 'cause-effect', src: 'mangroveRoots',
    quote: 'However, in the soil surrounding mangroves, oxygen is often scarce.',
    prompt: ['The mud around mangroves is short of a gas that roots need. Which gas?', 'ম্যানগ্রোভের চারপাশের কাদায় শিকড়ের দরকারি একটি গ্যাসের অভাব। কোন গ্যাস?'],
    answer: a('Oxygen', 'অক্সিজেন'),
    distractors: [
      d('Helium', 'হিলিয়াম', 'Roots do not use helium.', 'শিকড় হিলিয়াম ব্যবহার করে না।'),
      d('Water vapour', 'জলীয় বাষ্প', 'The mud is soaked with water; oxygen is what is missing.', 'কাদা পানিতে ভেজা; যা নেই তা হলো অক্সিজেন।'),
      d('Smoke', 'ধোঁয়া', 'Smoke is not a gas roots need.', 'ধোঁয়া শিকড়ের দরকারি গ্যাস নয়।'),
    ],
    explanation: ['In the soil around mangroves oxygen is often scarce, so they grow breathing roots.', 'ম্যানগ্রোভের চারপাশের মাটিতে অক্সিজেন প্রায়ই কম, তাই এদের শ্বাসমূল গজায়।'],
  }),
  reportItem(X, 'B', {
    n: 4, slug: 'birds', skill: 'identify', src: 'sundarbans',
    quote: 'The area is known for its wide range of fauna, including 260 bird species,',
    prompt: ['About how many bird species are known from the Sundarbans?', 'সুন্দরবনে প্রায় কত প্রজাতির পাখি জানা আছে?'],
    answer: a('About 260', 'প্রায় ২৬০'),
    distractors: [
      d('About 26', 'প্রায় ২৬', 'That is ten times too few.', 'এটা দশ গুণ কম।'),
      d('About 2,600', 'প্রায় ২,৬০০', 'That is ten times too many.', 'এটা দশ গুণ বেশি।'),
      d('None: birds avoid mangroves', 'একটিও নয়: পাখি ম্যানগ্রোভ এড়িয়ে চলে', 'Bird life is one of the area\'s great attractions.', 'পাখি এই এলাকার অন্যতম বড় আকর্ষণ।'),
    ],
    explanation: ['UNESCO lists about 260 bird species in the Sundarbans.', 'ইউনেস্কোর তালিকায় সুন্দরবনে প্রায় ২৬০ প্রজাতির পাখি আছে।'],
  }),
  reportItem(X, 'B', {
    n: 5, slug: 'tidal-action', skill: 'cause-effect', src: 'sundarbans',
    quote: 'the land has been moulded by tidal action, resulting in a distinctive physiology.',
    prompt: ['What has shaped the Sundarbans into channels, mudflats and small islands?', 'কী সুন্দরবনকে চ্যানেল, কাদার চর আর ছোট ছোট দ্বীপে গড়ে তুলেছে?'],
    answer: a('Tidal action: the rise and fall of the tides', 'জোয়ার-ভাটার কাজ: পানির ওঠানামা'),
    distractors: [
      d('Earthquakes splitting the land', 'ভূমিকম্পে ভূমি ফেটে যাওয়া', 'The channels were moulded by moving water, not cracks.', 'চ্যানেলগুলো চলমান পানিতে গড়া, ফাটলে নয়।'),
      d('Wind blowing sand dunes', 'বাতাসে বালিয়াড়ি সরা', 'This is wet mud, not a sandy desert.', 'এটি ভেজা কাদা, বালুকাময় মরুভূমি নয়।'),
      d('People digging every channel', 'মানুষ প্রতিটি চ্যানেল খুঁড়েছে', 'The channel network formed naturally from tides and rivers.', 'চ্যানেলের জাল প্রাকৃতিকভাবে জোয়ার আর নদী থেকে তৈরি।'),
    ],
    explanation: ['UNESCO says the land has been moulded by tidal action, giving a network of tidal waterways, mudflats and islands.', 'ইউনেস্কো বলে, জোয়ার-ভাটার কাজে ভূমি গড়ে উঠেছে, তৈরি হয়েছে জোয়ারের নালা, কাদার চর আর দ্বীপের জাল।'],
  }),
]

export const SUNDARBANS_ITEMS = Object.freeze([...SUNDARBANS_STATIONS, ...SUNDARBANS_REPORT_A, ...SUNDARBANS_REPORT_B])
