/**
 * The Sundarbans' spinning cat: a model file (assets/oiiaioooooiai-cat.glb, "Oiiaioooooiai Cat" by Zhuier,
 * CC BY 4.0, credited in sundarbansCredits.js and the review page) that spins on the spot and bobs, like
 * its original animation. It is a decoration: no collider. The model is a static pose, so the spin is
 * all code. It loads on its own while the rest of the island is drawn.
 */
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { DoubleSide } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { contactShadowTexture } from './amazonGroundShadow.js'
import { SPINNING_CAT } from './sundarbansCredits.js'
import catUrl from '../assets/oiiaioooooiai-cat.glb?url'

let shadowTexture = null
const shadow = () => (shadowTexture ??= contactShadowTexture())

function CatModel() {
  const gltf = useLoader(GLTFLoader, catUrl)
  const scene = useMemo(() => gltf.scene.clone(true), [gltf])
  useLayoutEffect(() => {
    scene.traverse((object) => {
      if (!object.isMesh) return
      object.castShadow = true
      object.receiveShadow = true
    })
  }, [scene])
  return <primitive object={scene} />
}

export default function SundarbansCat({ scale = 1 }) {
  const body = useRef(null)
  useFrame(({ clock }) => {
    const b = body.current
    if (!b) return
    const t = clock.elapsedTime
    b.rotation.y = t * SPINNING_CAT.turnsPerSecond * Math.PI * 2
    // a hop with every other half turn, as in the original: the cat is at its highest twice a turn
    b.position.y = SPINNING_CAT.bob * (0.5 + 0.5 * Math.sin(t * SPINNING_CAT.turnsPerSecond * Math.PI * 2 * SPINNING_CAT.bobTurns))
  })
  return (
    <group scale={scale}>
      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2} scale={[0.6, 0.6, 1]} renderOrder={1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadow()} transparent depthWrite={false} side={DoubleSide} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
      <group ref={body}>
        <Suspense fallback={null}><CatModel /></Suspense>
      </group>
    </group>
  )
}
