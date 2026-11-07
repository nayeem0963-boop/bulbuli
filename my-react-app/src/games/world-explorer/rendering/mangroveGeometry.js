/**
 * Low-level, asset-free mesh building blocks shared by the Sundarbans models (mangroveTrees.js,
 * mangroveModels.js). Everything is emitted into ONE non-indexed BufferGeometry with per-vertex
 * colours, so a whole tree (bark, roots and leaves) draws as a single instanced call.
 * All randomness comes from a caller-supplied seeded generator: output is deterministic.
 */
import { BufferGeometry, Color, Float32BufferAttribute, IcosahedronGeometry, Vector3 } from 'three'

export const linear = (hex) => new Color(hex) // Color(hex) converts sRGB → linear working space
export const v = (x, y, z) => new Vector3(x, y, z)
const UP = Object.freeze(new Vector3(0, 1, 0))

export function createBuilder() {
  const positions = []
  const colors = []
  const triangle = (a, b, c, ca, cb = ca, cc = ca) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
    colors.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b, cc.r, cc.g, cc.b)
  }
  return {
    triangle,
    get triangles() { return positions.length / 9 },
    build({ smoothNormals = false } = {}) {
      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
      geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
      geometry.computeVertexNormals()
      if (smoothNormals) {
        const normals = geometry.getAttribute('normal')
        const merged = new Map()
        for (let index = 0; index < positions.length; index += 3) {
          const key = `${Math.round(positions[index] * 10000)},${Math.round(positions[index + 1] * 10000)},${Math.round(positions[index + 2] * 10000)}`
          const normal = merged.get(key) ?? [0, 0, 0]
          normal[0] += normals.getX(index / 3)
          normal[1] += normals.getY(index / 3)
          normal[2] += normals.getZ(index / 3)
          merged.set(key, normal)
        }
        for (let index = 0; index < positions.length; index += 3) {
          const key = `${Math.round(positions[index] * 10000)},${Math.round(positions[index + 1] * 10000)},${Math.round(positions[index + 2] * 10000)}`
          const normal = merged.get(key)
          const length = Math.hypot(normal[0], normal[1], normal[2]) || 1
          normals.setXYZ(index / 3, normal[0] / length, normal[1] / length, normal[2] / length)
        }
        normals.needsUpdate = true
      }
      geometry.computeBoundingSphere()
      geometry.computeBoundingBox()
      return geometry
    },
  }
}

/** Points along a quadratic Bézier curve. */
export function bezier(a, control, b, steps) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps
    const u = 1 - t
    return new Vector3(
      u * u * a.x + 2 * u * t * control.x + t * t * b.x,
      u * u * a.y + 2 * u * t * control.y + t * t * b.y,
      u * u * a.z + 2 * u * t * control.z + t * t * b.z,
    )
  })
}

/** Points along a cubic Bézier curve. */
export function cubic(a, c1, c2, b, steps) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps
    const u = 1 - t
    const w0 = u * u * u
    const w1 = 3 * u * u * t
    const w2 = 3 * u * t * t
    const w3 = t * t * t
    return new Vector3(
      w0 * a.x + w1 * c1.x + w2 * c2.x + w3 * b.x,
      w0 * a.y + w1 * c1.y + w2 * c2.y + w3 * b.y,
      w0 * a.z + w1 * c1.z + w2 * c2.z + w3 * b.z,
    )
  })
}

/**
 * Rotation-minimising frames along a path (parallel transport), so tubes that bend from
 * horizontal to vertical (prop roots) never twist or pinch.
 */
function frames(path) {
  const tangents = path.map((point, i) => {
    const prev = path[Math.max(0, i - 1)]
    const next = path[Math.min(path.length - 1, i + 1)]
    const t = next.clone().sub(prev)
    return t.lengthSq() > 1e-12 ? t.normalize() : v(0, 1, 0)
  })
  const first = tangents[0]
  const helper = Math.abs(first.y) > 0.9 ? v(1, 0, 0) : v(0, 1, 0)
  let side = new Vector3().crossVectors(first, helper).normalize()
  return tangents.map((tangent) => {
    side = side.clone().addScaledVector(tangent, -side.dot(tangent))
    if (side.lengthSq() < 1e-10) side = new Vector3().crossVectors(tangent, helper)
    side.normalize()
    const up = new Vector3().crossVectors(side, tangent).normalize()
    return { side, up }
  })
}

