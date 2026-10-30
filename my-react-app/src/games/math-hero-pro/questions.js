/**
 * Math Hero Pro question makers: one per level, no React, no storage (tested by engine.test.js).
 *
 *   makeQuestions(levelId, rand, count) → count questions, easiest first
 *
 * Every question looks like this:
 *   {
 *     id        unique within the round, e.g. 'L2-7x6'
 *     topic     'add' | 'sub' | 'bond' | 'mul' | 'div' | 'fraction' | 'compare' | 'word' | 'logic'
 *     prompt    { en, bn } the question a child reads
 *     equation  optional big sum shown on the card, e.g. '7 + 5 = ?'
 *     visual    optional picture (see ui/Visuals.jsx for each kind)
 *     choices   four different answers as strings ('12', '3/4', '5:00'); one of them is `answer`
 *     answer    the right choice
 *     explain   { en, bn } why the answer is right, shown after answering
 *     tip       { en, bn } a tiny mini-lesson to remember
 *   }
 * Text uses plain digits; the UI writes them as Bangla digits in Bangla (formatDigits).
 */

const t = (en, bn) => ({ en, bn })

// ---------- shared helpers ----------

/** Four different whole-number choices: the answer, the likely mistakes, then nearby numbers. */
export function numberChoices(rand, answer, mistakes = []) {
  const picked = [answer]
  const add = (value) => {
    if (picked.length < 4 && Number.isInteger(value) && value >= 0 && !picked.includes(value)) picked.push(value)
  }
  for (const value of rand.shuffle(mistakes)) add(value)
  for (const offset of rand.shuffle([1, -1, 2, -2, 3, -3, 4, 5, 10, -10])) add(answer + offset)
  for (let value = 0; picked.length < 4; value++) add(value) // only reachable for tiny answers
  return rand.shuffle(picked).map(String)
}

const sameValue = ([a, b], [c, d]) => a * d === b * c
export const fraction = (n, d) => `${n}/${d}`
export const parseFraction = (text) => text.split('/').map(Number)

/** Four fraction choices with no two worth the same amount, so exactly one is right. */
export function fractionChoices(rand, [n, d], mistakes) {
  const picked = [[n, d]]
  const add = ([a, b]) => {
    if (picked.length >= 4 || !(a > 0 && a < b && b <= 12)) return
    if (picked.some((f) => sameValue(f, [a, b]))) return
    picked.push([a, b])
  }
  for (const f of rand.shuffle(mistakes)) add(f)
  for (let b = 2; picked.length < 4 && b <= 12; b++) for (let a = 1; a < b && picked.length < 4; a++) add([a, b])
  return rand.shuffle(picked).map(([a, b]) => fraction(a, b))
}

// `of` is the Bangla possessive ("Mina's" → মিনার, "Sam's" → স্যামের).
const NAMES = [
  ['Mina', 'মিনা', 'মিনার'], ['Raju', 'রাজু', 'রাজুর'], ['Ava', 'এভা', 'এভার'], ['Leo', 'লিও', 'লিওর'],
  ['Tuni', 'টুনি', 'টুনির'], ['Sam', 'স্যাম', 'স্যামের'], ['Nila', 'নীলা', 'নীলার'], ['Omar', 'ওমর', 'ওমরের'],
].map(([en, bn, of]) => ({ en, bn, of }))
const ITEMS = [
  t('apples', 'টি আপেল'), t('marbles', 'টি মার্বেল'), t('stickers', 'টি স্টিকার'), t('balloons', 'টি বেলুন'),
  t('pencils', 'টি পেনসিল'), t('cookies', 'টি বিস্কুট'), t('shells', 'টি ঝিনুক'), t('stars', 'টি তারা'),
]
// ITEMS' Bangla has the counting word (টি) in front, so "5 টি আপেল" reads naturally.

// ---------- Level 1: addition & subtraction basics ----------

