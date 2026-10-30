// A real QR code for a URL (uqr: small, dependency-free, MIT). Error correction 'M' (15%),
// which keeps a 60-character certificate link at QR version 4 (33 × 33) and scans reliably
// when printed at 20 mm or more.
import { encode } from 'uqr'

/** { size, rows: boolean[][] } with no quiet zone (callers add their own 4-module margin). */
export function qrMatrix(text, ecc = 'M') {
  if (typeof text !== 'string' || !text) throw new Error('QR text is empty')
  const { size, data } = encode(text, { ecc, border: 0 })
  return { size, rows: data }
}

/** Dark modules merged into horizontal runs: [{ x, y, w }] in module units. */
export function qrRuns(matrix) {
  const runs = []
  matrix.rows.forEach((row, y) => {
    let start = -1
    for (let x = 0; x <= row.length; x += 1) {
      if (x < row.length && row[x]) {
        if (start < 0) start = x
      } else if (start >= 0) {
        runs.push({ x: start, y, w: x - start })
        start = -1
      }
    }
  })
  return runs
}

/** Draws the code on a canvas: white box (with 4-module quiet zone) at x, y, `size` px square. */
export function drawQr(ctx, matrix, x, y, size, color = '#1b2a49') {
  const modules = matrix.size + 8
  const unit = size / modules
  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x, y, size, size)
  ctx.fillStyle = color
  for (const run of qrRuns(matrix)) {
    // a hair of overlap so no hairline gaps show between modules
    ctx.fillRect(x + (run.x + 4) * unit, y + (run.y + 4) * unit, run.w * unit + 0.5, unit + 0.5)
  }
  ctx.restore()
}
