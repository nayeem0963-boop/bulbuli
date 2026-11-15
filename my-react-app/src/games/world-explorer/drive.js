/**
 * One frame of World Explorer driving, without React or three.js: turns the shared input object
 * (skyward-explorer/input.js) into the physics input for stepPlayer, and applies the Sundarbans
 * water rule. ExplorerController calls these every frame; movement.test.js drives the same path.
 */
import { cameraRelative } from '../skyward-explorer/physics.js'
import { cameraTurn, isFlightHeld, isJumpHeld, readStick } from '../skyward-explorer/input.js'
import { duneHeightAt } from './biomes/sandShapes.js'

export const TURN_SPEED = 1.8
export const AVATAR_HEIGHT_OFFSET = 0.06

/**
 * @param input  the input object itself (`inputRef.current`), never the ref
 * @param state  { active, yaw, lastJumps, dt }: lastJumps is the jump-press count already handled
 *               (null before the first frame, so a press made before the map opened is ignored)
 * @returns { yaw, lastJumps, step }  the new camera yaw and press count, and stepPlayer's input
 */
export function readExplorerControls(input, { active, yaw, lastJumps, dt }) {
  if (!input || !(input.held instanceof Set)) {
    throw new TypeError('World Explorer controls need the input object (inputRef.current), not the ref or nothing')
  }
  const stick = active ? readStick(input) : { right: 0, forward: 0 }
  const nextYaw = yaw + (active ? cameraTurn(input) : 0) * TURN_SPEED * dt
  const move = cameraRelative(stick.right, stick.forward, nextYaw)
  return {
    yaw: nextYaw,
    lastJumps: input.jumpPresses,
    step: {
      ...move,
      jumpHeld: active && isJumpHeld(input),
      flightHeld: active && isFlightHeld(input),
      avatarHeightOffset: AVATAR_HEIGHT_OFFSET,
      jumpPressed: active && lastJumps !== null && input.jumpPresses !== lastJumps,
    },
  }
}

/** Falling into the water (Sundarbans) carries Bulbuli back to the last safe spot quickly. */
export function rescueFromWater(p, biome, events) {
  if (!biome.water || p.pos[1] >= biome.water.y - 0.7) return
  p.pos = [...p.checkpoint]
  p.vel = [0, 0, 0]
  p.groundId = null
  events.fell = true
}

const DUNES = new WeakMap()
const dunesOf = (biome) => {
  if (!DUNES.has(biome)) DUNES.set(biome, biome.props.filter((prop) => prop.type === 'dune'))
  return DUNES.get(biome)
}

/**
 * Keeps Bulbuli on top of the sand dunes. Walking onto a dune is ordinary ground (its collider in
 * biomes/common.js); this covers arriving from the side, in a jump or in flight: a bird that
 * would end the frame inside a dune is set on the dune's surface instead, and stops falling.
 * Does nothing on maps without dunes.
 */
export function stayOnDunes(p, biome) {
  const dunes = dunesOf(biome)
  if (!dunes.length) return
  let surface = -Infinity
  for (const dune of dunes) surface = Math.max(surface, duneHeightAt(dune, p.pos[0], p.pos[2]))
  if (p.pos[1] >= surface - 0.01) return
  p.pos[1] = surface
  if (p.vel[1] < 0) p.vel[1] = 0
}
