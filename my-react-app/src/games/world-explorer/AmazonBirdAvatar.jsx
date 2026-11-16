/**
 * The Amazon Rainforest player bird: a small tanager built in code (rendering/rainforestBird.js).
 * No model or texture file is downloaded and there is no third-party licence to carry; the
 * previous "Bird Orange" model (CC BY-NC-SA 4.0, non-commercial) is gone.
 *
 * Drop-in for skyward-explorer/BulbuliAvatar inside ExplorerController: it takes the same
 * `motion` ref (the controller's player object, read every frame), sits with its feet at the
 * origin facing +z, and changes nothing about movement, collisions or the camera.
 *
 * Everything is animated in code from `motion`:
 *   standing  small head turns and glances, a flick of the tail, a slow breath
 *   moving    a two-footed hop: the body rises and falls with each hop, the head bobs, the tail
 *             counterbalances; faster along the ground means quicker hops
 *   in air    wings open from the back and beat (fast while climbing, slower while falling,
 *             spread and still while gliding), legs tucked, tail fanned down; they fold on landing
 * The visual turn is smoothed and the body banks and pitches in flight; the controller's own
 * facing (and so all gameplay) is unchanged.
 */
import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, DoubleSide, Float32BufferAttribute, MathUtils, MeshStandardMaterial, Shape, ShapeGeometry } from 'three'
import { RAINFOREST_BIRD, createRainforestBirdParts } from './rendering/rainforestBird.js'

/** Beak-to-tail length in metres: Bulbuli's size, so the camera framing and the map's scale fit. */
export const AMAZON_BIRD_LENGTH = RAINFOREST_BIRD.length
const TAU = Math.PI * 2

// wing tones: dark blue-green flight feathers over orange coverts at the shoulder
const WING_ROOT = new Color('#d9692a')
const WING_TIP = new Color('#1f4a5c')
const WING_EDGE = new Color('#10262f')

/** One feathered wing segment in the XZ plane: span along +x, trailing edge towards -z. */
function wingSegment(span, rootChord, tipChord, feathers) {
  const shape = new Shape()
  shape.moveTo(0, 0.02)
  shape.bezierCurveTo(span * 0.35, 0.035, span * 0.75, 0.03, span, 0.005)
  // feathered trailing edge, from the tip back to the root
  for (let i = feathers; i >= 0; i -= 1) {
    const u = i / feathers
    const chord = rootChord + (tipChord - rootChord) * u
    shape.lineTo(span * u, -chord)
    if (i > 0) shape.lineTo(span * (u - 0.5 / feathers), -chord * 0.86)
  }
  shape.lineTo(0, 0.02)
  const geometry = new ShapeGeometry(shape, 6)
  geometry.rotateX(Math.PI / 2) // shape y → world z (chord points forward/back)
  const pos = geometry.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const c = new Color()
  for (let i = 0; i < pos.count; i += 1) {
    const u = MathUtils.clamp(pos.getX(i) / span, 0, 1)
    const back = MathUtils.clamp(-pos.getZ(i) / rootChord, 0, 1)
    c.copy(WING_ROOT).lerp(WING_TIP, u * 0.85).lerp(WING_EDGE, back * back * 0.55)
    colors.set([c.r, c.g, c.b], i * 3)
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

/** The bird's parts, built once per mount (rendering/rainforestBird.js), and the materials they share. */
function useBird() {
  return useMemo(() => {
    const parts = createRainforestBirdParts()
    const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, side: DoubleSide })
    return { parts, material, height: RAINFOREST_BIRD.height }
  }, [])
}

function Wing({ side, shoulderRef, elbowRef, geometries, material, at }) {
  return (
    <group ref={shoulderRef} position={[side * at.x, at.y, at.z]} scale={[side, 1, 1]}>
      <mesh geometry={geometries.inner} material={material} castShadow />
      <group ref={elbowRef} position={[at.innerSpan * 0.97, 0, 0]}>
        <mesh geometry={geometries.outer} material={material} castShadow />
      </group>
    </group>
  )
}

