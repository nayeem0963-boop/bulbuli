import { envelope, midiToHz, noiseHit } from './synthUtils'

/*
 * SynthwaveSequencer — an endless, procedurally performed synthwave track.
 *
 *   104 BPM, 16th-note grid, 4-bar loop in A minor: Am – F – C – G
 *   Kick (4 on the floor, sidechains bass + pads) · snare on 2 & 4 · hats
 *   Octave-bouncing saw bass · detuned saw pads through reverb
 *   Arpeggio through a dotted-8th delay
 *
 * Arrangement reacts to gameplay:
 *   intensity (run speed 0..1): arp fades in at 0.2, 16th hats at 0.45, fills at 0.3
 *   surge: arp jumps an octave, extra claps, brighter everything
 *
 * Uses the standard "look-ahead" scheduler: a 25 ms timer schedules notes
 * 120 ms ahead on the audio clock, so timing stays sample-accurate even when
 * the main thread is busy rendering.
 */

const BPM = 104
const STEP = 60 / BPM / 4
const LOOKAHEAD = 0.12
const TICK_MS = 25

// Am, F, C, G — bass roots and pad voicings (MIDI)
const PROGRESSION = [
  { root: 45, chord: [57, 60, 64] },
  { root: 41, chord: [57, 60, 65] },
  { root: 48, chord: [55, 60, 64] },
  { root: 43, chord: [55, 59, 62] },
]
const ARP_PATTERN = [0, 1, 2, 3, 2, 1, 0, 2] // indexes into chord + octave

export class SynthwaveSequencer {
  constructor(ctx, { out, reverb, delay, noise }) {
    this.ctx = ctx
    this.noise = noise
    this.playing = false
    this.intensity = 0
    this.surge = false
    this.step = 0
    this.nextTime = 0
    this.timer = null

    // Buses
    this.out = ctx.createGain()
    this.out.connect(out)
    this.duck = ctx.createGain() // sidechain target
    this.duck.connect(this.out)
    this.drums = ctx.createGain()
    this.drums.gain.value = 0.9
    this.drums.connect(this.out)
    this.bass = ctx.createGain()
    this.bass.gain.value = 0.55
    this.bass.connect(this.duck)
    this.pad = ctx.createGain()
    this.pad.gain.value = 0.16
    this.pad.connect(this.duck)
    this.pad.connect(reverb)
    this.arp = ctx.createGain()
    this.arp.gain.value = 0
    this.arp.connect(this.out)
    this.arp.connect(delay)
    this.arp.connect(reverb)
    this.snareVerb = reverb
  }

  start() {
    if (this.playing) return
    this.playing = true
    this.step = 0
    this.nextTime = this.ctx.currentTime + 0.08
    this.out.gain.cancelScheduledValues(this.ctx.currentTime)
    this.out.gain.setTargetAtTime(1, this.ctx.currentTime, 0.3)
    this.timer = setInterval(() => this.schedule(), TICK_MS)
  }

  stop(fade = 0.6) {
    if (!this.playing) return
    const t = this.ctx.currentTime
    this.out.gain.cancelScheduledValues(t)
    this.out.gain.setTargetAtTime(0, t, fade / 4)
    clearInterval(this.timer)
    this.timer = null
    this.playing = false
  }

  setIntensity(intensity, surge) {
    this.intensity = intensity
    this.surge = surge
    const arpLevel = surge ? 0.16 : intensity < 0.2 ? 0 : 0.05 + intensity * 0.09
    this.arp.gain.setTargetAtTime(arpLevel, this.ctx.currentTime, 0.4)
  }

  schedule() {
    const horizon = this.ctx.currentTime + LOOKAHEAD
    // If the tab was throttled, skip ahead instead of firing a burst of stale notes
    if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.05
    while (this.nextTime < horizon) {
      this.playStep(this.step, this.nextTime)
      this.nextTime += STEP
      this.step = (this.step + 1) % 64
    }
  }