function addSmall(rand) {
  const a = rand.int(2, 9)
  const b = rand.int(1, 9)
  const s = a + b
  return {
    id: `L1-${a}+${b}`,
    topic: 'add',
    prompt: t('Add the two groups. How many dots in all?', 'দুই দল যোগ করো। মোট কয়টি বিন্দু?'),
    equation: `${a} + ${b} = ?`,
    visual: { kind: 'dots', groups: [a, b] },
    choices: numberChoices(rand, s, [s + 1, s - 1, Math.abs(a - b), s + 2]),
    answer: String(s),
    explain: t(
      `${a} + ${b} = ${s}. Start at ${Math.max(a, b)} and count on ${Math.min(a, b)} more.`,
      `${a} + ${b} = ${s}। ${Math.max(a, b)} থেকে শুরু করে আরও ${Math.min(a, b)} গুনে যাও।`,
    ),
    tip: t('Start with the bigger number, then count on.', 'বড় সংখ্যা থেকে শুরু করো, তারপর সামনে গুনে যাও।'),
  }
}

function addBig(rand) {
  const a = rand.int(12, 58)
  const b = rand.int(11, Math.min(39, 99 - a))
  const s = a + b
  const tens = Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10
  const ones = (a % 10) + (b % 10)
  return {
    id: `L1-${a}+${b}`,
    topic: 'add',
    prompt: t('Solve the sum.', 'যোগফল বের করো।'),
    equation: `${a} + ${b} = ?`,
    choices: numberChoices(rand, s, [s + 10, s - 10, s + 1, s - 1, tens + (ones % 10)]),
    answer: String(s),
    explain: t(
      `Tens first: ${tens}. Then ones: ${a % 10} + ${b % 10} = ${ones}. ${tens} + ${ones} = ${s}.`,
      `আগে দশক: ${tens}। তারপর একক: ${a % 10} + ${b % 10} = ${ones}। ${tens} + ${ones} = ${s}।`,
    ),
    tip: t('Split numbers into tens and ones, add each, then put them together.', 'সংখ্যাকে দশক আর এককে ভাগ করো, আলাদা যোগ করে মিলিয়ে নাও।'),
  }
}

function subSmall(rand) {
  const a = rand.int(6, 15)
  const b = rand.int(1, a - 1)
  const d = a - b
  return {
    id: `L1-${a}-${b}`,
    topic: 'sub',
    prompt: t(`There are ${a} dots. Take away ${b}. How many are left?`, `${a}টি বিন্দু আছে। ${b}টি সরিয়ে নাও। কয়টি বাকি থাকে?`),
    equation: `${a} − ${b} = ?`,
    visual: { kind: 'takeaway', total: a, remove: b },
    choices: numberChoices(rand, d, [a + b, d + 1, d - 1, b]),
    answer: String(d),
    explain: t(`${a} − ${b} = ${d}. Check it by adding back: ${d} + ${b} = ${a}.`, `${a} − ${b} = ${d}। উল্টো যোগ করে মিলিয়ে নাও: ${d} + ${b} = ${a}।`),
    tip: t('Subtraction is addition in reverse. Add back to check!', 'বিয়োগ হলো উল্টো যোগ। যোগ করে মিলিয়ে দেখো!'),
  }
}

function subBig(rand) {
  const a = rand.int(30, 99)
  const b = rand.int(11, a - 5)
  const d = a - b
  return {
    id: `L1-${a}-${b}`,
    topic: 'sub',
    prompt: t('Solve the take-away.', 'বিয়োগফল বের করো।'),
    equation: `${a} − ${b} = ?`,
    choices: numberChoices(rand, d, [a + b > 99 ? d + 11 : a + b, d + 10, d - 10, d + 1]),
    answer: String(d),
    explain: t(`${a} − ${b} = ${d}. Check: ${d} + ${b} = ${a}.`, `${a} − ${b} = ${d}। মিলিয়ে নাও: ${d} + ${b} = ${a}।`),
    tip: t('Take away the tens first, then the ones.', 'আগে দশক বিয়োগ করো, তারপর একক।'),
  }
}

