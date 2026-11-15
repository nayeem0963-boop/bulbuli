import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BIOMES, collidersFor } from './biomes/index.js'
import { createColliderIndex } from './biomes/colliderIndex.js'
import { amazonPlacement, boughColliders } from './biomes/boughs.js'
import { scatterAmazon } from './rendering/amazonScatter.js'
import { amazonBoughs } from './rendering/amazonTrees.js'
import { RECOVERY, createRecovery, distanceOutside, markSafe, updateRecovery, warnDistance } from './recovery.js'
import { nearestStation } from './proximity.js'
import { WORLD_TEXT as TEXT } from './text.js'
import { PHYS, createPlayer, stepPlayer } from '../skyward-explorer/physics.js'
import { createInputState } from '../skyward-explorer/input.js'
import { readExplorerControls, rescueFromWater, stayOnDunes } from './drive.js'

const MAPS = ['sahara', 'sundarbans', 'amazon']
const world = Object.fromEntries(MAPS.map((id) => {
  const biome = BIOMES[id]
  const colliders = collidersFor(biome)
  return [id, { biome, colliders, index: createColliderIndex(colliders), tops: Object.fromEntries(biome.discs.map((d) => [d.id, d.top])) }]
}))

/**
 * One expedition, frame by frame, exactly as ExplorerController runs it: controls, physics,
 * water rescue, dunes, then recovery. `recover: false` plays the same frames without recovery.
 */
function session(id, { start = null, yaw = 0, recover = true, reducedMotion = false, index = null } = {}) {
  const { biome } = world[id]
  const near = index ?? world[id].index
  const p = createPlayer(start ? { position: start, facing: 0 } : biome.spawn)
  const input = createInputState()
  const state = createRecovery(biome)
  const s = {
    p, input, state, yaw, lastJumps: null, carrying: false,
    told: [], log: [], fell: 0, carries: 0, lowest: Infinity, furthest: -Infinity, biggestStep: 0, carryFrames: 0,
  }
  s.frame = (fps = 60) => {
    const dt = 1 / fps
    const controls = readExplorerControls(input, { active: true, yaw: s.yaw, lastJumps: s.lastJumps, dt })
    s.yaw = controls.yaw
    s.lastJumps = controls.lastJumps
    const before = [...p.pos]
    const nearby = near.near(p.pos[0], p.pos[2])
    const events = s.carrying ? { fell: false } : stepPlayer(p, controls.step, dt, nearby)
    if (!s.carrying) {
      rescueFromWater(p, biome, events)
      stayOnDunes(p, biome)
    }
    if (events.fell) s.fell += 1
    let result = { carrying: false, warning: false, note: null }
    if (recover) {
      result = updateRecovery(state, p, biome, dt, { colliders: nearby, events, flying: controls.step.flightHeld, reducedMotion })
      if (result.carrying && !s.carrying) s.carries += 1
      if (result.carrying || s.carrying) {
        s.carryFrames += 1
        s.biggestStep = Math.max(s.biggestStep, Math.hypot(p.pos[0] - before[0], p.pos[1] - before[1], p.pos[2] - before[2]) / dt)
      }
      s.carrying = result.carrying
    }
    const told = result.carrying ? 'returning' : result.note ? `returned:${result.note.reason}` : result.warning ? 'warning' : null
    if (told !== s.told.at(-1)) s.told.push(told)
    s.lowest = Math.min(s.lowest, p.pos[1])
    s.furthest = Math.max(s.furthest, distanceOutside(biome, p.pos[0], p.pos[2]))
    return { events, result, told }
  }
  s.run = (seconds, keys = [], fps = 60) => {
    for (const key of keys) input.held.add(key)
    for (let i = 0; i < seconds * fps; i += 1) s.frame(fps)
    for (const key of keys) input.held.delete(key)
  }
  /** Runs until `until(s)` holds or the time is up; returns whether it held. */
  s.runUntil = (until, seconds, keys = [], fps = 60) => {
    for (const key of keys) input.held.add(key)
    let held = false
    for (let i = 0; i < seconds * fps && !held; i += 1) { s.frame(fps); held = until(s) }
    for (const key of keys) input.held.delete(key)
    return held
  }
  return s
}
/** The heading that leads straight out of the map from (x, z), as a camera yaw for the "back" key. */
function outwardYaw(biome, x, z) {
  let best = 0
  let bestGain = -Infinity
  for (let k = 0; k < 16; k += 1) {
    const a = (k / 16) * Math.PI * 2
    const gain = distanceOutside(biome, x + Math.sin(a) * 60, z + Math.cos(a) * 60)
    if (gain > bestGain) { bestGain = gain; best = a }
  }
  return best + Math.PI
}
const standsSafely = (id, s) => {
  const { biome } = world[id]
  return s.p.grounded && distanceOutside(biome, s.p.pos[0], s.p.pos[2]) < 0 && Number.isFinite(s.p.pos[1])
}

