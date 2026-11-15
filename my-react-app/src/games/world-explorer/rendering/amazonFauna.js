/**
 * Rainforest animals for the Amazon map, as asset-free, vertex-coloured meshes (no model files,
 * nothing to download or license): capybara, jaguar, tapir, giant anteater, coati, black caiman,
 * green anaconda, red-footed tortoise, poison dart frog, blue morpho butterfly, capuchin monkey,
 * three-toed sloth, scarlet macaw, toco toucan, agouti, giant armadillo, goliath tarantula,
 * red howler monkey and harpy eagle.
 *
 * They are statues: no animation, each caught in a pose. Every model faces +z with its feet (or
 * belly) on y = 0 and is built in metres at life size. Where each one stands, and how solid it is,
 * is the map's business (biomes/amazon.js `fauna`, biomes/common.js); the sizes the colliders rely
 * on are in AMAZON_FAUNA and checked in amazonFauna.test.js.
 *
 * Pure geometry, deterministic (seeded): rendering/AmazonFaunaView.jsx draws it.
 */
import { mulberry32 } from '../../../core/rng.js'
import { bezier, blob, createBuilder, cubic, leaf, linear, tube, v } from './mangroveGeometry.js'
import { finish } from './saharaLandmarks.js'

/**
 * `radius`/`top`: the cylinder the map makes solid (centred on the model's origin).
 * `ground`: stands on the forest floor; `perch`: sits on a branch or platform.
 */
export const AMAZON_FAUNA = Object.freeze({
  capybara: { radius: 0.5, top: 0.55, length: 1.1, perch: false },
  jaguar: { radius: 0.62, top: 0.78, length: 1.5, perch: false },
  tapir: { radius: 0.62, top: 1.0, length: 1.9, perch: false },
  anteater: { radius: 0.6, top: 0.78, length: 2.1, perch: false },
  coati: { radius: 0.38, top: 0.6, length: 1.0, perch: false },
  caiman: { radius: 0.62, top: 0.34, length: 2.6, perch: false },
  anaconda: { radius: 0.62, top: 0.34, length: 2.2, perch: false },
  tortoise: { radius: 0.3, top: 0.3, length: 0.5, perch: false },
  frog: { radius: 0.1, top: 0.1, length: 0.12, perch: false },
  morpho: { radius: 0.12, top: 0.14, length: 0.15, perch: false },
  capuchin: { radius: 0.24, top: 0.5, length: 0.6, perch: true },
  sloth: { radius: 0.3, top: 0.62, length: 0.7, perch: true },
  macaw: { radius: 0.2, top: 0.82, length: 0.85, perch: true },
  toucan: { radius: 0.2, top: 0.6, length: 0.62, perch: true },
  agouti: { radius: 0.3, top: 0.42, length: 0.55, perch: false },
  armadillo: { radius: 0.5, top: 0.5, length: 1.3, perch: false },
  tarantula: { radius: 0.12, top: 0.09, length: 0.2, perch: false },
  howler: { radius: 0.3, top: 0.72, length: 0.8, perch: true },
  harpyEagle: { radius: 0.3, top: 1.0, length: 0.9, perch: true },
})

const C = {
  fur: { capy: linear('#8a6a45'), capyDark: linear('#5e4630'), capyBelly: linear('#b89a6e') },
  jag: { gold: linear('#d79a3a'), dark: linear('#2a1a0e'), belly: linear('#f1e2c0') },
  tapir: { grey: linear('#4a4640'), pale: linear('#d9d3c4'), dark: linear('#2c2a27') },
  ant: { grey: linear('#7d756a'), dark: linear('#1f1a17'), pale: linear('#d8d2c2'), claw: linear('#e8e0cf') },
  coati: { rust: linear('#9a5a2c'), dark: linear('#3a2616'), pale: linear('#efe3c8') },
  caiman: { dark: linear('#2d3a2a'), mid: linear('#4a5a3a'), belly: linear('#b5b58a'), eye: linear('#d6a21e') },
  snake: { green: linear('#4a6a2a'), dark: linear('#1f3516'), spot: linear('#16200f'), belly: linear('#b5b070') },
  tort: { shell: linear('#5a3a26'), plate: linear('#8a6542'), skin: linear('#a39a82'), red: linear('#c33a2a') },
  frog: { blue: linear('#2f6bc4'), black: linear('#101216'), yellow: linear('#f0c43a') },
  morpho: { blue: linear('#2f8cff'), edge: linear('#0b1b33'), body: linear('#2a1b12') },
  monkey: { cream: linear('#e6d6b0'), brown: linear('#4a3322'), cap: linear('#2a1d14') },
  sloth: { fur: linear('#9b8d6f'), dark: linear('#5a4d3a'), face: linear('#d8cdb0'), mask: linear('#3a2e22'), claw: linear('#e8e0cf') },
  macaw: { red: linear('#d9261c'), yellow: linear('#f2c21f'), blue: linear('#1f5fc4'), white: linear('#f2eee4'), beak: linear('#efe6d2'), beakDark: linear('#241c18'), leg: linear('#4a4440') },
  toucan: { black: linear('#14120f'), white: linear('#f4efe2'), bill: linear('#f08a1c'), billTip: linear('#1a1410'), blue: linear('#4aa3d6'), red: linear('#d6321e') },
  agouti: { orange: linear('#b8742a'), dark: linear('#5a3a1c'), pale: linear('#e8d3a0') },
  arma: { shell: linear('#4a3a30'), band: linear('#7a6252'), skin: linear('#b09a88'), claw: linear('#efe6d2') },
  tarantula: { brown: linear('#4a3322'), dark: linear('#241810'), hair: linear('#8a5a30') },
  howler: { black: linear('#1c1410'), red: linear('#8a3a1a'), face: linear('#2a1d16') },
  harpy: { grey: linear('#6a707a'), dark: linear('#262a30'), white: linear('#eeeae0'), beak: linear('#2a2a2c'), leg: linear('#d8c24a'), claw: linear('#1a1a1c') },
  eye: linear('#100c0a'),
  shine: linear('#ffffff'),
}

const mirror = [-1, 1]