function bond(rand) {
  const total = rand.pick([10, 10, 20, rand.int(6, 9)])
  const part = rand.int(1, total - 1)
  const missing = total - part
  return {
    id: `L1-bond-${part}-${total}`,
    topic: 'bond',
    prompt: t(`Number bond: what goes with ${part} to make ${total}?`, `সংখ্যা জোড়া: ${part}-এর সঙ্গে কত মিলে ${total} হয়?`),
    equation: `${part} + ? = ${total}`,
    visual: { kind: 'bond', total, part },
    choices: numberChoices(rand, missing, [total + part, missing + 1, missing - 1, part]),
    answer: String(missing),
    explain: t(`${part} and ${missing} make ${total}, because ${part} + ${missing} = ${total}.`, `${part} আর ${missing} মিলে ${total}, কারণ ${part} + ${missing} = ${total}।`),
    tip: t('Number bonds are pairs that make a number. Know the pairs that make 10!', 'সংখ্যা জোড়া মিলে একটি সংখ্যা তৈরি করে। ১০ বানানোর জোড়াগুলো মনে রাখো!'),
  }
}

// ---------- Level 2: multiplication tables ----------

function mulTip(a, b) {
  if (a === 10 || b === 10) return t('Times 10: put a zero on the end!', '১০ দিয়ে গুণ: শেষে একটা শূন্য বসাও!')
  if (a === 5 || b === 5) return t('Times 5: count by fives — 5, 10, 15, 20…', '৫ দিয়ে গুণ: পাঁচ পাঁচ করে গোনো — ৫, ১০, ১৫, ২০…')
  if (a === 9 || b === 9) return t('Times 9: the digits of the answer always add up to 9 (like 36 → 3 + 6).', '৯ দিয়ে গুণ: উত্তরের অঙ্কগুলো যোগ করলে ৯ হয় (যেমন ৩৬ → ৩ + ৬)।')
  if (a === 2 || b === 2) return t('Times 2 is a double: 7 × 2 = 7 + 7.', '২ দিয়ে গুণ মানে দ্বিগুণ: ৭ × ২ = ৭ + ৭।')
  if (a === 1 || b === 1) return t('Anything times 1 stays the same.', 'যেকোনো সংখ্যাকে ১ দিয়ে গুণ করলে একই থাকে।')
  if (a === b) return t(`${a} × ${a} is a square number: a ${a} by ${a} square of dots!`, `${a} × ${a} একটি বর্গ সংখ্যা: ${a} বাই ${a} বিন্দুর বর্গ!`)
  return t(`Order doesn't matter: ${a} × ${b} = ${b} × ${a}. Use the one you know!`, `ক্রম বদলালেও ফল একই: ${a} × ${b} = ${b} × ${a}। যেটা জানো সেটা ব্যবহার করো!`)
}

/** The ten facts of a round, from friendly tables (1, 2, 5, 10) to trickier ones (6–9). */
function mulFacts(rand, count) {
  const tiers = [[1, 2, 10], [2, 5, 10], [3, 4, 5], [3, 4, 6], [6, 7, 8, 9]]
  const facts = []
  const seen = new Set()
  for (let i = 0; facts.length < count && i < 400; i++) {
    const tier = tiers[Math.min(tiers.length - 1, Math.floor((facts.length * tiers.length) / count))]
    const a = rand.pick(tier)
    const b = rand.int(2, 10)
    const key = `${Math.min(a, b)}x${Math.max(a, b)}`
    if (seen.has(key)) continue
    seen.add(key)
    facts.push(rand.chance(0.5) ? [a, b] : [b, a])
  }
  return facts
}

