/**
 * The colourful 1200 × 1200 achievement picture for sharing (separate from the formal A4
 * certificate). Only what the player's privacy setting allows goes on it: the public form of
 * their name (or none), and their avatar only when mayShareAvatar() says so.
 *
 *   const canvas = await paintShareImage({ sheet, avatarArt, publicName, message, link })
 */
import { displayUrl, SITE_LABEL } from '../links.js'
import { drawQr, qrMatrix } from '../qr.js'
import {
  createCanvas, drawAvatar, drawMedal, ensureFonts, fitFont, FONT_BODY, FONT_DISPLAY, loadImage,
  NAVY, roundRect, setTracking, wrapLines,
} from './canvasKit.js'

export const SHARE_SIZE = 1200

// a fixed sprinkle of confetti (same picture every time)
function confetti(ctx, size) {
  const colors = ['#fde047', '#f472b6', '#34d399', '#ffffff', '#fb923c', '#a5f3fc']
  let seed = 7
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (let i = 0; i < 70; i += 1) {
    const x = rand() * size
    const y = 150 + rand() * size * 0.5 // below the brand bar, above the text
    const w = 8 + rand() * 14
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rand() * Math.PI)
    ctx.globalAlpha = 0.55 + rand() * 0.4
    ctx.fillStyle = colors[i % colors.length]
    if (i % 3 === 0) {
      ctx.beginPath()
      ctx.arc(0, 0, w / 2.4, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.fillRect(-w / 2, -w / 6, w, w / 3)
    }
    ctx.restore()
  }
}

export async function paintShareImage({ sheet, avatarArt = null, publicName = '', message = '', link = '' }) {
  await ensureFonts()
  const S = SHARE_SIZE
  const canvas = createCanvas(S, S)
  const ctx = canvas.getContext('2d')
  const brand = await loadImage('/favicon.svg')

  /* ---------- sky ---------- */
  const sky = ctx.createLinearGradient(0, 0, S * 0.4, S)
  sky.addColorStop(0, '#38bdf8')
  sky.addColorStop(0.55, '#6366f1')
  sky.addColorStop(1, '#7c3aed')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, S, S)

  // sun rays behind the medal
  const mx = S / 2
  const my = 410
  ctx.save()
  ctx.translate(mx, my)
  ctx.fillStyle = 'rgb(255 255 255 / 9%)'
  for (let i = 0; i < 18; i += 1) {
    ctx.rotate((Math.PI * 2) / 18)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-60, -S)
    ctx.lineTo(60, -S)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  const glow = ctx.createRadialGradient(mx, my, 40, mx, my, 330)
  glow.addColorStop(0, 'rgb(255 247 200 / 55%)')
  glow.addColorStop(1, 'rgb(255 247 200 / 0%)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, S, S)
  confetti(ctx, S)

  /* ---------- brand (top left) and site (top right) ---------- */
  ctx.font = `800 40px ${FONT_DISPLAY}`
  const brandW = 64 + 14 + ctx.measureText('Bulbuli').width + 36
  roundRect(ctx, 48, 44, brandW, 84, 42)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  if (brand) ctx.drawImage(brand, 66, 54, 64, 64)
  ctx.fillStyle = NAVY
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('Bulbuli', 66 + 64 + 14, 88)
  ctx.fillStyle = 'rgb(255 255 255 / 92%)'
  ctx.font = `800 30px ${FONT_BODY}`
  ctx.textAlign = 'right'
  ctx.fillText(SITE_LABEL, S - 56, 88)

  /* ---------- eyebrow ---------- */
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#fef9c3'
  ctx.font = `800 40px ${FONT_BODY}`
  setTracking(ctx, 5)
  ctx.fillText('ACHIEVEMENT UNLOCKED!', mx + 2.5, 205)
  setTracking(ctx, 0)

  /* ---------- medal ---------- */
  drawMedal(ctx, { icon: sheet.badgeIcon, category: sheet.category }, mx, my, 158)

  /* ---------- who ---------- */
  const who = publicName ? `${publicName} earned` : 'I earned'
  ctx.font = `800 46px ${FONT_BODY}`
  const r = 40
  const whoSize = fitFont(ctx, who, avatarArt ? 860 : 980, 46, 28, (s) => `800 ${s}px ${FONT_BODY}`)
  const whoW = ctx.measureText(who).width
  const groupW = (avatarArt ? 2 * r + 22 : 0) + whoW
  let x = mx - groupW / 2
  const rowY = 735
  if (avatarArt) {
    drawAvatar(ctx, avatarArt, x + r, rowY, r, { ring: 5 })
    x += 2 * r + 22
  }
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = `800 ${whoSize}px ${FONT_BODY}`
  ctx.fillText(who, x, rowY + 2)

  /* ---------- the achievement ---------- */
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.save()
  ctx.shadowColor = 'rgb(30 27 75 / 45%)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 6
  ctx.fillStyle = '#ffffff'
  fitFont(ctx, sheet.badgeTitle, 1060, 96, 52, (s) => `800 ${s}px ${FONT_DISPLAY}`)
  ctx.fillText(sheet.badgeTitle, mx, 850)
  ctx.restore()

  // XP pill
  {
    const text = `${sheet.xpEarned.toLocaleString('en')} ${sheet.xpLabel}`
    ctx.font = `800 36px ${FONT_BODY}`
    const w = ctx.measureText(text).width + 104
    roundRect(ctx, mx - w / 2, 878, w, 66, 33)
    ctx.fillStyle = '#fef3c7'
    ctx.fill()
    ctx.fillStyle = '#d4a017'
    ctx.beginPath()
    const sx = mx - w / 2 + 44
    const sy = 911
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2
      const rr = i % 2 ? 9 : 20
      if (i === 0) ctx.moveTo(sx + rr * Math.sin(a), sy - rr * Math.cos(a))
      else ctx.lineTo(sx + rr * Math.sin(a), sy - rr * Math.cos(a))
    }
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = NAVY
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, sx + 32, sy + 2)
  }

  // motivational message
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = 'rgb(255 255 255 / 95%)'
  ctx.font = `700 34px ${FONT_BODY}`
  wrapLines(ctx, message, 980, 2).forEach((line, i) => ctx.fillText(line, mx, 990 + i * 42))

  /* ---------- footer card: link + QR ---------- */
  {
    const top = 1048
    const h = 130
    roundRect(ctx, 48, top, S - 96, h, 28)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    const hasQr = Boolean(link) && /\/certificate\//.test(link)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = NAVY
    ctx.font = `800 32px ${FONT_BODY}`
    ctx.fillText(hasQr ? 'Verified by Bulbuli' : 'Learn through games on Bulbuli', 84, top + 54)
    ctx.fillStyle = '#6d28d9'
    ctx.font = `700 25px ${FONT_BODY}`
    const shown = displayUrl(link || 'https://bulbuli.org')
    fitFont(ctx, shown, hasQr ? 860 : 1000, 25, 16, (s) => `700 ${s}px ${FONT_BODY}`)
    ctx.fillText(shown, 84, top + 94)
    // ≈3 px per module: big enough for phone cameras to scan from the picture
    if (hasQr) drawQr(ctx, qrMatrix(link), S - 48 - 8 - 116, top + 7, 116, NAVY)
  }

  return canvas
}