function kit(seed) {
  const random = mulberry32(seed)
  const b = createBuilder()
  const mass = (center, radius, scale, light, dark, { detail = 2, lumpy = 0.03 } = {}) => blob(b, center, radius, scale, { detail, random, light, dark, lumpy })
  const eye = (x, y, z, size = 0.016) => {
    mass(v(x, y, z), size, [1, 1, 0.8], C.eye, C.eye, { detail: 1, lumpy: 0 })
    mass(v(x + Math.sign(x) * size * 0.35, y + size * 0.4, z + size * 0.4), size * 0.28, [1, 1, 1], C.shine, C.shine, { detail: 0, lumpy: 0 })
  }
  /** A leg from the body down to a foot with a padded sole. */
  const leg = (hip, knee, foot, widths, base, tip, pad = tip.clone().multiplyScalar(0.7), padSize = 0.05) => {
    tube(b, [hip, knee, foot], widths, { segments: 6, base, tip, random, mottle: 0.04, cap: false })
    mass(v(foot.x, Math.max(foot.y, padSize * 0.5), foot.z + padSize * 0.5), padSize, [1, 0.55, 1.3], pad, pad, { detail: 1, lumpy: 0 })
  }
  return { random, b, mass, eye, leg }
}

/* ------------------------------------------------------------------ ground mammals */

export function createCapybaraGeometry(seed = 1) {
  const { b, mass, eye, leg, random } = kit(seed)
  const { capy, capyDark, capyBelly } = C.fur
  // a big barrel on short legs, a blunt square head with the nostrils high up
  mass(v(0, 0.33, -0.05), 0.33, [0.78, 0.8, 1.45], capy, capyDark.clone().lerp(capy, 0.4), { lumpy: 0.025 })
  mass(v(0, 0.26, 0.05), 0.26, [0.8, 0.7, 1.3], capyBelly, capyBelly.clone().multiplyScalar(0.7), { detail: 1 })
  for (const s of mirror) {
    leg(v(s * 0.17, 0.26, 0.3), v(s * 0.18, 0.15, 0.32), v(s * 0.18, 0.02, 0.34), [0.07, 0.055, 0.045], capy, capyDark)
    leg(v(s * 0.17, 0.26, -0.4), v(s * 0.18, 0.14, -0.42), v(s * 0.18, 0.02, -0.4), [0.08, 0.06, 0.045], capy, capyDark)
  }
  mass(v(0, 0.42, 0.5), 0.2, [0.85, 0.95, 1.2], capy, capyDark, { detail: 2 })
  mass(v(0, 0.4, 0.66), 0.13, [0.9, 0.85, 1.1], capyDark, capyDark.clone().multiplyScalar(0.7), { detail: 1 })
  for (const s of mirror) {
    eye(s * 0.1, 0.5, 0.58, 0.018)
    leaf(b, v(s * 0.1, 0.55, 0.4), v(s * 0.5, 1, -0.3), 0.06, 0.04, capyDark, capyDark, { droop: 0 })
    mass(v(s * 0.04, 0.46, 0.76), 0.012, [1, 1, 1], C.eye, C.eye, { detail: 0, lumpy: 0 })
  }
  void random
  return finish(b)
}

export function createJaguarGeometry(seed = 2) {
  const { b, mass, eye, leg, random } = kit(seed)
  const { gold, dark, belly } = C.jag
  // a muscular cat standing, head low and level, long tail curving up at the tip
  mass(v(0, 0.58, -0.05), 0.3, [0.62, 0.62, 1.7], gold, gold.clone().lerp(belly, 0.5), { lumpy: 0.02 })
  mass(v(0, 0.62, 0.34), 0.25, [0.78, 0.85, 0.95], gold, gold.clone().multiplyScalar(0.85), { detail: 1 })
  mass(v(0, 0.58, -0.45), 0.24, [0.8, 0.85, 0.95], gold, gold.clone().multiplyScalar(0.85), { detail: 1 })
  for (const s of mirror) {
    leg(v(s * 0.15, 0.5, 0.36), v(s * 0.16, 0.26, 0.38), v(s * 0.16, 0.03, 0.4), [0.095, 0.07, 0.06], gold, belly, dark.clone().lerp(gold, 0.4), 0.06)
    leg(v(s * 0.16, 0.52, -0.46), v(s * 0.2, 0.28, -0.52), v(s * 0.17, 0.03, -0.44), [0.1, 0.07, 0.06], gold, belly, dark.clone().lerp(gold, 0.4), 0.06)
  }
  tube(b, cubic(v(0, 0.62, 0.52), v(0, 0.66, 0.66), v(0, 0.58, 0.74), v(0, 0.54, 0.86), 4), [0.14, 0.13, 0.12, 0.1, 0.08], { segments: 7, base: gold, tip: gold })
  mass(v(0, 0.56, 0.9), 0.145, [1, 0.9, 1], gold, gold.clone().multiplyScalar(0.9), { detail: 2 })
  mass(v(0, 0.5, 1.03), 0.07, [1.05, 0.8, 1], belly, belly.clone().multiplyScalar(0.8), { detail: 1 })
  mass(v(0, 0.53, 1.09), 0.022, [1.2, 0.8, 0.8], C.eye, C.eye, { detail: 0, lumpy: 0 })
  for (const s of mirror) {
    mass(v(s * 0.1, 0.69, 0.84), 0.045, [0.9, 1, 0.6], gold, dark, { detail: 1, lumpy: 0 })
    eye(s * 0.09, 0.6, 0.99, 0.017)
  }
  tube(b, cubic(v(0, 0.6, -0.7), v(0, 0.5, -1.0), v(0, 0.2, -1.1), v(0, 0.5, -1.3), 8), [0.06, 0.055, 0.05, 0.048, 0.045, 0.042, 0.04, 0.036, 0.034], { segments: 6, base: gold, tip: dark })
  // rosettes: dark rings on the flank and back, dark dots on the legs and head
  for (let i = 0; i < 34; i += 1) {
    const z = -0.7 + random() * 1.25
    const s = random() < 0.5 ? -1 : 1
    const around = (random() - 0.2) * 1.25
    const x = Math.sin(around) * 0.2 * s
    const y = 0.58 + Math.cos(around) * 0.2
    mass(v(s * Math.abs(x) * 0.93, y - 0.01, z), 0.018 + random() * 0.012, [1, 1, 0.8], dark, dark, { detail: 0, lumpy: 0 })
  }
  return finish(b)
}

