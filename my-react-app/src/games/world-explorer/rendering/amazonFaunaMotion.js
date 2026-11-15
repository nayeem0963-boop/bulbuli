/**
 * How the Amazon's animals move (rendering/AmazonFauna.jsx): a pure function of time. Each animal
 * keeps to the spot its collider is on, so all of it is body language, not travel: breathing,
 * looking round, sniffing, swaying, bobbing and preening, a frog's hop, a butterfly's flight.
 *
 * `poseAt(type, t, phase)` -> { x, y, z, yaw, pitch, roll, sx, sy, sz }: an offset from the
 * resting place (metres), turns (radians, `pitch` positive = nose down) and scales.
 * Deterministic; `phase` (any number, 0..2π is natural) keeps animals of one kind out of step.
 */
const TAU = Math.PI * 2
const wave = (t, hz, phase) => Math.sin(TAU * hz * t + phase)
/** 0..1 humps: zero most of the time, one smooth bump per `period` seconds. */
const bump = (t, period, phase, width = 0.25) => {
  const u = (((t / period + phase / TAU) % 1) + 1) % 1
  return u < width ? Math.sin(Math.PI * u / width) ** 2 : 0
}

const REST = Object.freeze({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, sx: 1, sy: 1, sz: 1 })

/** Four-legged grazers and foragers: breathe, look about slowly, lower the nose to sniff now and then. */
const forager = ({ look = 0.35, sniff = 0.1, period = 7, breath = 0.012 } = {}) => (t, p) => ({
  yaw: look * wave(t, 0.07, p) + 0.12 * wave(t, 0.19, p * 2),
  pitch: sniff * bump(t, period, p, 0.3),
  sy: 1 + breath * wave(t, 0.33, p),
  sx: 1 - breath * 0.5 * wave(t, 0.33, p),
})

/** Birds on a perch: little hops, quick turns of the whole bird, a preening dip. */
const perched = ({ turn = 0.7, dip = 0.35, period = 5, hop = 0.012 } = {}) => (t, p) => ({
  yaw: turn * (wave(t, 0.11, p) * 0.6 + Math.sign(wave(t, 0.23, p * 3)) * 0.4 * Math.min(1, Math.abs(wave(t, 0.23, p * 3)) * 6)),
  pitch: dip * bump(t, period, p, 0.18),
  y: hop * Math.abs(wave(t, 1.3, p)) * bump(t, 6, p * 2, 0.3),
  sy: 1 + 0.01 * wave(t, 0.8, p),
})

const MOTION = {
  capybara: forager({ look: 0.3, sniff: 0.1, period: 8 }),
  jaguar: forager({ look: 0.5, sniff: 0.07, period: 11, breath: 0.018 }),
  tapir: forager({ look: 0.3, sniff: 0.08, period: 9 }),
  anteater: forager({ look: 0.25, sniff: 0.1, period: 6 }),
  coati: forager({ look: 0.5, sniff: 0.14, period: 4.5, breath: 0.016 }),
  agouti: forager({ look: 0.6, sniff: 0.14, period: 3.5, breath: 0.02 }),
  armadillo: forager({ look: 0.2, sniff: 0.12, period: 6 }),
  tortoise: (t, p) => ({ yaw: 0.2 * wave(t, 0.03, p), sy: 1 + 0.01 * wave(t, 0.25, p) }),
  caiman: (t, p) => ({ yaw: 0.07 * wave(t, 0.05, p), roll: 0.015 * wave(t, 0.09, p), sy: 1 + 0.02 * wave(t, 0.2, p) }),
  // the coil turns slowly on the spot and swells as it breathes
  anaconda: (t, p) => ({ yaw: 0.12 * t + p, sy: 1 + 0.03 * wave(t, 0.22, p), sx: 1 + 0.015 * wave(t, 0.22, p), sz: 1 + 0.015 * wave(t, 0.22, p) }),
  // a hop every few seconds: up, a little forward, and a nose-down landing
  frog: (t, p) => {
    const u = bump(t, 4.2, p, 0.16)
    const hops = Math.floor(t / 4.2 + p / TAU)
    return { y: 0.12 * u, z: 0.03 * u, pitch: -0.5 * u, yaw: 0.5 * Math.sin(hops * 2.3 + p) }
  },
  // flies a slow circle above the ground, wings beating (the model's width is its wings)
  morpho: (t, p) => {
    const a = 0.7 * t + p
    const flap = 0.5 + 0.5 * Math.sin(TAU * 7 * t + p * 3)
    return { x: 0.4 * Math.cos(a), z: 0.4 * Math.sin(a), y: 0.38 + 0.12 * wave(t, 0.4, p), yaw: -a, roll: 0.25 * Math.cos(a), sx: 0.25 + 0.75 * flap, sy: 1 + 0.4 * (1 - flap) }
  },
  tarantula: (t, p) => ({ yaw: 0.35 * wave(t, 0.04, p), sy: 1 + 0.06 * bump(t, 5, p, 0.1), sx: 1 + 0.02 * wave(t, 0.4, p) }),
  capuchin: (t, p) => ({ yaw: 0.5 * wave(t, 0.1, p), roll: 0.05 * wave(t, 0.35, p), pitch: 0.12 * bump(t, 5, p, 0.2), y: 0.01 * Math.abs(wave(t, 0.9, p)) }),
  sloth: (t, p) => ({ yaw: 0.3 * wave(t, 0.035, p), roll: 0.045 * wave(t, 0.07, p), pitch: 0.05 * wave(t, 0.05, p + 1), sy: 1 + 0.015 * wave(t, 0.2, p) }),
  howler: (t, p) => ({ yaw: 0.3 * wave(t, 0.06, p), pitch: 0.06 * wave(t, 0.12, p) + 0.1 * bump(t, 9, p, 0.2), sy: 1 + 0.02 * wave(t, 0.3, p) }),
  macaw: perched({ turn: 0.8, dip: 0.4, period: 5, hop: 0.015 }),
  toucan: perched({ turn: 0.7, dip: 0.5, period: 4, hop: 0.012 }),
  // an eagle is mostly still: a slow turn of the head, now and then a shrug of the wings
  harpyEagle: (t, p) => ({ yaw: 0.4 * wave(t, 0.04, p), sx: 1 + 0.05 * bump(t, 12, p, 0.1), sy: 1 + 0.01 * wave(t, 0.25, p) }),
}

export const MOVING_KINDS = Object.freeze(Object.keys(MOTION))

export function poseAt(type, t, phase = 0) {
  const move = MOTION[type]
  return move ? { ...REST, ...move(t, phase) } : { ...REST }
}
