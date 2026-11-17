/**
 * Where the Sundarbans' cat is, and how it walks, at time t. Pure: no THREE. The cat walks straight along
 * the line in sundarbansCredits.js (WALKING_CAT_PATH), turns right round at the end, walks back, and
 * turns again. Its legs step once per `stride` metres it covers (and a little while it turns).
 */
import { WALKING_CAT, WALKING_CAT_PATH } from './sundarbansCredits.js'

const smooth = (u) => u * u * (3 - 2 * u)

/** The length of the walk, and how long one whole circuit of it takes. */
export function catCircuit(walk = WALKING_CAT, path = WALKING_CAT_PATH) {
  const length = Math.abs(path.z1 - path.z0)
  const leg = length / walk.speed
  return { length, leg, period: 2 * leg + 2 * walk.turnSeconds }
}

/**
 * `z` along the line (map coordinates), `heading` (rad, 0 = facing +z, PI = facing -z), `gait` the leg-cycle phase
 * (rad), `walking` 1 while it walks and 0.5 while it turns (how strongly the legs swing).
 */
export function catAt(t, walk = WALKING_CAT, path = WALKING_CAT_PATH) {
  const { length, leg, period } = catCircuit(walk, path)
  const laps = Math.floor(t / period)
  const u = t - laps * period
  const dir = Math.sign(path.z1 - path.z0)
  const stepsPerLap = 2 * length + 2 * walk.turnSteps
  let z, heading, covered, walking
  if (u < leg) { // out
    z = path.z0 + dir * walk.speed * u; heading = dir > 0 ? 0 : Math.PI; covered = walk.speed * u; walking = 1
  } else if (u < leg + walk.turnSeconds) { // turn at the far end
    const k = (u - leg) / walk.turnSeconds
    z = path.z1; heading = (dir > 0 ? 0 : Math.PI) + Math.PI * smooth(k); covered = length + walk.turnSteps * k; walking = 0.5
  } else if (u < 2 * leg + walk.turnSeconds) { // back
    const v = u - leg - walk.turnSeconds
    z = path.z1 - dir * walk.speed * v; heading = dir > 0 ? Math.PI : 0; covered = length + walk.turnSteps + walk.speed * v; walking = 1
  } else { // turn at the near end
    const k = (u - 2 * leg - walk.turnSeconds) / walk.turnSeconds
    z = path.z0; heading = (dir > 0 ? Math.PI : 0) + Math.PI * smooth(k); covered = 2 * length + walk.turnSteps + walk.turnSteps * k; walking = 0.5
  }
  return { z, x: path.x, heading, gait: ((laps * stepsPerLap + covered) / walk.stride) * Math.PI * 2, walking }
}