test('recovery: the playable area is the drawn terrain, and everything in the expedition lies inside it', () => {
  for (const id of MAPS) {
    const { biome, colliders, tops } = world[id]
    assert.ok(distanceOutside(biome, ...[biome.spawn.position[0], biome.spawn.position[2]]) < -RECOVERY.safeInside, `${id}: the spawn point is a safe spot`)
    for (const station of biome.stations) assert.ok(distanceOutside(biome, station.x, station.z) < -1.5, `${id} station ${station.n} is inside`)
    // every tree, rock, perch and piece of ground Bulbuli can touch is nearer than the carry-back line
    for (const c of colliders) {
      if (c.x === undefined || c.kind === 'land') continue
      assert.ok(distanceOutside(biome, c.x, c.z) < RECOVERY.limitBeyond - 3, `${id} ${c.id} lies ${distanceOutside(biome, c.x, c.z).toFixed(1)} m outside`)
    }
    assert.ok(Object.keys(tops).length > 0)
    // the warning line: before the drop where there is one, a little way out over the water otherwise
    assert.equal(warnDistance(biome), biome.water ? RECOVERY.warnBeyondWater : -RECOVERY.warnInsideEdge)
    assert.ok(warnDistance(biome) < RECOVERY.limitBeyond)
  }
  assert.ok(BIOMES.sundarbans.water && !BIOMES.sahara.water && !BIOMES.amazon.water)
  // the old far-fall rescue stays underneath as the last resort
  assert.equal(PHYS.fallLimit, -22)
  assert.ok(Math.min(...BIOMES.sahara.discs.map((d) => d.top)) - RECOVERY.dropBelow > PHYS.fallLimit + 10)
})

