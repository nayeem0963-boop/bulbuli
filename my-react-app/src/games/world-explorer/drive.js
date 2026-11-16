/**
 * One frame of World Explorer driving, without React or three.js: turns the shared input object
 * (skyward-explorer/input.js) into the physics input for stepPlayer, and applies the Sundarbans
 * water rule. ExplorerController calls these every frame; movement.test.js drives the same path.
 */
import { cameraRelative } from '../skyward-explorer/physics.js'
import { cameraTurn, isFlightHeld, isJumpHeld, readStick } from '../skyward-explorer/input.js'
import { duneHeightAt } from './biomes/sandShapes.js'

export const TURN_SPEED = 1.8

/** Camera turn, -1..1: the Q / E keys, plus a swipe on a touch screen (`input.touchTurn`, gestures.js). */
export const turnOf = (input) => Math.max(-1, Math.min(1, cameraTurn(input) + (input.touchTurn ?? 0)))
export const AVATAR_HEIGHT_OFFSET = 0.06

/**
 * Cruise flight (touch). A press or flick up (gestures.js, or the jump button) latches `input.touchFly`:
 * Bulbuli takes off and keeps flying, climbing to CRUISE.ceiling and then cruising there, and keeps
 * heading the way it was last steered (or the way the camera looks) when the finger lets go. Steering
 * with the stick changes the heading; a flick down (or any dialog opening) ends it.
 */
export const CRUISE = Object.freeze({ ceiling: 13, lead: 0.35, speed: 0.85 })
export const createCruise = () => ({ dir: null })

/**
 * @param input  the input object itself (`inputRef.current`), never the ref
 * @param state  { active, yaw, lastJumps, dt }: lastJumps is the jump-press count already handled
 *               (null before the first frame, so a press made before the map opened is ignored)
 * @returns { yaw, lastJumps, step }  the new camera yaw and press count, and stepPlayer's input
 */
export function readExplorerControls(input, { active, yaw, lastJumps, dt, cruise = null, body = null }) {
  if (!input || !(input.held instanceof Set)) {
    throw new TypeError('World Explorer controls need the input object (inputRef.current), not the ref or nothing')
  }
  const stick = active ? readStick(input) : { right: 0, forward: 0 }
  const nextYaw = yaw + (active ? turnOf(input) : 0) * TURN_SPEED * dt
  let move = cameraRelative(stick.right, stick.forward, nextYaw)
  if (!active && input.touchFly) input.touchFly = false // a dialog opened: the cruise ends
  const cruising = Boolean(active && cruise && input.touchFly)
  if (cruise && !cruising) cruise.dir = null
  let lift = active && isFlightHeld(input)
  if (cruising) {
    const m = Math.hypot(move.moveX, move.moveZ)
    if (m > 0.05) cruise.dir = [move.moveX / m, move.moveZ / m]
    else {
      // no steering: keep going the way it was heading (or the way the camera looks)
      const ahead = cruise.dir ?? (() => { const f = cameraRelative(0, 1, nextYaw); return [f.moveX, f.moveZ] })()
      cruise.dir = ahead
      move = { moveX: ahead[0] * CRUISE.speed, moveZ: ahead[1] * CRUISE.speed }
    }
    // climb to the cruising height, then hold about there (thrust while below it, a glide above it)
    lift = body ? body.pos[1] + body.vel[1] * CRUISE.lead < CRUISE.ceiling : true
  }
  return {
    yaw: nextYaw,
    lastJumps: input.jumpPresses,
    step: {
      ...move,
      jumpHeld: active && (isJumpHeld(input) || cruising),
      flightHeld: lift,
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
