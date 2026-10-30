/**
 * Math Hero Pro+ question makers (ages 10–12): one per level, no React, no storage (tested by engine.test.js).
 *
 *   makeQuestions(levelId, rand, count) → count questions, easiest first
 *
 * Every question looks like this:
 *   {
 *     id        unique within the round
 *     topic     'order' | 'decimal' | 'percent' | 'ratio' | 'rate' | 'algebra' | 'geometry'
 *     prompt    { en, bn } the question a player reads
 *     equation  optional big expression shown on the card, e.g. '3x + 5 = 20'
 *     visual    optional picture (see ui/Visuals.jsx for each kind)
 *     choices   four different answers as strings ('19', '0.75', '2 : 3'); one of them is `answer`
 *     answer    the right choice
 *     unit      optional unit shown after every choice: '%', '°', 'cm', or { en, bn } ('taka' / 'টাকা')
 *     explain   { en, bn } the worked steps, shown after answering (always names the answer)
 *     tip       { en, bn } the idea behind it, to remember next time
 *   }
 * Text uses plain digits; the UI writes them as Bangla digits in Bangla (formatDigits).
 * Distractors are the mistakes children really make (left to right instead of × first, 3/4 → 3.4,
 * adding the discount back on, perimeter instead of area…), so a wrong pick always has something to teach.
 */

const t = (en, bn) => ({ en, bn })

// ---------- shared helpers ----------

/** A number written the short way, without float noise: 0.75, 12, 4.25. */
export const fmt = (x) => String(Math.round(x * 1000) / 1000)
const isWhole = (x) => Math.abs(x - Math.round(x)) < 1e-9

/**
 * Four different number choices: the answer, the likely mistakes, then nearby values (`step` apart).
 * Whole-number answers only get whole-number choices. Never negative.
 */
export function numberChoices(rand, answer, mistakes = [], { step = 1 } = {}) {
  const whole = isWhole(answer)
  const picked = [fmt(answer)]
  const add = (v) => {
    if (picked.length >= 4 || !Number.isFinite(v) || v < 0 || (whole && !isWhole(v))) return
    const s = fmt(v)
    if (!picked.includes(s)) picked.push(s)
  }
  for (const v of rand.shuffle(mistakes)) add(v)
  for (const k of rand.shuffle([1, -1, 2, -2, 3, -3, 5, 10])) add(answer + k * step)
  for (let k = 4; picked.length < 4; k++) add(answer + k * step)
  return rand.shuffle(picked)
}

export const ratio = (a, b) => `${a} : ${b}`
export const parseRatio = (text) => text.split(':').map((s) => Number(s.trim()))

/** Four ratio choices, no two equivalent (so 2 : 3 and 4 : 6 never both appear). */
export function ratioChoices(rand, [a, b], mistakes = []) {
  const picked = [[a, b]]
  const add = ([x, y]) => {
    if (picked.length >= 4 || !(x > 0 && y > 0) || !isWhole(x) || !isWhole(y)) return
    if (picked.some(([p, q]) => p * y === q * x)) return
    picked.push([x, y])
  }
  for (const r of rand.shuffle(mistakes)) add(r)
  for (let k = 1; picked.length < 4; k++) { add([a + k, b]); add([a, b + k]) }
  return rand.shuffle(picked).map(([x, y]) => ratio(x, y))
}

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b))
/** 1x is written x. */
const coef = (a) => (a === 1 ? 'x' : `${a}x`)

const NAMES = [
  ['Mina', 'মিনা'], ['Raju', 'রাজু'], ['Ava', 'এভা'], ['Leo', 'লিও'],
  ['Tuni', 'টুনি'], ['Sam', 'স্যাম'], ['Nila', 'নীলা'], ['Omar', 'ওমর'],
].map(([en, bn]) => ({ en, bn }))

const TAKA = t('taka', 'টাকা')
const CM = 'cm'
const CM2 = 'cm²'
const DEG = '°'

// ---------- Level 1: order of operations ----------

const ORDER_PROMPT = t('Use the order of operations. What is the value?', 'ক্রমের নিয়ম মেনে মান বের করো।')
const ORDER_TIP = t(
  'Order: Parentheses → Exponents → Multiply/Divide → Add/Subtract (PEMDAS, also called BODMAS).',
  'ক্রম: বন্ধনী → ঘাত → গুণ/ভাগ → যোগ/বিয়োগ (একে BODMAS-ও বলে)।',
)

function addMul(rand) {
  const [a, b, c] = [rand.int(2, 9), rand.int(2, 9), rand.int(2, 9)]
  const ans = a + b * c
  return {
    id: `L1-${a}+${b}x${c}`,
    topic: 'order',
    prompt: ORDER_PROMPT,
    equation: `${a} + ${b} × ${c} = ?`,
    choices: numberChoices(rand, ans, [(a + b) * c, a + b + c, a * b + c]),
    answer: String(ans),
    explain: t(
      `Multiply first: ${b} × ${c} = ${b * c}. Then add: ${a} + ${b * c} = ${ans}.`,
      `আগে গুণ: ${b} × ${c} = ${b * c}। তারপর যোগ: ${a} + ${b * c} = ${ans}।`,
    ),
    tip: t('Multiplication and division come before addition and subtraction.', 'যোগ-বিয়োগের আগে গুণ-ভাগ করতে হয়।'),
  }
}

function subDiv(rand) {
  const c = rand.int(2, 6)
  const k = rand.int(2, 9)
  const b = c * k
  const a = rand.int(k + 2, k + 20)
  const ans = a - k
  return {
    id: `L1-${a}-${b}/${c}`,
    topic: 'order',
    prompt: ORDER_PROMPT,
    equation: `${a} − ${b} ÷ ${c} = ?`,
    choices: numberChoices(rand, ans, [(a - b) / c, a + k, a - b, a - c]),
    answer: String(ans),
    explain: t(
      `Divide first: ${b} ÷ ${c} = ${k}. Then subtract: ${a} − ${k} = ${ans}.`,
      `আগে ভাগ: ${b} ÷ ${c} = ${k}। তারপর বিয়োগ: ${a} − ${k} = ${ans}।`,
    ),
    tip: t('Division comes before subtraction, even when it is written second.', 'ভাগ পরে লেখা থাকলেও বিয়োগের আগে করতে হয়।'),
  }
}

function brackets(rand) {
  const [a, b, c] = [rand.int(2, 9), rand.int(2, 9), rand.int(2, 6)]
  const s = a + b
  const ans = s * c
  return {
    id: `L1-(${a}+${b})x${c}`,
    topic: 'order',
    prompt: ORDER_PROMPT,
    equation: `(${a} + ${b}) × ${c} = ?`,
    choices: numberChoices(rand, ans, [a + b * c, a * c + b, a + b + c]),
    answer: String(ans),
    explain: t(
      `Brackets first: ${a} + ${b} = ${s}. Then multiply: ${s} × ${c} = ${ans}.`,
      `আগে বন্ধনী: ${a} + ${b} = ${s}। তারপর গুণ: ${s} × ${c} = ${ans}।`,
    ),
    tip: t('Brackets always go first: they say "work me out now!"', 'বন্ধনীর ভেতরের কাজ সবসময় সবার আগে।'),
  }
}

function leftToRight(rand) {
  const c = rand.int(2, 9)
  const a = rand.int(c + 8, 40)
  const b = rand.int(2, a - c - 1)
  const ans = a - b + c
  return {
    id: `L1-${a}-${b}+${c}`,
    topic: 'order',
    prompt: ORDER_PROMPT,
    equation: `${a} − ${b} + ${c} = ?`,
    choices: numberChoices(rand, ans, [a - b - c, a + b - c, a + b + c]),
    answer: String(ans),
    explain: t(
      `+ and − have equal rank, so go left to right: ${a} − ${b} = ${a - b}, then ${a - b} + ${c} = ${ans}.`,
      `+ আর − সমান স্তরের, তাই বাঁ থেকে ডানে: ${a} − ${b} = ${a - b}, তারপর ${a - b} + ${c} = ${ans}।`,
    ),
    tip: t('Equal-rank steps (+ and −, or × and ÷) go from left to right.', 'সমান স্তরের কাজ (+ ও −, অথবা × ও ÷) বাঁ থেকে ডানে করো।'),
  }
}

