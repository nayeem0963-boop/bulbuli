/**
 * Bulbuli for the Phase 2A games (design 1.4, 1.8). Loads the same /models/bulbuli.glb as the
 * existing games, but with the decoder path supplied by the learning adapter:
 *   - dev preview: the Draco decoder bundled inside `three` (served by the Vite dev server)
 *   - release (later, separately approved): /draco/
 * so the new games never fetch the decoder from Google's CDN. BulbuliModel.jsx is not touched.
 */
import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Box3, Vector3 } from 'three'

// Same asset as src/components/game/BulbuliModel.jsx. Not imported from there on purpose: that
// module preloads the model with drei's default (Google-hosted) Draco decoder at import time.
export const BULBULI_MODEL_URL = '/models/bulbuli.glb'
const WINGSPAN = 1.8
const YAW = Math.PI // tail towards the camera, as in Sky Runner

export default function ExplorerBird({ decoderPath }) {
  if (!decoderPath) throw new Error('ExplorerBird needs an explicit decoderPath (design 1.8)')
  const { scene } = useGLTF(BULBULI_MODEL_URL, decoderPath)
  const model = useMemo(() => {
    const clone = scene.clone(true)
    const box = new Box3().setFromObject(clone)
    const size = box.getSize(new Vector3())
    const centre = box.getCenter(new Vector3())
    const scale = WINGSPAN / Math.max(size.x, size.z, 0.001)
    clone.position.sub(centre)
    return { clone, scale }
  }, [scene])
  return (
    <group rotation={[0, YAW, 0]} scale={model.scale}>
      <primitive object={model.clone} />
    </group>
  )
}