export function createTapirGeometry(seed = 3) {
  const { b, mass, eye, leg } = kit(seed)
  const { grey, pale, dark } = C.tapir
  // a pig-like barrel, a pale-tipped round ear, and the short trunk-like snout
  mass(v(0, 0.66, -0.05), 0.4, [0.7, 0.88, 1.3], grey, grey.clone().multiplyScalar(0.7), { lumpy: 0.02 })
  mass(v(0, 0.78, -0.4), 0.32, [0.8, 0.9, 0.95], grey, dark, { detail: 1 })
  for (const s of mirror) {
    leg(v(s * 0.2, 0.5, 0.42), v(s * 0.22, 0.26, 0.45), v(s * 0.22, 0.03, 0.47), [0.1, 0.075, 0.065], grey, dark, dark, 0.07)
    leg(v(s * 0.2, 0.5, -0.5), v(s * 0.22, 0.28, -0.55), v(s * 0.22, 0.03, -0.52), [0.11, 0.08, 0.065], grey, dark, dark, 0.07)
  }
  mass(v(0, 0.88, 0.72), 0.22, [0.85, 1.0, 1.1], grey, grey.clone().multiplyScalar(0.8), { detail: 2 })
  // snout: a flexible nose hanging past the mouth
  tube(b, [v(0, 0.88, 0.85), v(0, 0.84, 1.0), v(0, 0.74, 1.12), v(0, 0.66, 1.2)], [0.1, 0.085, 0.07, 0.055], { segments: 7, base: grey, tip: dark })
  mass(v(0, 0.64, 1.21), 0.05, [1, 0.8, 1], dark, dark, { detail: 1, lumpy: 0 })
  for (const s of mirror) {
    mass(v(s * 0.14, 1.04, 0.6), 0.07, [0.6, 1, 0.8], grey, pale, { detail: 1, lumpy: 0 })
    eye(s * 0.14, 0.94, 0.8, 0.017)
  }
  // a short mane, and a stub tail
  tube(b, bezier(v(0, 0.98, 0.5), v(0, 1.04, 0.1), v(0, 0.98, -0.3), 5), [0.06, 0.07, 0.07, 0.06, 0.05, 0.04], { segments: 6, base: dark, tip: grey })
  mass(v(0, 0.7, -0.85), 0.04, [1, 1.4, 1], dark, dark, { detail: 0, lumpy: 0 })
  // the pale band round the back half of a young tapir: here, a pale patch
  mass(v(0, 0.64, -0.45), 0.3, [0.74, 0.7, 0.8], pale, pale.clone().multiplyScalar(0.7), { detail: 1, lumpy: 0.02 })
  return finish(b)
}

export function createAnteaterGeometry(seed = 4) {
  const { b, mass, eye, leg } = kit(seed)
  const { grey, dark, pale, claw } = C.ant
  // a long tube of a snout, a black diagonal stripe over the shoulder, a huge bushy tail
  mass(v(0, 0.55, 0.0), 0.3, [0.62, 0.72, 1.45], grey, grey.clone().multiplyScalar(0.7), { lumpy: 0.04 })
  mass(v(0, 0.52, 0.4), 0.22, [0.7, 0.78, 0.9], grey, grey.clone().multiplyScalar(0.8), { detail: 1, lumpy: 0.03 })
  for (const s of mirror) {
    leg(v(s * 0.13, 0.4, 0.42), v(s * 0.14, 0.2, 0.44), v(s * 0.14, 0.03, 0.5), [0.08, 0.06, 0.05], dark, pale, pale, 0.06)
    leg(v(s * 0.14, 0.4, -0.4), v(s * 0.15, 0.2, -0.44), v(s * 0.15, 0.03, -0.42), [0.08, 0.06, 0.05], dark, pale, pale, 0.06)
    for (const k of [-1, 0, 1]) tube(b, [v(s * 0.14 + k * 0.016, 0.05, 0.52), v(s * 0.14 + k * 0.02, 0.012, 0.6)], [0.011, 0.003], { segments: 4, base: claw })
  }
  tube(b, bezier(v(0, 0.58, 0.55), v(0, 0.56, 0.86), v(0, 0.38, 1.16), 6), [0.13, 0.1, 0.085, 0.07, 0.06, 0.05, 0.04], { segments: 7, base: grey, tip: dark })
  mass(v(0, 0.52, 0.55), 0.13, [0.9, 0.95, 1.1], grey, dark, { detail: 1, lumpy: 0.02 })
  for (const s of mirror) {
    eye(s * 0.07, 0.62, 0.56, 0.014)
    mass(v(s * 0.08, 0.7, 0.4), 0.04, [0.8, 1, 0.8], grey, dark, { detail: 0, lumpy: 0 })
  }
  // the black-and-white shoulder stripe
  for (let i = 0; i < 6; i += 1) {
    const t = i / 5
    mass(v(0.0, 0.7 - t * 0.12, 0.18 - t * 0.24), 0.1, [1.25, 0.6, 0.55], dark, dark, { detail: 1, lumpy: 0.02 })
  }
  // bushy tail
  for (let i = 0; i < 7; i += 1) {
    const t = i / 6
    mass(v(0, 0.52 - t * 0.2 + Math.sin(t * 2.4) * 0.02, -0.5 - t * 0.78), 0.13 - t * 0.04, [0.8, 1.45 - t * 0.2, 1.15], grey, dark, { detail: 1, lumpy: 0.07 })
  }
  return finish(b)
}

export function createCoatiGeometry(seed = 5) {
  const { b, mass, eye, leg } = kit(seed)
  const { rust, dark, pale } = C.coati
  // slender, long ringed tail held straight up, a long flexible snout
  mass(v(0, 0.26, -0.02), 0.2, [0.55, 0.6, 1.5], rust, rust.clone().multiplyScalar(0.7), { lumpy: 0.03 })
  for (const s of mirror) {
    leg(v(s * 0.08, 0.2, 0.2), v(s * 0.09, 0.1, 0.22), v(s * 0.09, 0.015, 0.26), [0.04, 0.03, 0.028], dark, dark, dark, 0.035)
    leg(v(s * 0.08, 0.2, -0.22), v(s * 0.09, 0.1, -0.24), v(s * 0.09, 0.015, -0.22), [0.04, 0.03, 0.028], dark, dark, dark, 0.035)
  }
  mass(v(0, 0.34, 0.3), 0.1, [0.85, 0.9, 1.1], rust, dark, { detail: 2 })
  tube(b, [v(0, 0.33, 0.36), v(0, 0.32, 0.46), v(0, 0.3, 0.54)], [0.055, 0.04, 0.025], { segments: 6, base: pale, tip: dark })
  for (const s of mirror) {
    mass(v(s * 0.05, 0.4, 0.28), 0.03, [0.8, 1, 0.8], dark, dark, { detail: 0, lumpy: 0 })
    eye(s * 0.055, 0.36, 0.36, 0.011)
  }
  const rings = 9
  for (let i = 0; i < rings; i += 1) {
    const t = i / (rings - 1)
    const p = v(0, 0.3 + t * 0.3, -0.26 - Math.sin(t * 1.8) * 0.16)
    const colour = i % 2 ? dark : pale.clone().lerp(rust, 0.5)
    mass(p, 0.05 - t * 0.012, [1, 0.95, 1], colour, colour.clone().multiplyScalar(0.7), { detail: 1, lumpy: 0.01 })
  }
  return finish(b)
}

