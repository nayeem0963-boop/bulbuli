/**
 * Amazon map: a big forest-floor clearing, a spiral stair of branches round a giant tree up to a
 * canopy platform, an understory platform off the stair, and a logged patch beside the forest.
 */
import { disc, linksFrom, scatter } from './common.js'

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

export const AMAZON_MAP = Object.freeze({
  id: 'amazon',
  sky: { top: '#8fd3c7', bottom: '#e7f6e4', fog: '#b9dcc4', dark: { top: '#0f2a26', bottom: '#1f3d2b', fog: '#16302a' } },
  water: null,
  looks: { floor: '#5b4a33', branch: '#7a5634', canopy: '#3f8a3a', cleared: '#9b7f57' },
  discs, links, stations, spawn, props,
})
