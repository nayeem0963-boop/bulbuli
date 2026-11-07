/**
 * Sahara map: a wide gravel plain, dune steps up to a lookout ridge, an oasis with a well and
 * palms, a resting camel, and a dry valley one step down.
 */
import { disc, linksFrom, scatter } from './common.js'

const discs = [
  disc('plain', 0, 0, 16, 0, 'gravel', 1),
  disc('d1', 6, 6, 2.2, 1, 'sand'),
  disc('d2', 8.5, 8.5, 2.1, 2, 'sand'),
  disc('s1', 11.5, 11, 2.8, 3, 'ridge'),
  disc('s5', 18, -8, 5, -1, 'valley', 1),
]

const links = linksFrom(discs, [['plain', 'd1'], ['d1', 'd2'], ['d2', 's1'], ['plain', 's5']])

const stations = [
  { n: 1, disc: 's1', x: 12, z: 11.5 },
  { n: 2, disc: 'plain', x: -6, z: -6 },
  { n: 3, disc: 'plain', x: -10, z: 5.8 },
  { n: 4, disc: 'plain', x: -2, z: 11 },
  { n: 5, disc: 's5', x: 19.5, z: -9 },
]

const spawn = { position: [2, 0, -8], facing: 0 }
const keepClear = [...stations, { x: spawn.position[0], z: spawn.position[2], r: 2.5 }]
const plain = discs.filter((d) => d.id === 'plain')

const props = [
  ...scatter({
    seed: 9400, discs: plain, count: 12, type: 'rock', links, keepClear, minSpacing: 3,
    make: (r) => ({ scale: 0.5 + r() * 0.7, rot: r() * Math.PI * 2, block: 0.6 }),
  }),
  { type: 'dune', x: -16, y: 0, z: -14, scale: 1.6 },
  { type: 'dune', x: -22, y: 0, z: -4, scale: 2.2 },
  { type: 'dune', x: -8, y: 0, z: -18, scale: 1.3 },
  { type: 'dune', x: 14, y: 0, z: 20, scale: 2.4 },
  { type: 'surveyMap', x: -6, y: 0, z: -7.6 },
  { type: 'well', x: -10, y: 0, z: 8.6, block: 0.9, blockTop: 0.8 },
  { type: 'palm', x: -12.5, y: 0, z: 9.5, scale: 1.1, block: 0.3 },
  { type: 'palm', x: -11.6, y: 0, z: 5, scale: 0.9, block: 0.3 },
  { type: 'palm', x: -7.6, y: 0, z: 9.8, scale: 1.0, block: 0.3 },
  { type: 'pool', x: -12, y: 0.02, z: 7, scale: 1 },
  { type: 'camel', x: -2, y: 0, z: 12.8, rot: 0.4, block: 0.8 },
  { type: 'timeline', x: 20.5, y: -1, z: -10.8 },
  { type: 'dryRiver', x: 18, y: -0.98, z: -8, rot: 0.6 },
]

export const SAHARA_MAP = Object.freeze({
  id: 'sahara',
  sky: { top: '#7fb8e6', bottom: '#fbe9c8', fog: '#f1dcb6', dark: { top: '#101a3a', bottom: '#3b2e4a', fog: '#2a2338' } },
  water: null,
  looks: { gravel: '#c9a46f', sand: '#e6c07e', ridge: '#e8c27f', valley: '#a8875c' },
  discs, links, stations, spawn, props,
})
