/**
 * World Explorer 3D: Amazon Rainforest expedition (wave 1, ages 12+).
 * Five stations (Observe → Investigate → Explain → Record) and two 5-question report sets.
 *
 * STATUS: draft, AWAITING science-accuracy review AND Bangla review. Bangla is a first draft.
 * Every fact is tied to a quote in ../sources.js (fetched 2026-11-02).
 */
import { a, d, reportItem, station } from '../build.js'

const X = 'amazon'

export const AMAZON_STATIONS = [
  station(X, {
    n: 1, slug: 'undescribed', skill: 'identify', src: 'amazonWwf',
    quote: 'It contains millions of species, most of them still undescribed.',
    title: ['Count the kinds', 'প্রজাতি গোনো'],
    observe: ['Mark out one small square of forest and look closely at every leaf, trunk and patch of ground.', 'বনের একটি ছোট বর্গ চিহ্নিত করো, আর প্রতিটি পাতা, গুঁড়ি আর মাটির অংশ খুঁটিয়ে দেখো।'],
    investigate: ['Try to name every kind of insect and plant in your square using the field guide.', 'মাঠ-নির্দেশিকা দেখে তোমার বর্গের প্রতিটি পোকা আর গাছের নাম খুঁজে বের করার চেষ্টা করো।'],
    finding: ['Several kinds are not in the guide at all.', 'বেশ কয়েকটি প্রজাতি নির্দেশিকায় একেবারেই নেই।'],
    hint: ['If many kinds are not in any guide yet, what does that say about how well science knows the Amazon?', 'অনেক প্রজাতি যদি এখনো কোনো নির্দেশিকায় না থাকে, তাহলে বিজ্ঞান আমাজনকে কতটা জানে?'],
    record: ['The Amazon holds millions of species, and most of them have not yet been described by science.', 'আমাজনে লক্ষ লক্ষ প্রজাতি আছে, আর তাদের বেশির ভাগ এখনো বিজ্ঞানে বর্ণিত হয়নি।'],
    prompt: ['According to WWF, what is true of most species in the Amazon?', 'WWF-এর মতে, আমাজনের বেশির ভাগ প্রজাতির ক্ষেত্রে কোনটি সত্য?'],
    answer: a('Most are still undescribed by science', 'বেশির ভাগ এখনো বিজ্ঞানে বর্ণিত হয়নি'),
    distractors: [
      d('They have all been counted and named', 'সবগুলো গোনা ও নাম দেওয়া হয়ে গেছে', 'New species are still being described; most are not yet named.', 'নতুন প্রজাতি এখনো বর্ণিত হচ্ছে; বেশির ভাগের নাম এখনো দেওয়া হয়নি।'),
      d('Most of them are already extinct', 'বেশির ভাগ ইতিমধ্যে বিলুপ্ত', 'They are living species; many simply have not been studied yet.', 'এগুলো জীবিত প্রজাতি; অনেকগুলো শুধু এখনো গবেষণা হয়নি।'),
      d('There are only a few hundred', 'মাত্র কয়েকশো আছে', 'WWF says there are millions of species.', 'WWF বলে, প্রজাতি আছে লক্ষ লক্ষ।'),
    ],
    explanation: ['WWF says the Amazon contains millions of species, most of them still undescribed: science has not yet named them.', 'WWF বলে, আমাজনে লক্ষ লক্ষ প্রজাতি আছে, যাদের বেশির ভাগ এখনো অবর্ণিত: বিজ্ঞান এখনো তাদের নাম দেয়নি।'],
  }),
  station(X, {
    n: 2, slug: 'canopy', skill: 'compare', src: 'rainforestLayers',
    quote: 'The canopy, the top layer of the rainforest, receives most of the sun’s rays with only a few emergent trees towering higher.',
    title: ['Up in the canopy', 'চাঁদোয়ার ওপরে'],
    observe: ['From this platform high in the trees you can see a roof of leaves, with a few giant trees poking above it.', 'গাছের ওপরের এই মাচা থেকে পাতার একটা ছাদ দেখা যায়, তার ওপর মাথা তুলেছে কয়েকটি বিশাল গাছ।'],
    investigate: ['Read the light meter up here, then compare it with the reading you took on the forest floor.', 'এখানে আলো-মাপক দেখো, তারপর বনের মেঝেতে নেওয়া মাপের সাথে তুলনা করো।'],
    finding: ['It is far brighter up here than on the ground.', 'মাটির চেয়ে এখানে অনেক বেশি আলো।'],
    hint: ['The top layer of leaves meets the sunlight first.', 'সবচেয়ে ওপরের পাতার স্তর সবার আগে সূর্যের আলো পায়।'],
    record: ['The canopy is the top layer of the rainforest and receives most of the sun\'s rays.', 'চাঁদোয়া হলো বৃষ্টিবনের সবচেয়ে ওপরের স্তর, আর সূর্যের বেশির ভাগ আলো এটিই পায়।'],
    prompt: ['Which layer of the rainforest receives most of the sun\'s rays?', 'বৃষ্টিবনের কোন স্তর সূর্যের বেশির ভাগ আলো পায়?'],
    answer: a('The canopy', 'চাঁদোয়া (ক্যানোপি)'),
    distractors: [
      d('The forest floor', 'বনের মেঝে', 'The floor is the darkest layer; leaves above block the light.', 'মেঝে সবচেয়ে অন্ধকার স্তর; ওপরের পাতা আলো আটকে দেয়।'),
      d('The understory', 'নিম্নস্তর (আন্ডারস্টোরি)', 'The understory is dim because the canopy shades it.', 'চাঁদোয়ার ছায়ায় নিম্নস্তর আবছা।'),
      d('All layers get the same light', 'সব স্তর সমান আলো পায়', 'Your light meter showed a big difference between top and bottom.', 'তোমার আলো-মাপকে ওপর আর নিচের মধ্যে বড় পার্থক্য দেখা গেছে।'),
    ],
    explanation: ['The canopy is the top layer and receives most of the sun\'s rays; only a few emergent trees tower higher.', 'চাঁদোয়া সবচেয়ে ওপরের স্তর আর সূর্যের বেশির ভাগ আলো পায়; শুধু কয়েকটি উদীয়মান গাছ তার চেয়েও উঁচু।'],
  }),
  station(X, {
    n: 3, slug: 'leaf-litter', skill: 'cause-effect', src: 'rainforestLayers',
    quote: 'A thin layer of leaf litter coats the forest floor, which is home to decomposers such as fungi, insects and microorganisms.',
    title: ['The forest floor', 'বনের মেঝে'],
    observe: ['It is dark down here. A thin layer of fallen leaves covers the ground, and few plants grow.', 'নিচে অন্ধকার। ঝরা পাতার পাতলা স্তরে মাটি ঢাকা, গাছপালা কম।'],
    investigate: ['Gently lift some leaves and look underneath with the hand lens.', 'কিছু পাতা আলতো করে তুলে আতশ কাচ দিয়ে নিচে দেখো।'],
    finding: ['Fungi threads, tiny insects and soft, crumbling old leaves.', 'ছত্রাকের সুতা, ছোট পোকা আর নরম, ঝুরঝুরে পুরনো পাতা।'],
    hint: ['Old leaves are crumbling away. Which living things break dead things down?', 'পুরনো পাতা ঝুরঝুরে হয়ে যাচ্ছে। কোন জীব মৃত জিনিস ভেঙে ফেলে?'],
    record: ['The leaf litter on the forest floor is home to decomposers such as fungi, insects and microorganisms.', 'বনের মেঝের ঝরা পাতায় থাকে ছত্রাক, পোকা আর অণুজীবের মতো বিয়োজক।'],
    prompt: ['What lives in the leaf litter and breaks down the fallen leaves?', 'ঝরা পাতায় কারা থাকে আর পাতাগুলো ভেঙে ফেলে?'],
    answer: a('Decomposers such as fungi, insects and microorganisms', 'ছত্রাক, পোকা আর অণুজীবের মতো বিয়োজক'),
    distractors: [
      d('Nothing: the forest floor is lifeless', 'কিছুই না: বনের মেঝে প্রাণহীন', 'It can be hard to notice, but the floor is teeming with life.', 'চোখে পড়া কঠিন হলেও মেঝে প্রাণে ভরা।'),
      d('Mostly tall flowering plants', 'বেশির ভাগই লম্বা ফুলগাছ', 'Very few plants grow in the dark forest floor layer.', 'অন্ধকার মেঝেতে খুব কম গাছ জন্মায়।'),
      d('Only large cats such as jaguars', 'শুধু জাগুয়ারের মতো বড় বিড়াল', 'Big cats hunt in the forest, but they do not break down leaves.', 'বড় বিড়াল বনে শিকার করে, কিন্তু পাতা ভাঙে না।'),
    ],
    explanation: ['The leaf litter on the forest floor is home to decomposers such as fungi, insects and microorganisms, which break down dead material.', 'বনের মেঝের ঝরা পাতায় ছত্রাক, পোকা আর অণুজীবের মতো বিয়োজক থাকে, যারা মৃত জিনিস ভেঙে ফেলে।'],
  }),
  station(X, {
    n: 4, slug: 'trees-make-rain', skill: 'cause-effect', src: 'amazonRain',
    quote: 'more than half of the Amazon\'s rainfall emanates from trees, with the rest coming from vapor from surface water bodies.',
    title: ['Trees that make rain', 'যে গাছ বৃষ্টি বানায়'],
    observe: ['In the morning, mist rises from the treetops like steam.', 'সকালে গাছের মাথা থেকে বাষ্পের মতো কুয়াশা ওঠে।'],
    investigate: ['Tie a clear plastic bag around a leafy branch and come back after an hour.', 'পাতাওয়ালা একটি ডালে স্বচ্ছ প্লাস্টিকের ব্যাগ বেঁধে এক ঘণ্টা পরে ফিরে এসো।'],
    finding: ['Water droplets have collected inside the bag. The leaves gave off water.', 'ব্যাগের ভেতরে পানির ফোঁটা জমেছে। পাতা পানি ছেড়েছে।'],
    hint: ['Trees pull water up from their roots. Where does some of it go after that?', 'গাছ শিকড় দিয়ে পানি টেনে তোলে। তারপর তার কিছুটা কোথায় যায়?'],
    record: ['Trees draw water from their roots and release some into the air; more than half of the Amazon\'s rain comes from its trees.', 'গাছ শিকড় দিয়ে পানি টেনে তার কিছুটা বাতাসে ছাড়ে; আমাজনের অর্ধেকেরও বেশি বৃষ্টি আসে তার গাছ থেকে।'],
    prompt: ['Where does more than half of the Amazon\'s rainfall come from?', 'আমাজনের অর্ধেকেরও বেশি বৃষ্টি কোথা থেকে আসে?'],
    answer: a('Water released into the air by the forest\'s trees', 'বনের গাছের বাতাসে ছাড়া পানি থেকে'),
    distractors: [
      d('Melting glaciers', 'গলে যাওয়া হিমবাহ', 'Glaciers are not the main source of rain over the forest.', 'বনের ওপর বৃষ্টির মূল উৎস হিমবাহ নয়।'),
      d('Only from the ocean, never from the forest', 'শুধু সাগর থেকে, বন থেকে কখনো নয়', 'Measurements show the trees themselves supply more than half the rain.', 'মাপজোখে দেখা যায়, অর্ধেকের বেশি বৃষ্টি গাছই জোগায়।'),
      d('Water pumped up by volcanoes', 'আগ্নেয়গিরির তোলা পানি', 'Volcanoes are not a source of the Amazon\'s rain.', 'আগ্নেয়গিরি আমাজনের বৃষ্টির উৎস নয়।'),
    ],
    explanation: ['Trees draw water up from their roots and transpire some back into the air. More than half of the Amazon\'s rainfall comes from its trees.', 'গাছ শিকড় দিয়ে পানি তুলে তার কিছুটা প্রস্বেদনে বাতাসে ফিরিয়ে দেয়। আমাজনের অর্ধেকেরও বেশি বৃষ্টি আসে গাছ থেকে।'],
  }),
  station(X, {
    n: 5, slug: 'clearing', skill: 'predict', src: 'amazonRain',
    quote: 'So if the trees are chopped down, the rainfall rates could be reduced through this mechanism,',
    title: ['The cleared patch', 'কেটে ফেলা জায়গা'],
    observe: ['Here the trees have been cut down. Only stumps and bare ground are left.', 'এখানে গাছ কেটে ফেলা হয়েছে। শুধু গুঁড়ি আর খালি মাটি পড়ে আছে।'],
    investigate: ['Tie a plastic bag over a stump and over bare soil, the same way as at the last station.', 'আগের স্টেশনের মতো করে একটি গুঁড়ি আর খালি মাটির ওপর প্লাস্টিকের ব্যাগ বাঁধো।'],
    finding: ['With no leaves, almost no water collects in the bags.', 'পাতা না থাকায় ব্যাগে প্রায় কোনো পানি জমে না।'],
    hint: ['Remember where more than half of the rain came from. What happens if those trees are gone?', 'মনে করো, অর্ধেকের বেশি বৃষ্টি কোথা থেকে আসত। সেই গাছগুলো না থাকলে কী হবে?'],
    record: ['If the trees are chopped down, rainfall could be reduced, because the trees supply much of the rain.', 'গাছ কেটে ফেললে বৃষ্টি কমে যেতে পারে, কারণ বৃষ্টির বড় অংশ গাছই জোগায়।'],
    prompt: ['If large areas of Amazon trees are cut down, what could happen to rainfall there?', 'আমাজনের বিশাল এলাকার গাছ কেটে ফেললে সেখানে বৃষ্টির কী হতে পারে?'],
    answer: a('It could decrease', 'বৃষ্টি কমে যেতে পারে'),
    distractors: [
      d('It would increase, because more sky is open', 'বাড়বে, কারণ আকাশ বেশি খোলা থাকবে', 'Open sky does not make rain; the trees supplied much of the water vapour.', 'খোলা আকাশ বৃষ্টি বানায় না; জলীয় বাষ্পের বড় অংশ গাছই জোগাত।'),
      d('It would stay exactly the same', 'ঠিক একই থাকবে', 'The trees are part of the rain cycle here, so removing them matters.', 'এখানে গাছ বৃষ্টিচক্রের অংশ, তাই এদের সরালে প্রভাব পড়ে।'),
      d('It would turn into snow', 'তুষারে পরিণত হবে', 'Cutting trees does not make the tropics cold enough for snow.', 'গাছ কাটলে গ্রীষ্মমণ্ডল তুষারের মতো ঠান্ডা হয় না।'),
    ],
    explanation: ['Because trees supply much of the Amazon\'s rain, scientists warn that if the trees are chopped down, rainfall could be reduced.', 'আমাজনের বৃষ্টির বড় অংশ গাছই জোগায়, তাই বিজ্ঞানীরা সতর্ক করেন: গাছ কেটে ফেললে বৃষ্টি কমে যেতে পারে।'],
  }),
]

