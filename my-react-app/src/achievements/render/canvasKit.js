/**
 * Small canvas helpers shared by the certificate and the share-image painters.
 * Everything is drawn from data (no screenshots of the page), so the result is the same on
 * every device and never picks up a cross-origin image that would block the download.
 */

export const FONT_DISPLAY = "'Baloo 2', 'Nunito', 'Trebuchet MS', system-ui, sans-serif"
export const FONT_BODY = "'Nunito', system-ui, -apple-system, 'Segoe UI', sans-serif"
export const FONT_SERIF = "Georgia, 'Times New Roman', serif"
export const FONT_SCRIPT = "'Segoe Script', 'Brush Script MT', 'Snell Roundhand', 'Apple Chancery', cursive"
export const FONT_MONO = "ui-monospace, 'Cascadia Mono', Consolas, 'Courier New', monospace"
export const FONT_EMOJI = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Twemoji Mozilla', sans-serif"

import { EMBLEMS } from '../emblems.js'

export const GOLD = { light: '#f8e08e', mid: '#d4a017', deep: '#a87b05', line: '#c9a227' }
export const NAVY = '#1b2a49'

/** Waits (briefly) for the web fonts the painters use, so the first paint isn't in a fallback font. */
export async function ensureFonts(timeoutMs = 2500) {
  if (typeof document === 'undefined' || !document.fonts?.load) return
  const wanted = ['800 40px "Baloo 2"', '700 40px "Baloo 2"', '400 20px "Nunito"', '700 20px "Nunito"', '800 20px "Nunito"']
  await Promise.race([
    Promise.allSettled(wanted.map((font) => document.fonts.load(font))),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ])
}

/** Loads an image; resolves null instead of failing (callers draw a fallback). */
export function loadImage(src, { crossOrigin = false, timeoutMs = 6000 } = {}) {
  return new Promise((resolve) => {
    if (!src) return resolve(null)
    const img = new Image()
    if (crossOrigin) img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    const timer = setTimeout(() => resolve(null), timeoutMs)
    img.onload = () => {
      clearTimeout(timer)
      resolve(img.naturalWidth > 0 || img.width > 0 ? img : null)
    }
    img.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }
    img.src = src
  })
}

export function createCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width)
  canvas.height = Math.round(height)
  return canvas
}

export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

/** Sets letter spacing where the browser supports it (Chrome, Edge, Firefox, Safari 17+). */
export function setTracking(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`
}

/** Largest font size (down to `min`) at which `text` fits in `maxWidth`. */
export function fitFont(ctx, text, maxWidth, size, min, makeFont) {
  let s = size
  ctx.font = makeFont(s)
  while (s > min && ctx.measureText(text).width > maxWidth) {
    s -= Math.max(1, s * 0.04)
    ctx.font = makeFont(s)
  }
  return s
}

/** Splits text into lines no wider than maxWidth; the last allowed line ends in '…' if cut. */
export function wrapLines(ctx, text, maxWidth, maxLines = 3) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next
    } else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    let last = kept[maxLines - 1]
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
    kept[maxLines - 1] = `${last.trimEnd()}…`
    return kept
  }
  return lines
}

/** Colours in a CSS gradient string ('linear-gradient(160deg, #bae6fd, #fef3c7)'), or [solid]. */
export function gradientColors(css, fallback = '#e2e8f0') {
  const found = String(css ?? '').match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi)
  return found?.length ? found : [fallback]
}

/** Fills a circle with an avatar background ('#hex' or a CSS gradient). */
export function fillAvatarBackground(ctx, css, cx, cy, r) {
  const colors = gradientColors(css)
  if (colors.length === 1) {
    ctx.fillStyle = colors[0]
  } else {
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
    colors.forEach((color, i) => g.addColorStop(i / (colors.length - 1), color))
    ctx.fillStyle = g
  }
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * Draws a prepared avatar (see avatarArt.jsx) in a circle with a gold ring.
 * `art` = { bg, image, cover, letter }.
 */
export function drawAvatar(ctx, art, cx, cy, r, { ring = r * 0.09, ringColor = GOLD.line, shadow = true } = {}) {
  ctx.save()
  if (shadow) {
    ctx.shadowColor = 'rgb(27 42 73 / 22%)'
    ctx.shadowBlur = r * 0.35
    ctx.shadowOffsetY = r * 0.08
  }
  // gold ring
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  g.addColorStop(0, GOLD.light)
  g.addColorStop(0.5, ringColor)
  g.addColorStop(1, GOLD.deep)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, r + ring, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  fillAvatarBackground(ctx, art?.bg ?? '#a855f7', cx, cy, r)
  if (art?.image) {
    const img = art.image
    const iw = img.naturalWidth || img.width
    const ih = img.naturalHeight || img.height
    // photos fill the circle; character art sits inside it with a little room
    const scale = art.cover ? Math.max((2 * r) / iw, (2 * r) / ih) : Math.min((2 * r) / iw, (2 * r) / ih) * (art.inset ?? 1)
    const w = iw * scale
    const h = ih * scale
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h)
  } else {
    ctx.fillStyle = '#ffffff'
    ctx.font = `800 ${r * 1.1}px ${FONT_DISPLAY}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(art?.letter || '★', cx, cy + r * 0.06)
  }
  ctx.restore()

  // thin inner highlight
  ctx.save()
  ctx.strokeStyle = 'rgb(255 255 255 / 70%)'
  ctx.lineWidth = Math.max(1, r * 0.025)
  ctx.beginPath()
  ctx.arc(cx, cy, r - ctx.lineWidth / 2, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

const RIBBONS = {
  level: ['#7c3aed', '#5b21b6'],
  skill: ['#0891b2', '#0e7490'],
  mastery: ['#b91c1c', '#1e3a8a'],
}

/**
 * Draws a vector emblem (../emblems.js) centred at (cx, cy), `size` px across its 100-unit box,
 * with a soft embossed highlight so it reads as stamped into the gold.
 */
export function drawEmblem(ctx, emblemId, cx, cy, size) {
  const emblem = EMBLEMS[emblemId] ?? EMBLEMS.star
  const s = size / 100
  const paint = (dx, dy, inkColor, lightColor) => {
    ctx.save()
    ctx.translate(cx - 50 * s + dx, cy - 50 * s + dy)
    ctx.scale(s, s)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const part of emblem.parts) {
      const path = new Path2D(part.d)
      const color = part.tone === 'light' ? lightColor : inkColor
      if (!color) continue
      if (part.mode === 'stroke') {
        ctx.strokeStyle = color
        ctx.lineWidth = part.width ?? 4
        ctx.stroke(path)
      } else {
        ctx.fillStyle = color
        ctx.fill(path)
      }
    }
    ctx.restore()
  }
  // highlight below-right, then the emblem itself in deep antique gold
  paint(size * 0.012, size * 0.016, 'rgb(255 248 214 / 85%)', null)
  const ink = ctx.createLinearGradient(cx, cy - size / 2, cx, cy + size / 2)
  ink.addColorStop(0, '#8a5d00')
  ink.addColorStop(1, '#5c3d00')
  paint(0, 0, ink, '#f7dc7a')
}