function squarePlus(rand) {
  const a = rand.int(3, 9)
  const b = rand.int(2, 15)
  const ans = a * a + b
  return {
    id: `L1-${a}^2+${b}`,
    topic: 'order',
    prompt: ORDER_PROMPT,
    equation: `${a}² + ${b} = ?`,
    choices: numberChoices(rand, ans, [a * 2 + b, (a + b) * 2, a * a]),
    answer: String(ans),
    explain: t(
      `Exponent first: ${a}² = ${a} × ${a} = ${a * a}. Then add: ${a * a} + ${b} = ${ans}.`,
      `আগে ঘাত: ${a}² = ${a} × ${a} = ${a * a}। তারপর যোগ: ${a * a} + ${b} = ${ans}।`,
    ),
    tip: t('A small ² means multiply the number by itself, not by 2.', 'ছোট ² মানে সংখ্যাটিকে নিজেকে দিয়েই গুণ করা, ২ দিয়ে নয়।'),
  }
}

function divTimes(rand) {
  const b = rand.int(2, 6)
  const k = rand.int(2, 9)
  const a = b * k
  const c = rand.int(2, 5)
  const ans = k * c
  return {
    id: `L1-${a}/${b}x${c}`,
    topic: 'order',
    prompt: ORDER_PROMPT,
    equation: `${a} ÷ ${b} × ${c} = ?`,
    choices: numberChoices(rand, ans, [a / (b * c), a * c, k + c]),
    answer: String(ans),
    explain: t(
      `× and ÷ have equal rank, so go left to right: ${a} ÷ ${b} = ${k}, then ${k} × ${c} = ${ans}.`,
      `× আর ÷ সমান স্তরের, তাই বাঁ থেকে ডানে: ${a} ÷ ${b} = ${k}, তারপর ${k} × ${c} = ${ans}।`,
    ),
    tip: t('"Multiply before divide" is a myth: × and ÷ simply go left to right.', '"আগে গুণ, পরে ভাগ" ভুল ধারণা: × আর ÷ বাঁ থেকে ডানে যায়।'),
  }
}

function bracketMix(rand) {
  const b = rand.int(6, 14)
  const c = rand.int(1, b - 2)
  const a = rand.int(2, 6)
  const d = rand.int(1, 9)
  const inner = b - c
  const ans = a * inner + d
  return {
    id: `L1-${a}(${b}-${c})+${d}`,
    topic: 'order',
    prompt: ORDER_PROMPT,
    equation: `${a} × (${b} − ${c}) + ${d} = ?`,
    choices: numberChoices(rand, ans, [a * b - c + d, a * (inner + d), a * inner]),
    answer: String(ans),
    explain: t(
      `Brackets: ${b} − ${c} = ${inner}. Multiply: ${a} × ${inner} = ${a * inner}. Add: ${a * inner} + ${d} = ${ans}.`,
      `বন্ধনী: ${b} − ${c} = ${inner}। গুণ: ${a} × ${inner} = ${a * inner}। যোগ: ${a * inner} + ${d} = ${ans}।`,
    ),
    tip: ORDER_TIP,
  }
}

function bracketSquare(rand) {
  const a = rand.int(1, 5)
  const b = rand.int(1, 5)
  const s = a + b
  const c = rand.int(1, Math.min(20, s * s - 1))
  const ans = s * s - c
  return {
    id: `L1-(${a}+${b})^2-${c}`,
    topic: 'order',
    prompt: ORDER_PROMPT,
    equation: `(${a} + ${b})² − ${c} = ?`,
    choices: numberChoices(rand, ans, [a * a + b * b - c, s * 2 - c, s * s + c]),
    answer: String(ans),
    explain: t(
      `Brackets: ${a} + ${b} = ${s}. Exponent: ${s}² = ${s * s}. Subtract: ${s * s} − ${c} = ${ans}.`,
      `বন্ধনী: ${a} + ${b} = ${s}। ঘাত: ${s}² = ${s * s}। বিয়োগ: ${s * s} − ${c} = ${ans}।`,
    ),
    tip: t('(a + b)² is not a² + b²: add inside the brackets first, then square.', '(a + b)² আর a² + b² এক নয়: আগে বন্ধনীর ভেতরে যোগ, তারপর বর্গ।'),
  }
}

function nested(rand) {
  const e = rand.int(2, 4)
  const d = rand.int(1, 6)
  const c = d + e
  const b = rand.int(2, 4)
  const a = rand.int(1, 15)
  const ans = a + b * e * e
  return {
    id: `L1-${a}+${b}(${c}-${d})^2`,
    topic: 'order',
    prompt: ORDER_PROMPT,
    equation: `${a} + ${b} × (${c} − ${d})² = ?`,
    choices: numberChoices(rand, ans, [(a + b) * e * e, a + (b * e) ** 2, a + b * e * 2]),
    answer: String(ans),
    explain: t(
      `Brackets: ${c} − ${d} = ${e}. Exponent: ${e}² = ${e * e}. Multiply: ${b} × ${e * e} = ${b * e * e}. Add: ${a} + ${b * e * e} = ${ans}.`,
      `বন্ধনী: ${c} − ${d} = ${e}। ঘাত: ${e}² = ${e * e}। গুণ: ${b} × ${e * e} = ${b * e * e}। যোগ: ${a} + ${b * e * e} = ${ans}।`,
    ),
    tip: ORDER_TIP,
  }
}

function missingNumber(rand) {
  const x = rand.int(2, 9)
  const a = rand.int(1, 9)
  const b = rand.int(2, 6)
  const c = (x + a) * b
  return {
    id: `L1-(?+${a})x${b}=${c}`,
    topic: 'order',
    prompt: t('Which number makes this true?', 'কোন সংখ্যা বসালে এটি সত্য হবে?'),
    equation: `(? + ${a}) × ${b} = ${c}`,
    choices: numberChoices(rand, x, [c / b + a, c / b, c - a * b, c - a]),
    answer: String(x),
    explain: t(
      `Undo in reverse order: ${c} ÷ ${b} = ${x + a}, then ${x + a} − ${a} = ${x}. Check: (${x} + ${a}) × ${b} = ${c}.`,
      `উল্টো ক্রমে খোলো: ${c} ÷ ${b} = ${x + a}, তারপর ${x + a} − ${a} = ${x}। মিলিয়ে নাও: (${x} + ${a}) × ${b} = ${c}।`,
    ),
    tip: t('To find a missing number, undo each step in the reverse order.', 'হারানো সংখ্যা পেতে প্রতিটি ধাপ উল্টো ক্রমে খোলো।'),
  }
}

// ---------- Level 2: decimals & percentages ----------

const FRACTIONS = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [3, 10], [7, 10], [9, 10], [1, 20], [3, 20], [7, 20], [1, 25], [6, 25]]

function fractionToDecimal(rand) {
  const [n, d] = rand.pick(FRACTIONS)
  const ans = n / d
  const scaled = d === 10 ? '' : ` (${n}/${d} = ${(n * 100) / d}/100)`
  return {
    id: `L2-${n}/${d}`,
    topic: 'decimal',
    prompt: t('Write the fraction as a decimal.', 'ভগ্নাংশটিকে দশমিকে লেখো।'),
    equation: `${n}/${d} = ?`,
    choices: numberChoices(rand, ans, [Number(`${n}.${d}`), Number(`0.${n}${d}`), d / 100, ans + 0.1], { step: 0.05 }),
    answer: fmt(ans),
    explain: t(
      `A fraction bar means divide: ${n} ÷ ${d} = ${fmt(ans)}${scaled}.`,
      `ভগ্নাংশের দাগ মানে ভাগ: ${n} ÷ ${d} = ${fmt(ans)}${scaled}।`,
    ),
    tip: t('Make the bottom number 10 or 100, and the decimal appears.', 'নিচের সংখ্যাকে ১০ বা ১০০ বানাও, দশমিক নিজেই দেখা দেবে।'),
  }
}

