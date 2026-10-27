/**
 * Neon Velocity: the lazily loaded half of the game.
 *
 * NeonVelocityApp renders the HUD, touch controls and title/difficulty overlays straight away;
 * this module brings the 3D side: the R3F <GameCanvas> and drei's asset <Loader> (a progress
 * bar for textures/fonts going through THREE.DefaultLoadingManager). The Loader lives here, not
 * in NeonVelocityApp, because importing anything from drei pulls R3F into the eager chunk.
 * It is position:absolute with z-index 1000, so its place in the DOM doesn't change what's on top.
 */
import { Loader } from '@react-three/drei'
import { GameCanvas } from './GameCanvas'

export default function NeonScene() {
  return (
    <>
      <GameCanvas />
      <Loader containerStyles={{ position: 'absolute', background: '#07020f' }} barStyles={{ background: '#ff2bd6' }} />
    </>
  )
}
