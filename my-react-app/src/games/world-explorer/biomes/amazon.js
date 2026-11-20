/**
 * Amazon map: a big forest-floor clearing, a spiral stair of branches round a giant tree up to a
 * canopy platform, an understory platform off the stair, and a logged patch beside the forest.
 */
import { disc, linksFrom, scatter } from './common.js'
import { AMAZON_FAUNA, flightAt } from '../rendering/amazonFauna.js'

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
 * branch and canopy platforms, and macaws, toucans and morpho butterflies sweeping loose loops high over the clearing. Each stands on bare
 * ground, clear of the stations, the paths and the trees: the tree scatter keeps a clearing round
 * every ground animal (rendering/amazonScatter.js). `solid` is its collider (a cylinder); a flyer has
 * none and circles (`fly`). The crimson fangback (a fish) is only in the Wildlife Gallery: the map has no water.
 */
const animal = (type, x, z, rot, seed, y = 0) => ({
  type, x, y, z, rot, seed, solid: { r: AMAZON_FAUNA[type].radius, top: AMAZON_FAUNA[type].top },
})
/** A flyer that sweeps a loose loop round (x, z) at about radius r, height y, at speed m/s; dir turns it the other way round. */
const fly = (type, x, z, r, y, speed, phase, dir, seed, extra = {}) => {
  const path = { x, z, r, y, speed, phase, dir, ...extra }
  const start = flightAt(path, 0)
  return { type, x: start.x, y: start.y, z: start.z, rot: 0, seed, fly: path }
}
/** n flyers of one kind, their loops centred round a ring (radius `ring`) and stepped up in height, none alike. */
const flock = (type, n, { ring, r, y, speed, bob = 0.7, flap = 0.5, seed }) => Array.from({ length: n }, (_, i) => {
  const a = (i * 2 * Math.PI) / n + seed * 0.7
  return fly(type, Math.cos(a) * ring, Math.sin(a) * ring, r + (i % 2) * 1.6, y + (i % 3) * 1.5, speed * (0.9 + 0.07 * i), i * 1.7 + seed, i % 2 ? -1 : 1, seed * 10 + i, { squash: 0.6 + 0.1 * (i % 3), tilt: i * 0.9, bob, flap })
})
const around = (centre, angle, radius) => ({ x: centre.x + Math.cos(angle) * radius, z: centre.z + Math.sin(angle) * radius })
/** On a platform's edge at `angle`, turned to look in across it (`turn` swings it off the middle). */
const perch = (type, centre, angle, radius, turn, seed) => {
  const at = around(centre, angle, radius)
  return animal(type, at.x, at.z, Math.PI * 1.5 - angle + turn, seed, centre.top)
}
const fauna = [
  animal('jaguar', 9.4, 2.7, -2.2, 24),
  animal('jaguar', 3.1, -3.4, 0.8, 42),
  animal('ocelot', -4.5, 4.5, 0.9, 72),
  animal('ocelot', 6.5, 2.5, -2.3, 73),
  animal('armadillo', -7.3, -7.7, 1.3, 64),
  animal('armadillo', 8.0, 6.5, -2.0, 65),
  animal('anaconda', -12.2, 2.6, 0.3, 30),
  animal('anaconda', 3.2, -12.2, 2.0, 48),
  // perched up in the trees
  perch('capuchin', s2, lastAng - 1.55, 2.2, 0.5, 36),
  perch('capuchin', s4, thirdAng + 0.85, 2.1, 0.2, 60),
  perch('harpyEagle', s4, thirdAng - 0.85, 2.0, 0.1, 69),
  perch('harpyEagle', s2, lastAng - 2.4, 2.4, 0.4, 71),
  perch('hoatzin', s4, thirdAng + 1.7, 1.9, 0.4, 38),
  perch('hoatzin', s2, lastAng + 0.8, 2.4, -0.3, 61),
  // flying high over the clearing and the canopy
  ...flock('macaw', 4, { ring: 7, r: 7, y: 9, speed: 3.0, seed: 1 }),
  ...flock('blueMacaw', 4, { ring: 8, r: 6.5, y: 11, speed: 3.2, seed: 2 }),
  ...flock('scarletMacaw', 4, { ring: 6, r: 8, y: 9.2, speed: 2.8, seed: 3 }),
  ...flock('toucan', 4, { ring: 5.5, r: 5.5, y: 10, speed: 2.4, seed: 4 }),
  // butterflies drift lower, in little loops that flutter up and down
  ...flock('morpho', 8, { ring: 6, r: 3, y: 3.2, speed: 0.9, bob: 0.4, flap: 2.2, seed: 5 }),
]

export const AMAZON_MAP = Object.freeze({
  id: 'amazon',
  sky: { top: '#8fd3c7', bottom: '#e7f6e4', fog: '#b9dcc4', dark: { top: '#0f2a26', bottom: '#1f3d2b', fog: '#16302a' } },
  water: null,
  looks: { floor: '#5b4a33', branch: '#7a5634', canopy: '#3f8a3a', cleared: '#9b7f57' },
  discs, links, stations, spawn, props, fauna,
})
