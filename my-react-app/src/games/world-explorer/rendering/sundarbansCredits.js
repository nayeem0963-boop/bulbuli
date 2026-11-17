/**
 * The credits for the Sundarbans' model files (CC BY 4.0 asks for the author, a link to the licence and a
 * note of the changes). `file` is in assets/; the longer note is the .LICENSE.md next to it. The review page
 * (dev-preview/phase-2a/PreviewApp.jsx) lists every one. Pure data.
 */
const CC = 'CC BY 4.0'

export const SUNDARBANS_MODEL_CREDITS = Object.freeze({
  cat: {
    file: 'oiiaioooooiai-cat',
    name: 'Cat',
    title: 'Oiiaioooooiai Cat',
    author: 'Zhuier',
    authorUrl: 'https://sketchfab.com/Zhuier',
    source: 'https://sketchfab.com/3d-models/oiiaioooooiai-cat-30d27bf7fb224849b76e208a6eccdb36',
    license: CC,
    changes: 'the neutral pose baked into a static model (animation and mouth morph removed), re-centred, colour texture reduced from a 4096 px PNG to a 1024 px JPEG; the game walks it up and down a straight line on the island',
  },
})

/**
 * How the cat walks (rendering/SundarbansCat.jsx, maths in sundarbansCat.js): straight up and down a line on the
 * home island in front of where the expedition starts, turning round at each end. `speed` m/s on the ground,
 * `stride` m travelled per full leg cycle, `turnSeconds` to turn right round, `turnSteps` m of stepping while it turns.
 */
export const WALKING_CAT = Object.freeze({ speed: 0.55, stride: 0.5, turnSeconds: 1.4, turnSteps: 0.3, bob: 0.012 })

/**
 * The line the cat walks: x is fixed, z runs from `z0` to `z1` (metres, map coordinates), which keeps it on the home
 * island (radius 6) and 3.4 m ahead of the start (0, -2) across the way the player faces. Drawn 1.4 times life size.
 */
export const WALKING_CAT_PATH = Object.freeze({ x: 3.4, z0: -3.8, z1: 2.4, scale: 1.4 })