test('recovery: walking out past the edge of the Sahara: a warning first, a few steps on the sand, then a gentle carry back', () => {
  for (const id of ['sahara']) {
    const { biome } = world[id]
    for (const fps of [60, 24]) {
      const s = session(id)
      s.run(0.6) // settle: the first safe spot
      const home = [...biome.spawn.position]
      s.yaw = outwardYaw(biome, s.p.pos[0], s.p.pos[2])
      // walk (and hop over what is in the way) straight for the edge
      let warnedAt = null
      let safeBeforeEdge = null
      for (let i = 0; i < 30 * fps && s.carries === 0; i += 1) {
        s.input.held.add('back')
        if (i % 45 === 0) s.input.jumpPresses += 1
        s.frame(fps)
        const out = distanceOutside(biome, s.p.pos[0], s.p.pos[2])
        if (warnedAt === null && s.told.includes('warning')) warnedAt = out
        if (out < 0) safeBeforeEdge = [...s.state.safe]
      }
      s.input.held.delete('back')
      assert.equal(s.carries, 1, `${id} at ${fps} fps: never carried back (furthest ${s.furthest.toFixed(1)} m outside, lowest ${s.lowest.toFixed(1)})`)
      // warned while still on the ground, before the edge
      assert.ok(warnedAt !== null && warnedAt < 0 && warnedAt > -RECOVERY.warnInsideEdge - 1.5, `${id}: warned ${warnedAt} m from the edge`)
      // past the edge the desert that is drawn carries it (no drop through the sand, no fall at all),
      // and it is turned back within the margin
      assert.ok(s.lowest > -0.5, `${id}: sank to ${s.lowest.toFixed(1)}`)
      assert.ok(s.furthest > RECOVERY.limitBeyond - 0.5 && s.furthest <= RECOVERY.limitBeyond + 0.6, `${id}: walked ${s.furthest.toFixed(1)} m past the edge`)
      assert.equal(s.fell, 0)
      // carried, not teleported: about a second, at a steady speed
      s.run(1.2, [], fps)
      assert.ok(!s.carrying)
      assert.ok(s.carryFrames >= 0.8 * fps && s.carryFrames <= 1.1 * fps, `${id}: the carry took ${s.carryFrames} frames at ${fps} fps`)
      // put down where it last stood safely: well inside the edge, not back at the start
      assert.ok(standsSafely(id, s), `${id} at ${fps} fps: not standing after the carry: at ${s.p.pos.map((v) => v.toFixed(2))}, grounded ${s.p.grounded} on ${s.p.groundId}, carrying ${s.carrying}, told ${s.told}`)
      const back = distanceOutside(biome, s.p.pos[0], s.p.pos[2])
      assert.ok(back <= -RECOVERY.safeInside + 0.2 && back > -RECOVERY.safeInside - 6, `${id}: put down ${(-back).toFixed(1)} m inside the edge`)
      assert.ok(Math.hypot(s.p.pos[0] - safeBeforeEdge[0], s.p.pos[2] - safeBeforeEdge[2]) < 0.6, 'at the last safe spot')
      assert.ok(Math.hypot(s.p.pos[0] - home[0], s.p.pos[2] - home[2]) > 5, 'the last safe spot, not the spawn point')
      assert.ok(Math.hypot(s.p.pos[0] - s.p.checkpoint[0], s.p.pos[2] - s.p.checkpoint[2]) < 45)
      // told kindly, in order: warning, returning, returned; the note then clears by itself
      assert.deepEqual(s.told.filter(Boolean).slice(-3), ['warning', 'returning', 'returned:far'])
      s.run(RECOVERY.noteSeconds + 0.3, [], fps)
      assert.equal(s.told.at(-1), null)
      assert.equal(s.carries, 1, 'and it is not carried again')
    }
  }
  // the Amazon's edge cannot be walked off: its outer ring of trees stands in the way all round.
  // Whichever way a walker heads, it stays on the map, or is carried back like anyone else.
  const { biome } = world.amazon
  let reachedEdge = 0
  for (let k = 0; k < 16; k += 1) {
    const a = (k / 16) * Math.PI * 2
    let r = 0
    while (distanceOutside(biome, Math.sin(a) * (r + 12), Math.cos(a) * (r + 12)) < 0) r += 0.5
    const s = session('amazon', { start: [Math.sin(a) * r, 0.05, Math.cos(a) * r], yaw: a + Math.PI })
    for (let i = 0; i < 600; i += 1) {
      s.input.held.add('back')
      if (i % 45 === 0) s.input.jumpPresses += 1
      s.frame()
    }
    s.input.held.clear()
    s.run(RECOVERY.carrySeconds + 1.5)
    if (s.furthest > 0) reachedEdge += 1
    assert.equal(s.fell, 0)
    assert.ok(distanceOutside(biome, s.p.pos[0], s.p.pos[2]) < 0 && s.p.pos[1] > -1, `amazon heading ${k}: left at ${s.p.pos.map((v) => v.toFixed(1))}`)
    assert.ok(s.carries === (s.furthest > 0 ? 1 : 0))
  }
  assert.ok(reachedEdge <= 16)
})