/**
 * A tapered tube along `path` with one radius per point.
 * Bark options (need `random`): `noise` jitters each ring vertex radius (low-poly bark facets),
 * `mottle` jitters vertex brightness, `lichen` blends occasional vertices to a grey tone,
 * `twist` rotates successive rings so facets spiral irregularly.
 */
export function tube(builder, path, radii, {
  segments = 6, base, tip = base, cap = true, random = null, noise = 0, mottle = 0, lichen = null, twist = 0,
}) {
  const fr = frames(path)
  const last = path.length - 1
  const rings = path.map((point, i) => {
    const { side, up } = fr[i]
    const ringColor = base.clone().lerp(tip, i / Math.max(1, last))
    return Array.from({ length: segments }, (_, s) => {
      const angle = (s / segments) * Math.PI * 2 + i * twist
      const r = radii[i] * (random && noise ? 1 + (random() - 0.5) * noise : 1)
      const position = point.clone().addScaledVector(side, Math.cos(angle) * r).addScaledVector(up, Math.sin(angle) * r)
      const color = ringColor.clone()
      if (random && mottle) color.multiplyScalar(1 + (random() - 0.5) * mottle)
      if (random && lichen && random() < 0.16) color.lerp(lichen, 0.4)
      return { position, color }
    })
  })
  for (let i = 1; i < rings.length; i += 1) {
    for (let s = 0; s < segments; s += 1) {
      const n = (s + 1) % segments
      const a = rings[i - 1][s]
      const b = rings[i - 1][n]
      const c = rings[i][n]
      const d = rings[i][s]
      builder.triangle(a.position, b.position, c.position, a.color, b.color, c.color)
      builder.triangle(a.position, c.position, d.position, a.color, c.color, d.color)
    }
  }
  if (cap) {
    const ring = rings[last]
    const end = path[last]
    for (let s = 0; s < segments; s += 1) {
      const a = ring[s]
      const b = ring[(s + 1) % segments]
      builder.triangle(a.position, b.position, end, a.color, b.color, a.color)
    }
  }
}

const BLOB_CACHE = new Map()
function blobBase(detail) {
  if (!BLOB_CACHE.has(detail)) BLOB_CACHE.set(detail, new IcosahedronGeometry(1, detail).getAttribute('position'))
  return BLOB_CACHE.get(detail)
}

/** A lumpy foliage mass: darker underneath, lighter on top. */
export function blob(builder, center, radius, scale, { detail = 1, random, light, dark, lumpy = 0.16 }) {
  const position = blobBase(detail)
  const phase = random() * 10
  const verts = []
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    const bump = 1
      + Math.sin(x * 4.1 + phase) * Math.cos(z * 3.7 - phase) * lumpy
      + Math.sin(y * 5.3 + phase * 0.7) * lumpy * 0.5
    const flatBottom = y < -0.35 ? 0.78 : 1
    verts.push(new Vector3(
      center.x + x * radius * scale[0] * bump,
      center.y + y * radius * scale[1] * bump * flatBottom,
      center.z + z * radius * scale[2] * bump,
    ))
  }
  const shade = (p) => {
    const t = Math.max(0, Math.min(1, (p.y - center.y) / (radius * scale[1]) * 0.5 + 0.5))
    return dark.clone().lerp(light, t * t)
  }
  for (let i = 0; i < verts.length; i += 3) builder.triangle(verts[i], verts[i + 1], verts[i + 2], shade(verts[i]), shade(verts[i + 1]), shade(verts[i + 2]))
}

/**
 * A subtly cupped leaf tessellated along its length so vertex normals follow the bend.
 */
