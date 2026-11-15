/**
 * Amazon map: a big forest-floor clearing, a spiral stair of branches round a giant tree up to a
 * canopy platform, an understory platform off the stair, and a logged patch beside the forest.
 */
import { disc, linksFrom, scatter } from './common.js'
import { AMAZON_FAUNA } from '../rendering/amazonFauna.js'
import { MIN_ROAM, WALKERS } from '../rendering/amazonFaunaWalk.js'

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
 * Rainforest animals standing about as statues (rendering/amazonFauna.js): ground animals in
 * clearings on the forest floor, and a sloth, toucan, macaw and capuchin perched on the branch and
 * canopy platforms. Each stands on bare ground, clear of the stations, the paths and the trees:
 * the tree scatter keeps a clearing round every ground animal (rendering/amazonScatter.js).
 * `solid` is its collider (a cylinder); the frog and the butterfly are too small to bump into.
 */
const TINY = new Set(['frog', 'morpho', 'tarantula'])
const animal = (type, x, z, rot, seed, y = 0) => ({
  type, x, y, z, rot, seed,
  ...(TINY.has(type) ? {} : { solid: { r: AMAZON_FAUNA[type].radius, top: AMAZON_FAUNA[type].top } }),
})
const around = (centre, angle, radius) => ({ x: centre.x + Math.cos(angle) * radius, z: centre.z + Math.sin(angle) * radius })
/** On a platform's edge at `angle`, turned to look in across it (`turn` swings it off the middle). */
const perch = (type, centre, angle, radius, turn, seed) => {
  const at = around(centre, angle, radius)
  return animal(type, at.x, at.z, Math.PI * 1.5 - angle + turn, seed, centre.top)
}
const fauna = [
  // a capybara family by the spawn side of the clearing
  animal('capybara', -6.1, -4.5, 0.7, 21),
  animal('capybara', -0.5, -2.3, 0.2, 22),
  animal('capybara', -6.9, 8.3, 1.2, 23),
  animal('jaguar', 9.4, 2.7, -2.2, 24),
  animal('tapir', -10.3, -1.0, 0.9, 25),
  animal('anteater', 4.4, 1.0, -0.6, 26),
  animal('coati', -2.0, 9.2, 2.6, 27),
  animal('coati', -4.4, 7.9, 3.4, 28),
  animal('caiman', 10.2, -0.9, 1.9, 29),
  animal('anaconda', -12.2, 2.6, 0.3, 30),
  animal('tortoise', 6.6, -4.2, 2.2, 31),
  animal('frog', -5.3, 1.5, 0.8, 32),
  animal('morpho', 4.8, -5.6, 0.4, 33),
  animal('morpho', -8.8, 5.4, 2.0, 34),
  animal('morpho', 1.6, 6.2, 4.0, 35),
  // more of each, spread over the rest of the clearing
  animal('capybara', 5.5, 9.0, -1.0, 40),
  animal('capybara', 5.5, 4.7, -0.4, 41),
  animal('jaguar', 3.1, -3.4, 0.8, 42),
  animal('tapir', -6.8, -1.0, 2.4, 43),
  animal('anteater', -2.4, 3.1, 1.1, 44),
  animal('coati', 7.2, 0.2, 1.6, 45),
  animal('coati', -3.1, -1.0, 2.3, 46),
  animal('caiman', -9.4, -4.5, 0.6, 47),
  animal('anaconda', 3.2, -12.2, 2.0, 48),
  animal('tortoise', -4.2, 10.3, 0.9, 49),
  animal('tortoise', -3.0, -3.4, 3.9, 50),
  animal('frog', -6.4, 1.8, 2.2, 51),
  animal('frog', -4.1, 1.0, 5.0, 52),
  animal('frog', 5.4, -3.2, 1.4, 53),
  animal('morpho', -6.0, 5.8, 1.0, 54),
  animal('morpho', 8.6, -4.6, 2.6, 55),
  animal('morpho', -2.4, 6.2, 5.0, 56),
  animal('morpho', 3.2, 7.0, 0.3, 57),
  // a few more kinds
  animal('agouti', 2.9, 3.7, 0.6, 62),
  animal('agouti', -9.5, 2.1, 2.8, 63),
  animal('armadillo', -7.3, -7.7, 1.3, 64),
  animal('armadillo', 8.0, 6.5, -2.0, 65),
  animal('tarantula', -3.0, -7.2, 0.5, 66),
  animal('tarantula', 6.6, -9.4, 3.1, 67),
  // perched up in the trees
  perch('capuchin', s2, lastAng - 1.55, 2.2, 0.5, 36),
  perch('macaw', s2, lastAng + 1.55, 2.3, -0.5, 37),
  perch('sloth', s4, thirdAng + 1.7, 1.9, 0.4, 38),
  perch('toucan', s4, thirdAng - 1.7, 1.9, -0.6, 39),
  perch('toucan', s2, lastAng, 2.4, 0.3, 58),
  perch('macaw', s4, thirdAng, 2.0, -0.2, 59),
  perch('capuchin', s4, thirdAng + 0.85, 2.1, 0.2, 60),
  perch('sloth', s2, lastAng + 0.8, 2.4, -0.3, 61),
  perch('howler', s2, lastAng - 0.8, 2.4, 0.2, 68),
  perch('harpyEagle', s4, thirdAng - 0.85, 2.0, 0.1, 69),
  perch('howler', s4, thirdAng + 2.4, 1.9, -0.2, 70),
  perch('harpyEagle', s2, lastAng - 2.4, 2.4, 0.4, 71),
]

