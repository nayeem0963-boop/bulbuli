/**
 * A grid over a map's colliders, so each physics step is given only the colliders near
 * Bulbuli instead of the whole map (the Amazon has over 22,000 with its branches).
 *
 * The physics (skyward-explorer/physics.js) only ever uses a collider that lies under the
 * bird or within its broad-phase reach of the step: the step's length plus 3 m. near(x, z)
 * returns every collider that comes within COLLIDER_INDEX.margin of the grid cell holding
 * (x, z), in the map's own order (the order decides which ground wins). With the frame time
 * capped as ExplorerController caps it, that is a superset of what the physics would pick from
 * the full list, so a step taken with it is the same step.
 */
export const COLLIDER_INDEX = Object.freeze({
  cell: 4,
  /** Broad-phase reach (3 m) plus two steps at top speed with frames capped at 1/30 s, and slack. */
  margin: 5,
})

const EMPTY = Object.freeze([])

function extentOf(c) {
  if (c.shape === 'aabb') return { x: (c.minX + c.maxX) / 2, z: (c.minZ + c.maxZ) / 2, hx: (c.maxX - c.minX) / 2, hz: (c.maxZ - c.minZ) / 2 }
  const r = Math.max(c.r ?? 0, c.collisionRadius ?? 0, c.rootRadius ?? 0, c.supportRadius ?? 0)
  return { x: c.x, z: c.z, hx: r, hz: r }
}

export function createColliderIndex(colliders, { cell = COLLIDER_INDEX.cell, margin = COLLIDER_INDEX.margin } = {}) {
  const cells = new Map()
  for (const collider of colliders) {
    const { x, z, hx, hz } = extentOf(collider)
    const x0 = Math.floor((x - hx - margin) / cell)
    const x1 = Math.floor((x + hx + margin) / cell)
    const z0 = Math.floor((z - hz - margin) / cell)
    const z1 = Math.floor((z + hz + margin) / cell)
    for (let ix = x0; ix <= x1; ix += 1) {
      for (let iz = z0; iz <= z1; iz += 1) {
        const key = ix * 65536 + iz
        const list = cells.get(key)
        if (list) list.push(collider)
        else cells.set(key, [collider])
      }
    }
  }
  return {
    all: colliders,
    /** The colliders a step that starts at (x, z) can meet. */
    near: (x, z) => cells.get(Math.floor(x / cell) * 65536 + Math.floor(z / cell)) ?? EMPTY,
  }
}