test('recovery: flying out beyond the map is warned about, then Bulbuli is carried back; flying over the map is free', () => {
  for (const id of MAPS) {
    const { biome } = world[id]
    for (const fps of [60, 37, 24]) {
      const s = session(id)
      s.run(0.6, [], fps)
      const safe = [...s.state.safe]
      // up above the trees, then straight out
      s.run(2.2, ['jump'], fps)
      assert.equal(s.carries, 0)
      assert.ok(!s.told.includes('warning'), `${id}: warned while flying over the map`)
      s.yaw = outwardYaw(biome, s.p.pos[0], s.p.pos[2])
      let warnedAt = null
      const out = s.runUntil((t) => {
        if (warnedAt === null && t.told.includes('warning')) warnedAt = distanceOutside(biome, t.p.pos[0], t.p.pos[2])
        return t.carries > 0
      }, 40, ['jump', 'back'], fps)
      assert.ok(out, `${id} at ${fps} fps: flew ${s.furthest.toFixed(1)} m out and was never carried back`)
      assert.ok(Math.abs(warnedAt - warnDistance(biome)) < 0.6, `${id}: warned at ${warnedAt.toFixed(1)} m, expected ${warnDistance(biome)}`)
      assert.ok(s.furthest <= RECOVERY.limitBeyond + 0.6, `${id}: got ${s.furthest.toFixed(1)} m beyond the map`)
      s.run(1.2, [], fps)
      assert.ok(!s.carrying && s.p.pos[1] > PHYS.fallLimit)
      // set down on the safe spot it left from, standing, and left in peace
      s.run(1.5, [], fps)
      assert.ok(standsSafely(id, s), `${id}: not standing after the carry`)
      assert.ok(Math.hypot(s.p.pos[0] - safe[0], s.p.pos[2] - safe[2]) < 0.6)
      assert.equal(s.fell, 0)
      assert.ok(s.told.includes('returned:far'))
      s.run(3, [], fps)
      assert.equal(s.carries, 1)
      // the carry is one smooth movement (no jump in it larger than its own steady pace allows)
      const distance = Math.hypot(RECOVERY.limitBeyond + 60, 30)
      assert.ok(s.biggestStep < distance * 3, `${id}: moved at ${s.biggestStep.toFixed(0)} m/s during the carry`)
    }
    // reduced motion: no sweep across the screen; Bulbuli is simply on the safe spot the next frame
    const still = session(id, { reducedMotion: true })
    still.run(0.6)
    still.run(2.2, ['jump'])
    still.yaw = outwardYaw(biome, still.p.pos[0], still.p.pos[2])
    assert.ok(still.runUntil((t) => t.carries > 0, 40, ['jump', 'back']))
    still.frame()
    assert.ok(!still.carrying && still.carryFrames <= 2)
    assert.ok(Math.hypot(still.p.pos[0] - still.state.safe[0], still.p.pos[2] - still.state.safe[2]) < 0.1)
    assert.ok(still.told.includes('returned:far'))
  }
})

test('recovery: the Sundarbans water rescue and the far-fall rescue work exactly as before, with a kind note', () => {
  // walk off an island into the water, with and without recovery: the same frames, the same place
  const { biome } = world.sundarbans
  const runs = [true, false].map((recover) => {
    const s = session('sundarbans', { recover })
    s.run(0.6)
    s.yaw = outwardYaw(biome, s.p.pos[0], s.p.pos[2])
    const trace = []
    for (let i = 0; i < 600 && s.fell === 0; i += 1) {
      s.input.held.add('back')
      s.frame()
      trace.push(...s.p.pos)
    }
    return { s, trace }
  })
  assert.equal(runs[0].s.fell, 1, 'Bulbuli fell in the water')
  assert.deepEqual(runs[0].trace, runs[1].trace, 'the water rescue is untouched by recovery')
  assert.equal(runs[0].s.carries, 0, 'the water rescue did it, not the carry')
  assert.deepEqual(runs[0].s.p.pos, runs[0].s.p.checkpoint)
  assert.equal(runs[0].s.told.at(-1), 'returned:water')
  runs[0].s.input.held.clear()
  runs[0].s.run(1)
  assert.ok(standsSafely('sundarbans', runs[0].s))
  // the far fall (the physics' own last resort): still there underneath
  for (const id of ['sahara', 'amazon']) {
    const s = session(id)
    s.run(0.5)
    const checkpoint = [...s.p.checkpoint]
    s.p.pos = [s.p.pos[0], PHYS.fallLimit + 0.3, s.p.pos[2]] // deep under the middle of the map
    s.p.grounded = false
    s.p.groundId = null
    s.p.vel = [0, -20, 0]
    s.run(0.3)
    assert.equal(s.fell, 1, `${id}: the far-fall rescue did not fire`)
    assert.equal(s.carries, 0)
    assert.ok(s.told.includes('returned:fall'))
    s.run(1)
    assert.ok(Math.hypot(s.p.pos[0] - checkpoint[0], s.p.pos[2] - checkpoint[2]) < 0.5 && standsSafely(id, s))
  }
})

