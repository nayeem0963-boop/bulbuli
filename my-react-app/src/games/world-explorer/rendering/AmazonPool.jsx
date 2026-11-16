/**
 * The Amazon's forest pool: a raised bank of mud round still, dark water, at the foot of the giant
 * tree, with crimson fangbacks (payara, a fish with fangs) circling in it. The fish is a model file
 * like the other animals (AmazonModel.jsx; its tail beats in the shader, amazonMotion.js) and stays
 * below the water, which is see-through enough to show it. The water ripples: its shader tilts the
 * surface normal with slow waves and with rings spreading from each fish, so the sky and the sun
 * glint on it as it moves. Numbers and shader text: amazonPool.js. Data: biomes/amazon.js `pool`.
 */
import { Suspense, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { LatheGeometry, MeshStandardMaterial, Vector2 } from 'three'
import { makeMotion } from './amazonMotion.js'
import { FISH_SCALE, POOL_BANK, POOL_WATER_R, POOL_WATER_Y, RIPPLE_FRAGMENT_HEAD, RIPPLE_NORMAL, RIPPLE_VERTEX, fishAt } from './amazonPool.js'
import AmazonModel from './AmazonModel.jsx'

const makeUniforms = () => ({ uT: { value: 0 }, uF0: { value: new Vector2(99, 99) }, uF1: { value: new Vector2(99, 99) }, uF2: { value: new Vector2(99, 99) } })

function makeWaterMaterial(uniforms) {
  const material = new MeshStandardMaterial({ color: '#2f6f66', transparent: true, opacity: 0.55, roughness: 0.08, metalness: 0, depthWrite: false })
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader.replace('void main() {', RIPPLE_VERTEX)
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${RIPPLE_FRAGMENT_HEAD}void main() {`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${RIPPLE_NORMAL}`)
  }
  material.customProgramCacheKey = () => 'wx-amazon-pool-ripples-v1'
  return material
}

function Fish({ fish, index, uniformsRef }) {
  const group = useRef(null)
  const motion = useRef(makeMotion())
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    const time = clock.elapsedTime
    const p = fishAt(fish, time)
    g.position.set(p.x, 0.03 + 0.02 * Math.sin(time * 1.3 + fish.phase), p.z)
    g.rotation.set(0, p.heading, 0.05 * Math.sin(time * 2 + fish.phase))
    motion.current.uT.value = time * fish.speed * 1.6 + fish.phase
    motion.current.uIdle.value = 1
    if (index < 3) uniformsRef.current[`uF${index}`].value.set(p.x, p.z)
  })
  return (
    <group ref={group}>
      <group scale={FISH_SCALE}>
        <Suspense fallback={null}><AmazonModel kind="fish" motionRef={motion} /></Suspense>
      </group>
    </group>
  )
}

export default function AmazonPool({ pool }) {
  const [bank] = useState(() => new LatheGeometry(POOL_BANK.map(([r, y]) => new Vector2(r, y)), 40))
  const [uniforms] = useState(makeUniforms)
  const [water] = useState(() => makeWaterMaterial(uniforms))
  const uniformsRef = useRef(uniforms)
  useFrame(({ clock }) => { uniformsRef.current.uT.value = clock.elapsedTime })
  return (
    <group position={[pool.x, 0, pool.z]}>
      <mesh geometry={bank} receiveShadow>
        <meshStandardMaterial color="#4a3b27" roughness={0.95} side={2} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[1.5, 40]} />
        <meshStandardMaterial color="#1c261f" roughness={1} />
      </mesh>
      <mesh position={[0, POOL_WATER_Y, 0]} material={water} renderOrder={2}>
        <circleGeometry args={[POOL_WATER_R, 56]} onUpdate={(g) => g.rotateX(-Math.PI / 2)} />
      </mesh>
      {pool.fish.map((fish, index) => <Fish key={index} fish={fish} index={index} uniformsRef={uniformsRef} />)}
    </group>
  )
}
