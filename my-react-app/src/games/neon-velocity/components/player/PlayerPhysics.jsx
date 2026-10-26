import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import {
  BASE_SPEED, COLORS, COYOTE_TIME, DOUBLE_JUMP_VELOCITY, FALL_DEATH_Y,
  FOOT_RADIUS, FREE_LIMIT, GRAVITY, FREE_STEER_SPEED, GLIDE_DELAY, GLIDE_GRAVITY,
  GLIDE_MAX_FALL, GRIND_SPEED_BONUS, HEAD_OFFSET, HEAD_RADIUS, HIT_INVULNERABILITY,
  HIT_MOMENTUM, JUMP_BUFFER, JUMP_CUT, JUMP_VELOCITY, LANES, LANE_SNAP, MOMENTUM_RECOVERY,
  RAIL_CAPTURE_ABOVE, RAIL_CAPTURE_BELOW, RAIL_CAPTURE_DX, RAIL_CAPTURE_MAX_VY,
  MAX_SPEED_MULTIPLIER, SLAM_VELOCITY, SLIDE_DURATION, STEERING_MODES,
  SURGE_SPEED, WALLRUN_DURATION,
  WALL_CAPTURE_X, WALL_JUMP_VELOCITY, WALL_KICK, WALL_THICKNESS, WALL_X,
} from '../../config/constants'
import { difficultyConfig } from '../../config/difficulty'
import { input } from '../../stores/inputStore'
import { runtime } from '../../stores/runtime'
import { DeathCause, GameStatus, useGameStore } from '../../stores/useGameStore'
import { createBody, moveBody } from '../../systems/collisionWorld'
import { EV, GameEvents } from '../../systems/events'
import { BulbuliModel } from './BulbuliModel'
import { PlayerMode as M } from './playerModes'

const CENTER_LANE = Math.floor(LANES.length / 2)
const WALL_RUN_X = WALL_X - WALL_THICKNESS / 2 - FOOT_RADIUS - 0.05
// The player's collision box: 0.9 m wide, 1.6 m tall standing, 0.9 m tall sliding
// (same sizes as the old foot + head spheres, so every hazard still clears the same way).
const STAND = { radius: FOOT_RADIUS, height: FOOT_RADIUS + HEAD_OFFSET + HEAD_RADIUS, footOffset: FOOT_RADIUS }
const SLIDE = { radius: FOOT_RADIUS, height: FOOT_RADIUS * 2, footOffset: FOOT_RADIUS }
const nearestLane = (x) =>
  LANES.reduce((best, lx, i) => (Math.abs(lx - x) < Math.abs(LANES[best] - x) ? i : best), 0)

/**
 * PlayerPhysics: Bulbuli's parkour controller. No physics engine: the player is a
 * kinematic body ({ pos, vel }) that this component moves itself in useFrame.
 *
 * Every frame we:
 *   1. read ground contact from last frame's collision pass (grounded, ramp slope)
 *   2. drain the hazard hit queue (i-frames / Neon Surge decide if it counts)
 *   3. run the locomotion state machine (see playerModes.js) → vx, vy, forward speed
 *   4. moveBody(): integrate with gravity and resolve against the AABB collision world
 *      (systems/collisionWorld.js); hazards and pickups fire their sensors from there
 *   5. copy the result onto the avatar group and into runtime for camera / VFX
 *
 * Difficulty (config/difficulty.js) scales forward speed, gravity, jump launch,
 * coyote/buffer windows and wall-run time. Hard = all multipliers 1.
 */