/* ------------------------------------------------------------------ reptiles and amphibians */

export function createCaimanGeometry(seed = 6) {
  const { b, mass, leg, random } = kit(seed)
  const { dark, mid, belly, eye: gold } = C.caiman
  // low and long: a flat armoured back with ridges, a broad snout, a tail ending in a gentle curve
  const spine = cubic(v(0, 0.17, 0.5), v(0, 0.2, 0.0), v(0, 0.2, -0.6), v(0, 0.1, -1.1), 10)
  tube(b, spine, [0.12, 0.16, 0.19, 0.2, 0.18, 0.15, 0.13, 0.1, 0.08, 0.05, 0.03], { segments: 8, base: mid, tip: dark, random, mottle: 0.12, noise: 0.1 })
  tube(b, cubic(v(0, 0.1, -1.0), v(0, 0.09, -1.3), v(0.25, 0.08, -1.5), v(0.5, 0.07, -1.75), 6), [0.07, 0.055, 0.045, 0.035, 0.025, 0.015, 0.006], { segments: 6, base: dark, tip: dark, random, mottle: 0.1 })
  // head and snout, jaw line paler underneath
  mass(v(0, 0.18, 0.62), 0.14, [1.0, 0.7, 1.3], mid, dark, { detail: 2 })
  tube(b, [v(0, 0.16, 0.7), v(0, 0.14, 0.96), v(0, 0.12, 1.2)], [0.11, 0.095, 0.075], { segments: 8, base: mid, tip: dark, random, mottle: 0.08 })
  mass(v(0, 0.065, 0.95), 0.075, [1.2, 0.35, 3.6], belly, belly, { detail: 1, lumpy: 0 })
  for (const s of mirror) {
    mass(v(s * 0.1, 0.285, 0.62), 0.04, [1, 0.8, 1.2], dark, mid, { detail: 1, lumpy: 0 })
    mass(v(s * 0.1, 0.305, 0.65), 0.018, [1, 1.5, 0.5], gold, gold, { detail: 0, lumpy: 0 })
    leg(v(s * 0.2, 0.14, 0.32), v(s * 0.38, 0.08, 0.38), v(s * 0.36, 0.015, 0.5), [0.06, 0.045, 0.035], mid, dark, dark, 0.05)
    leg(v(s * 0.22, 0.14, -0.4), v(s * 0.4, 0.08, -0.44), v(s * 0.36, 0.015, -0.56), [0.065, 0.05, 0.035], mid, dark, dark, 0.05)
  }
  // a row of bony ridges along the back
  for (let i = 0; i < 11; i += 1) {
    const t = i / 10
    const z = 0.42 - t * 1.5
    const y = 0.17 + 0.05 + Math.sin(t * Math.PI) * 0.03 - t * 0.08
    tube(b, [v(0, y - 0.03, z), v(0, y + 0.035, z - 0.01)], [0.035, 0.004], { segments: 4, base: mid, tip: dark })
  }
  return finish(b)
}

export function createAnacondaGeometry(seed = 7) {
  const { b, mass, eye, random } = kit(seed)
  const { green, dark, spot, belly } = C.snake
  // a thick coil of three turns, the head resting on top with the neck raised a little
  const path = []
  const turns = 2.6
  const steps = 52
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const a = t * turns * Math.PI * 2
    const r = 0.5 - t * 0.12
    path.push(v(Math.cos(a) * r, 0.1 + t * 0.14 + Math.sin(t * 40) * 0.004, Math.sin(a) * r))
  }
  const girth = path.map((_, i) => 0.095 * (1 - Math.max(0, (i - 40) / 12) * 0.2))
  tube(b, path, girth, { segments: 8, base: dark, tip: green, random, mottle: 0.1 })
  // big dark blotches along the back
  for (let i = 2; i < path.length - 4; i += 3) {
    const p = path[i]
    mass(v(p.x, p.y + girth[i] * 0.85, p.z), 0.05, [1, 0.35, 1], spot, spot, { detail: 0, lumpy: 0 })
  }
  // head: lifted off the top of the coil, a flat wedge with a pale throat
  const tail = path[path.length - 1]
  const neck = [tail, v(tail.x * 0.6, tail.y + 0.13, tail.z * 0.6 + 0.12), v(0.04, 0.34, 0.1), v(0, 0.4, 0.22)]
  tube(b, neck, [0.09, 0.075, 0.065, 0.06], { segments: 8, base: green, tip: green, random, mottle: 0.08 })
  mass(v(0, 0.4, 0.3), 0.075, [0.95, 0.55, 1.45], green, dark, { detail: 2, lumpy: 0.02 })
  mass(v(0, 0.36, 0.32), 0.06, [0.9, 0.3, 1.4], belly, belly, { detail: 1, lumpy: 0 })
  for (const s of mirror) eye(s * 0.05, 0.43, 0.32, 0.013)
  // the start of the snake peeks from under the coil as the tail tip
  tube(b, [path[0], v(0.58, 0.06, 0.1), v(0.7, 0.04, 0.28)], [0.095, 0.05, 0.012], { segments: 7, base: green, tip: dark })
  return finish(b)
}

export function createTortoiseGeometry(seed = 8) {
  const { b, mass, eye, leg, random } = kit(seed)
  const { shell, plate, skin, red } = C.tort
  // domed shell of plates over a head with red scales and four sturdy legs
  mass(v(0, 0.17, 0), 0.2, [0.95, 0.8, 1.2], plate, shell, { detail: 2, lumpy: 0.02 })
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2
    mass(v(Math.cos(a) * 0.1, 0.2 + Math.sin(i * 1.7) * 0.01, Math.sin(a) * 0.14), 0.05, [1, 0.35, 1], shell, shell.clone().multiplyScalar(0.6), { detail: 0, lumpy: 0 })
  }
  for (const s of mirror) {
    leg(v(s * 0.16, 0.12, 0.14), v(s * 0.19, 0.07, 0.16), v(s * 0.19, 0.012, 0.18), [0.045, 0.04, 0.035], skin, red, skin, 0.035)
    leg(v(s * 0.16, 0.12, -0.14), v(s * 0.19, 0.07, -0.16), v(s * 0.19, 0.012, -0.14), [0.045, 0.04, 0.035], skin, red, skin, 0.035)
  }
  tube(b, [v(0, 0.12, 0.2), v(0, 0.14, 0.3), v(0, 0.15, 0.36)], [0.05, 0.04, 0.035], { segments: 6, base: skin, tip: skin, random })
  mass(v(0, 0.15, 0.38), 0.045, [0.9, 0.85, 1.15], red, skin, { detail: 1, lumpy: 0 })
  for (const s of mirror) eye(s * 0.028, 0.17, 0.4, 0.008)
  void b
  return finish(b)
}

