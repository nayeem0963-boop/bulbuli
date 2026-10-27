// The animated Math Hero GIF: the message appears word by word while Math Hero bobs,
// the bubble glows and the sound bars bounce, then the finished card rests before looping.
// Frames are painted by the same painter as the still picture, so the QR code and address
// at the bottom are in every frame.

import { createAdPainter } from './renderAdCard.js'
import { buildPalette, indexPixels, lzwEncode, writeGif } from './gifEncoder.js'
import { gifTimeline } from './gifTimeline.js'

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Makes the animated GIF Blob. `onProgress(0..1)` reports progress.
 * width 600 keeps the file small enough to send in chat apps while the QR code still scans.
 */
export async function renderAdGif({ language = 'en', width = 600, siteLabel = 'bulbuli.org', link, onProgress } = {}) {
  const painter = await createAdPainter({ language, width, siteLabel })
  const canvas = document.createElement('canvas')
  canvas.width = painter.width
  canvas.height = painter.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const timeline = gifTimeline(painter.wordCount)

  const grab = (settings) => {
    painter.paint(ctx, settings)
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data
  }

  // One palette for the whole animation, from a resting frame and a glowing, talking frame.
  const palette = buildPalette([grab({}), grab(timeline[Math.floor(timeline.length / 2)].paint)])
  onProgress?.(0.1)

  const frames = []
  let previous = null
  for (let i = 0; i < timeline.length; i += 1) {
    const indexes = indexPixels(grab(timeline[i].paint), palette)
    // A frame identical to the one before just makes the previous frame last longer.
    if (previous && indexes.length === previous.indexes.length && indexes.every((v, j) => v === previous.indexes[j])) {
      previous.delay += timeline[i].delay
    } else {
      previous = { indexes, delay: timeline[i].delay }
      frames.push(previous)
    }
    onProgress?.(0.1 + 0.8 * ((i + 1) / timeline.length))
    await nextTick() // let the page breathe, so the progress message updates
  }

  for (const frame of frames) {
    frame.lzw = lzwEncode(frame.indexes, 8)
    frame.indexes = null
    await nextTick()
  }
  const bytes = writeGif({
    width: canvas.width,
    height: canvas.height,
    palette: palette.palette,
    transparentIndex: palette.transparentIndex,
    frames,
    comment: link ? `Math Hero on Pro Coder - play free at ${link}` : undefined,
  })
  onProgress?.(1)
  return new Blob([bytes], { type: 'image/gif' })
}
