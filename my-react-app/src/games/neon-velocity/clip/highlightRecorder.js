/*
 * HighlightRecorder — keeps the best 3-second moment of the run.
 *
 * How it works
 *   - Every frame (throttled to `fps`), the WebGL canvas is downscaled into the
 *     next slot of a ring buffer of small 2D canvases (~4.5 s of history).
 *   - A "hype" score is computed each frame (speed, +surge, +grinding/wall-running).
 *     When it beats the run's best by a margin, the moment is marked and a
 *     full-resolution still is grabbed for the photo snapshot.
 *   - 1.5 s later (so the peak sits in the middle of the clip) the last 3 s of
 *     the ring are copied into the clip pool (~45 small blits, only on new peaks).
 *     The ring keeps recording untouched, so back-to-back peaks still get full clips.
 *     All canvases are allocated once in configure() — no per-frame allocations.
 *
 * Capture must happen right after the frame is rendered (same rAF tick),
 * otherwise a WebGL canvas without preserveDrawingBuffer reads back blank —
 * <CaptureBridge/> calls capture() from a late useFrame for exactly this reason.
 *
 * Memory (high quality): 400×225 RGBA ≈ 360 KB/frame → ring 68 + clip 45 frames ≈ 40 MB.
 * Low quality uses 288 px / 12 fps (≈ 11 MB).
 */

const PROFILES = {
  high: { fps: 15, width: 400, snapshotWidth: 1280 },
  low: { fps: 12, width: 288, snapshotWidth: 960 },
}

export class HighlightRecorder {
  constructor() {
    this.seconds = 3
    this.configured = null
    this.reset()
  }

  configure(quality, aspect) {
    const profile = PROFILES[quality] ?? PROFILES.high
    const height = Math.round(profile.width / aspect / 2) * 2
    const key = `${quality}:${profile.width}x${height}`
    if (this.configured === key) return
    this.configured = key
    this.fps = profile.fps
    this.width = profile.width
    this.height = height
    this.snapshotWidth = profile.snapshotWidth
    this.snapshotHeight = Math.round(profile.snapshotWidth / aspect / 2) * 2
    const clipFrames = this.fps * this.seconds
    const ringFrames = Math.ceil(this.fps * (this.seconds + 1.5))
    const make = () => {
      const c = document.createElement('canvas')
      c.width = this.width
      c.height = this.height
      return c
    }
    this.ring = Array.from({ length: ringFrames }, make)
    this.ringTimes = new Float64Array(ringFrames)
    this.clip = Array.from({ length: clipFrames }, make)
    this.snapshot = Object.assign(document.createElement('canvas'), { width: this.snapshotWidth, height: this.snapshotHeight })
    this.reset()
  }

  reset() {
    this.head = 0
    this.filled = 0
    this.lastCapture = -Infinity
    this.peakHype = 0
    this.peakMeta = null
    this.freezeAt = null
    this.clipLength = 0
    this.clipMeta = null
    this.hasSnapshot = false
  }

  /**
   * @param source  the WebGL canvas (gl.domElement)
   * @param time    run time in seconds
   * @param hype    current hype score
   * @param meta    { speedKmh, score, mode, surge } for overlays
   */
  capture(source, time, hype, meta) {
    if (!this.ring) return
    if (time - this.lastCapture >= 1 / this.fps - 1e-4) {
      this.lastCapture = time
      const slot = this.ring[this.head]
      slot.getContext('2d', { alpha: false }).drawImage(source, 0, 0, this.width, this.height)
      this.ringTimes[this.head] = time
      this.head = (this.head + 1) % this.ring.length
      this.filled = Math.min(this.filled + 1, this.ring.length)
    }

    // New peak? (needs 1 s of run so the opening frames aren't the "best")
    if (time > 1 && hype > this.peakHype * 1.03) {
      this.peakHype = hype
      this.peakMeta = { ...meta, time }
      this.freezeAt = time + this.seconds / 2
      this.snapshot.getContext('2d', { alpha: false })
        .drawImage(source, 0, 0, this.snapshotWidth, this.snapshotHeight)
      this.hasSnapshot = true
    }

    if (this.freezeAt !== null && time >= this.freezeAt) this.freeze()
  }

  /** Copy the newest `seconds` of the ring (oldest → newest) into the clip pool. */
  freeze() {
    const n = Math.min(this.clip.length, this.filled)
    this.freezeAt = null
    if (n === 0) return
    for (let k = 0; k < n; k++) {
      const ringIndex = (this.head - n + k + this.ring.length) % this.ring.length
      this.clip[k].getContext('2d', { alpha: false }).drawImage(this.ring[ringIndex], 0, 0)
    }
    this.clipLength = n
    this.clipMeta = this.peakMeta
  }

  /** Call at game over: if a peak is still waiting for its "after" frames, freeze now. */
  finalize() {
    if (this.freezeAt !== null) this.freeze()
  }

  getHighlight() {
    if (!this.clipLength && !this.hasSnapshot) return null
    return {
      frames: this.clip.slice(0, this.clipLength),
      fps: this.fps,
      width: this.width,
      height: this.height,
      snapshot: this.hasSnapshot ? this.snapshot : null,
      meta: this.clipMeta ?? this.peakMeta,
    }
  }
}

export const highlightRecorder = new HighlightRecorder()

/** Hype score: speed first, with bonuses for the spectacular stuff. */
export function hypeScore({ speed, surge, mode }) {
  let h = speed * 3.6
  if (surge > 0.5) h *= 1.15
  if (mode === 'GRIND' || mode === 'WALLRUN') h += 15
  if (mode === 'AIR' || mode === 'GLIDE') h += 5
  return h
}
