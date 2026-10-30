/**
 * A tiny PDF writer for one-page certificates: no library, no fonts to embed.
 *
 *   const bytes = buildImagePdf({
 *     jpeg,                          // Uint8Array: the painted certificate (JPEG)
 *     imageWidth, imageHeight,       // its size in pixels
 *     page: { width: 841.89, height: 595.28 },   // A4 landscape, in points
 *     qr:    { matrix, rect: { x, y, w, h } },   // optional: redrawn as sharp vector squares
 *     links: [{ rect: { x, y, w, h }, url }],    // clickable areas (pixel rects on the image)
 *     info:  { title, author, subject },
 *   })
 *
 * The page is the JPEG stretched to the full page. The QR code is drawn again on top as vector
 * rectangles, so it stays perfectly sharp at any print size, and each link becomes a real PDF
 * link annotation (/URI), so the address is clickable in any PDF viewer.
 * Pure (no DOM), so it runs under node --test.
 */
import { qrRuns } from './qr.js'

export const A4_LANDSCAPE = { width: 841.89, height: 595.28 }

const encoder = new TextEncoder()
const ascii = (text) => encoder.encode(text)
const num = (n) => (Math.round(n * 1000) / 1000).toString()

/** A PDF text string as UTF-16BE hex (handles any language and emoji). */
function pdfText(value) {
  let hex = 'FEFF'
  const text = String(value ?? '')
  for (let i = 0; i < text.length; i += 1) hex += text.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase()
  return `<${hex}>`
}

/** A URI for a link annotation: printable ASCII only, with ( ) \ escaped. */
function pdfUri(url) {
  const safe = String(url)
  if (!/^https?:\/\/[\x21-\x7e]+$/.test(safe)) throw new Error(`Not a printable http(s) URL: ${url}`)
  return `(${safe.replace(/[\\()]/g, (c) => `\\${c}`)})`
}

export function buildImagePdf({ jpeg, imageWidth, imageHeight, page = A4_LANDSCAPE, qr = null, links = [], info = {} }) {
  if (!(jpeg instanceof Uint8Array) || jpeg.length < 4 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8) {
    throw new Error('buildImagePdf needs JPEG bytes')
  }
  const sx = page.width / imageWidth
  const sy = page.height / imageHeight
  // image pixel rect → PDF user-space rect (origin bottom-left)
  const toPdf = ({ x, y, w, h }) => ({ x: x * sx, y: page.height - (y + h) * sy, w: w * sx, h: h * sy })

  /* ---------- page content ---------- */
  let content = `q ${num(page.width)} 0 0 ${num(page.height)} 0 0 cm /Im0 Do Q\n`
  if (qr?.matrix && qr.rect) {
    const box = toPdf(qr.rect)
    const modules = qr.matrix.size + 8
    const unit = box.w / modules
    content += `q 1 1 1 rg ${num(box.x)} ${num(box.y)} ${num(box.w)} ${num(box.h)} re f\n`
    content += '0.106 0.165 0.286 rg\n'
    for (const run of qrRuns(qr.matrix)) {
      const x = box.x + (run.x + 4) * unit
      const y = box.y + box.h - (run.y + 5) * unit
      content += `${num(x)} ${num(y)} ${num(run.w * unit)} ${num(unit)} re\n`
    }
    content += 'f Q\n'
  }

  /* ---------- objects ---------- */
  // 1 catalog, 2 pages, 3 page, 4 content, 5 image, 6 info, 7.. link annotations
  const validLinks = links.filter((link) => link?.url && link.rect)
  const annotIds = validLinks.map((_, i) => 7 + i)
  const objects = []
  objects[1] = ascii('<< /Type /Catalog /Pages 2 0 R >>')
  objects[2] = ascii('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  objects[3] = ascii(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(page.width)} ${num(page.height)}] `
    + '/Resources << /XObject << /Im0 5 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 4 0 R'
    + (annotIds.length ? ` /Annots [${annotIds.map((id) => `${id} 0 R`).join(' ')}]` : '')
    + ' >>',
  )
  const contentBytes = ascii(content)
  objects[4] = [ascii(`<< /Length ${contentBytes.length} >>\nstream\n`), contentBytes, ascii('\nendstream')]
  objects[5] = [
    ascii(`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),
    jpeg,
    ascii('\nendstream'),
  ]
  const infoParts = ['/Producer (Bulbuli)', '/Creator (Bulbuli)']
  if (info.title) infoParts.push(`/Title ${pdfText(info.title)}`)
  if (info.author) infoParts.push(`/Author ${pdfText(info.author)}`)
  if (info.subject) infoParts.push(`/Subject ${pdfText(info.subject)}`)
  objects[6] = ascii(`<< ${infoParts.join(' ')} >>`)
  validLinks.forEach((link, i) => {
    const r = toPdf(link.rect)
    objects[7 + i] = ascii(
      `<< /Type /Annot /Subtype /Link /Rect [${num(r.x)} ${num(r.y)} ${num(r.x + r.w)} ${num(r.y + r.h)}] `
      + `/Border [0 0 0] /F 4 /A << /Type /Action /S /URI /URI ${pdfUri(link.url)} >> >>`,
    )
  })

  /* ---------- file ---------- */
  const chunks = [ascii('%PDF-1.4\n'), new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])] // binary marker
  let offset = chunks.reduce((sum, c) => sum + c.length, 0)
  const offsets = []
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = offset
    const parts = [ascii(`${id} 0 obj\n`), ...[objects[id]].flat(), ascii('\nendobj\n')]
    for (const part of parts) {
      chunks.push(part)
      offset += part.length
    }
  }
  const xrefAt = offset
  let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`
  for (let id = 1; id < objects.length; id += 1) xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  xref += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`
  chunks.push(ascii(xref))

  const out = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0))
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return out
}
