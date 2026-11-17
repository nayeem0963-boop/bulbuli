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

/** Legs: `hip` the height the legs pivot at, `yaw` how far the model's own body axis is turned from +z (rad; the jaguar's is -0.52), `cx`/`cz` the middle between the left and right, front and back legs (the model's own pose is not always centred), `xw`/`zw` the half-width and half-length that tell left from right and front from back, `ang` the swing (rad), `lift` the foot lift (m). */
const JAGUAR_LEGS = { hip: 0.46, yaw: -0.52, cx: -0.03, cz: 0.06, xw: 0.12, zw: 0.3, ang: 0.5, lift: 0.07 }
export const LEG_MOTION = Object.freeze({
  jaguar: JAGUAR_LEGS,
  tiger: JAGUAR_LEGS, // the same model
  ocelot: { hip: 0.3, cx: 0, cz: -0.04, xw: 0.05, zw: 0.15, ang: 0.55, lift: 0.045 },
  armadillo: { hip: 0.2, cx: -0.07, cz: -0.05, xw: 0.07, zw: 0.15, ang: 0.5, lift: 0.03 },
  capuchin: { hip: 0.26, cx: 0.02, cz: 0.1, xw: 0.07, zw: 0.07, ang: 0.5, lift: 0.045 },
  // the Sundarbans' cat (rendering/SundarbansCat.jsx): front paws near z = 0.26, back paws near z = -0.06, legs about 0.16 m
  cat: { hip: 0.16, cx: 0, cz: 0.1, xw: 0.07, zw: 0.15, ang: 0.55, lift: 0.03 },
})

/** Wings: `x0` the half-width of the body (nothing moves inside it), `ang` the beat (rad), `rate` flaps per second (rad/s), `bob` how much the body rises with each beat (m). */
export const WING_MOTION = Object.freeze({
  macaw: { x0: 0.06, ang: 0.55, rate: 13, bob: 0.05 },
  blueMacaw: { x0: 0.07, ang: 0.5, rate: 12, bob: 0.05 },
  scarletMacaw: { x0: 0.06, ang: 0.55, rate: 13, bob: 0.05 },
  toucan: { x0: 0.08, ang: 0.4, rate: 11, bob: 0.04 },
  morpho: { x0: 0.03, ang: 0.8, rate: 18, bob: 0.03 },
})

/**
 * Hoppers (the birds that roam the floor): each hop tucks the feet up under the body (`tuck`, 0..1 of
 * the way to `hip`) and lifts and spreads the wings (`lift` rad, `flare` sideways), from `x0` out.
 */
export const HOP_MOTION = Object.freeze({
  harpyEagle: { hip: 0.28, tuck: 0.6, x0: 0.1, lift: 0.45, flare: 1.4 },
  hoatzin: { hip: 0.18, tuck: 0.7, x0: 0.14, lift: 0.7, flare: 0.25 },
})

/**
 * Some models are baked with their body turned or tipped: this puts them upright, facing +z, with their
 * feet on y = 0 (`yaw` and `roll` in rad, then `shift` in m). The jaguar's body is turned about 30 degrees
 * from +z; the armadillo is tipped about 11 degrees on to its side and sits a little off its own centre.
 */
export const MODEL_FIX = Object.freeze({
  jaguar: { yaw: 0.52 },
  tiger: { yaw: 0.52 },
  armadillo: { roll: -0.19, shift: [-0.055, -0.017, 0] },
})

/**
 * Idle motion for the animals that stand or perch where they are put (uniforms `uT` time, `uIdle` 0..1):
 * `tail` a swish from `from` to `to` along the body (a jaguar's), `wave` a slither (an anaconda's), `wag` a fish's tail beat, `beat` a dolphin's,
 * `head` a slow look about from above `neckY`, turning round z = `pz`, `ruffle` now and then the wings shake out.
 * Roamers and flyers keep `uIdle` at 0, so they do none of it.
 */
export const IDLE_MOTION = Object.freeze({
  jaguar: { tail: { from: -0.5, to: -0.8, amp: 0.09, rate: 2.0 } },
  tiger: { tail: { from: -0.5, to: -0.8, amp: 0.09, rate: 2.0 } },
  // the cat's tail starts about 0.2 m behind its middle and reaches 0.45 m
  cat: { tail: { from: -0.22, to: -0.42, amp: 0.045, rate: 3.2 } },
  anaconda: { wave: { amp: 0.05, k: 6, rate: 2.2 } },
  // a fish beats its tail: the swing grows towards the tail (z < 0) and runs along the body
  fish: { wag: { amp: 0.09, k: 7, rate: 7 } },
  // a dolphin beats its tail up and down: the beat grows towards the tail (z < 0)
  dolphin: { beat: { amp: 0.05, k: 5, rate: 7 } },
  capuchin: { head: { neckY: 0.38, pz: 0.1, turn: 0.5 } },
  harpyEagle: { head: { neckY: 0.72, pz: 0.12, turn: 0.45 }, ruffle: { x0: 0.1, lift: 0.5, flare: 0.6 } },
  hoatzin: { head: { neckY: 0.5, pz: 0.3, turn: 0.5 }, ruffle: { x0: 0.14, lift: 0.4, flare: 0.3 } },
})

/** The uniform objects one animal's materials share; the game sets their `.value`s every frame. */
export const makeMotion = () => ({ uPh: { value: 0 }, uAmp: { value: 0 }, uT: { value: 0 }, uIdle: { value: 0 } })

