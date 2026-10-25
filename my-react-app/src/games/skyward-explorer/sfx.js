/**
 * Little synthesised sound effects (Web Audio API): no files to download.
 * They respect Bulbuli's mute button (utils/sound.js), like every other game.
 */
import { isMuted } from '../../utils/sound.js'

let ctx = null
let master = null

function audio() {
  if (isMuted() || typeof window === 'undefined') return null
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  if (!ctx) {
    ctx = new AudioCtx()
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

/** One shaped note. `to` slides the pitch; times are in seconds. */
function tone(ac, { freq, to = freq, type = 'sine', start = 0, dur = 0.18, gain = 0.2 }) {
  const t0 = ac.currentTime + start
  const osc = ac.createOscillator()
  const amp = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  amp.gain.setValueAtTime(0.0001, t0)
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(amp).connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

/** A short burst of filtered noise (for whooshes). */
function whoosh(ac, { start = 0, dur = 0.35, from = 600, to = 2400, gain = 0.12 }) {
  const t0 = ac.currentTime + start
  const length = Math.ceil(ac.sampleRate * dur)
  const buffer = ac.createBuffer(1, length, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource()
  src.buffer = buffer
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 1.2
  filter.frequency.setValueAtTime(from, t0)
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  const amp = ac.createGain()
  amp.gain.setValueAtTime(0.0001, t0)
  amp.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.3)
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(filter).connect(amp).connect(master)
  src.start(t0)
}

// A pentatonic scale, so crystals collected in a row climb a tune that always sounds right.
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16]
const note = (base, step) => base * 2 ** (SCALE[step % SCALE.length] / 12)

export const sfx = {
  /** `streak` = crystals collected in quick succession (0, 1, 2…), raises the pitch. */
  crystal(streak = 0) {
    const ac = audio()
    if (!ac) return
    const f = note(880, streak)
    tone(ac, { freq: f, type: 'triangle', dur: 0.16, gain: 0.22 })
    tone(ac, { freq: f * 1.5, type: 'sine', start: 0.07, dur: 0.28, gain: 0.16 })
    tone(ac, { freq: f * 2, type: 'sine', start: 0.13, dur: 0.35, gain: 0.08 })
  },
  jump() {
    const ac = audio()
    if (ac) tone(ac, { freq: 320, to: 620, type: 'square', dur: 0.12, gain: 0.05 })
  },
  glide() {
    const ac = audio()
    if (ac) whoosh(ac, { dur: 0.5, from: 500, to: 1600, gain: 0.1 })
  },
  land(impact = 0) {
    const ac = audio()
    if (ac && impact > 6) tone(ac, { freq: 140, to: 70, type: 'sine', dur: 0.12, gain: Math.min(0.25, impact / 60) })
  },
  fall() {
    const ac = audio()
    if (!ac) return
    tone(ac, { freq: 660, to: 180, type: 'triangle', dur: 0.5, gain: 0.15 })
  },
  tick() {
    const ac = audio()
    if (ac) tone(ac, { freq: 1200, type: 'square', dur: 0.05, gain: 0.05 })
  },
  start() {
    const ac = audio()
    if (!ac) return
    ;[0, 4, 7, 12].forEach((s, i) => tone(ac, { freq: 523 * 2 ** (s / 12), type: 'triangle', start: i * 0.08, dur: 0.2, gain: 0.14 }))
  },
  win() {
    const ac = audio()
    if (!ac) return
    ;[0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone(ac, { freq: 523 * 2 ** (s / 12), type: 'triangle', start: i * 0.09, dur: 0.35, gain: 0.15 }))
  },
  lose() {
    const ac = audio()
    if (!ac) return
    ;[7, 4, 0, -5].forEach((s, i) => tone(ac, { freq: 440 * 2 ** (s / 12), type: 'triangle', start: i * 0.14, dur: 0.3, gain: 0.13 }))
  },
}
