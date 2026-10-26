import { SFX } from './sfx'
import { SynthwaveSequencer } from './SynthwaveSequencer'
import { createNoiseBuffer, createReverbImpulse } from './synthUtils'

/*
 * AudioController — singleton owning the Web Audio graph.
 *
 *   music: sequencer → musicFilter (speed-reactive low-pass) → pauseGain → musicVolume ─┐
 *                                                                        └→ analyser  │
 *   sfx:   one-shots / loops → sfxVolume ────────────────────────────────────────────┤
 *   sends: reverb (convolver), delay (dotted 8th w/ feedback) ───────────────────────┤
 *                                                                                    ▼
 *                                                               master (mute) → limiter → speakers
 *
 * - Created lazily and resumed on the first user gesture (browser autoplay policy).
 * - Music state machine: menu (muffled) → playing (opens with speed) → paused
 *   (muffled + quieter) → gameover (filter dives, music fades).
 * - Exposes an 8-band spectrum for audio-reactive visuals (billboards, sun).
 * - Hits briefly duck and muffle the music for impact.
 * - Pickup combos raise the pickup pitch by a semitone per chained crystal.
 */

const BPM_8TH_DOTTED = (60 / 104) * 0.75

class AudioController {
  ctx = null
  nodes = null
  sequencer = null
  noise = null
  loops = new Map()
  musicState = 'off'
  intensity = 0
  surge = 0
  combo = 0
  lastPickup = 0
  settings = { muted: false, musicVolume: 0.7, sfxVolume: 0.85 }
  freqData = null

  /** Build the graph on first use. Safe to call repeatedly. */
  ensure() {
    if (this.ctx) return this.ctx
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
    if (!AC) return null
    const ctx = new AC({ latencyHint: 'interactive' })
    this.ctx = ctx
    this.noise = createNoiseBuffer(ctx)

    const master = ctx.createGain()
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -8
    limiter.knee.value = 6
    limiter.ratio.value = 12
    limiter.attack.value = 0.003
    limiter.release.value = 0.15
    master.connect(limiter).connect(ctx.destination)

    // Sends
    const reverb = ctx.createConvolver()
    reverb.buffer = createReverbImpulse(ctx)
    const reverbIn = ctx.createGain()
    reverbIn.gain.value = 0.35
    reverbIn.connect(reverb).connect(master)

    const delay = ctx.createDelay(1)
    delay.delayTime.value = BPM_8TH_DOTTED
    const feedback = ctx.createGain()
    feedback.gain.value = 0.35
    const delayTone = ctx.createBiquadFilter()
    delayTone.type = 'lowpass'
    delayTone.frequency.value = 3000
    const delayIn = ctx.createGain()
    delayIn.gain.value = 0.4
    delayIn.connect(delay)
    delay.connect(delayTone).connect(feedback).connect(delay)
    delayTone.connect(master)

    // Music
    const musicIn = ctx.createGain()
    const musicFilter = ctx.createBiquadFilter()
    musicFilter.type = 'lowpass'
    musicFilter.frequency.value = 800
    musicFilter.Q.value = 0.9
    const pauseGain = ctx.createGain()
    const musicVolume = ctx.createGain()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.7
    musicIn.connect(musicFilter).connect(pauseGain).connect(musicVolume).connect(master)
    musicVolume.connect(analyser)
    this.freqData = new Uint8Array(analyser.frequencyBinCount)

    // SFX
    const sfxVolume = ctx.createGain()
    sfxVolume.connect(master)
    const sfxReverb = ctx.createGain() // wet-only send; level follows the SFX slider
    sfxReverb.connect(reverbIn)

    this.nodes = { master, musicIn, musicFilter, pauseGain, musicVolume, analyser, sfxVolume, sfxReverb, reverbIn, delayIn }
    this.sequencer = new SynthwaveSequencer(ctx, { out: musicIn, reverb: reverbIn, delay: delayIn, noise: this.noise })
    this.applySettings(this.settings)
    return ctx
  }

  /** Leaving the game: stop the music and loops and put the audio device to sleep. */
  shutdown() {
    if (!this.ctx) return
    this.sequencer?.stop(0.1)
    this.stopAllLoops()
    this.musicState = 'off'
    this.ctx.suspend().catch(() => {})
  }

  /** Call from a user gesture (click/tap/key). Resolves once audio is running. */
  unlock() {
    const ctx = this.ensure()
    if (!ctx) return Promise.resolve(false)
    if (ctx.state === 'running') return Promise.resolve(true)
    return ctx.resume().then(() => true, () => false)
  }

  get running() {
    return !!this.ctx && this.ctx.state === 'running'
  }

  applySettings({ muted, musicVolume, sfxVolume }) {
    this.settings = { muted, musicVolume, sfxVolume }
    if (!this.nodes) return
    const t = this.ctx.currentTime
    this.nodes.master.gain.setTargetAtTime(muted ? 0 : 1, t, 0.05)
    this.nodes.musicVolume.gain.setTargetAtTime(musicVolume * 0.75, t, 0.05)
    this.nodes.sfxVolume.gain.setTargetAtTime(sfxVolume, t, 0.05)
    this.nodes.sfxReverb.gain.setTargetAtTime(sfxVolume * 0.6, t, 0.05)
  }

