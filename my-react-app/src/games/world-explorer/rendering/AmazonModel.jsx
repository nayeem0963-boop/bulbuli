/**
 * The Amazon's two animals that are model files (everything else is built in code):
 *   - the jaguar: "jaguar" by Ear.Rodriguez (Sketchfab, CC BY 4.0), assets/jaguar.glb
 *   - the ocelot: "Cat" by photon (that one larry) (Sketchfab, CC BY 4.0), assets/ocelot.glb, a house
 *     cat re-skinned as an ocelot by rendering/amazonOcelotCoat.js
 * See the .LICENSE.md next to each file, and the credits on the review page. Both files are a rest
 * pose baked into static geometry: no skeleton, no animation. Each stands where it is put, feet on the
 * ground, facing +z, like every other animal (AmazonFauna.jsx), and loads on its own: the rest of the
 * forest is drawn while it arrives.
 */
import { useLayoutEffect, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { Color } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { applyOcelotCoat } from './amazonOcelotCoat.js'
import jaguarUrl from '../assets/jaguar.glb?url'
import ocelotUrl from '../assets/ocelot.glb?url'

/** Matte fur, shadows, and a touch of self-light so the animal holds its colour in the dim forest. */
function tuneJaguar(scene) {
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

/** The same, and the ocelot coat (a plain emissive: the model's own map is the house cat's). */
function tuneOcelot(scene) {
  scene.traverse((object) => {
    if (!object.isMesh) return
    object.castShadow = true
    object.receiveShadow = true
    object.material.emissive = new Color('#2f2619')
    object.material.emissiveIntensity = 0.32
    applyOcelotCoat(object.material)
  })
}

const MODELS = Object.freeze({
  jaguar: { url: jaguarUrl, tune: tuneJaguar },
  ocelot: { url: ocelotUrl, tune: tuneOcelot },
})

export default function AmazonModel({ kind }) {
  const { url, tune } = MODELS[kind]
  const gltf = useLoader(GLTFLoader, url)
  // each animal is a copy of the loaded scene; geometry and materials are shared
  const scene = useMemo(() => gltf.scene.clone(true), [gltf])
  useLayoutEffect(() => { tune(gltf.scene) }, [gltf, tune])
  return <primitive object={scene} />
}
