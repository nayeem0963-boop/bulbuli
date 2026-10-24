/**
 * The 3D factory floor for Shape Sorting Factory: a conveyor belt that rolls one
 * shape at a time out of a machine, and two or three bins in front of it.
 *
 * Play: drag the shape into a bin, or tap the shape (it lifts and waits) and then
 * tap a bin. Keyboard players use the bin buttons outside the canvas, which call
 * commandRef.current.dropInto(binId).
 *
 * Performance (8 GB RAM / integrated GPUs):
 *   • dpr capped at 1.5, one shadow-casting light with a 1024² map (PCF, not soft).
 *   • Everything that moves per frame lives in refs; React re-renders only when
 *     the item, the bins or the pause state change.
 *   • Belt slats and confetti are single instanced meshes. No textures, no models.
 */
import { Component, memo, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, useCursor } from '@react-three/drei'
import { Color, MathUtils, MeshStandardMaterial, Object3D, Plane, Raycaster, Vector2, Vector3 } from 'three'
import './SortingCanvas.css'

const ITEM_SCALE = 0.62
const DRAG_Y = 1.45 // height of the invisible plane the dragged shape slides on
const TAP_SLOP_PX = 10
const SHADOW_MAP_SIZE = 1024
const SLAT_GAP = 0.42
// Longest step per frame: a slow frame (≥20 fps) still moves at full speed; slower ones slow the game down instead of jumping.
const MAX_DT = 0.05
const CONFETTI_COUNT = 28
const CONFETTI = ['#ffd23f', '#ff5a5f', '#4d96ff', '#3fbf6f', '#a77bff', '#ffffff']

// Half the height of each shape at scale 1, so it sits on the belt instead of in it.
const HALF = { cube: 0.5, sphere: 0.62, cone: 0.6, cylinder: 0.55, pyramid: 0.55 }

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const easeOut = (k) => 1 - (1 - k) ** 3

/* ------------------------------------------------------------------ layout */

/**
 * World layout in units. The belt runs left → right along x; the bins sit in
 * front of it (towards the camera). Portrait screens get a shorter belt and a
 * steeper camera so everything stays big enough for small fingers.
 */
function makeLayout(portrait, binIds) {
  const belt = portrait
    ? { start: -2.9, end: 2.6, z: -1.75, top: 0.85, width: 1.4 }
    : { start: -3.7, end: 3.3, z: -1.45, top: 0.85, width: 1.5 }
  const binW = portrait ? 1.5 : 1.7
  const spacing = binIds.length <= 2 ? (portrait ? 2.5 : 2.9) : portrait ? 1.95 : 2.35
  const binZ = portrait ? 1.55 : 1.4
  const bins = binIds.map((id, i) => ({
    id,
    x: (i - (binIds.length - 1) / 2) * spacing,
    z: binZ,
    w: binW,
    d: 1.2,
    h: 0.8,
  }))
  return {
    portrait,
    belt,
    bins,
    machineX: belt.start + 0.25,
    spawnX: belt.start + 0.5,
    binZoneZ: (belt.z + binZ) / 2, // a drop in front of this line goes to the nearest bin
    halfWidth: portrait ? 3.6 : 4.8, // world half-width the camera must keep in view
    dir: portrait ? new Vector3(0, 0.8, 0.6).normalize() : new Vector3(0, 0.58, 0.81).normalize(),
    target: new Vector3(0, 0.35, (belt.z + binZ) / 2 + 0.3),
  }
}

/** Which bin is under a point on the drag plane (generous, for small hands). */
function binAt(layout, point) {
  for (const bin of layout.bins) {
    if (Math.abs(point.x - bin.x) < bin.w / 2 + 0.35 && Math.abs(point.z - bin.z) < bin.d / 2 + 0.5) return bin.id
  }
  if (point.z > layout.binZoneZ) {
    let best = null
    for (const bin of layout.bins) {
      if (!best || Math.abs(point.x - bin.x) < Math.abs(point.x - best.x)) best = bin
    }
    return best?.id ?? null
  }
  return null
}