function decimalToPercent(rand) {
  const p = 5 * rand.int(1, 19)
  const d = p / 100
  return {
    id: `L2-${p}%`,
    topic: 'percent',
    prompt: t('Write the decimal as a percentage.', 'দশমিকটিকে শতকরায় লেখো।'),
    equation: `${fmt(d)} = ?%`,
    unit: '%',
    choices: numberChoices(rand, p, [p / 10, p * 10, 100 - p], { step: 5 }),
    answer: String(p),
    explain: t(
      `Percent means "out of 100": ${fmt(d)} = ${p} hundredths = ${p}%.`,
      `শতকরা মানে "১০০-এর মধ্যে": ${fmt(d)} = ১০০ ভাগের ${p} ভাগ = ${p}%।`,
    ),
    tip: t('Decimal → percent: multiply by 100 (move the point two places right).', 'দশমিক → শতকরা: ১০০ দিয়ে গুণ করো (দশমিক বিন্দু দুই ঘর ডানে)।'),
  }
}

function decimalAdd(rand) {
  const a = rand.int(11, 79) / 10
  const b = rand.int(101, 699) / 100
  const ans = a + b
  return {
    id: `L2-${a}+${b}`,
    topic: 'decimal',
    prompt: t('Add the decimals.', 'দশমিক সংখ্যাগুলো যোগ করো।'),
    equation: `${fmt(a)} + ${fmt(b)} = ?`,
    choices: numberChoices(rand, ans, [a / 10 + b, a + b / 10, ans + 0.1, ans - 0.01], { step: 0.1 }),
    answer: fmt(ans),
    explain: t(
      `Line up the decimal points: ${a.toFixed(2)} + ${b.toFixed(2)} = ${fmt(ans)}.`,
      `দশমিক বিন্দু এক লাইনে রাখো: ${a.toFixed(2)} + ${b.toFixed(2)} = ${fmt(ans)}।`,
    ),
    tip: t('Line up the points and fill gaps with zeros: 3.5 is the same as 3.50.', 'বিন্দু মিলিয়ে লেখো, ফাঁকা ঘরে শূন্য বসাও: ৩.৫ আর ৩.৫০ একই।'),
  }
}

function decimalTimes(rand) {
  const d = rand.int(2, 9)
  const w = rand.int(3, 9)
  const a = d / 10
  const ans = (d * w) / 10
  return {
    id: `L2-${a}x${w}`,
    topic: 'decimal',
    prompt: t('Multiply the decimal.', 'দশমিক সংখ্যাটি গুণ করো।'),
    equation: `${fmt(a)} × ${w} = ?`,
    choices: numberChoices(rand, ans, [d * w, (d * w) / 100, a + w], { step: 0.1 }),
    answer: fmt(ans),
    explain: t(
      `${d} × ${w} = ${d * w}. ${fmt(a)} has one decimal place, so the answer has one too: ${fmt(ans)}.`,
      `${d} × ${w} = ${d * w}। ${fmt(a)}-এ দশমিকের পরে একটি অঙ্ক, তাই উত্তরেও একটি: ${fmt(ans)}।`,
    ),
    tip: t('Multiply as whole numbers, then put back as many decimal places as the question had.', 'পূর্ণসংখ্যার মতো গুণ করো, তারপর প্রশ্নে যতগুলো দশমিক ঘর ছিল ততগুলো ফিরিয়ে দাও।'),
  }
}

/** A base between min and max that makes p% of it a whole number. */
function baseFor(rand, p, min = 20, max = 200) {
  const step = 100 / gcd(p, 100)
  return step * rand.int(Math.ceil(min / step), Math.floor(max / step))
}

function percentOf(rand) {
  const p = rand.pick([10, 20, 25, 30, 40, 50, 75])
  const base = baseFor(rand, p)
  const ans = (p * base) / 100
  return {
    id: `L2-${p}%of${base}`,
    topic: 'percent',
    prompt: t(`What is ${p}% of ${base}?`, `${base}-এর ${p}% কত?`),
    equation: `${p}% × ${base} = ?`,
    choices: numberChoices(rand, ans, [base - ans, ans * 2, base / 10, p]),
    answer: String(ans),
    explain: t(
      `${p}% means ${p}/100, so ${base} × ${p} ÷ 100 = ${ans}. (Check: 10% of ${base} is ${fmt(base / 10)}.)`,
      `${p}% মানে ${p}/100, তাই ${base} × ${p} ÷ 100 = ${ans}। (মিলিয়ে নাও: ${base}-এর 10% হলো ${fmt(base / 10)}।)`,
    ),
    tip: t('Find 10% first (divide by 10), then build any percentage from it.', 'আগে 10% বের করো (১০ দিয়ে ভাগ), তারপর তা দিয়ে যেকোনো শতকরা বানাও।'),
  }
}

const ITEMS = [
  t('school bag', 'স্কুলব্যাগ'), t('football', 'ফুটবল'), t('story-book set', 'গল্পের বইয়ের সেট'),
  t('board game', 'বোর্ড গেম'), t('cricket bat', 'ক্রিকেট ব্যাট'), t('raincoat', 'রেইনকোট'),
]

function discount(rand) {
  const p = rand.pick([10, 20, 25, 50])
  const price = 20 * rand.int(10, 40)
  const off = (price * p) / 100
  const ans = price - off
  const item = rand.pick(ITEMS)
  return {
    id: `L2-off${p}-${price}`,
    topic: 'percent',
    prompt: t(
      `A ${item.en} costs ${price} taka. It is ${p}% off. What is the sale price?`,
      `একটি ${item.bn}-এর দাম ${price} টাকা। এখন ${p}% ছাড়। ছাড়ের পর দাম কত?`,
    ),
    unit: TAKA,
    choices: numberChoices(rand, ans, [off, price - p, price + off], { step: 10 }),
    answer: String(ans),
    explain: t(
      `Discount: ${p}% of ${price} = ${off} taka. Sale price: ${price} − ${off} = ${ans} taka.`,
      `ছাড়: ${price}-এর ${p}% = ${off} টাকা। ছাড়ের পর দাম: ${price} − ${off} = ${ans} টাকা।`,
    ),
    tip: t(`Shortcut: ${p}% off means you pay ${100 - p}% of the price.`, `সহজ কৌশল: ${p}% ছাড় মানে দামের ${100 - p}% দিতে হবে।`),
  }
}

function percentChange(rand) {
  const p = rand.pick([10, 20, 25, 50])
  const base = 20 * rand.int(3, 25)
  const change = (base * p) / 100
  if (rand.chance(0.5)) {
    const ans = base + change
    return {
      id: `L2-up${p}-${base}`,
      topic: 'percent',
      prompt: t(
        `A school had ${base} students. The next year, the number grew by ${p}%. How many students are there now?`,
        `একটি স্কুলে ${base} জন শিক্ষার্থী ছিল। পরের বছর সংখ্যাটি ${p}% বেড়েছে। এখন কতজন শিক্ষার্থী?`,
      ),
      unit: t('students', 'জন'),
      choices: numberChoices(rand, ans, [base + p, change, base - change]),
      answer: String(ans),
      explain: t(
        `Increase: ${p}% of ${base} = ${change}. New total: ${base} + ${change} = ${ans}.`,
        `বৃদ্ধি: ${base}-এর ${p}% = ${change}। নতুন মোট: ${base} + ${change} = ${ans}।`,
      ),
      tip: t('A percentage increase is worked out from the starting amount.', 'শতকরা বৃদ্ধি সবসময় শুরুর পরিমাণ থেকে হিসাব করা হয়।'),
    }
  }
  const ans = base - change
  return {
    id: `L2-down${p}-${base}`,
    topic: 'percent',
    prompt: t(
      `A water tank holds ${base} litres. ${p}% of the water is used. How many litres are left?`,
      `একটি ট্যাংকে ${base} লিটার পানি আছে। এর ${p}% খরচ হয়ে গেছে। কত লিটার বাকি আছে?`,
    ),
    unit: t('litres', 'লিটার'),
    choices: numberChoices(rand, ans, [base - p, change, base + change]),
    answer: String(ans),
    explain: t(
      `Used: ${p}% of ${base} = ${change} litres. Left: ${base} − ${change} = ${ans} litres.`,
      `খরচ: ${base}-এর ${p}% = ${change} লিটার। বাকি: ${base} − ${change} = ${ans} লিটার।`,
    ),
    tip: t(`${p}% used means ${100 - p}% is left.`, `${p}% খরচ মানে ${100 - p}% বাকি।`),
  }
}

