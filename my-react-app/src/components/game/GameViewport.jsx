/**
 * GameViewport: the Suspense boundary around a lazily loaded 3D scene.
 *
 * While the scene's chunk downloads (and while anything inside a <Canvas> without its own
 * <Suspense> is loading, e.g. useGLTF or drei <Text> fonts: R3F forwards those suspensions to
 * the nearest DOM boundary), it shows <GameLoadingSpinner fill /> in the scene's place.
 *
 * Give `frameClassName` when the scene draws its own box (e.g. Shape Hunt's
 * .sh-canvas): the spinner then sits in an identical box, so nothing jumps when the scene
 * arrives. Without it the spinner fills the nearest positioned parent (a game stage).
 *
 * Keep each game's own error boundary *outside* this one: a chunk that fails to load, or a device
 * with no WebGL, should show that game's friendly message, not a spinner that never ends.
 *
 * @typedef {object} GameViewportProps
 * @property {import('react').ReactNode} children   the lazy scene
 * @property {string} [label]                       spinner text, in the player's language
 * @property {'light'|'dark'} [tone]
 * @property {string} [frameClassName]              class for a box around the spinner (see above)
 */
import { Suspense } from 'react'
import GameLoadingSpinner from './GameLoadingSpinner.jsx'

/** @param {GameViewportProps} props */
export default function GameViewport({ children, label, tone = 'light', frameClassName }) {
  const spinner = <GameLoadingSpinner label={label} tone={tone} fill />
  const fallback = frameClassName ? <div className={frameClassName}>{spinner}</div> : spinner
  return <Suspense fallback={fallback}>{children}</Suspense>
}
