/**
 * Paints the A4 landscape certificate onto a canvas, from a sheet (see ../sheet.js) and a
 * prepared avatar (avatarArt.jsx). The same painting is the on-screen preview, the downloaded
 * PDF and the print-out, so they always match.
 *
 *   const { canvas, links, qr } = await paintCertificate({ sheet, avatarArt, width: 3508 })
 *
 * Layout is in millimetres on a 297 × 210 mm sheet (u = pixels per mm), so it scales to any
 * width: 3508 px ≈ 300 dpi for print, smaller for the preview.
 * `links` are the clickable areas (pixel rects) for the PDF; `qr` is the code's matrix and rect,
 * which the PDF redraws as vector squares so it stays razor sharp in print.
 */
import { qrMatrix, drawQr } from '../qr.js'
import { displayUrl, SITE_LABEL, SITE_URL } from '../links.js'
import {
  createCanvas, drawAvatar, drawMedal, ensureFonts, fitFont, FONT_BODY, FONT_DISPLAY, FONT_MONO,
  FONT_SCRIPT, FONT_SERIF, GOLD, loadImage, NAVY, roundRect, setTracking, wrapLines,
} from './canvasKit.js'

export const SHEET_MM = { w: 297, h: 210 }

let brandPromise = null
const loadBrand = () => (brandPromise ??= loadImage('/favicon.svg'))

function guillochePattern(ctx, size) {
  const tile = createCanvas(size, size)
  const t = tile.getContext('2d')
  t.fillStyle = '#fbf5e3'
  t.fillRect(0, 0, size, size)
  t.lineWidth = Math.max(1, size * 0.045)
  const wave = (color, dy, flip) => {
    t.strokeStyle = color
    t.beginPath()
    for (let x = 0; x <= size; x += size / 24) {
      const y = size / 2 + dy + Math.sin((x / size) * Math.PI * 2) * size * 0.28 * (flip ? -1 : 1)
      if (x === 0) t.moveTo(x, y)
      else t.lineTo(x, y)
    }
    t.stroke()
  }
  wave('rgb(30 58 138 / 55%)', 0, false)
  wave('rgb(184 134 11 / 75%)', 0, true)
  return ctx.createPattern(tile, 'repeat')
}