function whatPercent(rand) {
  const p = 5 * rand.int(2, 19)
  const base = rand.pick([20, 40, 60, 80, 200])
  const part = (base * p) / 100
  const name = rand.pick(NAMES)
  return {
    id: `L2-${part}of${base}`,
    topic: 'percent',
    prompt: t(
      `${name.en} scored ${part} out of ${base} on a quiz. What percentage is that?`,
      `${name.bn} একটি কুইজে ${base}-এর মধ্যে ${part} পেয়েছে। শতকরা কত পেয়েছে?`,
    ),
    unit: '%',
    choices: numberChoices(rand, p, [part, base - part, 100 - p], { step: 5 }),
    answer: String(p),
    explain: t(
      `${part} out of ${base} = ${part} ÷ ${base} = ${fmt(part / base)}, and ${fmt(part / base)} × 100 = ${p}%.`,
      `${base}-এর মধ্যে ${part} = ${part} ÷ ${base} = ${fmt(part / base)}, আর ${fmt(part / base)} × 100 = ${p}%।`,
    ),
    tip: t('Percentage = part ÷ whole × 100.', 'শতকরা = অংশ ÷ মোট × ১০০।'),
  }
}

function reversePercent(rand) {
  const p = rand.pick([10, 20, 25, 50])
  const original = 100 * rand.int(2, 12)
  const sale = (original * (100 - p)) / 100
  const item = rand.pick(ITEMS)
  return {
    id: `L2-rev${p}-${sale}`,
    topic: 'percent',
    prompt: t(
      `After a ${p}% discount, a ${item.en} costs ${sale} taka. What was the original price?`,
      `${p}% ছাড়ের পর একটি ${item.bn}-এর দাম ${sale} টাকা। আসল দাম কত ছিল?`,
    ),
    unit: TAKA,
    choices: numberChoices(rand, original, [sale + (sale * p) / 100, sale + p, (sale * 100) / p], { step: 50 }),
    answer: String(original),
    explain: t(
      `After ${p}% off you pay ${100 - p}%. So ${sale} is ${100 - p}% of the price: ${sale} ÷ ${100 - p} × 100 = ${original} taka.`,
      `${p}% ছাড়ে দিতে হয় ${100 - p}%। তাই ${sale} হলো দামের ${100 - p}%: ${sale} ÷ ${100 - p} × 100 = ${original} টাকা।`,
    ),
    tip: t('Adding the same percentage back doesn’t work: the discount came off the bigger, original price.', 'একই শতকরা আবার যোগ করলে হবে না: ছাড়টা দেওয়া হয়েছিল বড়, আসল দাম থেকে।'),
  }
}

// ---------- Level 3: ratios, proportions & rates ----------

/** Two different numbers in [lo, hi] with no common factor. */
function coprimePair(rand, lo, hi) {
  for (;;) {
    const a = rand.int(lo, hi)
    const b = rand.int(lo, hi)
    if (a !== b && gcd(a, b) === 1) return [a, b]
  }
}

function simplifyRatio(rand) {
  const [a, b] = coprimePair(rand, 1, 7)
  const k = rand.int(2, 6)
  return {
    id: `L3-${a * k}:${b * k}`,
    topic: 'ratio',
    prompt: t('Write this ratio in its simplest form.', 'অনুপাতটিকে সরলতম রূপে লেখো।'),
    equation: `${a * k} : ${b * k}`,
    choices: ratioChoices(rand, [a, b], [[b, a], [a + 1, b + 1], [a * k - b, b], [a, b * k]]),
    answer: ratio(a, b),
    explain: t(
      `Both numbers divide by ${k}: ${a * k} ÷ ${k} = ${a} and ${b * k} ÷ ${k} = ${b}. So the ratio is ${ratio(a, b)}.`,
      `দুটি সংখ্যাই ${k} দিয়ে ভাগ যায়: ${a * k} ÷ ${k} = ${a} আর ${b * k} ÷ ${k} = ${b}। তাই অনুপাত ${ratio(a, b)}।`,
    ),
    tip: t('Divide both sides by their greatest common factor. Order matters: 2 : 3 is not 3 : 2.', 'দুই পাশকে গসাগু দিয়ে ভাগ করো। ক্রম গুরুত্বপূর্ণ: ২ : ৩ আর ৩ : ২ এক নয়।'),
  }
}

const SHOP = [
  { many: t('pens', 'টি কলমের'), one: t('pen', 'একটি কলমের') },
  { many: t('notebooks', 'টি খাতার'), one: t('notebook', 'একটি খাতার') },
  { many: t('mangoes', 'টি আমের'), one: t('mango', 'একটি আমের') },
  { many: t('erasers', 'টি রাবারের'), one: t('eraser', 'একটি রাবারের') },
]

function unitPrice(rand) {
  const n = rand.int(3, 9)
  const each = 5 * rand.int(2, 12)
  const total = n * each
  const item = rand.pick(SHOP)
  return {
    id: `L3-${n}for${total}`,
    topic: 'rate',
    prompt: t(
      `${n} ${item.many.en} cost ${total} taka. How much does 1 ${item.one.en} cost?`,
      `${n}${item.many.bn} দাম ${total} টাকা। ${item.one.bn} দাম কত?`,
    ),
    unit: TAKA,
    choices: numberChoices(rand, each, [total - n, each + 5, total / 2, each * 2], { step: 5 }),
    answer: String(each),
    explain: t(`Share the cost equally: ${total} ÷ ${n} = ${each} taka each.`, `দাম সমান ভাগ করো: ${total} ÷ ${n} = প্রতিটি ${each} টাকা।`),
    tip: t('A unit rate is the amount for ONE. Divide to find it.', 'একক হার মানে একটির পরিমাণ। ভাগ করে বের করো।'),
  }
}

function speed(rand) {
  const h = rand.int(2, 5)
  const v = 10 * rand.int(3, 9)
  const d = v * h
  return {
    id: `L3-${d}km${h}h`,
    topic: 'rate',
    prompt: t(`A bus travels ${d} km in ${h} hours at a steady speed. What is its speed?`, `একটি বাস সমান গতিতে ${h} ঘণ্টায় ${d} কিমি যায়। বাসটির গতি কত?`),
    unit: t('km/h', 'কিমি/ঘণ্টা'),
    choices: numberChoices(rand, v, [d * h, d - h, v + 10], { step: 10 }),
    answer: String(v),
    explain: t(`Speed = distance ÷ time = ${d} ÷ ${h} = ${v} km/h.`, `গতি = দূরত্ব ÷ সময় = ${d} ÷ ${h} = ${v} কিমি/ঘণ্টা।`),
    tip: t('Speed tells you how far you go in ONE hour.', 'গতি বলে দেয় এক ঘণ্টায় কতদূর যাওয়া যায়।'),
  }
}