/** Keeps the whole factory in view at any canvas size. */
function CameraRig({ layout }) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  useLayoutEffect(() => {
    const aspect = size.width / Math.max(1, size.height)
    const halfFov = MathUtils.degToRad(camera.fov / 2)
    const distance = MathUtils.clamp(layout.halfWidth / (Math.tan(halfFov) * aspect), 8, 20)
    camera.position.copy(layout.target).addScaledVector(layout.dir, distance)
    camera.lookAt(layout.target)
    camera.updateProjectionMatrix()
  }, [camera, size, layout])
  return null
}

/* ------------------------------------------------------------------ effects */

/** Shared, non-React store for bin bounces / wobbles and the confetti trigger. */
function createFx() {
  const bins = {}
  const get = (id) => (bins[id] ??= { bounce: 0, bounceVel: 0, wobble: 0 })
  return {
    get,
    bounce: (id) => { get(id).bounceVel = 9 },
    wobble: (id) => { get(id).wobble = 1 },
    burst: () => {},
  }
}

function Confetti({ fx, reducedMotion }) {
  const mesh = useRef()
  const parts = useMemo(
    () => Array.from({ length: CONFETTI_COUNT }, () => ({ p: new Vector3(), v: new Vector3(), life: 0, spin: 0 })),
    [],
  )
  const dummy = useMemo(() => new Object3D(), [])
  const color = useMemo(() => new Color(), [])
  const active = useRef(false)

  useLayoutEffect(() => {
    const m = mesh.current
    dummy.scale.setScalar(0)
    dummy.updateMatrix()
    for (let i = 0; i < CONFETTI_COUNT; i += 1) {
      m.setMatrixAt(i, dummy.matrix)
      m.setColorAt(i, color.set(CONFETTI[i % CONFETTI.length]))
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true

    fx.burst = (position, itemColor) => {
      parts.forEach((part, i) => {
        const angle = Math.random() * Math.PI * 2
        const speed = (reducedMotion ? 0.6 : 1.2) + Math.random() * 1.6
        part.p.set(position.x, position.y + 0.3, position.z)
        part.v.set(Math.cos(angle) * speed, (reducedMotion ? 2 : 3.2) + Math.random() * 2.4, Math.sin(angle) * speed)
        part.life = 0.8 + Math.random() * 0.45
        part.spin = Math.random() * 10
        m.setColorAt(i, color.set(i % 4 === 0 ? itemColor : CONFETTI[i % CONFETTI.length]))
      })
      if (m.instanceColor) m.instanceColor.needsUpdate = true
      active.current = true
    }
    return () => { fx.burst = () => {} }
  }, [fx, parts, dummy, color, reducedMotion])

  useFrame((_, delta) => {
    if (!active.current) return
    const m = mesh.current
    const dt = Math.min(delta, MAX_DT)
    let alive = false
    parts.forEach((part, i) => {
      if (part.life > 0) {
        part.life -= dt
        part.v.y -= 9 * dt
        part.p.addScaledVector(part.v, dt)
        dummy.position.copy(part.p)
        dummy.rotation.set(part.life * part.spin, part.life * 6, 0)
        dummy.scale.setScalar(MathUtils.clamp(part.life * 2.5, 0, 1))
        alive = true
      } else {
        dummy.scale.setScalar(0)
      }
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
    active.current = alive
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, CONFETTI_COUNT]} frustumCulled={false}>
      <boxGeometry args={[0.11, 0.11, 0.035]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}

/* ------------------------------------------------------------------ shapes */

/** Each shape is built to be roughly 1.2 units tall/wide before ITEM_SCALE. */
function ShapeGeometry({ shape }) {
  switch (shape) {
    case 'sphere':
      return <sphereGeometry args={[0.62, 32, 22]} />
    case 'cone':
      return <coneGeometry args={[0.6, 1.2, 32]} />
    case 'cylinder':
      return <cylinderGeometry args={[0.5, 0.5, 1.1, 32]} />
    case 'pyramid':
      return <coneGeometry args={[0.75, 1.1, 4]} />
    case 'cube':
    default:
      return <boxGeometry args={[1, 1, 1]} />
  }
}

/** Press + release within a few pixels = a tap. */
function useTap(onTap) {
  const start = useRef(null)
  return useMemo(() => ({
    onPointerDown: (e) => {
      e.stopPropagation()
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    },
    onPointerUp: (e) => {
      e.stopPropagation()
      const s = start.current
      start.current = null
      if (!s || s.id !== e.pointerId) return
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > TAP_SLOP_PX * 1.5) return
      onTap()
    },
    onPointerCancel: () => { start.current = null },
  }), [onTap])
}

/**
 * The shape on the belt. Its whole life is a small state machine in a ref:
 *   spawn → belt ⇄ (held | drag) → toBin (correct)
 *                               → reject → spawn (wrong bin: wobble, then back to the start)
 *                               → back → belt (dropped on the belt again)
 *        belt → fall → spawn (rolled off the end)
 */
const Item = memo(function Item({
  item, layout, speed, paused, selected, label, reducedMotion, fx, hoverBin, apiRef, overlay,
  onSelectChange, onDrop, onMiss,
}) {
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const group = useRef()
  const spinner = useRef()
  const material = useRef()
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  const half = HALF[item.shape] * ITEM_SCALE
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const props = useRef(null)
  props.current = { speed, paused, selected, onSelectChange, onDrop, onMiss }

  const st = useRef(null)
  if (!st.current) {
    st.current = {
      mode: 'spawn',
      t: 0,
      scale: 0,
      vy: 0,
      pos: new Vector3(layout.spawnX, layout.belt.top + half, layout.belt.z),
      from: new Vector3(),
      to: new Vector3(),
      drag: new Vector3(),
      binId: null,
      fired: false,
    }
  }

  const raycaster = useMemo(() => new Raycaster(), [])
  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), -DRAG_Y), [])
  const ndc = useMemo(() => new Vector2(), [])
  const hit = useMemo(() => new Vector3(), [])
  const cleanupRef = useRef(null)
  useEffect(() => () => cleanupRef.current?.(), [])

  const respawn = useCallback(() => {
    const s = st.current
    const L = layoutRef.current
    s.mode = 'spawn'
    s.t = 0
    s.scale = 0
    s.fired = false
    s.pos.set(L.spawnX, L.belt.top + half, L.belt.z)
    if (spinner.current) spinner.current.rotation.z = 0
  }, [half])

  const goBack = useCallback(() => {
    const s = st.current
    const L = layoutRef.current
    s.mode = 'back'
    s.t = 0
    s.from.copy(s.pos)
    s.to.set(MathUtils.clamp(s.pos.x, L.spawnX + 0.4, L.belt.end - 0.5), L.belt.top + half, L.belt.z)
  }, [half])

  const dropInto = useCallback((binId) => {
    const s = st.current
    const L = layoutRef.current
    if (!['spawn', 'belt', 'drag'].includes(s.mode)) return
    const bin = L.bins.find((candidate) => candidate.id === binId)
    if (!bin) return
    props.current.onSelectChange(false)
    const outcome = props.current.onDrop(binId)
    s.t = 0
    s.fired = false
    s.binId = binId
    s.from.copy(s.pos)
    if (outcome === 'correct') {
      s.mode = 'toBin'
      s.to.set(bin.x, bin.h * 0.75, bin.z)
    } else if (outcome === 'wrong') {
      s.mode = 'reject'
      s.to.set(bin.x, bin.h + 0.75, bin.z)
    } else {
      goBack()
    }
  }, [goBack])

  useEffect(() => {
    const api = { dropInto }
    apiRef.current = api
    return () => { if (apiRef.current === api) apiRef.current = null }
  }, [apiRef, dropInto])

  const pointToPlane = useCallback((clientX, clientY) => {
    const rect = gl.domElement.getBoundingClientRect()
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    return raycaster.ray.intersectPlane(plane, hit)
  }, [gl, camera, raycaster, plane, ndc, hit])

  const onPointerDown = useCallback((e) => {
    e.stopPropagation()
    const s = st.current
    if (props.current.paused || !['spawn', 'belt'].includes(s.mode) || cleanupRef.current) return
    const start = { x: e.clientX, y: e.clientY, id: e.pointerId, dragging: false }

    const move = (ev) => {
      if (ev.pointerId !== start.id) return
      if (!start.dragging) {
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < TAP_SLOP_PX) return
        if (!['spawn', 'belt'].includes(s.mode)) return
        start.dragging = true
        s.mode = 'drag'
        s.drag.copy(s.pos)
        props.current.onSelectChange(false)
      }
      if (s.mode !== 'drag') return
      const point = pointToPlane(ev.clientX, ev.clientY)
      if (!point) return
      const L = layoutRef.current
      s.drag.set(
        MathUtils.clamp(point.x, -L.halfWidth, L.halfWidth),
        DRAG_Y,
        MathUtils.clamp(point.z, L.belt.z - 0.8, L.bins[0].z + 1.1),
      )
      hoverBin.current = binAt(L, s.drag)
    }
    const finish = (ev, cancelled) => {
      if (ev.pointerId !== start.id) return
      cleanupRef.current?.()
      hoverBin.current = null
      if (start.dragging) {
        if (s.mode !== 'drag') return
        const binId = cancelled ? null : binAt(layoutRef.current, s.drag)
        if (binId) dropInto(binId)
        else goBack()
      } else if (!cancelled && ['spawn', 'belt'].includes(s.mode)) {
        props.current.onSelectChange(!props.current.selected)
      }
    }
    const up = (ev) => finish(ev, false)
    const cancel = (ev) => finish(ev, true)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    cleanupRef.current = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      cleanupRef.current = null
    }
  }, [dropInto, goBack, hoverBin, pointToPlane])

  useFrame((state, delta) => {
    const g = group.current
    const sp = spinner.current
    const m = material.current
    if (!g || !sp || !m) return
    const dt = Math.min(delta, MAX_DT)
    const s = st.current
    const p = props.current
    const L = layoutRef.current
    const restY = L.belt.top + half
    const time = state.clock.elapsedTime
    s.t += dt

    let targetScale = 1
    let shakeX = 0
    let spin = reducedMotion ? 0.15 : 0.45
    let glow = 0

    switch (s.mode) {
      case 'spawn':
      case 'belt': {
        if (s.mode === 'spawn' && s.scale > 0.97) s.mode = 'belt'
        const held = p.selected
        if (!p.paused && !held) s.pos.x += p.speed * dt
        s.pos.z = L.belt.z
        const lift = held ? 0.4 + (reducedMotion ? 0 : Math.sin(time * 5) * 0.06) : 0
        s.pos.y = MathUtils.damp(s.pos.y, restY + lift, 12, dt)
        if (held) {
          spin = reducedMotion ? 0.6 : 2.2
          glow = 0.35
        }
        if (!held && s.pos.x > L.belt.end + 0.15) {
          s.mode = 'fall'
          s.t = 0
          s.vy = 0.8
        }
        break
      }
      case 'drag': {
        s.pos.x = MathUtils.damp(s.pos.x, s.drag.x, 22, dt)
        s.pos.y = MathUtils.damp(s.pos.y, s.drag.y, 22, dt)
        s.pos.z = MathUtils.damp(s.pos.z, s.drag.z, 22, dt)
        spin = reducedMotion ? 0.6 : 2.5
        targetScale = 1.15
        glow = 0.25
        break
      }
      case 'back': {
        const k = Math.min(1, s.t / 0.28)
        s.pos.lerpVectors(s.from, s.to, easeOut(k))
        if (k >= 1) s.mode = 'belt'
        break
      }
      case 'toBin': {
        // Arc over the bin, then drop in, shrink and burst into confetti.
        spin = 6
        if (s.t < 0.32) {
          const k = s.t / 0.32
          s.pos.lerpVectors(s.from, s.to, easeOut(k))
          s.pos.y += Math.sin(k * Math.PI) * 0.7
        } else {
          if (!s.fired) {
            s.fired = true
            fx.bounce(s.binId)
            fx.burst(s.to, item.color)
          }
          s.pos.y = MathUtils.damp(s.pos.y, s.to.y - 0.6, 10, dt)
          targetScale = 0
        }
        break
      }
      case 'reject': {
        // Hop over the wrong bin, shake "no", then pop and come back at the start of the belt.
        if (s.t < 0.3) {
          const k = s.t / 0.3
          s.pos.lerpVectors(s.from, s.to, easeOut(k))
          s.pos.y += Math.sin(k * Math.PI) * 0.5
        } else if (s.t < 0.95) {
          if (!s.fired) {
            s.fired = true
            fx.wobble(s.binId)
          }
          const fade = 1 - (s.t - 0.3) / 0.65
          shakeX = Math.sin(s.t * (reducedMotion ? 18 : 38)) * 0.14 * fade
        } else {
          targetScale = 0
          if (s.scale < 0.04) respawn()
        }
        break
      }
      case 'fall': {
        // Tip off the end of the belt into the chute.
        if (!p.paused) {
          s.pos.x += p.speed * dt * 0.8
          s.vy -= 14 * dt
          s.pos.y = Math.max(0.15, s.pos.y + s.vy * dt)
          sp.rotation.z -= dt * 5
        }
        if (s.pos.y <= 0.4) targetScale = 0
        if (s.pos.y <= 0.4 && s.scale < 0.04) {
          p.onMiss()
          respawn()
        }
        break
      }
      default:
        break
    }

    s.scale = MathUtils.damp(s.scale, targetScale, s.mode === 'spawn' ? 7 : 12, dt)
    g.position.set(s.pos.x + shakeX, s.pos.y, s.pos.z)
    g.scale.setScalar(Math.max(0.0001, s.scale))
    sp.rotation.y += dt * spin
    m.emissiveIntensity = MathUtils.damp(m.emissiveIntensity, glow, 10, dt)
  })

  return (
    <group ref={group} position={st.current.pos.toArray()}>
      <group ref={spinner} rotation={[0, 0.6, 0]} scale={ITEM_SCALE}>
        <mesh castShadow>
          <ShapeGeometry shape={item.shape} />
          <meshStandardMaterial
            ref={material}
            color={item.color}
            emissive={item.color}
            emissiveIntensity={0}
            roughness={0.4}
            metalness={0.05}
          />
        </mesh>
      </group>

      {/* Big invisible touch target: much larger than the shape, for small fingers. */}
      <mesh
        onPointerDown={onPointerDown}
        onPointerUp={(e) => e.stopPropagation()}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[layout.portrait ? 1.05 : 0.95, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {label && (
        <Html position={[0, half + 0.45, 0]} center zIndexRange={[20, 0]} portal={overlay}>
          <span className="ssf-item-label">{label}</span>
        </Html>
      )}
    </group>
  )
})