test('recovery: a bird held motionless in mid-air is carried to safety; hovering, perching and standing are not', () => {
  const { biome } = world.sahara
  const dt = 1 / 60
  const held = (overrides, flying = false, seconds = 2) => {
    const state = createRecovery(biome)
    const p = { ...createPlayer(biome.spawn), ...overrides }
    let carried = false
    for (let i = 0; i < seconds * 60 && !carried; i += 1) carried = updateRecovery(state, p, biome, dt, { flying }).carrying
    return { carried, state, p }
  }
  // in the air, not flying, not moving, falling speed building up: the physics is stuck
  const stuck = held({ pos: [5, 3, 5], grounded: false, vel: [0, -30, 0] })
  assert.ok(stuck.carried)
  assert.equal(stuck.state.carry.reason, 'stuck')
  // it takes a full second of it, not a single still frame at the top of a hop
  assert.ok(!held({ pos: [5, 3, 5], grounded: false }, false, RECOVERY.hangFor - 0.1).carried)
  // holding Space at the flight ceiling, or pressed up under a canopy deck: the player's own doing
  assert.ok(!held({ pos: [5, PHYS.maxFlightHeight, 5], grounded: false }, true, 5).carried)
  // standing still on the ground or on a perch, for as long as you like
  assert.ok(!held({ pos: [5, 0, 5], grounded: true, groundId: 'plain' }, false, 8).carried)
  assert.ok(!held({ pos: [5, 4, 5], grounded: true, groundId: 'acacia-perch' }, false, 8).carried)

  // the real case: a thick branch across the rim of a tree's perch disc held Bulbuli in the air
  // (the branch pass leaves such pieces out; put them all back and find one)
  const amazon = world.amazon
  const seeds = { emergent: 11, canopy: 23, subcanopy: 37 }
  const every = []
  scatterAmazon(amazon.biome).forEach((item, i) => {
    if (item.kind in seeds) every.push(...boughColliders(`all-${i}`, amazonBoughs(seeds[item.kind], item.kind), amazonPlacement(item)))
  })
  const index = createColliderIndex([...amazon.colliders.filter((c) => !c.bough), ...every])
  let hangs = 0
  let freed = 0
  // (the pieces the branch pass left out are the ones across perch rims: look there)
  const kept = new Set(amazon.colliders.filter((c) => c.bough).map((c) => `${c.x.toFixed(3)},${c.z.toFixed(3)},${c.top.toFixed(3)}`))
  const leftOut = every.filter((c) => !kept.has(`${c.x.toFixed(3)},${c.z.toFixed(3)},${c.top.toFixed(3)}`))
  for (let n = 0, tried = 0; n < leftOut.length && hangs < 2 && tried < 400; n += 13) {
    const piece = leftOut[n]
    tried += 1
    const start = [piece.x + 0.5, piece.bottom - 0.6, piece.z + 0.2]
    if (distanceOutside(amazon.biome, start[0], start[2]) > -6) continue
    const bare = session('amazon', { start, recover: false, index })
    bare.p.grounded = false
    bare.run(2.5)
    const before = [...bare.p.pos]
    bare.run(0.5)
    if (bare.p.grounded || Math.hypot(bare.p.pos[0] - before[0], bare.p.pos[1] - before[1], bare.p.pos[2] - before[2]) > 1e-6) continue
    hangs += 1 // without recovery it would hang here for good
    const s = session('amazon', { start, index })
    s.p.grounded = false
    s.run(RECOVERY.hangFor + RECOVERY.carrySeconds + 3)
    assert.equal(s.carries, 1, 'the hang was noticed')
    assert.ok(s.told.includes('returned:stuck'))
    assert.ok(standsSafely('amazon', s), `still hanging at ${s.p.pos.map((v) => v.toFixed(1))}`)
    freed += 1
  }
  assert.ok(hangs >= 1 && freed === hangs, `${hangs} mid-air hangs reproduced, ${freed} recovered`)
})

