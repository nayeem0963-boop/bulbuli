/**
 * Low-poly island chunks: a grass cap, a band of dirt, and a jagged rock cone hanging below.
 * The same builder makes the big island and every small floating platform.
 *
 * Vertices are nudged by a noise that depends only on their position, so the duplicated
 * vertices three.js keeps along seams always move together and the mesh never cracks.
 * The grass top stays perfectly flat: it is what the player will stand on.
 */
import { ConeGeometry, CylinderGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ISLAND } from './layout.js'

function noise(x, y, z, seed) {
  // round first, so cos(0) and cos(2π) seam vertices hash the same
  const rx = Math.round(x * 1000) / 1000
  const ry = Math.round(y * 1000) / 1000
  const rz = Math.round(z * 1000) / 1000
  const s = Math.sin(rx * 12.9898 + ry * 78.233 + rz * 37.719 + seed * 0.1234) * 43758.5453
  return s - Math.floor(s) // 0..1
}

/** Push each rim vertex in or out (radial) and up or down (vertical), leaving the axis alone. */
function roughen(geometry, seed, { radial = 0, vertical = 0, keepTopY = null, keepBottomY = null }) {
  const pos = geometry.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const r = Math.hypot(x, z)
    if (r < 1e-4) continue // centre of a cap or the tip of the cone
    const n1 = noise(x, y, z, seed) - 0.5
    const n2 = noise(z, x, y, seed + 17) - 0.5
    const scale = 1 + n1 * radial
    pos.setX(i, x * scale)
    pos.setZ(i, z * scale)
    const pinned = (keepTopY !== null && Math.abs(y - keepTopY) < 1e-4) || (keepBottomY !== null && Math.abs(y - keepBottomY) < 1e-4)
    if (!pinned) pos.setY(i, y + n2 * vertical)
  }
  pos.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

/**
 * Geometries for one chunk whose grass top sits at y = 0.
 * @param {number} radius   grass top radius
 * @param {number} seed     any number; changes the rock shapes
 * @param {object} [opts]   { segments, grassDepth, dirtDepth, rockDepth }
 * @returns {{ grass, dirt, rock }} BufferGeometries (call dispose() on each when done)
 */
export function createIslandGeometries(radius, seed, opts = {}) {
  const {
    segments = 24,
    grassDepth = Math.max(0.35, radius * 0.06),
    dirtDepth = Math.max(0.6, radius * 0.14),
    rockDepth = radius * 1.6,
  } = opts

  const grass = new CylinderGeometry(radius, radius * 0.97, grassDepth, segments, 1)
  grass.translate(0, -grassDepth / 2, 0)
  roughen(grass, seed, { radial: 0.1, vertical: 0, keepTopY: 0 })

  const dirtTop = -grassDepth
  const dirt = new CylinderGeometry(radius * 0.97, radius * 0.82, dirtDepth, segments, 2)
  dirt.translate(0, dirtTop - dirtDepth / 2, 0)
  roughen(dirt, seed + 1, { radial: 0.16, vertical: dirtDepth * 0.12, keepTopY: dirtTop })

  const rockTop = dirtTop - dirtDepth
  const rock = new ConeGeometry(radius * 0.84, rockDepth, segments, Math.max(3, Math.round(rockDepth / 1.6)))
  rock.rotateX(Math.PI) // point down
  rock.translate(0, rockTop - rockDepth / 2, 0)
  roughen(rock, seed + 2, { radial: 0.45, vertical: rockDepth * 0.06, keepTopY: rockTop })

  return { grass, dirt, rock }
}

/**
 * The main island and every platform of a world, merged into one geometry per layer,
 * so all the land draws in three calls: { grass, dirt, rock }.
 */
export function createLandGeometries(world) {
  const chunks = [
    { radius: ISLAND.radius, seed: world.seed, segments: 28, rockDepth: ISLAND.rockDepth, at: [0, 0, 0] },
    ...world.platforms.map((p) => ({ radius: p.radius, seed: p.seed, segments: p.summit ? 12 : 9, at: p.position })),
  ]
  const layers = { grass: [], dirt: [], rock: [] }
  for (const c of chunks) {
    const parts = createIslandGeometries(c.radius, c.seed, { segments: c.segments, rockDepth: c.rockDepth })
    for (const key of Object.keys(layers)) layers[key].push(parts[key].translate(...c.at))
  }
  const merged = {}
  for (const [key, list] of Object.entries(layers)) {
    merged[key] = mergeGeometries(list, false)
    list.forEach((g) => g.dispose())
    if (!merged[key]) throw new Error(`Could not merge the ${key} layer`)
  }
  return merged
}
