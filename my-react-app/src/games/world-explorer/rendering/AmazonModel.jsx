/**
 * The Amazon's animals, all model files (the first four, and the credits of every one, in amazonFauna.js):
 *   - the jaguar: "jaguar" by Ear.Rodriguez (Sketchfab, CC BY 4.0), assets/jaguar.glb
 *   - the ocelot: "Cat" by photon (that one larry) (Sketchfab, CC BY 4.0), assets/ocelot.glb, a house
 *     cat re-skinned as an ocelot by rendering/amazonOcelotCoat.js
 *   - the armadillo: "Armadillo" by RISD Nature Lab (Sketchfab, CC BY 4.0), assets/armadillo.glb, a scan
 *     reduced from a million triangles to 16,500
 *   - the capuchin: "Realsitic Monkey" by TdoubleU8 (Sketchfab, CC BY 4.0), assets/capuchin.glb, a macaque
 *     re-skinned as a capuchin by rendering/amazonCapuchinCoat.js
 * See the .LICENSE.md next to each file, and the credits on the review page. Both files are a rest
 * pose baked into static geometry: no skeleton, no animation. Each stands where it is put, feet on the
 * ground, facing +z, like every other animal (AmazonFauna.jsx), and loads on its own: the rest of the
 * forest is drawn while it arrives.
 */
import { useLayoutEffect, useMemo } from 'react'
import { MODEL_FIX, hasMotion, patchShader } from './amazonMotion.js'
import { useLoader } from '@react-three/fiber'
import { Color } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { applyCapuchinCoat } from './amazonCapuchinCoat.js'
import { applyOcelotCoat } from './amazonOcelotCoat.js'
import { applyTigerCoat } from './amazonTigerCoat.js'
import armadilloUrl from '../assets/armadillo.glb?url'
import capuchinUrl from '../assets/capuchin.glb?url'
import jaguarUrl from '../assets/jaguar.glb?url'
import anacondaUrl from '../assets/anaconda.glb?url'
import eagleUrl from '../assets/harpy-eagle.glb?url'
import fishUrl from '../assets/crimson-fangback.glb?url'
import dolphinUrl from '../assets/dolphin.glb?url'
import hoatzinUrl from '../assets/hoatzin.glb?url'
import macawUrl from '../assets/macaw-flying.glb?url'
import blueMacawUrl from '../assets/macaw-blue-yellow.glb?url'
import morphoUrl from '../assets/morpho.glb?url'
import scarletMacawUrl from '../assets/scarlet-macaw.glb?url'
import toucanUrl from '../assets/toco-toucan.glb?url'
import ocelotUrl from '../assets/ocelot.glb?url'

/** Matte, shadows, and a touch of self-light (from the model's own colours) so the animal holds its colour in the dim forest. */
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

/** The capuchin: the coat is the shader's (a plain emissive: the model's own map is the macaque's). */
function tuneCapuchin(scene) {
  scene.traverse((object) => {
    if (!object.isMesh) return
    object.castShadow = true
    object.receiveShadow = true
    object.material.emissive = new Color('#2a2118')
    object.material.emissiveIntensity = 0.32
    applyCapuchinCoat(object.material)
  })
}

/** The Sundarbans' tiger: the jaguar's file with the tiger coat on its body (its eyes keep their own painting). */
function tuneTiger(scene) {
  scene.traverse((object) => {
    if (!object.isMesh) return
    object.castShadow = true
    object.receiveShadow = true
    if (object.geometry.attributes.position.count < 5000) return // the eyes
    object.material.emissive = new Color('#2a1708')
    object.material.emissiveIntensity = 0.1
    applyTigerCoat(object.material)
  })
}

const MODELS = Object.freeze({
  jaguar: { url: jaguarUrl, tune: tuneJaguar },
  // the same file as the jaguar, as its own kind. `own`: the loader shares one set of materials between every user of a file,
  // so the tiger works on copies of them and the jaguars keep their own painting
  tiger: { url: jaguarUrl, tune: tuneTiger, own: true },
  ocelot: { url: ocelotUrl, tune: tuneOcelot },
  armadillo: { url: armadilloUrl, tune: tuneJaguar },
  capuchin: { url: capuchinUrl, tune: tuneCapuchin },
  anaconda: { url: anacondaUrl, tune: tuneJaguar },
  harpyEagle: { url: eagleUrl, tune: tuneJaguar },
  hoatzin: { url: hoatzinUrl, tune: tuneJaguar },
  macaw: { url: macawUrl, tune: tuneJaguar },
  blueMacaw: { url: blueMacawUrl, tune: tuneJaguar },
  scarletMacaw: { url: scarletMacawUrl, tune: tuneJaguar },
  toucan: { url: toucanUrl, tune: tuneJaguar },
  morpho: { url: morphoUrl, tune: tuneJaguar },
  fish: { url: fishUrl, tune: tuneJaguar },
  dolphin: { url: dolphinUrl, tune: tuneJaguar },
})

/**
 * `motionRef` (a ref to { uPh, uAmp }, uniform objects the game updates each frame) gives this animal its own copy of
 * every material with swinging legs or beating wings (amazonMotion.js). Without it the model is static.
 */
export default function AmazonModel({ kind, motionRef }) {
  const { url, tune, own } = MODELS[kind]
  const gltf = useLoader(GLTFLoader, url)
  // each animal is a copy of the loaded scene; geometry and materials are shared (an `own` kind copies the materials too)
  const scene = useMemo(() => {
    const copy = gltf.scene.clone(true)
    if (own) copy.traverse((object) => { if (object.isMesh) object.material = object.material.clone() })
    return copy
  }, [gltf, own])
  useLayoutEffect(() => { tune(own ? scene : gltf.scene) }, [gltf, scene, tune, own])
  useLayoutEffect(() => {
    const motion = motionRef?.current
    if (!motion || !hasMotion(kind)) return undefined
    const own = []
    scene.traverse((object) => {
      if (!object.isMesh || Array.isArray(object.material)) return
      const shared = object.material
      const copy = shared.clone()
      const coat = shared.onBeforeCompile
      const coatKey = shared.customProgramCacheKey?.() ?? ''
      copy.onBeforeCompile = (shader, renderer) => {
        coat.call(copy, shader, renderer)
        patchShader(shader, kind, motion)
      }
      copy.customProgramCacheKey = () => `${coatKey}|motion-${kind}`
      object.material = copy
      own.push(copy)
    })
    return () => own.forEach((material) => material.dispose())
  }, [scene, kind, motionRef])
  const fix = MODEL_FIX[kind]
  return (
    <group position={fix?.shift ?? [0, 0, 0]} rotation={[0, fix?.yaw ?? 0, fix?.roll ?? 0]}>
      <primitive object={scene} />
    </group>
  )
}
