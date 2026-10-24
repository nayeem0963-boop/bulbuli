/**
 * BulbuliModel.jsx
 *
 * 📁 WHERE THE MODEL LIVES
 *    <project-root>/public/models/bulbuli.glb
 *
 *    Vite serves /public from the site root, so the URL in code is
 *    "/models/bulbuli.glb" — never "/public/models/bulbuli.glb".
 *
 *    The current file is a plain (uncompressed) Sketchfab export, so no Draco
 *    decoder is fetched. If you later compress it with Draco/meshopt, useGLTF
 *    loads the decoders automatically.
 *
 * Load errors are thrown to the nearest error boundary — GameCanvas wraps
 * this component in one, so a missing/broken file shows a friendly message
 * instead of crashing the app.
 */
import { useCallback, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Center, useCursor, useGLTF } from '@react-three/drei'
import { Box3, Vector3 } from 'three'

export const BULBULI_MODEL_URL = '/models/bulbuli.glb'

// Max pointer travel (px) between press and release that still counts as a
// tap. Anything larger is an OrbitControls drag, so spinning the bird around
// doesn't award points.
const TAP_SLOP_PX = 12

// Damped spring for the "punch" bounce.
// Higher STIFFNESS = snappier, higher DAMPING = less wobble.
const STIFFNESS = 220
const DAMPING = 14
const PUNCH_IMPULSE = 8

/**
 * @param {object}   props
 * @param {(points:number)=>void} props.onTap  Called once per valid tap.
 * @param {number}   [props.points=1]          Points awarded per tap.
 * @param {number}   [props.size=2]            Model is auto-scaled so its largest side equals this (world units).
 * @param {number}   [props.idleSpin=0.35]     Idle rotation speed (radians/sec).
 *  ...rest is forwarded to the outer <group> (position, rotation, etc).
 */
export default function BulbuliModel({ onTap, points = 1, size = 2, idleSpin = 0.35, ...props }) {
  const { scene } = useGLTF(BULBULI_MODEL_URL)
  const animated = useRef()

  // Normalise any model to a predictable size. This bird is exported in
  // centimetres (~290 units wide), so without this it would fill the screen.
  const { fitScale, hitRadius } = useMemo(() => {
    const dims = new Box3().setFromObject(scene).getSize(new Vector3())
    const largest = Math.max(dims.x, dims.y, dims.z) || 1
    const s = size / largest
    // Hit target: a sphere around the bird, a little larger than its body,
    // so small fingers don't miss between the wings.
    return { fitScale: s, hitRadius: (Math.max(dims.x, dims.y, dims.z) * s) / 2 * 0.85 }
  }, [scene, size])

  // All animation state lives in refs: per-frame updates never re-render React.
  const spring = useRef({ value: 0, velocity: 0 })
  const pointerStart = useRef(null)

  const [hovered, setHovered] = useState(false)
  useCursor(hovered) // pointer cursor on desktop hover

  useFrame((state, delta) => {
    const g = animated.current
    if (!g) return
    // Clamp dt so the spring stays stable after tab switches / frame drops.
    const dt = Math.min(delta, 1 / 30)
    const t = state.clock.elapsedTime

    // Idle: gentle bob, slow spin, slight sway.
    g.position.y = Math.sin(t * 2) * 0.08
    g.rotation.y += dt * idleSpin
    g.rotation.z = Math.sin(t * 1.3) * 0.04

    // Spring pulls `value` back to 0, overshooting a little → bouncy punch.
    const s = spring.current
    s.velocity += (-STIFFNESS * s.value - DAMPING * s.velocity) * dt
    s.value += s.velocity * dt

    // Squash & stretch: puffs out wider and a bit shorter, then settles.
    const p = s.value
    g.scale.set(1 + p * 0.25, 1 - p * 0.15, 1 + p * 0.25)
  })

  // Pointer events cover mouse, touch and pen — no separate onTouchStart.
  const handlePointerDown = useCallback((e) => {
    // Stops R3F bubbling only. The DOM event still reaches OrbitControls, so
    // a drag that starts on the bird still rotates the view.
    e.stopPropagation()
    pointerStart.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }, [])

  const handlePointerUp = useCallback(
    (e) => {
      e.stopPropagation()
      const start = pointerStart.current
      pointerStart.current = null
      if (!start || start.id !== e.pointerId) return
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_SLOP_PX) return // was a drag

      // Kick the spring. Capped so frantic tapping can't blow the scale up.
      const s = spring.current
      s.velocity = Math.min(s.velocity + PUNCH_IMPULSE, PUNCH_IMPULSE * 1.5)

      navigator.vibrate?.(12) // tiny haptic tick on Android; no-op on iOS/desktop
      onTap?.(points)
    },
    [onTap, points],
  )

  // Browser took over the gesture (scroll, system swipe): forget the press.
  const handlePointerCancel = useCallback(() => {
    pointerStart.current = null
  }, [])

  const handleOver = useCallback((e) => {
    e.stopPropagation()
    setHovered(true)
  }, [])
  const handleOut = useCallback(() => setHovered(false), [])

  return (
    // Outer group: placement from the parent. Inner group: animation only,
    // so useFrame never fights the `position` prop.
    <group {...props} dispose={null}>
      <group ref={animated}>
        {/* Invisible, cheap hit target. R3F only raycasts objects that have
            handlers, so the ~22k-triangle bird itself is never raycast on
            every pointer move — smoother on low-end tablets. */}
        <mesh
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
        >
          <sphereGeometry args={[hitRadius, 16, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        <group scale={fitScale}>
          <Center>
            {/* A loaded scene can only be mounted once. To render several
                birds, use scene.clone(). */}
            <primitive object={scene} />
          </Center>
        </group>
      </group>
    </group>
  )
}

// Start downloading as soon as this module is imported, before the canvas mounts.
useGLTF.preload(BULBULI_MODEL_URL)
