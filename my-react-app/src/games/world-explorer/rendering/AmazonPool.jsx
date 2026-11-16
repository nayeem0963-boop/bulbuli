/**
 * An Amazon forest pool (biomes/amazon.js `pools`): a raised bank of mud round still, dark water, with
 * crimson fangbacks (payara, a fish with fangs) or dolphins circling in it. Each swimmer is a model file
 * like the other animals (AmazonModel.jsx; its tail beats in the shader, amazonMotion.js). A fish stays
 * below the water, which is see-through enough to show it; a dolphin's back breaks the surface, and it leaps now and then. The water ripples: its shader tilts the
 * surface normal with slow waves and with rings spreading from each swimmer, so the sky and the sun
 * glint on it as it moves. Numbers and shader text: amazonPool.js. Data: biomes/amazon.js `pool`.
 */
import { Suspense, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { CircleGeometry, Color, Float32BufferAttribute, LatheGeometry, MeshStandardMaterial, Vector2 } from 'three'
import { makeMotion } from './amazonMotion.js'
import { BANK_DRY, BANK_DRY_FROM, BANK_WET, BANK_WET_FROM, POOL_BANK, POOL_WATER_R, POOL_WATER_Y, RIPPLE_FRAGMENT_HEAD, RIPPLE_NORMAL, RIPPLE_VERTEX, swimAt } from './amazonPool.js'
import AmazonModel from './AmazonModel.jsx'

/** The bank, with its mud darker (wet) where the water laps it and drier further out (vertex colours by radius). */
function makeBank() {
  const geometry = new LatheGeometry(POOL_BANK.map(([r, y]) => new Vector2(r, y)), 40)
  const wet = new Color(BANK_WET)
  const dry = new Color(BANK_DRY)
  const colour = new Color()
  const position = geometry.attributes.position
  const values = []
  for (let i = 0; i < position.count; i += 1) {
    const r = Math.hypot(position.getX(i), position.getZ(i))
    const t = Math.min(1, Math.max(0, (r - BANK_WET_FROM) / (BANK_DRY_FROM - BANK_WET_FROM)))
    colour.copy(wet).lerp(dry, t * t * (3 - 2 * t))
    values.push(colour.r, colour.g, colour.b)
  }
  geometry.setAttribute('color', new Float32BufferAttribute(values, 3))
  return geometry
}

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
  material.customProgramCacheKey = () => 'wx-amazon-pool-ripples-v2'
  return material
}

function Swimmer({ swimmer, kind, baseY, scale, index, uniformsRef }) {
  const group = useRef(null)
  const motion = useRef(makeMotion())
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    const time = clock.elapsedTime
    const p = swimAt(swimmer, time)
    g.position.set(p.x, baseY + 0.02 * Math.sin(time * 1.3 + swimmer.phase) + p.y, p.z)
    g.rotation.set(p.pitch, p.heading, 0.05 * Math.sin(time * 2 + swimmer.phase))
    motion.current.uT.value = time * swimmer.speed * 1.6 + swimmer.phase
    motion.current.uIdle.value = 1
    if (index < 3) uniformsRef.current[`uF${index}`].value.set(p.x, p.z)
  })
  return (
    <group ref={group}>
      <group scale={scale}>
        <Suspense fallback={null}><AmazonModel kind={kind} motionRef={motion} /></Suspense>
      </group>
    </group>
  )
}

export default function AmazonPool({ pool }) {
  const [bank] = useState(makeBank)
  // the water disc is made lying flat once (its middle at the pool's, facing up), never turned afterwards
  const [surface] = useState(() => new CircleGeometry(POOL_WATER_R, 56).rotateX(-Math.PI / 2))
  const [bed] = useState(() => new CircleGeometry(1.5, 40).rotateX(-Math.PI / 2))
  const [uniforms] = useState(makeUniforms)
  const [water] = useState(() => makeWaterMaterial(uniforms))
  const uniformsRef = useRef(uniforms)
  useFrame(({ clock }) => { uniformsRef.current.uT.value = clock.elapsedTime })
  return (
    <group position={[pool.x, 0, pool.z]}>
      <mesh geometry={bank} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.95} side={2} />
      </mesh>
      <mesh position={[0, 0.03, 0]} geometry={bed}>
        <meshStandardMaterial color="#1c261f" roughness={1} />
      </mesh>
      <mesh position={[0, POOL_WATER_Y, 0]} geometry={surface} material={water} renderOrder={2} />
      {pool.swimmers.map((swimmer, index) => (
        <Swimmer key={index} swimmer={swimmer} kind={pool.kind} baseY={pool.baseY ?? 0.03} scale={swimmer.scale ?? pool.scale ?? 1} index={index} uniformsRef={uniformsRef} />
      ))}
    </group>
  )
}
