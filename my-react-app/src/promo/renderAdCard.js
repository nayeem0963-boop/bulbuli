// Draws the Math Hero ad onto a <canvas> and returns a PNG.
// It paints from the same AD_LAYOUT the live card uses, instead of screenshotting the page,
// so fonts, the speech bubble and the colours come out exactly right and nothing is clipped.

import mascotUrl from '../assets/math-hero-mascot-cutout.webp'
import { AD_COLORS as C, AD_LAYOUT as L, AD_TEXT, MASCOT_ASPECT } from './adContent.js'
import { QR_MODULES } from './qrMathHero.js'

const FONTS = {
  en: { display: '"Baloo 2", "Trebuchet MS", sans-serif', body: 'Nunito, "Segoe UI", sans-serif' },
  bn: { display: '"Baloo Da 2", "Baloo 2", sans-serif', body: '"Hind Siliguri", Nunito, sans-serif' },
}
const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Could not load ${src}`))
    image.src = src
  })
}

/** Waits for the web fonts, so the canvas never falls back to a plain system font. */
async function loadFonts(language, u) {
  if (!document.fonts?.load) return
  const f = FONTS[language]
  await Promise.all([
    document.fonts.load(`800 ${L.title.size * u}px ${f.display}`, AD_TEXT[language].title),
    document.fonts.load(`800 ${L.bubble.size * u}px ${f.body}`, AD_TEXT[language].speech),
    document.fonts.load(`800 ${L.cta.size * u}px ${f.display}`, AD_TEXT[language].cta),
    document.fonts.load(`800 ${L.brand.size * u}px ${FONTS.en.display}`, 'bulbuli'),
  ]).catch(() => {})
  await document.fonts.ready
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function wrapLines(ctx, text, maxWidth) {
  const lines = []
  let line = ''
  for (const word of text.split(' ')) {
    const attempt = line ? `${line} ${word}` : word
    if (line && ctx.measureText(attempt).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = attempt
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Draws the QR code as crisp squares, with the white quiet zone scanners need around it. */
function drawQrCode(ctx, x, y, size) {
  const quiet = 3 // modules of white border (4 is the spec; 3 still scans and saves room)
  const count = QR_MODULES.length + quiet * 2
  const module = size / count
  ctx.fillStyle = '#fff'
  ctx.fillRect(x, y, size, size)
  ctx.fillStyle = '#000'
  QR_MODULES.forEach((row, r) => {
    for (let c = 0; c < row.length; c += 1) {
      if (row[c] === '1') {
        // Slightly oversized squares, so no hairline gaps appear between neighbours.
        ctx.fillRect(x + (c + quiet) * module, y + (r + quiet) * module, module + 0.5, module + 0.5)
      }
    }
  })
}

function drawBrandMark(ctx, x, y, size) {
  // The same bird as public/favicon.svg, drawn from its 64 x 64 paths.
  const s = size / 64
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.lineJoin = 'round'
  const path = (d, fill, stroke, width) => {
    const p = new Path2D(d)
    ctx.fillStyle = fill
    ctx.fill(p)
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(p) }
  }
  path('M14 44 L3 50 Q2 55 7 56 L19 51 Z', '#5c4a40', C.ink, 2.5)
  path('M27 17 C23 11 23 5 27 1 C29 6 33 8 38 9 C35 11 36 14 39 16 Z', C.ink)
  ctx.beginPath(); ctx.ellipse(34, 38, 21, 20, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#8a7466'; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke()
  path('M15 31 C16 20 24 14 34 14 C44 14 51 21 53 30 C47 33 41 35 34 34 C27 33 20 31 15 31 Z', C.ink)
  ctx.beginPath(); ctx.arc(41, 25, 4.6, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill()
  ctx.beginPath(); ctx.arc(42, 25.5, 2.3, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill()
  path('M51 27 L62 31 L51 35 Z', '#f2b33d', C.ink, 2)
  path('M28 40 C35 37 45 41 46 50 C38 51 31 47 28 40 Z', '#6d5a4f')
  path('M16 46 C18 53 23 57 29 57 C26 52 22 48 16 46 Z', '#e4333f', C.ink, 2)
  ctx.restore()
}

/**
 * Paints the ad. `width` is the PNG width in pixels (height is 1.25 x width).
 * Returns the canvas.
 */
export async function drawAdCard({ language = 'en', width = 1080, siteLabel = 'bulbuli.org' } = {}) {
  const text = AD_TEXT[language] ?? AD_TEXT.en
  const font = FONTS[language] ?? FONTS.en
  const u = width / 100
  const W = width
  const H = L.height * u

  const [mascot] = await Promise.all([loadImage(mascotUrl), loadFonts(language, u)])

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'alphabetic'

  // card shape: everything is clipped to the rounded card
  const border = L.border * u
  roundedRect(ctx, 0, 0, W, H, L.radius * u)
  ctx.save()
  ctx.clip()

  // sky to warm sunshine
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, C.skyTop)
  sky.addColorStop(0.45, C.skyMid)
  sky.addColorStop(1, C.warm)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  // sun rays behind Math Hero
  const { cx, cy, count } = L.rays
  ctx.fillStyle = C.rays
  const reach = Math.hypot(W, H) * 1.2
  for (let i = 0; i < count; i += 1) {
    const a0 = (i / count) * Math.PI * 2
    const a1 = a0 + Math.PI / count
    ctx.beginPath()
    ctx.moveTo(cx * u, cy * u)
    ctx.lineTo(cx * u + Math.cos(a0) * reach, cy * u + Math.sin(a0) * reach)
    ctx.lineTo(cx * u + Math.cos(a1) * reach, cy * u + Math.sin(a1) * reach)
    ctx.closePath()
    ctx.fill()
  }

  // floating maths symbols
  for (const symbol of L.symbols) {
    ctx.save()
    ctx.translate(symbol.x * u, symbol.y * u)
    ctx.rotate((symbol.rotate * Math.PI) / 180)
    ctx.font = `800 ${symbol.size * u}px ${FONTS.en.display}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 0.9 * u
    ctx.strokeStyle = C.ink
    ctx.strokeText(symbol.text, 0, 0)
    ctx.fillStyle = symbol.color
    ctx.fillText(symbol.text, 0, 0)
    ctx.restore()
  }

  // green hill
  ctx.beginPath()
  ctx.ellipse(L.hill.cx * u, L.hill.cy * u, L.hill.rx * u, L.hill.ry * u, 0, 0, Math.PI * 2)
  ctx.fillStyle = C.hill
  ctx.fill()
  ctx.lineWidth = border
  ctx.strokeStyle = C.ink
  ctx.stroke()

  // brand row
  const b = L.brand
  drawBrandMark(ctx, b.x * u, b.y * u, b.mark * u)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = C.ink
  ctx.font = `800 ${b.size * u}px ${FONTS.en.display}`
  const brandX = (b.x + b.mark + 1.5) * u
  const brandY = (b.y + b.mark / 2 + 0.4) * u
  ctx.fillText(text.brand, brandX, brandY)
  const brandWidth = ctx.measureText(text.brand).width
  ctx.font = `700 ${b.size * 0.62 * u}px ${font.body}`
  ctx.fillText(text.presents, brandX + brandWidth + 1.6 * u, brandY + 0.4 * u)

  // title: yellow letters with a thick ink outline and a hard drop shadow
  const t = L.title
  ctx.save()
  ctx.translate(t.x * u, t.y * u)
  ctx.rotate((t.rotate * Math.PI) / 180)
  ctx.font = `800 ${t.size * u}px ${font.display}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = t.stroke * u * 2
  ctx.strokeStyle = C.ink
  ctx.fillStyle = C.ink
  ctx.fillText(text.title, 0, 1.2 * u) // the shadow
  ctx.strokeText(text.title, 0, 1.2 * u)
  ctx.strokeText(text.title, 0, 0)
  ctx.fillStyle = C.sun
  ctx.fillText(text.title, 0, 0)
  ctx.restore()

  // Math Hero
  const m = L.mascot
  const mh = m.h * u
  const mw = mh * MASCOT_ASPECT
  ctx.drawImage(mascot, m.x * u, H - m.bottom * u - mh, mw, mh)

  // speech bubble, sized to its words
  const bb = L.bubble
  ctx.font = `800 ${bb.size * u}px ${font.body}, ${EMOJI}`
  const lines = wrapLines(ctx, text.speech, (bb.w - bb.pad * 2) * u)
  const lineHeight = bb.size * bb.lineHeight * u
  const bx = bb.x * u
  const by = bb.y * u
  const bw = bb.w * u
  const bh = lines.length * lineHeight + bb.pad * 2 * u
  const tailY = by + bh * bb.tailAt
  ctx.lineJoin = 'round'
  ctx.lineWidth = bb.border * u * 2
  ctx.strokeStyle = C.ink
  ctx.fillStyle = C.white
  const bubble = new Path2D()
  bubble.roundRect(bx, by, bw, bh, bb.radius * u)
  const tail = new Path2D()
  tail.moveTo(bx + 0.5 * u, tailY - 3 * u)
  tail.lineTo(bx + bb.tailTip.dx * u, tailY + bb.tailTip.dy * u)
  tail.lineTo(bx + 0.5 * u, tailY + 3 * u)
  tail.closePath()
  ctx.save()
  ctx.translate(0, 1.2 * u) // hard drop shadow under the bubble
  ctx.fillStyle = C.ink
  ctx.fill(bubble)
  ctx.restore()
  ctx.stroke(bubble)
  ctx.stroke(tail)
  ctx.fill(bubble)
  ctx.fill(tail)
  ctx.fillStyle = C.ink
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  lines.forEach((line, i) => {
    ctx.fillText(line, bx + bb.pad * u, by + bb.pad * u + lineHeight * (i + 0.5))
  })

  // Where to go: a picture can't be clicked, so print the address and a QR code instead of a button.
  const f = L.pngFooter
  const fx = f.x * u
  const fy = f.y * u
  ctx.fillStyle = C.ink
  roundedRect(ctx, fx, fy + 1.2 * u, f.w * u, f.h * u, f.radius * u)
  ctx.fill() // hard drop shadow
  roundedRect(ctx, fx, fy, f.w * u, f.h * u, f.radius * u)
  ctx.fillStyle = C.white
  ctx.fill()
  ctx.lineWidth = border
  ctx.strokeStyle = C.ink
  ctx.stroke()

  const qrSize = f.qr * u
  const qrPad = (f.h - f.qr) / 2 * u
  const qrX = fx + f.w * u - qrPad - qrSize
  drawQrCode(ctx, qrX, fy + qrPad, qrSize)

  const textX = fx + 4 * u
  const textWidth = qrX - textX - 2 * u
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = C.ink
  ctx.font = `800 ${f.lead * u}px ${font.body}`
  ctx.fillText(text.pngLead, textX, fy + 5.6 * u, textWidth)
  ctx.fillStyle = C.berry
  ctx.font = `800 ${f.url * u}px ${FONTS.en.display}`
  ctx.fillText(siteLabel, textX, fy + 12.9 * u, textWidth)
  ctx.fillStyle = C.ink
  ctx.font = `700 ${f.scan * u}px ${font.body}`
  ctx.fillText(text.pngScan, textX, fy + 16.6 * u, textWidth)

  ctx.restore()

  // card outline, drawn last so nothing covers it
  roundedRect(ctx, border / 2, border / 2, W - border, H - border, L.radius * u - border / 2)
  ctx.lineWidth = border
  ctx.strokeStyle = C.ink
  ctx.stroke()

  return canvas
}

export async function renderAdCardBlob(options) {
  const canvas = await drawAdCard(options)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The picture could not be made.'))), 'image/png')
  })
}
