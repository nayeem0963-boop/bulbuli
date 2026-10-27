/**
 * Labels for the 3D figures, without a React root per label.
 *
 * <Label> (inside the Canvas) registers an invisible anchor and its text here; <LabelOverlay> (a plain
 * DOM layer over the canvas) renders every label once; <LabelProjector> (one useFrame) moves each label
 * to its anchor's screen position. The text stays real, crisp DOM text and nothing to do with labels
 * runs outside the render loop.
 */
import { createContext } from 'react'

export function createLabelStore() {
  const labels = new Map() // id → { object, text, tone, size }
  const elements = new Map() // id → HTMLElement
  const listeners = new Set()
  let snapshot = []
  let invalidate = null

  const emit = () => {
    snapshot = [...labels.entries()]
    listeners.forEach((listener) => listener())
  }

  return {
    set(id, data) { labels.set(id, data); emit() },
    remove(id) { labels.delete(id); elements.delete(id); emit() },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => snapshot,
    labels,
    elements,
    attach(id, element) {
      elements.set(id, element)
      invalidate?.() // draw a frame so a new label gets its position even when rendering on demand
    },
    detach(id) { elements.delete(id) },
    setInvalidate(fn) { invalidate = fn },
  }
}

export const LabelContext = createContext(null)