function recipe(rand) {
  const e = rand.int(2, 4)
  const b = rand.pick([4, 6, 8, 10])
  const m = rand.int(2, 4)
  const target = b * m
  const ans = e * m
  return {
    id: `L3-${e}eggs${b}to${target}`,
    topic: 'ratio',
    prompt: t(
      `A recipe uses ${e} eggs to make ${b} pancakes. How many eggs are needed for ${target} pancakes?`,
      `একটি রেসিপিতে ${b}টি প্যানকেক বানাতে ${e}টি ডিম লাগে। ${target}টি প্যানকেক বানাতে কয়টি ডিম লাগবে?`,
    ),
    unit: t('eggs', 'টি ডিম'),
    choices: numberChoices(rand, ans, [e + target - b, ans + e, e + m]),
    answer: String(ans),
    explain: t(
      `${target} pancakes is ${m} times ${b}, so use ${m} times the eggs: ${m} × ${e} = ${ans} eggs.`,
      `${target}টি প্যানকেক হলো ${b}-এর ${m} গুণ, তাই ডিমও ${m} গুণ: ${m} × ${e} = ${ans}টি ডিম।`,
    ),
    tip: t('Scaling a recipe means MULTIPLYING every amount by the same number, not adding.', 'রেসিপি বড় করা মানে প্রতিটি পরিমাণ একই সংখ্যা দিয়ে গুণ করা, যোগ নয়।'),
  }
}

function proportion(rand) {
  const [a, b] = coprimePair(rand, 1, 9)
  const k = rand.int(2, 6)
  const ans = a * k
  return {
    id: `L3-${a}:${b}=?:${b * k}`,
    topic: 'ratio',
    prompt: t('Find the missing number that keeps the ratios equal.', 'অনুপাত সমান রাখতে হারানো সংখ্যাটি বের করো।'),
    equation: `${a} : ${b} = ? : ${b * k}`,
    choices: numberChoices(rand, ans, [a + b * k - b, b * k - b, ans + k]),
    answer: String(ans),
    explain: t(
      `${b} × ${k} = ${b * k}, so multiply ${a} by ${k} too: ${a} × ${k} = ${ans}.`,
      `${b} × ${k} = ${b * k}, তাই ${a}-কেও ${k} দিয়ে গুণ করো: ${a} × ${k} = ${ans}।`,
    ),
    tip: t('Whatever you multiply one side of a ratio by, multiply the other side by too.', 'অনুপাতের এক পাশকে যা দিয়ে গুণ করবে, অন্য পাশকেও তা দিয়ে গুণ করো।'),
  }
}

function shareRatio(rand) {
  const [a, b] = coprimePair(rand, 1, 5)
  const k = rand.int(2, 8)
  const total = (a + b) * k
  const ans = b * k
  return {
    id: `L3-share${a}:${b}-${total}`,
    topic: 'ratio',
    prompt: t(
      `Boys and girls in a club are in the ratio ${ratio(a, b)}. There are ${total} members. How many are girls?`,
      `একটি ক্লাবে ছেলে আর মেয়ের অনুপাত ${ratio(a, b)}। মোট সদস্য ${total} জন। মেয়ে কতজন?`,
    ),
    visual: { kind: 'tape', parts: [a, b], labels: [t('boys', 'ছেলে'), t('girls', 'মেয়ে')], tones: ['sky', 'amber'] },
    unit: t('girls', 'জন'),
    choices: numberChoices(rand, ans, [a * k, total - b, total / b, total / 2]),
    answer: String(ans),
    explain: t(
      `${a} + ${b} = ${a + b} equal parts. ${total} ÷ ${a + b} = ${k} in each part. Girls: ${b} × ${k} = ${ans}.`,
      `${a} + ${b} = ${a + b}টি সমান অংশ। ${total} ÷ ${a + b} = প্রতি অংশে ${k}। মেয়ে: ${b} × ${k} = ${ans}।`,
    ),
    tip: t('Add the ratio numbers to find how many equal parts there are.', 'মোট কয়টি সমান অংশ, তা পেতে অনুপাতের সংখ্যাগুলো যোগ করো।'),
  }
}

function mapScale(rand) {
  const s = rand.pick([2, 5, 10, 25, 50])
  const c = rand.int(3, 12)
  const ans = s * c
  return {
    id: `L3-map${s}x${c}`,
    topic: 'ratio',
    prompt: t(
      `On a map, 1 cm stands for ${s} km. Two towns are ${c} cm apart on the map. How far apart are they really?`,
      `একটি মানচিত্রে ১ সেমি মানে ${s} কিমি। মানচিত্রে দুটি শহরের দূরত্ব ${c} সেমি। আসলে তারা কত দূরে?`,
    ),
    unit: t('km', 'কিমি'),
    choices: numberChoices(rand, ans, [s + c, c * 10, ans + s]),
    answer: String(ans),
    explain: t(`Every 1 cm is ${s} km, so ${c} cm is ${c} × ${s} = ${ans} km.`, `প্রতি ১ সেমি = ${s} কিমি, তাই ${c} সেমি = ${c} × ${s} = ${ans} কিমি।`),
    tip: t('A map scale is a ratio: multiply the map distance by the scale.', 'মানচিত্রের স্কেল একটি অনুপাত: মানচিত্রের দূরত্বকে স্কেল দিয়ে গুণ করো।'),
  }
}

function workRate(rand) {
  const m = rand.int(2, 5)
  const per = rand.int(4, 15)
  const pages = per * m
  const later = rand.int(m + 1, m + 6)
  const ans = per * later
  return {
    id: `L3-print${pages}in${m}to${later}`,
    topic: 'rate',
    prompt: t(
      `A printer prints ${pages} pages in ${m} minutes. At the same rate, how many pages does it print in ${later} minutes?`,
      `একটি প্রিন্টার ${m} মিনিটে ${pages} পৃষ্ঠা ছাপে। একই হারে ${later} মিনিটে কত পৃষ্ঠা ছাপবে?`,
    ),
    unit: t('pages', 'পৃষ্ঠা'),
    choices: numberChoices(rand, ans, [pages + later - m, pages * later, ans + per]),
    answer: String(ans),
    explain: t(
      `Per minute: ${pages} ÷ ${m} = ${per} pages. In ${later} minutes: ${per} × ${later} = ${ans} pages.`,
      `প্রতি মিনিটে: ${pages} ÷ ${m} = ${per} পৃষ্ঠা। ${later} মিনিটে: ${per} × ${later} = ${ans} পৃষ্ঠা।`,
    ),
    tip: t('Find the rate for ONE unit first, then multiply.', 'আগে একটির হার বের করো, তারপর গুণ করো।'),
  }
}

function bestBuy(rand) {
  const n1 = rand.int(3, 5)
  const u1 = rand.int(16, 30)
  const n2 = n1 + rand.int(2, 4)
  const u2 = u1 - rand.int(1, 4)
  const [c1, c2] = [n1 * u1, n2 * u2]
  return {
    id: `L3-buy${n1}/${c1}-${n2}/${c2}`,
    topic: 'rate',
    prompt: t(
      `Juice boxes: Pack A has ${n1} for ${c1} taka. Pack B has ${n2} for ${c2} taka. Which pack is cheaper per box, and what does ONE box cost in it?`,
      `জুসের বাক্স: প্যাক ক-তে ${n1}টি ${c1} টাকায়, প্যাক খ-তে ${n2}টি ${c2} টাকায়। কোন প্যাকে প্রতি বাক্সের দাম কম, আর সেখানে একটি বাক্সের দাম কত?`,
    ),
    unit: TAKA,
    choices: numberChoices(rand, u2, [u1, c2 - c1, u1 - u2]),
    answer: String(u2),
    explain: t(
      `Pack A: ${c1} ÷ ${n1} = ${u1} taka each. Pack B: ${c2} ÷ ${n2} = ${u2} taka each. Pack B is the better buy at ${u2} taka a box.`,
      `প্যাক ক: ${c1} ÷ ${n1} = প্রতিটি ${u1} টাকা। প্যাক খ: ${c2} ÷ ${n2} = প্রতিটি ${u2} টাকা। প্যাক খ সাশ্রয়ী: প্রতিটি ${u2} টাকা।`,
    ),
    tip: t('Compare the price of ONE item. A bigger pack can cost more in total but less each.', 'একটির দাম তুলনা করো। বড় প্যাকের মোট দাম বেশি হলেও প্রতিটির দাম কম হতে পারে।'),
  }
}

