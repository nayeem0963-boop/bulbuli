/**
 * The shapes of the Sahara's dunes and large rocks, as numbers: the single source for both what
 * is drawn (ExpeditionCanvas.jsx) and what Bulbuli stands on (common.js, drive.js). Pure, no
 * three.js. Keep the two in step by changing them only here.
 */

/** A dune is the top half of an ellipsoid: semi-axes (metres at scale 1), sunk a little into the sand. */
export const DUNE = Object.freeze({ halfLength: 5, height: 1.6, halfWidth: 3.5, sink: 0.2 })

/**
 * Height of a dune's surface at (x, z) relative to the dune's base, or -Infinity outside it.
 * @param dune  a `{ type: 'dune', x, z, y, scale }` prop
 */
export function duneHeightAt(dune, x, z) {
  const s = dune.scale ?? 1
  const q = ((x - dune.x) / (DUNE.halfLength * s)) ** 2 + ((z - dune.z) / (DUNE.halfWidth * s)) ** 2
  if (q >= 1) return -Infinity
  return (dune.y ?? 0) - DUNE.sink + DUNE.height * s * Math.sqrt(1 - q)
}

/** The circle (radius in metres) that contains a dune's footprint. */
export const duneReach = (dune) => DUNE.halfLength * (dune.scale ?? 1)

/**
 * A large rock is a squashed, turned ball: a 0.8 m icosphere scaled (1.2, 0.8, 1) x scale, its
 * centre 0.4 x scale above the ground.
 */
export const ROCK = Object.freeze({ radius: 0.8, stretch: [1.2, 0.8, 1], lift: 0.4 })

/** Height of a large rock's surface at (x, z), or -Infinity outside its outline. */
export function rockHeightAt(rock, x, z) {
  const s = rock.scale ?? 1
  const cos = Math.cos(rock.rot ?? 0)
  const sin = Math.sin(rock.rot ?? 0)
  const dx = x - rock.x
  const dz = z - rock.z
  // into the rock's own frame (the mesh is turned by `rot` about the vertical axis)
  const lx = dx * cos - dz * sin
  const lz = dx * sin + dz * cos
  const q = (lx / (ROCK.radius * ROCK.stretch[0] * s)) ** 2 + (lz / (ROCK.radius * ROCK.stretch[2] * s)) ** 2
  if (q >= 1) return -Infinity
  return (rock.y ?? 0) + ROCK.lift * s + ROCK.radius * ROCK.stretch[1] * s * Math.sqrt(1 - q)
}

/** The widest and narrowest half-widths of a large rock's outline. */
export const rockHalfWidths = (rock) => [ROCK.radius * ROCK.stretch[0] * (rock.scale ?? 1), ROCK.radius * ROCK.stretch[2] * (rock.scale ?? 1)]

/**
 * How close Bulbuli's body may come to a large rock's centre: between its narrow and wide
 * half-widths, so the bird neither walks into the rock's long side nor is held far off its short
 * side. (A rock is turned ellipse; its collider is a circle.)
 */
export const rockContactRadius = (rock) => 0.9 * (rock.scale ?? 1)

/**
 * The surface a rock offers Bulbuli: its rounded top as drawn, but nowhere lower than ROCK_STEP
 * above its base.
 *
 * The physics steps the bird up onto any surface within half a metre of its feet. A rock's rim
 * is lower than that, so with the bare shape a walking bird would sometimes hop up the stone and
 * sometimes be stopped by it, depending on where a frame happened to end. Keeping the surface
 * above that step makes every rock behave one way: walking stops at its outline, and its top is
 * reached by jumping or flying. The price is at the low shoulders (and all over the smallest
 * rocks, which are barely taller than the step): there the bird perches up to ROCK_STEP above
 * the sand, on stone that is narrower than its own body.
 */
export const ROCK_STEP = 0.55
export function rockTopAt(rock, x, z) {
  return Math.max(rockHeightAt(rock, x, z), (rock.y ?? 0) + ROCK_STEP)
}