export function PlayerPhysics() {
  const root = useRef()
  const visual = useRef()
  // one body per run: <GameCanvas> remounts this component (key=runId) on restart
  const body = useRef(null)
  if (!body.current) body.current = createBody(0, FOOT_RADIUS, 0)

  const lane = useRef(CENTER_LANE)
  const st = useRef({
    mode: M.RUN,
    lastGrounded: 0,
    lastJumpTime: -10,
    jumpsUsed: 0,
    jumpCutArmed: false,
    slideTimer: 0,
    wallId: null,
    wallSide: 0,
    wallTimer: 0,
    railId: null,
    ignoreRailsUntil: 0,
    ignoreWallsUntil: 0,
    kickX: 0,
    momentum: 1,
    invulnUntil: 0,
    flip: 0,          // double-jump somersault progress (visual)
    airVy: 0,         // last airborne vertical speed → landing impact
    slamming: false,
  })

  useFrame((_, delta) => {
    const b = body.current
    const game = useGameStore.getState()
    if (game.status !== GameStatus.PLAYING) return

    const dt = Math.min(delta, 0.05)
    const s = st.current
    runtime.gameTime += dt
    const now = runtime.gameTime
    const pos = b.pos
    const vel = b.vel
    const lanesMode = game.steeringMode === STEERING_MODES.LANES
    const tune = difficultyConfig(game.course?.difficulty ?? game.difficulty)
    const jumpBuffer = JUMP_BUFFER * tune.jumpWindow
    const coyoteTime = COYOTE_TIME * tune.jumpWindow
    const baseSpeed = BASE_SPEED * tune.speedScale
    const wallRunDuration = WALLRUN_DURATION * tune.wallRunTime

    const at = () => [pos.x, pos.y, pos.z]
    const emit = (type, payload) => GameEvents.emit(type, payload)

    // ── Fell into the void ──
    if (pos.y < FALL_DEATH_Y) {
      emit(EV.FALL)
      game.endGame(DeathCause.FALL)
      return
    }

    // ── 1. Input edges ──
    // Jump buffer: a press stays valid for jumpBuffer seconds, but always for at least one
    // frame, so a quick tap is never lost on a slow device (one frame can be longer than the buffer).
    const realNow = performance.now() / 1000
    const lastFrame = s.lastFrameReal ?? realNow
    s.lastFrameReal = realNow
    if (input.jumpPressed && realNow - input.jumpPressTime > jumpBuffer && input.jumpPressTime < lastFrame) {
      input.jumpPressed = false
    }
    let jumpWanted = input.jumpPressed
    const useJump = () => { input.jumpPressed = false; jumpWanted = false }

    let laneInput = 0
    if (input.laneShift !== 0) {
      laneInput = Math.sign(input.laneShift)
      input.laneShift -= laneInput
    }
    const steerDir = (input.right ? 1 : 0) - (input.left ? 1 : 0)

    // ── 2. Ground contact (from last frame's collision pass) ──
    // Right after a jump the feet may still be touching the floor: don't count that as grounded.
    const grounded = b.grounded && s.mode !== M.GRIND && now - s.lastJumpTime > 0.12
    if (grounded) {
      s.lastGrounded = now
      s.jumpsUsed = 0
    }
    const coyote = now - s.lastGrounded <= coyoteTime && s.jumpsUsed === 0

    let mode = s.mode
    let vy = vel.y
    let gravityScale = 1

    const groundJump = () => {
      useJump()
      vy = JUMP_VELOCITY * tune.jumpScale
      s.jumpsUsed = 1
      s.lastJumpTime = now
      s.jumpCutArmed = true
      mode = M.AIR
      emit(EV.JUMP, { position: at() })
    }
    const leaveRail = (ignoreFor = 0.25) => {
      if (s.railId) emit(EV.GRIND_END)
      s.railId = null
      s.ignoreRailsUntil = now + ignoreFor
    }
    const leaveWall = () => {
      s.wallId = null
      s.ignoreWallsUntil = now + 0.3
    }

    // ── 3. Hazard hits ──
    if (runtime.hitQueue.length) {
      const hits = runtime.hitQueue.splice(0)
      if (game.boosting) {
        // Neon Surge smashes straight through hazards
        hits.forEach((h) => emit(EV.SMASH, { position: h.position ?? at(), kind: h.kind }))
      } else if (now >= s.invulnUntil) {
        s.invulnUntil = now + HIT_INVULNERABILITY
        s.momentum = HIT_MOMENTUM
        const fatal = game.takeHit()
        emit(EV.HIT, { position: hits[0].position ?? at(), hearts: useGameStore.getState().hearts })
        if (fatal) return
        if (mode === M.GRIND) leaveRail(0.6)
        if (mode === M.WALLRUN) leaveWall()
        if (mode === M.GRIND || mode === M.WALLRUN || mode === M.GLIDE) mode = M.AIR
        vy = Math.max(vy, 5) // stumble hop
      }
    }
    s.momentum = Math.min(1, s.momentum + MOMENTUM_RECOVERY * dt)
    runtime.invulnerable = now < s.invulnUntil || game.boosting

    // ── 4. State machine ──
    if (mode === M.GRIND) {
      const rail = runtime.rails.get(s.railId)
      if (jumpWanted) {
        groundJump()
        leaveRail()
      } else if (!rail || pos.z < rail.z1) {
        mode = M.AIR
        vy = 3 // small pop off the rail end
        leaveRail()
      } else if ((lanesMode && laneInput) || (!lanesMode && steerDir)) {
        if (lanesMode) lane.current = MathUtils.clamp(lane.current + laneInput, 0, LANES.length - 1)
        laneInput = 0
        mode = M.AIR
        vy = 5 // hop sideways off the rail
        leaveRail(0.35)
      } else {
        pos.x = rail.x
        pos.y = rail.y + FOOT_RADIUS + 0.02
        vy = 0
        gravityScale = 0
      }
    } else if (mode === M.WALLRUN) {
      const wall = runtime.walls.get(s.wallId)
      s.wallTimer -= dt
      const pushAway = lanesMode ? laneInput === -s.wallSide : steerDir === -s.wallSide
      if (jumpWanted) {
        // Wall jump: up and away, refunds the double jump
        useJump()
        vy = WALL_JUMP_VELOCITY * tune.jumpScale
        s.jumpsUsed = 1
        s.lastJumpTime = now
        s.jumpCutArmed = true
        if (lanesMode) lane.current = CENTER_LANE
        else s.kickX = -s.wallSide * WALL_KICK
        mode = M.AIR
        leaveWall()
        emit(EV.WALL_JUMP, { position: at(), side: s.wallSide })
      } else if (grounded) {
        mode = M.RUN
        leaveWall()
      } else if (!wall || pos.z < wall.z1 || s.wallTimer <= 0 || pushAway) {
        if (pushAway && lanesMode) lane.current = MathUtils.clamp(lane.current + laneInput, 0, LANES.length - 1)
        laneInput = 0
        mode = M.AIR
        leaveWall()
      } else {
        // Rise slightly at first, then sink — a readable wall-run arc
        const t = 1 - s.wallTimer / wallRunDuration
        vy = MathUtils.lerp(1.2, -1.8, t)
        gravityScale = 0
      }
    } else if (mode === M.SLIDE) {
      s.slideTimer -= dt
      if (!grounded && !coyote) mode = M.AIR
      else if (jumpWanted) groundJump()
      else if (s.slideTimer <= 0) mode = M.RUN
    } else {
      // RUN / AIR / GLIDE
      if (grounded && mode !== M.RUN) {
        // Landing — hold slide (e.g. after a slam) to land straight into a slide
        if (s.slamming) emit(EV.SLAM_LAND, { position: at() })
        else emit(EV.LAND, { impact: Math.max(0, -s.airVy), position: at() })
        s.slamming = false
        mode = input.slideHeld ? M.SLIDE : M.RUN
        s.slideTimer = SLIDE_DURATION
        if (mode === M.SLIDE) emit(EV.SLIDE)
      } else if (!grounded && mode === M.RUN && !coyote) {
        mode = M.AIR
      }

      if (jumpWanted && (grounded || coyote)) {
        groundJump()
      } else if (jumpWanted && !grounded && s.jumpsUsed < 2 && mode !== M.RUN && mode !== M.SLIDE) {
        // Double jump (also the single air jump if you walked off a ledge)
        useJump()
        vy = DOUBLE_JUMP_VELOCITY * tune.jumpScale
        s.jumpsUsed = 2
        s.lastJumpTime = now
        s.jumpCutArmed = true
        s.flip = 1
        mode = M.AIR
        emit(EV.DOUBLE_JUMP, { position: at() })
      }

      if (input.slidePressed) {
        if (grounded && mode !== M.AIR) {
          mode = M.SLIDE
          s.slideTimer = SLIDE_DURATION
          emit(EV.SLIDE)
        } else if (!grounded) {
          vy = Math.min(vy, SLAM_VELOCITY) // slam
          if (mode === M.GLIDE) mode = M.AIR
          if (!s.slamming) emit(EV.SLAM)
          s.slamming = true
        }
      }

      // Glide: hold jump while falling
      if (mode === M.AIR && vy < 0 && input.jumpHeld && now - s.lastJumpTime > GLIDE_DELAY) mode = M.GLIDE
      if (mode === M.GLIDE && !input.jumpHeld) mode = M.AIR

      // Rail capture
      if ((mode === M.AIR || mode === M.GLIDE) && now > s.ignoreRailsUntil && vy <= RAIL_CAPTURE_MAX_VY) {
        const feet = pos.y - FOOT_RADIUS
        for (const [id, r] of runtime.rails) {
          if (pos.z > r.z0 || pos.z < r.z1) continue
          if (Math.abs(pos.x - r.x) > RAIL_CAPTURE_DX) continue
          if (feet < r.y - RAIL_CAPTURE_BELOW || feet > r.y + RAIL_CAPTURE_ABOVE) continue
          mode = M.GRIND
          s.railId = id
          s.jumpsUsed = 0
          lane.current = nearestLane(r.x)
          vy = 0
          s.slamming = false
          emit(EV.GRIND_START, { position: [r.x, r.y, pos.z] })
          break
        }
      }

      // Wall-run capture
      if ((mode === M.AIR || mode === M.GLIDE) && now > s.ignoreWallsUntil) {
        for (const [id, w] of runtime.walls) {
          if (pos.z > w.z0 || pos.z < w.z1) continue
          if (Math.sign(pos.x) !== w.side || Math.abs(pos.x) < WALL_CAPTURE_X) continue
          if (pos.y < w.yMin || pos.y > w.yMax) continue
          mode = M.WALLRUN
          s.wallId = id
          s.wallSide = w.side
          s.wallTimer = wallRunDuration
          s.jumpsUsed = 0
          vy = Math.max(vy, 1.2)
          s.slamming = false
          emit(EV.WALLRUN_START, { side: w.side })
          break
        }
      }

      // Variable jump height: releasing early cuts the rise
      if (input.jumpReleased && s.jumpCutArmed) {
        if (mode === M.AIR && vy > 0) vy *= JUMP_CUT
        s.jumpCutArmed = false
      }

      // Gravity shaping
      if (mode === M.AIR) {
        gravityScale = vy > 0 ? (input.jumpHeld ? tune.riseHoldGravity : 1) : tune.fallGravity
      } else if (mode === M.GLIDE) {
        gravityScale = GLIDE_GRAVITY
        if (vy < -GLIDE_MAX_FALL) vy = MathUtils.lerp(vy, -GLIDE_MAX_FALL, 1 - Math.exp(-dt * 8))
      }
    }
    input.slidePressed = false
    input.jumpReleased = false

    // ── 5. Velocity ──
    const runSpeed = baseSpeed * game.speedMultiplier * s.momentum
      * (mode === M.GRIND ? GRIND_SPEED_BONUS : 1)
    const speed = runSpeed * (game.boosting ? SURGE_SPEED : 1)

    // Follow slopes (ramps): climb at the ramp's angle, so leaving the top launches us upward
    if (grounded && (mode === M.RUN || mode === M.SLIDE) && b.groundSlope > 0) {
      vy = speed * b.groundSlope
    }

    let vx
    if (mode === M.GRIND) {
      vx = 0
    } else if (mode === M.WALLRUN) {
      vx = (s.wallSide * WALL_RUN_X - pos.x) * LANE_SNAP
    } else if (lanesMode) {
      if (laneInput) lane.current = MathUtils.clamp(lane.current + laneInput, 0, LANES.length - 1)
      vx = (LANES[lane.current] - pos.x) * LANE_SNAP
    } else {
      vx = steerDir * FREE_STEER_SPEED
      if ((pos.x <= -FREE_LIMIT && vx < 0) || (pos.x >= FREE_LIMIT && vx > 0)) vx = 0
    }
    vx += s.kickX
    s.kickX *= Math.exp(-dt * 6)

    // ── 5. Move + collide (low profile while sliding, so overhead bars clear) ──
    vel.set(vx, vy, -speed)
    moveBody(b, dt, mode === M.SLIDE ? SLIDE : STAND, GRAVITY * tune.gravityScale * gravityScale)
    if (root.current) root.current.position.copy(pos)

    // ── 6. Publish ──
    // remember how hard we came down: if we landed during this move, use the speed at touchdown
    if (mode === M.AIR || mode === M.GLIDE) s.airVy = b.grounded ? b.landedVy : vel.y
    s.mode = mode
    runtime.playerPosition.set(pos.x, pos.y, pos.z)
    runtime.speed = speed
    // relative to this mode's base speed, so speed VFX/music still build up in every mode
    runtime.speedFactor = MathUtils.clamp((runSpeed / baseSpeed - 1) / (MAX_SPEED_MULTIPLIER - 1), 0, 1)
    runtime.playerMode = mode
    runtime.wallSide = mode === M.WALLRUN ? s.wallSide : 0
    game.setPlayerMode(mode)
    game.advance(dt, Math.max(0, -pos.z))

    // ── 7. Visual feedback (the physics body never rotates) ──
    const v = visual.current
    if (v) {
      const roll = mode === M.WALLRUN ? s.wallSide * 0.5 : -vx * 0.035
      v.rotation.z = MathUtils.lerp(v.rotation.z, roll, 0.2)
      if (s.flip > 0) {
        s.flip = Math.max(0, s.flip - dt / 0.35)
        v.rotation.x = -(1 - s.flip) * Math.PI * 2
      } else {
        const pitch = mode === M.SLIDE ? -0.5 : mode === M.GLIDE ? 0.15 : vy * 0.03
        v.rotation.x = MathUtils.lerp(v.rotation.x % (Math.PI * 2), pitch, 0.2)
      }
      const squash = mode === M.SLIDE ? 0.55 : 1
      v.scale.y = MathUtils.lerp(v.scale.y, squash, 0.3)
      v.position.y = mode === M.SLIDE ? -0.12 : 0
      // i-frame blink
      v.visible = !(now < s.invulnUntil && Math.floor(now * 14) % 2 === 0)
    }
  })

  return (
    <group ref={root} name="player" position={[0, FOOT_RADIUS, 0]}>
      <group ref={visual}>
        <group position={[0, 0.35, 0]}>
          <BulbuliModel />
        </group>
        <pointLight color={COLORS.magenta} intensity={18} distance={9} decay={2} position={[0, 0.6, 0]} />
      </group>
    </group>
  )
}