function ratioDifference(rand) {
  let a, b
  do { [a, b] = coprimePair(rand, 1, 7) } while (a <= b)
  const k = rand.int(2, 8)
  const diff = (a - b) * k
  const ans = b * k
  return {
    id: `L3-diff${a}:${b}-${diff}`,
    topic: 'ratio',
    prompt: t(
      `Red and blue marbles are in the ratio ${ratio(a, b)}. There are ${diff} more red marbles than blue. How many blue marbles are there?`,
      `লাল আর নীল মার্বেলের অনুপাত ${ratio(a, b)}। নীলের চেয়ে লাল মার্বেল ${diff}টি বেশি। নীল মার্বেল কয়টি?`,
    ),
    visual: { kind: 'tape', parts: [a, b], labels: [t('red', 'লাল'), t('blue', 'নীল')], tones: ['rose', 'sky'] },
    unit: t('marbles', 'টি'),
    choices: numberChoices(rand, ans, [a * k, diff, (a + b) * k]),
    answer: String(ans),
    explain: t(
      `The difference is ${a} − ${b} = ${a - b} parts = ${diff} marbles, so 1 part = ${diff} ÷ ${a - b} = ${k}. Blue: ${b} × ${k} = ${ans}.`,
      `পার্থক্য ${a} − ${b} = ${a - b} অংশ = ${diff}টি মার্বেল, তাই ১ অংশ = ${diff} ÷ ${a - b} = ${k}। নীল: ${b} × ${k} = ${ans}।`,
    ),
    tip: t('Draw the ratio as bars of equal parts: the extra parts show the difference.', 'অনুপাতকে সমান অংশের বার হিসেবে আঁকো: বাড়তি অংশগুলোই পার্থক্য।'),
  }
}

// ---------- Level 4: intro to pre-algebra ----------

const SOLVE = t('Solve for x.', 'x-এর মান বের করো।')
const BALANCE_TIP = t('Keep the equation balanced: whatever you do to one side, do to the other.', 'সমীকরণের ভারসাম্য রাখো: এক পাশে যা করবে, অন্য পাশেও তা-ই করো।')
const TWO_STEP_TIP = t('Two-step equations: undo the + or − first, then the × or ÷.', 'দুই ধাপের সমীকরণ: আগে + বা − উল্টাও, তারপর × বা ÷।')

/** One "solve for x" question. */
function solveFor(rand, { id, equation, x, mistakes, explain, tip, ...extra }) {
  return {
    id: `L4-${id}`,
    topic: 'algebra',
    prompt: SOLVE,
    equation,
    choices: numberChoices(rand, x, mistakes),
    answer: String(x),
    explain,
    tip,
    ...extra,
  }
}

function plusEq(rand) {
  const x = rand.int(2, 30)
  const a = rand.int(2, 20)
  const b = x + a
  return solveFor(rand, {
    id: `x+${a}=${b}`, equation: `x + ${a} = ${b}`, x, mistakes: [b + a, b, a],
    explain: t(`Subtract ${a} from both sides: x = ${b} − ${a} = ${x}.`, `দুই পাশ থেকে ${a} বিয়োগ করো: x = ${b} − ${a} = ${x}।`),
    tip: BALANCE_TIP,
    visual: { kind: 'balance', left: `x + ${a}`, right: String(b) },
  })
}

function minusEq(rand) {
  const x = rand.int(10, 40)
  const a = rand.int(2, x - 3)
  const b = x - a
  return solveFor(rand, {
    id: `x-${a}=${b}`, equation: `x − ${a} = ${b}`, x, mistakes: [b - a, b, a],
    explain: t(`Add ${a} to both sides: x = ${b} + ${a} = ${x}.`, `দুই পাশে ${a} যোগ করো: x = ${b} + ${a} = ${x}।`),
    tip: t('Undo subtraction with addition.', 'বিয়োগকে উল্টাতে যোগ করো।'),
    visual: { kind: 'balance', left: `x − ${a}`, right: String(b) },
  })
}

function timesEq(rand) {
  const a = rand.int(2, 9)
  const x = rand.int(2, 12)
  const b = a * x
  return solveFor(rand, {
    id: `${a}x=${b}`, equation: `${a}x = ${b}`, x, mistakes: [b - a, b * a, b + a],
    explain: t(`${a}x means ${a} × x. Divide both sides by ${a}: x = ${b} ÷ ${a} = ${x}.`, `${a}x মানে ${a} × x। দুই পাশকে ${a} দিয়ে ভাগ করো: x = ${b} ÷ ${a} = ${x}।`),
    tip: t('A number written right next to x means multiply. Undo it by dividing.', 'x-এর ঠিক পাশে লেখা সংখ্যা মানে গুণ। ভাগ করে উল্টাও।'),
    visual: { kind: 'balance', left: `${a}x`, right: String(b) },
  })
}

function divideEq(rand) {
  const a = rand.int(2, 6)
  const b = rand.int(2, 12)
  const x = a * b
  return solveFor(rand, {
    id: `x/${a}=${b}`, equation: `x ÷ ${a} = ${b}`, x, mistakes: [b / a, b + a, b - a, x + a],
    explain: t(`Multiply both sides by ${a}: x = ${b} × ${a} = ${x}.`, `দুই পাশকে ${a} দিয়ে গুণ করো: x = ${b} × ${a} = ${x}।`),
    tip: t('Undo division with multiplication.', 'ভাগকে উল্টাতে গুণ করো।'),
  })
}

function twoStepPlus(rand) {
  const a = rand.int(2, 6)
  const x = rand.int(1, 10)
  const b = rand.int(1, 15)
  const c = a * x + b
  return solveFor(rand, {
    id: `${a}x+${b}=${c}`, equation: `${a}x + ${b} = ${c}`, x, mistakes: [(c + b) / a, c - b, c / a - b, x + 1],
    explain: t(`Subtract ${b}: ${a}x = ${c - b}. Divide by ${a}: x = ${c - b} ÷ ${a} = ${x}.`, `${b} বিয়োগ করো: ${a}x = ${c - b}। ${a} দিয়ে ভাগ করো: x = ${c - b} ÷ ${a} = ${x}।`),
    tip: TWO_STEP_TIP,
    visual: { kind: 'balance', left: `${a}x + ${b}`, right: String(c) },
  })
}

function twoStepMinus(rand) {
  const a = rand.int(2, 6)
  const x = rand.int(2, 10)
  const b = rand.int(1, Math.min(15, a * x - 1))
  const c = a * x - b
  return solveFor(rand, {
    id: `${a}x-${b}=${c}`, equation: `${a}x − ${b} = ${c}`, x, mistakes: [(c - b) / a, c + b, x - 1, c - b],
    explain: t(`Add ${b}: ${a}x = ${c + b}. Divide by ${a}: x = ${c + b} ÷ ${a} = ${x}.`, `${b} যোগ করো: ${a}x = ${c + b}। ${a} দিয়ে ভাগ করো: x = ${c + b} ÷ ${a} = ${x}।`),
    tip: TWO_STEP_TIP,
  })
}

function divPlusEq(rand) {
  const a = rand.int(2, 5)
  const q = rand.int(2, 10)
  const x = a * q
  const b = rand.int(1, 12)
  const c = q + b
  return solveFor(rand, {
    id: `x/${a}+${b}=${c}`, equation: `x ÷ ${a} + ${b} = ${c}`, x, mistakes: [(c + b) * a, c * a, q, c * a - b],
    explain: t(`Subtract ${b}: x ÷ ${a} = ${q}. Multiply by ${a}: x = ${q} × ${a} = ${x}.`, `${b} বিয়োগ করো: x ÷ ${a} = ${q}। ${a} দিয়ে গুণ করো: x = ${q} × ${a} = ${x}।`),
    tip: TWO_STEP_TIP,
  })
}

