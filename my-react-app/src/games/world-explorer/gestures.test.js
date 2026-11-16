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

test('gestures: a tap or a flick up on the right half takes off and keeps flying; a flick down lands', () => {
  const { input, g } = rig()
  g.down(3, 300, 300, 0)
  g.up(3, 120) // a tap
  assert.equal(input.touchFly, true, 'a tap latches the flight, even after the finger lifts')
  g.down(4, 300, 300, 1000)
  g.move(4, 302, 360, 1100) // a flick down
  g.up(4, 1200)
  assert.equal(input.touchFly, false, 'a flick down lands')
  g.down(5, 300, 300, 2000)
  g.move(5, 302, 240, 2100) // a flick up
  g.up(5, 2300)
  assert.equal(input.touchFly, true)
  // a slow drag or a long press is neither
  g.down(6, 300, 300, 3000)
  g.move(6, 300, 360, 4000)
  g.up(6, 4100)
  assert.equal(input.touchFly, true, 'a slow drag down does not land')
  g.down(7, 300, 300, 5000)
  g.up(7, 5900)
  assert.equal(input.touchFly, true)
  g.cancel()
  assert.equal(input.touchFly, false, 'a dialog opening ends it')
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
  assert.deepEqual([input.touchX, input.touchY, input.touchTurn, input.touchFly], [0, 0, 0, false])
})

test('cruise: once flying it climbs to its height, holds it, and keeps its heading when the finger lets go', async () => {
  const { createPlayer, stepPlayer } = await import('../skyward-explorer/physics.js')
  const { BIOMES } = await import('./biomes/index.js')
  const { readExplorerControls, createCruise, CRUISE } = await import('./drive.js')
  const p = createPlayer(BIOMES.amazon.spawn)
  const input = createInputState()
  const cruise = createCruise()
  input.touchFly = true
  let yaw = 0, last = null
  const fly = (seconds) => {
    for (let i = 0; i < seconds * 60; i++) {
      const c = readExplorerControls(input, { active: true, yaw, lastJumps: last, dt: 1 / 60, cruise, body: p })
      yaw = c.yaw; last = c.lastJumps
      stepPlayer(p, c.step, 1 / 60, [])
    }
  }
  fly(4)
  assert.ok(Math.abs(p.pos[1] - CRUISE.ceiling) < 1, `holds its height (${p.pos[1]})`)
  const before = [...p.pos]
  fly(2) // nobody steering: it keeps going the way the camera looks
  const ahead = [p.pos[0] - before[0], p.pos[2] - before[2]]
  assert.ok(Math.hypot(...ahead) > 6, 'keeps flying with no input')
  assert.ok(Math.abs(p.pos[1] - before[1]) < 0.5, 'and holds its height')
  input.touchX = 1 // steer right: the heading changes
  fly(1)
  input.touchX = 0
  const turned = [p.pos[0], p.pos[2]]
  fly(2)
  const after = [p.pos[0] - turned[0], p.pos[2] - turned[1]]
  const cos = (ahead[0] * after[0] + ahead[1] * after[1]) / (Math.hypot(...ahead) * Math.hypot(...after))
  assert.ok(cos < 0.95, 'it now heads the new way')
  assert.ok(Math.hypot(...after) > 6, 'and keeps going that way')
  // landing: a flick down ends it, and it comes down
  input.touchFly = false
  fly(8)
  assert.ok(p.pos[1] < CRUISE.ceiling - 5, 'it comes down once the flight ends')
  // and a dialog opening ends it
  input.touchFly = true
  readExplorerControls(input, { active: false, yaw, lastJumps: last, dt: 1 / 60, cruise, body: p })
  assert.equal(input.touchFly, false)
})
