/**
 * Amazon map: a big forest-floor clearing, a spiral stair of branches round a giant tree up to a
 * canopy platform, an understory platform off the stair, and a logged patch beside the forest.
 */
import { disc, linksFrom, scatter } from './common.js'
import { AMAZON_FAUNA } from '../rendering/amazonFauna.js'

const TRUNK = { x: 0, z: 12 }
const STAIR_R = 3.2
const stairs = Array.from({ length: 6 }, (_, i) => {
  const ang = -Math.PI / 2 + i * (50 * Math.PI / 180)
  return disc(`st${i + 1}`, TRUNK.x + Math.cos(ang) * STAIR_R, TRUNK.z + Math.sin(ang) * STAIR_R, 1.6, 1 + i, 'branch', 0.35)
})
const last = stairs[5]
const lastAng = Math.atan2(last.z - TRUNK.z, last.x - TRUNK.x)
const third = stairs[2]
const thirdAng = Math.atan2(third.z - TRUNK.z, third.x - TRUNK.x)

const discs = [
  disc('floor', 0, 0, 15, 0, 'floor', 1),
  ...stairs,
  disc('s2', TRUNK.x + Math.cos(lastAng) * 6.4, TRUNK.z + Math.sin(lastAng) * 6.4, 3.2, 6.5, 'canopy', 0.4),
  disc('s4', TRUNK.x + Math.cos(thirdAng) * 6.6, TRUNK.z + Math.sin(thirdAng) * 6.6, 2.8, 3.4, 'branch', 0.4),
  disc('s5', 17, -6, 5, 0, 'cleared', 1),
]

const links = linksFrom(discs, [
  ['floor', 'st1'], ['st1', 'st2'], ['st2', 'st3'], ['st3', 'st4'], ['st4', 'st5'], ['st5', 'st6'],
  ['st6', 's2'], ['st3', 's4'], ['floor', 's5'],
])

const s2 = discs.find((d) => d.id === 's2')
const s4 = discs.find((d) => d.id === 's4')
const stations = [
  { n: 1, disc: 'floor', x: -7, z: 3 },
  { n: 2, disc: 's2', x: s2.x, z: s2.z },
  { n: 3, disc: 'floor', x: 6, z: -7 },
  { n: 4, disc: 's4', x: s4.x, z: s4.z },
  { n: 5, disc: 's5', x: 18.5, z: -6.5 },
]

const spawn = { position: [0, 0, -9], facing: 0 }

const props = [
  { type: 'giantTree', x: TRUNK.x, y: 0, z: TRUNK.z, scale: 1, block: 1.0 },
  ...scatter({
    seed: 7, discs: discs.filter((d) => d.id === 's5'), count: 7, type: 'stump', links, keepClear: [stations[4]],
    make: (r) => ({ scale: 0.8 + r() * 0.4, rot: r() * Math.PI * 2 }),
  }),
  { type: 'quadrat', x: -7, y: 0.02, z: 3 },
  { type: 'lightMeter', x: s2.x + 1, y: s2.top, z: s2.z },
  { type: 'leafLitter', x: 6, y: 0.02, z: -7 },
  { type: 'leafBag', x: s4.x - 0.8, y: s4.top, z: s4.z + 0.6 },
  { type: 'mist', x: 0, y: 9, z: 12 },
]

/**
 * Rainforest animals, all model files (rendering/AmazonModel.jsx): jaguars, ocelots, armadillos and
 * anacondas in clearings on the forest floor, capuchins, harpy eagles and hoatzins perched on the
 * branch and canopy platforms (and more of them roaming the floor), and macaws, toucans and morpho butterflies flying round over the clearing. Each stands on bare
 * ground, clear of the stations, the paths and the trees: the tree scatter keeps a clearing round
 * every ground animal (rendering/amazonScatter.js). `solid` is its collider (a cylinder); a flyer has
 * none and circles (`fly`). A roamer (`roam`) walks a loop on the forest floor and is not solid. The crimson fangback (a fish) is only in the Wildlife Gallery: the map has no water.
 */
