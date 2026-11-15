/**
 * The Amazon Rainforest player bird: "Bird Orange" by Wen Yeh (Sketchfab), CC BY-NC-SA 4.0.
 * See assets/bird_orange.LICENSE.md: NON-COMMERCIAL. It must be licensed or replaced before
 * any commercial release.
 *
 * Drop-in for skyward-explorer/BulbuliAvatar inside ExplorerController: it takes the same
 * `motion` ref (the controller's player object, read every frame), sits with its feet at the
 * origin facing +z, and changes nothing about movement, collisions or the camera.
 *
 * What the model provides, and how it is used:
 *   - one skinned mesh (43 bones: legs, tail, spine, neck, head, eyes, jaw; NO wing bones)
 *   - one clip, `anim` (5.04 s): a two-footed hop (0–0.6 s), then a standing idle with head
 *     turns, eye movement and a beak open/close (0.6–5.04 s)
 *   The clip is split into three actions blended by weight (no clip is invented):
 *     idle  0.6–5.04 s, looped, when standing
 *     hop   0–0.6 s, looped, speed-scaled, when moving on the ground (robins hop)
 *     air   a single held frame from the hop (0.24 s: legs hanging) while airborne
 *   The clip's own forward travel (the armature node `Main`) is removed: the controller already
 *   moves the bird, and keeping it would make the bird lurch and snap back every loop.
 *
 * Wings: the model's wings are sculpted folded against the body and cannot move, so a pair of
 * code-driven wings (inner + outer segment, coloured to match the plumage) opens from the back
 * while airborne: fast beats while climbing, slower beats while falling, spread and still while
 * gliding, and they fold away on landing. These are scene-graph meshes animated in code, not
 * added bones or clips: the asset itself is unchanged. Remove the two <Wing> elements to fly the
 * model exactly as supplied (it then has no wing motion at all).
 *
 * The visual turn is smoothed and the body banks and pitches in flight; the controller's own
 * facing (and so all gameplay) is unchanged.
 */
import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { AnimationMixer, AnimationUtils, Box3, Color, DoubleSide, Float32BufferAttribute, MathUtils, MeshStandardMaterial, Shape, ShapeGeometry, Vector3 } from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import birdUrl from './assets/bird_orange.glb?url'

export const AMAZON_BIRD_URL = birdUrl
/** Beak-to-tail length in metres: Bulbuli's size, so the camera framing and the map's scale fit. */
export const AMAZON_BIRD_LENGTH = 0.44
const CLIP_FPS = 120 // the clip's keys are at irregular times; slice it finely
const IDLE = [0.6, 5.04]
const HOP = [0, 0.6]
const AIR_FRAME = 0.24
const TAU = Math.PI * 2

// plumage tones sampled by eye from the model's texture (back and wing coverts)
const WING_ROOT = new Color('#b9652d')
const WING_TIP = new Color('#6a3519')
const WING_EDGE = new Color('#4d2714')

/** A clip slice without the armature's forward travel (`Main`'s tracks). */
function slice(clip, name, [from, to]) {
  const part = AnimationUtils.subclip(clip, name, Math.round(from * CLIP_FPS), Math.round(to * CLIP_FPS), CLIP_FPS)
  part.tracks = part.tracks.filter((track) => !track.name.startsWith('Main.'))
  return part
}

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

function useBird() {
  const gltf = useGLTF(AMAZON_BIRD_URL, false, false) // plain glTF: no Draco or meshopt decoder
  return useMemo(() => {
    const root = cloneSkinned(gltf.scene)
    const source = gltf.animations[0]
    // The model ships with its texture as an emissive map at full strength (self-lit, it would
    // glow in the dark forest). Light it like everything else instead.
    let material = null
    root.traverse((object) => {
      if (!object.isMesh) return
      material = new MeshStandardMaterial({ map: object.material.map, roughness: 0.82, metalness: 0, side: DoubleSide })
      object.material = material
      object.castShadow = true
      object.frustumCulled = false // skinned: the bind-pose bounds don't follow the hop
    })
    const mixer = new AnimationMixer(root)
    const actions = {
      idle: mixer.clipAction(slice(source, 'idle', IDLE)),
      hop: mixer.clipAction(slice(source, 'hop', HOP)),
      air: mixer.clipAction(slice(source, 'air', [AIR_FRAME, AIR_FRAME + 1 / CLIP_FPS])),
    }
    for (const [name, action] of Object.entries(actions)) {
      action.play()
      action.setEffectiveWeight(name === 'idle' ? 1 : 0)
    }
    actions.air.timeScale = 0
    // measure the standing pose to put the feet on the origin and fit the length
    mixer.update(0)
    root.updateMatrixWorld(true)
    const box = new Box3().setFromObject(root, true)
    const size = box.getSize(new Vector3())
    const scale = AMAZON_BIRD_LENGTH / size.z
    const offset = new Vector3(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2)
    return { root, mixer, actions, material, scale, offset, height: size.y * scale }
  }, [gltf])
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
  const shoulderR = useRef()
  const shoulderL = useRef()
  const elbowR = useRef()
  const elbowL = useRef()
  const state = useRef({ yaw: null, turn: 0, open: 0, phase: 0, w: { idle: 1, hop: 0, air: 0 } })

  // wings sized from the bird: each about 0.7 body lengths, as for a small songbird
  const wing = useMemo(() => {
    const L = AMAZON_BIRD_LENGTH
    const at = { x: 0.1 * L / 0.44, y: bird.height * 0.66, z: -0.01, innerSpan: L * 0.32 }
    return {
      at,
      geometries: { inner: wingSegment(at.innerSpan, L * 0.3, L * 0.27, 3), outer: wingSegment(L * 0.4, L * 0.27, L * 0.1, 5) },
      material: new MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0, side: DoubleSide }),
    }
  }, [bird.height])

  useEffect(() => () => {
    bird.mixer.stopAllAction()
    bird.mixer.uncacheRoot(bird.root)
    bird.material?.dispose() // the texture belongs to useGLTF's shared cache
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
    const speed = Math.hypot(p.vel[0], p.vel[2])
    const air = !p.grounded
    const climbing = air && p.vel[1] > 0.4

    // which part of the clip: standing, hopping along, or the held in-air pose
    const target = air ? { idle: 0, hop: 0, air: 1 } : speed > 0.6 ? { idle: 0, hop: 1, air: 0 } : { idle: 1, hop: 0, air: 0 }
    for (const name of ['idle', 'hop', 'air']) {
      s.w[name] = MathUtils.damp(s.w[name], target[name], 12, dt)
      bird.actions[name].setEffectiveWeight(s.w[name])
    }
    bird.actions.hop.setEffectiveTimeScale(MathUtils.clamp(speed / 3.5, 0.8, 1.7))
    bird.mixer.update(dt)

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
    // the body rises a little on each downstroke
    body.current.position.y = bird.height * 0.5 + (air && !p.gliding ? Math.cos(s.phase) * 0.012 * amplitude : 0)
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

  return (
    <group ref={body} position={[0, bird.height * 0.5, 0]}>
      <group position={[0, -bird.height * 0.5, 0]}>
        <group scale={bird.scale}>
          <primitive object={bird.root} position={bird.offset} />
        </group>
        <Wing side={1} shoulderRef={shoulderR} elbowRef={elbowR} geometries={wing.geometries} material={wing.material} at={wing.at} />
        <Wing side={-1} shoulderRef={shoulderL} elbowRef={elbowL} geometries={wing.geometries} material={wing.material} at={wing.at} />
      </group>
    </group>
  )
}

export default memo(AmazonBirdAvatar)
