/**
 * The Amazon's animals. Every one is a model file (AmazonModel.jsx, CC BY 4.0, credited): the
 * code-built statues that used to stand here were replaced by them. Where each one stands, and how
 * solid it is, is the map's business (biomes/amazon.js `fauna`, biomes/common.js); the sizes the
 * colliders rely on are in AMAZON_FAUNA and checked against the files in amazonFauna.test.js.
 *
 * `radius`/`top`: the cylinder the map makes solid (centred on the model's origin).
 * `length`: how long it is along z (its shadow). `perch`: sits on a branch or platform.
 * `gallery`: shown only in the Wildlife Gallery (the Amazon map has no water for the fish).
 *
 * Pure data, no THREE: tests and the gallery read it.
 */
export const AMAZON_FAUNA = Object.freeze({
  jaguar: { radius: 0.65, top: 0.82, length: 1.5, perch: false },
  ocelot: { radius: 0.42, top: 0.55, length: 0.95, perch: false },
  armadillo: { radius: 0.5, top: 0.55, length: 0.93, perch: false },
  anaconda: { radius: 1.0, top: 0.25, length: 1.9, perch: false },
  capuchin: { radius: 0.3, top: 0.52, length: 0.52, perch: true },
  harpyEagle: { radius: 0.3, top: 0.95, length: 0.69, perch: true },
  hoatzin: { radius: 0.5, top: 0.7, length: 0.9, perch: true },
  // a flying macaw: it circles over the clearing and is not solid
  macaw: { radius: 0.3, top: 0.65, length: 0.52, perch: false },
  // more flyers: they circle over the clearing too (the morphos low, among the trees)
  blueMacaw: { radius: 0.3, top: 0.86, length: 0.85, perch: false },
  scarletMacaw: { radius: 0.3, top: 0.41, length: 0.64, perch: false },
  toucan: { radius: 0.3, top: 0.67, length: 0.8, perch: false },
  morpho: { radius: 0.15, top: 0.27, length: 0.26, perch: false },
  fish: { radius: 0.35, top: 0.49, length: 1.02, perch: false, gallery: true },
})

/** Every kind that is a model file, in the order the gallery shows them. */
export const AMAZON_FAUNA_MODELS = Object.freeze(Object.keys(AMAZON_FAUNA))

/**
 * Where a flyer is at time t, and how it holds itself. It does not fly a circle: its loop is an
 * ellipse (`squash` narrows it, `tilt` turns it) whose size breathes, it speeds up and slows down, and
 * it rises and sinks as it goes. `heading` is the way it is going (the model faces +z), `bank` leans it
 * into the turn and `pitch` lifts its nose in a climb and drops it in a dive.
 */
const wobble = (fly, t) => {
  const dir = fly.dir ?? 1
  const phase = fly.phase ?? 0
  const angle = phase + (dir * t * fly.speed) / fly.r + 0.22 * Math.sin(0.23 * t + phase * 2)
  const radius = fly.r * (1 + 0.14 * Math.sin(0.37 * t + phase * 3))
  const along = Math.cos(angle) * radius
  const across = Math.sin(angle) * radius * (fly.squash ?? 1)
  const tilt = fly.tilt ?? 0
  const bob = fly.bob ?? 0.7
  return {
    x: fly.x + along * Math.cos(tilt) - across * Math.sin(tilt),
    z: fly.z + along * Math.sin(tilt) + across * Math.cos(tilt),
    y: fly.y + bob * Math.sin((fly.flap ?? 0.5) * t + phase) + 0.5 * bob * Math.sin(0.19 * t + phase * 2),
  }
}
export function flightAt(fly, t) {
  const here = wobble(fly, t)
  const before = wobble(fly, t - 0.05)
  const after = wobble(fly, t + 0.05)
  const vx = after.x - before.x
  const vz = after.z - before.z
  const vy = after.y - before.y
  const ahead = Math.hypot(vx, vz) || 1
  const heading = Math.atan2(vx, vz)
  const turn = (Math.atan2(after.x - here.x, after.z - here.z) - Math.atan2(here.x - before.x, here.z - before.z) + Math.PI * 3) % (Math.PI * 2) - Math.PI
  return { ...here, heading, bank: -Math.max(-0.6, Math.min(0.6, turn * 9)), pitch: -Math.max(-0.5, Math.min(0.5, Math.atan2(vy, ahead))) }
}

const CC = 'CC BY 4.0'
/**
 * The credit for each model file (CC BY 4.0 asks for the author, a link to the licence, and a note of
 * the changes). `file` is in assets/; the longer notes are in the .LICENSE.md next to it.
 */
