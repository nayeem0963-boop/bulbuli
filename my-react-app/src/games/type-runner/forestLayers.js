// The Type Runner forest, back to front. Each layer is one image that repeats left to right.
//
// The images are built from your painted scenes by tools/build-forest-layers.py
// (sources in design/forest-source/). To change the forest, replace the source pictures and run
// the script again; it crops them, makes the sky see-through and mirrors them so they loop.
//
// If you make layer images by hand instead:
//   - Each must tile seamlessly: the right edge has to continue into the left edge.
//   - It is shown at the scene's height (128 to 200 px), so supply at least 400 px tall.
//   - Only the back layer may be opaque; the others need transparency (PNG or WebP),
//     or they hide everything behind them.
//   - The layer with the path (speed 1): keep the path at about 80% of the image height,
//     where the runner's feet are.
//   - Avoid `front: true` layers that cover the middle of the scene: they are drawn in front
//     of the bird.
//
// speed: how far the layer moves for each pixel the world scrolls. Smaller = further away.
// front: drawn in front of the bird.

export const FOREST_LAYERS = [
  { id: 'hills', src: '/forest/back.webp', speed: 0.25 }, // misty hills, far away
  { id: 'trees', src: '/forest/front.webp', speed: 1 }, // big trees and the path the bird runs on
]

// How the world scrolls, in pixels a second.
export const FOREST_MOTION = {
  cruise: 36, // steady drift while a race is on
  burst: 150, // extra speed added by each correct key
  settle: 3.2, // how quickly a burst eases back to cruising (per second)
  maxSpeed: 520,
}

/**
 * Advances the scroll by one frame. Pure, so it can be tested.
 * `speed` eases toward `target` (cruise while running, 0 when stopped).
 */
export function stepScroll({ scroll, speed }, { dt, running, motion = FOREST_MOTION }) {
  const target = running ? motion.cruise : 0
  const eased = target + (speed - target) * Math.exp(-motion.settle * dt)
  return { scroll: scroll + eased * dt, speed: eased }
}

export const addBurst = (speed, motion = FOREST_MOTION) => Math.min(motion.maxSpeed, speed + motion.burst)
