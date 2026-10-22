// Records the talking Math Hero video: the animated card from the canvas painter plus the
// Bengali narration, mixed together with MediaRecorder.
//
// Why a narration file? The browser's own text-to-speech (window.speechSynthesis) plays straight
// to the speakers and no browser lets a page record it, so a video made from it would be silent.
// The narration is a normal audio file instead (public/audio/math-hero-ad-bn.mp3), which the page
// can mix into the video. Replace that file with a real recording to change the voice.

import { createAdPainter } from './renderAdCard.js'
import { AD_TEXT } from './adContent.js'
import { VIDEO_TIMING, videoFrameAt, videoLength, wordStartFractions } from './videoTimeline.js'

export const NARRATION_URL = { bn: '/audio/math-hero-ad-bn.mp3' }

// Real MP4 (H.264 video) first: Chrome 126+, Edge and Safari make it, and it plays everywhere,
// including iPhones, Windows and WhatsApp. A bare "video/mp4" is not trusted, because some
// browsers put VP9 inside it, which many phones and players can't open. Otherwise WebM.
const FORMATS = [
  { mimeType: 'video/mp4;codecs="avc1.42E01F,mp4a.40.2"', extension: 'mp4' },
  { mimeType: 'video/mp4;codecs=avc1,mp4a.40.2', extension: 'mp4' },
  { mimeType: 'video/mp4;codecs="avc1.42E01F,opus"', extension: 'mp4' },
  { mimeType: 'video/mp4;codecs=avc1', extension: 'mp4' },
  { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
  { mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' },
  { mimeType: 'video/webm', extension: 'webm' },
]

/** The best video format this browser can record, or null if it can't record video at all. */
export function pickVideoFormat() {
  if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement === 'undefined'
    || !HTMLCanvasElement.prototype.captureStream) return null
  return FORMATS.find((format) => MediaRecorder.isTypeSupported(format.mimeType)) ?? null
}

export class NarrationMissingError extends Error {}

/**
 * Records the video in real time (it takes as long as the video lasts).
 *
 * audioContext  create it inside the tap that starts recording (phones only allow sound then)
 * canvas        optional canvas to draw on, e.g. one shown on the page as a live preview
 * playAloud     also play the narration through the speakers while recording
 * onProgress    (secondsDone, secondsTotal)
 * signal        an AbortSignal to cancel
 * Resolves to { blob, extension, seconds }.
 */
export async function recordAdVideo({
  language = 'bn',
  width = 720,
  siteLabel = 'bulbuli.org',
  audioContext,
  canvas = document.createElement('canvas'),
  playAloud = true,
  onProgress,
  signal,
} = {}) {
  const format = pickVideoFormat()
  if (!format) throw new Error('This browser cannot record video.')
  const narrationUrl = NARRATION_URL[language]
  if (!narrationUrl) throw new NarrationMissingError(`No narration for "${language}".`)

  const response = await fetch(narrationUrl)
  if (!response.ok) throw new NarrationMissingError(`Narration not found at ${narrationUrl}.`)
  const voice = await audioContext.decodeAudioData(await response.arrayBuffer())

  const painter = await createAdPainter({ language, width, siteLabel })
  canvas.width = painter.width
  canvas.height = painter.height
  const ctx = canvas.getContext('2d')
  const speech = (AD_TEXT[language] ?? AD_TEXT.en).speech
  const plan = { voiceSeconds: voice.duration, wordStarts: wordStartFractions(speech) }
  const total = videoLength(voice.duration)

  // picture + sound in one stream
  const videoStream = canvas.captureStream(VIDEO_TIMING.fps)
  const soundOut = audioContext.createMediaStreamDestination()
  const source = audioContext.createBufferSource()
  source.buffer = voice
  source.connect(soundOut)
  if (playAloud) source.connect(audioContext.destination)
  const stream = new MediaStream([...videoStream.getVideoTracks(), ...soundOut.stream.getAudioTracks()])

  const recorder = new MediaRecorder(stream, {
    mimeType: format.mimeType,
    videoBitsPerSecond: 2_500_000,
    audioBitsPerSecond: 96_000,
  })
  const chunks = []
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
  const finished = new Promise((resolve, reject) => {
    recorder.onstop = resolve
    recorder.onerror = (event) => reject(event.error ?? new Error('Recording failed.'))
  })

  // Video has no transparency: fill behind the card's rounded corners so they never show as black.
  const paintFrame = (settings) => {
    painter.paint(ctx, settings)
    ctx.save()
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = '#eaf6ff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
  }

  await audioContext.resume()
  paintFrame(videoFrameAt(0, plan))
  recorder.start(250)
  const startedAt = audioContext.currentTime
  source.start(startedAt + VIDEO_TIMING.lead)

  // Draw every frame from the audio clock, so the words stay in step with the voice.
  await new Promise((resolve, reject) => {
    let lastReported = -1
    const tick = () => {
      if (signal?.aborted) {
        reject(new DOMException('Recording cancelled.', 'AbortError'))
        return
      }
      const t = audioContext.currentTime - startedAt
      paintFrame(videoFrameAt(Math.min(t, total), plan))
      const whole = Math.floor(t)
      if (whole !== lastReported) { lastReported = whole; onProgress?.(Math.min(t, total), total) }
      if (t >= total) resolve()
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }).finally(() => {
    try { source.stop() } catch { /* already stopped */ }
    if (recorder.state !== 'inactive') recorder.stop()
    stream.getTracks().forEach((track) => track.stop())
  })
  await finished

  return {
    blob: new Blob(chunks, { type: format.mimeType.split(';')[0] }),
    extension: format.extension,
    seconds: total,
  }
}
