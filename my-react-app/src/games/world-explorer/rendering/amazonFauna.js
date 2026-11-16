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
  fish: { radius: 0.35, top: 0.49, length: 1.02, perch: false, gallery: true },
})

/** Every kind that is a model file, in the order the gallery shows them. */
export const AMAZON_FAUNA_MODELS = Object.freeze(Object.keys(AMAZON_FAUNA))

/** Where a flyer is at time t: its circle's point, and the way it is heading (the model faces +z). */
export function flightAt(fly, t) {
  const angle = (fly.phase ?? 0) + (t * fly.speed * (fly.dir ?? 1)) / fly.r
  const dir = fly.dir ?? 1
  const x = fly.x + Math.cos(angle) * fly.r
  const z = fly.z + Math.sin(angle) * fly.r
  const heading = Math.atan2(-Math.sin(angle) * dir, Math.cos(angle) * dir)
  return { x, z, y: fly.y + Math.sin(t * 1.3 + (fly.phase ?? 0)) * 0.18, heading }
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
  fish: { file: 'crimson-fangback', name: 'Crimson fangback (payara)', title: 'Crimson Fangback - fish', author: 'Brian Trepanier (CMBC)', authorUrl: 'https://sketchfab.com/CMBC', source: 'https://sketchfab.com/3d-models/crimson-fangback-fish-6176f566abc3472dabd8ef17ccca4d09', license: CC, changes: 'a 245,000-triangle model simplified to about 14,700 triangles, scaled, textures reduced to one JPEG, re-centred' },
})
