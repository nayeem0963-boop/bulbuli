/**
 * Animals that walk (rendering/AmazonFauna.jsx draws them, ExplorerController.jsx moves their
 * solid bodies): a pure function of time, so what is seen and what Bulbuli bumps into are the
 * same animal in the same place.
 *
 * An animal with room (`animal.roam`, metres, chosen in biomes/amazon.js so that the whole walk
 * stays inside the clearing kept for it) walks a slow circle of that radius round its resting
 * place, in bursts: it walks a few seconds, stands a few more (and then sniffs and looks about, as
 * rendering/amazonFaunaMotion.js has it), and walks on. Legs swing in a diagonal gait whose pace
 * follows the ground speed, so the feet do not slide.
 */
const TAU = Math.PI * 2

/** speed: m/s along the path; swing: how far a leg swings from the hip, radians; roam: the largest walk. */
export const WALKERS = Object.freeze({
  capybara: { speed: 0.35, swing: 0.5, roam: 0.9 },
  jaguar: { speed: 0.55, swing: 0.45, roam: 1.1 },
  tapir: { speed: 0.4, swing: 0.4, roam: 1.0 },
  anteater: { speed: 0.35, swing: 0.4, roam: 0.9 },
  coati: { speed: 0.5, swing: 0.55, roam: 0.8 },
  agouti: { speed: 0.6, swing: 0.6, roam: 0.8 },
  armadillo: { speed: 0.3, swing: 0.45, roam: 0.8 },
  tortoise: { speed: 0.1, swing: 0.5, roam: 0.5 },
  caiman: { speed: 0.15, swing: 0.35, roam: 0.8 },
})

/** A walk shorter than this is not worth it: the animal stays where it stands. */
export const MIN_ROAM = 0.4

const smooth = (t) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c) }

/**
 * Where a walking animal is at time `t` (seconds): { x, z } in the world, `yaw` (the way it
 * faces; models face +z), `moving`, `amp` (0 standing .. 1 striding, easing in and out) and `wt`
 * (the time it has spent walking, which sets the legs' step). null if it does not walk.
 */
export function walkState(animal, t) {
  const kind = WALKERS[animal.type]
  const W = animal.roam
  if (!kind || !(W >= MIN_ROAM)) return null
  const seed = animal.seed
  const walking = 6 + (seed % 4)
  const resting = 3 + (seed % 3)
  const cycle = walking + resting
  const clock = t + ((seed * 1.9) % cycle)
  const laps = Math.floor(clock / cycle)
  const into = clock - laps * cycle
  const wt = laps * walking + Math.min(into, walking)
  const moving = into < walking
  const dir = seed % 2 ? 1 : -1
  const angle = seed * 0.7 + dir * (kind.speed / W) * wt
  const ramp = moving ? Math.min(smooth(into / 0.7), smooth((walking - into) / 0.7)) : 0
  return {
    x: animal.x + W * Math.cos(angle),
    z: animal.z + W * Math.sin(angle),
    // the way round the circle: its tangent
    yaw: Math.atan2(-dir * Math.sin(angle), dir * Math.cos(angle)),
    moving,
    amp: ramp,
    wt,
  }
}

/**
 * The swing of one leg (radians about the hip; positive swings the foot back): the diagonal pairs
 * (a foreleg and the opposite hind leg) move together, at the pace the ground speed asks of a
 * leg of that length. Also the body's bounce and sway.
 */
export function gait(animal, leg, state) {
  const kind = WALKERS[animal.type]
  const length = Math.max(0.05, leg.length)
  const rate = kind.speed / (4 * length * Math.sin(kind.swing)) // steps per second
  const turn = TAU * rate * state.wt
  const odd = (leg.front ? 0 : 1) + (leg.side > 0 ? 0 : 1)
  return {
    swing: state.amp * kind.swing * Math.sin(turn + Math.PI * (odd % 2)),
    bounce: state.amp * 0.012 * Math.abs(Math.sin(turn)),
    sway: state.amp * 0.03 * Math.sin(turn),
  }
}

/** Moves every walking animal's solid body to where it is drawn (the colliders carry `walker`). */
export function moveFauna(walkers, t) {
  for (const collider of walkers) {
    const state = walkState(collider.walker, t)
    if (!state) continue
    collider.x = state.x
    collider.z = state.z
  }
}
