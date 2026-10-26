import { useFrame } from '@react-three/fiber'
import { audio } from '../../audio/AudioController'
import { useGameEvent } from '../../hooks/useVisualFx'
import { runtime } from '../../stores/runtime'
import { GameStatus, useGameStore } from '../../stores/useGameStore'
import { EV } from '../../systems/events'
import { particles } from '../../systems/particles'
import { addTrauma, punchFov, sharedUniforms, vfx } from '../../systems/vfx'

/*
 * VfxDirector — the one place where gameplay turns into spectacle.
 *
 * Per frame: eases the vfx state (speed, surge, pulses), decays shake/punches,
 * and writes the shared shader uniforms (time, speed, surge, hit, audio bands).
 * Per event: spawns particle bursts and adds camera trauma / FOV punches.
 */

const damp = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-rate * dt))
const bands = new Float32Array(8)

// Particle presets — all world space; `inherit` keeps bursts travelling with the player a little
const carry = (k) => [0, 0, -runtime.speed * k]

export function VfxDirector() {
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const { status, boosting } = useGameStore.getState()
    const running = status === GameStatus.PLAYING

    // Surge eases in fast, out slowly — the exit feels like decompression
    const surgeTarget = boosting && running ? 1 : 0
    vfx.surge = damp(vfx.surge, surgeTarget, surgeTarget > vfx.surge ? 6 : 1.8, dt)
    vfx.speedFactor = damp(vfx.speedFactor, running || status === GameStatus.PAUSED ? runtime.speedFactor : 0, 3, dt)

    if (status !== GameStatus.PAUSED) {
      vfx.trauma = Math.max(0, vfx.trauma - dt * 1.4)
      vfx.hit = Math.max(0, vfx.hit - dt * 2.5)
      vfx.pickup = Math.max(0, vfx.pickup - dt * 4)
      vfx.fovPunch = damp(vfx.fovPunch, 0, 4, dt)
    }

    // Audio spectrum → billboards / sun. Procedural fallback when audio is off or locked.
    if (!audio.getBands(bands)) {
      const t = state.clock.elapsedTime
      for (let i = 0; i < 8; i++) {
        bands[i] = 0.35 + 0.3 * Math.sin(t * (2 + i * 0.7) + i) * Math.sin(t * 0.9 + i * 1.3)
      }
    }

    sharedUniforms.uTime.value = state.clock.elapsedTime
    sharedUniforms.uSpeed.value = vfx.speedFactor
    sharedUniforms.uSurge.value = vfx.surge
    sharedUniforms.uHit.value = vfx.hit
    const u = sharedUniforms.uBands.value
    for (let i = 0; i < 8; i++) u[i] = damp(u[i], bands[i], 18, dt)
  })

  // ── Event → effect mapping ──
  useGameEvent(EV.JUMP, ({ position }) => {
    particles.emit({
      position: [position[0], position[1] - 0.4, position[2]], count: 10,
      color: '#7b2bff', colorB: '#22f3ff', shape: 'ring', speed: [1.5, 3], life: [0.25, 0.45],
      size: [0.08, 0.16], velocity: carry(0.5), drag: 4,
    })
  })
  useGameEvent(EV.DOUBLE_JUMP, ({ position }) => {
    punchFov(2.5)
    particles.emit({
      position, count: 26, color: '#22f3ff', colorB: '#ffffff', intensity: 3.5, shape: 'ring',
      speed: [3, 5], life: [0.3, 0.5], size: [0.08, 0.18], velocity: carry(0.6), drag: 3,
    })
  })
  useGameEvent(EV.WALL_JUMP, ({ position, side }) => {
    addTrauma(0.15)
    particles.emit({
      position: [position[0] + side * 0.4, position[1], position[2]], count: 22,
      color: '#ff2bd6', colorB: '#22f3ff', shape: 'cone', direction: [-side, 0.3, 0.3], spread: 0.7,
      speed: [3, 7], life: [0.3, 0.6], velocity: carry(0.5),
    })
  })
  useGameEvent(EV.LAND, ({ impact, position }) => {
    if (impact < 6) return
    addTrauma(Math.min(0.25, impact * 0.012))
    particles.emit({
      position: [position[0], position[1] - 0.4, position[2]], count: Math.min(30, Math.floor(impact * 1.6)),
      color: '#7b2bff', colorB: '#ff2bd6', shape: 'ring', speed: [2, 4.5], life: [0.25, 0.5],
      size: [0.08, 0.2], velocity: carry(0.6), drag: 4,
    })
  })
  useGameEvent(EV.SLAM_LAND, ({ position }) => {
    addTrauma(0.45)
    punchFov(-4)
    particles.emit({
      position: [position[0], position[1] - 0.4, position[2]], count: 50,
      color: '#ff2bd6', colorB: '#ffd23f', intensity: 3.5, shape: 'ring', speed: [5, 10],
      life: [0.3, 0.6], size: [0.1, 0.25], velocity: carry(0.7), drag: 3,
    })
  })
  useGameEvent(EV.GRIND_START, ({ position }) => {
    addTrauma(0.1)
    particles.emit({
      position, count: 24, color: '#ffd23f', colorB: '#ffffff', intensity: 4, shape: 'cone',
      direction: [0, 1, 0.6], spread: 0.9, speed: [3, 7], life: [0.2, 0.5], size: [0.05, 0.12], gravity: -20,
    })
  })
  useGameEvent(EV.PICKUP, ({ variant, position }) => {
    const prism = variant === 'prism'
    vfx.pickup = 1
    particles.emit({
      position, count: prism ? 36 : 14, color: prism ? '#ff2bd6' : '#22f3ff', colorB: '#ffffff',
      intensity: prism ? 4 : 3, speed: [2, prism ? 6 : 4], life: [0.25, 0.55], size: [0.06, 0.16],
      velocity: carry(0.75), drag: 3,
    })
  })
  useGameEvent(EV.HIT, ({ position }) => {
    vfx.hit = 1
    addTrauma(0.6)
    particles.emit({
      position, count: 44, color: '#ff3355', colorB: '#ffd23f', intensity: 3.5, speed: [4, 9],
      life: [0.3, 0.7], size: [0.08, 0.22], gravity: -12, velocity: carry(0.3),
    })
  })
  useGameEvent(EV.SMASH, ({ position }) => {
    addTrauma(0.2)
    particles.emit({
      position, count: 34, color: '#ffcf5a', colorB: '#ffffff', intensity: 4, speed: [6, 12],
      life: [0.3, 0.6], size: [0.08, 0.2], gravity: -10, velocity: carry(0.5),
    })
  })
  useGameEvent(EV.SURGE_START, () => {
    addTrauma(0.45)
    punchFov(12)
    const p = runtime.playerPosition
    particles.emit({
      position: [p.x, p.y + 0.4, p.z], count: 90, color: '#ffcf5a', colorB: '#ff2bd6', intensity: 4.5,
      shape: 'ring', speed: [8, 14], life: [0.4, 0.8], size: [0.1, 0.26], velocity: carry(0.8), drag: 2.5,
    })
  })
  useGameEvent(EV.SPEED_UP, () => punchFov(3))

  return null
}
