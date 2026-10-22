// Type Runner rules, free of React so they can be tested on their own.
// Players always type English letters (most children don't have a Bangla keyboard);
// in Bangla mode the word's meaning is shown underneath.

export const LEVELS = [
  // "Speed Keys": one letter at a time
  { id: 1, kind: 'keys', count: 15, pool: 'asdfjkl', targetPerMinute: 30 },
  { id: 2, kind: 'keys', count: 20, pool: 'abcdefghijklmnopqrstuvwxyz', targetPerMinute: 30 },
  // Words: the bird runs one step per word
  { id: 3, kind: 'words', count: 8, pool: 'short', targetPerMinute: 35 },
  { id: 4, kind: 'words', count: 8, pool: 'long', targetPerMinute: 45 },
]

export const getLevel = (id) => LEVELS.find((level) => level.id === id) ?? LEVELS[0]

export const WORDS = {
  short: [
    { word: 'cat', picture: '🐱', bn: 'বিড়াল' },
    { word: 'dog', picture: '🐶', bn: 'কুকুর' },
    { word: 'sun', picture: '☀️', bn: 'সূর্য' },
    { word: 'hat', picture: '🎩', bn: 'টুপি' },
    { word: 'bus', picture: '🚌', bn: 'বাস' },
    { word: 'egg', picture: '🥚', bn: 'ডিম' },
    { word: 'cow', picture: '🐮', bn: 'গরু' },
    { word: 'fish', picture: '🐟', bn: 'মাছ' },
    { word: 'bird', picture: '🐦', bn: 'পাখি' },
    { word: 'book', picture: '📖', bn: 'বই' },
    { word: 'ball', picture: '⚽', bn: 'বল' },
    { word: 'tree', picture: '🌳', bn: 'গাছ' },
    { word: 'moon', picture: '🌙', bn: 'চাঁদ' },
    { word: 'star', picture: '⭐', bn: 'তারা' },
  ],
  long: [
    { word: 'mango', picture: '🥭', bn: 'আম' },
    { word: 'apple', picture: '🍎', bn: 'আপেল' },
    { word: 'tiger', picture: '🐯', bn: 'বাঘ' },
    { word: 'house', picture: '🏠', bn: 'ঘর' },
    { word: 'train', picture: '🚆', bn: 'ট্রেন' },
    { word: 'water', picture: '💧', bn: 'পানি' },
    { word: 'flower', picture: '🌸', bn: 'ফুল' },
    { word: 'rabbit', picture: '🐰', bn: 'খরগোশ' },
    { word: 'banana', picture: '🍌', bn: 'কলা' },
    { word: 'school', picture: '🏫', bn: 'স্কুল' },
    { word: 'rocket', picture: '🚀', bn: 'রকেট' },
    { word: 'monkey', picture: '🐵', bn: 'বানর' },
    { word: 'pencil', picture: '✏️', bn: 'পেন্সিল' },
    { word: 'elephant', picture: '🐘', bn: 'হাতি' },
  ],
}

/** Small seeded random generator, so runs can be repeated in tests. */
export function createRng(seed = Date.now()) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The things to type, in order. Never repeats the same letter or word twice in a row. */
export function createTargets(level, rng = createRng()) {
  if (level.kind === 'keys') {
    const letters = [...level.pool]
    const targets = []
    while (targets.length < level.count) {
      const letter = letters[Math.floor(rng() * letters.length)]
      if (letter !== targets.at(-1)?.text) targets.push({ text: letter })
    }
    return targets
  }
  const words = [...WORDS[level.pool]]
  for (let i = words.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[words[i], words[j]] = [words[j], words[i]]
  }
  return words.slice(0, level.count).map((entry) => ({ ...entry, text: entry.word }))
}

export function createRun(level, rng) {
  return {
    levelId: level.id,
    targets: createTargets(level, rng),
    index: 0, // which target is being typed
    position: 0, // how many letters of it are done
    correct: 0, // correct key presses
    mistakes: 0, // wrong key presses
    startedAt: null, // the clock starts on the first key press
    finishedAt: null,
    last: null, // 'correct' | 'wrong' | 'word' (a target finished) | null
  }
}

export const nextLetter = (run) => run.targets[run.index]?.text[run.position] ?? null

/** Handles one key press. Anything that isn't a single letter is ignored. */
export function pressKey(run, key, now = Date.now()) {
  if (run.finishedAt !== null || typeof key !== 'string' || key.length !== 1) return run
  const letter = key.toLowerCase()
  if (!/^[a-z]$/.test(letter)) return run

  const startedAt = run.startedAt ?? now
  if (letter !== nextLetter(run)) {
    return { ...run, startedAt, mistakes: run.mistakes + 1, last: 'wrong' }
  }

  const target = run.targets[run.index]
  const position = run.position + 1
  const correct = run.correct + 1
  if (position < target.text.length) {
    return { ...run, startedAt, correct, position, last: 'correct' }
  }

  const index = run.index + 1
  const finished = index >= run.targets.length
  return {
    ...run,
    startedAt,
    correct,
    index,
    position: 0,
    last: 'word',
    finishedAt: finished ? now : null,
  }
}

/** How far along the track the bird is, from 0 to 1 (counts letters inside the current word). */
export function progress(run) {
  const total = run.targets.length
  if (!total) return 0
  const target = run.targets[run.index]
  const partial = target ? run.position / target.text.length : 0
  return Math.min(1, (run.index + partial) / total)
}

export function results(run, level) {
  const presses = run.correct + run.mistakes
  const accuracy = presses ? run.correct / presses : 1
  const minutes = Math.max((run.finishedAt - run.startedAt) / 60000, 1 / 60)
  const perMinute = Math.round(run.correct / minutes)
  const stars = 1 + (accuracy >= 0.9 ? 1 : 0) + (perMinute >= level.targetPerMinute ? 1 : 0)
  return {
    accuracy: Math.round(accuracy * 100),
    perMinute,
    seconds: Math.round((run.finishedAt - run.startedAt) / 1000),
    stars,
    xp: level.count + stars * 3,
  }
}