/* ------------------------------------------------------------------ bins */

const Bin = memo(function Bin({ bin, spec, fx, hoverBin, armed, reducedMotion, overlay, onTap }) {
  const group = useRef()
  const icon = useRef()
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const armedRef = useRef(armed)
  armedRef.current = armed

  const wallMaterial = useMemo(
    () => new MeshStandardMaterial({ color: spec.color, emissive: spec.color, emissiveIntensity: 0, roughness: 0.55 }),
    [spec.color],
  )
  const floorColor = useMemo(() => new Color(spec.color).multiplyScalar(0.55), [spec.color])
  useEffect(() => () => wallMaterial.dispose(), [wallMaterial])

  useFrame((state, delta) => {
    const g = group.current
    if (!g) return
    const dt = Math.min(delta, MAX_DT)
    const time = state.clock.elapsedTime
    const f = fx.get(bin.id)

    // Correct: squash-and-stretch bounce (damped spring). Wrong: a short rocking wobble.
    f.bounceVel += (-140 * f.bounce - 9 * f.bounceVel) * dt
    f.bounce += f.bounceVel * dt
    f.wobble = Math.max(0, f.wobble - dt * 1.7)
    const squash = f.bounce * (reducedMotion ? 0.05 : 0.14)
    g.scale.set(1 - squash * 0.5, 1 + squash, 1 - squash * 0.5)
    g.rotation.z = Math.sin(time * (reducedMotion ? 10 : 24)) * f.wobble * (reducedMotion ? 0.04 : 0.11)

    const over = hoverBin.current === bin.id
    const pulse = armedRef.current ? 0.18 + Math.sin(time * 4.5) * 0.12 : 0
    const target = over ? 0.6 : Math.max(pulse, hovered ? 0.15 : 0)
    wallMaterial.emissiveIntensity = MathUtils.damp(wallMaterial.emissiveIntensity, target, 12, dt)

    if (icon.current) icon.current.rotation.y += dt * (reducedMotion ? 0.2 : 0.8)
  })

  const tap = useTap(useCallback(() => onTap(bin.id), [onTap, bin.id]))
  const { w, d, h } = bin
  const t = 0.08
  const walls = [
    [0, h / 2, d / 2 - t / 2, w, h, t],
    [0, h / 2, -d / 2 + t / 2, w, h, t],
    [w / 2 - t / 2, h / 2, 0, t, h, d],
    [-w / 2 + t / 2, h / 2, 0, t, h, d],
  ]

  return (
    <group position={[bin.x, 0, bin.z]}>
      <group ref={group}>
        <mesh position={[0, 0.04, 0]} receiveShadow>
          <boxGeometry args={[w, 0.08, d]} />
          <meshStandardMaterial color={floorColor} roughness={0.8} />
        </mesh>
        {walls.map(([x, y, z, sx, sy, sz], i) => (
          <mesh key={i} position={[x, y, z]} material={wallMaterial} castShadow receiveShadow>
            <boxGeometry args={[sx, sy, sz]} />
          </mesh>
        ))}
        {spec.shape && (
          <group ref={icon} position={[0, h + 0.55, -d * 0.15]} scale={0.34}>
            <mesh castShadow>
              <ShapeGeometry shape={spec.shape} />
              <meshStandardMaterial color="#ffffff" roughness={0.35} />
            </mesh>
          </group>
        )}
      </group>

      {/* Large invisible tap target covering the bin and the space above it. */}
      <mesh
        position={[0, h / 2 + 0.45, 0]}
        {...tap}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[w + 0.45, h + 1.5, d + 0.7]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <Html position={[0, h * 0.45, d / 2 + 0.05]} center zIndexRange={[10, 0]} portal={overlay}>
        <span className="ssf-bin-label">
          {spec.kind === 'color' && <span className="ssf-swatch" style={{ background: spec.color }} aria-hidden="true" />}
          {spec.label}
        </span>
      </Html>
    </group>
  )
})

