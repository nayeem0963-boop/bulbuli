import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

export const THUMB_WIDTH = 480
export const THUMB_HEIGHT = 360 // 4:3, the gallery card's preview shape

/**
 * Renders one frame from the given camera and returns it as a small image data URL.
 *
 * Why it works without `preserveDrawingBuffer` (which would slow every frame): we render and
 * read the canvas in the same task, before the browser presents and clears the buffer.
 * Objects tagged `userData.noSnapshot` (the placement cursor) are hidden for that one frame.
 * The image is a centred 4:3 crop of the view, the same box the framing guide shows.
 */
export function captureView(gl, scene, camera, { width = THUMB_WIDTH, height = THUMB_HEIGHT, quality = 0.85 } = {}) {
  const hidden = []
  scene.traverse((o) => {
    if (o.userData.noSnapshot && o.visible) {
      o.visible = false
      hidden.push(o)
    }
  })
  try {
    gl.render(scene, camera)
    const src = gl.domElement
    const target = width / height
    let cw = src.width
    let ch = cw / target
    if (ch > src.height) {
      ch = src.height
      cw = ch * target
    }
    const out = document.createElement('canvas')
    out.width = width
    out.height = height
    const ctx = out.getContext('2d')
    ctx.drawImage(src, (src.width - cw) / 2, (src.height - ch) / 2, cw, ch, 0, 0, width, height)
    // WebP is ~3x smaller than PNG; Safari < 17 can't encode it, so fall back to JPEG.
    const webp = out.toDataURL('image/webp', quality)
    return webp.startsWith('data:image/webp') ? webp : out.toDataURL('image/jpeg', quality)
  } finally {
    hidden.forEach((o) => (o.visible = true))
  }
}

/**
 * Lives inside the Studio <Canvas> and hands the outside world a `capture()` function through
 * `captureRef`, so the Publish modal (plain DOM) can snapshot the current 3D camera view.
 */
export default function SnapshotBridge({ captureRef }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    if (!captureRef) return
    captureRef.current = (opts) => {
      try {
        return captureView(gl, scene, camera, opts)
      } catch (err) {
        console.warn('[voxelcraft] thumbnail capture failed', err)
        return null
      }
    }
    return () => {
      captureRef.current = null
    }
  }, [captureRef, gl, scene, camera])
  return null
}