function bracketEq(rand) {
  const a = rand.int(2, 5)
  const x = rand.int(1, 10)
  const b = rand.int(1, 8)
  const c = a * (x + b)
  return solveFor(rand, {
    id: `${a}(x+${b})=${c}`, equation: `${a}(x + ${b}) = ${c}`, x, mistakes: [c / a + b, c - b, c / a, (c - b) / a],
    explain: t(`Divide by ${a}: x + ${b} = ${c / a}. Subtract ${b}: x = ${c / a} − ${b} = ${x}.`, `${a} দিয়ে ভাগ করো: x + ${b} = ${c / a}। ${b} বিয়োগ করো: x = ${c / a} − ${b} = ${x}।`),
    tip: t(`${a}(x + ${b}) means ${a} lots of (x + ${b}). Divide by ${a} to open the brackets.`, `${a}(x + ${b}) মানে (x + ${b})-এর ${a} গুণ। বন্ধনী খুলতে ${a} দিয়ে ভাগ করো।`),
  })
}

function thinkOfNumber(rand) {
  const a = rand.int(2, 6)
  const x = rand.int(2, 12)
  const b = rand.int(1, Math.min(12, a * x - 1))
  const c = a * x - b
  const name = rand.pick(NAMES)
  return solveFor(rand, {
    id: `think${a}x-${b}=${c}`, x, mistakes: [(c - b) / a, c + b, (c + b) / a + 1, c / a],
    prompt: t(
      `${name.en} thinks of a number, multiplies it by ${a}, then subtracts ${b}. The result is ${c}. What was the number?`,
      `${name.bn} একটি সংখ্যা ভাবল, সেটিকে ${a} দিয়ে গুণ করল, তারপর ${b} বিয়োগ করল। ফল হলো ${c}। সংখ্যাটি কত ছিল?`,
    ),
    explain: t(
      `Write it as ${a}x − ${b} = ${c}. Add ${b}: ${a}x = ${c + b}. Divide by ${a}: x = ${x}.`,
      `এভাবে লেখো: ${a}x − ${b} = ${c}। ${b} যোগ করো: ${a}x = ${c + b}। ${a} দিয়ে ভাগ করো: x = ${x}।`,
    ),
    tip: t('Turn the words into an equation, then work backwards.', 'কথাগুলোকে সমীকরণে লেখো, তারপর উল্টো দিক থেকে সমাধান করো।'),
  })
}

function bothSides(rand) {
  const a = rand.int(3, 7)
  const c = rand.int(1, a - 1)
  const x = rand.int(1, 9)
  const b = rand.int(1, 10)
  const k = a - c
  const d = k * x + b
  return solveFor(rand, {
    id: `${a}x+${b}=${c}x+${d}`, equation: `${coef(a)} + ${b} = ${coef(c)} + ${d}`, x, mistakes: [(d - b) / (a + c), d - b, (d + b) / k],
    explain: t(
      `Subtract ${coef(c)} from both sides: ${coef(k)} + ${b} = ${d}. Subtract ${b}: ${coef(k)} = ${d - b}. Divide by ${k}: x = ${x}.`,
      `দুই পাশ থেকে ${coef(c)} বিয়োগ করো: ${coef(k)} + ${b} = ${d}। ${b} বিয়োগ করো: ${coef(k)} = ${d - b}। ${k} দিয়ে ভাগ করো: x = ${x}।`,
    ),
    tip: t('x on both sides? Gather all the x terms on one side first.', 'দুই পাশেই x? আগে সব x এক পাশে আনো।'),
  })
}

// ---------- Level 5: geometry & measurement ----------

function rectPerimeter(rand) {
  const l = rand.int(4, 15)
  const w = rand.int(2, l - 1)
  const ans = 2 * (l + w)
  return {
    id: `L5-P${l}x${w}`,
    topic: 'geometry',
    prompt: t('What is the perimeter of this rectangle?', 'এই আয়তক্ষেত্রের পরিসীমা কত?'),
    visual: { kind: 'rect', w: String(l), h: String(w), unit: CM },
    unit: CM,
    choices: numberChoices(rand, ans, [l * w, l + w, 2 * l + w]),
    answer: String(ans),
    explain: t(`Perimeter = 2 × (length + width) = 2 × (${l} + ${w}) = ${ans} cm.`, `পরিসীমা = 2 × (দৈর্ঘ্য + প্রস্থ) = 2 × (${l} + ${w}) = ${ans} সেমি।`),
    tip: t('Perimeter is the distance around the edge. Area is the space inside.', 'পরিসীমা হলো চারপাশের দূরত্ব। ক্ষেত্রফল হলো ভেতরের জায়গা।'),
  }
}

function rectArea(rand) {
  const l = rand.int(4, 15)
  const w = rand.int(2, l - 1)
  const ans = l * w
  return {
    id: `L5-A${l}x${w}`,
    topic: 'geometry',
    prompt: t('What is the area of this rectangle?', 'এই আয়তক্ষেত্রের ক্ষেত্রফল কত?'),
    visual: { kind: 'rect', w: String(l), h: String(w), unit: CM },
    unit: CM2,
    choices: numberChoices(rand, ans, [2 * (l + w), l + w, ans + l]),
    answer: String(ans),
    explain: t(`Area = length × width = ${l} × ${w} = ${ans} cm².`, `ক্ষেত্রফল = দৈর্ঘ্য × প্রস্থ = ${l} × ${w} = ${ans} বর্গসেমি।`),
    tip: t('Area is measured in square units (cm²): how many 1 cm squares fit inside.', 'ক্ষেত্রফল মাপা হয় বর্গ এককে (cm²): ভেতরে কয়টি ১ সেমি বর্গ আঁটে।'),
  }
}

function triangleAngle(rand) {
  const a = rand.int(30, 80)
  const b = rand.int(25, 155 - a)
  const ans = 180 - a - b
  return {
    id: `L5-tri${a},${b}`,
    topic: 'geometry',
    prompt: t('Find the missing angle in the triangle.', 'ত্রিভুজের হারানো কোণটি বের করো।'),
    visual: { kind: 'triangle', angles: [a, b, null] },
    unit: DEG,
    choices: numberChoices(rand, ans, [360 - a - b, a + b, 180 - a], { step: 5 }),
    answer: String(ans),
    explain: t(`The angles in a triangle add up to 180°: 180 − ${a} − ${b} = ${ans}°.`, `ত্রিভুজের তিন কোণের যোগফল 180°: 180 − ${a} − ${b} = ${ans}°।`),
    tip: t('Triangle angles always total 180°.', 'ত্রিভুজের কোণগুলোর যোগফল সবসময় 180°।'),
  }
}

function rightTriangle(rand) {
  const a = rand.int(20, 70)
  const ans = 90 - a
  return {
    id: `L5-right${a}`,
    topic: 'geometry',
    prompt: t('This triangle has a right angle. Find the missing angle.', 'এই ত্রিভুজে একটি সমকোণ আছে। হারানো কোণটি বের করো।'),
    visual: { kind: 'triangle', angles: [90, a, null], right: true },
    unit: DEG,
    choices: numberChoices(rand, ans, [180 - a, a, 90, 270 - a], { step: 5 }),
    answer: String(ans),
    explain: t(`A right angle is 90°, so the other two share the last 90°: 90 − ${a} = ${ans}°.`, `সমকোণ 90°, তাই বাকি দুই কোণ মিলে 90°: 90 − ${a} = ${ans}°।`),
    tip: t('The little square in a corner means exactly 90°.', 'কোণে ছোট বর্গ চিহ্ন মানে ঠিক 90°।'),
  }
}

function triangleArea(rand) {
  const b = 2 * rand.int(3, 10)
  const h = rand.int(3, 12)
  const ans = (b * h) / 2
  return {
    id: `L5-triA${b}x${h}`,
    topic: 'geometry',
    prompt: t('What is the area of this triangle?', 'এই ত্রিভুজের ক্ষেত্রফল কত?'),
    visual: { kind: 'triArea', base: String(b), height: String(h), unit: CM },
    unit: CM2,
    choices: numberChoices(rand, ans, [b * h, b + h, 2 * (b + h)]),
    answer: String(ans),
    explain: t(`Area = ½ × base × height = ½ × ${b} × ${h} = ${ans} cm².`, `ক্ষেত্রফল = ½ × ভূমি × উচ্চতা = ½ × ${b} × ${h} = ${ans} বর্গসেমি।`),
    tip: t('A triangle is exactly half of a rectangle with the same base and height.', 'একই ভূমি ও উচ্চতার আয়তক্ষেত্রের ঠিক অর্ধেক হলো ত্রিভুজ।'),
  }
}