/* ------------------------------------------------------------------ belt + machine */

function Belt({ layout, speed, paused }) {
  const { belt, machineX } = layout
  const length = belt.end - belt.start + 0.5
  const cx = (belt.start + belt.end) / 2
  const slats = useRef()
  const count = Math.ceil(length / SLAT_GAP) + 1
  const offset = useRef(0)
  const dummy = useMemo(() => new Object3D(), [])
  const lamp = useRef()
  const legH = belt.top - 0.32

  useFrame((state, delta) => {
    const dt = Math.min(delta, MAX_DT)
    if (!paused) offset.current = (offset.current + speed * dt) % SLAT_GAP
    const m = slats.current
    if (m) {
      const startX = belt.start - 0.25
      for (let i = 0; i < count; i += 1) {
        const x = startX + ((i * SLAT_GAP + offset.current) % (count * SLAT_GAP))
        dummy.position.set(x, belt.top + 0.005, belt.z)
        dummy.scale.setScalar(x > belt.end + 0.25 ? 0 : 1)
        dummy.updateMatrix()
        m.setMatrixAt(i, dummy.matrix)
      }
      m.instanceMatrix.needsUpdate = true
    }
    if (lamp.current) lamp.current.emissiveIntensity = paused ? 0.2 : 0.6 + Math.sin(state.clock.elapsedTime * 4) * 0.4
  })

  return (
    <group>
      {/* belt body and running surface */}
      <mesh position={[cx, belt.top - 0.17, belt.z]} castShadow receiveShadow>
        <boxGeometry args={[length, 0.3, belt.width]} />
        <meshStandardMaterial color="#3d4a63" roughness={0.7} />
      </mesh>
      <mesh position={[cx, belt.top - 0.015, belt.z]} receiveShadow>
        <boxGeometry args={[length, 0.03, belt.width * 0.9]} />
        <meshStandardMaterial color="#262f42" roughness={0.9} />
      </mesh>
      <instancedMesh ref={slats} args={[undefined, undefined, count]} frustumCulled={false} receiveShadow>
        <boxGeometry args={[0.07, 0.02, belt.width * 0.88]} />
        <meshStandardMaterial color="#5b6886" roughness={0.6} />
      </instancedMesh>

      {/* yellow safety rails */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[cx, belt.top + 0.05, belt.z + side * (belt.width / 2 + 0.03)]} castShadow>
          <boxGeometry args={[length, 0.12, 0.08]} />
          <meshStandardMaterial color="#ffc93c" roughness={0.5} />
        </mesh>
      ))}

      {/* end rollers */}
      {[belt.start - 0.25, belt.end + 0.25].map((x) => (
        <mesh key={x} position={[x, belt.top - 0.17, belt.z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.17, 0.17, belt.width + 0.05, 18]} />
          <meshStandardMaterial color="#8a97b1" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}

      {/* legs */}
      {[belt.start + 0.6, belt.end - 0.3].flatMap((x) => [-1, 1].map((side) => (
        <mesh key={`${x}${side}`} position={[x, legH / 2, belt.z + side * (belt.width / 2 - 0.15)]} castShadow>
          <boxGeometry args={[0.14, legH, 0.14]} />
          <meshStandardMaterial color="#56637d" />
        </mesh>
      )))}

      {/* drop chute after the end of the belt */}
      <mesh position={[belt.end + 0.75, 0.02, belt.z]} receiveShadow>
        <boxGeometry args={[0.9, 0.04, belt.width + 0.2]} />
        <meshStandardMaterial color="#1d2433" />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[belt.end + 0.75, 0.08, belt.z + side * (belt.width / 2 + 0.1)]}>
          <boxGeometry args={[0.9, 0.12, 0.06]} />
          <meshStandardMaterial color="#ffc93c" />
        </mesh>
      ))}

      {/* the shape machine the items roll out of */}
      <group position={[machineX, 0, belt.z]}>
        <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 2.0, belt.width + 0.5]} />
          <meshStandardMaterial color="#ff6b6b" roughness={0.5} />
        </mesh>
        <mesh position={[0.505, belt.top + 0.42, 0]}>
          <boxGeometry args={[0.02, 0.85, belt.width - 0.1]} />
          <meshStandardMaterial color="#1d2433" />
        </mesh>
        <mesh position={[0, 2.35, 0]} rotation={[Math.PI, 0, 0]} castShadow>
          <coneGeometry args={[0.55, 0.7, 24]} />
          <meshStandardMaterial color="#ffd23f" roughness={0.45} />
        </mesh>
        <mesh position={[0.3, 2.08, belt.width / 2]}>
          <sphereGeometry args={[0.13, 16, 12]} />
          <meshStandardMaterial ref={lamp} color="#3fbf6f" emissive="#3fbf6f" emissiveIntensity={0.6} />
        </mesh>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ scene */