  /** 'menu' | 'playing' | 'paused' | 'gameover' */
  setMusicState(state) {
    if (!this.running || state === this.musicState) return
    const prev = this.musicState
    this.musicState = state
    const t = this.ctx.currentTime
    const { musicFilter, pauseGain } = this.nodes

    if (state === 'menu') {
      this.sequencer.start()
      this.sequencer.setIntensity(0, false)
      musicFilter.frequency.setTargetAtTime(750, t, 0.3)
      pauseGain.gain.setTargetAtTime(0.8, t, 0.3)
    } else if (state === 'playing') {
      this.sequencer.start()
      pauseGain.gain.setTargetAtTime(1, t, 0.15)
      if (prev !== 'paused') this.play('runStart')
      this.updateFilter(0.2)
    } else if (state === 'paused') {
      musicFilter.frequency.setTargetAtTime(380, t, 0.15)
      pauseGain.gain.setTargetAtTime(0.55, t, 0.2)
      this.stopAllLoops()
    } else if (state === 'gameover') {
      musicFilter.frequency.cancelScheduledValues(t)
      musicFilter.frequency.setTargetAtTime(140, t, 0.35)
      this.stopAllLoops()
      // let the dive play out, then come back up to the menu groove
      setTimeout(() => {
        if (this.musicState === 'gameover') {
          this.sequencer.setIntensity(0, false)
          this.nodes.musicFilter.frequency.setTargetAtTime(650, this.ctx.currentTime, 1.2)
        }
      }, 1600)
    }
  }

  /** Called ~10×/s with run speed (0..1) and surge (0..1). */
  setIntensity(speedFactor, surge) {
    this.intensity = speedFactor
    this.surge = surge
    if (!this.running || this.musicState !== 'playing') return
    this.sequencer.setIntensity(speedFactor, surge > 0.5)
    this.updateFilter(0.25)
  }

  updateFilter(timeConstant) {
    const freq = 1100 + Math.pow(this.intensity, 1.4) * 6500 + this.surge * 9000
    this.nodes.musicFilter.frequency.setTargetAtTime(freq, this.ctx.currentTime, timeConstant)
  }

  /** Short duck + muffle for impactful moments (hits). */
  impactDuck(depth = 0.45, recover = 0.35) {
    if (!this.running) return
    const t = this.ctx.currentTime
    const g = this.nodes.pauseGain.gain
    g.cancelScheduledValues(t)
    g.setValueAtTime(depth, t)
    g.setTargetAtTime(this.musicState === 'paused' ? 0.55 : 1, t + 0.05, recover)
    const f = this.nodes.musicFilter.frequency
    f.cancelScheduledValues(t)
    f.setValueAtTime(500, t)
    this.updateFilter(recover)
  }

  play(name, opts) {
    if (!this.running) return
    const fn = SFX[name]
    if (!fn) return
    fn({ ctx: this.ctx, out: this.nodes.sfxVolume, noise: this.noise, reverb: this.nodes.sfxReverb }, opts)
  }

  /** Pickups chain upward in pitch while collected within 0.7 s of each other. */
  pickup(variant) {
    if (!this.running) return
    if (variant === 'prism') { this.play('prism'); return }
    const now = this.ctx.currentTime
    this.combo = now - this.lastPickup < 0.7 ? Math.min(this.combo + 1, 12) : 0
    this.lastPickup = now
    // walk the A-minor pentatonic so combos always sound musical
    const scale = [0, 3, 5, 7, 10]
    const semitone = Math.floor(this.combo / 5) * 12 + scale[this.combo % 5]
    this.play('pickup', { semitone })
  }

  // ── Looping sounds (grind) ──
  startLoop(name) {
    if (!this.running || this.loops.has(name)) return
    const { ctx } = this
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 2600
    filter.Q.value = 4
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 13
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = 700
    lfo.connect(lfoDepth).connect(filter.frequency)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.setTargetAtTime(0.13, t, 0.04)
    src.connect(filter).connect(g).connect(this.nodes.sfxVolume)
    src.start(t)
    lfo.start(t)
    this.loops.set(name, { src, lfo, g })
  }

  stopLoop(name) {
    const loop = this.loops.get(name)
    if (!loop) return
    const t = this.ctx.currentTime
    loop.g.gain.setTargetAtTime(0.0001, t, 0.05)
    loop.src.stop(t + 0.3)
    loop.lfo.stop(t + 0.3)
    this.loops.delete(name)
  }

  stopAllLoops() {
    for (const name of [...this.loops.keys()]) this.stopLoop(name)
  }

  /**
   * Fill `out` (length 8) with 0..1 log-spaced band energies of the music.
   * Returns false when audio isn't running (visuals fall back to procedural motion).
   */
  getBands(out) {
    if (!this.running || !this.sequencer?.playing) return false
    const data = this.freqData
    this.nodes.analyser.getByteFrequencyData(data)
    const bins = data.length
    for (let b = 0; b < 8; b++) {
      const lo = Math.floor(Math.pow(bins, b / 8))
      const hi = Math.max(lo + 1, Math.floor(Math.pow(bins, (b + 1) / 8)))
      let sum = 0
      for (let i = lo; i < hi; i++) sum += data[i]
      out[b] = Math.min(1, (sum / (hi - lo)) / 200)
    }
    return true
  }
}

export const audio = new AudioController()
