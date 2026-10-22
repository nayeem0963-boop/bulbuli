// A small animated-GIF encoder (GIF89a), so the Math Hero GIF can be made in the browser
// without any extra package. It picks one 256-colour palette for the whole animation
// (median cut), then LZW-compresses each frame.

/** 15-bit colour key (5 bits per channel). */
const key15 = (r, g, b) => ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)

/**
 * Builds a palette of up to `size` colours from sample frames (Uint8ClampedArray RGBA).
 * Returns { palette: number[] (r,g,b,...), lookup: Uint8Array(32768) mapping key15 -> palette index }.
 * Index `size - 1` is reserved for transparency when `transparent` is true.
 */
export function buildPalette(samples, { size = 256, transparent = true, step = 2 } = {}) {
  const counts = new Uint32Array(32768)
  for (const data of samples) {
    for (let i = 0; i < data.length; i += 4 * step) {
      if (data[i + 3] < 128) continue
      counts[key15(data[i], data[i + 1], data[i + 2])] += 1
    }
  }
  const colors = []
  for (let k = 0; k < 32768; k += 1) if (counts[k]) colors.push(k)

  const channel = (k, c) => (c === 0 ? (k >> 10) & 31 : c === 1 ? (k >> 5) & 31 : k & 31)
  const boxes = [colors]
  const target = transparent ? size - 1 : size
  // Median cut: keep splitting the box with the widest colour range at its weighted median.
  while (boxes.length < target) {
    let best = -1
    let bestRange = 0
    let bestChannel = 0
    boxes.forEach((box, index) => {
      if (box.length < 2) return
      for (let c = 0; c < 3; c += 1) {
        let lo = 31
        let hi = 0
        for (const k of box) {
          const v = channel(k, c)
          if (v < lo) lo = v
          if (v > hi) hi = v
        }
        if (hi - lo > bestRange) { bestRange = hi - lo; best = index; bestChannel = c }
      }
    })
    if (best < 0) break
    const box = boxes[best].sort((a, b) => channel(a, bestChannel) - channel(b, bestChannel))
    const total = box.reduce((sum, k) => sum + counts[k], 0)
    let running = 0
    let cut = 1
    for (; cut < box.length - 1; cut += 1) {
      running += counts[box[cut - 1]]
      if (running >= total / 2) break
    }
    boxes.splice(best, 1, box.slice(0, cut), box.slice(cut))
  }

  const palette = []
  for (const box of boxes) {
    let r = 0
    let g = 0
    let b = 0
    let n = 0
    for (const k of box) {
      const w = counts[k]
      r += (((k >> 10) & 31) * 8 + 4) * w
      g += (((k >> 5) & 31) * 8 + 4) * w
      b += ((k & 31) * 8 + 4) * w
      n += w
    }
    palette.push(Math.round(r / n), Math.round(g / n), Math.round(b / n))
  }
  if (!palette.length) palette.push(255, 255, 255)
  const colorsUsed = palette.length / 3
  while (palette.length < size * 3) palette.push(0, 0, 0)

  // Nearest palette colour for every 15-bit colour.
  const lookup = new Uint8Array(32768)
  for (let k = 0; k < 32768; k += 1) {
    const r = ((k >> 10) & 31) * 8 + 4
    const g = ((k >> 5) & 31) * 8 + 4
    const b = (k & 31) * 8 + 4
    let bestIndex = 0
    let bestDistance = Infinity
    for (let p = 0; p < colorsUsed; p += 1) {
      const dr = r - palette[p * 3]
      const dg = g - palette[p * 3 + 1]
      const db = b - palette[p * 3 + 2]
      const d = dr * dr * 2 + dg * dg * 4 + db * db * 3 // eyes are most sensitive to green
      if (d < bestDistance) { bestDistance = d; bestIndex = p }
    }
    lookup[k] = bestIndex
  }
  return { palette, lookup, transparentIndex: transparent ? size - 1 : -1 }
}