function mul(rand, [a, b]) {
  const p = a * b
  return {
    id: `L2-${a}x${b}`,
    topic: 'mul',
    prompt: t(`${a} rows of ${b} dots. How many dots in all?`, `${a} সারিতে ${b}টি করে বিন্দু। মোট কয়টি বিন্দু?`),
    equation: `${a} × ${b} = ?`,
    visual: { kind: 'array', rows: a, cols: b },
    choices: numberChoices(rand, p, [p + a, p - a, p + b, p - b, a + b]),
    answer: String(p),
    explain: t(`${a} groups of ${b} make ${p}, so ${a} × ${b} = ${p}.`, `${b}-এর ${a}টি দল মিলে ${p}, তাই ${a} × ${b} = ${p}।`),
    tip: mulTip(a, b),
  }
}

// ---------- Level 3: division & sharing ----------

const SHARE_THINGS = [t('cookies', 'টি বিস্কুট'), t('stars', 'টি তারা'), t('candies', 'টি লজেন্স'), t('crayons', 'টি রং পেনসিল')]

function divFacts(rand, count) {
  const facts = []
  const seen = new Set()
  for (let i = 0; facts.length < count && i < 400; i++) {
    const hard = facts.length >= count / 2
    const g = hard ? rand.int(4, 10) : rand.int(2, 5)
    const q = hard ? rand.int(3, 10) : rand.int(1, 6)
    const key = `${g * q}/${g}`
    if (seen.has(key)) continue
    seen.add(key)
    facts.push([g * q, g])
  }
  return facts
}

function div(rand, [total, g], story) {
  const q = total / g
  const thing = rand.pick(SHARE_THINGS)
  const mistakes = [q + 1, q - 1, total - g, g, q + 2]
  const shared = story
    ? {
      prompt: t(
        `Share ${total} ${thing.en} equally among ${g} friends. How many does each friend get?`,
        `${total}${thing.bn} ${g} জন বন্ধুর মধ্যে সমান ভাগ করো। প্রত্যেকে কয়টি পাবে?`,
      ),
      visual: total <= 40 ? { kind: 'share', total, groups: g } : undefined,
    }
    : { prompt: t('Solve the division.', 'ভাগফল বের করো।') }
  return {
    id: `L3-${total}/${g}`,
    topic: 'div',
    ...shared,
    equation: `${total} ÷ ${g} = ?`,
    choices: numberChoices(rand, q, mistakes),
    answer: String(q),
    explain: t(`${total} ÷ ${g} = ${q}, because ${g} × ${q} = ${total}.`, `${total} ÷ ${g} = ${q}, কারণ ${g} × ${q} = ${total}।`),
    tip: rand.pick([
      t(`Division undoes multiplication. Ask: ${g} times what makes ${total}?`, `ভাগ হলো গুণের উল্টো। ভাবো: ${g}-কে কত দিয়ে গুণ করলে ${total} হয়?`),
      t('Sharing fairly means every group gets the same amount.', 'সমান ভাগ মানে প্রতিটি দল একই পরিমাণ পায়।'),
    ]),
  }
}

// ---------- Level 4: fractions & shapes ----------

const FRACTION_TIP = t('Bottom number = how many equal parts. Top number = how many we count.', 'নিচের সংখ্যা = মোট সমান ভাগ। ওপরের সংখ্যা = যে কয়টি ভাগ গুনছি।')

function pickFraction(rand, simple) {
  const d = simple ? rand.pick([2, 3, 4]) : rand.pick([3, 4, 5, 6, 8])
  const n = simple ? rand.int(1, d - 1) : rand.int(1, d - 1)
  return [n, d]
}

