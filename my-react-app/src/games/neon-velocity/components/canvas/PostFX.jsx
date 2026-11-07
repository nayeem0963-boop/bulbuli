import { useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { HalfFloatType, Vector2, WebGLRenderTarget } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { useGameEvent, useReducedMotion, useVfxQuality } from '../../hooks/useVisualFx'
import { createGradeShader, createSurgeShader } from '../../postfx/neonPasses'
import { EV } from '../../systems/events'
import { vfx } from '../../systems/vfx'
import { useLatest } from '../../../../shared/hooks/useLatest.js'

/*
 * Post-processing on three.js's own EffectComposer (three/examples/jsm), so no extra
 * packages. Order:
 *
 *   Render → Bloom (selective) → Neon Surge → Grade (aberration, vignette, grain) → Output
 *
 * Selective bloom: the scene renders into a half-float target, so colours above 1.0
 * survive. The bloom threshold is 1.0 and every neon material outputs HDR colour
 * (> 1, toneMapped=false), so only the neon glows. OutputPass then applies the
 * renderer's tone mapping (ACES, R3F's default) and converts to sRGB.
 *
 * Every parameter is driven each frame from the vfx state:
 *   bloom strength ← speed, surge, pickup pulse
 *   surge blur / edge energy / ring ← surge (+ a little at top speed)
 *   chromatic aberration ← speed, surge, damage
 *   vignette darkness ← surge, damage
 * Quality "low": no MSAA, half the blur samples, lighter grain.
 * Reduced motion: no aberration spikes, zoom blur or shock ring.
 *
 * Rendering happens here (useFrame priority 1), which turns off R3F's own render;
 * CaptureBridge runs at priority 2, right after the final image is drawn.
 */
export function PostFX() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const dpr = useThree((s) => s.viewport.dpr)
  const quality = useVfxQuality()
  const reduced = useReducedMotion()
  const high = quality === 'high'
  const warp = useRef(0)

  // The composer chain is built (and disposed) by a layout effect and kept in a ref: it is mutated
  // every frame, so it must not be a render-time value. Layout effects run before the next frame.
  const chainRef = useRef(null)
  const sizeRef = useLatest({ width: size.width, height: size.height, dpr })
  useLayoutEffect(() => {
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: high ? 4 : 0 })
    const composer = new EffectComposer(gl, target)
    const bloom = new UnrealBloomPass(new Vector2(256, 256), 0.6, 0.6, 1.0)
    const surge = new ShaderPass(createSurgeShader(high ? 10 : 5))
    const grade = new ShaderPass(createGradeShader())
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(bloom)
    composer.addPass(surge)
    composer.addPass(grade)
    composer.addPass(new OutputPass())
    const { width, height, dpr: ratio } = sizeRef.current
    composer.setPixelRatio(ratio)
    composer.setSize(width, height)
    const chain = { composer, bloom, surge: surge.uniforms, grade: grade.uniforms }
    chainRef.current = chain
    return () => {
      if (chainRef.current === chain) chainRef.current = null
      composer.dispose()
    }
  }, [gl, scene, camera, high, sizeRef])

  useLayoutEffect(() => {
    const chain = chainRef.current
    if (!chain) return
    chain.composer.setPixelRatio(dpr)
    chain.composer.setSize(size.width, size.height)
  }, [size.width, size.height, dpr])

  useGameEvent(EV.SURGE_START, () => { warp.current = 1 })

  useFrame((state, delta) => {
    const chain = chainRef.current
    if (!chain) {
      state.gl.render(state.scene, state.camera) // never a blank frame
      return
    }
    const dt = Math.min(delta, 0.05)
    const time = state.clock.elapsedTime
    const { speedFactor: sp, surge: sg, hit, pickup } = vfx

    chain.bloom.strength = 0.42 + sp * 0.28 + sg * 0.75 + pickup * 0.22

    warp.current = Math.max(0, warp.current - dt * 1.8)
    chain.surge.uStrength.value = reduced ? sg * 0.25 : sg
    chain.surge.uSpeed.value = reduced ? 0 : sp
    chain.surge.uWarp.value = reduced ? 0 : warp.current
    chain.surge.uTime.value = time

    chain.grade.uAberration.value = reduced ? 0.0008 : 0.0008 + sp * 0.002 + sg * 0.006 + hit * 0.012
    chain.grade.uVignetteDarkness.value = Math.min(0.95, 0.62 + sg * 0.22 + hit * 0.25)
    chain.grade.uGrain.value = high ? 0.08 : 0.04
    chain.grade.uTime.value = time

    chain.composer.render(delta)
  }, 1)

  return null
}
