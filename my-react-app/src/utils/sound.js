const SOUND_SOURCES = {
  correct: '/sounds/correct.mp3',
  wrong: '/sounds/wrong.mp3',
  click: '/sounds/click.mp3',
  complete: '/sounds/complete.mp3',
}

const sounds = typeof Audio === 'undefined'
  ? {}
  : Object.fromEntries(
    Object.entries(SOUND_SOURCES).map(([name, source]) => {
      const audio = new Audio(source)
      audio.preload = 'auto'
      return [name, audio]
    }),
  )

let muted = false

export function playSound(name) {
  if (muted) return

  const audio = sounds[name]
  if (!audio) {
    if (!Object.hasOwn(SOUND_SOURCES, name)) {
      throw new TypeError(`Unknown sound effect: ${name}`)
    }
    return
  }

  try {
    audio.currentTime = 0
    const playback = audio.play()
    if (playback && typeof playback.catch === 'function') {
      playback.catch(() => {})
    }
  } catch (error) {
    console.warn(`Unable to play the "${name}" sound effect.`, error)
  }
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