const Scene = memo(function Scene({
  bins, item, itemLabel, speed, paused, reducedMotion, overlay, onDrop, onMiss, onBinInfo, commandRef,
}) {
  const size = useThree((state) => state.size)
  const portrait = size.width < size.height
  const binKey = bins.map((bin) => bin.id).join('|')
  const binIds = useMemo(() => binKey.split('|'), [binKey])
  const layout = useMemo(() => makeLayout(portrait, binIds), [portrait, binIds])
  const fx = useMemo(createFx, [])
  const hoverBin = useRef(null)
  const itemApi = useRef(null)

  const [selected, setSelected] = useState(false)
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const [prevItemId, setPrevItemId] = useState(item.id)
  if (prevItemId !== item.id) {
    setPrevItemId(item.id)
    setSelected(false)
  }

  useEffect(() => {
    if (!commandRef) return undefined
    commandRef.current = { dropInto: (binId) => itemApi.current?.dropInto(binId) }
    return () => { commandRef.current = null }
  }, [commandRef])

  const handleBinTap = useCallback((binId) => {
    if (selectedRef.current && itemApi.current) itemApi.current.dropInto(binId)
    else onBinInfo(binId)
  }, [onBinInfo])

  const effectiveSpeed = speed * (reducedMotion ? 0.85 : 1)
  const shadowExtent = 7

  return (
    <>
      <CameraRig layout={layout} />
      <hemisphereLight args={['#fff6e5', '#9ad0ff', 0.8]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[4, 9, 6]}
        intensity={1.8}
        color="#fff2d9"
        castShadow
        shadow-mapSize={[SHADOW_MAP_SIZE, SHADOW_MAP_SIZE]}
        shadow-bias={-0.0006}
        shadow-camera-near={1}
        shadow-camera-far={25}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
      />
      <directionalLight position={[-5, 3, -4]} intensity={0.5} color="#bfe3ff" />

      {/* floor: tapping empty floor puts a lifted shape back down */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onPointerUp={() => setSelected(false)}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#f6f9ff" roughness={1} />
      </mesh>

      <Belt layout={layout} speed={effectiveSpeed} paused={paused} />

      {layout.bins.map((bin, i) => (
        <Bin
          key={bin.id}
          bin={bin}
          spec={bins[i]}
          fx={fx}
          hoverBin={hoverBin}
          armed={selected}
          reducedMotion={reducedMotion}
          overlay={overlay}
          onTap={handleBinTap}
        />
      ))}

      <Item
        key={item.id}
        item={item}
        layout={layout}
        speed={effectiveSpeed}
        paused={paused}
        selected={selected}
        label={itemLabel}
        reducedMotion={reducedMotion}
        fx={fx}
        hoverBin={hoverBin}
        apiRef={itemApi}
        overlay={overlay}
        onSelectChange={setSelected}
        onDrop={onDrop}
        onMiss={onMiss}
      />

      <Confetti fx={fx} reducedMotion={reducedMotion} />
    </>
  )
})

/* ------------------------------------------------------------------ canvas */

class ViewportBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    console.error('[Shape Sorting] 3D view could not start (WebGL unavailable?)', error)
  }
  render() {
    return this.state.failed ? <p className="ssf-fallback" role="alert">{this.props.message}</p> : this.props.children
  }
}

