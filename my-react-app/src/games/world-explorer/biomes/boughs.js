/**
 * Branch colliders: the thick branches of a tree as chains of small solid colliders laid
 * exactly along the branches that are drawn.
 *
 * The physics (skyward-explorer/physics.js, shared and not modified) knows upright cylinders
 * with a top and a bottom. A slanted branch is therefore a row of short ones: each as wide as
 * the branch is thick at that point, and only as tall as that piece of branch. Bulbuli's body
 * stops at the bark and slides along or round it; over and under the branch it passes freely.
 *
 * Only wood that is really in the way counts: at least BOUGH.minRadius thick once the tree's
 * own scale is applied. Thinner limbs, twigs, crown tiers and every leaf stay soft, and nothing
 * here encloses a crown.
 */
export const BOUGH = Object.freeze({
  /** Thinnest branch that is solid: 6 cm radius, a branch 12 cm thick. */
  minRadius: 0.06,
  /** Distance between the pieces along a branch (m). Bulbuli's body is 0.7 m wide, so no gap. */
  spacing: 0.4,
})

/**
 * @param idPrefix  collider id prefix
 * @param boughs    [{ kind, path: [[x, y, z]…], radii }] in model space
 * @param placement { x, y, z, yaw, scale: [sx, sy, sz] } as the renderer places the model
 * @param options   { kinds: which kinds to use, above: use a trunk only above this world height
 *                    (below it the tree's own trunk collider already stands) }
 */
export function boughColliders(idPrefix, boughs, placement, { kinds = null, above = -Infinity } = {}) {
  const { x, y, z, yaw = 0, scale } = placement
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  const thick = (scale[0] + scale[2]) / 2
  const toWorld = ([px, py, pz]) => {
    const lx = px * scale[0]
    const lz = pz * scale[2]
    return [x + lx * cos + lz * sin, y + py * scale[1], z - lx * sin + lz * cos]
  }
  const out = []
  boughs.forEach((bough, index) => {
    if (kinds && !kinds.includes(bough.kind)) return
    const points = bough.path.map(toWorld)
    let carried = 0 // distance walked along the branch since the last piece
    let piece = 0
    for (let k = 1; k < points.length; k += 1) {
      const a = points[k - 1]
      const b = points[k]
      const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
      if (length < 1e-6) continue
      const rise = Math.abs(b[1] - a[1]) / length
      let at = k === 1 ? 0 : BOUGH.spacing - carried
      for (; at <= length; at += BOUGH.spacing) {
        const t = at / length
        const radius = (bough.radii[k - 1] + (bough.radii[k] - bough.radii[k - 1]) * t) * thick
        const py = a[1] + (b[1] - a[1]) * t
        if (radius < BOUGH.minRadius || (bough.kind === 'trunk' && py < above)) continue
        // tall enough to meet the next piece along a sloping branch, no taller
        const half = radius + rise * BOUGH.spacing / 2
        out.push({
          id: `${idPrefix}-${index}-${piece}`,
          kind: 'prop',
          bough: bough.kind,
          x: a[0] + (b[0] - a[0]) * t,
          z: a[2] + (b[2] - a[2]) * t,
          r: radius,
          top: py + half,
          bottom: py - half,
          walkable: false,
        })
        piece += 1
      }
      carried = length - (at - BOUGH.spacing)
    }
  })
  return out
}

const jitter = (x, z, salt = 0) => {
  const s = Math.sin(x * 12.9898 + z * 78.233 + salt * 37.719) * 43758.5453
  return s - Math.floor(s)
}
/**
 * Where SundarbansScenery.jsx (Instances) draws a tree model: the same position, turn and
 * per-tree widening it applies, so the colliders land on the branches that are drawn.
 */
export function sundarbansPlacement(item) {
  const widen = 0.92 + jitter(item.x, item.z, 1) * 0.16
  return {
    x: item.x,
    y: item.y,
    z: item.z,
    yaw: (item.rot ?? 0) + (jitter(item.x, item.z, 4) - 0.5) * 0.22,
    scale: [item.scale * widen, item.scale * (item.stretch ?? 1), item.scale * widen * (0.94 + jitter(item.x, item.z, 2) * 0.12)],
  }
}
/** Where AmazonScenery.jsx draws a tree model: position, turn about the trunk, one scale. */
export function amazonPlacement(item) {
  const size = item.scale ?? 1
  return { x: item.x, y: item.y, z: item.z, yaw: item.rot ?? 0, scale: [size, size, size] }
}
