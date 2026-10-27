/**
 * Tiny external store for the hovered target. Pointer moves update it ~60x a second, so it lives
 * outside React state: only the small HUD readout subscribes (useSyncExternalStore), and the
 * 3D scene never re-renders because the mouse moved.
 *
 * Snapshot: null | { cell: {x,y,z}, action: 'place' | 'erase', valid: boolean, reason?: string }
 */
export function createHoverStore() {
  let snapshot = null
  const listeners = new Set()
  const same = (a, b) =>
    a === b ||
    (a && b && a.action === b.action && a.valid === b.valid &&
      a.cell.x === b.cell.x && a.cell.y === b.cell.y && a.cell.z === b.cell.z)

  return {
    get: () => snapshot,
    set(next) {
      if (same(snapshot, next)) return
      snapshot = next
      listeners.forEach((l) => l())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