/**
 * @param {object} props
 * @param {Array<{id, label, kind: 'shape'|'color', color: string, shape?: string}>} props.bins
 * @param {{id, shape, color}} props.item         the shape on the belt (color is a hex string)
 * @param {string|null} props.itemLabel           name shown above the shape (after a mistake)
 * @param {number} props.speed                    belt speed, world units per second
 * @param {boolean} props.paused
 * @param {(binId) => 'correct'|'wrong'|'ignored'} props.onDrop   must answer synchronously
 * @param {() => void} props.onMiss               the shape rolled off the end
 * @param {(binId) => void} props.onBinInfo       a bin was tapped with nothing lifted
 * @param {{current: {dropInto(binId)}|null}} props.commandRef   for keyboard / switch access
 */
function SortingCanvas({ noWebglMessage, loadingLabel, ...sceneProps }) {
  const [reducedMotion] = useState(prefersReducedMotion)
  // Labels (drei <Html>) render into this div. A fixed container stops drei from tearing
  // down and rebuilding every label root when R3F attaches its event target on the first frame.
  const overlay = useRef(null)
  return (
    <div className="ssf-canvas" ref={overlay}>
      <ViewportBoundary message={noWebglMessage}>
        <Canvas
          shadows="percentage"
          dpr={[1, 1.5]}
          camera={{ fov: 38, near: 0.1, far: 60, position: [0, 8, 10] }}
          gl={{ antialias: true, powerPreference: 'default' }}
        >
          <Suspense
            fallback={(
              <Html center portal={overlay}>
                <span className="ssf-3d-loading" role="status">{loadingLabel}</span>
              </Html>
            )}
          >
            <Scene {...sceneProps} reducedMotion={reducedMotion} overlay={overlay} />
          </Suspense>
        </Canvas>
      </ViewportBoundary>
    </div>
  )
}

export default memo(SortingCanvas)
