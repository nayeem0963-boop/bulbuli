/**
 * Sundarbans map: mud islands in a tidal channel network, joined by boardwalk planks.
 * Station n sits on disc `s<n>`. Coordinates in metres; y is up; the water surface is at y = -0.35.
 * Island, station and boardwalk positions live in sundarbansLayout.js (also read by the terrain).
 */
import { boardwalk, disc, linksFrom, scatter } from './common.js'
import { WALKING_CAT_PATH } from '../rendering/sundarbansCredits.js'
import { SUNDARBANS_ISLANDS, SUNDARBANS_SPAWN, SUNDARBANS_STATIONS, SUNDARBANS_VILLAGE, SUNDARBANS_WALKS } from './sundarbansLayout.js'

const islands = SUNDARBANS_ISLANDS.map(([id, x, z, r, look]) => disc(id, x, z, r, 0, look))
const isl = Object.fromEntries(islands.map((d) => [d.id, d]))
const walks = SUNDARBANS_WALKS.map(([prefix, a, b]) => boardwalk(prefix, isl[a], isl[b]))
const discs = [...islands, ...walks.flatMap((w) => w.discs)]
const links = linksFrom(discs, walks.flatMap((w) => w.pairs))

const stations = SUNDARBANS_STATIONS.map((station) => ({ ...station }))

const spawn = { position: [...SUNDARBANS_SPAWN.position], facing: SUNDARBANS_SPAWN.facing }
const cameraYaw = spawn.facing + Math.PI
const cameraClearance = {
  x: spawn.position[0] + Math.sin(cameraYaw) * 8.2,
  z: spawn.position[2] + Math.cos(cameraYaw) * 8.2,
  r: 4.8,
}
const keepClear = [
  ...stations.map((station) => ({ ...station, r: 3.8 })),
  { x: spawn.position[0], z: spawn.position[2], r: 7.5 },
  cameraClearance,
  { x: SUNDARBANS_VILLAGE.x + 2.4, z: SUNDARBANS_VILLAGE.z + 0.5, r: 5 },
]
const props = [
  // pneumatophore (breathing-root) fields and ferns, drawn instanced by SundarbansScenery
  ...scatter({
    seed: 1987, discs: islands, count: 30, type: 'pneumatophores', links, keepClear, minSpacing: 1.15,
    make: (r) => ({ scale: 0.55 + r() * 0.65, rot: r() * Math.PI * 2 }),
  }),
  ...scatter({
    seed: 2731, discs: islands, count: 24, type: 'fern', links, keepClear, minSpacing: 1.05,
    make: (r) => ({ scale: 0.3 + r() * 0.5, rot: r() * Math.PI * 2 }),
  }),
  // fallen driftwood (the delta is alluvial mud: no boulders)
  ...scatter({
    seed: 3445, discs: islands, count: 9, type: 'log', links, keepClear, minSpacing: 2,
    make: (r) => ({ scale: 0.6 + r() * 0.7, rot: r() * Math.PI * 2 }),
  }),
  // station dressing (no colliders)
  { type: 'channels', x: 12.5, y: 0.02, z: -2.8, scale: 1 },
  { type: 'saltMeter', x: 12.5, y: 0, z: 14 },
  { type: 'pneumatophores', x: 5.8, y: 0, z: 20.8, scale: 1.35, rot: 0.5 },
  { type: 'pawPrints', x: -17.5, y: 0.02, z: 8.6, rot: -0.7 },
  { type: 'waveTank', x: -12.6, y: 0, z: -2.6 },
  { type: 'village', x: SUNDARBANS_VILLAGE.x, y: 0, z: SUNDARBANS_VILLAGE.z },
  // a cat walking straight up and down a line on the home island, ahead of the start (rendering/SundarbansCat.jsx); a
  // decoration, not solid. The prop stands at the middle of its line.
  { type: 'walkingCat', x: WALKING_CAT_PATH.x, y: 0, z: (WALKING_CAT_PATH.z0 + WALKING_CAT_PATH.z1) / 2, scale: WALKING_CAT_PATH.scale },
]

/**
 * Flyers borrowed from the Amazon (the same model files, credited on the review page), drawn by AmazonFauna like the
 * Amazon's own: macaws, as stand-ins for the parrots of the delta's forests, circling high over the islands and the
 * channels, and blue morpho butterflies flitting low over the mud and the roots. None is solid. Each circles (x, z) at
 * radius r, height y (m), speed (m/s); `dir` turns it the other way round.
 */
const fly = (type, x, z, r, y, speed, phase, dir, seed) => ({ type, x: x + r, y, z, rot: 0, seed, fly: { x, z, r, y, speed, phase, dir } })
const fauna = [
  fly('macaw', 6, 1, 4.2, 3.8, 1.5, 0, 1, 201),
  fly('scarletMacaw', 9, 3, 3.4, 3.6, 1.4, 2.4, -1, 202),
  fly('blueMacaw', 14, 7, 5.5, 4.8, 1.3, 4.0, 1, 203),
  fly('morpho', 2, 2.5, 1.6, 1.3, 0.6, 0, 1, 204),
  fly('morpho', -6, -3, 1.8, 1.5, 0.6, 2.0, -1, 205),
  fly('morpho', 12, -2, 1.5, 1.2, 0.5, 4.0, 1, 206),
]

/**
 * Follow camera (cameraRig.js): further back, aimed higher and a little wider than the default, so
 * the mangrove canopy, the far bank and the sky are in frame instead of mostly mud. The village
 * houses are volumes the camera stays out of and does not look through: each is a box
 * 1.6 x 1.4 m under a roof whose corners reach 1.3 m from the centre and whose tip is 1.95 m up.
 */
const camera = {
  distance: 4.2,
  height: 2.1,
  lookHeight: 1.2,
  fov: 60,
  avoid: [0, 1, 2].map((i) => ({ x: SUNDARBANS_VILLAGE.x + i * 2.4, z: SUNDARBANS_VILLAGE.z + (i % 2), r: 1.35, top: 2 })),
}

export const SUNDARBANS_MAP = Object.freeze({
  id: 'sundarbans',
  camera,
  // station name labels stay inside the frame and clear of the top buttons (stationLabel.js)
  labels: { cameraAware: true },
  // a pale pool of ground light under Bulbuli at night, so the dark bird reads against dark mud
  playerGlow: { radius: 1.9, color: '#a9bccb', opacity: 0.26 },
  sky: {
    top: '#8fcfd0', bottom: '#eaf6ea', fog: '#d3e8dc', horizon: '#dcece0',
    dark: { top: '#132540', bottom: '#2b4d4a', fog: '#203a3b', horizon: '#2a4746' },
  },
  water: { y: -0.35, color: '#7da68a', dark: '#355c4f' },
  looks: { mud: '#79644e', mudflat: '#816f57', sandbar: '#927e5d', plank: '#997a54' },
  discs, links, stations, spawn, props, fauna,
})
