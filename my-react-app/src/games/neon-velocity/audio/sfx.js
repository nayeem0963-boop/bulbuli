import { createDriveCurve, midiToHz, noiseHit, tone } from './synthUtils'

/*
 * Synthesized sound effects. Each takes ({ ctx, out, noise, reverb }, opts)
 * and schedules a short graph of nodes that clean themselves up when they stop.
 * Designed to sit in the same key (A minor) as the soundtrack.
 */

const drive = typeof window !== 'undefined' ? createDriveCurve(30) : null

export const SFX = {
  uiClick({ ctx, out }) {
    tone(ctx, out, ctx.currentTime, { type: 'square', freq: 1320, gain: 0.06, decay: 0.02, duration: 0.06, filter: { freq: 3000 } })
  },

  runStart({ ctx, out, reverb }) {
    const t = ctx.currentTime
    ;[57, 64, 69].forEach((m, i) => {
      tone(ctx, out, t + i * 0.07, { type: 'sawtooth', freq: midiToHz(m), gain: 0.08, decay: 0.15, duration: 0.5, filter: { freq: 2400 } })
      tone(ctx, reverb, t + i * 0.07, { type: 'triangle', freq: midiToHz(m + 12), gain: 0.05, decay: 0.2, duration: 0.6 })
    })
  },

  jump({ ctx, out }) {
    const t = ctx.currentTime
    tone(ctx, out, t, { type: 'square', freq: 260, to: 620, sweep: 0.09, gain: 0.12, decay: 0.06, duration: 0.18, filter: { freq: 2200 } })
  },

  doubleJump({ ctx, out, reverb }) {
    const t = ctx.currentTime
    tone(ctx, out, t, { type: 'square', freq: 520, to: 1250, sweep: 0.1, gain: 0.1, decay: 0.07, duration: 0.2, filter: { freq: 3500 } })
    tone(ctx, reverb, t + 0.04, { type: 'triangle', freq: midiToHz(88), gain: 0.08, decay: 0.12, duration: 0.4 })
  },

  wallJump({ ctx, out, noise }) {
    const t = ctx.currentTime
    tone(ctx, out, t, { type: 'sawtooth', freq: 300, to: 900, sweep: 0.12, gain: 0.1, decay: 0.08, duration: 0.2, filter: { freq: 2500 } })
    noiseHit(ctx, noise, out, t, { type: 'bandpass', freq: 1800, sweepTo: 4000, gain: 0.12, decay: 0.08, duration: 0.2 })
  },

  land({ ctx, out, noise }, { impact = 10 } = {}) {
    const t = ctx.currentTime
    const k = Math.min(1, impact / 25)
    tone(ctx, out, t, { type: 'sine', freq: 130, to: 48, sweep: 0.1, gain: 0.15 + k * 0.25, decay: 0.08, duration: 0.25 })
    noiseHit(ctx, noise, out, t, { type: 'lowpass', freq: 900, gain: 0.08 + k * 0.12, decay: 0.05, duration: 0.15 })
  },

  slide({ ctx, out, noise }) {
    noiseHit(ctx, noise, out, ctx.currentTime, { type: 'bandpass', freq: 3200, sweepTo: 500, Q: 2, gain: 0.18, attack: 0.02, decay: 0.2, duration: 0.5 })
  },

  slam({ ctx, out }) {
    const t = ctx.currentTime
    tone(ctx, out, t, { type: 'sawtooth', freq: 700, to: 90, sweep: 0.18, gain: 0.1, decay: 0.12, duration: 0.25, filter: { freq: 1800 } })
  },

  slamLand({ ctx, out, noise, reverb }) {
    const t = ctx.currentTime
    tone(ctx, out, t, { type: 'sine', freq: 110, to: 32, sweep: 0.25, gain: 0.55, decay: 0.18, duration: 0.5 })
    noiseHit(ctx, noise, out, t, { type: 'lowpass', freq: 1400, sweepTo: 200, gain: 0.3, decay: 0.12, duration: 0.4 })
    noiseHit(ctx, noise, reverb, t, { type: 'bandpass', freq: 600, gain: 0.2, decay: 0.2, duration: 0.5 })
  },

  grindStart({ ctx, out }) {
    const t = ctx.currentTime
    // metallic clang: two inharmonic squares
    tone(ctx, out, t, { type: 'square', freq: 1870, gain: 0.06, decay: 0.08, duration: 0.3, filter: { type: 'bandpass', freq: 2400, Q: 6 } })
    tone(ctx, out, t, { type: 'square', freq: 2630, gain: 0.05, decay: 0.06, duration: 0.3, filter: { type: 'bandpass', freq: 3000, Q: 6 } })
  },

  wallrun({ ctx, out, noise }) {
    noiseHit(ctx, noise, out, ctx.currentTime, { type: 'bandpass', freq: 600, sweepTo: 2600, Q: 3, gain: 0.16, attack: 0.05, decay: 0.3, duration: 0.7 })
  },

  /** semitone: rising pitch for pickup combos */
  pickup({ ctx, out, reverb }, { semitone = 0 } = {}) {
    const t = ctx.currentTime
    const base = 76 + semitone // E5 and up
    tone(ctx, out, t, { type: 'triangle', freq: midiToHz(base), gain: 0.14, decay: 0.06, duration: 0.25 })
    tone(ctx, out, t + 0.045, { type: 'triangle', freq: midiToHz(base + 7), gain: 0.12, decay: 0.09, duration: 0.3 })
    tone(ctx, reverb, t + 0.045, { type: 'sine', freq: midiToHz(base + 19), gain: 0.05, decay: 0.15, duration: 0.5 })
  },

  prism({ ctx, out, reverb }) {
    const t = ctx.currentTime
    ;[69, 73, 76, 81, 85].forEach((m, i) => {
      tone(ctx, out, t + i * 0.035, { type: 'triangle', freq: midiToHz(m), gain: 0.1, decay: 0.12, duration: 0.5 })
      tone(ctx, reverb, t + i * 0.035, { type: 'sine', freq: midiToHz(m + 12), gain: 0.05, decay: 0.25, duration: 0.8 })
    })
  },

  hit({ ctx, out, noise }) {
    const t = ctx.currentTime
    const shaper = ctx.createWaveShaper()
    shaper.curve = drive
    shaper.connect(out)
    tone(ctx, shaper, t, { type: 'sawtooth', freq: 95, to: 45, sweep: 0.3, gain: 0.35, decay: 0.15, duration: 0.45 })
    noiseHit(ctx, noise, shaper, t, { type: 'lowpass', freq: 3000, sweepTo: 300, gain: 0.35, decay: 0.1, duration: 0.35 })
    tone(ctx, out, t, { type: 'square', freq: 880, to: 220, sweep: 0.15, gain: 0.06, decay: 0.08, duration: 0.2, filter: { freq: 2000 } })
  },

  smash({ ctx, out, noise }) {
    const t = ctx.currentTime
    noiseHit(ctx, noise, out, t, { type: 'highpass', freq: 2500, gain: 0.25, decay: 0.08, duration: 0.3 })
    tone(ctx, out, t, { type: 'triangle', freq: 1760, to: 440, sweep: 0.2, gain: 0.08, decay: 0.1, duration: 0.3 })
  },

  surgeStart({ ctx, out, noise, reverb }) {
    const t = ctx.currentTime
    // riser
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(110, t)
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.55)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 10
    filter.frequency.setValueAtTime(400, t)
    filter.frequency.exponentialRampToValueAtTime(9000, t + 0.55)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.5)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
    osc.connect(filter).connect(g).connect(out)
    osc.start(t)
    osc.stop(t + 0.75)
    noiseHit(ctx, noise, out, t, { type: 'highpass', freq: 800, sweepTo: 9000, gain: 0.1, attack: 0.45, decay: 0.1, duration: 0.6 })
    // impact
    tone(ctx, out, t + 0.55, { type: 'sine', freq: 90, to: 30, sweep: 0.4, gain: 0.6, decay: 0.25, duration: 0.8 })
    ;[57, 64, 69, 76].forEach((m) => {
      tone(ctx, reverb, t + 0.55, { type: 'sawtooth', freq: midiToHz(m), gain: 0.06, decay: 0.5, duration: 1.4, filter: { freq: 4000 } })
    })
  },

  surgeEnd({ ctx, out }) {
    const t = ctx.currentTime
    tone(ctx, out, t, { type: 'sawtooth', freq: 1200, to: 120, sweep: 0.5, gain: 0.08, decay: 0.25, duration: 0.6, filter: { freq: 2400 } })
  },

  speedUp({ ctx, out, reverb }, { tier = 1 } = {}) {
    const t = ctx.currentTime
    const root = 69 + Math.min(tier, 6)
    tone(ctx, out, t, { type: 'square', freq: midiToHz(root), gain: 0.08, decay: 0.07, duration: 0.15, filter: { freq: 3000 } })
    tone(ctx, out, t + 0.09, { type: 'square', freq: midiToHz(root + 7), gain: 0.09, decay: 0.12, duration: 0.3, filter: { freq: 3500 } })
    tone(ctx, reverb, t + 0.09, { type: 'triangle', freq: midiToHz(root + 19), gain: 0.05, decay: 0.2, duration: 0.6 })
  },

  fall({ ctx, out, reverb }) {
    const t = ctx.currentTime
    tone(ctx, out, t, { type: 'sawtooth', freq: 660, to: 45, sweep: 1.1, gain: 0.14, decay: 0.6, duration: 1.3, filter: { freq: 1600 } })
    tone(ctx, reverb, t, { type: 'triangle', freq: 1320, to: 90, sweep: 1.1, gain: 0.06, decay: 0.6, duration: 1.3 })
  },

  crash({ ctx, out, noise, reverb }) {
    const t = ctx.currentTime
    SFX.hit({ ctx, out, noise })
    tone(ctx, reverb, t + 0.1, { type: 'sawtooth', freq: midiToHz(45), to: midiToHz(33), sweep: 0.8, gain: 0.12, decay: 0.6, duration: 1.4, filter: { freq: 900 } })
  },
}
