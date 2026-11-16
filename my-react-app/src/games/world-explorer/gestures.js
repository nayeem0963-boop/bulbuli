/**
 * Touch gestures for World Explorer, without React: turns finger movements into the shared input
 * object (skyward-explorer/input.js), the same object the keyboard and the on-screen buttons write.
 *
 *   drag on the left half     a floating stick: it appears under the thumb, wherever it lands. Drag
 *                             towards where Bulbuli should go (up = ahead, relative to the camera);
 *                             the further the drag, the faster, up to full speed at STICK_RADIUS.
 *   drag on the right half    turns the camera: sideways, further = faster
 *   tap or flick up on the right   take off and keep flying: it climbs, then cruises on its own, on the
 *                             way it was last steered, until you flick down to land (drive.js CRUISE)
 *   flick down on the right   stop flying (it glides down, then lands)
 *
 * Each half follows its own finger, so a thumb on each side works together. A stick or a turn
 * "drags" its anchor along when the finger goes past its radius, so changing direction is quick.
 */
export const STICK_RADIUS = 56 // px of drag for full speed
export const DEAD_ZONE = 8 // px before anything moves
export const TAP_MS = 260
export const TAP_SLOP = 12 // px
export const FLICK_PX = 36 // px of upward travel
export const FLICK_MS = 420

const clamp = (v) => Math.max(-1, Math.min(1, v))

/** A drag's push (-1..1 on each axis) from its anchor, with a dead zone and a soft start. */
export function pushFrom(dx, dy) {
  const d = Math.hypot(dx, dy)
  if (d <= DEAD_ZONE) return { x: 0, y: 0, d }
  const strength = Math.min(1, (d - DEAD_ZONE) / (STICK_RADIUS - DEAD_ZONE))
  const eased = strength * strength * (3 - 2 * strength) * 0.35 + strength * 0.65
  return { x: (dx / d) * eased, y: (dy / d) * eased, d }
}

/**
 * @param input  the shared input object (inputRef.current)
 * @param width  () => the touch area's width in px (the halves are split at half of it)
 * @param hooks  { onChange(view) } optional: tells the overlay what to draw
 */
export function createGestures(input, width, hooks = {}) {
  const touches = new Map() // pointerId -> { role, ox, oy, x, y, t0, x0, y0, jumped }
  const draw = () => {
    const view = { move: null, look: null }
    for (const t of touches.values()) view[t.role] = { ox: t.ox, oy: t.oy, x: t.x, y: t.y }
    hooks.onChange?.(view)
  }
  const roles = () => [...touches.values()].map((t) => t.role)

  function apply() {
    let moveX = 0, moveY = 0, turn = 0
    for (const t of touches.values()) {
      const push = pushFrom(t.x - t.ox, t.y - t.oy)
      if (t.role === 'move') { moveX = push.x; moveY = -push.y } else turn = push.x
    }
    input.touchX = clamp(moveX) + 0 // (+ 0 keeps a negative zero out)
    input.touchY = clamp(moveY) + 0
    input.touchTurn = clamp(turn) + 0
  }

  return {
    down(id, x, y, now) {
      if (touches.has(id)) return
      const role = x < width() / 2 ? 'move' : 'look'
      if (roles().includes(role)) return // one finger for each side
      touches.set(id, { role, ox: x, oy: y, x, y, t0: now, x0: x, y0: y, jumped: false })
      draw()
    },
    move(id, x, y, now) {
      const t = touches.get(id)
      if (!t) return
      t.x = x
      t.y = y
      // past the radius the anchor follows the finger, so the stick is always one radius from it
      const dx = x - t.ox, dy = y - t.oy
      const d = Math.hypot(dx, dy)
      if (d > STICK_RADIUS) {
        t.ox = x - (dx / d) * STICK_RADIUS
        t.oy = y - (dy / d) * STICK_RADIUS
      }
      if (t.role === 'look' && !t.jumped && now - t.t0 < FLICK_MS && Math.abs(x - t.x0) < Math.abs(y - t.y0)) {
        if (t.y0 - y > FLICK_PX) { t.jumped = true; input.touchFly = true } // flick up: fly
        else if (y - t.y0 > FLICK_PX) { t.jumped = true; input.touchFly = false } // flick down: land
      }
      apply()
      draw()
    },
    up(id, now) {
      const t = touches.get(id)
      if (!t) return
      touches.delete(id)
      if (t.role === 'look' && !t.jumped && now - t.t0 < TAP_MS && Math.hypot(t.x - t.x0, t.y - t.y0) < TAP_SLOP) {
        input.touchFly = true // a tap: take off and keep flying
      }
      apply()
      draw()
    },
    /** Lets go of everything (a dialog opened, or the page lost focus). */
    cancel() {
      touches.clear()
      input.touchFly = false
      input.touchX = 0
      input.touchY = 0
      input.touchTurn = 0
      draw()
    },
  }
}
