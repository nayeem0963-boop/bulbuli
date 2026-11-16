import test from 'node:test'
import assert from 'node:assert/strict'
import { createInputState, readStick } from '../skyward-explorer/input.js'
import { turnOf as cameraTurn } from './drive.js'
import { createGestures, pushFrom, STICK_RADIUS, DEAD_ZONE } from './gestures.js'

const rig = () => {
  const input = createInputState()
  const taps = []
  const g = createGestures(input, () => 400, { afterTap: (release) => taps.push(release) })
  return { input, g, taps }
}

test('gestures: a drag on the left half is a floating stick, relative to where the finger landed', () => {
  const { input, g } = rig()
  g.down(1, 100, 300, 0)
  g.move(1, 103, 298, 10) // inside the dead zone: still
  assert.deepEqual([input.touchX, input.touchY], [0, 0])
  g.move(1, 100, 300 - STICK_RADIUS, 20) // straight up, full push: ahead
  assert.ok(Math.abs(input.touchY - 1) < 1e-9 && Math.abs(input.touchX) < 1e-9)
  g.move(1, 100 + STICK_RADIUS, 300, 30) // the anchor follows past the radius; right is full right
  assert.ok(input.touchX > 0.9)
  g.move(1, 100 + STICK_RADIUS * 3, 300, 40)
  assert.ok(Math.hypot(input.touchX, input.touchY) <= 1.0000001, 'never more than full speed')
  g.move(1, 100 + STICK_RADIUS * 3 - STICK_RADIUS, 300, 50) // back one radius = the anchor: still, then reversing is quick
  assert.ok(Math.abs(input.touchX) < 1e-6 || input.touchX > 0)
  g.up(1, 60)
  assert.deepEqual([input.touchX, input.touchY, input.touchTurn], [0, 0, 0])
  assert.ok(readStick(input).forward === 0)
})

test('gestures: a soft start, a dead zone, and a stronger push the further the drag', () => {
  assert.equal(pushFrom(DEAD_ZONE, 0).x, 0)
  const light = pushFrom(20, 0).x, firm = pushFrom(40, 0).x, full = pushFrom(STICK_RADIUS, 0).x
  assert.ok(0 < light && light < firm && firm < full && Math.abs(full - 1) < 1e-9)
})

test('gestures: a swipe on the right half turns the camera; the keyboard still turns it too', () => {
  const { input, g } = rig()
  g.down(2, 300, 200, 0)
  g.move(2, 300 + STICK_RADIUS, 205, 20)
  assert.ok(cameraTurn(input) > 0.9 && input.touchX === 0)
  g.move(2, 300 - STICK_RADIUS * 2, 205, 40)
  assert.ok(cameraTurn(input) < -0.9)
  g.up(2, 60)
  assert.equal(cameraTurn(input), 0)
  input.held.add('turnLeft')
  assert.equal(cameraTurn(input), -1)
  input.touchTurn = -1
  assert.equal(cameraTurn(input), -1, 'never more than a full turn')
})

test('gestures: a tap or a quick flick up on the right half jumps; a held flick keeps flying', () => {
  const { input, g, taps } = rig()
  g.down(3, 300, 300, 0)
  g.up(3, 120)
  assert.equal(input.jumpPresses, 1)
  assert.equal(input.touchJump, true)
  taps[0]() // the overlay lets go a moment later
  assert.equal(input.touchJump, false)

  g.down(4, 300, 300, 1000)
  g.move(4, 302, 240, 1100) // a flick up
  assert.equal(input.jumpPresses, 2)
  assert.equal(input.touchJump, true, 'held while the finger is down')
  g.move(4, 302, 200, 1200)
  assert.equal(input.jumpPresses, 2, 'one jump per flick')
  g.up(4, 1400)
  assert.equal(input.touchJump, false)
  assert.equal(input.jumpPresses, 2)

  // a slow drag, or a long press, is not a jump
  g.down(5, 300, 300, 2000)
  g.move(5, 300, 220, 3000)
  g.up(5, 3100)
  assert.equal(input.jumpPresses, 2)
  g.down(6, 300, 300, 4000)
  g.up(6, 4900)
  assert.equal(input.jumpPresses, 2)
})

test('gestures: a thumb on each side works together; a third finger and a lost touch are handled', () => {
  const { input, g } = rig()
  g.down(1, 80, 300, 0)
  g.down(2, 320, 300, 0)
  g.down(3, 90, 320, 0) // a second finger on the same side is ignored
  g.move(3, 90, 200, 10)
  assert.equal(input.touchY, 0)
  g.move(1, 80, 300 - STICK_RADIUS, 20)
  g.move(2, 320 + STICK_RADIUS, 300, 20)
  assert.ok(input.touchY > 0.9 && input.touchTurn > 0.9)
  g.up(1, 100)
  assert.equal(input.touchY, 0)
  assert.ok(input.touchTurn > 0.9, 'the other thumb carries on')
  g.cancel()
  assert.deepEqual([input.touchX, input.touchY, input.touchTurn, input.touchJump], [0, 0, 0, false])
})