export const hasMotion = (kind) => Boolean(LEG_MOTION[kind] || WING_MOTION[kind] || HOP_MOTION[kind] || IDLE_MOTION[kind])
const f = (n) => Number(n).toFixed(4)

/** The GLSL lines that go right after `begin_vertex` (they move `transformed`, never `position`). */
function moveGlsl(kind) {
  const leg = LEG_MOTION[kind]
  if (leg) {
    const yaw = leg.yaw ?? 0
    const ax = f(Math.sin(yaw)) // the body's own front-to-back direction on the ground (x, z)
    const az = f(Math.cos(yaw))
    return `
  vec2 mA = vec2(${ax}, ${az});
  vec2 mB = vec2(${az}, ${f(-Math.sin(yaw))});
  vec2 mP = position.xz - vec2(${f(leg.cx)}, ${f(leg.cz)});
  float mSx = clamp(dot(mP, mB) / ${f(leg.xw)}, -1.0, 1.0);
  float mSz = clamp(dot(mP, mA) / ${f(leg.zw)}, -1.0, 1.0);
  float mBelow = max(${f(leg.hip)} - position.y, 0.0);
  float mDiag = mSx * mSz;
  transformed.xz += mA * ${f(leg.ang)} * uAmp * sin(uPh) * mDiag * mBelow;
  transformed.y += ${f(leg.lift)} * uAmp * max(mDiag * cos(uPh), 0.0) * (mBelow / ${f(leg.hip)});`
  }
  const hop = HOP_MOTION[kind]
  if (hop) {
    return `
  float mHop = uAmp * abs(sin(uPh));
  transformed.y += ${f(hop.tuck)} * mHop * max(${f(hop.hip)} - position.y, 0.0);
  float mWx = max(abs(position.x) - ${f(hop.x0)}, 0.0);
  transformed.y += ${f(hop.lift)} * mHop * mWx;
  transformed.x += sign(position.x) * ${f(hop.flare)} * mHop * mWx;`
  }
  const wing = WING_MOTION[kind]
  if (wing) {
    return `
  float mWx = max(abs(position.x) - ${f(wing.x0)}, 0.0);
  transformed.y += ${f(wing.ang)} * uAmp * sin(uPh - 2.5 * mWx) * mWx;`
  }
  return ''
}

/** The idle lines (variables start with `i`, so they never clash with the others). */
function idleGlsl(kind) {
  const idle = IDLE_MOTION[kind]
  if (!idle) return ''
  let out = ''
  if (idle.tail) {
    const leg = LEG_MOTION[kind]
    const yaw = leg.yaw ?? 0
    out += `
  vec2 iA = vec2(${f(Math.sin(yaw))}, ${f(Math.cos(yaw))});
  float iU = dot(position.xz - vec2(${f(leg.cx)}, ${f(leg.cz)}), iA);
  float iTail = smoothstep(${f(idle.tail.from)}, ${f(idle.tail.to)}, iU);
  transformed.xz += vec2(iA.y, -iA.x) * ${f(idle.tail.amp)} * uIdle * iTail * sin(uT * ${f(idle.tail.rate)} + iU * 4.0);`
  }
  if (idle.wag) out += `
  float iTailW = smoothstep(0.15, -0.5, position.z);
  transformed.x += ${f(idle.wag.amp)} * uIdle * iTailW * sin(uT * ${f(idle.wag.rate)} + position.z * ${f(idle.wag.k)});`
  if (idle.beat) out += `
  float iBeatW = smoothstep(0.25, -0.65, position.z);
  transformed.y += ${f(idle.beat.amp)} * uIdle * iBeatW * sin(uT * ${f(idle.beat.rate)} + position.z * ${f(idle.beat.k)});`
  if (idle.wave) out += `
  transformed.x += ${f(idle.wave.amp)} * uIdle * sin(position.z * ${f(idle.wave.k)} - uT * ${f(idle.wave.rate)});`
  if (idle.head) {
    out += `
  float iW = smoothstep(${f(idle.head.neckY)}, ${f(idle.head.neckY + 0.08)}, position.y);
  float iAng = iW * uIdle * ${f(idle.head.turn)} * sin(uT * 0.9) * (0.5 + 0.5 * sin(uT * 0.37));
  vec2 iD = position.xz - vec2(0.0, ${f(idle.head.pz)});
  transformed.xz += vec2(iD.x * cos(iAng) - iD.y * sin(iAng), iD.x * sin(iAng) + iD.y * cos(iAng)) - iD;`
  }
  if (idle.ruffle) out += `
  float iRuf = uIdle * pow(0.5 + 0.5 * sin(uT * 1.1), 6.0);
  float iWx = max(abs(position.x) - ${f(idle.ruffle.x0)}, 0.0);
  transformed.y += ${f(idle.ruffle.lift)} * iRuf * iWx;
  transformed.x += sign(position.x) * ${f(idle.ruffle.flare)} * iRuf * iWx;`
  return out
}

/** The GLSL lines that go right after `begin_vertex`: the roaming or flying motion, then the idle motion. */
export function motionGlsl(kind) {
  return `${moveGlsl(kind)}${idleGlsl(kind)}`
}

/** Adds the uniforms and the motion to a standard material's shader (call from onBeforeCompile). */
export function patchShader(shader, kind, uniforms) {
  for (const name of ['uPh', 'uAmp', 'uT', 'uIdle']) shader.uniforms[name] = uniforms[name]
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nuniform float uPh;\nuniform float uAmp;\nuniform float uT;\nuniform float uIdle;')
    .replace('#include <begin_vertex>', `#include <begin_vertex>${motionGlsl(kind)}`)
}