const animal = (type, x, z, rot, seed, y = 0) => ({
  type, x, y, z, rot, seed, solid: { r: AMAZON_FAUNA[type].radius, top: AMAZON_FAUNA[type].top },
})
/** A flyer that circles (x, z) at radius r, height y, at speed m/s; dir turns it the other way round. */
const fly = (type, x, z, r, y, speed, phase, dir, seed) => ({ type, x: x + r, y, z, rot: 0, seed, fly: { x, z, r, y, speed, phase, dir } })
/** A ground animal that roams a loop round (x, z), rx by rz, turned by tilt; not solid (it walks on). */
const roam = (type, x, z, rx, rz, tilt, speed, phase, dir, seed) => ({
  type, x, y: 0, z, rot: 0, seed, roam: { x, z, rx, rz, tilt, speed, phase, dir },
})
/**
 * A roamer that stays put: the armadillo's baked pose is a tilted, curled-up ball that does not walk
 * convincingly, so it rests where it is (rotated by `rot`) and only breathes and snuffles. It keeps
 * its loop's data so the forest keeps the same clearing round it (amazonScatter.js), or, with `keepTrees`,
 * is tucked in against a tree trunk (`tucked`) and leaves the forest exactly as it was.
 */
const rest = (type, x, z, rx, rz, tilt, phase, rot, seed, keepTrees = false) => ({ ...roam(type, x, z, rx, rz, tilt, 0.5, phase, 1, seed), rot, rest: true, ...(keepTrees ? { keepTrees: true, tucked: true } : {}) })
const around = (centre, angle, radius) => ({ x: centre.x + Math.cos(angle) * radius, z: centre.z + Math.sin(angle) * radius })
/** On a platform's edge at `angle`, turned to look in across it (`turn` swings it off the middle). */
const perch = (type, centre, angle, radius, turn, seed) => {
  const at = around(centre, angle, radius)
  return animal(type, at.x, at.z, Math.PI * 1.5 - angle + turn, seed, centre.top)
}
const fauna = [
  roam('jaguar', -9.2, -3.2, 2.2, 1.6, 0.4, 0.9, 0, 1, 24),
  animal('jaguar', 3.1, -3.4, 0.8, 42),
  roam('ocelot', -5.2, 6.6, 1.8, 1.2, 0.3, 0.8, 1.0, 1, 72),
  roam('ocelot', 8.2, 1.2, 2.0, 1.4, -0.5, 0.85, 2.4, -1, 73),
  rest('armadillo', -6.8, -10.0, 1.3, 0.9, 0.6, 0.5, 0.7, 64),
  rest('armadillo', 9.0, 6.8, 1.5, 1.0, -0.3, 3.6, -2.4, 65),
  roam('jaguar', 4.0, 5.2, 1.8, 1.5, -0.4, 0.9, 1.7, -1, 91),
  roam('hoatzin', 6, -10, 1.5, 1.0, 0, 0.6, 0.8, 1, 92),
  roam('hoatzin', -3.5, 0.5, 1.4, 1.0, 0, 0.55, 3.0, -1, 93),
  roam('harpyEagle', -11, 5.5, 1.3, 1.1, 0, 0.5, 1.9, 1, 94),
  roam('harpyEagle', 10.5, -6.5, 1.3, 1.1, 0, 0.5, 4.2, -1, 95),
  roam('capuchin', 5.5, 10.5, 1.3, 1.0, 0, 0.7, 0.4, -1, 96),
  roam('capuchin', -3.8, -5.8, 1.3, 1.0, 0.2, 0.7, 2.0, 1, 83),
  animal('anaconda', -12.2, 2.6, 0.3, 30),
  animal('anaconda', 3.2, -12.2, 2.0, 48),
  // perched up in the trees
  perch('capuchin', s2, lastAng - 1.55, 2.2, 0.5, 36),
  perch('capuchin', s4, thirdAng + 0.85, 2.1, 0.2, 60),
  perch('harpyEagle', s4, thirdAng - 0.85, 2.0, 0.1, 69),
  perch('harpyEagle', s2, lastAng - 2.4, 2.4, 0.4, 71),
  perch('hoatzin', s4, thirdAng + 1.7, 1.9, 0.4, 38),
  perch('hoatzin', s2, lastAng + 0.8, 2.4, -0.3, 61),
  // flying over the clearing
  fly('macaw', -3, -2, 3.2, 3.4, 1.4, 0, 1, 37),
  fly('macaw', 4, 5, 2.6, 4.2, 1.2, 3.1, -1, 59),
  fly('blueMacaw', 1, -6, 3.6, 3.9, 1.3, 1.5, 1, 74),
  fly('blueMacaw', -6, 1, 2.8, 4.6, 1.1, 4.4, -1, 75),
  fly('scarletMacaw', 6, -2, 3.0, 3.6, 1.5, 0.8, -1, 76),
  fly('scarletMacaw', -2, 7, 2.4, 4.4, 1.3, 5.2, 1, 77),
  fly('toucan', -1, 1, 4.0, 3.3, 1.6, 2.2, 1, 78),
  fly('toucan', 7, 6, 2.2, 4.0, 1.4, 0.2, -1, 79),
  fly('morpho', -4, 3, 1.6, 1.3, 0.6, 0, 1, 80),
  fly('morpho', 5, -4, 2.0, 1.7, 0.7, 2.0, -1, 81),
  fly('morpho', 0, 4, 1.4, 1.1, 0.5, 4.0, 1, 82),
  fly('macaw', 0, 9, 3.4, 4.8, 1.3, 2.6, -1, 84),
  fly('blueMacaw', 8, -3, 2.6, 3.8, 1.2, 0.4, 1, 85),
  fly('scarletMacaw', -8, -6, 3.0, 4.0, 1.4, 3.3, 1, 86),
  fly('toucan', -7, 6, 2.8, 4.4, 1.3, 5.0, -1, 87),
  fly('morpho', -8, -1, 1.8, 1.4, 0.6, 1.2, -1, 88),
  fly('morpho', 8, 5, 1.6, 1.2, 0.5, 3.3, 1, 89),
  fly('morpho', 2, -8, 1.3, 1.5, 0.6, 5.5, -1, 90),
  // more armadillos, each tucked in against a tree trunk (on the far side of it from the nearest path), facing
  // the trunk and snuffling at its roots; they go last so the other animals keep their numbers, and they
  // leave the forest exactly as it was
  rest('armadillo', 0.65, -4.56, 0.2, 0.15, 0.2, 1.1, 2.46, 66, true),
  rest('armadillo', 4.71, 1.59, 0.2, 0.15, -0.3, 2.0, -1.99, 67, true),
  rest('armadillo', -3.18, 4.55, 0.2, 0.15, 0.4, 3.0, 2.99, 68, true),
  rest('armadillo', 12.99, -1.23, 0.2, 0.15, 0.1, 4.0, 3.25, 97, true),
  rest('armadillo', 8.56, 9.39, 0.2, 0.15, 0.3, 5.0, 1.42, 98, true),
  rest('armadillo', -5.99, 10.53, 0.2, 0.15, -0.2, 0.6, 2.46, 99, true),
]

export const AMAZON_MAP = Object.freeze({
  id: 'amazon',
  sky: { top: '#8fd3c7', bottom: '#e7f6e4', fog: '#b9dcc4', dark: { top: '#0f2a26', bottom: '#1f3d2b', fog: '#16302a' } },
  water: null,
  looks: { floor: '#5b4a33', branch: '#7a5634', canopy: '#3f8a3a', cleared: '#9b7f57' },
  discs, links, stations, spawn, props, fauna,
})
