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
import { MathUtils, MeshStandardMaterial } from 'three'

const mat = (color, extra = {}) => new MeshStandardMaterial({ color, flatShading: true, roughness: 0.75, ...extra })
const M = {
  brown: mat('#7a5a40'),
  darkBrown: mat('#5c4230'),
  black: mat('#23201f'),
  white: mat('#f4efe6'),
  red: mat('#e5322d', { emissive: '#5a0d0b', emissiveIntensity: 0.3 }),
  beak: mat('#3b302b'),
  feet: mat('#c98c5a'),
  eye: mat('#0d0b0a', { roughness: 0.2 }),
  shine: new MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.8 }),
}

// Only the big shapes cast shadows: each caster is drawn again in the shadow pass.
function Part({ geo = 'ico', material, shadow = false, ...props }) {
  return (
    <mesh material={material} castShadow={shadow} {...props}>
      {geo === 'ico' && <icosahedronGeometry args={[1, 0]} />}
      {geo === 'ico1' && <icosahedronGeometry args={[1, 1]} />}
      {geo === 'cone' && <coneGeometry args={[1, 1, 5]} />}
      {geo === 'box' && <boxGeometry args={[1, 1, 1]} />}
      {geo === 'cyl' && <cylinderGeometry args={[1, 1, 1, 5]} />}
    </mesh>
  )
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

function BulbuliAvatar({ motion }) {
  const body = useRef()
  const head = useRef()
  const leftWing = useRef()
  const rightWing = useRef()
  const anim = useRef({ landedAt: -10, wasGrounded: true, wing: -1.3, squash: 0 })

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

    // wings: folded on the ground, flapping going up, spread flat to glide
    let target
    if (p.gliding) target = -0.05 + Math.sin(t * 3) * 0.06
    else if (!p.grounded && p.vel[1] > 0) target = -0.7 + Math.sin(t * 34) * 0.6
    else if (!p.grounded) target = -0.5
    else target = -1.3
    a.wing = MathUtils.damp(a.wing, target, p.gliding ? 8 : 18, dt)
    if (rightWing.current) rightWing.current.rotation.z = a.wing
    if (leftWing.current) leftWing.current.rotation.z = -a.wing

    // head: a little look-around when idle
    if (head.current) {
      const idle = p.grounded && speed < 0.3
      head.current.rotation.y = MathUtils.damp(head.current.rotation.y, idle ? Math.sin(t * 0.8) * 0.35 : 0, 4, dt)
    }
  })

  return (
    <group ref={body}>
      {/* body, belly, tail */}
      <Part material={M.brown} shadow position={[0, 0.52, 0]} scale={[0.36, 0.38, 0.48]} />
      <Part material={M.white} position={[0, 0.44, 0.14]} scale={[0.29, 0.3, 0.34]} />
      <Part geo="box" material={M.darkBrown} shadow position={[0, 0.5, -0.52]} rotation-x={-0.45} scale={[0.22, 0.05, 0.42]} />
      <Part material={M.red} position={[0, 0.34, -0.3]} scale={[0.13, 0.08, 0.13]} />

      {/* head */}
      <group ref={head} position={[0, 0.86, 0.2]}>
        <Part geo="ico1" material={M.black} shadow scale={0.25} />
        <Part geo="cone" material={M.black} shadow position={[0, 0.3, 0.02]} rotation-x={0.35} scale={[0.1, 0.36, 0.1]} />
        <Part geo="cone" material={M.beak} position={[0, -0.03, 0.29]} rotation-x={Math.PI / 2} scale={[0.055, 0.16, 0.055]} />
        {[-1, 1].map((side) => (
          <group key={side}>
            <Part material={M.white} position={[side * 0.17, -0.1, 0.1]} scale={[0.07, 0.08, 0.09]} />
            <Part material={M.red} position={[side * 0.2, 0.02, 0.04]} scale={0.055} />
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
  )
}

export default memo(BulbuliAvatar)