/**
 * The achievement medal: two ribbon tails, a gold star-burst rosette, and the badge's own icon
 * in the middle. Ribbon colours follow the badge category, so every medal matches its card.
 * (cx, cy) is the centre of the disc; r its outer radius. Ribbons hang below.
 */
export function drawMedal(ctx, { icon, category, emblem }, cx, cy, r, { ribbons = true } = {}) {
  const [left, right] = RIBBONS[category] ?? RIBBONS.mastery
  ctx.save()
  if (ribbons) {
    const tail = (dir, color) => {
      ctx.fillStyle = color
      ctx.beginPath()
      const x0 = cx + dir * r * 0.28
      ctx.moveTo(x0 - r * 0.26, cy + r * 0.3)
      ctx.lineTo(x0 + r * 0.26, cy + r * 0.3)
      ctx.lineTo(x0 + dir * r * 0.42 + r * 0.24, cy + r * 1.62)
      ctx.lineTo(x0 + dir * r * 0.42, cy + r * 1.42)
      ctx.lineTo(x0 + dir * r * 0.42 - r * 0.24, cy + r * 1.62)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgb(255 255 255 / 18%)'
      ctx.fillRect(x0 - r * 0.05, cy + r * 0.3, r * 0.1, r * 0.9)
    }
    tail(-1, left)
    tail(1, right)
  }

  // star-burst edge
  ctx.shadowColor = 'rgb(120 80 0 / 35%)'
  ctx.shadowBlur = r * 0.18
  ctx.shadowOffsetY = r * 0.05
  ctx.beginPath()
  const points = 48
  for (let i = 0; i < points; i += 1) {
    const a = (i / points) * Math.PI * 2
    const rr = i % 2 ? r * 0.87 : r
    const x = cx + rr * Math.sin(a)
    const y = cy - rr * Math.cos(a)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  const burst = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  burst.addColorStop(0, '#f6d365')
  burst.addColorStop(0.55, GOLD.mid)
  burst.addColorStop(1, GOLD.deep)
  ctx.fillStyle = burst
  ctx.fill()
  ctx.shadowColor = 'transparent'

  // disc
  const disc = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r * 0.8)
  disc.addColorStop(0, '#fff6c9')
  disc.addColorStop(0.6, '#f5d061')
  disc.addColorStop(1, '#d9a91c')
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.76, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = GOLD.deep
  ctx.lineWidth = r * 0.03
  ctx.stroke()
  ctx.setLineDash([r * 0.05, r * 0.05])
  ctx.lineWidth = r * 0.016
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.66, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  // a vector emblem for the achievement (certificate); otherwise the badge icon
  if (emblem) {
    drawEmblem(ctx, emblem, cx, cy + r * 0.02, r * 1.62)
    ctx.restore()
    return
  }
  ctx.font = `${r * 0.78}px ${FONT_EMOJI}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#7a5300'
  ctx.fillText(icon || '★', cx, cy + r * 0.06)
  ctx.restore()
}

/** Canvas → Blob (Promise). */
export function canvasToBlob(canvas, type = 'image/png', quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not make the image'))), type, quality)
  })
}
