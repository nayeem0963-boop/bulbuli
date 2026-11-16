/**
 * The credits for the Sundarbans' model files (CC BY 4.0 asks for the author, a link to the licence and a
 * note of the changes). `file` is in assets/; the longer note is the .LICENSE.md next to it. The review page
 * (dev-preview/phase-2a/PreviewApp.jsx) lists every one. Pure data.
 */
const CC = 'CC BY 4.0'

export const SUNDARBANS_MODEL_CREDITS = Object.freeze({
  spinningCat: {
    file: 'oiiaioooooiai-cat',
    name: 'Spinning cat',
    title: 'Oiiaioooooiai Cat',
    author: 'Zhuier',
    authorUrl: 'https://sketchfab.com/Zhuier',
    source: 'https://sketchfab.com/3d-models/oiiaioooooiai-cat-30d27bf7fb224849b76e208a6eccdb36',
    license: CC,
    changes: 'the neutral pose baked into a static model (animation and mouth morph removed), re-centred, colour texture reduced from a 4096 px PNG to a 1024 px JPEG; the game spins it on the spot',
  },
})

/** How the cat moves (rendering/SundarbansCat.jsx): turns per second, and how far it bobs (m). */
export const SPINNING_CAT = Object.freeze({ turnsPerSecond: 1.4, bob: 0.035, bobTurns: 2 })

/** Where the cat spins in the Sundarbans map: on the home island, a few paces ahead of where the expedition starts, drawn 1.4 times life size so it is easy to spot. */
export const SPINNING_CAT_PLACE = Object.freeze({ x: 3.4, z: -1.2, scale: 1.4 })
