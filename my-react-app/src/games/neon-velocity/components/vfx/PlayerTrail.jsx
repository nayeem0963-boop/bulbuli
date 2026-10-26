import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import { Slot } from '../../config/catalog'
import { getLoadout, useLoadout } from '../../hooks/useLoadout'
import { useVfxQuality } from '../../hooks/useVisualFx'
import { useUiStore } from '../../stores/useUiStore'
import { runtime } from '../../stores/runtime'
import { GameStatus, useGameStore } from '../../stores/useGameStore'
import { particles } from '../../systems/particles'
import { vfx } from '../../systems/vfx'
import { NeonRibbon } from './NeonRibbon'

/*
 * PlayerTrail — Bulbuli's light trail.
 *   - Tail ribbon (magenta → violet; white → gold in Neon Surge), always on while running
 *   - Wing-tip ribbons that fade in while gliding, at high speed and during surge
 *   - Continuous spark stream from the tail; rate and brightness scale with speed
 *   - Mode-specific sparks: grinding (yellow, from the feet), wall running (from the wall side)
 * Colours and width come from the equipped trail (Vault). While the Vault's Trails
 * tab is open on the menu, the trail loops around the bird as a live preview.
 */

const inRun = () => {
  const s = useGameStore.getState().status
  return s === GameStatus.PLAYING || s === GameStatus.PAUSED
}
const previewing = () => {
  const ui = useUiStore.getState()
  return useGameStore.getState().status === GameStatus.START && ui.vaultOpen && ui.vaultTab === Slot.TRAIL
}
// Vault preview: a figure-of-eight swoop around the menu bird
const orbit = (v, phase) => {
  const t = performance.now() / 1000 * 2.4 + phase
  v.set(Math.sin(t) * 1.6, 0.9 + Math.sin(t * 2) * 0.35, Math.sin(t) * Math.cos(t) * 2.2)
}
const tailAnchor = (v) => {
  if (previewing()) { orbit(v, 0); return true }
  const p = runtime.playerPosition
  v.set(p.x, p.y + 0.42 - (runtime.playerMode === 'SLIDE' ? 0.25 : 0), p.z + 0.55)
  return inRun()
}
const wingAnchor = (side) => (v) => {
  if (previewing()) { orbit(v, side * 0.35); v.y += 0.25; return true }
  const p = runtime.playerPosition
  const spread = runtime.playerMode === 'GLIDE' ? 0.95 : 0.75
  v.set(p.x + side * spread, p.y + 0.5, p.z + 0.15)
  return inRun()
}
const wingOpacity = () => {
  if (previewing()) return 1
  const glide = runtime.playerMode === 'GLIDE' ? 1 : 0
  const fast = MathUtils.clamp((vfx.speedFactor - 0.55) * 2.2, 0, 1)
  return Math.max(glide, fast, vfx.surge)
}
const wingL = wingAnchor(-1)
const wingR = wingAnchor(1)

export function PlayerTrail() {
  const quality = useVfxQuality()
  const { trail } = useLoadout()
  const sparkAcc = useRef(0)
  const modeAcc = useRef(0)

  useFrame((_, delta) => {
    if (useGameStore.getState().status !== GameStatus.PLAYING) return
    const dt = Math.min(delta, 0.05)
    const p = runtime.playerPosition
    const scale = quality === 'high' ? 1 : 0.45

    // Tail sparks: 25/s at base speed → ~280/s in surge
    const rate = (25 + vfx.speedFactor * 90 + vfx.surge * 160) * scale
    sparkAcc.current += rate * dt
    const n = Math.floor(sparkAcc.current)
    if (n > 0) {
      sparkAcc.current -= n
      const surge = vfx.surge > 0.5
      const [sparkA, sparkB] = getLoadout().trail.sparks
      particles.emit({
        position: [p.x + MathUtils.randFloatSpread(0.3), p.y + 0.4, p.z + 0.6],
        count: n,
        color: surge ? '#ffffff' : sparkA,
        colorB: surge ? '#ffcf5a' : sparkB,
        intensity: 2 + vfx.speedFactor * 2 + vfx.surge * 2,
        speed: [0.3, 1.4],
        life: [0.25, 0.6],
        size: [0.06, 0.16],
        drag: 3,
      })
    }

    // Mode sparks
    const mode = runtime.playerMode
    if (mode === 'GRIND' || mode === 'WALLRUN') {
      modeAcc.current += 120 * scale * dt
      const m = Math.floor(modeAcc.current)
      if (m > 0) {
        modeAcc.current -= m
        const wall = mode === 'WALLRUN'
        particles.emit({
          position: wall
            ? [p.x + runtime.wallSide * 0.45, p.y, p.z + 0.2]
            : [p.x, p.y - 0.45, p.z + 0.1],
          count: m,
          color: wall ? '#22f3ff' : '#ffd23f',
          colorB: '#ffffff',
          intensity: 3.5,
          shape: 'cone',
          direction: wall ? [-runtime.wallSide * 0.4, 0.6, 1] : [0, 0.8, 1],
          spread: 0.6,
          speed: [3, 8],
          life: [0.2, 0.45],
          size: [0.05, 0.1],
          gravity: -18,
          drag: 1,
        })
      }
    }
  })

  return (
    <>
      <NeonRibbon
        getAnchor={tailAnchor}
        width={0.38 * trail.width}
        segments={quality === 'high' ? 30 : 18}
        colorA={trail.ribbon[0]}
        colorB={trail.ribbon[1]}
      />
      {[wingL, wingR].map((anchor, i) => (
        <NeonRibbon
          key={i}
          getAnchor={anchor}
          getOpacity={wingOpacity}
          width={0.09 * trail.width}
          segments={quality === 'high' ? 22 : 12}
          colorA={trail.wingRibbon[0]}
          colorB={trail.wingRibbon[1]}
        />
      ))}
    </>
  )
}