  playStep(step, t) {
    const bar = Math.floor(step / 16)
    const s = step % 16
    const { root, chord } = PROGRESSION[bar]
    const hot = this.intensity

    // Drums
    if (s % 4 === 0) { this.kick(t); this.sidechain(t) }
    if (s === 4 || s === 12) this.snare(t, 0.32)
    if (this.surge && (s === 6 || s === 14)) this.snare(t, 0.12) // ghost claps
    if (bar === 3 && s >= 12 && hot > 0.3) this.snare(t, 0.08 + (s - 12) * 0.05) // fill
    if (hot >= 0.45 || this.surge) this.hat(t, s % 4 === 2 ? 0.11 : 0.05)
    else if (s % 2 === 0) this.hat(t, s % 4 === 2 ? 0.1 : 0.05)
    if (s === 14) this.hat(t, 0.08, true)

    // Bass — octave bounce on 8ths
    if (s % 2 === 0) this.bassNote(t, root + (s % 4 === 2 ? 12 : 0), STEP * 1.7)

    // Pad — once per bar
    if (s === 0) this.padChord(t, chord, STEP * 16)

    // Arp — 16ths over chord tones
    if (hot >= 0.2 || this.surge) {
      const idx = ARP_PATTERN[s % ARP_PATTERN.length]
      const note = idx === 3 ? chord[0] + 12 : chord[idx]
      this.arpNote(t, note + 12 + (this.surge ? 12 : 0))
    }
  }

  // ── Instruments ──

  kick(t) {
    const { ctx } = this
    const osc = ctx.createOscillator()
    osc.frequency.setValueAtTime(155, t)
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.12)
    const g = ctx.createGain()
    envelope(g.gain, t, { attack: 0.002, peak: 0.95, decay: 0.12 })
    osc.connect(g).connect(this.drums)
    osc.start(t)
    osc.stop(t + 0.5)
  }

  sidechain(t) {
    const p = this.duck.gain
    p.cancelScheduledValues(t)
    p.setValueAtTime(0.3, t)
    p.setTargetAtTime(1, t + 0.02, 0.09)
  }

  snare(t, level) {
    const { ctx } = this
    noiseHit(ctx, this.noise, this.drums, t, { type: 'highpass', freq: 1500, gain: level, decay: 0.07, duration: 0.25 })
    noiseHit(ctx, this.noise, this.snareVerb, t, { type: 'bandpass', freq: 2500, gain: level * 0.6, decay: 0.08, duration: 0.25 })
    const body = ctx.createOscillator()
    body.type = 'triangle'
    body.frequency.setValueAtTime(220, t)
    body.frequency.exponentialRampToValueAtTime(140, t + 0.08)
    const g = ctx.createGain()
    envelope(g.gain, t, { peak: level * 0.8, decay: 0.04 })
    body.connect(g).connect(this.drums)
    body.start(t)
    body.stop(t + 0.2)
  }

  hat(t, level, open = false) {
    noiseHit(this.ctx, this.noise, this.drums, t, {
      type: 'highpass', freq: 8000, gain: level, decay: open ? 0.09 : 0.018, duration: open ? 0.3 : 0.06,
    })
  }

  bassNote(t, midi, duration) {
    const { ctx } = this
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = midiToHz(midi)
    const sub = ctx.createOscillator()
    sub.type = 'square'
    sub.frequency.value = midiToHz(midi - 12)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 6
    filter.frequency.setValueAtTime(240 + this.intensity * 500 + (this.surge ? 500 : 0), t)
    filter.frequency.exponentialRampToValueAtTime(1400 + this.intensity * 1600, t + 0.02)
    filter.frequency.exponentialRampToValueAtTime(260, t + duration)
    const g = ctx.createGain()
    envelope(g.gain, t, { attack: 0.004, peak: 0.5, decay: duration * 0.6, sustain: 0.15, hold: duration, release: 0.05 })
    const subGain = ctx.createGain()
    subGain.gain.value = 0.35
    osc.connect(filter)
    sub.connect(subGain).connect(filter)
    filter.connect(g).connect(this.bass)
    osc.start(t); sub.start(t)
    osc.stop(t + duration + 0.2); sub.stop(t + duration + 0.2)
  }

  padChord(t, chord, duration) {
    const { ctx } = this
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = this.surge ? 3200 : 1300
    filter.Q.value = 0.8
    const g = ctx.createGain()
    envelope(g.gain, t, { attack: 0.35, peak: 1, decay: 1.2, sustain: 0.7, hold: duration - 0.2, release: 0.6 })
    filter.connect(g).connect(this.pad)
    chord.forEach((midi) => {
      for (const detune of [-9, 0, 9]) {
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.value = midiToHz(midi)
        osc.detune.value = detune
        osc.connect(filter)
        osc.start(t)
        osc.stop(t + duration + 1)
      }
    })
  }

  arpNote(t, midi) {
    const { ctx } = this
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = midiToHz(midi)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(this.surge ? 5000 : 2600, t)
    filter.frequency.exponentialRampToValueAtTime(700, t + 0.12)
    const g = ctx.createGain()
    envelope(g.gain, t, { attack: 0.002, peak: 0.5, decay: 0.06 })
    osc.connect(filter).connect(g).connect(this.arp)
    osc.start(t)
    osc.stop(t + 0.25)
  }
}

export const SEQUENCER_STEP = STEP
