/**
 * Camera-aware placement of a station's name label (the sprite above its pole).
 *
 * By default a label floats LABEL.height above the station ring at full size. Close to the
 * camera that puts it above the top of the frame, or under the Mission Log / Journal buttons, and
 * makes it very large. A map can opt in (`labels: { cameraAware: true }`): the label then comes
 * down just far enough to stay below a top margin of the frame, never lower than the top of the
 * pole, and shrinks a little when the camera is near. Far away it is exactly where it always was.
 *
 * Presentation only: stations, their rings and their interaction are untouched.
 */
import { Vector3 } from 'three'

export const LABEL = Object.freeze({
  height: 2.8, // metres above the ring: the label's centre (the fixed position of other maps)
  minHeight: 2.3, // just above the pole (which ends 2.2 m up)
  width: 2,
  tall: 0.5,
  topMargin: 0.16, // share of the frame height kept free at the top (the buttons live there)
  fullSizeDistance: 7, // metres from the camera at which the label reaches full size
  minScale: 0.5,
})

const probe = new Vector3()

/** Vertical position in the frame (0 = top edge, 1 = bottom) of a world point; null if behind the camera. */
function frameY(camera, x, y, z) {
  probe.set(x, y, z).applyMatrix4(camera.matrixWorldInverse)
  if (probe.z > -camera.near) return null
  probe.applyMatrix4(camera.projectionMatrix)
  return (1 - probe.y) / 2
}

/**
 * @param camera  a PerspectiveCamera whose matrixWorldInverse and projectionMatrix are current
 * @param base    [x, y, z] of the station ring
 * @returns {{ height: number, scale: number }}  label centre above the ring, and size factor
 */
export function stationLabelPlacement(camera, base) {
  const [x, y, z] = base
  const distance = Math.hypot(camera.position.x - x, camera.position.y - (y + LABEL.height), camera.position.z - z)
  const scale = Math.max(LABEL.minScale, Math.min(1, distance / LABEL.fullSizeDistance))
  const half = (LABEL.tall * scale) / 2
  const fits = (h) => {
    const top = frameY(camera, x, y + h + half, z)
    return top !== null && top >= LABEL.topMargin
  }
  if (frameY(camera, x, y + LABEL.height, z) === null) return { height: LABEL.height, scale } // behind the camera
  if (fits(LABEL.height)) return { height: LABEL.height, scale }
  if (!fits(LABEL.minHeight)) return { height: LABEL.minHeight, scale }
  let low = LABEL.minHeight
  let high = LABEL.height
  for (let i = 0; i < 10; i += 1) {
    const mid = (low + high) / 2
    if (fits(mid)) low = mid
    else high = mid
  }
  return { height: low, scale }
}
