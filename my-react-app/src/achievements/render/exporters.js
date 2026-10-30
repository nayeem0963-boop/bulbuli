/**
 * Turns a sheet into files: the certificate PDF, the certificate preview, and the share PNG.
 * Loaded lazily (import('./render/exporters.js')), so none of the canvas code is in the main bundle.
 */
import { A4_LANDSCAPE, buildImagePdf } from '../pdf.js'
import { canvasToBlob } from './canvasKit.js'
import { paintCertificate } from './renderCertificate.js'
import { paintShareImage } from './renderShareImage.js'

export { prepareAvatarArt } from './avatarArt.jsx'
export { paintCertificate, paintShareImage }

const slug = (text) => String(text ?? '').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 48) || 'Achievement'

export const certificateFileName = (sheet) => `Bulbuli-Certificate-${slug(sheet.badgeTitle)}.pdf`
export const shareImageFileName = (sheet) => `Bulbuli-Achievement-${slug(sheet.badgeTitle)}.png`

/**
 * Paints the certificate at print quality (3508 px wide, ≈300 dpi on A4) and keeps what the
 * preview, the print-out and the PDF need: the JPEG, its size, the link areas and the QR code.
 */
export async function certificateAssets({ sheet, avatarArt }) {
  const { canvas, links, qr } = await paintCertificate({ sheet, avatarArt, width: 3508 })
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92)
  const jpeg = new Uint8Array(await blob.arrayBuffer())
  return { blob, jpeg, width: canvas.width, height: canvas.height, links, qr }
}

/** A4 landscape PDF from certificateAssets(): vector QR code and clickable links. */
export function certificatePdf(assets, sheet) {
  const bytes = buildImagePdf({
    jpeg: assets.jpeg,
    imageWidth: assets.width,
    imageHeight: assets.height,
    page: A4_LANDSCAPE,
    qr: assets.qr,
    links: assets.links,
    info: {
      title: `Bulbuli Certificate of Achievement: ${sheet.badgeTitle}`,
      author: 'Bulbuli',
      subject: sheet.code ? `Certificate ${sheet.code}` : 'Certificate of Achievement',
    },
  })
  return new Blob([bytes], { type: 'application/pdf' })
}

export async function certificatePdfBlob({ sheet, avatarArt }) {
  return certificatePdf(await certificateAssets({ sheet, avatarArt }), sheet)
}

export async function shareImageBlob(options) {
  return canvasToBlob(await paintShareImage(options), 'image/png')
}

/** Saves a Blob as a file download. */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
