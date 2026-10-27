import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

const MAX_DPR = 2 // cap for 3x/4x phone screens: visually identical, far cheaper to fill

/**
 * Window resize listener for the renderer. The <Canvas> already tracks its container's size
 * with a ResizeObserver (configured with zero debounce in Viewport3D, so the drawing buffer
 * follows the layout every frame). This listener covers what a ResizeObserver can't see:
 * the device pixel ratio changing when the window is dragged to another monitor or the page
 * is zoomed. Work is coalesced into one requestAnimationFrame per resize burst.
 */
export default function ResponsiveRenderer() {
  const setDpr = useThree((s) => s.setDpr)
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    let frame = 0
    const sync = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        setDpr(Math.min(window.devicePixelRatio || 1, MAX_DPR))
        invalidate()
      })
    }
    sync()
    window.addEventListener('resize', sync, { passive: true })
    window.addEventListener('orientationchange', sync, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
    }
  }, [setDpr, invalidate])

  return null
}