export function createFrogGeometry(seed = 9) {
  const { b, mass, eye, random } = kit(seed)
  const { blue, black, yellow } = C.frog
  // a blue-and-black dart frog crouched on a small leaf
  leaf(b, v(0, 0.004, -0.08), v(0, 0.05, 1), 0.2, 0.07, linear('#2f6a2a'), linear('#4a8a3a'), { droop: 0.05, fold: 0.2, curl: 0 })
  mass(v(0, 0.035, 0), 0.04, [0.9, 0.75, 1.25], blue, blue.clone().multiplyScalar(0.7), { detail: 2, lumpy: 0 })
  mass(v(0, 0.05, 0.035), 0.028, [1, 0.8, 1], blue, blue, { detail: 1, lumpy: 0 })
  for (let i = 0; i < 9; i += 1) mass(v((random() - 0.5) * 0.05, 0.06 + random() * 0.005, -0.02 + random() * 0.07), 0.007 + random() * 0.004, [1, 0.6, 1], black, black, { detail: 0, lumpy: 0 })
  for (const s of mirror) {
    mass(v(s * 0.02, 0.07, 0.06), 0.011, [1, 1, 1], yellow, yellow, { detail: 1, lumpy: 0 })
    eye(s * 0.022, 0.066, 0.062, 0.008)
    mass(v(s * 0.04, 0.014, -0.03), 0.022, [0.5, 0.5, 1.3], blue, black, { detail: 1, lumpy: 0 })
    mass(v(s * 0.03, 0.01, 0.07), 0.012, [1, 0.5, 1.4], black, black, { detail: 0, lumpy: 0 })
  }
  return finish(b)
}

/* ------------------------------------------------------------------ insects */

/** A blue morpho, wings open, resting on a leaf. */
export function createMorphoGeometry(seed = 10) {
  const { b, mass } = kit(seed)
  const { blue, edge, body } = C.morpho
  leaf(b, v(0, 0.002, -0.09), v(0, 0.05, 1), 0.2, 0.08, linear('#2f6a2a'), linear('#4a8a3a'), { droop: 0.04, fold: 0.2, curl: 0 })
  mass(v(0, 0.045, 0), 0.01, [1, 1, 4.5], body, body, { detail: 1, lumpy: 0 })
  for (const s of mirror) {
    // each side: a big forewing (up and back) and a smaller hindwing, with dark edges
    const wing = (root, tip, width, bend) => {
      const mid = v((root.x + tip.x) / 2, (root.y + tip.y) / 2 + bend, (root.z + tip.z) / 2)
      b.triangle(root, mid, v(tip.x, tip.y, tip.z + width), edge, blue, edge)
      b.triangle(root, v(tip.x, tip.y, tip.z - width), mid, edge, edge, blue)
      b.triangle(mid, v(tip.x, tip.y, tip.z + width), v(tip.x, tip.y, tip.z - width), blue, edge, edge)
    }
    wing(v(s * 0.004, 0.05, 0.012), v(s * 0.115, 0.1, 0.04), 0.045, 0.02)
    wing(v(s * 0.004, 0.05, -0.006), v(s * 0.09, 0.085, -0.06), 0.035, 0.015)
  }
  tube(b, [v(0.004, 0.05, 0.03), v(0.02, 0.07, 0.08)], [0.0012, 0.0008], { segments: 3, base: body })
  tube(b, [v(-0.004, 0.05, 0.03), v(-0.02, 0.07, 0.08)], [0.0012, 0.0008], { segments: 3, base: body })
  return finish(b)
}

/* ------------------------------------------------------------------ perching animals */

export function createCapuchinGeometry(seed = 11) {
  const { b, mass, eye, random } = kit(seed)
  const { cream, brown, cap } = C.monkey
  // sitting on its haunches, one arm raised to the branch, a long tail curling round
  mass(v(0, 0.24, 0), 0.17, [0.8, 1.05, 0.9], brown, brown.clone().multiplyScalar(0.7), { detail: 2, lumpy: 0.04 })
  mass(v(0, 0.24, 0.08), 0.12, [0.8, 1, 0.7], cream, cream.clone().multiplyScalar(0.7), { detail: 1 })
  mass(v(0, 0.08, -0.04), 0.14, [1.0, 0.55, 1.1], brown, brown, { detail: 1 })
  for (const s of mirror) {
    tube(b, [v(s * 0.1, 0.34, 0.03), v(s * 0.15, 0.22, 0.12), v(s * 0.12, 0.1, 0.18)], [0.04, 0.032, 0.026], { segments: 6, base: brown, tip: brown, random, mottle: 0.05 })
    mass(v(s * 0.12, 0.085, 0.19), 0.03, [1, 0.7, 1.2], cap, cap, { detail: 1, lumpy: 0 })
    tube(b, [v(s * 0.09, 0.1, 0.0), v(s * 0.15, 0.06, 0.1), v(s * 0.13, 0.015, 0.16)], [0.045, 0.034, 0.03], { segments: 6, base: brown, tip: brown, random })
  }
  mass(v(0, 0.46, 0.06), 0.09, [1, 1, 1], cream, cream.clone().multiplyScalar(0.8), { detail: 2, lumpy: 0.01 })
  mass(v(0, 0.5, 0.04), 0.075, [1.05, 0.6, 1.1], cap, cap, { detail: 1, lumpy: 0 })
  mass(v(0, 0.425, 0.13), 0.04, [1, 0.8, 0.8], brown.clone().lerp(cream, 0.4), brown, { detail: 1, lumpy: 0 })
  for (const s of mirror) {
    eye(s * 0.04, 0.46, 0.125, 0.012)
    mass(v(s * 0.09, 0.47, 0.04), 0.025, [0.6, 1, 0.8], cream, cap, { detail: 0, lumpy: 0 })
  }
  tube(b, cubic(v(0, 0.12, -0.14), v(0, 0.06, -0.4), v(0.18, 0.03, -0.46), v(0.22, 0.16, -0.36), 8), [0.036, 0.034, 0.03, 0.028, 0.026, 0.024, 0.022, 0.018, 0.012], { segments: 6, base: brown, tip: cap })
  return finish(b)
}