function fractionShaded(rand, shape, simple) {
  const [n, d] = pickFraction(rand, simple)
  return {
    id: `L4-${shape}-${n}/${d}`,
    topic: 'fraction',
    prompt: t('What fraction of the shape is shaded?', 'আকৃতির কত ভাগ রং করা?'),
    visual: { kind: 'fraction', shape, parts: d, shaded: n },
    choices: fractionChoices(rand, [n, d], [[d - n, d], [n, d + 1], [n + 1, d], [n, d - 1], [d, n]]),
    answer: fraction(n, d),
    explain: t(
      `The ${shape === 'pie' ? 'circle' : 'shape'} has ${d} equal parts and ${n} ${n === 1 ? 'is' : 'are'} shaded, so ${n}/${d} is shaded.`,
      `${shape === 'pie' ? 'বৃত্তটিতে' : 'আকৃতিতে'} ${d}টি সমান ভাগ, তার ${n}টি রং করা, তাই ${n}/${d} রং করা।`,
    ),
    tip: FRACTION_TIP,
  }
}

function fractionNotShaded(rand) {
  const [n, d] = pickFraction(rand, false)
  const rest = d - n
  return {
    id: `L4-not-${n}/${d}`,
    topic: 'fraction',
    prompt: t('What fraction is NOT shaded?', 'কত ভাগ রং করা নয়?'),
    visual: { kind: 'fraction', shape: 'bar', parts: d, shaded: n },
    choices: fractionChoices(rand, [rest, d], [[n, d], [rest, d + 1], [rest + 1, d], [d, rest]]),
    answer: fraction(rest, d),
    explain: t(`${n} of ${d} parts are shaded, so ${d} − ${n} = ${rest} parts are not: ${rest}/${d}.`, `${d}টি ভাগের ${n}টি রং করা, তাই ${d} − ${n} = ${rest}টি ভাগ রং ছাড়া: ${rest}/${d}।`),
    tip: t('Shaded part + unshaded part = the whole shape.', 'রং করা অংশ + রং ছাড়া অংশ = পুরো আকৃতি।'),
  }
}

function fractionCompare(rand, biggest) {
  const dens = rand.shuffle([2, 3, 4, 5, 6, 8]).slice(0, 4)
  const target = biggest ? Math.min(...dens) : Math.max(...dens)
  return {
    id: `L4-compare-${biggest ? 'big' : 'small'}-${dens.join('-')}`,
    topic: 'compare',
    prompt: biggest
      ? t('Each bar is one whole. Which fraction is the BIGGEST piece?', 'প্রতিটি দণ্ড একটি পুরো। কোন ভগ্নাংশটি সবচেয়ে বড়?')
      : t('Each bar is one whole. Which fraction is the SMALLEST piece?', 'প্রতিটি দণ্ড একটি পুরো। কোন ভগ্নাংশটি সবচেয়ে ছোট?'),
    visual: { kind: 'compare', fractions: dens.map((d) => [1, d]) },
    choices: dens.map((d) => fraction(1, d)),
    answer: fraction(1, target),
    explain: biggest
      ? t(`1/${target} is biggest: cutting a whole into fewer pieces makes each piece bigger.`, `১/${target} সবচেয়ে বড়: পুরোটাকে কম ভাগে কাটলে প্রতিটি ভাগ বড় হয়।`)
      : t(`1/${target} is smallest: cutting a whole into more pieces makes each piece smaller.`, `১/${target} সবচেয়ে ছোট: পুরোটাকে বেশি ভাগে কাটলে প্রতিটি ভাগ ছোট হয়।`),
    tip: t('Same top number? The smaller the bottom number, the bigger the piece!', 'ওপরের সংখ্যা এক হলে, নিচের সংখ্যা যত ছোট, ভাগ তত বড়!'),
  }
}

// ---------- Level 5: word problems & logic ----------

function pickTwo(rand, list) {
  const [a, b] = rand.shuffle(list)
  return [a, b]
}