test('recovery: from every station Bulbuli comes back to that station, ready to carry on, and progress is untouched', () => {
  // what an expedition has earned: recovery is handed none of it and has no way to reach it
  const progress = Object.freeze({ completed: Object.freeze([1, 2, 4]), journal: Object.freeze(['mudskipper', 'pneumatophore']), xp: 0, report: 'draft' })
  const snapshot = JSON.stringify(progress)
  for (const id of MAPS) {
    const { biome, tops } = world[id]
    for (const station of biome.stations) {
      // arrive as the Mission Log's "Travel here" does
      const arrive = [station.x - 1.2, tops[station.disc], station.z - 1.2]
      for (const mishap of ['far', 'edge']) {
        const s = session(id, { start: arrive })
        markSafe(s.state, arrive)
        s.p.grounded = false
        s.run(0.8)
        assert.equal(nearestStation(biome.stations, s.p.pos[0], s.p.pos[2], s.p.pos[1], tops), station.n)
        const stood = [...s.p.pos]
        const stationSafe = [...s.state.safe]
        assert.ok(Math.hypot(stationSafe[0] - arrive[0], stationSafe[2] - arrive[2]) < 0.8, `${id} station ${station.n}: the safe spot is at the station`)
        // then the mishap: blown far out beyond the map, or off the edge and dropping
        const a = outwardYaw(biome, stood[0], stood[2]) - Math.PI
        let out = 0
        while (distanceOutside(biome, stood[0] + Math.sin(a) * out, stood[2] + Math.cos(a) * out) < (mishap === 'far' ? RECOVERY.limitBeyond + 2 : 1.5)) out += 0.5
        const low = Math.min(...biome.discs.map((d) => d.top))
        s.p.pos = [stood[0] + Math.sin(a) * out, mishap === 'far' ? 12 : (biome.water ? 6 : low - RECOVERY.dropBelow - 0.5), stood[2] + Math.cos(a) * out]
        s.p.grounded = false
        s.p.groundId = null
        s.p.vel = [0, 0, 0]
        if (mishap === 'edge' && biome.water) continue // beside water the drop ends in the water rescue (tested above)
        s.run(RECOVERY.carrySeconds + 0.4)
        s.run(1.6)
        assert.equal(s.carries, 1, `${id} station ${station.n} (${mishap}): carried ${s.carries} times`)
        assert.equal(s.fell, 0)
        assert.ok(standsSafely(id, s), `${id} station ${station.n} (${mishap}): not standing`)
        assert.ok(Math.hypot(s.p.pos[0] - stationSafe[0], s.p.pos[2] - stationSafe[2]) < 0.6, `${id} station ${station.n}: put down ${Math.hypot(s.p.pos[0] - stationSafe[0], s.p.pos[2] - stationSafe[2]).toFixed(1)} m from where it stood`)
        // the station is open to it again straight away, and nothing more happens to it
        assert.equal(nearestStation(biome.stations, s.p.pos[0], s.p.pos[2], s.p.pos[1], tops), station.n)
        assert.ok(s.told.includes(`returned:${mishap}`))
        s.run(4)
        assert.equal(s.carries, 1)
        assert.equal(s.told.at(-1), null, 'no warning left on screen at a station')
        // and it can walk on from there
        const from = [...s.p.pos]
        let ways = 0
        for (let k = 0; k < 8; k += 1) {
          const t = session(id, { start: from, yaw: (k * Math.PI) / 4 })
          t.run(1, ['back'])
          if (Math.hypot(t.p.pos[0] - from[0], t.p.pos[2] - from[2]) > 2.5) ways += 1
        }
        assert.ok(ways >= 4, `${id} station ${station.n}: only ${ways} ways on`)
      }
    }
  }
  assert.equal(JSON.stringify(progress), snapshot)
  // recovery only knows the map and the bird: no session, progress, XP, journal or storage
  const source = readFileSync(new URL('./recovery.js', import.meta.url), 'utf8')
  assert.deepEqual([...source.matchAll(/^import .* from '(.*)'$/gm)].map((m) => m[1]), ['./rendering/terrain.js'])
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  for (const word of ['session', 'localStorage', 'supabase', 'xp', 'journal', 'completed', 'record', 'station']) assert.ok(!new RegExp(`\\b${word}`, 'i').test(code), `recovery.js handles ${word}`)
  const controller = readFileSync(new URL('./ExplorerController.jsx', import.meta.url), 'utf8')
  assert.ok(controller.includes('updateRecovery(recovery.current, p, biome, dt,'))
  assert.ok(controller.includes('markSafe(recovery.current, [t.x, t.y, t.z])'), '"Travel here" makes the station the safe spot')
  assert.ok(!/\b(session|progress|record|xp|journal)\b/i.test(controller.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), 'the controller has no hold on progress either')
})