export function createSlothGeometry(seed = 12) {
  const { b, mass, eye, random } = kit(seed)
  const { fur, dark, face, mask, claw } = C.sloth
  // a shaggy round body hugging a bough, long arms ending in three hooked claws
  mass(v(0, 0.3, -0.02), 0.24, [0.95, 1.0, 1.05], fur, dark, { detail: 2, lumpy: 0.09 })
  mass(v(0, 0.15, 0.03), 0.2, [1.0, 0.75, 1.1], fur, dark, { detail: 2, lumpy: 0.08 })
  for (const s of mirror) {
    const hand = v(s * 0.2, 0.52, 0.34)
    tube(b, [v(s * 0.2, 0.36, 0.08), v(s * 0.3, 0.4, 0.22), hand], [0.07, 0.06, 0.05], { segments: 6, base: fur, tip: dark, random, mottle: 0.1 })
    for (const k of [-1, 0, 1]) tube(b, [v(hand.x + k * 0.025, hand.y, hand.z), v(hand.x + k * 0.03, hand.y + 0.09, hand.z + 0.07)], [0.012, 0.003], { segments: 4, base: claw })
    const foot = v(s * 0.18, 0.04, 0.2)
    tube(b, [v(s * 0.16, 0.18, -0.12), v(s * 0.24, 0.1, 0.05), foot], [0.07, 0.055, 0.045], { segments: 6, base: fur, tip: dark, random })
    for (const k of [-1, 0, 1]) tube(b, [v(foot.x + k * 0.025, foot.y, foot.z), v(foot.x + k * 0.03, 0.0, foot.z + 0.07)], [0.012, 0.003], { segments: 4, base: claw })
  }
  // head: pale, with the dark eye-stripe that makes a sloth look like it is smiling
  mass(v(0, 0.5, 0.16), 0.115, [1, 0.95, 0.95], fur, fur.clone().multiplyScalar(0.8), { detail: 2, lumpy: 0.07 })
  mass(v(0, 0.48, 0.23), 0.085, [1.0, 0.9, 0.8], face, face.clone().multiplyScalar(0.8), { detail: 2, lumpy: 0.01 })
  for (const s of mirror) {
    mass(v(s * 0.04, 0.5, 0.29), 0.028, [1.3, 0.5, 0.5], mask, mask, { detail: 1, lumpy: 0 })
    eye(s * 0.042, 0.5, 0.3, 0.008)
  }
  mass(v(0, 0.455, 0.32), 0.022, [1, 0.8, 0.8], mask, mask, { detail: 1, lumpy: 0 })
  return finish(b)
}

export function createMacawGeometry(seed = 13) {
  const { b, mass, eye, random } = kit(seed)
  const { red, yellow, blue, white, beak, beakDark, leg } = C.macaw
  // a scarlet macaw perched upright: red body, yellow and blue wings, a very long tail
  mass(v(0, 0.42, 0), 0.15, [0.8, 1.35, 0.85], red, red.clone().multiplyScalar(0.75), { detail: 2, lumpy: 0.015 })
  for (const s of mirror) {
    leaf(b, v(s * 0.1, 0.52, -0.02), v(s * 0.15, -1, -0.5), 0.34, 0.09, yellow, blue, { droop: 0.02, fold: 0.1, curl: 0.05, roll: s * 0.12 })
    leaf(b, v(s * 0.11, 0.5, -0.03), v(s * 0.08, -1, -0.6), 0.34, 0.07, blue, blue.clone().multiplyScalar(0.7), { droop: 0.02, fold: 0.1, curl: 0.05 })
    leaf(b, v(s * 0.08, 0.57, 0.0), v(s * 0.12, -0.6, -0.35), 0.2, 0.08, red, yellow, { droop: 0.02, fold: 0.1, curl: 0 })
    tube(b, [v(s * 0.04, 0.2, 0.0), v(s * 0.045, 0.1, 0.02), v(s * 0.05, 0.03, 0.05)], [0.016, 0.012, 0.01], { segments: 5, base: leg, tip: leg })
    for (const dz of [0.02, 0.05]) tube(b, [v(s * 0.05, 0.03, 0.05), v(s * 0.06 + dz * s, 0.008, 0.09 + dz)], [0.007, 0.003], { segments: 4, base: leg })
  }
  // tail: long red, blue tips
  for (const k of [-1, 0, 1]) leaf(b, v(k * 0.012, 0.28, -0.06), v(k * 0.06, -0.5, -1), 0.5 - Math.abs(k) * 0.06, 0.045, red, blue, { droop: 0.03, fold: 0.15, curl: 0.04, roll: k * 0.1 })
  tube(b, [v(0, 0.52, 0.04), v(0, 0.62, 0.07)], [0.07, 0.065], { segments: 7, base: red, tip: red })
  mass(v(0, 0.68, 0.08), 0.085, [0.95, 1.0, 1.0], red, red.clone().multiplyScalar(0.8), { detail: 2, lumpy: 0.01 })
  mass(v(0, 0.665, 0.13), 0.06, [1, 0.8, 0.7], white, white.clone().multiplyScalar(0.8), { detail: 1, lumpy: 0 })
  tube(b, bezier(v(0, 0.7, 0.15), v(0, 0.76, 0.24), v(0, 0.64, 0.27), 5), [0.05, 0.048, 0.04, 0.03, 0.02, 0.01], { segments: 6, base: beak, tip: beak })
  tube(b, [v(0, 0.64, 0.17), v(0, 0.62, 0.22), v(0, 0.6, 0.235)], [0.032, 0.026, 0.01], { segments: 5, base: beakDark, tip: beakDark })
  for (const s of mirror) eye(s * 0.055, 0.7, 0.12, 0.013)
  void random
  return finish(b)
}

