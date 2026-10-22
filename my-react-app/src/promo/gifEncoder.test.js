import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addPngText, crc32 } from './fileLinks.js'
import { buildPalette, indexPixels, lzwEncode, writeGif } from './gifEncoder.js'
import { gifTimeline } from './gifTimeline.js'

test('crc32 matches the standard check value', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926)
})

test('PNG text fields go right after the header and keep the picture intact', async () => {
  // a real 1 x 1 PNG
  const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0))
  const out = new Uint8Array(await (await addPngText(new Blob([png]), { Source: 'https://bulbuli.org' })).arrayBuffer())
  assert.deepEqual(out.subarray(0, 33), png.subarray(0, 33), 'signature and IHDR unchanged')
  assert.equal(new TextDecoder().decode(out.subarray(37, 41)), 'tEXt')
  assert.ok(new TextDecoder('latin1').decode(out).includes('Source\0https://bulbuli.org'))
  assert.deepEqual(out.subarray(out.length - 12), png.subarray(png.length - 12), 'IEND still last')
})

test('a GIF has the header, palette, loop, comment and trailer', () => {
  const pixels = new Uint8ClampedArray(4 * 4 * 4).map((_, i) => (i % 4 === 3 ? 255 : (i * 37) % 256))
  const palette = buildPalette([pixels])
  const gif = writeGif({
    width: 4,
    height: 4,
    palette: palette.palette,
    transparentIndex: palette.transparentIndex,
    frames: [{ indexes: indexPixels(pixels, palette), delay: 100 }],
    comment: 'https://bulbuli.org',
  })
  const text = new TextDecoder('latin1').decode(gif)
  assert.equal(text.slice(0, 6), 'GIF89a')
  assert.ok(text.includes('NETSCAPE2.0'))
  assert.ok(text.includes('https://bulbuli.org'))
  assert.equal(gif.at(-1), 0x3b)
})

test('LZW output is split into blocks of at most 255 bytes and ends with a 0 block', () => {
  const data = lzwEncode(new Uint8Array(5000).map((_, i) => (i * 31) % 251))
  let i = 0
  while (data[i] !== 0) {
    assert.ok(data[i] <= 255)
    i += data[i] + 1
  }
  assert.equal(i, data.length - 1)
})

test('the GIF timeline reveals every word, then rests on the full card', () => {
  const frames = gifTimeline(22)
  const talking = frames.slice(0, -1)
  assert.ok(talking.every((f, i) => i === 0 || f.paint.words >= talking[i - 1].paint.words))
  assert.equal(talking.at(-1).paint.words, 22)
  assert.deepEqual(frames.at(-1).paint, {})
  assert.ok(frames.at(-1).delay >= 2000)
})