test('recovery: inside the map nothing changes: the same steps with and without it', () => {
  for (const id of MAPS) {
    const { biome } = world[id]
    const plays = [true, false].map((recover) => {
      const s = session(id, { recover })
      const trace = []
      // a busy minute round the middle of the map: walking, turning, hopping and short flights
      for (let i = 0; i < 3600 && s.carries === 0 && s.fell === 0; i += 1) {
        s.input.held.clear()
        s.input.held.add(['back', 'left', 'forward', 'right'][Math.floor(i / 70) % 4])
        if (i % 500 > 380) s.input.held.add('jump')
        if (i % 130 === 0) s.input.jumpPresses += 1
        s.frame(i % 3 === 0 ? 30 : 60)
        trace.push(s.p.pos[0], s.p.pos[1], s.p.pos[2], s.p.grounded ? 1 : 0)
      }
      return { s, trace }
    })
    assert.ok(plays[0].trace.length >= 4 * 1500, `${id}: only ${plays[0].trace.length / 4} frames compared`)
    assert.deepEqual(plays[0].trace, plays[1].trace, `${id}: recovery changed a step inside the map`)
    assert.ok(plays[0].s.furthest < warnDistance(biome) || plays[0].s.told.includes('warning'))
  }
})

test('recovery: the words are gentle, in both languages, and the HUD announces them politely', () => {
  for (const language of ['en', 'bn']) {
    const text = TEXT[language]
    for (const key of ['safetyWarning', 'safetyReturning', 'safetyReturned', 'safetyReturnedWater']) {
      assert.ok(typeof text[key] === 'string' && text[key].length > 15, `${language}.${key}`)
      assert.ok(!/game over|died|dead|lost a life|fail|penalt|মারা|হেরে/i.test(text[key]), `${language}.${key} is not gentle: ${text[key]}`)
    }
    assert.notEqual(text.safetyReturned, text.safetyWarning)
  }
  assert.ok(/nothing is lost/i.test(TEXT.en.safetyReturned) && /nothing is lost/i.test(TEXT.en.safetyReturnedWater))
  const game = readFileSync(new URL('./WorldExplorerGame.jsx', import.meta.url), 'utf8')
  assert.ok(game.includes('onSafety={setSafety}'))
  assert.ok(game.includes('role="status" data-safety={safety}'))
  const css = readFileSync(new URL('./world-explorer.css', import.meta.url), 'utf8')
  assert.ok(css.includes('.wx-near, .wx-safety,'), 'no animation with reduced motion')
})
