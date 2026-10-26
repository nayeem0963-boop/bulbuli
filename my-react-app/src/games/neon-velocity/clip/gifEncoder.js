/*
 * Dependency-free animated GIF89a encoder.
 *
 *   encodeGif(frames: Uint8ClampedArray[] (RGBA), width, height, opts) → Uint8Array
 *
 *   - One global palette for the whole clip, built with median cut over a
 *     sample of pixels from every frame (stable colours, no per-frame flicker).
 *   - 4×4 ordered (Bayer) dithering to soften banding in neon gradients.
 *   - Colour lookups cached on a 15-bit RGB key (32 K entries).
 *   - Standard variable-width LZW (min code size 8, up to 12 bits).
 *   - Loops forever (NETSCAPE2.0 extension).
 *
 * Pure JS with no DOM access, so it runs in a Web Worker (gif.worker.js) or Node.
 */

export function encodeGif(frames, width, height, { delayCs = 7, loop = 0, dither = true, maxColors = 256 } = {}) {
  if (!frames.length) throw new Error('No frames to encode')
  const palette = buildPalette(frames, maxColors)
  const lookup = createLookup(palette)
  const w = new ByteWriter(frames.length * width * height * 0.6 + 2048)

  // Header + logical screen descriptor (global colour table, 256 entries)
  w.str('GIF89a')
  w.u16(width); w.u16(height)
  w.byte(0xf7) // GCT flag | colour resolution 8 bit | table size 2^(7+1)
  w.byte(0); w.byte(0)
  w.bytes(palette.table)

  // Loop forever
  w.byte(0x21); w.byte(0xff); w.byte(11); w.str('NETSCAPE2.0')
  w.byte(3); w.byte(1); w.u16(loop); w.byte(0)

  const indices = new Uint8Array(width * height)
  for (const rgba of frames) {
    // Graphic control extension: disposal "leave in place", delay in 1/100 s
    w.byte(0x21); w.byte(0xf9); w.byte(4)
    w.byte(0x04); w.u16(delayCs); w.byte(0); w.byte(0)
    // Image descriptor (full frame, global palette)
    w.byte(0x2c); w.u16(0); w.u16(0); w.u16(width); w.u16(height); w.byte(0)

    mapToPalette(rgba, width, height, lookup, indices, dither)
    lzwEncode(indices, 8, w)
  }
  w.byte(0x3b)
  return w.result()
}

// ─── Palette: median cut ─────────────────────────────────────────

function buildPalette(frames, maxColors) {
  const target = 60000
  const totalPixels = frames.length * (frames[0].length / 4)
  const step = Math.max(1, Math.floor(totalPixels / target))
  const samples = []
  let n = 0
  for (const rgba of frames) {
    for (let p = 0; p < rgba.length; p += 4) {
      if (n++ % step) continue
      samples.push((rgba[p] << 16) | (rgba[p + 1] << 8) | rgba[p + 2])
    }
  }
  let boxes = [boxFrom(Uint32Array.from(samples))]
  while (boxes.length < maxColors) {
    // split the box with the largest (range × population)
    let best = -1
    let bestScore = 0
    boxes.forEach((b, i) => {
      const score = b.range * b.colors.length
      if (b.colors.length > 1 && b.range > 0 && score > bestScore) { bestScore = score; best = i }
    })
    if (best < 0) break
    const [a, b] = splitBox(boxes[best])
    boxes.splice(best, 1, a, b)
  }
  const table = new Uint8Array(256 * 3)
  const colors = boxes.map(average)
  colors.forEach((c, i) => { table[i * 3] = c[0]; table[i * 3 + 1] = c[1]; table[i * 3 + 2] = c[2] })
  return { table, colors }
}

function boxFrom(colors) {
  let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0
  for (let i = 0; i < colors.length; i++) {
    const c = colors[i]
    const r = c >> 16, g = (c >> 8) & 255, b = c & 255
    if (r < rMin) rMin = r; if (r > rMax) rMax = r
    if (g < gMin) gMin = g; if (g > gMax) gMax = g
    if (b < bMin) bMin = b; if (b > bMax) bMax = b
  }
  const ranges = [rMax - rMin, gMax - gMin, bMax - bMin]
  const axis = ranges.indexOf(Math.max(...ranges))
  return { colors, axis, range: ranges[axis] }
}

