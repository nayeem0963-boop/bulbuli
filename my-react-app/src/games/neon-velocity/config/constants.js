// ─── Track layout ────────────────────────────────────────────────
export const LANES = [-3, 0, 3]          // x positions of the three lanes
export const PLATFORM_WIDTH = 10         // full-width platform (all 3 lanes)
export const TRACK_WIDTH = PLATFORM_WIDTH
export const PLATFORM_THICKNESS = 1.2
export const SPAWN_AHEAD = 220           // metres of track kept spawned ahead of the player
export const DESPAWN_BEHIND = 40         // segments fully behind this are unmounted + discarded
export const DIFFICULTY_RAMP = 1500      // metres until difficulty reaches 1.0
export const FALL_DEATH_Y = -10          // falling below this = game over

// ─── Player body ─────────────────────────────────────────────────
export const FOOT_RADIUS = 0.45          // main collider; body origin = its centre
export const HEAD_RADIUS = 0.4           // second collider, disabled while sliding
export const HEAD_OFFSET = 0.75          // standing height = 0.45 + 0.75 + 0.4 = 1.6 m; sliding = 0.9 m

// ─── Run speed ───────────────────────────────────────────────────
export const BASE_SPEED = 18             // m/s at multiplier 1
export const MAX_SPEED_MULTIPLIER = 2.2
export const ACCELERATION = 0.016        // base multiplier gain per second (eases off near max)
export const SPEED_TIER_STEP = 0.2       // every +0.2× is a "speed up" tier (toast + stinger)
export const LANE_SNAP = 14              // how quickly the player slides into a lane
export const FREE_STEER_SPEED = 13
export const FREE_LIMIT = PLATFORM_WIDTH / 2 - FOOT_RADIUS - 0.05
export const GRAVITY = -30

// ─── Jump ────────────────────────────────────────────────────────
export const JUMP_VELOCITY = 11.5
export const DOUBLE_JUMP_VELOCITY = 10
export const JUMP_CUT = 0.5              // releasing jump early multiplies upward velocity by this
export const COYOTE_TIME = 0.1           // can still jump this long after leaving a ledge
export const JUMP_BUFFER = 0.12          // a press this long before landing still counts
export const RISE_HOLD_GRAVITY = 0.85    // gravity scale while rising with jump held (floatier)
export const FALL_GRAVITY = 1.5          // gravity scale while falling (snappier)

// ─── Glide ───────────────────────────────────────────────────────
export const GLIDE_GRAVITY = 0.15
export const GLIDE_MAX_FALL = 2.2        // m/s terminal velocity while gliding
export const GLIDE_DELAY = 0.18          // hold jump this long after a jump before glide engages

// ─── Slide / slam ────────────────────────────────────────────────
export const SLIDE_DURATION = 0.75
export const SLAM_VELOCITY = -22         // slide pressed in mid-air = fast fall

// ─── Wall run ────────────────────────────────────────────────────
export const WALL_X = 5.6                // panel centre distance from track centre
export const WALL_THICKNESS = 0.4
export const WALL_CAPTURE_X = 2.2        // must be at least this far out (outer lane) to attach
export const WALLRUN_DURATION = 1.4
export const WALL_JUMP_VELOCITY = 10.5
export const WALL_KICK = 9               // sideways push away from the wall (free mode)

// ─── Rail grind ──────────────────────────────────────────────────
export const RAIL_CAPTURE_DX = 0.9       // horizontal snap distance
export const RAIL_CAPTURE_ABOVE = 1.6    // feet may be this far above the rail and still snap
export const RAIL_CAPTURE_BELOW = 0.3
export const RAIL_CAPTURE_MAX_VY = 3     // only snap while not rising fast
export const GRIND_SPEED_BONUS = 1.1

// ─── Hits / momentum / boost ─────────────────────────────────────
export const MAX_HEARTS = 3
export const HIT_INVULNERABILITY = 1.2   // seconds of i-frames after a hit
export const HIT_MOMENTUM = 0.4          // speed factor right after a hit (stumble)
export const MOMENTUM_RECOVERY = 0.9     // factor regained per second
export const HIT_MULTIPLIER_LOSS = 0.7   // long-term speed multiplier is multiplied by this
export const HIT_METER_LOSS = 0.2

// ─── Neon Surge (auto-triggers when the energy meter fills) ──────
export const SURGE_DURATION = 5          // seconds; the meter drains over this time
export const SURGE_SPEED = 1.6           // forward speed multiplier while surging

// ─── Look ────────────────────────────────────────────────────────
export const COLORS = {
  background: '#07020f',
  fog: '#1a0633',
  magenta: '#ff2bd6',
  cyan: '#22f3ff',
  yellow: '#ffd23f',
  violet: '#7b2bff',
  red: '#ff3355',
}

export const STEERING_MODES = { LANES: 'lanes', FREE: 'free' }
