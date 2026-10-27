import { useContext, useEffect, useId, useRef, useSyncExternalStore } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { LabelContext } from './labelStore.js'

/** A text label pinned to a point in the scene. Use inside the Canvas. */
export function Label({ position, children, tone = '', size = '' }) {
  const store = useContext(LabelContext)
  const anchor = useRef(null)
  const id = useId()
  useEffect(() => {
    if (!store || !anchor.current) return undefined
    store.set(id, { object: anchor.current, text: children, tone, size })
    return () => store.remove(id)
  }, [store, id, children, tone, size])
  return <group ref={anchor} position={position} />
}

const point = new Vector3()

/** Inside the Canvas: moves every label to its anchor's place on screen, once per rendered frame. */
export function LabelProjector({ store }) {
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    store.setInvalidate(invalidate)
    return () => store.setInvalidate(null)
  }, [store, invalidate])

  useFrame(({ camera, size }) => {
    for (const [id, label] of store.labels) {
      const element = store.elements.get(id)
      if (!element || !label.object) continue
      label.object.getWorldPosition(point).project(camera)
      const x = (point.x * 0.5 + 0.5) * size.width
      const y = (-point.y * 0.5 + 0.5) * size.height
      element.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`
      element.style.visibility = point.z > 1 ? 'hidden' : 'visible'
    }
  })
  return null
}

/** Outside the Canvas: the DOM layer that holds the label text. Decorative: the figure caption says it all. */
export function LabelOverlay({ store }) {
  const labels = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  return (
    <div className="mm-labels" aria-hidden="true">
      {labels.map(([id, label]) => (
        <span
          key={id}
          ref={(element) => {
            if (element) store.attach(id, element)
            else store.detach(id)
          }}
          className={`mm-tag ${label.tone ? `is-${label.tone}` : ''} ${label.size ? `is-${label.size}` : ''}`}
        >
          {label.text}
        </span>
      ))}
    </div>
  )
}
