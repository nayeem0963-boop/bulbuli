/**
 * The desert round the Sahara expedition: the sand carries on past the edge of the plain to the
 * horizon, with a ring of far dunes, so the map no longer reads as an island in the sky.
 *
 * Scenery only. Nothing out here is part of the expedition: no stations, no props, and the bird
 * is turned back a few metres past the plain (recovery.js). The one physical piece is a flat
 * strip of support under the first metres of the skirt (biomes/common.js), so a bird that walks
 * past the edge stands on the sand it sees until it is carried back, instead of sinking through.
 *
 * Pure data and geometry: SaharaSurround in ExpeditionCanvas.jsx draws it.
 */
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { mulberry32 } from '../../../core/rng.js'

export const SURROUND = Object.freeze({
  /** The skirt starts under the plain (whose wavy edge lies at about 38 to 45 m)… */
  inner: 30,
  /** …lies flat, a hand's width below the plain, as far as the bird can ever stand… */
  flatUntil: 58,
  /** …then swells into long low dunes, and ends far beyond what the haze lets through. */
  outer: 210,
  base: -0.1,
  swell: 2.4,
  rings: 26,
  sectors: 72,
  /** Radius of the walkable strip of support (m from the middle of the map). */
  support: 57,
  dunes: 30,
})

const smooth = (t) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c) }

/** Height of the skirt at (x, z): flat near the plain, long soft dunes further out. */
export function surroundHeightAt(x, z) {
  const r = Math.hypot(x, z)
  const rise = smooth((r - SURROUND.flatUntil) / 45)
  if (rise === 0) return SURROUND.base
  // long ridges that run roughly one way (the wind's), with a slower cross swell
  const ridges = Math.sin(x * 0.045 + z * 0.021 + 1.3) * 0.55 + Math.sin(x * 0.019 - z * 0.052 + 4.1) * 0.3 + Math.sin((x + z) * 0.011) * 0.15
  return SURROUND.base + rise * SURROUND.swell * (0.55 + 0.45 * ridges)
}

/** The skirt: a ring of sand from under the plain out to the horizon, textured like the plain. */
export function createSurroundGeometry() {
  const positions = []
  const uvs = []
  const indices = []
  const { rings, sectors, inner, outer } = SURROUND
  for (let ring = 0; ring <= rings; ring += 1) {
    // rings crowd towards the plain, where the camera is
    const r = inner + (outer - inner) * (ring / rings) ** 1.7
    for (let sector = 0; sector < sectors; sector += 1) {
      const angle = (sector / sectors) * Math.PI * 2
      const x = Math.cos(angle) * r
      const z = Math.sin(angle) * r
      positions.push(x, surroundHeightAt(x, z), z)
      uvs.push(0.5 + x / 8, 0.5 + z / 8) // the plain's own texture scale (terrain.js), so the sand carries on
    }
  }
  for (let ring = 0; ring < rings; ring += 1) {
    for (let sector = 0; sector < sectors; sector += 1) {
      const next = (sector + 1) % sectors
      const a = ring * sectors + sector
      const b = ring * sectors + next
      const c = (ring + 1) * sectors + next
      const d = (ring + 1) * sectors + sector
      indices.push(a, b, c, a, c, d) // facing up
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('uv1', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/**
 * The far dunes: { x, z, y, length, height, width, rot } for half-ellipsoid mounds like the
 * four dunes on the plain, larger and further apart towards the horizon. Always the same ones.
 */
export function distantDunes() {
  const random = mulberry32(0x5a4a7a)
  const dunes = []
  for (let i = 0; i < SURROUND.dunes; i += 1) {
    const angle = (i / SURROUND.dunes) * Math.PI * 2 + (random() - 0.5) * 0.16
    const far = random()
    const r = 68 + far * 82
    const size = 1.6 + far * 2.6 + random() * 0.8
    const x = Math.cos(angle) * r
    const z = Math.sin(angle) * r
    dunes.push({
      x,
      z,
      y: surroundHeightAt(x, z) - 0.35 * size,
      length: 5.5 * size,
      height: (1.5 + random() * 0.7) * size,
      width: 3.6 * size,
      // lying roughly across the view from the map, like ridges seen side on
      rot: -angle + Math.PI / 2 + (random() - 0.5) * 0.7,
    })
  }
  return dunes
}
