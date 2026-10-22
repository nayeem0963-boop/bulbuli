// Puts the Bulbuli web address inside the downloaded files themselves.
// A picture can't hold a clickable link, but its details can carry the address
// (PNG text fields; the GIF encoder adds a GIF comment), and the share message carries a real link.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(bytes) {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/** Latin-1 bytes, as PNG tEXt requires (anything outside Latin-1 becomes '?'). */
function latin1(text) {
  return Uint8Array.from(text, (ch) => (ch.charCodeAt(0) < 256 ? ch.charCodeAt(0) : 63))
}

function textChunk(keyword, value) {
  const data = new Uint8Array([...latin1(keyword), 0, ...latin1(value)])
  const chunk = new Uint8Array(12 + data.length)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, data.length)
  chunk.set(latin1('tEXt'), 4)
  chunk.set(data, 8)
  view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)))
  return chunk
}

/** Adds text fields ({ Title, Source, Comment, ... }) to a PNG, right after its header chunk. */
export async function addPngText(blob, fields) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const ihdrLength = new DataView(bytes.buffer).getUint32(8)
  const insertAt = 8 + 12 + ihdrLength // signature + IHDR chunk
  const chunks = Object.entries(fields).map(([keyword, value]) => textChunk(keyword, value))
  return new Blob([bytes.subarray(0, insertAt), ...chunks, bytes.subarray(insertAt)], { type: 'image/png' })
}