export function createToucanGeometry(seed = 14) {
  const { b, mass, eye, random } = kit(seed)
  const { black, white, bill, billTip, blue, red } = C.toucan
  // toco toucan: a black body, a white throat, a huge orange bill with a black tip
  mass(v(0, 0.3, 0), 0.13, [0.8, 1.3, 0.9], black, black.clone().multiplyScalar(0.7), { detail: 2, lumpy: 0.015 })
  mass(v(0, 0.38, 0.06), 0.09, [0.9, 1.0, 0.7], white, white.clone().multiplyScalar(0.8), { detail: 1, lumpy: 0 })
  mass(v(0, 0.14, -0.06), 0.06, [1, 0.6, 1], red, red, { detail: 1, lumpy: 0 })
  for (const s of mirror) {
    leaf(b, v(s * 0.1, 0.4, -0.02), v(s * 0.12, -1, -0.5), 0.28, 0.08, black, black, { droop: 0.02, fold: 0.1, curl: 0.04, roll: s * 0.1 })
    tube(b, [v(s * 0.04, 0.14, 0.0), v(s * 0.045, 0.06, 0.02), v(s * 0.05, 0.02, 0.04)], [0.014, 0.011, 0.009], { segments: 5, base: blue.clone().multiplyScalar(0.8), tip: blue })
    for (const dz of [0.02, 0.05]) tube(b, [v(s * 0.05, 0.02, 0.04), v(s * 0.06 + dz * s, 0.006, 0.08 + dz)], [0.006, 0.003], { segments: 4, base: blue })
  }
  tube(b, [v(0, 0.14, -0.08), v(0, 0.07, -0.2), v(0, 0.06, -0.36)], [0.06, 0.05, 0.05], { segments: 6, base: black, tip: white })
  // the tail hangs below the perch height: its tip is lifted to stay above y = 0
  tube(b, [v(0, 0.4, 0.04), v(0, 0.5, 0.07)], [0.05, 0.05], { segments: 7, base: black, tip: black })
  mass(v(0, 0.54, 0.09), 0.07, [0.95, 1.0, 1.0], black, black, { detail: 2, lumpy: 0.01 })
  mass(v(0, 0.53, 0.12), 0.052, [1, 0.8, 0.7], white, white.clone().multiplyScalar(0.8), { detail: 1, lumpy: 0 })
  for (const s of mirror) {
    mass(v(s * 0.05, 0.57, 0.115), 0.025, [1, 1, 0.5], blue, blue, { detail: 1, lumpy: 0 })
    eye(s * 0.052, 0.57, 0.12, 0.011)
  }
  tube(b, bezier(v(0, 0.55, 0.15), v(0, 0.6, 0.28), v(0, 0.5, 0.4), 6), [0.052, 0.05, 0.04, 0.032, 0.024, 0.016, 0.006], { segments: 7, base: bill, tip: billTip })
  void random
  return finish(b)
}

/* ------------------------------------------------------------------ more ground animals */

export function createAgoutiGeometry(seed = 15) {
  const { b, mass, eye, leg } = kit(seed)
  const { orange, dark, pale } = C.agouti
  // a rabbit-sized rodent: high rump, slim legs, a small head with round ears
  mass(v(0, 0.26, -0.04), 0.17, [0.62, 0.8, 1.35], orange, dark, { lumpy: 0.03 })
  mass(v(0, 0.3, -0.18), 0.15, [0.7, 0.85, 0.95], orange, dark, { detail: 1 })
  mass(v(0, 0.19, 0.06), 0.13, [0.6, 0.6, 1.2], pale, pale.clone().multiplyScalar(0.7), { detail: 1 })
  for (const s of mirror) {
    leg(v(s * 0.07, 0.22, 0.14), v(s * 0.075, 0.12, 0.16), v(s * 0.075, 0.015, 0.2), [0.035, 0.026, 0.022], dark, dark, dark, 0.03)
    leg(v(s * 0.08, 0.26, -0.22), v(s * 0.1, 0.13, -0.26), v(s * 0.09, 0.015, -0.2), [0.05, 0.03, 0.022], orange, dark, dark, 0.035)
  }
  mass(v(0, 0.3, 0.26), 0.085, [0.85, 0.9, 1.15], orange, dark, { detail: 2 })
  mass(v(0, 0.265, 0.35), 0.045, [0.9, 0.8, 1], pale, orange, { detail: 1, lumpy: 0 })
  mass(v(0, 0.28, 0.395), 0.014, [1, 0.8, 0.8], C.eye, C.eye, { detail: 0, lumpy: 0 })
  for (const s of mirror) {
    mass(v(s * 0.05, 0.38, 0.22), 0.03, [0.45, 1, 0.8], orange, dark, { detail: 1, lumpy: 0 })
    eye(s * 0.052, 0.32, 0.3, 0.012)
  }
  return finish(b)
}



export function createArmadilloGeometry(seed = 16) {
  const { b, mass, eye, leg, random } = kit(seed)
  const { shell, band, skin, claw } = C.arma
  // a giant armadillo: a long domed back of overlapping bands, big front claws, a thick tapering tail
  for (let i = 0; i < 9; i += 1) {
    const t = i / 8
    const z = 0.34 - t * 0.74
    const r = 0.27 - Math.abs(t - 0.45) * 0.1
    mass(v(0, 0.28 + (r - 0.2) * 0.6, z), r, [0.9, 0.85, 0.36], i % 2 ? band : shell, shell.clone().multiplyScalar(0.7), { detail: 1, lumpy: 0.012 })
  }
  for (const s of mirror) {
    leg(v(s * 0.2, 0.2, 0.26), v(s * 0.22, 0.1, 0.3), v(s * 0.22, 0.015, 0.36), [0.075, 0.055, 0.045], skin, skin, skin, 0.05)
    for (const k of [-1, 0, 1]) tube(b, [v(s * 0.22 + k * 0.03, 0.03, 0.4), v(s * 0.22 + k * 0.04, 0.012, 0.5)], [0.016, 0.004], { segments: 4, base: claw })
    leg(v(s * 0.2, 0.2, -0.26), v(s * 0.22, 0.1, -0.28), v(s * 0.22, 0.015, -0.3), [0.07, 0.05, 0.04], skin, skin, skin, 0.05)
  }
  mass(v(0, 0.2, 0.52), 0.1, [0.75, 0.75, 1.3], skin, skin.clone().multiplyScalar(0.8), { detail: 2 })
  tube(b, [v(0, 0.19, 0.6), v(0, 0.16, 0.7), v(0, 0.13, 0.76)], [0.045, 0.032, 0.014], { segments: 6, base: skin, tip: skin.clone().multiplyScalar(0.7) })
  for (const s of mirror) {
    eye(s * 0.06, 0.24, 0.5, 0.01)
    mass(v(s * 0.07, 0.3, 0.44), 0.03, [0.6, 1, 0.8], shell, skin, { detail: 0, lumpy: 0 })
  }
  tube(b, bezier(v(0, 0.24, -0.38), v(0, 0.2, -0.7), v(0, 0.05, -0.92), 5), [0.1, 0.085, 0.07, 0.055, 0.04, 0.025], { segments: 7, base: shell, tip: skin, random, mottle: 0.08 })
  return finish(b)
}