export function leaf(builder, base, direction, length, width, baseColor, tipColor, {
  droop = 0.2,
  fold = 0.35,
  curl = 0.18,
  segments = 1,
  roll = 0,
} = {}) {
  const dir = direction.clone().normalize()
  let side = new Vector3().crossVectors(dir, UP)
  if (side.lengthSq() < 1e-6) side = v(1, 0, 0)
  side.normalize().applyAxisAngle(dir, roll)
  const normal = new Vector3().crossVectors(side, dir).normalize()
  if (segments === 1) {
    const midpoint = base.clone()
      .addScaledVector(dir, length * 0.45)
      .addScaledVector(normal, width * (fold + curl))
      .add(v(0, -droop * length * 0.2, 0))
    const left = midpoint.clone().addScaledVector(side, width)
    const right = midpoint.clone().addScaledVector(side, -width)
    const tip = base.clone().addScaledVector(dir, length).add(v(0, -droop * length, 0))
    const edge = baseColor.clone().lerp(tipColor, 0.55)
    builder.triangle(base, left, tip, baseColor, edge, tipColor)
    builder.triangle(base, tip, right, baseColor, tipColor, edge)
    return
  }
  const across = [-1, 0, 1]
  const pointAt = (t, lateral) => {
    const longitudinal = Math.sin(t * Math.PI)
    const bend = width * fold * longitudinal
    const cup = width * curl * longitudinal * (1 - lateral * lateral)
    const wave = width * 0.055 * Math.sin(t * Math.PI * 2) * longitudinal * lateral
    return base.clone()
      .addScaledVector(dir, length * t)
      .add(v(0, -droop * length * t * t, 0))
      .addScaledVector(normal, bend + cup)
      .addScaledVector(side, width * longitudinal * lateral + wave)
  }
  const colorAt = (t, lateral) => {
    const edgeShade = 1 - Math.abs(lateral) * 0.12
    return baseColor.clone().lerp(tipColor, t * 0.82).multiplyScalar(edgeShade)
  }

  for (let segment = 0; segment < segments; segment += 1) {
    const t0 = segment / segments
    const t1 = (segment + 1) / segments
    for (let acrossIndex = 0; acrossIndex < across.length - 1; acrossIndex += 1) {
      const a0 = across[acrossIndex]
      const a1 = across[acrossIndex + 1]
      const p00 = pointAt(t0, a0)
      const p01 = pointAt(t0, a1)
      const p10 = pointAt(t1, a0)
      const p11 = pointAt(t1, a1)
      builder.triangle(p00, p01, p11, colorAt(t0, a0), colorAt(t0, a1), colorAt(t1, a1))
      builder.triangle(p00, p11, p10, colorAt(t0, a0), colorAt(t1, a1), colorAt(t1, a0))
    }
  }
}

/** A flat, slightly cupped leaf / frond strip along a curve. widths: half-width per point. */
export function strip(builder, path, widths, { base, tip = base, normalHint = new Vector3(0, 1, 0), zigzag = 0 }) {
  const color = (i) => base.clone().lerp(tip, i / Math.max(1, path.length - 1))
  const edges = path.map((point, i) => {
    const prev = path[Math.max(0, i - 1)]
    const next = path[Math.min(path.length - 1, i + 1)]
    const dir = next.clone().sub(prev).normalize()
    const side = new Vector3().crossVectors(dir, normalHint).normalize()
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0)
    const w = widths[i] * (zigzag && i % 2 ? 1 - zigzag : 1)
    const droop = new Vector3(0, -w * 0.25, 0)
    return [point.clone().addScaledVector(side, -w).add(droop), point.clone(), point.clone().addScaledVector(side, w).add(droop)]
  })
  for (let i = 1; i < edges.length; i += 1) {
    const [l0, m0, r0] = edges[i - 1]
    const [l1, m1, r1] = edges[i]
    const c0 = color(i - 1)
    const c1 = color(i)
    builder.triangle(l0, m0, m1, c0, c0, c1)
    builder.triangle(l0, m1, l1, c0, c1, c1)
    builder.triangle(m0, r0, r1, c0, c0, c1)
    builder.triangle(m0, r1, m1, c0, c1, c1)
  }
}