export const AMAZON_REPORT_A = [
  reportItem(X, 'A', {
    n: 1, slug: 'diverse', skill: 'identify', src: 'amazonWwf',
    quote: 'It is the world’s largest rainforest and river system, and the most biologically diverse place on Earth.',
    prompt: ['WWF describes the Amazon as the world\'s largest rainforest and the most ___ place on Earth.', 'WWF আমাজনকে বলে পৃথিবীর সবচেয়ে বড় বৃষ্টিবন এবং পৃথিবীর সবচেয়ে ___ জায়গা।'],
    answer: a('biologically diverse', 'জীববৈচিত্র্যপূর্ণ'),
    distractors: [
      d('dry', 'শুষ্ক', 'The Amazon is a rainforest, one of the wettest places.', 'আমাজন বৃষ্টিবন, সবচেয়ে ভেজা জায়গাগুলোর একটি।'),
      d('cold', 'ঠান্ডা', 'The Amazon is a tropical, warm forest.', 'আমাজন গ্রীষ্মমণ্ডলীয়, উষ্ণ বন।'),
      d('empty of animals', 'প্রাণীশূন্য', 'It holds millions of species.', 'এখানে লক্ষ লক্ষ প্রজাতি আছে।'),
    ],
    explanation: ['WWF calls the Amazon the world\'s largest rainforest and river system and the most biologically diverse place on Earth.', 'WWF আমাজনকে বলে পৃথিবীর সবচেয়ে বড় বৃষ্টিবন ও নদীব্যবস্থা এবং পৃথিবীর সবচেয়ে জীববৈচিত্র্যপূর্ণ জায়গা।'],
  }),
  reportItem(X, 'A', {
    n: 2, slug: 'floor-darkest', skill: 'compare', src: 'rainforestLayers',
    quote: 'The forest floor is even darker than the understory.',
    prompt: ['Which is darker: the understory or the forest floor?', 'কোনটি বেশি অন্ধকার: নিম্নস্তর না বনের মেঝে?'],
    answer: a('The forest floor', 'বনের মেঝে'),
    distractors: [
      d('The understory', 'নিম্নস্তর', 'The understory is dim, but the floor below it is darker still.', 'নিম্নস্তর আবছা, কিন্তু তার নিচের মেঝে আরও অন্ধকার।'),
      d('They are equally bright', 'দুটো সমান উজ্জ্বল', 'Each layer down receives less light.', 'প্রতিটি নিচের স্তর কম আলো পায়।'),
      d('Both are brighter than the canopy', 'দুটোই চাঁদোয়ার চেয়ে উজ্জ্বল', 'The canopy receives most of the sunlight.', 'সূর্যের বেশির ভাগ আলো পায় চাঁদোয়া।'),
    ],
    explanation: ['The understory is dim, and the forest floor is even darker.', 'নিম্নস্তর আবছা, আর বনের মেঝে তার চেয়েও অন্ধকার।'],
  }),
  reportItem(X, 'A', {
    n: 3, slug: 'one-tree', skill: 'identify', src: 'amazonRain',
    quote: 'a single large tree in the center of the Amazon forest can give off up to 317 quarts (300 liters) of water in a day.',
    prompt: ['How much water can a single large Amazon tree give off in one day?', 'আমাজনের একটি বড় গাছ এক দিনে কতটা পানি ছাড়তে পারে?'],
    answer: a('Up to about 300 litres', 'প্রায় ৩০০ লিটার পর্যন্ত'),
    distractors: [
      d('About 3 litres', 'প্রায় ৩ লিটার', 'A large tree gives off far more, about a hundred times as much.', 'একটি বড় গাছ এর চেয়ে অনেক বেশি, প্রায় একশো গুণ ছাড়ে।'),
      d('None: trees only take water in', 'একটুও না: গাছ শুধু পানি নেয়', 'Trees transpire water back into the air.', 'গাছ প্রস্বেদনে পানি বাতাসে ফিরিয়ে দেয়।'),
      d('About 30,000 litres', 'প্রায় ৩০,০০০ লিটার', 'That is a hundred times too much for one tree in a day.', 'এক দিনে একটি গাছের জন্য এটা একশো গুণ বেশি।'),
    ],
    explanation: ['National Geographic reports that one large Amazon tree can give off up to about 300 litres of water in a day.', 'ন্যাশনাল জিওগ্রাফিক জানায়, আমাজনের একটি বড় গাছ দিনে প্রায় ৩০০ লিটার পর্যন্ত পানি ছাড়তে পারে।'],
  }),
  reportItem(X, 'A', {
    n: 4, slug: 'transpire-roots', skill: 'cause-effect', src: 'amazonRain',
    quote: 'In a process called evapotranspiration, trees draw water from their roots and then "transpire" some of that water back into the air.',
    prompt: ['Trees "transpire" water into the air. Where does that water come from first?', 'গাছ পানি "প্রস্বেদন" করে বাতাসে ছাড়ে। সেই পানি প্রথমে আসে কোথা থেকে?'],
    answer: a('It is drawn up from the soil through the roots', 'শিকড় দিয়ে মাটি থেকে টেনে তোলা হয়'),
    distractors: [
      d('It is made inside the leaves from sunlight', 'সূর্যের আলো থেকে পাতার ভেতরে তৈরি হয়', 'Leaves use sunlight to make food, not water; the water comes up from the roots.', 'পাতা সূর্যের আলো দিয়ে খাবার বানায়, পানি নয়; পানি আসে শিকড় দিয়ে।'),
      d('It is caught by the flowers from clouds', 'ফুল মেঘ থেকে ধরে', 'Flowers do not collect cloud water for the tree.', 'ফুল গাছের জন্য মেঘের পানি ধরে না।'),
      d('It comes out of the bark from inside the trunk where it is stored forever', 'গুঁড়ির ভেতরে চিরকাল জমা থাকা পানি ছাল দিয়ে বের হয়', 'Water keeps moving from roots to leaves and out into the air.', 'পানি শিকড় থেকে পাতায় আর সেখান থেকে বাতাসে চলতেই থাকে।'),
    ],
    explanation: ['In evapotranspiration, trees draw water from their roots and transpire some of it back into the air.', 'প্রস্বেদন-বাষ্পীভবনে গাছ শিকড় দিয়ে পানি টেনে তার কিছুটা বাতাসে ফিরিয়ে দেয়।'],
  }),
  reportItem(X, 'A', {
    n: 5, slug: 'canopy-shade', skill: 'cause-effect', src: 'rainforestLayers',
    quote: 'Its dense layer of leaves and branches provide shade for the lower layers.',
    prompt: ['Why do very few plants grow on the forest floor?', 'বনের মেঝেতে খুব কম গাছ জন্মায় কেন?'],
    answer: a('The canopy\'s dense leaves shade the layers below', 'চাঁদোয়ার ঘন পাতা নিচের স্তরগুলোকে ছায়া দেয়'),
    distractors: [
      d('The soil is frozen', 'মাটি জমে বরফ', 'The rainforest is warm; the problem is shade, not frost.', 'বৃষ্টিবন উষ্ণ; সমস্যা ছায়া, বরফ নয়।'),
      d('It never rains there', 'সেখানে কখনো বৃষ্টি হয় না', 'It is a rainforest; light, not water, is what the floor lacks.', 'এটা বৃষ্টিবন; মেঝেতে অভাব আলোর, পানির নয়।'),
      d('Animals eat every seed at once', 'প্রাণীরা সব বীজ সাথে সাথে খেয়ে ফেলে', 'Animals eat some seeds, but the main reason is the deep shade.', 'প্রাণী কিছু বীজ খায়, কিন্তু মূল কারণ গভীর ছায়া।'),
    ],
    explanation: ['The canopy\'s dense layer of leaves and branches shades the lower layers, so the floor gets little light.', 'চাঁদোয়ার ঘন পাতা আর ডাল নিচের স্তরকে ছায়া দেয়, তাই মেঝে খুব কম আলো পায়।'],
  }),
]