export function createTarantulaGeometry(seed = 17) {
  const { b, mass, eye } = kit(seed)
  const { brown, dark, hair } = C.tarantula
  // a goliath birdeater: fat body, eight long bent legs, hairy
  mass(v(0, 0.045, -0.035), 0.04, [1, 0.75, 1.3], brown, dark, { detail: 1, lumpy: 0.04 })
  mass(v(0, 0.045, 0.03), 0.03, [1, 0.7, 1], hair, brown, { detail: 1, lumpy: 0.03 })
  for (const s of mirror) {
    eye(s * 0.01, 0.065, 0.055, 0.004)
    for (let k = 0; k < 4; k += 1) {
      const z = 0.045 - k * 0.028
      const reach = 0.095 + (k === 0 || k === 3 ? 0.02 : 0)
      const fwd = (1.5 - k) * 0.035
      tube(b, [v(s * 0.02, 0.05, z), v(s * reach * 0.65, 0.085, z + fwd * 0.5), v(s * reach, 0.015, z + fwd)], [0.008, 0.0065, 0.004], { segments: 4, base: brown, tip: dark })
    }
  }
  return finish(b)
}

/* ------------------------------------------------------------------ more perching animals */

export function createHowlerGeometry(seed = 18) {
  const { b, mass, eye, random } = kit(seed)
  const { black, red, face } = C.howler
  // a red howler monkey sitting hunched, rust-red fur, a bearded black face, a long tail hanging
  mass(v(0, 0.3, 0), 0.2, [0.85, 1.1, 0.9], red, red.clone().multiplyScalar(0.6), { detail: 2, lumpy: 0.05 })
  mass(v(0, 0.1, -0.03), 0.17, [1.0, 0.6, 1.1], red, red.clone().multiplyScalar(0.6), { detail: 1 })
  for (const s of mirror) {
    tube(b, [v(s * 0.13, 0.42, 0.04), v(s * 0.2, 0.28, 0.1), v(s * 0.15, 0.1, 0.18)], [0.05, 0.04, 0.032], { segments: 6, base: red, tip: black, random, mottle: 0.06 })
    tube(b, [v(s * 0.1, 0.12, 0.0), v(s * 0.17, 0.07, 0.12), v(s * 0.14, 0.015, 0.2)], [0.055, 0.045, 0.035], { segments: 6, base: red, tip: black, random })
  }
  mass(v(0, 0.58, 0.07), 0.1, [0.95, 1.05, 1.0], red, red.clone().multiplyScalar(0.7), { detail: 2, lumpy: 0.03 })
  mass(v(0, 0.55, 0.14), 0.075, [0.9, 1.0, 0.85], face, face, { detail: 2, lumpy: 0.01 })
  mass(v(0, 0.49, 0.1), 0.06, [1, 1.3, 0.8], black, black, { detail: 1, lumpy: 0.03 })
  for (const s of mirror) eye(s * 0.04, 0.58, 0.19, 0.012)
  tube(b, cubic(v(0, 0.12, -0.18), v(0, 0.1, -0.45), v(0.05, 0.02, -0.4), v(0.12, 0.06, -0.34), 7), [0.05, 0.047, 0.044, 0.04, 0.036, 0.032, 0.028, 0.022], { segments: 6, base: red, tip: black })
  return finish(b)
}

export function createHarpyEagleGeometry(seed = 19) {
  const { b, mass, eye } = kit(seed)
  const { grey, dark, white, beak, leg, claw } = C.harpy
  // a harpy eagle: upright, slate back, white front, a split crest, huge yellow legs and black talons
  mass(v(0, 0.55, 0), 0.21, [0.75, 1.45, 0.85], grey, grey.clone().multiplyScalar(0.7), { detail: 2, lumpy: 0.02 })
  mass(v(0, 0.52, 0.06), 0.17, [0.8, 1.3, 0.7], white, white.clone().multiplyScalar(0.8), { detail: 1, lumpy: 0 })
  mass(v(0, 0.66, 0.1), 0.13, [1.3, 0.3, 0.45], dark, dark, { detail: 1, lumpy: 0 })
  for (const s of mirror) {
    leaf(b, v(s * 0.15, 0.75, -0.03), v(s * 0.1, -1, -0.45), 0.5, 0.13, grey, dark, { droop: 0.02, fold: 0.1, curl: 0.05, roll: s * 0.1 })
    tube(b, [v(s * 0.07, 0.3, 0.02), v(s * 0.075, 0.15, 0.04), v(s * 0.08, 0.03, 0.06)], [0.032, 0.026, 0.024], { segments: 6, base: leg, tip: leg })
    for (const dx of [-0.03, 0, 0.03]) tube(b, [v(s * 0.08, 0.03, 0.06), v(s * 0.08 + dx, 0.012, 0.13)], [0.018, 0.007], { segments: 4, base: claw, tip: claw })
  }
  tube(b, [v(0, 0.28, -0.07), v(0, 0.12, -0.17), v(0, 0.06, -0.3)], [0.07, 0.065, 0.055], { segments: 6, base: dark, tip: grey })
  tube(b, [v(0, 0.78, 0.04), v(0, 0.9, 0.08)], [0.08, 0.075], { segments: 7, base: grey, tip: grey })
  mass(v(0, 0.92, 0.1), 0.095, [1.0, 1.0, 1.0], grey, grey.clone().multiplyScalar(0.8), { detail: 2, lumpy: 0.01 })
  mass(v(0, 0.88, 0.14), 0.07, [1, 0.9, 0.8], white.clone().lerp(grey, 0.35), grey, { detail: 1, lumpy: 0 })
  for (const k of [-1, 0, 1]) leaf(b, v(0, 0.98, 0.03), v(k * 0.4, 0.5, -1), 0.14, 0.03, dark, grey, { droop: 0.05, fold: 0.1, curl: 0.05 })
  tube(b, bezier(v(0, 0.91, 0.18), v(0, 0.95, 0.26), v(0, 0.84, 0.29), 5), [0.04, 0.038, 0.032, 0.024, 0.014, 0.005], { segments: 6, base: beak, tip: beak })
  for (const s of mirror) eye(s * 0.06, 0.93, 0.15, 0.013)
  return finish(b)
}

export const AMAZON_FAUNA_BUILDERS = Object.freeze({
  capybara: createCapybaraGeometry,
  jaguar: createJaguarGeometry,
  tapir: createTapirGeometry,
  anteater: createAnteaterGeometry,
  coati: createCoatiGeometry,
  caiman: createCaimanGeometry,
  anaconda: createAnacondaGeometry,
  tortoise: createTortoiseGeometry,
  frog: createFrogGeometry,
  morpho: createMorphoGeometry,
  capuchin: createCapuchinGeometry,
  sloth: createSlothGeometry,
  macaw: createMacawGeometry,
  toucan: createToucanGeometry,
  agouti: createAgoutiGeometry,
  armadillo: createArmadilloGeometry,
  tarantula: createTarantulaGeometry,
  howler: createHowlerGeometry,
  harpyEagle: createHarpyEagleGeometry,
})
