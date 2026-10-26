/*
 * Ghost replay format.
 *
 * A ghost is the player's path sampled at GHOST_HZ:
 *   frame = [t (s), x, y, z, mode]
 * Stored as a packed little-endian binary blob → base64 so it fits in a
 * Firestore string field or localStorage:
 *   Float32 t, Float32 x, Float32 y, Float32 z, Uint8 mode   (17 bytes/frame)
 * 10 Hz × 2 min ≈ 20 KB raw / 27 KB base64. Capped at MAX_FRAMES.
 */

export const GHOST_HZ = 10
export const MAX_FRAMES = GHOST_HZ * 60 * 8 // 8 minutes
export const GHOST_VERSION = 1

const MODES = ['RUN', 'AIR', 'GLIDE', 'SLIDE', 'GRIND', 'WALLRUN']
const FRAME_BYTES = 17

export function encodeGhost(frames) {
  const n = Math.min(frames.length, MAX_FRAMES)
  const buf = new ArrayBuffer(n * FRAME_BYTES)
  const view = new DataView(buf)
  for (let i = 0; i < n; i++) {
    const [t, x, y, z, mode] = frames[i]
    const o = i * FRAME_BYTES
    view.setFloat32(o, t, true)
    view.setFloat32(o + 4, x, true)
    view.setFloat32(o + 8, y, true)
    view.setFloat32(o + 12, z, true)
    view.setUint8(o + 16, Math.max(0, MODES.indexOf(mode)))
  }
  return { v: GHOST_VERSION, hz: GHOST_HZ, count: n, data: bytesToBase64(new Uint8Array(buf)) }
}

export function decodeGhost(packed) {
  if (!packed || packed.v !== GHOST_VERSION || !packed.data) return null
  const bytes = base64ToBytes(packed.data)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const n = Math.floor(bytes.byteLength / FRAME_BYTES)
  // Struct-of-arrays for fast playback lookups
  const t = new Float32Array(n)
  const x = new Float32Array(n)
  const y = new Float32Array(n)
  const z = new Float32Array(n)
  const mode = new Array(n)
  for (let i = 0; i < n; i++) {
    const o = i * FRAME_BYTES
    t[i] = view.getFloat32(o, true)
    x[i] = view.getFloat32(o + 4, true)
    y[i] = view.getFloat32(o + 8, true)
    z[i] = view.getFloat32(o + 12, true)
    mode[i] = MODES[view.getUint8(o + 16)] ?? 'RUN'
  }
  return { count: n, t, x, y, z, mode, duration: n ? t[n - 1] : 0 }
}

/**
 * Sample a decoded ghost at time `time` (seconds), writing into `out` {x,y,z,mode}.
 * `cursor` is an object { i } that remembers the last index — playback is O(1)
 * amortised because time only moves forward.
 */
export function sampleGhost(ghost, time, cursor, out) {
  const { t, x, y, z, mode, count } = ghost
  if (!count) return false
  if (time <= t[0]) { out.x = x[0]; out.y = y[0]; out.z = z[0]; out.mode = mode[0]; return true }
  if (time >= t[count - 1]) return false // ghost finished
  let i = cursor.i
  if (t[i] > time) i = 0
  while (i < count - 2 && t[i + 1] < time) i++
  cursor.i = i
  const k = (time - t[i]) / Math.max(1e-6, t[i + 1] - t[i])
  out.x = x[i] + (x[i + 1] - x[i]) * k
  out.y = y[i] + (y[i + 1] - y[i]) * k
  out.z = z[i] + (z[i + 1] - z[i]) * k
  out.mode = mode[i]
  return true
}

// ── base64 helpers (browser + node) ──
function bytesToBase64(bytes) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64')
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}
function base64ToBytes(b64) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'))
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
