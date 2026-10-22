import { useEffect, useRef } from 'react'
import { addBurst, FOREST_LAYERS, stepScroll } from './forestLayers.js'

/**
 * A forest that scrolls in layers (parallax) behind and in front of the runner.
 *
 * running  the world drifts forward while true, and glides to a stop when false
 * pulse    a number that changes on every correct key; each change gives a burst of speed
 * children what runs through the forest (the bird and the flag), drawn between the layers
 *
 * One requestAnimationFrame loop writes a single CSS variable, --scroll, on the scene;
 * every layer moves its background by --scroll x its own speed. No React re-render per frame.
 * With "reduce motion" turned on, the forest stays still.
 */
export default function ForestScene({ running, pulse, label, children }) {
  const scene = useRef(null)
  const state = useRef({ scroll: 0, speed: 0 })
  const runningRef = useRef(running)
  useEffect(() => { runningRef.current = running }, [running])

  useEffect(() => {
    if (pulse) state.current.speed = addBurst(state.current.speed)
  }, [pulse])

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    let frame = 0
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000) // cap, so a hidden tab doesn't jump
      last = now
      state.current = stepScroll(state.current, { dt, running: runningRef.current })
      scene.current?.style.setProperty('--scroll', state.current.scroll.toFixed(2))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const layer = (item) => (
    <div
      key={item.id}
      className={`forest-layer layer-${item.id}${item.front ? ' over-runner' : ''}`}
      style={{ backgroundImage: `url("${item.src}")`, '--speed': item.speed }}
      aria-hidden="true"
    />
  )

  return (
    <div ref={scene} className="forest" role="img" aria-label={label}>
      {FOREST_LAYERS.filter((item) => !item.front).map(layer)}
      <div className="forest-stage">{children}</div>
      {FOREST_LAYERS.filter((item) => item.front).map(layer)}
      <div className="forest-shade" aria-hidden="true" />
    </div>
  )
}
