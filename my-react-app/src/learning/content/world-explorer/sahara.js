/**
 * World Explorer 3D: Sahara Desert expedition (wave 1, ages 12+).
 * Five stations (Observe → Investigate → Explain → Record) and two 5-question report sets.
 *
 * STATUS: draft, AWAITING science-accuracy review AND Bangla review. Bangla is a first draft.
 * Every fact is tied to a quote in ../sources.js (fetched 2026-11-02).
 */
import { a, d, reportItem, station } from '../build.js'

const X = 'sahara'

export const SAHARA_STATIONS = [
  station(X, {
    n: 1, slug: 'largest-hot', skill: 'compare', src: 'sahara',
    quote: 'third-largest desert overall, behind the cold deserts of Antarctica and the Arctic.',
    title: ['How big is it?', 'কত বড়?'],
    observe: ['From the top of this ridge the desert stretches to the horizon in every direction.', 'এই শৈলশিরার মাথা থেকে মরুভূমি সব দিকে দিগন্ত পর্যন্ত ছড়িয়ে আছে।'],
    investigate: ['Open the map and compare the Sahara with the world\'s other big deserts, hot and cold.', 'মানচিত্র খুলে সাহারাকে পৃথিবীর অন্য বড় মরুভূমিগুলোর সাথে, গরম ও ঠান্ডা দুই ধরনেরই, তুলনা করো।'],
    finding: ['No hot desert is bigger. Two cold, polar deserts are bigger still.', 'কোনো গরম মরুভূমি এর চেয়ে বড় নয়। তবে দুটি ঠান্ডা, মেরু মরুভূমি আরও বড়।'],
    hint: ['A desert is a place with very little rain. Some deserts are icy, not hot.', 'মরুভূমি মানে খুব কম বৃষ্টির জায়গা। কিছু মরুভূমি বরফের, গরম নয়।'],
    record: ['The Sahara is the largest hot desert in the world, and the third-largest desert overall.', 'সাহারা পৃথিবীর সবচেয়ে বড় গরম মরুভূমি, আর সব মিলিয়ে তৃতীয় বৃহত্তম মরুভূমি।'],
    prompt: ['Which statement about the Sahara\'s size is correct?', 'সাহারার আকার নিয়ে কোন কথাটি ঠিক?'],
    answer: a('It is the largest HOT desert, and third-largest overall', 'এটি সবচেয়ে বড় গরম মরুভূমি, আর সব মিলিয়ে তৃতীয় বৃহত্তম'),
    distractors: [
      d('It is the largest desert of any kind', 'এটি সব ধরনের মরুভূমির মধ্যে সবচেয়ে বড়', 'Two cold, polar deserts are larger; the Sahara is the largest hot one.', 'দুটি ঠান্ডা, মেরু মরুভূমি এর চেয়ে বড়; সাহারা সবচেয়ে বড় গরম মরুভূমি।'),
      d('It is a small desert, about the size of one city', 'এটি একটি শহরের সমান ছোট মরুভূমি', 'It covers an area about the size of the United States.', 'এর আয়তন প্রায় যুক্তরাষ্ট্রের সমান।'),
      d('It is the largest cold desert', 'এটি সবচেয়ে বড় ঠান্ডা মরুভূমি', 'The Sahara is a hot desert.', 'সাহারা একটি গরম মরুভূমি।'),
    ],
    explanation: ['The Sahara is the largest hot desert in the world and the third-largest desert overall; the two bigger ones are the cold deserts of Antarctica and the Arctic.', 'সাহারা পৃথিবীর সবচেয়ে বড় গরম মরুভূমি আর সব মিলিয়ে তৃতীয় বৃহত্তম; এর চেয়ে বড় দুটি হলো অ্যান্টার্কটিকা আর আর্কটিকের ঠান্ডা মরুভূমি।'],
  }),
  station(X, {
    n: 2, slug: 'not-all-sand', skill: 'identify', src: 'sahara',
    quote: 'The dunes can reach almost 600 feet (183 meters) high, and they cover about 25% of the entire desert',
    title: ['Not all sand', 'সবটাই বালি নয়'],
    observe: ['Tall dunes rise on one side. On the other side is a flat plain of stones and gravel.', 'এক পাশে উঁচু বালিয়াড়ি। অন্য পাশে পাথর আর নুড়ির সমতল প্রান্তর।'],
    investigate: ['Look at the survey map that colours dunes yellow and everything else grey.', 'জরিপের মানচিত্রটি দেখো, যেখানে বালিয়াড়ি হলুদ আর বাকি সব ধূসর রঙে।'],
    finding: ['Only about one quarter of the map is yellow.', 'মানচিত্রের মাত্র প্রায় এক-চতুর্থাংশ হলুদ।'],
    hint: ['Look at how much of the map is yellow compared with grey.', 'ধূসরের তুলনায় মানচিত্রের কতটা হলুদ, দেখো।'],
    record: ['Sand dunes cover only about a quarter (25%) of the Sahara; the rest includes rock, gravel plains and salt flats.', 'বালিয়াড়ি সাহারার মাত্র প্রায় এক-চতুর্থাংশ (২৫%) ঢেকে রাখে; বাকিটায় আছে পাথর, নুড়ির প্রান্তর আর লবণ-সমতল।'],
    prompt: ['About how much of the Sahara is covered by sand dunes?', 'সাহারার প্রায় কতটা বালিয়াড়িতে ঢাকা?'],
    answer: a('About a quarter (25%)', 'প্রায় এক-চতুর্থাংশ (২৫%)'),
    distractors: [
      d('All of it', 'পুরোটাই', 'Pictures often show dunes, but most of the Sahara is rock and gravel.', 'ছবিতে প্রায়ই বালিয়াড়ি দেখা যায়, কিন্তু সাহারার বেশির ভাগ পাথর আর নুড়ি।'),
      d('About three quarters', 'প্রায় তিন-চতুর্থাংশ', 'It is the other way round: about a quarter is dunes.', 'উল্টোটা: প্রায় এক-চতুর্থাংশ বালিয়াড়ি।'),
      d('None: there are no dunes', 'একটুও না: কোনো বালিয়াড়ি নেই', 'There are dunes, some almost 183 metres high.', 'বালিয়াড়ি আছে, কিছু প্রায় ১৮৩ মিটার উঁচু।'),
    ],
    explanation: ['Sand dunes cover about 25% of the Sahara. The rest includes sand- and gravel-covered plains, salt flats and basins.', 'বালিয়াড়ি সাহারার প্রায় ২৫% ঢেকে রাখে। বাকি অংশে আছে বালু ও নুড়িতে ঢাকা প্রান্তর, লবণ-সমতল আর অববাহিকা।'],
  }),
  station(X, {
    n: 3, slug: 'oasis', skill: 'cause-effect', src: 'saharaKids',
    quote: 'Palm trees and crops can be grown only where there is a spring, a well, or a stream.',
    title: ['The oasis', 'মরূদ্যান'],
    observe: ['A green patch of palm trees grows here, in the middle of bare sand and rock.', 'খালি বালি আর পাথরের মাঝখানে এখানে খেজুরগাছের একটা সবুজ টুকরো।'],
    investigate: ['Lower the bucket into the stone well beside the palms.', 'খেজুরগাছের পাশের পাথরের কুয়োয় বালতি নামাও।'],
    finding: ['The bucket comes up full of water.', 'বালতি পানিতে ভরে ওঠে।'],
    hint: ['What does the well give the palm trees that the dunes around them cannot?', 'চারপাশের বালিয়াড়ি যা দিতে পারে না, কুয়ো খেজুরগাছকে কী দেয়?'],
    record: ['In the Sahara, palm trees and crops grow only where there is a spring, a well or a stream. These spots are oases.', 'সাহারায় খেজুরগাছ আর ফসল জন্মায় শুধু যেখানে ঝরনা, কুয়ো বা স্রোতধারা আছে। এই জায়গাগুলো মরূদ্যান।'],
    prompt: ['Why do palm trees grow at this oasis but not on the dunes around it?', 'এই মরূদ্যানে খেজুরগাছ জন্মায়, কিন্তু চারপাশের বালিয়াড়িতে কেন নয়?'],
    answer: a('The oasis has water from a spring, well or stream', 'মরূদ্যানে ঝরনা, কুয়ো বা স্রোতধারার পানি আছে'),
    distractors: [
      d('It is colder at the oasis', 'মরূদ্যানে বেশি ঠান্ডা', 'The key difference is water, not temperature.', 'মূল পার্থক্য পানি, তাপমাত্রা নয়।'),
      d('Palm trees need no water at all', 'খেজুরগাছের একদম পানি লাগে না', 'They grow only where there is water.', 'এরা শুধু পানি আছে এমন জায়গায় জন্মায়।'),
      d('Sand is better soil than the oasis ground', 'মরূদ্যানের মাটির চেয়ে বালি ভালো', 'Plants cannot grow on the dunes because there is no water there.', 'বালিয়াড়িতে পানি নেই, তাই সেখানে গাছ জন্মাতে পারে না।'),
    ],
    explanation: ['In the Sahara, palm trees and crops can be grown only where there is a spring, a well or a stream. These fertile spots are called oases.', 'সাহারায় খেজুরগাছ আর ফসল শুধু সেখানেই জন্মানো যায় যেখানে ঝরনা, কুয়ো বা স্রোতধারা আছে। এই উর্বর জায়গাগুলোকে মরূদ্যান বলে।'],
  }),
  station(X, {
    n: 4, slug: 'camel-hump', skill: 'identify', src: 'sahara',
    quote: 'The humps on a camel\'s back store fat, which can be used for energy and hydration in between meals.',
    title: ['The camel\'s hump', 'উটের কুঁজ'],
    observe: ['A camel rests in the shade. It has walked a long way since its last drink.', 'একটি উট ছায়ায় বিশ্রাম নিচ্ছে। শেষবার পানি খাওয়ার পর থেকে সে অনেক পথ হেঁটেছে।'],
    investigate: ['Read the camel keeper\'s notes about what is stored in the hump.', 'কুঁজে কী জমা থাকে, সে বিষয়ে উট-পালকের নোট পড়ো।'],
    finding: ['The notes say the hump is mostly fatty tissue, not a water tank.', 'নোটে লেখা, কুঁজ মূলত চর্বি, পানির ট্যাংক নয়।'],
    hint: ['Many people think the hump is full of water. What did the keeper\'s notes say?', 'অনেকে ভাবে কুঁজ পানিতে ভরা। উট-পালকের নোটে কী লেখা ছিল?'],
    record: ['A camel\'s hump stores fat, which can be used for energy and hydration between meals.', 'উটের কুঁজে চর্বি জমা থাকে, যা দুই খাবারের মাঝে শক্তি আর পানির চাহিদা মেটাতে কাজে লাগে।'],
    prompt: ['What does a camel\'s hump store?', 'উটের কুঁজে কী জমা থাকে?'],
    answer: a('Fat', 'চর্বি'),
    distractors: [
      d('Water', 'পানি', 'A common myth: the hump stores fat, not a pool of water.', 'প্রচলিত ভুল ধারণা: কুঁজে থাকে চর্বি, পানির আধার নয়।'),
      d('Air, to help it float', 'ভেসে থাকার জন্য বাতাস', 'Camels are land animals; the hump stores fat.', 'উট ডাঙার প্রাণী; কুঁজে চর্বি জমা থাকে।'),
      d('Sand, for weight', 'ওজনের জন্য বালি', 'Animals do not store sand; the hump is fatty tissue.', 'প্রাণী বালি জমায় না; কুঁজ চর্বিযুক্ত টিস্যু।'),
    ],
    explanation: ['The humps on a camel\'s back store fat, which can be used for energy and hydration between meals. They are not water tanks.', 'উটের পিঠের কুঁজে চর্বি জমা থাকে, যা দুই খাবারের মাঝে শক্তি আর পানির চাহিদা মেটাতে কাজে লাগে। এগুলো পানির ট্যাংক নয়।'],
  }),
  station(X, {
    n: 5, slug: 'green-sahara', skill: 'cause-effect', src: 'sahara',
    quote: 'it alternates between harsh desert and another extreme — a lush, green oasis — every 20,000 years',
    title: ['A green past', 'সবুজ অতীত'],
    observe: ['A long, dry valley winds between the rocks. It looks as if water once flowed here.', 'পাথরের মাঝ দিয়ে একটি লম্বা, শুকনো উপত্যকা এঁকেবেঁকে গেছে। দেখে মনে হয় একসময় এখানে পানি বইত।'],
    investigate: ['Read the climate scientist\'s timeline on the information board.', 'তথ্য-বোর্ডে জলবায়ু বিজ্ঞানীর সময়রেখাটি পড়ো।'],
    finding: ['The timeline shows the Sahara swinging between desert and green land again and again.', 'সময়রেখায় দেখা যায়, সাহারা বারবার মরুভূমি আর সবুজ ভূমির মধ্যে বদলেছে।'],
    hint: ['The timeline repeats. Is the Sahara always a desert?', 'সময়রেখাটি বারবার ঘুরে আসে। সাহারা কি সবসময় মরুভূমি?'],
    record: ['The Sahara alternates between harsh desert and a lush, green landscape about every 20,000 years.', 'প্রায় প্রতি ২০,০০০ বছরে সাহারা কঠোর মরুভূমি আর সবুজ-শ্যামল ভূমির মধ্যে পালাবদল করে।'],
    prompt: ['What happens to the Sahara about every 20,000 years?', 'প্রায় প্রতি ২০,০০০ বছরে সাহারার কী হয়?'],
    answer: a('It switches between desert and a green landscape', 'এটি মরুভূমি আর সবুজ ভূমির মধ্যে পালাবদল করে'),
    distractors: [
      d('It freezes over completely', 'এটি পুরোপুরি জমে বরফ হয়ে যায়', 'The cycle is between dry and wet, not hot and frozen.', 'চক্রটা শুকনো আর ভেজার মধ্যে, গরম আর বরফের মধ্যে নয়।'),
      d('Nothing: it has always been exactly as dry as today', 'কিছুই না: এটি সবসময় আজকের মতোই শুকনো ছিল', 'Scientists find the Sahara has been green in the past.', 'বিজ্ঞানীরা দেখেছেন, অতীতে সাহারা সবুজ ছিল।'),
      d('It sinks under the sea', 'এটি সাগরের নিচে ডুবে যায়', 'The change is in rainfall and plants, not sea level.', 'পরিবর্তনটা বৃষ্টি আর গাছপালায়, সমুদ্রপৃষ্ঠে নয়।'),
    ],
    explanation: ['The Sahara alternates between harsh desert and a lush, green landscape about every 20,000 years.', 'প্রায় প্রতি ২০,০০০ বছরে সাহারা কঠোর মরুভূমি আর সবুজ-শ্যামল ভূমির মধ্যে পালাবদল করে।'],
  }),
]