export const AMAZON_REPORT_B = [
  reportItem(X, 'B', {
    n: 1, slug: 'canopy-animals', skill: 'identify', src: 'rainforestLayers',
    quote: 'The canopy is home to many animals such as birds and monkeys that live and eat in the treetops.',
    prompt: ['Which animals live and eat in the canopy?', 'কোন প্রাণীরা চাঁদোয়ায় থাকে আর খায়?'],
    answer: a('Birds and monkeys', 'পাখি ও বানর'),
    distractors: [
      d('Fish and crabs', 'মাছ ও কাঁকড়া', 'These live in water, not in the treetops.', 'এরা পানিতে থাকে, গাছের মাথায় নয়।'),
      d('Camels', 'উট', 'Camels live in deserts.', 'উট থাকে মরুভূমিতে।'),
      d('Penguins', 'পেঙ্গুইন', 'Penguins live in cold southern seas.', 'পেঙ্গুইন থাকে দক্ষিণের ঠান্ডা সাগরে।'),
    ],
    explanation: ['The canopy is home to many animals, such as birds and monkeys, that live and eat in the treetops.', 'চাঁদোয়ায় পাখি আর বানরের মতো অনেক প্রাণী থাকে, যারা গাছের মাথায় বাস করে ও খায়।'],
  }),
  reportItem(X, 'B', {
    n: 2, slug: 'understory', skill: 'compare', src: 'rainforestLayers',
    quote: 'The understory is a dim environment with shorter plants than those that reach the canopy.',
    prompt: ['What is the understory like?', 'নিম্নস্তর (আন্ডারস্টোরি) কেমন?'],
    answer: a('Dim, with plants shorter than the canopy trees', 'আবছা, আর চাঁদোয়ার গাছের চেয়ে খাটো গাছপালা'),
    distractors: [
      d('The brightest layer of the forest', 'বনের সবচেয়ে উজ্জ্বল স্তর', 'The canopy above it gets most of the light.', 'এর ওপরের চাঁদোয়া বেশির ভাগ আলো পায়।'),
      d('Above the canopy', 'চাঁদোয়ার ওপরে', 'The understory is below the canopy.', 'নিম্নস্তর চাঁদোয়ার নিচে।'),
      d('Underground, among the roots', 'মাটির নিচে, শিকড়ের মাঝে', 'The understory is above the forest floor, among shorter plants.', 'নিম্নস্তর বনের মেঝের ওপরে, খাটো গাছপালার মাঝে।'),
    ],
    explanation: ['The understory is a dim layer with plants shorter than those that reach the canopy.', 'নিম্নস্তর একটি আবছা স্তর, যেখানকার গাছ চাঁদোয়া পর্যন্ত পৌঁছানো গাছের চেয়ে খাটো।'],
  }),
  reportItem(X, 'B', {
    n: 3, slug: 'new-species', skill: 'identify', src: 'amazonWwf',
    quote: 'Over 2,000 new species of plants and vertebrates, including a monkey that purrs like a cat, have been described since 1999.',
    prompt: ['About how many new plant and vertebrate species have been described in the Amazon since 1999?', '১৯৯৯ সাল থেকে আমাজনে প্রায় কতগুলো নতুন উদ্ভিদ ও মেরুদণ্ডী প্রজাতি বর্ণিত হয়েছে?'],
    answer: a('Over 2,000', '২,০০০-এর বেশি'),
    distractors: [
      d('None: all were already known', 'একটিও না: সবই আগে জানা ছিল', 'Scientists keep describing new species there.', 'বিজ্ঞানীরা সেখানে নতুন প্রজাতি বর্ণনা করেই চলেছেন।'),
      d('About 20', 'প্রায় ২০', 'The number is about a hundred times larger.', 'সংখ্যাটি প্রায় একশো গুণ বড়।'),
      d('Exactly 1999', 'ঠিক ১৯৯৯টি', '1999 is the starting year, not the number of species.', '১৯৯৯ হলো শুরুর বছর, প্রজাতির সংখ্যা নয়।'),
    ],
    explanation: ['WWF reports that over 2,000 new species of plants and vertebrates have been described in the Amazon since 1999.', 'WWF জানায়, ১৯৯৯ সাল থেকে আমাজনে ২,০০০-এর বেশি নতুন উদ্ভিদ ও মেরুদণ্ডী প্রজাতি বর্ণিত হয়েছে।'],
  }),
  reportItem(X, 'B', {
    n: 4, slug: 'macaws', skill: 'identify', src: 'amazonWwf',
    quote: 'Macaws, an icon of the Amazon, are highly intelligent and social, living in flocks of 10 to 30 birds.',
    prompt: ['How do macaws usually live?', 'ম্যাকাও সাধারণত কীভাবে থাকে?'],
    answer: a('In flocks of about 10 to 30 birds', 'প্রায় ১০ থেকে ৩০টি পাখির ঝাঁকে'),
    distractors: [
      d('Always alone', 'সবসময় একা', 'Macaws are social birds.', 'ম্যাকাও সামাজিক পাখি।'),
      d('In herds of thousands on the ground', 'মাটিতে হাজারো পাখির পালে', 'They live in flocks of 10 to 30, mostly in the trees.', 'এরা ১০ থেকে ৩০টির ঝাঁকে থাকে, বেশির ভাগ গাছে।'),
      d('Underwater in rivers', 'নদীর পানির নিচে', 'Macaws are birds of the forest, not the water.', 'ম্যাকাও বনের পাখি, পানির নয়।'),
    ],
    explanation: ['WWF describes macaws as intelligent, social birds living in flocks of 10 to 30.', 'WWF ম্যাকাওকে বুদ্ধিমান, সামাজিক পাখি বলে, যারা ১০ থেকে ৩০টির ঝাঁকে থাকে।'],
  }),
  reportItem(X, 'B', {
    n: 5, slug: 'rainfall-decline', skill: 'identify', src: 'amazonWwf',
    quote: 'Since the year 2000, rainfall has declined across 69% of the Amazon forest.',
    prompt: ['Since 2000, what has happened to rainfall across most of the Amazon forest?', '২০০০ সাল থেকে আমাজন বনের বেশির ভাগ জায়গায় বৃষ্টির কী হয়েছে?'],
    answer: a('It has declined across about 69% of the forest', 'বনের প্রায় ৬৯% জায়গায় কমেছে'),
    distractors: [
      d('It has increased everywhere', 'সব জায়গায় বেড়েছে', 'WWF reports a decline across most of the forest.', 'WWF বেশির ভাগ বনে বৃষ্টি কমার কথা জানায়।'),
      d('It has not changed anywhere', 'কোথাও বদলায়নি', 'Rainfall has declined across 69% of the forest.', 'বনের ৬৯% জায়গায় বৃষ্টি কমেছে।'),
      d('It has turned into snow', 'তুষারে পরিণত হয়েছে', 'The Amazon is tropical; the change is less rain.', 'আমাজন গ্রীষ্মমণ্ডলীয়; পরিবর্তনটা হলো কম বৃষ্টি।'),
    ],
    explanation: ['WWF reports that since 2000, rainfall has declined across 69% of the Amazon forest.', 'WWF জানায়, ২০০০ সাল থেকে আমাজন বনের ৬৯% জায়গায় বৃষ্টি কমেছে।'],
  }),
]

export const AMAZON_ITEMS = Object.freeze([...AMAZON_STATIONS, ...AMAZON_REPORT_A, ...AMAZON_REPORT_B])
