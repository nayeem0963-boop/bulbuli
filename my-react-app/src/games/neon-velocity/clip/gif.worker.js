import { encodeGif } from './gifEncoder'

/** Off-main-thread GIF encoding so the UI stays responsive while exporting. */
self.onmessage = (event) => {
  const { frames, width, height, delayCs } = event.data
  try {
    const bytes = encodeGif(frames.map((buf) => new Uint8ClampedArray(buf)), width, height, { delayCs })
    self.postMessage({ ok: true, bytes }, [bytes.buffer])
  } catch (error) {
    self.postMessage({ ok: false, error: error.message })
  }
}