function AmazonBirdAvatar({ motion }) {
  const bird = useBird()
  const body = useRef()
  const head = useRef()
  const tail = useRef()
  const legs = useRef()
  const shoulderR = useRef()
  const shoulderL = useRef()
  const elbowR = useRef()
  const elbowL = useRef()
  const state = useRef({ yaw: null, turn: 0, open: 0, phase: 0, hop: 0, clock: 0, tuck: 0 })

  // wings sized from the bird: each about 0.7 body lengths, as for a small songbird
  const wing = useMemo(() => {
    const L = AMAZON_BIRD_LENGTH
    const [x, y, z] = RAINFOREST_BIRD.shoulder
    const at = { x, y, z, innerSpan: L * 0.32 }
    return {
      at,
      geometries: { inner: wingSegment(at.innerSpan, L * 0.3, L * 0.27, 3), outer: wingSegment(L * 0.4, L * 0.27, L * 0.1, 5) },
      material: new MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0, side: DoubleSide }),
    }
  }, [])

  useEffect(() => () => {
    Object.values(bird.parts).forEach((geometry) => geometry.dispose())
    bird.material.dispose()
  }, [bird])
  useEffect(() => () => {
    wing.geometries.inner.dispose()
    wing.geometries.outer.dispose()
    wing.material.dispose()
  }, [wing])

  useFrame((_, delta) => {
    const p = motion.current
    if (!p || !body.current) return
    const dt = Math.min(delta, 0.1)
    const s = state.current
    s.clock += dt
    const speed = Math.hypot(p.vel[0], p.vel[2])
    const air = !p.grounded
    const climbing = air && p.vel[1] > 0.4
    const running = !air && speed > 0.6

    // smooth the visual turn (the controller snaps facing to the velocity direction)
    if (s.yaw === null) s.yaw = p.facing
    const diff = Math.atan2(Math.sin(p.facing - s.yaw), Math.cos(p.facing - s.yaw))
    const step = diff * (1 - Math.exp(-dt * 11))
    s.yaw += step
    s.turn = MathUtils.damp(s.turn, step / Math.max(dt, 1e-3), 6, dt)
    const run = MathUtils.clamp(speed / 7, 0, 1)
    body.current.rotation.y = Math.atan2(Math.sin(s.yaw - p.facing), Math.cos(s.yaw - p.facing))
    // bank into turns and pitch with the climb in flight; a slight forward lean when hopping fast
    const bank = air ? MathUtils.clamp(-s.turn * 0.16, -0.55, 0.55) : 0
    const pitch = air ? MathUtils.clamp(-p.vel[1] * 0.045 + run * 0.18, -0.4, 0.35) : run * 0.1
    body.current.rotation.z = MathUtils.damp(body.current.rotation.z, bank, 8, dt)
    body.current.rotation.x = MathUtils.damp(body.current.rotation.x, pitch, 8, dt)

    // wings: open in the air, fold away on the ground
    s.open = MathUtils.damp(s.open, air ? 1 : 0, air ? 16 : 10, dt)
    const beatHz = p.gliding ? 0.6 : climbing ? 7.5 : 4.2
    s.phase = (s.phase + dt * beatHz * TAU) % TAU
    const amplitude = p.gliding ? 0.06 : climbing ? 0.95 : 0.55
    const flap = Math.sin(s.phase) * amplitude + (p.gliding ? 0.04 : 0.12)

    // hopping on the ground: both feet together, so the body rises and falls twice a second or so
    s.hop = running ? (s.hop + dt * MathUtils.clamp(speed * 1.5, 5, 11) * TAU * 0.5) % TAU : s.hop
    const hopLift = running ? Math.abs(Math.sin(s.hop)) * 0.028 : 0
    const breath = Math.sin(s.clock * 2.2) * 0.0025
    // the body rises a little on each downstroke in the air
    body.current.position.y = (air ? (p.gliding ? 0 : Math.cos(s.phase) * 0.012 * amplitude) : hopLift + breath)
    // legs tuck up in the air; the tail fans down and trails
    s.tuck = MathUtils.damp(s.tuck, air ? 1 : 0, 14, dt)
    if (legs.current) {
      legs.current.scale.y = 1 - 0.5 * s.tuck
      legs.current.rotation.x = 0.7 * s.tuck
    }
    if (tail.current) {
      const wag = running ? Math.sin(s.hop * 2) * 0.12 : Math.sin(s.clock * 0.9) * 0.03 + (Math.sin(s.clock * 0.37) > 0.96 ? 0.25 : 0)
      tail.current.rotation.x = MathUtils.damp(tail.current.rotation.x, (running ? -0.18 + Math.sin(s.hop) * 0.1 : 0.05) + (air ? 0.35 * (climbing ? 0.4 : 1) : 0), 9, dt)
      tail.current.rotation.y = MathUtils.damp(tail.current.rotation.y, wag, 9, dt)
    }
    if (head.current) {
      // standing: look about, a few seconds each way; hopping: the head bobs and stays level
      const glance = air ? 0 : running ? 0 : Math.sin(s.clock * 0.7) * 0.5 * Math.max(0, Math.sin(s.clock * 0.23 + 1))
      head.current.rotation.y = MathUtils.damp(head.current.rotation.y, glance, 8, dt)
      const nod = running ? Math.sin(s.hop * 2) * 0.12 : air ? -0.1 : Math.sin(s.clock * 1.3) * 0.04
      head.current.rotation.x = MathUtils.damp(head.current.rotation.x, nod, 12, dt)
    }

    const wings = [[shoulderR.current, elbowR.current], [shoulderL.current, elbowL.current]]
    for (let i = 0; i < 2; i += 1) {
      const [shoulder, elbow] = wings[i]
      if (!shoulder || !elbow) continue
      const visible = s.open > 0.02
      shoulder.visible = visible
      if (!visible) continue
      const side = i === 0 ? 1 : -1
      // folded: swept back along the body and tucked small; open: out to the side, beating
      shoulder.rotation.set(0, side * (1 - s.open) * 1.25, side * flap * s.open)
      shoulder.scale.set(side * (0.25 + 0.75 * s.open), 1, 0.25 + 0.75 * s.open)
      // the hand lags the arm, so each beat ripples out to the wingtip (mirrored by the scale)
      elbow.rotation.z = Math.sin(s.phase - 0.7) * amplitude * 0.55 * s.open
    }
  })

  const [hx, hy, hz] = RAINFOREST_BIRD.neck
  const [tx, ty, tz] = RAINFOREST_BIRD.tailRoot
  return (
    <group ref={body}>
      <mesh geometry={bird.parts.body} material={bird.material} castShadow />
      <group ref={legs} position={[0, 0.07, 0.005]}>
        <group position={[0, -0.07, -0.005]}>
          <mesh geometry={bird.parts.legs} material={bird.material} castShadow />
        </group>
      </group>
      <group ref={head} position={[hx, hy, hz]}>
        <mesh geometry={bird.parts.head} material={bird.material} castShadow />
      </group>
      <group ref={tail} position={[tx, ty, tz]}>
        <mesh geometry={bird.parts.tail} material={bird.material} castShadow />
      </group>
      <Wing side={1} shoulderRef={shoulderR} elbowRef={elbowR} geometries={wing.geometries} material={wing.material} at={wing.at} />
      <Wing side={-1} shoulderRef={shoulderL} elbowRef={elbowL} geometries={wing.geometries} material={wing.material} at={wing.at} />
    </group>
  )
}

export default memo(AmazonBirdAvatar)
