import GameViewport from '../../components/game/GameViewport.jsx'
import { lazyWithPreload } from '../../shared/lib/lazyWithPreload.js'
import { HUD } from './components/ui/HUD'
import { Overlays } from './components/ui/Overlays'
import { TouchControls } from './components/ui/TouchControls'
import { useKeyboardControls } from './hooks/useKeyboardControls'
import { useSwipeControls } from './hooks/useSwipeControls'
import { useAutoPause } from './hooks/useAutoPause'
import { useAudio } from './hooks/useAudio'
import { useHaptics } from './hooks/useHaptics'
import { useRunLifecycle } from './hooks/useRunLifecycle'

// The scene (R3F, drei, post-processing, shaders) is its own chunk: the title screen and the
// difficulty picker render straight away while it downloads underneath them.
const NeonScene = lazyWithPreload(() => import('./components/canvas/NeonScene.jsx'))

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
      <GameViewport label="Warming up the neon grid…" tone="dark">
        <NeonScene />
      </GameViewport>
      <HUD />
      <TouchControls />
      <Overlays />
    </div>
  )
}