function splitBox(box) {
  const shift = [16, 8, 0][box.axis]
  const sorted = box.colors.slice().sort((a, b) => ((a >> shift) & 255) - ((b >> shift) & 255))
  const mid = sorted.length >> 1
  return [boxFrom(sorted.subarray(0, mid)), boxFrom(sorted.subarray(mid))]
}

function average({ colors }) {
  let r = 0, g = 0, b = 0
  for (let i = 0; i < colors.length; i++) {
    const c = colors[i]
    r += c >> 16; g += (c >> 8) & 255; b += c & 255
  }
  const n = Math.max(1, colors.length)
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
}

// ─── Pixel → palette index ───────────────────────────────────────

function createLookup({ colors }) {
  const cache = new Int16Array(1 << 15).fill(-1)
  return (r, g, b) => {
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
    let idx = cache[key]
    if (idx >= 0) return idx
    // nearest colour to the bucket centre
    const cr = (r & 0xf8) | 4, cg = (g & 0xf8) | 4, cb = (b & 0xf8) | 4
    let best = 0
    let bestD = Infinity
    for (let i = 0; i < colors.length; i++) {
      const c = colors[i]
      const dr = c[0] - cr, dg = c[1] - cg, db = c[2] - cb
      const d = dr * dr * 2 + dg * dg * 4 + db * db * 3 // perceptual-ish weights
      if (d < bestD) { bestD = d; best = i }
    }
    cache[key] = best
    return best
  }
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v / 16 - 0.5) * 12)

function mapToPalette(rgba, width, height, lookup, out, dither) {
  let p = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++, p++) {
      const o = p * 4
      let r = rgba[o], g = rgba[o + 1], b = rgba[o + 2]
      if (dither) {
        const t = BAYER4[((y & 3) << 2) | (x & 3)]
        r = clamp(r + t); g = clamp(g + t); b = clamp(b + t)
      }
      out[p] = lookup(r, g, b)
    }
  }
}
const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0)

// ─── LZW ─────────────────────────────────────────────────────────

function lzwEncode(indices, minCodeSize, w) {
  w.byte(minCodeSize)
  const clearCode = 1 << minCodeSize
  const eoiCode = clearCode + 1
  let codeSize = minCodeSize + 1
  let nextCode = eoiCode + 1
  let dict = new Map()

  // bit packer → 255-byte sub-blocks
  const block = new Uint8Array(255)
  let blockLen = 0
  let bitBuf = 0
  let bitCount = 0
  const flushBlock = () => {
    if (!blockLen) return
    w.byte(blockLen)
    w.bytes(block.subarray(0, blockLen))
    blockLen = 0
  }
  const emit = (code) => {
    bitBuf |= code << bitCount
    bitCount += codeSize
    while (bitCount >= 8) {
      block[blockLen++] = bitBuf & 255
      if (blockLen === 255) flushBlock()
      bitBuf >>>= 8
      bitCount -= 8
    }
  }

  emit(clearCode)
  let prefix = indices[0]
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i]
    const key = (prefix << 8) | k
    const code = dict.get(key)
    if (code !== undefined) {
      prefix = code
      continue
    }
    emit(prefix)
    if (nextCode === 4096) {
      emit(clearCode)
      dict = new Map()
      codeSize = minCodeSize + 1
      nextCode = eoiCode + 1
    } else {
      if (nextCode >= 1 << codeSize) codeSize++
      dict.set(key, nextCode++)
    }
    prefix = k
  }
  emit(prefix)
  emit(eoiCode)
  if (bitCount > 0) {
    block[blockLen++] = bitBuf & 255
    if (blockLen === 255) flushBlock()
  }
  flushBlock()
  w.byte(0) // block terminator
}

// ─── Growable byte buffer ────────────────────────────────────────

class ByteWriter {
  constructor(initial = 1 << 16) {
    this.buf = new Uint8Array(Math.max(1024, Math.ceil(initial)))
    this.len = 0
  }
  ensure(n) {
    if (this.len + n <= this.buf.length) return
    let size = this.buf.length * 2
    while (size < this.len + n) size *= 2
    const next = new Uint8Array(size)
    next.set(this.buf.subarray(0, this.len))
    this.buf = next
  }
  byte(v) { this.ensure(1); this.buf[this.len++] = v & 255 }
  u16(v) { this.byte(v & 255); this.byte((v >> 8) & 255) }
  bytes(arr) { this.ensure(arr.length); this.buf.set(arr, this.len); this.len += arr.length }
  str(s) { for (let i = 0; i < s.length; i++) this.byte(s.charCodeAt(i)) }
  result() { return this.buf.slice(0, this.len) }
}
