/** Shared Web Audio building blocks. Everything is synthesized — no audio files. */

export const midiToHz = (m) => 440 * 2 ** ((m - 69) / 12)

/** 2 s of white noise, created once and reused by every noise-based sound. */
export function createNoiseBuffer(ctx, seconds = 2) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

/** Stereo exponentially-decaying noise → a convincing plate/hall reverb impulse. */
export function createReverbImpulse(ctx, seconds = 2.6, decay = 3.2) {
  const length = Math.floor(ctx.sampleRate * seconds)
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay
    }
  }
  return impulse
}

/**
 * Attack/decay envelope on an AudioParam.
 *   attack → peak, then exponential-ish decay toward `sustain` with time-constant `decay`,
 *   release to 0 at `t + hold + release`.
 */
export function envelope(param, t, {
  attack = 0.005, peak = 1, decay = 0.1, sustain = 0, hold = 0, release = 0.08,
} = {}) {
  param.cancelScheduledValues(t)
  param.setValueAtTime(0.0001, t)
  param.linearRampToValueAtTime(peak, t + attack)
  param.setTargetAtTime(sustain, t + attack, decay)
  const end = t + attack + hold
  if (hold > 0 || sustain > 0) {
    param.setTargetAtTime(0.0001, end, release / 3)
  }
  return end + release * 1.5 // safe stop time
}

/** Soft-clip curve for grit (hits, bass). */
export function createDriveCurve(amount = 20) {
  const n = 1024
  const curve = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x))
  }
  return curve
}

/** One-shot filtered noise burst. */
export function noiseHit(ctx, buffer, out, t, {
  type = 'highpass', freq = 6000, Q = 0.8, gain = 0.3, attack = 0.001, decay = 0.05, duration = 0.2,
  sweepTo,
} = {}) {
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = type
  filter.frequency.setValueAtTime(freq, t)
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, t + duration)
  filter.Q.value = Q
  const g = ctx.createGain()
  envelope(g.gain, t, { attack, peak: gain, decay })
  src.connect(filter).connect(g).connect(out)
  src.start(t, Math.random() * (buffer.duration - duration - 0.05))
  src.stop(t + duration + 0.05)
}

/** Oscillator with pitch sweep + envelope. */
export function tone(ctx, out, t, {
  type = 'sine', freq = 440, to, sweep = 0.1, gain = 0.3, attack = 0.003, decay = 0.08,
  duration = 0.3, detune = 0, filter,
} = {}) {
  const osc = ctx.createOscillator()
  osc.type = type
  osc.detune.value = detune
  osc.frequency.setValueAtTime(freq, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + sweep)
  const g = ctx.createGain()
  envelope(g.gain, t, { attack, peak: gain, decay })
  let node = osc
  if (filter) {
    const f = ctx.createBiquadFilter()
    f.type = filter.type ?? 'lowpass'
    f.frequency.value = filter.freq ?? 2000
    f.Q.value = filter.Q ?? 0.7
    node = osc.connect(f)
  }
  node.connect(g).connect(out)
  osc.start(t)
  osc.stop(t + duration)
}
