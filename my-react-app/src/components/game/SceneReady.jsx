/**
 * SceneReady: put inside a <Canvas>; calls `onReady` once the first frame has been drawn.
 *
 * Suspense only covers *loading*. three.js compiles a material's shaders the first time it is
 * drawn, which on a phone can take a few hundred milliseconds of frozen canvas. useFrame callbacks
 * run just before R3F renders a frame, so waiting one animation frame after the first callback
 * means that render (and its shader compilation) is done. Scenes use this to keep
 * <GameLoadingSpinner /> up until the picture is actually there.
 *
 * Only lazy scene modules import this file (it imports @react-three/fiber), never the arcade shell.
 *
 * @param {{ onReady: () => void }} props
 */
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function SceneReady({ onReady }) {
  const fired = useRef(false)
  const raf = useRef(0)
  const callback = useRef(onReady)
  callback.current = onReady

  useFrame(() => {
    if (fired.current) return
    fired.current = true
    raf.current = requestAnimationFrame(() => callback.current?.())
  })

  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  return null
}
