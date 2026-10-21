const SOUND_SOURCES = Object.freeze({
  correct: '/sounds/correct.mp3',
  wrong: '/sounds/wrong.mp3',
  click: '/sounds/click.mp3',
  complete: '/sounds/complete.mp3',
})

const SOUND_EFFECTS = Object.freeze({
  correct: 'correct',
  wrong: 'wrong',
  bonus: 'correct',
  levelUp: 'complete',
  gameOver: 'complete',
  click: 'click',
  complete: 'complete',
})

const audioCache = typeof Audio === 'undefined'
  ? {}
  : Object.fromEntries(
    Object.entries(SOUND_SOURCES).map(([name, source]) => {
      const audio = new Audio(source)
      audio.preload = 'auto'
      audio.volume = 0.7
      return [name, audio]
    }),
  )

function readStoredMuteState() {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem('bulbuli_muted') === 'true'
  } catch (error) {
    console.error('Unable to read the saved sound preference.', error)
    return false
  }
}

let muted = readStoredMuteState()
let volume = 0.7

export function playSound(name) {
  if (!Object.hasOwn(SOUND_EFFECTS, name)) {
    throw new TypeError(`Unknown sound effect: ${name}`)
  }
  if (muted || typeof Audio === 'undefined') return Promise.resolve(false)

  const audio = audioCache[SOUND_EFFECTS[name]]
  if (!audio) return Promise.resolve(false)

  try {
    audio.currentTime = 0
    audio.volume = volume
    const playback = audio.play()
    if (playback && typeof playback.then === 'function') {
      return playback.then(() => true).catch(() => false)
    }
    return Promise.resolve(true)
  } catch (error) {
    console.warn(`Unable to play the "${name}" sound effect.`, error)
    return Promise.resolve(false)
  }
}

export function playCorrect() {
  return playSound('correct')
}

export function playWrong() {
  return playSound('wrong')
}

export function playBonus() {
  return playSound('bonus')
}

export function playLevelUp() {
  return playSound('levelUp')
}

export function playGameOver() {
  return playSound('gameOver')
}

export function setMuted(value) {
  if (typeof value !== 'boolean') {
    throw new TypeError('The muted setting must be a boolean.')
  }
  muted = value
}

export function isMuted() {
  return muted
}

export function setVolume(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError('Sound volume must be a number between 0 and 1.')
  }
  volume = value
  Object.values(audioCache).forEach((audio) => {
    audio.volume = value
  })
}