const WORD_PROBLEMS = [
  function wordAdd(rand) {
    const name = rand.pick(NAMES)
    const item = rand.pick(ITEMS)
    const a = rand.int(4, 15)
    const b = rand.int(3, 12)
    const s = a + b
    return {
      topic: 'word',
      prompt: t(`${name.en} has ${a} ${item.en}. A friend gives ${b} more. How many ${item.en} does ${name.en} have now?`,
        `${name.of} কাছে ${a}${item.bn} আছে। এক বন্ধু আরও ${b}টি দিল। এখন ${name.of} কাছে কয়টি?`),
      choices: numberChoices(rand, s, [a - b < 0 ? s + 2 : a - b, s + 1, s - 1]),
      answer: String(s),
      explain: t(`"Gives more" means add: ${a} + ${b} = ${s}.`, `"আরও দিল" মানে যোগ: ${a} + ${b} = ${s}।`),
      tip: t('Words like "more", "in all" and "altogether" often mean add.', '"আরও", "সব মিলিয়ে", "মোট" — এমন শব্দ মানে সাধারণত যোগ।'),
    }
  },
  function wordSub(rand) {
    const name = rand.pick(NAMES)
    const a = rand.int(10, 20)
    const b = rand.int(2, a - 3)
    const d = a - b
    return {
      topic: 'word',
      prompt: t(`${name.en} had ${a} balloons. ${b} floated away. How many balloons are left?`,
        `${name.of} ${a}টি বেলুন ছিল। ${b}টি উড়ে গেল। কয়টি বেলুন বাকি আছে?`),
      choices: numberChoices(rand, d, [a + b, d + 1, d - 1]),
      answer: String(d),
      explain: t(`"Left" means take away: ${a} − ${b} = ${d}.`, `"বাকি" মানে বিয়োগ: ${a} − ${b} = ${d}।`),
      tip: t('"Left", "fewer" and "how many more" are clues to subtract.', '"বাকি", "কম" আর "কত বেশি" — এগুলো বিয়োগের সংকেত।'),
    }
  },
  function wordCompare(rand) {
    const [p, q] = pickTwo(rand, NAMES)
    const a = rand.int(12, 25)
    const b = rand.int(3, a - 2)
    const d = a - b
    return {
      topic: 'word',
      prompt: t(`${p.en} read ${a} pages. ${q.en} read ${b} pages. How many more pages did ${p.en} read?`,
        `${p.bn} ${a} পৃষ্ঠা পড়েছে। ${q.bn} ${b} পৃষ্ঠা পড়েছে। ${p.bn} কত পৃষ্ঠা বেশি পড়েছে?`),
      choices: numberChoices(rand, d, [a + b, d + 1, d - 1]),
      answer: String(d),
      explain: t(`To find "how many more", subtract the smaller from the bigger: ${a} − ${b} = ${d}.`, `"কত বেশি" বের করতে বড় থেকে ছোট বিয়োগ করো: ${a} − ${b} = ${d}।`),
      tip: t('Comparing two amounts? Find the difference by subtracting.', 'দুটি পরিমাণ তুলনা করছ? বিয়োগ করে পার্থক্য বের করো।'),
    }
  },
  function wordMul(rand) {
    const item = rand.pick(ITEMS)
    const a = rand.int(2, 6)
    const b = rand.int(3, 8)
    const p = a * b
    return {
      topic: 'word',
      prompt: t(`There are ${a} boxes with ${b} ${item.en} in each box. How many ${item.en} are there in all?`,
        `${a}টি বাক্সের প্রতিটিতে ${b}${item.bn} আছে। মোট কয়টি?`),
      choices: numberChoices(rand, p, [a + b, p + b, p - a]),
      answer: String(p),
      explain: t(`Equal groups mean multiply: ${a} × ${b} = ${p}.`, `সমান দল মানে গুণ: ${a} × ${b} = ${p}।`),
      tip: t('"Each" plus "in all" is a big clue to multiply.', '"প্রতিটিতে" আর "মোট" একসঙ্গে থাকলে গুণ করো।'),
    }
  },
  function wordDiv(rand) {
    const g = rand.int(2, 5)
    const q = rand.int(2, 6)
    const total = g * q
    return {
      topic: 'word',
      prompt: t(`${total} children make teams of ${g}. How many teams are there?`,
        `${total} জন শিশু ${g} জন করে দল বানাল। কয়টি দল হলো?`),
      choices: numberChoices(rand, q, [total - g, total + g, q + 1, g]),
      answer: String(q),
      explain: t(`Split into equal teams: ${total} ÷ ${g} = ${q}. Check: ${q} × ${g} = ${total}.`, `সমান দলে ভাগ করো: ${total} ÷ ${g} = ${q}। মিলিয়ে নাও: ${q} × ${g} = ${total}।`),
      tip: t('Making equal groups from a total means divide.', 'মোট থেকে সমান দল বানানো মানে ভাগ।'),
    }
  },
  function wordMoney(rand) {
    const name = rand.pick(NAMES)
    const k = rand.int(2, 5)
    const price = rand.pick([2, 3, 5, 10])
    const cost = k * price
    return {
      topic: 'word',
      prompt: t(`${name.en} buys ${k} stickers. Each sticker costs ${price} coins. How many coins does ${name.en} pay?`,
        `${name.bn} ${k}টি স্টিকার কিনল। প্রতিটির দাম ${price} কয়েন। ${name.bn} মোট কত কয়েন দিল?`),
      choices: numberChoices(rand, cost, [k + price, cost + price, cost - price]),
      answer: String(cost),
      explain: t(`${k} stickers × ${price} coins = ${cost} coins.`, `${k}টি স্টিকার × ${price} কয়েন = ${cost} কয়েন।`),
      tip: t('Same price for each? Multiply the number of things by the price.', 'প্রতিটির দাম এক হলে, জিনিসের সংখ্যাকে দাম দিয়ে গুণ করো।'),
    }
  },
  function wordHalf(rand) {
    const name = rand.pick(NAMES)
    const half = rand.int(3, 10)
    const total = half * 2
    return {
      topic: 'word',
      prompt: t(`${name.en} has ${total} grapes and eats half of them. How many grapes did ${name.en} eat?`,
        `${name.of} ${total}টি আঙুর আছে, সে অর্ধেক খেয়ে ফেলল। কয়টি আঙুর খেল?`),
      choices: numberChoices(rand, half, [total, total - 2, half + 1, half - 1]),
      answer: String(half),
      explain: t(`Half means 2 equal parts: ${total} ÷ 2 = ${half}.`, `অর্ধেক মানে ২টি সমান ভাগ: ${total} ÷ ২ = ${half}।`),
      tip: t('Half of a number is the number you double to get it back.', 'কোনো সংখ্যার অর্ধেককে দ্বিগুণ করলে আবার সেই সংখ্যা পাওয়া যায়।'),
    }
  },
  function wordTwoStep(rand) {
    const name = rand.pick(NAMES)
    const item = rand.pick(ITEMS)
    const a = rand.int(5, 12)
    const b = rand.int(3, 8)
    const c = rand.int(2, a + b - 3)
    const r = a + b - c
    return {
      topic: 'word',
      prompt: t(`${name.en} has ${a} ${item.en}, gets ${b} more, then gives away ${c}. How many ${item.en} now?`,
        `${name.of} ${a}${item.bn} আছে, আরও ${b}টি পেল, তারপর ${c}টি দিয়ে দিল। এখন কয়টি?`),
      choices: numberChoices(rand, r, [a + b, a + b + c, a - c < 0 ? r + 2 : a - c, r + 1]),
      answer: String(r),
      explain: t(`Two steps: ${a} + ${b} = ${a + b}, then ${a + b} − ${c} = ${r}.`, `দুই ধাপ: ${a} + ${b} = ${a + b}, তারপর ${a + b} − ${c} = ${r}।`),
      tip: t('Big problem? Do it one step at a time, in order.', 'বড় সমস্যা? এক ধাপ এক ধাপ করে, ক্রম মেনে সমাধান করো।'),
    }
  },
  function logicPattern(rand) {
    const step = rand.int(2, 5)
    const start = rand.int(1, 10)
    const seq = [0, 1, 2, 3].map((i) => start + i * step)
    const nextValue = start + 4 * step
    return {
      topic: 'logic',
      prompt: t('What number comes next in the pattern?', 'নকশায় পরের সংখ্যাটি কত?'),
      visual: { kind: 'pattern', items: seq.map(String) },
      choices: numberChoices(rand, nextValue, [nextValue + 1, nextValue - 1, nextValue + step, seq[3] + 1]),
      answer: String(nextValue),
      explain: t(`Each number is ${step} more than the one before: ${seq[3]} + ${step} = ${nextValue}.`, `প্রতিটি সংখ্যা আগেরটির চেয়ে ${step} বেশি: ${seq[3]} + ${step} = ${nextValue}।`),
      tip: t('Find the rule: how much does it change each time?', 'নিয়মটা খোঁজো: প্রতিবার কতটা বদলায়?'),
    }
  },
  function logicMystery(rand) {
    const secret = rand.int(3, 15)
    const a = rand.int(2, 10)
    const s = secret + a
    return {
      topic: 'logic',
      prompt: t(`I'm a mystery number. Add ${a} to me and you get ${s}. What number am I?`,
        `আমি একটি রহস্য সংখ্যা। আমার সঙ্গে ${a} যোগ করলে ${s} হয়। আমি কত?`),
      equation: `? + ${a} = ${s}`,
      choices: numberChoices(rand, secret, [s + a, secret + 1, secret - 1, a]),
      answer: String(secret),
      explain: t(`Work backwards: ${s} − ${a} = ${secret}. Check: ${secret} + ${a} = ${s}.`, `উল্টো দিক থেকে ভাবো: ${s} − ${a} = ${secret}। মিলিয়ে নাও: ${secret} + ${a} = ${s}।`),
      tip: t('To undo adding, subtract. Detectives work backwards!', 'যোগকে উল্টাতে বিয়োগ করো। গোয়েন্দারা পেছন থেকে ভাবে!'),
    }
  },
]

