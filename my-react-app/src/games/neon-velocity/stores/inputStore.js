/**
 * Non-reactive input buffer.
 * Keyboard, swipe and on-screen buttons write here; PlayerPhysics reads and
 * consumes it inside useFrame. Nothing here triggers a React render.
 */
export const input = {
  left: false,          // held — free steering
  right: false,
  laneShift: 0,         // queued lane changes (−1 / +1)

  jumpPressed: false,   // edge: a new press waiting to be consumed (buffered)
  jumpPressTime: 0,     // seconds (performance.now) — for the jump buffer
  jumpHeld: false,      // held — variable jump height + glide
  jumpReleased: false,  // edge: released this frame — jump cut

  slidePressed: false,  // edge: slide on ground / slam in air
  slideHeld: false,     // held — landing while held goes straight into a slide

}

const now = () => performance.now() / 1000

export const queueLaneShift = (dir) => {
  input.laneShift = Math.max(-2, Math.min(2, input.laneShift + dir))
}
export const setSteer = (side, held) => { input[side] = held }

export const pressJump = () => {
  if (!input.jumpHeld) {
    input.jumpPressed = true
    input.jumpPressTime = now()
  }
  input.jumpHeld = true
}
export const releaseJump = () => {
  if (input.jumpHeld) input.jumpReleased = true
  input.jumpHeld = false
}

export const pressSlide = () => {
  if (!input.slideHeld) input.slidePressed = true
  input.slideHeld = true
}
export const releaseSlide = () => { input.slideHeld = false }

export const resetInput = () => {
  Object.assign(input, {
    left: false, right: false, laneShift: 0,
    jumpPressed: false, jumpPressTime: 0, jumpHeld: false, jumpReleased: false,
    slidePressed: false, slideHeld: false,
  })
}
