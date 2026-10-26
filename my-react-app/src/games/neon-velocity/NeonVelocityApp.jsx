import { Loader } from '@react-three/drei'
import { GameCanvas } from './components/canvas/GameCanvas'
import { HUD } from './components/ui/HUD'
import { Overlays } from './components/ui/Overlays'
import { TouchControls } from './components/ui/TouchControls'
import { useKeyboardControls } from './hooks/useKeyboardControls'
import { useSwipeControls } from './hooks/useSwipeControls'
import { useAutoPause } from './hooks/useAutoPause'
import { useAudio } from './hooks/useAudio'
import { useHaptics } from './hooks/useHaptics'
import { useRunLifecycle } from './hooks/useRunLifecycle'

/** The whole game. Mounted by ./index.jsx inside the arcade (page or launcher). */
export default function NeonVelocityApp() {
  // Global input + lifecycle hooks (write into the non-reactive input store)
  useKeyboardControls()
  useSwipeControls()
  useAutoPause()
  useAudio()
  useHaptics()
  useRunLifecycle()

  return (
    <div className="nv-app">
      <GameCanvas />
      <HUD />
      <TouchControls />
      <Overlays />
      <Loader containerStyles={{ position: 'absolute', background: '#07020f' }} barStyles={{ background: '#ff2bd6' }} />
    </div>
  )
}
