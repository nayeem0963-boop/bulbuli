/**
 * The Sundarbans' cat: a model file (assets/oiiaioooooiai-cat.glb, "Oiiaioooooiai Cat" by Zhuier,
 * CC BY 4.0, credited in sundarbansCredits.js and the review page) that walks straight up and down a line
 * on the home island, turning round at each end. The model is a static pose, so its walk is code: the
 * position and heading from sundarbansCat.js, the legs swung and the tail swished in the vertex shader
 * (amazonMotion.js: LEG_MOTION.cat and IDLE_MOTION.cat). It is a decoration: no collider.
 */
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { DoubleSide } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { contactShadowTexture } from './amazonGroundShadow.js'
import { makeMotion, patchShader } from './amazonMotion.js'
import { catAt } from './sundarbansCat.js'
import { WALKING_CAT, WALKING_CAT_PATH } from './sundarbansCredits.js'
import catUrl from '../assets/oiiaioooooiai-cat.glb?url'

let shadowTexture = null
const shadow = () => (shadowTexture ??= contactShadowTexture())

/** The cat model, each of its materials copied so this cat's legs and tail have their own uniforms. */
function CatModel({ motionRef }) {
  const gltf = useLoader(GLTFLoader, catUrl)
  const scene = useMemo(() => gltf.scene.clone(true), [gltf])
  useLayoutEffect(() => {
    const motion = motionRef.current
    const own = []
    scene.traverse((object) => {
      if (!object.isMesh) return
      object.castShadow = true
      object.receiveShadow = true
      const copy = object.material.clone()
      copy.onBeforeCompile = (shader) => patchShader(shader, 'cat', motion)
      copy.customProgramCacheKey = () => 'wx-sundarbans-cat-walk-v1'
      object.material = copy
      own.push(copy)
    })
    return () => own.forEach((material) => material.dispose())
  }, [scene, motionRef])
  return <primitive object={scene} />
}

/** Placed at the middle of its line (PropView); it moves along z from there. */
export default function SundarbansCat({ scale = 1 }) {
  const group = useRef(null)
  const body = useRef(null)
  const motion = useRef(makeMotion())
  const mid = (WALKING_CAT_PATH.z0 + WALKING_CAT_PATH.z1) / 2
  useFrame(({ clock }) => {
    const g = group.current
    const b = body.current
    if (!g || !b) return
    const t = clock.elapsedTime
    const p = catAt(t)
    g.position.set(0, 0, p.z - mid)
    g.rotation.y = p.heading
    const m = motion.current
    m.uPh.value = p.gait
    m.uAmp.value = p.walking
    m.uT.value = t
    m.uIdle.value = 1
    // a little rise with every step (each diagonal pair that lands presses the body down)
    b.position.y = WALKING_CAT.bob * Math.abs(Math.sin(p.gait))
  })
  return (
    <group scale={scale}>
      <group ref={group}>
        <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2} scale={[0.6, 0.6, 1]} renderOrder={1}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={shadow()} transparent depthWrite={false} side={DoubleSide} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </mesh>
        <group ref={body}>
          <Suspense fallback={null}><CatModel motionRef={motion} /></Suspense>
        </group>
      </group>
    </group>
  )
}