/** Maps RGBA pixels to palette indexes. */
export function indexPixels(data, { lookup, transparentIndex }) {
  const out = new Uint8Array(data.length / 4)
  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    out[j] = transparentIndex >= 0 && data[i + 3] < 128
      ? transparentIndex
      : lookup[key15(data[i], data[i + 1], data[i + 2])]
  }
  return out
}

/** GIF's variable-length-code LZW, packed into sub-blocks of up to 255 bytes. */
export function lzwEncode(indexes, minCodeSize = 8) {
  const clear = 1 << minCodeSize
  const end = clear + 1
  const bytes = []
  let bitBuffer = 0
  let bitCount = 0
  let codeSize = minCodeSize + 1
  const write = (code) => {
    bitBuffer |= code << bitCount
    bitCount += codeSize
    while (bitCount >= 8) {
      bytes.push(bitBuffer & 0xff)
      bitBuffer >>>= 8
      bitCount -= 8
    }
  }

  let dict = new Map()
  let nextCode = end + 1
  write(clear)
  let prefix = indexes[0]
  for (let i = 1; i < indexes.length; i += 1) {
    const k = indexes[i]
    const entry = prefix * 4096 + k
    const found = dict.get(entry)
    if (found !== undefined) {
      prefix = found
      continue
    }
    write(prefix)
    if (nextCode < 4096) {
      dict.set(entry, nextCode)
      if (nextCode === 1 << codeSize && codeSize < 12) codeSize += 1
      nextCode += 1
    } else {
      write(clear)
      dict = new Map()
      nextCode = end + 1
      codeSize = minCodeSize + 1
    }
    prefix = k
  }
  write(prefix)
  write(end)
  if (bitCount > 0) bytes.push(bitBuffer & 0xff)

  const blocks = []
  for (let i = 0; i < bytes.length; i += 255) {
    const chunk = bytes.slice(i, i + 255)
    blocks.push(chunk.length, ...chunk)
  }
  blocks.push(0)
  return blocks
}

const word = (n) => [n & 0xff, (n >> 8) & 0xff]
const ascii = (text) => Array.from(text, (ch) => ch.charCodeAt(0) & 0x7f)

/**
 * Writes the GIF. frames: [{ indexes: Uint8Array, delay: ms }]. Loops forever.
 * `comment` is stored as a GIF comment (used for the Bulbuli web address).
 */
export function writeGif({ width, height, palette, transparentIndex = -1, frames, comment }) {
  const parts = [Uint8Array.from([
    ...ascii('GIF89a'),
    ...word(width), ...word(height),
    0xf7, 0, 0, // global colour table, 256 colours
    ...palette,
    // loop forever (NETSCAPE2.0 extension)
    0x21, 0xff, 0x0b, ...ascii('NETSCAPE2.0'), 0x03, 0x01, 0, 0, 0x00,
  ])]
  if (comment) {
    const bytes = ascii(comment)
    const block = [0x21, 0xfe]
    for (let i = 0; i < bytes.length; i += 255) {
      const chunk = bytes.slice(i, i + 255)
      block.push(chunk.length, ...chunk)
    }
    block.push(0)
    parts.push(Uint8Array.from(block))
  }
  const hasAlpha = transparentIndex >= 0
  for (const frame of frames) {
    parts.push(Uint8Array.from([
      0x21, 0xf9, 0x04,
      (2 << 2) | (hasAlpha ? 1 : 0), // dispose: restore to background; transparency flag
      ...word(Math.round(frame.delay / 10)), // hundredths of a second
      hasAlpha ? transparentIndex : 0,
      0x00,
      0x2c, ...word(0), ...word(0), ...word(width), ...word(height), 0x00,
      0x08, // LZW minimum code size
    ]))
    parts.push(Uint8Array.from(frame.lzw ?? lzwEncode(frame.indexes, 8)))
  }
  parts.push(Uint8Array.of(0x3b))

  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}
