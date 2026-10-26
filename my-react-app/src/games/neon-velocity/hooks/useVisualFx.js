import { useCallback, useEffect, useRef, useState } from 'react'
import { MathUtils } from 'three'
import { GameEvents } from '../systems/events'
import { vfx } from '../systems/vfx'
import { useGameStore } from '../stores/useGameStore'

/** Subscribe to a gameplay event for the component's lifetime. The handler can change freely. */
export function useGameEvent(type, handler) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => GameEvents.on(type, (payload) => ref.current(payload)), [type])
}

/** True when the OS asks for reduced motion — disables shake, aberration spikes and FOV punches. */
export function useReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = (e) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** 'high' | 'low' — from settings (auto-detected on first run, lowered by PerformanceMonitor). */
export const useVfxQuality = () => useGameStore((s) => s.vfxQuality)

/**
 * Trauma-based camera shake (shake = trauma², so small hits stay subtle).
 * Returns apply(camera, time) — call it *after* positioning/aiming the camera.
 * Uses layered sines instead of random jitter so the motion is smooth and readable.
 */
export function useCameraShake({ maxOffset = 0.35, maxRoll = 0.05 } = {}) {
  const reduced = useReducedMotion()
  return useCallback((camera, time) => {
    if (reduced || vfx.trauma <= 0.001) return
    const shake = vfx.trauma * vfx.trauma
    const n = (f, p) => Math.sin(time * f + p) * 0.6 + Math.sin(time * f * 2.3 + p * 1.7) * 0.4
    camera.position.x += n(37, 0) * maxOffset * shake
    camera.position.y += n(41, 3) * maxOffset * shake
    camera.rotateZ(n(29, 7) * maxRoll * shake)
  }, [reduced, maxOffset, maxRoll])
}

/**
 * Cinematic speed-driven FOV with a critically-damped spring, so FOV changes
 * accelerate and settle instead of snapping. Returns update(camera, dt, baseFov).
 *
 *   fov = base + speed widening + Neon Surge widening + one-shot punches
 */
export function useSpeedFov({ speedRange = 16, surgeRange = 14 } = {}) {
  const reduced = useReducedMotion()
  const velocity = useRef(0)
  return useCallback((camera, dt, baseFov) => {
    const punch = reduced ? 0 : vfx.fovPunch
    const target = baseFov
      + Math.pow(vfx.speedFactor, 1.3) * speedRange
      + vfx.surge * surgeRange
      + punch
    // critically damped spring (ω = 9)
    const omega = 9
    const x = camera.fov - target
    const accel = -omega * omega * x - 2 * omega * velocity.current
    velocity.current += accel * dt
    const next = MathUtils.clamp(camera.fov + velocity.current * dt, 40, 110)
    if (Math.abs(next - camera.fov) > 0.001) {
      camera.fov = next
      camera.updateProjectionMatrix()
    }
  }, [reduced, speedRange, surgeRange])
}
