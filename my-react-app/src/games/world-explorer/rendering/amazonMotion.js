/**
 * Moves the animals' limbs. The model files are a pose baked into static geometry (no skeleton), so
 * a roamer or flyer would otherwise slide or float rigidly. This patches each animal's own copy of
 * its material so the vertex shader swings the legs (a walker's diagonal pairs, pivoting at the hip)
 * or beats the wings (a flyer's tips lag the shoulders), driven by two uniforms the game sets every
 * frame: `uPh` (the stride or flap phase, radians) and `uAmp` (how strongly, 0..1).
 * Coordinates are the model's: facing +z, x across, feet on y = 0, metres. Shadows stay still.
 *
 * Pure data and string building, no THREE: tests read it.
 */

/** Legs: `hip` the height the legs pivot at, `xw`/`zw` the half-width and half-length that tell left from right and front from back, `ang` the swing (rad), `lift` the foot lift (m). */
export const LEG_MOTION = Object.freeze({
  jaguar: { hip: 0.46, xw: 0.14, zw: 0.2, ang: 0.5, lift: 0.07 },
  ocelot: { hip: 0.3, xw: 0.05, zw: 0.15, ang: 0.55, lift: 0.045 },
  armadillo: { hip: 0.2, xw: 0.1, zw: 0.15, ang: 0.5, lift: 0.03 },
  capuchin: { hip: 0.26, xw: 0.07, zw: 0.07, ang: 0.5, lift: 0.045 },
})

/** Wings: `x0` the half-width of the body (nothing moves inside it), `ang` the beat (rad), `rate` flaps per second (rad/s), `bob` how much the body rises with each beat (m). */
export const WING_MOTION = Object.freeze({
  macaw: { x0: 0.06, ang: 0.55, rate: 13, bob: 0.05 },
  blueMacaw: { x0: 0.07, ang: 0.5, rate: 12, bob: 0.05 },
  scarletMacaw: { x0: 0.06, ang: 0.55, rate: 13, bob: 0.05 },
  toucan: { x0: 0.08, ang: 0.4, rate: 11, bob: 0.04 },
  morpho: { x0: 0.03, ang: 0.8, rate: 18, bob: 0.03 },
})

export const hasMotion = (kind) => Boolean(LEG_MOTION[kind] || WING_MOTION[kind])
const f = (n) => Number(n).toFixed(4)

/** The GLSL lines that go right after `begin_vertex` (they move `transformed`, never `position`). */
export function motionGlsl(kind) {
  const leg = LEG_MOTION[kind]
  if (leg) {
    return `
  float mSx = clamp(position.x / ${f(leg.xw)}, -1.0, 1.0);
  float mSz = clamp(position.z / ${f(leg.zw)}, -1.0, 1.0);
  float mBelow = max(${f(leg.hip)} - position.y, 0.0);
  float mDiag = mSx * mSz;
  transformed.z += ${f(leg.ang)} * uAmp * sin(uPh) * mDiag * mBelow;
  transformed.y += ${f(leg.lift)} * uAmp * max(mDiag * cos(uPh), 0.0) * (mBelow / ${f(leg.hip)});`
  }
  const wing = WING_MOTION[kind]
  if (wing) {
    return `
  float mWx = max(abs(position.x) - ${f(wing.x0)}, 0.0);
  transformed.y += ${f(wing.ang)} * uAmp * sin(uPh - 2.5 * mWx) * mWx;`
  }
  return ''
}

/** Adds the uniforms and the motion to a standard material's shader (call from onBeforeCompile). */
export function patchShader(shader, kind, uniforms) {
  shader.uniforms.uPh = uniforms.uPh
  shader.uniforms.uAmp = uniforms.uAmp
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nuniform float uPh;\nuniform float uAmp;')
    .replace('#include <begin_vertex>', `#include <begin_vertex>${motionGlsl(kind)}`)
}
