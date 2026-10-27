/**
 * Synthesized sound effects: Web Audio API only, no audio files.
 *
 * Every sound is a few short-lived oscillator / noise nodes routed through one master gain and
 * a compressor (so fast clicking can't clip). Nodes disconnect themselves when they finish.
 * The AudioContext is created lazily on the first sound, which always follows a user gesture,
 * so browsers' autoplay rules are satisfied.
 */

let ctx = null
let master = null
let noiseBuffer = null
let muted = false
const lastPlayed = new Map()

function getAudio() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -14
    compressor.ratio.value = 6
    master = ctx.createGain()
    master.gain.value = 0.55
    master.connect(compressor).connect(ctx.destination)

    // One second of white noise, reused by every noisy sound.
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

const cleanup = (...nodes) => () => nodes.forEach((n) => n.disconnect())

/** Enveloped oscillator with optional pitch sweep. Times in seconds. */
function tone({ type = 'sine', from, to = from, dur = 0.12, gain = 0.3, at = 0, attack = 0.005 }) {
  const t = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const env = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, t)
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + dur)
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(gain, t + attack)
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(env).connect(master)
  osc.onended = cleanup(osc, env)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

/** Filtered noise burst with optional filter sweep. */
function noise({ dur = 0.08, gain = 0.2, filter = 'bandpass', from = 2000, to = from, q = 1, at = 0 }) {
  const t = ctx.currentTime + at
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer
  const biquad = ctx.createBiquadFilter()
  biquad.type = filter
  biquad.Q.value = q
  biquad.frequency.setValueAtTime(from, t)
  if (to !== from) biquad.frequency.exponentialRampToValueAtTime(to, t + dur)
  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(gain, t + 0.004)
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(biquad).connect(env).connect(master)
  src.onended = cleanup(src, biquad, env)
  src.start(t, Math.random() * 0.8)
  src.stop(t + dur + 0.02)
}

// ±3% random detune so repeated clicks don't sound robotic.
const vary = (f) => f * (0.97 + Math.random() * 0.06)

