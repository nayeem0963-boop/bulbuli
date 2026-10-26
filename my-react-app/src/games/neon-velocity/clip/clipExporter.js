import { encodeGif } from './gifEncoder'

/*
 * Turns a recorded highlight into shareable files.
 *
 *   exportGif(h)       → image/gif   (looping, ~320 px, encoded in a Web Worker)
 *   exportVideo(h)     → video/webm or video/mp4 (MediaRecorder, real-time ≈ 3 s)
 *   exportSnapshot(h)  → image/png   (full-res still of the peak moment)
 *   shareOrDownload()  → native share sheet when files can be shared, else a download
 *
 * Every export gets the same branded overlay (title, speed, score).
 */

const FONT = '"Chakra Petch", system-ui, sans-serif'

/** Branded HUD burned into exported frames. */
export function drawOverlay(ctx, width, height, meta = {}) {
  const s = width / 640 // scale relative to a 640-px-wide reference
  ctx.save()
  // bottom gradient for legibility
  const g = ctx.createLinearGradient(0, height * 0.7, 0, height)
  g.addColorStop(0, 'rgba(7,2,15,0)')
  g.addColorStop(1, 'rgba(7,2,15,0.75)')
  ctx.fillStyle = g
  ctx.fillRect(0, height * 0.7, width, height * 0.3)

  ctx.textBaseline = 'alphabetic'
  ctx.shadowColor = '#ff2bd6'
  ctx.shadowBlur = 12 * s
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 ${Math.round(22 * s)}px ${FONT}`
  ctx.fillText('BULBULI', 16 * s, height - 34 * s)
  ctx.shadowBlur = 0
  ctx.fillStyle = '#22f3ff'
  ctx.font = `600 ${Math.round(11 * s)}px ${FONT}`
  ctx.fillText('N E O N   V E L O C I T Y', 16 * s, height - 16 * s)

  if (meta.speedKmh) {
    ctx.textAlign = 'right'
    ctx.fillStyle = meta.surge ? '#ffd23f' : '#ffffff'
    ctx.shadowColor = meta.surge ? '#ffd23f' : '#22f3ff'
    ctx.shadowBlur = 10 * s
    ctx.font = `700 ${Math.round(30 * s)}px ${FONT}`
    ctx.fillText(`${meta.speedKmh}`, width - 70 * s, height - 18 * s)
    ctx.shadowBlur = 0
    ctx.font = `600 ${Math.round(12 * s)}px ${FONT}`
    ctx.fillStyle = '#a99bd0'
    ctx.fillText('KM/H', width - 16 * s, height - 20 * s)
    if (meta.surge) {
      ctx.fillStyle = '#ffd23f'
      ctx.fillText('NEON SURGE', width - 16 * s, height - 52 * s)
    }
  }
  if (meta.score != null) {
    ctx.textAlign = 'right'
    ctx.fillStyle = '#ffffff'
    ctx.font = `600 ${Math.round(12 * s)}px ${FONT}`
    ctx.fillText(`SCORE ${meta.score}`, width - 16 * s, 24 * s)
  }
  ctx.restore()
}

function makeCanvas(width, height) {
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  return c
}

function fitSize(highlight, width) {
  const w = Math.min(width, highlight.width * 2)
  return { w: Math.round(w / 2) * 2, h: Math.round((w * highlight.height) / highlight.width / 2) * 2 }
}

// ─── GIF ─────────────────────────────────────────────────────────

export async function exportGif(highlight, { width = 320, onProgress } = {}) {
  const { w, h } = fitSize(highlight, width)
  const canvas = makeCanvas(w, h)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const frames = highlight.frames.map((frame, i) => {
    ctx.drawImage(frame, 0, 0, w, h)
    drawOverlay(ctx, w, h, highlight.meta)
    onProgress?.(0.3 * (i + 1) / highlight.frames.length)
    return ctx.getImageData(0, 0, w, h).data.buffer
  })
  const delayCs = Math.round(100 / highlight.fps)
  const bytes = await encodeInWorker(frames, w, h, delayCs).catch(() =>
    // Workers unavailable (or blocked) → encode on the main thread
    encodeGif(frames.map((b) => new Uint8ClampedArray(b)), w, h, { delayCs }))
  onProgress?.(1)
  return new Blob([bytes], { type: 'image/gif' })
}

function encodeInWorker(frames, width, height, delayCs) {
  return new Promise((resolve, reject) => {
    let worker
    try {
      worker = new Worker(new URL('./gif.worker.js', import.meta.url), { type: 'module' })
    } catch (e) {
      reject(e)
      return
    }
    worker.onmessage = ({ data }) => {
      worker.terminate()
      if (data.ok) resolve(data.bytes)
      else reject(new Error(data.error))
    }
    worker.onerror = (e) => { worker.terminate(); reject(e) }
    // copy (no transfer list) so the main-thread fallback still has the pixels if the worker fails
    worker.postMessage({ frames, width, height, delayCs })
  })
}

// ─── Video ───────────────────────────────────────────────────────

export function videoSupport() {
  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) return null
  const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4;codecs=avc1', 'video/mp4']
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? null
}

export function exportVideo(highlight, { width = 640, loops = 1, onProgress } = {}) {
  const mimeType = videoSupport()
  if (!mimeType) return Promise.reject(new Error('Video recording is not supported in this browser'))
  const { w, h } = fitSize(highlight, width)
  const canvas = makeCanvas(w, h)
  const ctx = canvas.getContext('2d')
  const { frames, fps } = highlight
  const draw = (i) => {
    ctx.drawImage(frames[i % frames.length], 0, 0, w, h)
    drawOverlay(ctx, w, h, highlight.meta)
  }
  draw(0)

  return new Promise((resolve, reject) => {
    const stream = canvas.captureStream(fps)
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 })
    const chunks = []
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    recorder.onerror = (e) => reject(e.error ?? new Error('Recording failed'))
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      resolve(new Blob(chunks, { type: mimeType.split(';')[0] }))
    }
    recorder.start()
    const total = frames.length * loops
    let i = 0
    const start = performance.now()
    const tick = () => {
      draw(i)
      onProgress?.((i + 1) / total)
      i++
      if (i >= total) { setTimeout(() => recorder.stop(), 1000 / fps); return }
      // schedule against wall-clock so timing doesn't drift
      setTimeout(tick, Math.max(0, start + (i * 1000) / fps - performance.now()))
    }
    tick()
  })
}

// ─── Snapshot ────────────────────────────────────────────────────

export function exportSnapshot(highlight) {
  const src = highlight.snapshot ?? highlight.frames[Math.floor(highlight.frames.length / 2)]
  const canvas = makeCanvas(src.width, src.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(src, 0, 0)
  drawOverlay(ctx, canvas.width, canvas.height, highlight.meta)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Snapshot failed'))), 'image/png')
  })
}

// ─── Share / download ────────────────────────────────────────────

/** → 'shared' | 'downloaded' | 'cancelled' */
export async function shareOrDownload(blob, filename, { title = 'Bulbuli: Neon Velocity', text } = {}) {
  const file = typeof File !== 'undefined' ? new File([blob], filename, { type: blob.type }) : null
  if (file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text })
      return 'shared'
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled'
      // fall through to download on other errors
    }
  }
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}

export const clipFilename = (ext, score) =>
  `bulbuli-${score ?? 'run'}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${ext}`