/**
 * How far each walking animal may wander (a circle of `roam` metres round where it is placed):
 * as far as its kind goes, and no further than leaves it room to spare from the stations, the
 * paths, the start, the giant tree, the edge of the floor and every other animal (which gets half
 * of the gap each, and the butterflies their flight). The trees keep out of the whole walk
 * (rendering/amazonScatter.js). Where there is no room it stands.
 */
/** The ones that walk (by seed): every animal on the floor that has legs to walk on. */
const WALKS = new Set(fauna.filter((a) => WALKERS[a.type] && a.y === 0).map((a) => a.seed))
/** Of those, the ones that patrol a straight line back and forth rather than circling. */
const STRAIGHT = new Set([22, 23, 24, 25, 26, 42, 44, 46, 47, 65])
const FLIGHT = { morpho: 0.45 }
const reachOf = (a) => (a.solid?.r ?? 0.1) + (FLIGHT[a.type] ?? 0)
const segmentGap = (p, [a, b]) => {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)))
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t)
}
const floor = discs.find((d) => d.id === 'floor')
const SPAWN = { x: spawn.position[0], z: spawn.position[2] }
/** `list` with each walking animal's `roam` worked out against all the others (exported for the tests). */
export const withRoam = (list) => list.map((a) => {
  const kind = WALKERS[a.type]
  if (!kind || a.y !== 0 || !WALKS.has(a.seed)) return a
  const r = reachOf(a)
  let room = kind.roam
  for (const st of stations) room = Math.min(room, Math.hypot(a.x - st.x, a.z - st.z) - r - 1.2 - 0.1)
  for (const link of links) room = Math.min(room, segmentGap(a, link) - r - 0.8 - 0.1)
  for (const prop of props) if (prop.block) room = Math.min(room, Math.hypot(a.x - prop.x, a.z - prop.z) - prop.block - r - 0.4)
  room = Math.min(room, Math.hypot(a.x - SPAWN.x, a.z - SPAWN.z) - r - 5 - 0.1, 12 - Math.hypot(a.x - floor.x, a.z - floor.z) - r)
  for (const other of list) if (other !== a && other.y === 0) room = Math.min(room, (Math.hypot(a.x - other.x, a.z - other.z) - r - reachOf(other)) / 2 - 0.05)
  const roam = Math.floor(room * 20) / 20
  return roam >= MIN_ROAM ? { ...a, roam, ...(STRAIGHT.has(a.seed) ? { route: 'line' } : {}) } : a
})

export const AMAZON_MAP = Object.freeze({
  id: 'amazon',
  sky: { top: '#8fd3c7', bottom: '#e7f6e4', fog: '#b9dcc4', dark: { top: '#0f2a26', bottom: '#1f3d2b', fog: '#16302a' } },
  water: null,
  looks: { floor: '#5b4a33', branch: '#7a5634', canopy: '#3f8a3a', cleared: '#9b7f57' },
  discs, links, stations, spawn, props, fauna: withRoam(fauna),
})
