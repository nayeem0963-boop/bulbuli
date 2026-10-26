import { STEERING_MODES } from '../../config/constants'
import { useResponsive } from '../../hooks/useResponsive'
import { haptic } from '../../hooks/useHaptics'
import {
  pressJump, pressSlide, queueLaneShift, releaseJump, releaseSlide, setSteer,
} from '../../stores/inputStore'
import { GameStatus, useGameStore } from '../../stores/useGameStore'
import { useProfileStore } from '../../stores/useProfileStore'

/**
 * Virtual pad — shown on screens below 768 px and on touch devices.
 *   Steering thumb: ◀ ▶  (tap = lane change; hold = steer in free mode)
 *   Action thumb:   ▲ jump (tap again in the air = double jump, hold = glide), ▼ slide / slam
 * Respects the player's control layout (hidden in "Swipe" layout) and handedness
 * (left-handed swaps the clusters). Uses pointer capture so a thumb sliding off a
 * button still releases it correctly.
 */
export function TouchControls() {
  const { showVirtualPad } = useResponsive()
  const status = useGameStore((s) => s.status)
  const steering = useGameStore((s) => s.steeringMode)
  const { layout, handed } = useProfileStore((s) => s.controls)
  if (!showVirtualPad || layout === 'swipe' || status !== GameStatus.PLAYING) return null

  const free = steering === STEERING_MODES.FREE
  const holdHandlers = (press, release) => ({
    onPointerDown: (e) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture?.(e.pointerId)
      haptic(8)
      press()
    },
    onPointerUp: release,
    onPointerCancel: release,
    onLostPointerCapture: release,
    onContextMenu: (e) => e.preventDefault(),
  })
  const steer = (side, dir) => holdHandlers(
    () => (free ? setSteer(side, true) : queueLaneShift(dir)),
    () => setSteer(side, false),
  )

  return (
    <div className={`nv-touch-pad ${handed === 'left' ? 'nv-touch-pad--left' : ''}`} aria-label="Touch controls">
      <div className="nv-touch-cluster nv-touch-cluster--steer">
        <button className="nv-touch-btn" aria-label="Move left" {...steer('left', -1)}>◀</button>
        <button className="nv-touch-btn" aria-label="Move right" {...steer('right', 1)}>▶</button>
      </div>
      <div className="nv-touch-cluster nv-touch-cluster--action">
        <button className="nv-touch-btn nv-touch-btn--slide" aria-label="Slide" {...holdHandlers(pressSlide, releaseSlide)}>▼</button>
        <button className="nv-touch-btn nv-touch-btn--jump" aria-label="Jump" {...holdHandlers(pressJump, releaseJump)}>▲</button>
      </div>
    </div>
  )
}
