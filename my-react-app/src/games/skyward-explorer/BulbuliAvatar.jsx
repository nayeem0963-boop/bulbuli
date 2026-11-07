/**
 * Bulbuli as a light low-poly figure: a red-whiskered bulbul with a pointed black crest,
 * red cheek patch, white cheeks and belly, and the red feathers under the tail.
 * About 20 tiny meshes on shared materials; no model file to download.
 *
 * It animates itself from `motion` (the controller's player object, read every frame):
 * a hop-bob while running, flapping on the way up, wings spread wide while gliding,
 * and a squash when landing. Origin at the feet, facing +z.
 */
import { memo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Float32BufferAttribute, MathUtils, MeshPhysicalMaterial, SphereGeometry } from 'three'

const mat = (color, extra = {}) => new MeshPhysicalMaterial({
  color,
  flatShading: false,
  roughness: 0.75,
  metalness: 0.05,
  sheen: 0.3,
  sheenColor: '#4a3e2e',
  ...extra,
})
const M = {
  brown: mat('#7a5a40'),
  darkBrown: mat('#5c4230'),
  black: mat('#23201f'),
  white: mat('#f4efe6'),
  red: mat('#ff2e2e', { emissive: '#5a0d0b', emissiveIntensity: 0.12 }),
  beak: mat('#3b302b'),
  feet: mat('#c98c5a'),
  eye: new MeshPhysicalMaterial({ color: '#0d0b0a', roughness: 0.1, metalness: 0.8, clearcoat: 1 }),
  shine: new MeshPhysicalMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.8, roughness: 0.1 }),
}

const gradientPatchGeometry = new SphereGeometry(1, 24, 16)
const gradientColors = new Float32Array(gradientPatchGeometry.attributes.position.count * 3)
const redCenter = new Color('#ff2e2e')
const redEdge = new Color('#b52325')
for (let i = 0; i < gradientPatchGeometry.attributes.position.count; i += 1) {
  const z = gradientPatchGeometry.attributes.position.getZ(i)
  const edge = MathUtils.smoothstep(Math.acos(MathUtils.clamp(z, -1, 1)), 0.18, 1.05)
  const color = redCenter.clone().lerp(redEdge, edge)
  gradientColors.set([color.r, color.g, color.b], i * 3)
}
gradientPatchGeometry.setAttribute('color', new Float32BufferAttribute(gradientColors, 3))
const gradientPatchMaterial = new MeshPhysicalMaterial({
  color: '#ffffff',
  vertexColors: true,
  flatShading: false,
  roughness: 0.72,
  metalness: 0.02,
  sheen: 0.2,
  sheenColor: '#4a3e2e',
})

// Only the big shapes cast shadows: each caster is drawn again in the shadow pass.
function Part({ geo = 'ico', material, shadow = false, ...props }) {
  return (
    <mesh material={material} castShadow={shadow} {...props}>
      {geo === 'ico' && <icosahedronGeometry args={[1, 0]} />}
      {geo === 'ico1' && <icosahedronGeometry args={[1, 1]} />}
      {geo === 'sphere' && <sphereGeometry args={[1, 24, 16]} />}
      {geo === 'cone' && <coneGeometry args={[1, 1, 12]} />}
      {geo === 'box' && <boxGeometry args={[1, 1, 1]} />}
      {geo === 'cyl' && <cylinderGeometry args={[1, 1, 1, 5]} />}
    </mesh>
  )
}

function GradientPatch(props) {
  return <mesh geometry={gradientPatchGeometry} material={gradientPatchMaterial} castShadow {...props} />
}

function Wing({ side, wingRef }) {
  // pivot at the shoulder; the wing plank reaches out sideways from it
  return (
    <group ref={wingRef} position={[side * 0.3, 0.62, -0.02]}>
      <Part material={M.darkBrown} shadow position={[side * 0.3, 0, -0.04]} scale={[0.36, 0.05, 0.24]} />
      <Part material={M.brown} position={[side * 0.52, -0.01, -0.12]} scale={[0.2, 0.04, 0.16]} />
    </group>
  )
}