const SOUNDS = {
  place_PLATFORM: ({ y = 0 }) => {
    const lift = 1 + Math.min(y, 15) * 0.035 // stacking higher = slightly higher pitch
    tone({ type: 'triangle', from: vary(520 * lift), to: 360 * lift, dur: 0.09, gain: 0.32 })
    noise({ dur: 0.03, gain: 0.12, filter: 'highpass', from: 3000 })
  },
  place_BOUNCE: () => {
    tone({ type: 'sine', from: vary(220), to: 880, dur: 0.2, gain: 0.35 })
    tone({ type: 'sine', from: vary(440), to: 1320, dur: 0.16, gain: 0.12, at: 0.02 })
  },
  place_LAVA: () => {
    noise({ dur: 0.32, gain: 0.22, filter: 'lowpass', from: 1800, to: 250, q: 0.7 })
    tone({ type: 'sawtooth', from: vary(120), to: 60, dur: 0.22, gain: 0.12 })
  },
  place_SPAWN: () => {
    tone({ type: 'sine', from: 660, dur: 0.22, gain: 0.22 })
    tone({ type: 'sine', from: 990, dur: 0.28, gain: 0.16, at: 0.06 })
  },
  place_FINISH: () => {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ type: 'triangle', from: f, dur: 0.18, gain: 0.2, at: i * 0.06 }),
    )
  },
  remove: () => {
    tone({ type: 'square', from: vary(380), to: 120, dur: 0.11, gain: 0.12 })
    noise({ dur: 0.07, gain: 0.14, filter: 'bandpass', from: 1200, to: 400, q: 2 })
  },
  clear: () => {
    tone({ type: 'sawtooth', from: 700, to: 55, dur: 0.5, gain: 0.14 })
    noise({ dur: 0.45, gain: 0.16, filter: 'lowpass', from: 4000, to: 200 })
  },
  undo: () => tone({ type: 'sine', from: 560, to: 380, dur: 0.08, gain: 0.18 }),
  redo: () => tone({ type: 'sine', from: 380, to: 560, dur: 0.08, gain: 0.18 }),
  select: () => tone({ type: 'triangle', from: vary(880), dur: 0.04, gain: 0.1 }),
  error: () => {
    tone({ type: 'square', from: 150, dur: 0.07, gain: 0.1 })
    tone({ type: 'square', from: 120, dur: 0.09, gain: 0.1, at: 0.09 })
  },

  // --- community
  coin: () => {
    // the classic two-note pickup: B5 → E6, square wave, plus a tiny sparkle
    tone({ type: 'square', from: 987.77, dur: 0.07, gain: 0.12 })
    tone({ type: 'square', from: 1318.51, dur: 0.28, gain: 0.12, at: 0.07 })
    noise({ dur: 0.05, gain: 0.05, filter: 'highpass', from: 7000, at: 0.07 })
  },
  unvote: () => tone({ type: 'triangle', from: 520, to: 330, dur: 0.09, gain: 0.1 }),
  submit: () => {
    ;[392, 523.25, 659.25, 783.99].forEach((f, i) => tone({ type: 'triangle', from: f, dur: 0.14, gain: 0.16, at: i * 0.05 }))
  },

  // --- play mode
  play_start: () => {
    tone({ type: 'triangle', from: 440, dur: 0.08, gain: 0.18 })
    tone({ type: 'triangle', from: 880, dur: 0.14, gain: 0.2, at: 0.09 })
  },
  jump: () => tone({ type: 'square', from: vary(300), to: 620, dur: 0.11, gain: 0.08 }),
  land: ({ speed = 10 }) => {
    const g = Math.min(0.28, 0.06 + speed * 0.008) // harder landings thud louder
    noise({ dur: 0.07, gain: g, filter: 'lowpass', from: 700, to: 150 })
    tone({ type: 'sine', from: 120, to: 60, dur: 0.08, gain: g * 0.6 })
  },
  bounce: () => {
    tone({ type: 'sine', from: vary(180), to: 1100, dur: 0.32, gain: 0.32 })
    tone({ type: 'triangle', from: vary(360), to: 1600, dur: 0.24, gain: 0.1, at: 0.015 })
  },
  death_lava: () => {
    noise({ dur: 0.5, gain: 0.3, filter: 'lowpass', from: 3000, to: 120, q: 0.8 })
    tone({ type: 'sawtooth', from: 330, to: 45, dur: 0.45, gain: 0.16 })
  },
  death_void: () => {
    tone({ type: 'sine', from: 600, to: 70, dur: 0.6, gain: 0.22 })
    noise({ dur: 0.55, gain: 0.1, filter: 'bandpass', from: 1800, to: 200, q: 3 })
  },
  respawn: () => {
    tone({ type: 'sine', from: 523.25, dur: 0.12, gain: 0.14, at: 0.05 })
    tone({ type: 'sine', from: 783.99, dur: 0.18, gain: 0.14, at: 0.12 })
  },
  victory: () => {
    // rising arpeggio → held major chord, with a sparkly noise shimmer
    const arp = [523.25, 659.25, 783.99, 1046.5, 1318.5]
    arp.forEach((f, i) => tone({ type: 'triangle', from: f, dur: 0.16, gain: 0.2, at: i * 0.08 }))
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f) =>
      tone({ type: 'sawtooth', from: f, dur: 1.1, gain: 0.05, at: 0.45, attack: 0.03 }),
    )
    tone({ type: 'sine', from: 261.63, dur: 1.2, gain: 0.18, at: 0.45, attack: 0.02 })
    for (let i = 0; i < 6; i++) noise({ dur: 0.12, gain: 0.06, filter: 'highpass', from: 6000, at: 0.45 + i * 0.11 })
  },
}

/**
 * Plays a named sound. Safe to call anywhere: it no-ops when muted, unsupported, or when the
 * same sound fired less than 30 ms ago (stops a burst of events from stacking voices).
 * @param {keyof SOUNDS | string} name
 * @param {object} [opts]
 */
export function playSfx(name, opts = {}) {
  if (muted) return
  const sound = SOUNDS[name]
  if (!sound || !getAudio()) return
  const now = performance.now()
  if (now - (lastPlayed.get(name) ?? 0) < 30) return
  lastPlayed.set(name, now)
  try {
    sound(opts)
  } catch {
    // Audio failures must never break editing.
  }
}

export const playPlaceSfx = (type, cell) => playSfx(`place_${type}`, cell)

export function setSfxMuted(value) {
  muted = Boolean(value)
}