// ---------- rounds ----------

/** Builds one question per slot; a slot that repeats an earlier question is rolled again. */
function fill(slots, rand) {
  const out = []
  const seen = new Set()
  for (const slot of slots) {
    let question
    for (let tries = 0; tries < 30; tries++) {
      question = slot(rand)
      const key = question.id ?? `${question.prompt.en}|${question.answer}`
      if (!seen.has(key)) { seen.add(key); break }
    }
    out.push(question)
  }
  return out
}

const LEVEL_MAKERS = {
  1: (rand, count) => fill([
    addSmall, addSmall, bond, subSmall, addSmall, subSmall, bond, addBig, subBig, addBig,
  ].slice(0, count), rand),
  2: (rand, count) => mulFacts(rand, count).map((pair) => mul(rand, pair)),
  3: (rand, count) => divFacts(rand, count).map((pair, i) => div(rand, pair, i % 2 === 0 || i < 3)),
  4: (rand, count) => fill([
    (r) => fractionShaded(r, 'bar', true),
    (r) => fractionShaded(r, 'pie', true),
    (r) => fractionShaded(r, 'grid', true),
    (r) => fractionCompare(r, true),
    (r) => fractionShaded(r, 'bar', false),
    (r) => fractionShaded(r, 'pie', false),
    fractionNotShaded,
    (r) => fractionCompare(r, false),
    (r) => fractionShaded(r, 'grid', false),
    (r) => fractionShaded(r, 'pie', false),
  ].slice(0, count), rand),
  5: (rand, count) => WORD_PROBLEMS.slice(0, count).map((make, i) => ({ ...make(rand), id: `L5-${i}-${make.name}` })),
}

export function makeQuestions(levelId, rand, count) {
  const make = LEVEL_MAKERS[levelId]
  if (!make) throw new RangeError(`Unknown Math Hero Pro level: ${levelId}`)
  return make(rand, count).map((question, i) => ({ ...question, id: `${question.id}#${i}` }))
}
