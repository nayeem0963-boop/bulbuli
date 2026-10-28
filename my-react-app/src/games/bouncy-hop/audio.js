/**
 * Bouncy Hop sounds, all synthesized with the Web Audio API (no files to download).
 *
 *   sfx.bounce(combo)   soft "boing" each hop (rises a little with the combo)
 *   sfx.correct(combo)  bright two-note chime, climbing a pentatonic scale as the streak grows
 *   sfx.wrong()         a low wobbly "bwomp"
 *   sfx.fall()          a falling whistle
 *   sfx.boost()         whoosh (filtered noise) + rising sweep for the super bounce
 *   sfx.milestone()     a quick fanfare
 *   sfx.over()          a gentle "that's the end" jingle
 *   music.start() / music.stop()   a quiet, cheerful pentatonic loop, scheduled ahead in time
 *
 * Everything goes through one master gain and respects the arcade's shared mute switch
 * (isMuted from src/utils/sound.js). Nothing is created before the first sound is asked for,
 * which only happens after the player pressed something, so browsers allow the audio.
 */
import { isMuted } from '../../utils/sound.js'

let ctx = null
let master = null
let musicBus = null
let noiseBuffer = null

function audio() {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  if (!ctx) {
    try {
      ctx = new Ctor()
      master = ctx.createGain()
      master.gain.value = 0.9
      const comp = ctx.createDynamicsCompressor() // keeps stacked chimes from clipping
      comp.threshold.value = -14
      comp.ratio.value = 4
      master.connect(comp).connect(ctx.destination)
      musicBus = ctx.createGain()
      musicBus.gain.value = 0.0001
      musicBus.connect(master)
    } catch {
      ctx = null
      return null
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

function noise(ac) {
  if (noiseBuffer) return noiseBuffer
  noiseBuffer = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
  return noiseBuffer
}

/** One enveloped oscillator note. */
function tone({ freq, to, at = 0, dur = 0.2, type = 'sine', vol = 0.1, attack = 0.01, out }) {
  const ac = audio()
  if (!ac) return
  const t0 = ac.currentTime + at
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(vol, t0 + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain).connect(out ?? master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.03)
}

// C major pentatonic, two octaves: always sounds friendly, whatever order the notes come in
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760]
const quiet = () => isMuted() || !audio()

export const sfx = {
  bounce(combo = 0) {
    if (quiet()) return
    const lift = 1 + Math.min(combo, 20) * 0.015
    tone({ freq: 190 * lift, to: 420 * lift, dur: 0.13, type: 'triangle', vol: 0.05 })
  },
  correct(combo = 1) {
    if (quiet()) return
    const i = Math.min(SCALE.length - 2, Math.max(0, combo - 1) % 8)
    tone({ freq: SCALE[i], dur: 0.16, type: 'triangle', vol: 0.11 })
    tone({ freq: SCALE[i + 1] * 1.0, at: 0.07, dur: 0.24, type: 'sine', vol: 0.1 })
    tone({ freq: SCALE[i + 1] * 2, at: 0.07, dur: 0.18, type: 'sine', vol: 0.025 }) // sparkle
  },
  wrong() {
    if (quiet()) return
    tone({ freq: 220, to: 110, dur: 0.32, type: 'sawtooth', vol: 0.05 })
    tone({ freq: 233, to: 104, dur: 0.32, type: 'square', vol: 0.025 })
  },
  fall() {
    if (quiet()) return
    tone({ freq: 900, to: 160, dur: 0.75, type: 'sine', vol: 0.08, attack: 0.03 })
  },
  boost() {
    if (quiet()) return
    const ac = audio()
    const t0 = ac.currentTime
    const src = ac.createBufferSource()
    src.buffer = noise(ac)
    const filter = ac.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = 1.4
    filter.frequency.setValueAtTime(400, t0)
    filter.frequency.exponentialRampToValueAtTime(3200, t0 + 0.5)
    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.08)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55)
    src.connect(filter).connect(gain).connect(master)
    src.start(t0)
    src.stop(t0 + 0.6)
    tone({ freq: 300, to: 1200, dur: 0.45, type: 'triangle', vol: 0.07 })
  },
  milestone() {
    if (quiet()) return
    ;[0, 2, 4, 5].forEach((n, i) => tone({ freq: SCALE[n], at: i * 0.09, dur: 0.22, type: 'triangle', vol: 0.09 }))
  },
  over() {
    if (quiet()) return
    ;[5, 4, 2, 0].forEach((n, i) => tone({ freq: SCALE[n] / 2, at: i * 0.14, dur: 0.3, type: 'triangle', vol: 0.09 }))
  },
  tap() {
    if (quiet()) return
    tone({ freq: 660, dur: 0.06, type: 'sine', vol: 0.05 })
  },
}

/* ------------------------------------------------------------------ background music */

// bass + a little melody, 8 steps a bar, 4 bars; numbers are SCALE indexes (−1 = rest)
const BASS = [130.81, 130.81, 110, 110, 87.31, 87.31, 98, 98] // C C A A F F G G (one per half bar)
const MELODY = [
  0, -1, 2, -1, 4, 2, -1, 3,
  2, -1, 0, -1, 1, -1, 2, -1,
  4, -1, 5, 4, 2, -1, 3, -1,
  2, 1, 0, -1, 1, -1, -1, -1,
]
const BPM = 112
const STEP = 60 / BPM / 2 // eighth notes
let timer = null
let nextTime = 0
let stepIndex = 0

function scheduleMusic() {
  const ac = ctx
  if (!ac) return
  while (nextTime < ac.currentTime + 0.25) {
    const s = stepIndex % MELODY.length
    const rel = nextTime - ac.currentTime
    if (s % 4 === 0) tone({ freq: BASS[Math.floor(s / 4) % BASS.length], at: rel, dur: STEP * 3.6, type: 'triangle', vol: 0.12, attack: 0.02, out: musicBus })
    const m = MELODY[s]
    if (m >= 0) tone({ freq: SCALE[m], at: rel, dur: STEP * 1.6, type: 'sine', vol: 0.07, attack: 0.015, out: musicBus })
    if (s % 2 === 1) tone({ freq: 4000, at: rel, dur: 0.03, type: 'square', vol: 0.006, out: musicBus }) // soft tick
    nextTime += STEP
    stepIndex += 1
  }
}

export const music = {
  start() {
    const ac = audio()
    if (!ac || timer) return
    nextTime = ac.currentTime + 0.1
    stepIndex = 0
    musicBus.gain.cancelScheduledValues(ac.currentTime)
    musicBus.gain.setTargetAtTime(isMuted() ? 0.0001 : 0.32, ac.currentTime, 0.4)
    timer = setInterval(() => {
      // follow the mute switch while playing
      if (ctx && musicBus) musicBus.gain.setTargetAtTime(isMuted() ? 0.0001 : 0.32, ctx.currentTime, 0.1)
      scheduleMusic()
    }, 90)
    scheduleMusic()
  },
  stop() {
    clearInterval(timer)
    timer = null
    if (ctx && musicBus) musicBus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15)
  },
}

/** Says a short line out loud (English only: Bangla voices are rare on devices). */
export function say(line, language) {
  if (isMuted() || language !== 'en' || typeof window === 'undefined' || !window.speechSynthesis) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(line)
    u.lang = 'en-US'
    u.rate = 0.95
    u.pitch = 1.25
    u.volume = 0.9
    window.speechSynthesis.speak(u)
  } catch { /* speech is a nice extra, never needed */ }
}
