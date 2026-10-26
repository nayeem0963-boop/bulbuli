import { useId, useLayoutEffect, useRef } from 'react'
import { collisionWorld } from '../systems/collisionWorld'

/*
 * Register a component's collision shapes for as long as it's mounted.
 * Layout effects, so shapes exist before the first frame that could need them
 * (and are gone in the same commit the component unmounts).
 */

/** A solid box (Box3). `standable` false = blocks sideways only (wall-run panels). */
export function useSolid(box, { standable = true } = {}) {
  const id = useId()
  useLayoutEffect(() => collisionWorld.addSolid(id, box, { standable }), [id, box, standable])
}

/** A ramp surface: { x, w, z0, length, rise }. */
export function useRamp(ramp) {
  const id = useId()
  useLayoutEffect(() => collisionWorld.addRamp(id, ramp), [id, ramp])
}

/**
 * A trigger volume. `shape` is a Box3, or a function (out: Box3) => Box3 for moving
 * things. `onEnter` fires the first frame the player overlaps it. Pass active=false
 * to remove it (e.g. once collected or struck).
 */
export function useSensor(active, shape, onEnter) {
  const id = useId()
  const handler = useRef(onEnter)
  handler.current = onEnter
  const shapeRef = useRef(shape)
  shapeRef.current = shape
  useLayoutEffect(() => {
    if (!active) return undefined
    const sensor = typeof shapeRef.current === 'function'
      ? { getBox: (out) => shapeRef.current(out), onEnter: () => handler.current() }
      : { box: shapeRef.current, onEnter: () => handler.current() }
    return collisionWorld.addSensor(id, sensor)
  }, [id, active])
}