function quadAngle(rand) {
  let a, b, c, d
  do {
    a = rand.int(60, 130)
    b = rand.int(60, 130)
    c = rand.int(60, 130)
    d = 360 - a - b - c
  } while (d < 40 || d > 170)
  return {
    id: `L5-quad${a},${b},${c}`,
    topic: 'geometry',
    prompt: t('Find the missing angle in this quadrilateral.', 'এই চতুর্ভুজের হারানো কোণটি বের করো।'),
    visual: { kind: 'quad', angles: [a, b, c, null] },
    unit: DEG,
    choices: numberChoices(rand, d, [540 - a - b - c, 360 - a - b, d + 90, a + b + c - 180], { step: 5 }),
    answer: String(d),
    explain: t(`The angles in a quadrilateral add up to 360°: 360 − ${a} − ${b} − ${c} = ${d}°.`, `চতুর্ভুজের চার কোণের যোগফল 360°: 360 − ${a} − ${b} − ${c} = ${d}°।`),
    tip: t('A quadrilateral splits into two triangles, so its angles total 2 × 180° = 360°.', 'চতুর্ভুজকে দুটি ত্রিভুজে ভাগ করা যায়, তাই কোণের যোগফল 2 × 180° = 360°।'),
  }
}

function missingSide(rand) {
  const l = rand.int(5, 12)
  const w = rand.int(2, l - 1)
  const area = l * w
  return {
    id: `L5-side${area}/${l}`,
    topic: 'geometry',
    prompt: t(`A rectangle has an area of ${area} cm² and a length of ${l} cm. What is its width?`, `একটি আয়তক্ষেত্রের ক্ষেত্রফল ${area} বর্গসেমি আর দৈর্ঘ্য ${l} সেমি। প্রস্থ কত?`),
    visual: { kind: 'rect', w: String(l), h: '?', unit: CM, area: `${area} cm²` },
    unit: CM,
    choices: numberChoices(rand, w, [area - l, area / 2 - l, w + 2, l]),
    answer: String(w),
    explain: t(`Area = length × width, so width = ${area} ÷ ${l} = ${w} cm.`, `ক্ষেত্রফল = দৈর্ঘ্য × প্রস্থ, তাই প্রস্থ = ${area} ÷ ${l} = ${w} সেমি।`),
    tip: t('Know the area and one side? Divide to find the other side.', 'ক্ষেত্রফল আর এক বাহু জানা? ভাগ করে অন্য বাহু বের করো।'),
  }
}

function squareFromPerimeter(rand) {
  const s = rand.int(3, 12)
  const p = 4 * s
  const ans = s * s
  return {
    id: `L5-sq${p}`,
    topic: 'geometry',
    prompt: t(`A square has a perimeter of ${p} cm. What is its area?`, `একটি বর্গের পরিসীমা ${p} সেমি। এর ক্ষেত্রফল কত?`),
    visual: { kind: 'rect', w: '?', h: '?', unit: CM, square: true, perimeter: `P = ${p} cm` },
    unit: CM2,
    choices: numberChoices(rand, ans, [p, s * 5, (p / 2) ** 2, s * 2]),
    answer: String(ans),
    explain: t(`All 4 sides are equal: ${p} ÷ 4 = ${s} cm. Area: ${s} × ${s} = ${ans} cm².`, `চার বাহুই সমান: ${p} ÷ 4 = ${s} সেমি। ক্ষেত্রফল: ${s} × ${s} = ${ans} বর্গসেমি।`),
    tip: t('Work out the side length first: it unlocks everything else.', 'আগে বাহুর দৈর্ঘ্য বের করো, তা দিয়েই বাকি সব হবে।'),
  }
}

function isosceles(rand) {
  const a = 2 * rand.int(10, 70)
  const ans = (180 - a) / 2
  return {
    id: `L5-iso${a}`,
    topic: 'geometry',
    prompt: t('This triangle is isosceles: its two base angles are equal. Find one base angle.', 'এটি সমদ্বিবাহু ত্রিভুজ: ভূমির দুই কোণ সমান। ভূমির একটি কোণ বের করো।'),
    visual: { kind: 'triangle', angles: [a, null, null], isosceles: true },
    unit: DEG,
    choices: numberChoices(rand, ans, [180 - a, a, a / 2, 90], { step: 5 }),
    answer: String(ans),
    explain: t(`180 − ${a} = ${180 - a}° is left for the two equal angles: ${180 - a} ÷ 2 = ${ans}°.`, `সমান দুই কোণের জন্য বাকি থাকে 180 − ${a} = ${180 - a}°: ${180 - a} ÷ 2 = ${ans}°।`),
    tip: t('Matching tick marks on two sides mean the angles opposite them are equal too.', 'দুই বাহুতে একই দাগ মানে তাদের বিপরীত কোণগুলোও সমান।'),
  }
}

function lShape(rand) {
  const W = rand.int(8, 14)
  const H = rand.int(6, 12)
  const w = rand.int(2, W - 4)
  const h = rand.int(2, H - 3)
  const ans = W * H - w * h
  return {
    id: `L5-L${W}x${H}-${w}x${h}`,
    topic: 'geometry',
    prompt: t('A corner has been cut out of this rectangle. What is the area of the shape that is left?', 'এই আয়তক্ষেত্রের একটি কোণা কেটে নেওয়া হয়েছে। বাকি আকৃতিটির ক্ষেত্রফল কত?'),
    visual: { kind: 'lshape', W, H, w, h, unit: CM },
    unit: CM2,
    choices: numberChoices(rand, ans, [W * H, W * H - w - h, 2 * (W + H), ans + w]),
    answer: String(ans),
    explain: t(
      `Whole rectangle minus the missing corner: ${W} × ${H} − ${w} × ${h} = ${W * H} − ${w * h} = ${ans} cm².`,
      `পুরো আয়তক্ষেত্র থেকে কাটা কোণা বাদ: ${W} × ${H} − ${w} × ${h} = ${W * H} − ${w * h} = ${ans} বর্গসেমি।`,
    ),
    tip: t('Tricky shape? Split it into rectangles, or take a small rectangle away from a big one.', 'কঠিন আকৃতি? আয়তক্ষেত্রে ভাগ করো, অথবা বড়টি থেকে ছোটটি বাদ দাও।'),
  }
}

// ---------- rounds ----------

/** Builds one question per slot; a slot that repeats an earlier question is rolled again. */
function fill(slots, rand) {
  const out = []
  const seen = new Set()
  for (const slot of slots) {
    let question
    for (let tries = 0; tries < 30; tries++) {
      question = slot(rand)
      if (!seen.has(question.id)) { seen.add(question.id); break }
    }
    out.push(question)
  }
  return out
}

/** Each level's ten slots, easiest first. */
const LEVEL_SLOTS = {
  1: [addMul, subDiv, brackets, leftToRight, squarePlus, divTimes, bracketMix, bracketSquare, nested, missingNumber],
  2: [fractionToDecimal, decimalToPercent, decimalAdd, decimalTimes, percentOf, discount, percentChange, whatPercent, percentOf, reversePercent],
  3: [simplifyRatio, unitPrice, speed, recipe, proportion, shareRatio, mapScale, workRate, bestBuy, ratioDifference],
  4: [plusEq, minusEq, timesEq, divideEq, twoStepPlus, twoStepMinus, divPlusEq, bracketEq, thinkOfNumber, bothSides],
  5: [rectPerimeter, rectArea, triangleAngle, rightTriangle, triangleArea, quadAngle, missingSide, squareFromPerimeter, isosceles, lShape],
}

export function makeQuestions(levelId, rand, count) {
  const slots = LEVEL_SLOTS[levelId]
  if (!slots) throw new RangeError(`Unknown Math Hero Pro+ level: ${levelId}`)
  return fill(slots.slice(0, count), rand).map((question, i) => ({ ...question, id: `${question.id}#${i}` }))
}