export const AMAZON_MODEL_CREDITS = Object.freeze({
  jaguar: { file: 'jaguar', name: 'Jaguar', title: 'jaguar', author: 'Ear.Rodriguez', authorUrl: 'https://sketchfab.com/Ear.Rodriguez', source: 'https://sketchfab.com/3d-models/jaguar-91c61c329d2a4668816f81f08dfcd492', license: CC, changes: 'the rest pose baked into a static model, tongue, teeth and animation removed, texture reduced, scaled and re-centred' },
  ocelot: { file: 'ocelot', name: 'Ocelot', title: 'Cat', author: 'photon (that one larry)', authorUrl: 'https://sketchfab.com/Professor_E12', source: 'https://sketchfab.com/3d-models/cat-74321b8d6b6b4c168db849ee6c8b3d6a', license: CC, changes: 'a house cat re-skinned as an ocelot (a tawny, spotted coat in place of the calico one; an approximation, not an exact ocelot), the rest pose baked into a static model, textures converted, scaled and re-centred' },
  armadillo: { file: 'armadillo', name: 'Armadillo', title: 'Armadillo', author: 'RISD Nature Lab', authorUrl: 'https://sketchfab.com/RISDNaturelab', source: 'https://sketchfab.com/3d-models/armadillo-1d86c64b646048d38e8a74fc18fa7e4d', license: CC, changes: 'a 1,000,000-triangle scan simplified to about 16,500 triangles, turned, tilted, scaled and re-centred, texture reduced' },
  capuchin: { file: 'capuchin', name: 'Capuchin monkey', title: 'Realsitic Monkey', author: 'TdoubleU8', authorUrl: 'https://sketchfab.com/TdoubleU8', source: 'https://sketchfab.com/3d-models/realsitic-monkey-50e4b1da03494429b1265fc095f2c530', license: CC, changes: 'a rhesus macaque re-skinned as a capuchin (dark brown coat, cream face frame and chest, dark cap; an approximation, not an exact capuchin), simplified to about 12,300 triangles, material converted, texture reduced and re-centred' },
  anaconda: { file: 'anaconda', name: 'Green anaconda', title: 'Anaconda_V1', author: '2012carlitos17', authorUrl: 'https://sketchfab.com/2012carlitos17', source: 'https://sketchfab.com/3d-models/anaconda-v1-e9ec3fd8d5734bccb8508f0d9b64cd06', license: CC, changes: 'simplified to about 14,700 triangles, laid flat, scaled down to a coil about 2.4 m across, textures reduced to one JPEG, re-centred' },
  harpyEagle: { file: 'harpy-eagle', name: 'Harpy eagle', title: 'Harpy Eagle', author: 'G-Box', authorUrl: 'https://sketchfab.com/gabszf', source: 'https://sketchfab.com/3d-models/harpy-eagle-3ced481e50d24b38a87406708cb7a2c4', license: CC, changes: 'simplified to about 17,500 triangles, scaled to life size, textures reduced to one JPEG, re-centred' },
  hoatzin: { file: 'hoatzin', name: 'Hoatzin', title: 'hoatzin', author: 'graduisc', authorUrl: 'https://sketchfab.com/graduisc', source: 'https://sketchfab.com/3d-models/hoatzin-607caf85a0f24586bb8b70a124d168a1', license: CC, changes: 'a 519,000-triangle sculpt simplified to about 26,700 triangles, scaled to life size, textures reduced, re-centred' },
  macaw: { file: 'macaw-flying', name: 'Scarlet macaw (flying)', title: 'Low poly Rainbow Macaw In Flying 3D Model Free', author: 'iRahulRajput', authorUrl: 'https://sketchfab.com/rt699448', source: 'https://sketchfab.com/3d-models/low-poly-rainbow-macaw-in-flying-3d-model-free-7ac34a313b63475cabcadaf48b92b80b', license: CC, changes: 'baked into one static model, textures reduced to one JPEG, re-centred; the game moves it round the clearing' },
  blueMacaw: { file: 'macaw-blue-yellow', name: 'Blue-and-yellow macaw (flying)', title: 'Macaw+3d+model', author: 'iRahulRajput', authorUrl: 'https://sketchfab.com/rt699448', source: 'https://sketchfab.com/3d-models/macaw3dmodel-0a16d7ad853e475f87a3694baa8ed46c', license: CC, changes: 'a 91,000-triangle model simplified to about 15,500 triangles, textures reduced to one JPEG, re-centred; the game moves it round the clearing' },
  scarletMacaw: { file: 'scarlet-macaw', name: 'Scarlet macaw (low-poly, flying)', title: 'Scarlet Macaw', author: 'Mateus Schwaab', authorUrl: 'https://sketchfab.com/Mehrus', source: 'https://sketchfab.com/3d-models/scarlet-macaw-0bb61160866b4811bd79b6d11e3d8907', license: CC, changes: 'the flying pose baked into a static model (skeleton and animations removed), scaled to life size, material converted, re-centred; the game moves it round the clearing' },
  toucan: { file: 'toco-toucan', name: 'Toco toucan (flying)', title: 'Toco Toucan Bird 3D Model Free', author: 'iRahulRajput', authorUrl: 'https://sketchfab.com/rt699448', source: 'https://sketchfab.com/3d-models/toco-toucan-bird-3d-model-free-384e7f893a1d4148b2ced5cb184956b3', license: CC, changes: 'a 424,000-triangle model simplified to about 17,000 triangles, scaled to life size, textures reduced to one JPEG, re-centred; the game moves it round the clearing' },
  morpho: { file: 'morpho', name: 'Blue morpho butterfly', title: 'morpho', author: 'Qween', authorUrl: 'https://sketchfab.com/QweenH', source: 'https://sketchfab.com/3d-models/morpho-0f2f9980584749fda6875b8ef8617b98', license: CC, changes: 'twenty parts joined into one static model, scaled up to a 30 cm wingspan so it can be seen, textures reduced, re-centred; the game moves it round the clearing' },
  fish: { file: 'crimson-fangback', name: 'Crimson fangback (payara)', title: 'Crimson Fangback - fish', author: 'Brian Trepanier (CMBC)', authorUrl: 'https://sketchfab.com/CMBC', source: 'https://sketchfab.com/3d-models/crimson-fangback-fish-6176f566abc3472dabd8ef17ccca4d09', license: CC, changes: 'a 245,000-triangle model simplified to about 14,700 triangles, scaled, textures reduced to one JPEG, re-centred' },
})