export const SAHARA_REPORT_A = [
  reportItem(X, 'A', {
    n: 1, slug: 'rainfall', skill: 'identify', src: 'sahara',
    quote: 'Precipitation in the Sahara ranges from zero to about 3 inches (7.6 centimeters) of rain per year',
    prompt: ['How much rain does the Sahara get in a year?', 'সাহারায় বছরে কতটা বৃষ্টি হয়?'],
    answer: a('From zero to about 7.6 cm', 'শূন্য থেকে প্রায় ৭.৬ সেন্টিমিটার'),
    distractors: [
      d('About 2 metres', 'প্রায় ২ মিটার', 'That is rainforest-level rain, not desert rain.', 'এটা বৃষ্টিবনের মতো বৃষ্টি, মরুভূমির নয়।'),
      d('About 76 cm', 'প্রায় ৭৬ সেন্টিমিটার', 'That is ten times the Sahara\'s highest yearly rain.', 'এটা সাহারার সর্বোচ্চ বার্ষিক বৃষ্টির দশ গুণ।'),
      d('It rains every day', 'প্রতিদিন বৃষ্টি হয়', 'Some places get no rain at all in a year.', 'কিছু জায়গায় সারা বছরে একটুও বৃষ্টি হয় না।'),
    ],
    explanation: ['Rain in the Sahara ranges from zero to about 7.6 cm (3 inches) a year.', 'সাহারায় বছরে শূন্য থেকে প্রায় ৭.৬ সেন্টিমিটার (৩ ইঞ্চি) বৃষ্টি হয়।'],
  }),
  reportItem(X, 'A', {
    n: 2, slug: 'deep-roots', skill: 'apply', src: 'sahara',
    quote: 'roots that reach deep underground to find buried water sources',
    prompt: ['How do some Sahara plants survive with almost no rain?', 'প্রায় বৃষ্টিহীন অবস্থায় সাহারার কিছু গাছ কীভাবে বাঁচে?'],
    answer: a('Their roots reach deep underground to buried water', 'এদের শিকড় মাটির গভীরে চাপা পড়া পানি পর্যন্ত পৌঁছায়'),
    distractors: [
      d('They drink sea water through their leaves', 'পাতা দিয়ে সাগরের পানি খায়', 'The Sahara is far from the sea for most plants; roots find buried water.', 'বেশির ভাগ গাছের জন্য সাহারা সাগর থেকে অনেক দূরে; শিকড় চাপা পানি খোঁজে।'),
      d('They need no water', 'এদের পানি লাগে না', 'All plants need water; desert plants are good at finding it.', 'সব গাছের পানি লাগে; মরুভূমির গাছ পানি খুঁজে পেতে দক্ষ।'),
      d('They grow only in winter snow', 'শুধু শীতের তুষারে জন্মায়', 'Their trick is deep roots, not snow.', 'এদের কৌশল গভীর শিকড়, তুষার নয়।'),
    ],
    explanation: ['Some Sahara plants have roots that reach deep underground to find buried water sources.', 'সাহারার কিছু গাছের শিকড় চাপা পড়া পানির উৎস খুঁজতে মাটির গভীরে পৌঁছায়।'],
  }),
  reportItem(X, 'A', {
    n: 3, slug: 'camel-week', skill: 'identify', src: 'sahara',
    quote: 'Camels store energy so efficiently that they can go more than a week without water and several months without food.',
    prompt: ['How long can a camel go without water?', 'উট পানি ছাড়া কতদিন চলতে পারে?'],
    answer: a('More than a week', 'এক সপ্তাহেরও বেশি'),
    distractors: [
      d('About one hour', 'প্রায় এক ঘণ্টা', 'Camels can go far longer: more than a week.', 'উট এর চেয়ে অনেক বেশি সময়, এক সপ্তাহেরও বেশি চলতে পারে।'),
      d('Forever: camels never drink', 'চিরকাল: উট কখনো পানি খায় না', 'Camels do drink; they just go a long time between drinks.', 'উট পানি খায়; শুধু দুবার খাওয়ার মাঝে অনেক সময় চলতে পারে।'),
      d('Exactly one day', 'ঠিক এক দিন', 'Camels can go more than a week.', 'উট এক সপ্তাহেরও বেশি চলতে পারে।'),
    ],
    explanation: ['Camels store energy so efficiently that they can go more than a week without water.', 'উট এত দক্ষভাবে শক্তি জমায় যে পানি ছাড়া এক সপ্তাহেরও বেশি চলতে পারে।'],
  }),
  reportItem(X, 'A', {
    n: 4, slug: 'oases-name', skill: 'identify', src: 'saharaKids',
    quote: 'These fertile spots are called oases (singular, oasis).',
    prompt: ['What are the fertile, watered spots in the Sahara called?', 'সাহারার উর্বর, পানিওয়ালা জায়গাগুলোকে কী বলে?'],
    answer: a('Oases', 'মরূদ্যান'),
    distractors: [
      d('Glaciers', 'হিমবাহ', 'Glaciers are rivers of ice.', 'হিমবাহ হলো বরফের নদী।'),
      d('Dunes', 'বালিয়াড়ি', 'Dunes are hills of sand with no water.', 'বালিয়াড়ি হলো পানিহীন বালির টিলা।'),
      d('Deltas', 'ব-দ্বীপ', 'Deltas form where rivers meet the sea.', 'ব-দ্বীপ তৈরি হয় যেখানে নদী সাগরে মেশে।'),
    ],
    explanation: ['Fertile spots with a spring, well or stream are called oases (singular: oasis).', 'ঝরনা, কুয়ো বা স্রোতধারাওয়ালা উর্বর জায়গাকে মরূদ্যান বলে।'],
  }),
  reportItem(X, 'A', {
    n: 5, slug: 'monsoon', skill: 'cause-effect', src: 'sahara',
    quote: 'which increased the monsoon rains and, therefore, supported a lush, green landscape in the Sahara',
    prompt: ['What made the Sahara green in its wetter periods?', 'ভেজা পর্বগুলোতে সাহারা সবুজ হয়েছিল কেন?'],
    answer: a('Stronger monsoon rains', 'বেশি মৌসুমি বৃষ্টি'),
    distractors: [
      d('People watering it', 'মানুষের পানি দেওয়া', 'The change was natural: more monsoon rain.', 'পরিবর্তনটা প্রাকৃতিক: বেশি মৌসুমি বৃষ্টি।'),
      d('Melting snow from the dunes', 'বালিয়াড়ির তুষার গলা', 'Dunes do not hold snow; the rain came from the monsoon.', 'বালিয়াড়িতে তুষার থাকে না; বৃষ্টি এসেছিল মৌসুমি বায়ু থেকে।'),
      d('The sea flooding the desert', 'সাগরের পানিতে মরুভূমি প্লাবিত হওয়া', 'Sea water would not make it green; rain did.', 'সাগরের পানি একে সবুজ করত না; করেছে বৃষ্টি।'),
    ],
    explanation: ['When Earth\'s tilt changed slightly, monsoon rains increased and supported a lush, green landscape in the Sahara.', 'পৃথিবীর হেলানো অবস্থান একটু বদলালে মৌসুমি বৃষ্টি বেড়ে যায় আর সাহারায় সবুজ-শ্যামল প্রকৃতি গড়ে ওঠে।'],
  }),
]

