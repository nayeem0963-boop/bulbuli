/**
 * World Explorer 3D: hands-on Investigate activities, one per station (Stage 2A-3 revision,
 * 3 Nov 2026). They replace "read a paragraph, press a button" with something the learner does:
 *
 *   compare  predict first, then test every condition; the readings are shown as levels (0–4,
 *            relative, no invented measurements) and the learner sees whether the prediction held.
 *   order    put steps or items in the right order (cause → effect, or biggest → smallest).
 *
 * Every activity only restates or models the fact its station already cites (see the station's
 * `source` and ./sources.js). Levels are deliberately qualitative: they show "more / less", never a
 * number the sources do not give. They are attached to the station inside the reviewable item, so
 * they are hashed and need the same science + Bangla approval (contentGate.reviewablePart → station).
 *
 * STATUS: draft, AWAITING science-accuracy review AND Bangla review.
 */

const c = (id, en, bn, level, readEn, readBn) => ({ id, label: { en, bn }, level, reading: { en: readEn, bn: readBn } })
const o = (id, en, bn) => ({ id, label: { en, bn } })

export const INTERACTIONS = Object.freeze({
  /* ---------------- Sundarbans */
  'we.sundarbans.s1': {
    kind: 'order',
    prompt: { en: 'Put the story of how this land formed in order.', bn: 'এই ভূমি কীভাবে তৈরি হলো, ঘটনাগুলো ক্রমানুসারে সাজাও।' },
    items: [
      o('carry', 'The Ganges, Brahmaputra and Meghna carry mud and silt downstream', 'গঙ্গা, ব্রহ্মপুত্র আর মেঘনা কাদা ও পলি ভাটির দিকে বয়ে আনে'),
      o('settle', 'Where the rivers slow down near the sea, the sediment settles', 'সাগরের কাছে নদী ধীর হলে পলি জমতে থাকে'),
      o('layers', 'Layer upon layer builds up into new land', 'স্তরের পর স্তর জমে নতুন ভূমি তৈরি হয়'),
      o('forest', 'Mangrove forest grows on the new land', 'নতুন ভূমিতে ম্যানগ্রোভ বন জন্মায়'),
    ],
    explain: { en: 'UNESCO describes the Sundarbans as formed from sediments deposited by these three great rivers.', bn: 'ইউনেস্কোর বর্ণনায়, এই তিন বড় নদীর জমানো পলি থেকেই সুন্দরবন তৈরি হয়েছে।' },
  },
  'we.sundarbans.s2': {
    kind: 'compare',
    measure: { en: 'Salt in the water', bn: 'পানিতে লবণ' },
    predict: { en: 'Predict: which sample will be the saltiest?', bn: 'অনুমান করো: কোন নমুনা সবচেয়ে লবণাক্ত হবে?' },
    expect: 'sea',
    conditions: [
      c('rain', 'Rainwater from your bottle', 'তোমার বোতলের বৃষ্টির পানি', 0, 'Almost no salt.', 'প্রায় কোনো লবণ নেই।'),
      c('channel', 'Water from this channel', 'এই খালের পানি', 2, 'A little salty: river water mixed with sea water.', 'একটু লবণাক্ত: নদীর পানির সাথে সাগরের পানি মেশানো।'),
      c('sea', 'Water from the Bay of Bengal', 'বঙ্গোপসাগরের পানি', 4, 'Very salty.', 'খুব লবণাক্ত।'),
    ],
    explain: { en: 'Water that is part river and part sea is called brackish. It washes all the Sundarbans channels.', bn: 'নদী আর সাগরের পানি মিশে যে পানি হয়, তাকে লোনা (ব্র্যাকিশ) পানি বলে। এই পানিই সুন্দরবনের সব খাল ধুয়ে দেয়।' },
  },
  'we.sundarbans.s3': {
    kind: 'compare',
    measure: { en: 'Oxygen', bn: 'অক্সিজেন' },
    predict: { en: 'Predict: where will the probe find more oxygen?', bn: 'অনুমান করো: প্রোব কোথায় বেশি অক্সিজেন পাবে?' },
    expect: 'air',
    conditions: [
      c('mud', 'Deep in the wet mud', 'ভেজা কাদার গভীরে', 0, 'Very little oxygen.', 'খুব সামান্য অক্সিজেন।'),
      c('air', 'In the air, next to a root tip', 'বাতাসে, শিকড়ের ডগার পাশে', 4, 'Plenty of oxygen.', 'প্রচুর অক্সিজেন।'),
    ],
    explain: { en: 'Oxygen is scarce in the mud, so roots that stick up into the air let the tree take in oxygen.', bn: 'কাদায় অক্সিজেন কম, তাই বাতাসে উঠে থাকা শিকড় দিয়ে গাছ অক্সিজেন নেয়।' },
  },
  'we.sundarbans.s4': {
    kind: 'compare',
    measure: { en: 'Tiger tracks found', bn: 'বাঘের পায়ের ছাপ পাওয়া গেছে' },
    predict: { en: 'Predict: which mangrove survey will report tiger tracks?', bn: 'অনুমান করো: কোন ম্যানগ্রোভ জরিপে বাঘের পায়ের ছাপ পাওয়া যাবে?' },
    expect: 'sundarbans',
    conditions: [
      c('sundarbans', 'Survey: the Sundarbans', 'জরিপ: সুন্দরবন', 4, 'Tiger tracks: yes.', 'বাঘের ছাপ: আছে।'),
      c('elsewhere', 'Survey: mangrove forests anywhere else in the world', 'জরিপ: পৃথিবীর অন্য যেকোনো ম্যানগ্রোভ বন', 0, 'Tiger tracks: none.', 'বাঘের ছাপ: নেই।'),
    ],
    explain: { en: 'UNESCO: the Sundarbans is the only mangrove habitat in the world for this tiger.', bn: 'ইউনেস্কো: পৃথিবীতে এই বাঘের একমাত্র ম্যানগ্রোভ আবাস সুন্দরবন।' },
  },
  'we.sundarbans.s5': {
    kind: 'compare',
    measure: { en: 'Wave height at the shore', bn: 'তীরে ঢেউয়ের উচ্চতা' },
    predict: { en: 'Predict: behind which bank will the wave be smaller?', bn: 'অনুমান করো: কোন তীরের পেছনে ঢেউ ছোট হবে?' },
    expect: 'mangroves',
    conditions: [
      c('bare', 'Bare bank', 'খালি তীর', 4, 'The wave hits the shore almost full size.', 'ঢেউ প্রায় পুরো উচ্চতায় তীরে আঘাত করে।'),
      c('mangroves', 'Bank planted with model mangroves', 'মডেল ম্যানগ্রোভ লাগানো তীর', 1, 'The wave is much smaller when it reaches the shore.', 'তীরে পৌঁছাতে পৌঁছাতে ঢেউ অনেক ছোট হয়ে যায়।'),
    ],
    explain: { en: 'Mangroves act as a natural barrier against waves and storm surges, sheltering people behind them.', bn: 'ম্যানগ্রোভ ঢেউ আর জলোচ্ছ্বাসের বিরুদ্ধে প্রাকৃতিক বাঁধের মতো কাজ করে, পেছনের মানুষদের রক্ষা করে।' },
  },

  /* ---------------- Amazon */
  'we.amazon.s1': {
    kind: 'compare',
    measure: { en: 'Number of species', bn: 'প্রজাতির সংখ্যা' },
    predict: { en: 'Predict: which group of Amazon species is bigger?', bn: 'অনুমান করো: আমাজনের কোন দলের প্রজাতি বেশি?' },
    expect: 'undescribed',
    conditions: [
      c('described', 'Species scientists have described', 'বিজ্ঞানীরা যেসব প্রজাতির বর্ণনা দিয়েছেন', 1, 'Many, but not most of them.', 'অনেক, কিন্তু বেশিরভাগ নয়।'),
      c('undescribed', 'Species not yet described', 'যেসব প্রজাতির এখনও বর্ণনা হয়নি', 3, 'Most of the Amazon\'s species.', 'আমাজনের বেশিরভাগ প্রজাতি।'),
    ],
    explain: { en: 'WWF: the Amazon contains millions of species, most of them still undescribed.', bn: 'ডব্লিউডব্লিউএফ: আমাজনে লাখ লাখ প্রজাতি আছে, যার বেশিরভাগের এখনও বর্ণনা হয়নি।' },
  },
  'we.amazon.s2': {
    kind: 'order',
    prompt: { en: 'Order the layers from brightest to darkest.', bn: 'স্তরগুলো সবচেয়ে উজ্জ্বল থেকে সবচেয়ে অন্ধকার ক্রমে সাজাও।' },
    items: [
      o('canopy', 'Canopy', 'চাঁদোয়া (ক্যানোপি)'),
      o('understory', 'Understory', 'নিচের স্তর (আন্ডারস্টোরি)'),
      o('floor', 'Forest floor', 'বনের মেঝে'),
    ],
    explain: { en: 'The canopy gets most of the sun\'s rays, the understory is dim, and the forest floor is even darker.', bn: 'ক্যানোপি সূর্যের আলোর বেশিরভাগ পায়, আন্ডারস্টোরি আবছা, আর বনের মেঝে আরও অন্ধকার।' },
  },
  'we.amazon.s3': {
    kind: 'order',
    prompt: { en: 'What happens to a fallen leaf? Put the steps in order.', bn: 'ঝরে পড়া পাতার কী হয়? ধাপগুলো ক্রমানুসারে সাজাও।' },
    items: [
      o('fall', 'A leaf falls onto the forest floor', 'একটা পাতা বনের মেঝেতে ঝরে পড়ে'),
      o('decomposers', 'Fungi, insects and microorganisms feed on it', 'ছত্রাক, পোকামাকড় আর অণুজীব এটা খায়'),
      o('crumble', 'The leaf breaks down into crumbly leaf litter', 'পাতাটা ভেঙে গুঁড়ো গুঁড়ো পাতার স্তরে পরিণত হয়'),
    ],
    explain: { en: 'Decomposers such as fungi, insects and microorganisms live in the leaf litter and break it down.', bn: 'ছত্রাক, পোকামাকড় আর অণুজীবের মতো বিয়োজকেরা পাতার স্তরে থাকে এবং পাতা ভেঙে ফেলে।' },
  },
  'we.amazon.s4': {
    kind: 'order',
    prompt: { en: 'How do Amazon trees help make rain? Put the steps in order.', bn: 'আমাজনের গাছ কীভাবে বৃষ্টি তৈরিতে সাহায্য করে? ধাপগুলো ক্রমানুসারে সাজাও।' },
    items: [
      o('roots', 'Roots draw water up from the soil', 'শিকড় মাটি থেকে পানি টেনে তোলে'),
      o('transpire', 'Leaves release some of that water into the air as vapour', 'পাতা সেই পানির কিছুটা বাষ্প হিসেবে বাতাসে ছেড়ে দেয়'),
      o('rain', 'The water vapour falls again as rain over the forest', 'সেই জলীয় বাষ্প আবার বনের ওপর বৃষ্টি হয়ে পড়ে'),
    ],
    explain: { en: 'Trees draw water from their roots and transpire some back into the air; more than half of the Amazon\'s rainfall comes from trees.', bn: 'গাছ শিকড় দিয়ে পানি টানে আর কিছুটা আবার বাতাসে ছেড়ে দেয়; আমাজনের অর্ধেকেরও বেশি বৃষ্টি আসে গাছ থেকে।' },
  },
  'we.amazon.s5': {
    kind: 'compare',
    measure: { en: 'Water collected in the bag', bn: 'থলেতে জমা পানি' },
    predict: { en: 'Predict: which bag will collect the most water?', bn: 'অনুমান করো: কোন থলেতে সবচেয়ে বেশি পানি জমবে?' },
    expect: 'branch',
    conditions: [
      c('branch', 'Leafy branch at the forest edge', 'বনের কিনারে পাতাভরা ডাল', 4, 'Lots of droplets.', 'অনেক পানির ফোঁটা।'),
      c('stump', 'Tree stump', 'গাছের গুঁড়ি', 0, 'Almost none.', 'প্রায় নেই।'),
      c('soil', 'Bare soil', 'খালি মাটি', 0, 'Almost none.', 'প্রায় নেই।'),
    ],
    explain: { en: 'With no leaves, almost no water goes back into the air, so cutting down trees could reduce rainfall.', bn: 'পাতা না থাকলে প্রায় কোনো পানি বাতাসে ফেরে না, তাই গাছ কাটলে বৃষ্টি কমে যেতে পারে।' },
  },

  /* ---------------- Sahara */
  'we.sahara.s1': {
    kind: 'order',
    prompt: { en: 'Order these deserts from largest to smallest.', bn: 'এই মরুভূমিগুলো সবচেয়ে বড় থেকে ছোট ক্রমে সাজাও।' },
    items: [
      o('antarctica', 'Antarctica (cold desert)', 'অ্যান্টার্কটিকা (শীতল মরুভূমি)'),
      o('arctic', 'The Arctic (cold desert)', 'আর্কটিক (শীতল মরুভূমি)'),
      o('sahara', 'The Sahara (hot desert)', 'সাহারা (উষ্ণ মরুভূমি)'),
    ],
    explain: { en: 'The Sahara is the largest hot desert and third-largest overall, behind the cold deserts of Antarctica and the Arctic.', bn: 'সাহারা সবচেয়ে বড় উষ্ণ মরুভূমি, আর সব মিলিয়ে তৃতীয়; অ্যান্টার্কটিকা আর আর্কটিকের শীতল মরুভূমির পরে।' },
  },
  'we.sahara.s2': {
    kind: 'compare',
    measure: { en: 'Share of the Sahara', bn: 'সাহারার কতটা অংশ' },
    predict: { en: 'Predict: what covers more of the Sahara?', bn: 'অনুমান করো: সাহারার বেশি অংশ জুড়ে কী আছে?' },
    expect: 'other',
    conditions: [
      c('dunes', 'Sand dunes', 'বালিয়াড়ি', 1, 'About a quarter of the desert.', 'মরুভূমির প্রায় এক-চতুর্থাংশ।'),
      c('other', 'Rock, gravel plains, mountains, plateaus and salt flats', 'পাথর, নুড়ির সমভূমি, পাহাড়, মালভূমি আর লবণের মাঠ', 3, 'About three quarters of the desert.', 'মরুভূমির প্রায় তিন-চতুর্থাংশ।'),
    ],
    explain: { en: 'Dunes cover only about 25% of the Sahara; the rest is mountains, plateaus, gravel plains and salt flats.', bn: 'বালিয়াড়ি সাহারার মাত্র প্রায় ২৫% জুড়ে; বাকিটা পাহাড়, মালভূমি, নুড়ির সমভূমি আর লবণের মাঠ।' },
  },
  'we.sahara.s3': {
    kind: 'compare',
    measure: { en: 'Water found', bn: 'পানি পাওয়া গেছে' },
    predict: { en: 'Predict: where will you find water?', bn: 'অনুমান করো: কোথায় পানি পাবে?' },
    expect: 'well',
    conditions: [
      c('well', 'The well beside the palms', 'খেজুর গাছের পাশের কুয়া', 4, 'The bucket comes up full.', 'বালতি ভরে ওঠে।'),
      c('dune', 'Digging into a dune', 'বালিয়াড়ি খুঁড়ে', 0, 'Only dry sand.', 'শুধু শুকনো বালি।'),
      c('plain', 'The stony plain', 'পাথুরে সমভূমি', 0, 'Dry rock and gravel.', 'শুকনো পাথর আর নুড়ি।'),
    ],
    explain: { en: 'Palm trees and crops can grow only where there is a spring, a well or a stream. Those spots are oases.', bn: 'খেজুর গাছ আর ফসল জন্মাতে পারে কেবল যেখানে ঝরনা, কুয়া বা নালা আছে। সেসব জায়গাই মরূদ্যান।' },
  },
  'we.sahara.s4': {
    kind: 'compare',
    measure: { en: 'Amount in the hump', bn: 'কুঁজে কতটা আছে' },
    predict: { en: 'Predict: what is a camel\'s hump mostly made of?', bn: 'অনুমান করো: উটের কুঁজ মূলত কী দিয়ে তৈরি?' },
    expect: 'fat',
    conditions: [
      c('fat', 'Fat', 'চর্বি', 4, 'Most of the hump.', 'কুঁজের বেশিরভাগ।'),
      c('water', 'Stored water', 'জমানো পানি', 0, 'The hump is not a water tank.', 'কুঁজ পানির ট্যাংক নয়।'),
    ],
    explain: { en: 'The hump stores fat, which the camel can use for energy between meals.', bn: 'কুঁজে চর্বি জমা থাকে, যা উট দুই বেলার খাবারের মাঝে শক্তির জন্য ব্যবহার করতে পারে।' },
  },
  'we.sahara.s5': {
    kind: 'order',
    prompt: { en: 'Put the steps of the Sahara\'s green cycle in order.', bn: 'সাহারার সবুজ হয়ে ওঠার চক্রের ধাপগুলো ক্রমানুসারে সাজাও।' },
    items: [
      o('tilt', 'Earth\'s axis tilts the north a little closer to the Sun', 'পৃথিবীর অক্ষ উত্তর দিককে সূর্যের একটু কাছে হেলিয়ে দেয়'),
      o('monsoon', 'Monsoon rains increase', 'বর্ষার বৃষ্টি বেড়ে যায়'),
      o('green', 'The Sahara becomes a lush, green landscape', 'সাহারা সবুজ, সতেজ ভূমিতে পরিণত হয়'),
      o('dry', 'Thousands of years later it dries back into desert', 'হাজার হাজার বছর পর এটা আবার শুকিয়ে মরুভূমি হয়ে যায়'),
    ],
    explain: { en: 'A small change in Earth\'s tilt increased the monsoon rains; the Sahara switches between desert and green about every 20,000 years.', bn: 'পৃথিবীর হেলে থাকার সামান্য পরিবর্তনে বর্ষার বৃষ্টি বেড়েছিল; প্রায় প্রতি ২০,০০০ বছরে সাহারা মরুভূমি আর সবুজের মধ্যে বদলায়।' },
  },
})

/** Station objective prefix → interaction (station objectives look like `we.sundarbans.s1.<slug>`). */
export const interactionFor = (objective) => INTERACTIONS[objective.split('.').slice(0, 3).join('.')] ?? null