function BulbuliAvatar({ motion, scale = 1 }) {
  const body = useRef()
  const chest = useRef()
  const head = useRef()
  const tail = useRef()
  const leftWing = useRef()
  const rightWing = useRef()
  const anim = useRef({
    landedAt: -10,
    wasGrounded: true,
    wing: -1.3,
    headYaw: 0,
    headTilt: 0,
    nextTwitch: 0,
    returnHead: 0,
    nextTailFlick: 0,
    tailPulse: 0,
  })

  useFrame(({ clock }, delta) => {
    const p = motion.current
    if (!p || !body.current) return
    const t = clock.elapsedTime
    const a = anim.current
    const dt = Math.min(delta, 0.1)
    const speed = Math.hypot(p.vel[0], p.vel[2])
    const run = MathUtils.clamp(speed / 7, 0, 1)

    if (p.grounded && !a.wasGrounded) a.landedAt = t
    a.wasGrounded = p.grounded

    // body: hop-bob and lean while running, a squash just after landing
    const sinceLand = t - a.landedAt
    const squash = sinceLand < 0.25 ? Math.sin((sinceLand / 0.25) * Math.PI) * 0.18 : 0
    const bob = p.grounded ? Math.abs(Math.sin(t * 13)) * 0.07 * run : 0
    body.current.position.y = bob
    body.current.scale.set(1 + squash * 0.6, 1 - squash, 1 + squash * 0.6)
    const lean = p.gliding ? 0.25 : p.grounded ? run * 0.18 : MathUtils.clamp(-p.vel[1] * 0.03, -0.2, 0.25)
    body.current.rotation.x = MathUtils.damp(body.current.rotation.x, lean, 10, dt)
    if (chest.current) {
      const breath = Math.sin(t * 2.5) * 0.02
      chest.current.scale.y = 1 + breath
      chest.current.rotation.x = breath * 0.35
    }

    // wings: folded on the ground, flapping going up, spread flat to glide
    let target
    if (p.gliding) target = -0.05 + Math.sin(t * 3) * 0.06
    else if (!p.grounded && p.vel[1] > 0) target = -0.7 + Math.sin(t * 34) * 0.6
    else if (!p.grounded) target = -0.5
    else target = -1.3
    a.wing = MathUtils.damp(a.wing, target, p.gliding ? 8 : 18, dt)
    for (const [wing, side] of [[rightWing.current, 1], [leftWing.current, -1]]) {
      if (!wing) continue
      wing.rotation.z = side * a.wing
      wing.position.x = side * (p.grounded ? 0.25 : 0.3)
      wing.position.y = 0.62 + (p.grounded ? Math.sin(t * 3.1 + side) * 0.008 : 0)
      wing.scale.x = p.grounded ? 0.82 : 1
    }

    // Head glances are sparse and brief rather than continuously swaying.
    if (head.current) {
      if (t >= a.nextTwitch) {
        a.headYaw = (Math.random() * 2 - 1) * (25 * Math.PI / 180)
        a.headTilt = (Math.random() * 2 - 1) * 0.08
        a.returnHead = t + 0.18
        a.nextTwitch = t + 2 + Math.random() * 2
      }
      if (t >= a.returnHead) {
        a.headYaw = 0
        a.headTilt = 0
        a.returnHead = Infinity
      }
      const idle = p.grounded && speed < 0.3
      const glanceYaw = idle ? a.headYaw : 0
      const glanceTilt = idle ? a.headTilt : 0
      head.current.rotation.y = MathUtils.damp(head.current.rotation.y, glanceYaw, 16, dt)
      head.current.rotation.z = MathUtils.damp(head.current.rotation.z, glanceTilt, 14, dt)
    }

    if (t >= a.nextTailFlick) {
      a.tailPulse = 1
      a.nextTailFlick = t + 2.5 + Math.random() * 2.5
    }
    a.tailPulse = MathUtils.damp(a.tailPulse, 0, 9, dt)
    if (tail.current) {
      tail.current.rotation.x = Math.sin(t * 36) * 0.22 * a.tailPulse
    }
  })

  return (
    <group scale={scale}>
      <group ref={body}>
        {/* body, belly, tail */}
        <group ref={chest} position={[0, 0.5, 0]}>
          <Part geo="sphere" material={M.brown} shadow position={[0, 0.02, 0]} scale={[0.36, 0.38, 0.48]} />
          <Part geo="sphere" material={M.white} position={[0, -0.06, 0.14]} scale={[0.29, 0.3, 0.34]} />
        </group>
        <group ref={tail} position={[0, 0.5, -0.52]}>
          <Part geo="box" material={M.darkBrown} shadow rotation-x={-0.45} scale={[0.22, 0.05, 0.42]} />
          <GradientPatch position={[0, -0.16, 0.22]} scale={[0.13, 0.08, 0.13]} rotation-y={Math.PI} />
        </group>

        {/* head */}
        <group ref={head} position={[0, 0.86, 0.2]}>
          <Part geo="sphere" material={M.black} shadow scale={0.25} />
          <Part geo="cone" material={M.black} shadow position={[0, 0.3, 0.02]} rotation-x={0.35} scale={[0.1, 0.36, 0.1]} />
          <Part geo="cone" material={M.beak} position={[0, -0.03, 0.29]} rotation-x={Math.PI / 2} scale={[0.055, 0.16, 0.055]} />
          {[-1, 1].map((side) => (
            <group key={side}>
              <Part geo="sphere" material={M.white} position={[side * 0.17, -0.1, 0.1]} scale={[0.07, 0.08, 0.09]} />
              <GradientPatch position={[side * 0.2, 0.02, 0.04]} scale={0.055} />
              <Part material={M.eye} position={[side * 0.13, 0.05, 0.19]} scale={0.045} />
              <Part material={M.shine} position={[side * 0.14, 0.07, 0.225]} scale={0.014} />
            </group>
          ))}
        </group>

        <Wing side={1} wingRef={rightWing} />
        <Wing side={-1} wingRef={leftWing} />

        {/* feet */}
        {[-1, 1].map((side) => (
          <Part key={side} geo="cyl" material={M.feet} position={[side * 0.12, 0.08, 0.04]} scale={[0.035, 0.16, 0.035]} />
        ))}
      </group>
    </group>
  )
}

export default memo(BulbuliAvatar)
