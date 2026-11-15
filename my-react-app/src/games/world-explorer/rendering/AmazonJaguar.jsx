/**
 * The Amazon's jaguar: the model "jaguar" by Ear.Rodriguez (Sketchfab, CC BY 4.0; see
 * ../assets/jaguar.LICENSE.md, and the credit on the review page). The file is the original's rest
 * pose baked into static geometry: no skeleton, no animation, 962 KB. It stands where it is put,
 * feet on the ground, facing +z, like every other animal (AmazonFauna.jsx).
 *
 * It loads on its own: the rest of the forest is drawn while the model arrives.
 */
import { useLayoutEffect, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { Color } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import jaguarUrl from '../assets/jaguar.glb?url'

/** The model's materials, adjusted once: matte fur, and a little self-light so it holds its colour in the dim forest. */
function tune(scene) {
  scene.traverse((object) => {
    if (!object.isMesh) return
    object.castShadow = true
    object.receiveShadow = true
    const material = object.material
    if (material.map) {
      material.emissive = new Color('#3a3226')
      material.emissiveMap = material.map
      material.emissiveIntensity = 0.22
    }
  })
}

export default function AmazonJaguar() {
  const gltf = useLoader(GLTFLoader, jaguarUrl)
  // each jaguar is a copy of the loaded scene; geometry and materials are shared
  const scene = useMemo(() => gltf.scene.clone(true), [gltf])
  useLayoutEffect(() => { tune(gltf.scene) }, [gltf])
  return <primitive object={scene} />
}