function drawFrame(ctx, u) {
  const W = SHEET_MM.w * u
  const H = SHEET_MM.h * u
  // guilloche band
  const outer = 5.6 * u
  const inner = 11.4 * u
  ctx.save()
  ctx.beginPath()
  ctx.rect(outer, outer, W - 2 * outer, H - 2 * outer)
  ctx.rect(inner, inner, W - 2 * inner, H - 2 * inner)
  ctx.fillStyle = guillochePattern(ctx, Math.round(5.8 * u))
  ctx.fill('evenodd')
  ctx.restore()

  const rule = (inset, width, color) => {
    ctx.strokeStyle = color
    ctx.lineWidth = width * u
    ctx.strokeRect(inset * u, inset * u, W - 2 * inset * u, H - 2 * inset * u)
  }
  rule(4.6, 1.3, NAVY)
  rule(5.9, 0.25, NAVY)
  rule(11.4, 0.85, GOLD.line)
  rule(13, 0.3, GOLD.line)

  // corner rosettes
  for (const [mx, my] of [[11.4, 11.4], [SHEET_MM.w - 11.4, 11.4], [11.4, SHEET_MM.h - 11.4], [SHEET_MM.w - 11.4, SHEET_MM.h - 11.4]]) {
    const cx = mx * u
    const cy = my * u
    ctx.fillStyle = '#fffdf6'
    ctx.strokeStyle = GOLD.line
    ctx.lineWidth = 0.6 * u
    ctx.beginPath()
    ctx.arc(cx, cy, 4.8 * u, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = NAVY
    ctx.lineWidth = 0.3 * u
    ctx.beginPath()
    ctx.arc(cx, cy, 3.3 * u, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = GOLD.mid
    ctx.beginPath()
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2
      const r = (i % 2 ? 0.9 : 2.5) * u
      const x = cx + r * Math.sin(a)
      const y = cy - r * Math.cos(a)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
  }
}

function centered(ctx, text, x, y) {
  ctx.textAlign = 'center'
  ctx.fillText(text, x, y)
}

export async function paintCertificate({ sheet, avatarArt, width = 3508 }) {
  await ensureFonts()
  const brand = await loadBrand()
  const u = width / SHEET_MM.w
  const W = width
  const H = Math.round(SHEET_MM.h * u)
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')
  const cx = W / 2
  const links = []
  ctx.textBaseline = 'alphabetic'

  /* ---------- paper ---------- */
  ctx.fillStyle = '#fffdf6'
  ctx.fillRect(0, 0, W, H)
  const vignette = ctx.createRadialGradient(cx, H * 0.45, H * 0.25, cx, H * 0.5, W * 0.62)
  vignette.addColorStop(0, 'rgb(255 255 255 / 0%)')
  vignette.addColorStop(1, 'rgb(201 162 39 / 13%)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, W, H)
  drawFrame(ctx, u)

  /* ---------- watermark: the Bulbuli bird, very faint ---------- */
  if (brand) {
    ctx.save()
    ctx.globalAlpha = 0.035
    const size = 92 * u
    ctx.drawImage(brand, cx - size / 2, 110 * u - size / 2, size, size)
    ctx.restore()
  }

  /* ---------- brand ---------- */
  {
    const logo = 13 * u
    ctx.font = `800 ${9 * u}px ${FONT_DISPLAY}`
    const nameW = ctx.measureText('Bulbuli').width
    ctx.font = `800 ${2.5 * u}px ${FONT_BODY}`
    setTracking(ctx, 0.5 * u)
    const tagW = ctx.measureText('LEARNING GAMES FOR KIDS').width
    setTracking(ctx, 0)
    const textW = Math.max(nameW, tagW)
    const groupW = logo + 3 * u + textW
    const left = cx - groupW / 2
    if (brand) ctx.drawImage(brand, left, 18.5 * u, logo, logo)
    ctx.textAlign = 'left'
    ctx.fillStyle = NAVY
    ctx.font = `800 ${9 * u}px ${FONT_DISPLAY}`
    ctx.fillText('Bulbuli', left + logo + 3 * u, 27.6 * u)
    ctx.fillStyle = '#64748b'
    ctx.font = `800 ${2.5 * u}px ${FONT_BODY}`
    setTracking(ctx, 0.5 * u)
    ctx.fillText('LEARNING GAMES FOR KIDS', left + logo + 3 * u, 31.4 * u)
    setTracking(ctx, 0)
  }

  /* ---------- heading ---------- */
  ctx.fillStyle = '#1e3a8a'
  setTracking(ctx, 1.1 * u)
  fitFont(ctx, 'CERTIFICATE OF ACHIEVEMENT', 225 * u, 9.6 * u, 6 * u, (s) => `700 ${s}px ${FONT_SERIF}`)
  centered(ctx, 'CERTIFICATE OF ACHIEVEMENT', cx + 0.55 * u, 48.5 * u)
  setTracking(ctx, 0)

  // ornament: rule · diamond · rule
  ctx.strokeStyle = GOLD.line
  ctx.lineWidth = 0.45 * u
  ctx.beginPath()
  ctx.moveTo(cx - 40 * u, 54 * u)
  ctx.lineTo(cx - 4 * u, 54 * u)
  ctx.moveTo(cx + 4 * u, 54 * u)
  ctx.lineTo(cx + 40 * u, 54 * u)
  ctx.stroke()
  ctx.fillStyle = GOLD.mid
  ctx.beginPath()
  ctx.moveTo(cx, 51.8 * u)
  ctx.lineTo(cx + 2.4 * u, 54 * u)
  ctx.lineTo(cx, 56.2 * u)
  ctx.lineTo(cx - 2.4 * u, 54 * u)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#475569'
  ctx.font = `italic ${4.3 * u}px ${FONT_SERIF}`
  centered(ctx, 'This certificate is proudly presented to', cx, 63.5 * u)

  /* ---------- avatar + name (the name is the star) ---------- */
  {
    const r = 9.6 * u
    const ring = 0.9 * u
    const gap = 5 * u
    const nameSize = fitFont(ctx, sheet.studentName, 190 * u - 2 * (r + ring) - gap, 15 * u, 7 * u, (s) => `800 ${s}px ${FONT_DISPLAY}`)
    const nameW = ctx.measureText(sheet.studentName).width
    const groupW = 2 * (r + ring) + gap + nameW
    const left = cx - groupW / 2
    const midY = 78 * u
    drawAvatar(ctx, avatarArt, left + r + ring, midY, r, { ring })
    ctx.fillStyle = NAVY
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.font = `800 ${nameSize}px ${FONT_DISPLAY}`
    ctx.fillText(sheet.studentName, left + 2 * (r + ring) + gap, midY + nameSize * 0.06)
    ctx.textBaseline = 'alphabetic'

    const lineW = Math.max(groupW + 16 * u, 120 * u)
    const lineGrad = ctx.createLinearGradient(cx - lineW / 2, 0, cx + lineW / 2, 0)
    lineGrad.addColorStop(0, 'rgb(201 162 39 / 0%)')
    lineGrad.addColorStop(0.15, GOLD.line)
    lineGrad.addColorStop(0.85, GOLD.line)
    lineGrad.addColorStop(1, 'rgb(201 162 39 / 0%)')
    ctx.fillStyle = lineGrad
    ctx.fillRect(cx - lineW / 2, 90.6 * u, lineW, 0.55 * u)
  }

  ctx.fillStyle = '#475569'
  ctx.font = `italic ${4.1 * u}px ${FONT_SERIF}`
  centered(ctx, 'for earning the achievement', cx, 99 * u)

  /* ---------- achievement ---------- */
  ctx.fillStyle = '#6d28d9'
  fitFont(ctx, sheet.badgeTitle, 200 * u, 9.6 * u, 6 * u, (s) => `800 ${s}px ${FONT_DISPLAY}`)
  centered(ctx, sheet.badgeTitle, cx, 110.5 * u)

  ctx.fillStyle = '#475569'
  ctx.font = `600 ${4.1 * u}px ${FONT_BODY}`
  const descLines = wrapLines(ctx, sheet.badgeDescription, 185 * u, 2)
  descLines.forEach((line, i) => centered(ctx, line, cx, (118.4 + i * 5.4) * u))

  // XP pill
  {
    const xpText = `${sheet.xpEarned.toLocaleString('en')} ${sheet.xpLabel}`
    const top = (118.4 + Math.max(0, descLines.length - 1) * 5.4 + 4.6) * u
    ctx.font = `800 ${3.7 * u}px ${FONT_BODY}`
    const label = 'XP EARNED'
    ctx.save()
    ctx.font = `800 ${2.4 * u}px ${FONT_BODY}`
    setTracking(ctx, 0.4 * u)
    const labelW = ctx.measureText(label).width
    ctx.restore()
    ctx.font = `800 ${3.7 * u}px ${FONT_BODY}`
    const textW = ctx.measureText(xpText).width
    const pillW = labelW + textW + 15 * u
    const pillH = 7.6 * u
    const left = cx - pillW / 2
    roundRect(ctx, left, top, pillW, pillH, pillH / 2)
    ctx.fillStyle = '#fdf3d0'
    ctx.fill()
    ctx.strokeStyle = GOLD.line
    ctx.lineWidth = 0.35 * u
    ctx.stroke()
    // star
    ctx.fillStyle = GOLD.mid
    ctx.beginPath()
    const sx = left + 4.6 * u
    const sy = top + pillH / 2
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2
      const rr = (i % 2 ? 0.85 : 2) * u
      const x = sx + rr * Math.sin(a)
      const y = sy - rr * Math.cos(a)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#92670a'
    ctx.font = `800 ${2.4 * u}px ${FONT_BODY}`
    setTracking(ctx, 0.4 * u)
    ctx.fillText(label, left + 8 * u, sy + 0.15 * u)
    setTracking(ctx, 0)
    ctx.fillStyle = NAVY
    ctx.font = `800 ${3.7 * u}px ${FONT_BODY}`
    ctx.fillText(xpText, left + 8 * u + labelW + 2.6 * u, sy + 0.2 * u)
    ctx.textBaseline = 'alphabetic'
  }

  /* ---------- footer: date · medal · signature ---------- */
  const footerColumn = (xMm, value, label, valueFont, valueColor) => {
    const x = xMm * u
    ctx.fillStyle = valueColor
    ctx.font = valueFont
    centered(ctx, value, x, 164.5 * u)
    ctx.fillStyle = NAVY
    ctx.fillRect(x - 24 * u, 168 * u, 48 * u, 0.3 * u)
    ctx.fillStyle = '#64748b'
    ctx.font = `800 ${2.4 * u}px ${FONT_BODY}`
    setTracking(ctx, 0.45 * u)
    centered(ctx, label, x, 172.6 * u)
    setTracking(ctx, 0)
  }
  footerColumn(95, sheet.awardedLabel || '—', 'DATE AWARDED', `800 ${4.4 * u}px ${FONT_BODY}`, NAVY)
  footerColumn(202, 'Bulbuli Team', 'BULBULI LEARNING TEAM', `400 ${6.6 * u}px ${FONT_SCRIPT}`, '#1e3a8a')
  drawMedal(ctx, { icon: sheet.badgeIcon, category: sheet.category, emblem: sheet.emblem || 'star' }, cx, 157 * u, 13.5 * u)

  /* ---------- verification: QR (left), certificate ID (right), link (bottom) ---------- */
  let qr = null
  if (sheet.verifyUrl) {
    const matrix = qrMatrix(sheet.verifyUrl)
    const size = 24 * u
    const rect = { x: 22.5 * u, y: 151.5 * u, w: size, h: size }
    roundRect(ctx, rect.x - 0.8 * u, rect.y - 0.8 * u, size + 1.6 * u, size + 1.6 * u, 1.4 * u)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = GOLD.line
    ctx.lineWidth = 0.35 * u
    ctx.stroke()
    drawQr(ctx, matrix, rect.x, rect.y, size, NAVY)
    qr = { matrix, rect }
    links.push({ rect, url: sheet.verifyUrl })
    ctx.fillStyle = NAVY
    ctx.font = `800 ${2.5 * u}px ${FONT_BODY}`
    centered(ctx, 'Scan to verify', rect.x + size / 2, 180.6 * u)
    ctx.fillStyle = '#64748b'
    ctx.font = `700 ${2.3 * u}px ${FONT_BODY}`
    centered(ctx, 'this certificate', rect.x + size / 2, 183.8 * u)
  } else {
    const x = 22.5 * u
    const y = 153 * u
    const w = 26 * u
    const h = 22 * u
    ctx.save()
    ctx.setLineDash([1 * u, 0.8 * u])
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 0.35 * u
    roundRect(ctx, x, y, w, h, 1.6 * u)
    ctx.stroke()
    ctx.restore()
    ctx.fillStyle = '#64748b'
    ctx.font = `700 ${2.3 * u}px ${FONT_BODY}`
    ;['Online', 'verification', 'not yet', 'available'].forEach((line, i) => centered(ctx, line, x + w / 2, y + (6 + i * 3.6) * u))
  }

  {
    const x = 257 * u
    ctx.fillStyle = '#64748b'
    ctx.font = `800 ${2.4 * u}px ${FONT_BODY}`
    setTracking(ctx, 0.45 * u)
    centered(ctx, 'CERTIFICATE ID', x, 158.5 * u)
    setTracking(ctx, 0)
    ctx.fillStyle = NAVY
    fitFont(ctx, sheet.code || 'Not registered', 34 * u, 4 * u, 2.6 * u, (s) => `700 ${s}px ${FONT_MONO}`)
    centered(ctx, sheet.code || 'Not registered', x, 165 * u)
    ctx.fillStyle = '#64748b'
    ctx.font = `700 ${2.5 * u}px ${FONT_BODY}`
    centered(ctx, 'Issued by Bulbuli', x, 170.6 * u)
    ctx.fillStyle = '#6d28d9'
    ctx.font = `800 ${2.8 * u}px ${FONT_BODY}`
    centered(ctx, SITE_LABEL, x, 175 * u)
    const siteW = ctx.measureText(SITE_LABEL).width
    links.push({ rect: { x: x - siteW / 2, y: 172 * u, w: siteW, h: 4 * u }, url: SITE_URL })
  }

  {
    const prefix = sheet.verifyUrl ? 'Verify online: ' : ''
    const url = sheet.verifyUrl || SITE_URL
    const shown = displayUrl(url)
    ctx.font = `700 ${2.5 * u}px ${FONT_BODY}`
    const prefixW = ctx.measureText(prefix).width
    ctx.font = `600 ${2.5 * u}px ${FONT_MONO}`
    const urlW = ctx.measureText(shown).width
    const left = cx - (prefixW + urlW) / 2
    const y = 189.6 * u
    ctx.textAlign = 'left'
    ctx.fillStyle = '#64748b'
    ctx.font = `700 ${2.5 * u}px ${FONT_BODY}`
    ctx.fillText(prefix, left, y)
    ctx.fillStyle = '#1e3a8a'
    ctx.font = `600 ${2.5 * u}px ${FONT_MONO}`
    ctx.fillText(shown, left + prefixW, y)
    ctx.fillRect(left + prefixW, y + 0.6 * u, urlW, 0.18 * u)
    links.push({ rect: { x: left + prefixW - u, y: y - 3 * u, w: urlW + 2 * u, h: 4.4 * u }, url })
  }

  /* ---------- revoked: say so, loudly ---------- */
  if (sheet.revoked) {
    ctx.save()
    ctx.translate(cx, H / 2)
    ctx.rotate(-0.25)
    ctx.strokeStyle = 'rgb(185 28 28 / 75%)'
    ctx.lineWidth = 1.4 * u
    roundRect(ctx, -60 * u, -13 * u, 120 * u, 26 * u, 3 * u)
    ctx.stroke()
    ctx.fillStyle = 'rgb(185 28 28 / 75%)'
    ctx.font = `800 ${16 * u}px ${FONT_BODY}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('REVOKED', 0, 0)
    ctx.restore()
  }

  return { canvas, links, qr }
}