export const SAHARA_REPORT_B = [
  reportItem(X, 'B', {
    n: 1, slug: 'area', skill: 'compare', src: 'sahara',
    quote: 'an area about the size of the United States (including Alaska and Hawaii)',
    prompt: ['The Sahara covers an area about the size of…', 'সাহারার আয়তন প্রায় কীসের সমান?'],
    answer: a('The United States', 'যুক্তরাষ্ট্র'),
    distractors: [
      d('Bangladesh', 'বাংলাদেশ', 'The Sahara is many times larger than Bangladesh.', 'সাহারা বাংলাদেশের চেয়ে বহু গুণ বড়।'),
      d('One large city', 'একটি বড় শহর', 'It is about the size of a whole large country.', 'এটি প্রায় একটি গোটা বড় দেশের সমান।'),
      d('The whole Earth', 'গোটা পৃথিবী', 'It fills most of northern Africa, not the planet.', 'এটি উত্তর আফ্রিকার বেশির ভাগ জুড়ে, গোটা গ্রহ নয়।'),
    ],
    explanation: ['The Sahara covers an area about the size of the United States, including Alaska and Hawaii.', 'সাহারার আয়তন প্রায় আলাস্কা ও হাওয়াইসহ যুক্তরাষ্ট্রের সমান।'],
  }),
  reportItem(X, 'B', {
    n: 2, slug: 'dune-height', skill: 'identify', src: 'sahara',
    quote: 'The dunes can reach almost 600 feet (183 meters) high, and they cover about 25% of the entire desert',
    prompt: ['How tall can Sahara sand dunes become?', 'সাহারার বালিয়াড়ি কত উঁচু হতে পারে?'],
    answer: a('Almost 183 metres', 'প্রায় ১৮৩ মিটার'),
    distractors: [
      d('About 1 metre at most', 'বড়জোর প্রায় ১ মিটার', 'Some dunes are as tall as a skyscraper.', 'কিছু বালিয়াড়ি আকাশচুম্বী ভবনের মতো উঁচু।'),
      d('About 18 kilometres', 'প্রায় ১৮ কিলোমিটার', 'That is higher than the tallest mountain.', 'এটা সবচেয়ে উঁচু পর্বতের চেয়েও বেশি।'),
      d('They are always flat', 'এগুলো সবসময় সমতল', 'Dunes are hills of sand, some very tall.', 'বালিয়াড়ি বালির টিলা, কিছু খুব উঁচু।'),
    ],
    explanation: ['Sahara dunes can reach almost 183 metres (600 feet) high.', 'সাহারার বালিয়াড়ি প্রায় ১৮৩ মিটার (৬০০ ফুট) উঁচু হতে পারে।'],
  }),
  reportItem(X, 'B', {
    n: 3, slug: 'land-types', skill: 'identify', src: 'saharaKids',
    quote: 'This vast sunbaked land of barren rock, gravel, and shifting sand stretches across northern Africa.',
    prompt: ['Which best describes the land of the Sahara?', 'সাহারার ভূমির সবচেয়ে ভালো বর্ণনা কোনটি?'],
    answer: a('Barren rock, gravel and shifting sand', 'অনুর্বর পাথর, নুড়ি আর সরে যাওয়া বালি'),
    distractors: [
      d('Thick forest everywhere', 'সব জায়গায় ঘন বন', 'Trees grow only at oases.', 'গাছ জন্মায় শুধু মরূদ্যানে।'),
      d('Only sand dunes', 'শুধু বালিয়াড়ি', 'There is rock and gravel too; dunes are about a quarter.', 'পাথর আর নুড়িও আছে; বালিয়াড়ি প্রায় এক-চতুর্থাংশ।'),
      d('Ice and snow', 'বরফ আর তুষার', 'The Sahara is a hot desert.', 'সাহারা একটি গরম মরুভূমি।'),
    ],
    explanation: ['Britannica describes the Sahara as a vast sunbaked land of barren rock, gravel and shifting sand.', 'ব্রিটানিকা সাহারাকে বলে অনুর্বর পাথর, নুড়ি আর সরে যাওয়া বালির বিশাল রোদে-পোড়া ভূমি।'],
  }),
  reportItem(X, 'B', {
    n: 4, slug: 'hump-use', skill: 'apply', src: 'sahara',
    quote: 'The humps on a camel\'s back store fat, which can be used for energy and hydration in between meals.',
    prompt: ['A camel walks for days between meals. What helps it keep going?', 'দুই খাবারের মাঝে উট কয়েক দিন হাঁটে। কী তাকে চলতে সাহায্য করে?'],
    answer: a('Fat stored in its hump, used for energy and hydration', 'কুঁজে জমা চর্বি, যা শক্তি আর পানির চাহিদা মেটায়'),
    distractors: [
      d('A tank of water inside the hump', 'কুঁজের ভেতরে পানির ট্যাংক', 'The hump stores fat, not liquid water.', 'কুঁজে চর্বি জমা থাকে, তরল পানি নয়।'),
      d('Eating sand', 'বালি খাওয়া', 'Sand has no food value.', 'বালির কোনো খাদ্যমূল্য নেই।'),
      d('Sleeping for the whole trip', 'পুরো যাত্রা ঘুমিয়ে কাটানো', 'Camels walk; their fat store keeps them going.', 'উট হাঁটে; জমা চর্বি তাকে চালিয়ে নেয়।'),
    ],
    explanation: ['The hump stores fat, which can be used for energy and hydration between meals.', 'কুঁজে জমা চর্বি দুই খাবারের মাঝে শক্তি আর পানির চাহিদা মেটাতে কাজে লাগে।'],
  }),
  reportItem(X, 'B', {
    n: 5, slug: 'third-overall', skill: 'compare', src: 'sahara',
    quote: 'The Sahara is the largest hot desert in the world and the third-largest desert overall',
    prompt: ['Counting ALL deserts, hot and cold, where does the Sahara rank by size?', 'গরম-ঠান্ডা সব মরুভূমি ধরলে আকারে সাহারার অবস্থান কত?'],
    answer: a('Third-largest', 'তৃতীয় বৃহত্তম'),
    distractors: [
      d('Largest', 'সবচেয়ে বড়', 'It is the largest HOT desert, but two cold deserts are bigger.', 'এটি সবচেয়ে বড় গরম মরুভূমি, কিন্তু দুটি ঠান্ডা মরুভূমি আরও বড়।'),
      d('Tenth-largest', 'দশম বৃহত্তম', 'It is much higher on the list: third.', 'তালিকায় এটি অনেক ওপরে: তৃতীয়।'),
      d('Smallest', 'সবচেয়ে ছোট', 'It fills nearly all of northern Africa.', 'এটি উত্তর আফ্রিকার প্রায় পুরোটা জুড়ে।'),
    ],
    explanation: ['The Sahara is the largest hot desert and the third-largest desert overall.', 'সাহারা সবচেয়ে বড় গরম মরুভূমি আর সব মিলিয়ে তৃতীয় বৃহত্তম মরুভূমি।'],
  }),
]

export const SAHARA_ITEMS = Object.freeze([...SAHARA_STATIONS, ...SAHARA_REPORT_A, ...SAHARA_REPORT_B])
