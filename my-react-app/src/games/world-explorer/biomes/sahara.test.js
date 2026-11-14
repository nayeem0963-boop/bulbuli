import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { BIOMES, collidersFor } from './index.js'
import { DUNE, ROCK, ROCK_STEP, duneHeightAt, duneReach, rockContactRadius, rockHalfWidths, rockHeightAt, rockTopAt } from './sandShapes.js'
import { hasExpandedTerrainFootprint, terrainFootprintRadius, terrainHeightAt, terrainSeed } from '../rendering/terrain.js'
import { scatterBiomeAssets } from '../rendering/scattering.js'
import { createPlayer, stepPlayer } from '../../skyward-explorer/physics.js'
import { createInputState } from '../../skyward-explorer/input.js'
import { readExplorerControls, rescueFromWater, stayOnDunes } from '../drive.js'

const biome = BIOMES.sahara
const colliders = collidersFor(biome)
const dunes = biome.props.filter((p) => p.type === 'dune')
const rocks = biome.props.filter((p) => p.type === 'rock')
const DT = 1 / 60

/** The sand that is drawn at (x, z): the highest of the terrain pieces, dunes and large rocks there. */
function drawnTerrain(x, z) {
  let top = null
  for (const disc of biome.discs) {
    if (Math.hypot(x - disc.x, z - disc.z) > terrainFootprintRadius(disc)) continue
    const h = terrainHeightAt(disc, x, z, terrainSeed(disc, biome.id), biome.id)
    if (top === null || h > top) top = h
  }
  return top
}
function drawnSurface(x, z) {
  let top = drawnTerrain(x, z)
  if (top === null) return null
  for (const dune of dunes) top = Math.max(top, duneHeightAt(dune, x, z))
  for (const rock of rocks) top = Math.max(top, rockHeightAt(rock, x, z))
  return top
}
/** Distance to the nearest drawn cliff (the wall of a raised step). */
const cliffDistance = (x, z) => Math.min(...biome.discs.filter((d) => d.cliff).map((d) => Math.abs(Math.hypot(x - d.x, z - d.z) - terrainFootprintRadius(d))))

/** Plays the Sahara exactly as ExplorerController does, frame by frame. */
function play(start, yaw = 0) {
  const p = createPlayer({ position: start, facing: 0 })
  const input = createInputState()
  const s = { p, input, yaw, lastJumps: null, fell: 0, lowest: Infinity, worstSink: 0 }
  s.frame = () => {
    const controls = readExplorerControls(input, { active: true, yaw: s.yaw, lastJumps: s.lastJumps, dt: DT })
    s.yaw = controls.yaw
    s.lastJumps = controls.lastJumps
    const events = stepPlayer(p, controls.step, DT, colliders)
    rescueFromWater(p, biome, events)
    stayOnDunes(p, biome)
    if (events.fell) s.fell += 1
    const drawn = drawnSurface(p.pos[0], p.pos[2])
    if (drawn !== null && cliffDistance(p.pos[0], p.pos[2]) > 0.45) s.worstSink = Math.max(s.worstSink, drawn - p.pos[1])
    return events
  }
  s.run = (frames, keys = []) => {
    for (const key of keys) { if (key === 'jump') input.jumpPresses += 1; input.held.add(key) }
    for (let i = 0; i < frames; i += 1) s.frame()
    for (const key of keys) input.held.delete(key)
  }
  return s
}
/** Lets Bulbuli fall onto (x, z) and come to rest; returns where it ended. */
function dropAt(x, z) {
  const s = play([x, drawnSurface(x, z) + 1.2, z])
  s.p.grounded = false
  s.run(150)
  return s
}

test('sahara shapes: the drawn dunes and rocks and their colliders come from the same numbers', () => {
  const canvas = readFileSync(new URL('../ExpeditionCanvas.jsx', import.meta.url), 'utf8')
  assert.ok(canvas.includes('DUNE.halfLength') && canvas.includes('DUNE.height') && canvas.includes('DUNE.halfWidth') && canvas.includes('DUNE.sink'))
  assert.ok(canvas.includes('ROCK.radius') && canvas.includes('ROCK.stretch') && canvas.includes('ROCK.lift'))
  // the shapes are the ones the Sahara has always drawn
  assert.deepEqual({ ...DUNE }, { halfLength: 5, height: 1.6, halfWidth: 3.5, sink: 0.2 })
  assert.deepEqual({ ...ROCK }, { radius: 0.8, stretch: [1.2, 0.8, 1], lift: 0.4 })
  assert.equal(dunes.length, 4)
  assert.equal(rocks.length, 12)
  for (const dune of dunes) {
    assert.ok(Math.abs(duneHeightAt(dune, dune.x, dune.z) - (1.6 * dune.scale - 0.2)) < 1e-9, 'a dune is highest at its centre')
    assert.equal(duneHeightAt(dune, dune.x + duneReach(dune) + 0.01, dune.z), -Infinity)
    assert.ok(duneHeightAt(dune, dune.x + duneReach(dune) - 0.01, dune.z) < 0.1, 'its rim meets the sand')
  }
  for (const rock of rocks) {
    const [wide, narrow] = rockHalfWidths(rock)
    assert.ok(Math.abs(rockHeightAt(rock, rock.x, rock.z) - 1.04 * rock.scale) < 1e-9)
    assert.ok(rockContactRadius(rock) <= wide && rockContactRadius(rock) >= narrow, 'the contact circle lies between the rock\'s narrow and wide sides')
  }
})

test('sahara dunes: each of the four has a surface collider shaped like the dune', () => {
  const surfaces = colliders.filter((c) => c.id.startsWith('dune-'))
  assert.equal(surfaces.length, 4)
  assert.deepEqual(colliders.slice(0, 4).map((c) => c.id), ['dune-0', 'dune-1', 'dune-2', 'dune-3'], 'dunes are listed first, so a dune is the ground wherever it stands')
  surfaces.forEach((c, i) => {
    const dune = dunes[i]
    assert.ok(c.walkable && c.supportOnly, 'it carries Bulbuli and never pushes it sideways')
    assert.equal(c.r, duneReach(dune))
    assert.ok(Math.abs(c.heightAt(dune.x, dune.z) - duneHeightAt(dune, dune.x, dune.z)) < 1e-9)
    // inside the outline it is the dune or the sand under its rim, whichever is higher; outside, nothing
    for (let k = 0; k < 40; k += 1) {
      const a = (k / 40) * Math.PI * 2
      for (const t of [0.2, 0.5, 0.8, 0.97]) {
        const x = dune.x + Math.cos(a) * 5 * dune.scale * t
        const z = dune.z + Math.sin(a) * 3.5 * dune.scale * t
        const sand = drawnTerrain(x, z)
        if (sand === null) continue
        assert.ok(Math.abs(c.heightAt(x, z) - Math.max(sand, duneHeightAt(dune, x, z))) < 0.02 || cliffDistance(x, z) < 0.45, `dune ${i} surface at t=${t}`)
      }
      // beyond its outline it is the sand itself (always a finite height under a bird walking off)
      const ox = dune.x + Math.cos(a) * 5 * dune.scale * 0.99
      const oz = dune.z + Math.sin(a) * 5 * dune.scale * 0.99
      if (duneHeightAt(dune, ox, oz) === -Infinity && drawnTerrain(ox, oz) !== null && cliffDistance(ox, oz) > 0.45) assert.ok(Math.abs(c.heightAt(ox, oz) - drawnTerrain(ox, oz)) < 0.02)
    }
    // the whole dune stands on land Bulbuli can reach (so its surface is never the only floor over a void)
    for (let k = 0; k < 16; k += 1) {
      const a = (k / 16) * Math.PI * 2
      assert.notEqual(drawnTerrain(dune.x + Math.cos(a) * 5 * dune.scale, dune.z + Math.sin(a) * 3.5 * dune.scale), null)
    }
  })
})

test('sahara dunes: Bulbuli comes to rest on the sand that is drawn, all over every dune', () => {
  let checked = 0
  for (const dune of dunes) {
    for (let k = 0; k < 12; k += 1) {
      const a = (k / 12) * Math.PI * 2
      for (const t of k === 0 ? [0, 0.35, 0.65, 0.9] : [0.35, 0.65, 0.9]) {
        const x = dune.x + Math.cos(a) * 5 * dune.scale * t
        const z = dune.z + Math.sin(a) * 3.5 * dune.scale * t
        if (cliffDistance(x, z) < 0.6) continue
        const s = dropAt(x, z)
        const drawn = drawnSurface(s.p.pos[0], s.p.pos[2])
        assert.ok(Math.abs(s.p.pos[1] - drawn) <= 0.1, `dune at (${dune.x}, ${dune.z}), point (${x.toFixed(1)}, ${z.toFixed(1)}): rests ${(s.p.pos[1] - drawn).toFixed(2)} m from the sand`)
        assert.ok(s.p.grounded, 'standing, not hovering')
        assert.equal(s.fell, 0)
        checked += 1
      }
    }
  }
  assert.ok(checked > 120, `${checked} points`)
})

test('sahara dunes: walking up one side and down the other follows the slope, along both axes and back', () => {
  for (const dune of dunes) {
    const long = 5 * dune.scale
    const wide = 3.5 * dune.scale
    // [start, camera yaw so that "back" walks across, distance to cover]
    const crossings = [
      [[dune.x - long - 1.5, dune.z], Math.PI / 2, long * 2 + 3],
      [[dune.x + long + 1.5, dune.z], -Math.PI / 2, long * 2 + 3],
      [[dune.x, dune.z - wide - 1.5], 0, wide * 2 + 3],
      [[dune.x, dune.z + wide + 1.5], Math.PI, wide * 2 + 3],
    ]
    for (const [[x, z], yaw, distance] of crossings) {
      if (drawnTerrain(x, z) === null) continue
      const s = play([x, drawnSurface(x, z) + 0.05, z], yaw)
      s.run(10)
      const from = [...s.p.pos]
      let peak = -Infinity
      let airborne = 0
      for (let frame = 0; frame < 60 * 8; frame += 1) {
        input(s, 'back')
        s.frame()
        peak = Math.max(peak, s.p.pos[1])
        if (!s.p.grounded) airborne += 1
        if (Math.hypot(s.p.pos[0] - from[0], s.p.pos[2] - from[2]) >= distance) break
      }
      const went = Math.hypot(s.p.pos[0] - from[0], s.p.pos[2] - from[2])
      const label = `dune at (${dune.x}, ${dune.z}) from (${x.toFixed(1)}, ${z.toFixed(1)})`
      assert.ok(went >= distance - 0.5, `${label}: crossed only ${went.toFixed(1)} of ${distance.toFixed(1)} m`)
      assert.ok(peak >= 1.6 * dune.scale - 0.2 - 0.25, `${label}: went over the top (peak ${peak.toFixed(2)})`)
      assert.ok(s.worstSink <= 0.1, `${label}: sank ${s.worstSink.toFixed(2)} m into the sand on the way`)
      assert.equal(s.fell, 0)
      // back on the flat at the far side, standing on it
      s.run(30)
      assert.ok(Math.abs(s.p.pos[1] - drawnSurface(s.p.pos[0], s.p.pos[2])) <= 0.1, `${label}: ends ${(s.p.pos[1] - drawnSurface(s.p.pos[0], s.p.pos[2])).toFixed(2)} m off the sand`)
      assert.ok(airborne <= 60 * 8 * 0.5, `${label}: spent ${airborne} frames in the air`)
    }
  }
})
function input(s, key) { s.input.held.clear(); s.input.held.add(key) }

test('sahara dunes: jumping and flying into a dune leaves Bulbuli on it, never inside; flying over is free', () => {
  for (const dune of dunes) {
    const x = dune.x - 5 * dune.scale - 2
    if (drawnTerrain(x, dune.z) === null) continue
    // fly low and level straight at the dune's side
    const s = play([x, 0.6, dune.z], Math.PI / 2)
    s.p.grounded = false
    let inside = 0
    for (let frame = 0; frame < 240; frame += 1) {
      input(s, 'back')
      s.frame()
      const surface = duneHeightAt(dune, s.p.pos[0], s.p.pos[2])
      if (s.p.pos[1] < surface - 0.02) inside += 1
    }
    assert.equal(inside, 0, `dune at (${dune.x}, ${dune.z}): ${inside} frames inside the dune`)
    assert.ok(s.p.pos[0] > x + 3, 'the dune is not a wall: Bulbuli carried on over it')
    // a jump from the top lands back on it
    const top = play([dune.x, duneHeightAt(dune, dune.x, dune.z) + 0.02, dune.z])
    top.run(8)
    top.run(1, ['jump'])
    let apex = 0
    for (let frame = 0; frame < 120; frame += 1) { top.frame(); apex = Math.max(apex, top.p.pos[1]) }
    // the same tap on the open plain, for comparison
    const flat = play([0, drawnSurface(0, 0) + 0.02, 0])
    flat.run(8)
    const ground = flat.p.pos[1]
    flat.run(1, ['jump'])
    let flatApex = 0
    for (let frame = 0; frame < 120; frame += 1) { flat.frame(); flatApex = Math.max(flatApex, flat.p.pos[1]) }
    assert.ok(flatApex - ground > 0.5)
    assert.ok(Math.abs((apex - duneHeightAt(dune, dune.x, dune.z)) - (flatApex - ground)) < 0.05, 'a jump from a dune is as high as a jump from the plain')
    assert.ok(top.p.grounded && Math.abs(top.p.pos[1] - drawnSurface(top.p.pos[0], top.p.pos[2])) <= 0.1)
    // well above it, nothing touches the bird
    const high = play([dune.x, 1.6 * dune.scale + 3, dune.z])
    stayOnDunes(high.p, biome)
    assert.equal(high.p.pos[1], 1.6 * dune.scale + 3)
  }
  // maps without dunes are left alone
  for (const id of ['amazon', 'sundarbans']) {
    const p = createPlayer(BIOMES[id].spawn)
    const before = [...p.pos]
    p.pos[1] -= 5
    stayOnDunes(p, BIOMES[id])
    assert.deepEqual(p.pos, [before[0], before[1] - 5, before[2]])
  }
})

test('sahara rocks: all twelve stop a walking Bulbuli at the outline that is drawn, and carry it on their rounded top', () => {
  const rockColliders = colliders.filter((c) => /^prop-\d+$/.test(c.id) && rocks.some((r) => r.x === c.x && r.z === c.z))
  assert.equal(rockColliders.length, 12)
  let total = 0
  let buried = 0
  for (const rock of rocks) {
    const c = rockColliders.find((k) => k.x === rock.x && k.z === rock.z)
    const [wide, narrow] = rockHalfWidths(rock)
    const contact = rockContactRadius(rock)
    const summit = rockHeightAt(rock, rock.x, rock.z)
    // the collider follows the rock's size (it was 0.6 m wide with a flat 0.8 m lid for every rock,
    // whether the stone drawn was 0.4 or 1.1 m across)
    assert.ok(Math.abs(c.r + 0.35 - contact) < 1e-9 && contact <= wide && contact >= narrow)
    assert.equal(c.supportRadius, contact, 'it carries Bulbuli exactly as far out as it stops it')
    assert.ok(c.walkable)
    // its surface is the rounded stone that is drawn, kept above the half-metre step the bird can
    // take from the sand (so a rock is never sometimes a ramp and sometimes a wall)
    assert.ok(ROCK_STEP > 0.5 && ROCK_STEP <= 0.6)
    for (let k = 0; k < 24; k += 1) {
      for (const t of [0, 0.3, 0.6, 0.85, 0.99]) {
        const x = rock.x + Math.cos((k / 24) * Math.PI * 2) * contact * t
        const z = rock.z + Math.sin((k / 24) * Math.PI * 2) * contact * t
        assert.equal(c.heightAt(x, z), Math.max(rockHeightAt(rock, x, z), rock.y + ROCK_STEP))
        assert.equal(c.heightAt(x, z), rockTopAt(rock, x, z))
      }
    }
    assert.ok(c.heightAt(rock.x, rock.z) - summit <= 0.03 + 1e-9, 'at its summit the surface is the stone (the smallest rock is 3 cm lower than the step)')
    // one of the twelve has always been scattered where the first step is drawn over it: it is
    // out of sight inside the step, and must not disturb a bird that stands on the step
    if (dropAt(rock.x, rock.z).p.pos[1] > rock.y + 1.04 * rock.scale + 0.2) {
      buried += 1
      const above = dropAt(rock.x, rock.z)
      assert.ok(above.p.grounded && Math.abs(above.p.pos[1] - drawnTerrain(above.p.pos[0], above.p.pos[2])) <= 0.1)
      for (let frame = 0; frame < 60; frame += 1) { input(above, 'back'); above.frame() }
      assert.ok(Math.hypot(above.p.pos[0] - rock.x, above.p.pos[2] - rock.z) > 2.5, 'walks freely over a buried rock')
      continue
    }
    const onCliff = cliffDistance(rock.x, rock.z) < wide + 0.5 // another pokes out of the first step's wall
    // (one more has always stood right against the oasis well, with no free run-up of its own)
    const crowded = colliders.some((o) => o !== c && o.kind === 'prop' && !o.id.startsWith('dune-') && Math.hypot(o.x - rock.x, o.z - rock.z) < wide + 0.5)
    // walk straight at it from every side that has a clear, level run-up, at three frame rates
    let sides = 0
    for (let k = 0; k < 8 && !onCliff; k += 1) {
      const a = (k / 8) * Math.PI * 2
      const start = [rock.x + Math.sin(a) * (wide + 1.3), 0, rock.z + Math.cos(a) * (wide + 1.3)]
      let clear = true
      for (let t = 0; t <= 1 && clear; t += 0.05) {
        const x = start[0] + (rock.x - start[0]) * t
        const z = start[2] + (rock.z - start[2]) * t
        const sand = drawnTerrain(x, z)
        clear = sand !== null && Math.abs(sand - rock.y) < 0.12 && cliffDistance(x, z) > 0.8
          && dunes.every((d) => duneHeightAt(d, x, z) === -Infinity)
          && colliders.every((o) => o === c || o.id.startsWith('dune-') || o.kind === 'land' || Math.hypot(o.x - x, o.z - z) > (o.supportRadius ?? o.r) + 0.4)
      }
      if (!clear) continue
      sides += 1
      for (const fps of [60, 37, 24]) {
        total += 1
        const p = createPlayer({ position: [start[0], rock.y + 0.05, start[2]], facing: 0 })
        const keys = createInputState()
        keys.held.add('back')
        let yaw = a + Math.PI // camera beyond the rock: "back" walks towards it
        let lastJumps = null
        let closest = Infinity
        let highest = -Infinity
        for (let frame = 0; frame < 2.5 * fps; frame += 1) {
          const controls = readExplorerControls(keys, { active: true, yaw, lastJumps, dt: 1 / fps })
          yaw = controls.yaw
          lastJumps = controls.lastJumps
          const events = stepPlayer(p, controls.step, 1 / fps, colliders)
          stayOnDunes(p, biome)
          assert.ok(!events.fell)
          closest = Math.min(closest, Math.hypot(p.pos[0] - rock.x, p.pos[2] - rock.z))
          highest = Math.max(highest, p.pos[1])
        }
        const label = `rock at (${rock.x.toFixed(1)}, ${rock.z.toFixed(1)}) side ${k} at ${fps} fps`
        // stopped at the contact circle: never deeper into the stone, never held off by an invisible wall
        assert.ok(closest >= contact - 0.02, `${label}: came within ${closest.toFixed(2)} m (contact ${contact.toFixed(2)})`)
        assert.ok(closest <= contact + 0.05, `${label}: stopped ${(closest - contact).toFixed(2)} m short of the rock`)
        // and walking never climbs it
        assert.ok(highest < rock.y + 0.2, `${label}: walked up to ${highest.toFixed(2)} m`)
      }
    }
    assert.ok(sides >= 2 || onCliff || crowded, `rock at (${rock.x.toFixed(1)}, ${rock.z.toFixed(1)}) has only ${sides} clear sides to test`)
    // landing on it from above, anywhere within its outline: Bulbuli stands on the stone, never in it
    for (let k = 0; k < 8; k += 1) {
      for (const t of k === 0 ? [0, 0.5, 0.9] : [0.5, 0.9]) {
        const x = rock.x + Math.cos((k / 8) * Math.PI * 2) * contact * t
        const z = rock.z + Math.sin((k / 8) * Math.PI * 2) * contact * t
        const landed = play([x, rock.y + 2.4, z])
        landed.p.grounded = false
        landed.run(150)
        const [px, py, pz] = landed.p.pos
        const stone = rockHeightAt(rock, px, pz)
        assert.ok(landed.p.grounded, 'standing')
        assert.equal(landed.fell, 0)
        if (landed.p.groundId !== c.id) {
          // off a steep shoulder it slides down to the sand beside the stone, clear of it
          // (or, for the rock in the cliff, onto the step that covers part of it)
          const clear = Math.hypot(px - rock.x, pz - rock.z) >= contact - 0.02 && Math.abs(py - drawnTerrain(px, pz)) <= 0.1
          // (or onto whatever stands higher there: the step, the well, a dune's rim)
          assert.ok(clear || py >= stone - 0.02, `rock at (${rock.x.toFixed(1)}, ${rock.z.toFixed(1)}) k=${k} t=${t}: on ${landed.p.groundId} at ${py.toFixed(2)}, stone ${stone.toFixed(2)}`)
          assert.ok(t > 0.5 || py >= stone - 0.02, 'the middle of a rock always carries')
          continue
        }
        assert.ok(py >= stone - 0.02, `rock at (${rock.x.toFixed(1)}, ${rock.z.toFixed(1)}): ${(stone - py).toFixed(2)} m inside the stone`)
        // on the part of the stone that is taller than the step it rests on the stone itself
        if (stone >= rock.y + ROCK_STEP) assert.ok(py - stone <= 0.02, `rock at (${rock.x.toFixed(1)}, ${rock.z.toFixed(1)}) k=${k} t=${t}: ${(py - stone).toFixed(2)} m above the stone, on ${landed.p.groundId} at ${py.toFixed(2)}`)
        else assert.ok(py <= rock.y + ROCK_STEP + 0.02 || onCliff, 'on a low shoulder it perches at the step height, no higher')
        assert.equal(landed.fell, 0)
      }
    }
    // from the top it can walk off in every direction without being caught or dropped (the rock in
    // the cliff has the cliff on one side: walking into that wall is the only way that does not lead off)
    const top = dropAt(rock.x, rock.z)
    let ways = 0
    for (let k = 0; k < 8; k += 1) {
      const off = play([...top.p.pos], (k * Math.PI) / 4)
      for (let frame = 0; frame < 90; frame += 1) { input(off, 'back'); off.frame() }
      if (Math.hypot(off.p.pos[0] - rock.x, off.p.pos[2] - rock.z) > wide + 1) ways += 1
      assert.equal(off.fell, 0)
    }
    assert.ok(ways >= (onCliff || crowded ? 5 : 8), `rock at (${rock.x.toFixed(1)}, ${rock.z.toFixed(1)}): only ${ways} of 8 ways off`)
  }
  assert.equal(buried, 1)
  assert.ok(total >= 120, `${total} approaches walked`)
})

test('sahara terrain: the steps and the dry bed are drawn at exactly the size that is solid', () => {
  const byId = Object.fromEntries(biome.discs.map((d) => [d.id, d]))
  // nothing but the plain has a wider drawn footprint than its own disc
  for (const d of biome.discs) assert.equal(hasExpandedTerrainFootprint(d), d.id === 'plain', `${d.id} drawn footprint`)
  // each step is drawn as wide as it always was (2.2, 2.1 and 2.8 m discs drawn 2.55 times wider)
  assert.ok(Math.abs(byId.d1.r - 2.2 * 2.55) < 1e-9 && Math.abs(byId.d2.r - 2.1 * 2.55) < 1e-9 && Math.abs(byId.s1.r - 2.8 * 2.55) < 1e-9)
  assert.deepEqual([byId.d1.top, byId.d2.top, byId.s1.top], [1, 2, 3])
  // their drawn walls reach the sand (they used to stop 0.6 m down, floating)
  for (const id of ['d1', 'd2', 's1']) assert.ok(byId[id].top - byId[id].depth <= -0.5 && byId[id].cliff)
  // the dry bed lies on the plain; station 5 and its dressing sit on it (they were 1 m under the sand)
  assert.ok(byId.s5.top > 0 && byId.s5.top <= 0.05)
  const s5 = biome.stations.find((s) => s.n === 5)
  assert.ok(Math.hypot(s5.x - byId.s5.x, s5.z - byId.s5.z) < byId.s5.r)
  for (const type of ['timeline', 'dryRiver']) assert.ok(biome.props.find((p) => p.type === type).y >= byId.s5.top, `${type} is above the bed`)
  // the scattered rocks and acacias are exactly where they were
  const scatter = scatterBiomeAssets(biome)
  assert.equal(createHash('sha256').update(JSON.stringify(scatter.map((p) => [p.kind, +p.x.toFixed(4), +p.z.toFixed(4), +p.scale.toFixed(4)]))).digest('hex').slice(0, 12), '2871f15e020e')
})

test('sahara terrain: across the whole walkable desert Bulbuli rests within 10 cm of the drawn sand', () => {
  let checked = 0
  let off = 0
  const worst = { d: 0, at: null }
  const scattered = colliders.filter((c) => c.id.startsWith('scattered-rock-') || c.id.startsWith('station-post-'))
  const solids = colliders.filter((c) => c.kind === 'prop' && !c.id.startsWith('dune-'))
  for (let x = -34; x <= 34; x += 1.7) {
    for (let z = -34; z <= 34; z += 1.7) {
      if (drawnTerrain(x, z) === null) continue
      if (!colliders.some((c) => c.kind === 'land' && Math.hypot(x - c.x, z - c.z) <= c.r - 0.4)) continue
      const s = dropAt(x, z)
      const [px, , pz] = s.p.pos
      // small scattered stones, the well, palms and station posts are scenery this check does not model
      if (scattered.some((c) => c.id === s.p.groundId) || solids.some((c) => !rocks.some((r) => r.x === c.x && r.z === c.z) && Math.hypot(px - c.x, pz - c.z) < (c.supportRadius ?? c.r) + 0.5)) continue
      if (cliffDistance(px, pz) < 0.45) continue // standing against a cliff: the body touches the wall
      checked += 1
      // on a large rock the surface is the stone, or its perch height on a low shoulder
      const rock = rocks.find((r) => colliders.some((c) => c.id === s.p.groundId && c.x === r.x && c.z === r.z))
      const d = s.p.pos[1] - (rock ? rockTopAt(rock, px, pz) : drawnSurface(px, pz))
      if (Math.abs(d) > 0.1) { off += 1; if (Math.abs(d) > Math.abs(worst.d)) { worst.d = d; worst.at = [px.toFixed(1), pz.toFixed(1), s.p.groundId] } }
      assert.equal(s.fell, 0)
    }
  }
  assert.ok(checked > 1000, `${checked} points checked`)
  assert.equal(off, 0, `${off} of ${checked} points rest more than 10 cm from the sand (worst ${worst.d.toFixed(2)} m at ${worst.at})`)
})

test('sahara stations: Bulbuli stands in view on drawn sand at every station, and none is walled in', () => {
  const discTop = Object.fromEntries(biome.discs.map((d) => [d.id, d.top]))
  for (const station of biome.stations) {
    // where "Travel here" puts Bulbuli (WorldExplorerGame.jsx)
    const s = play([station.x - 1.2, discTop[station.disc], station.z - 1.2])
    s.p.grounded = false
    s.run(90)
    const drawn = drawnSurface(s.p.pos[0], s.p.pos[2])
    assert.ok(s.p.pos[1] >= drawn - 0.1, `station ${station.n}: Bulbuli is ${(drawn - s.p.pos[1]).toFixed(2)} m under the sand`)
    assert.ok(s.p.pos[1] <= drawn + 0.1 && s.p.grounded)
    assert.ok(discTop[station.disc] >= drawnTerrain(station.x, station.z) - 0.1, `station ${station.n}: its ring is not buried`)
    // it can leave in at least six of eight directions
    let ways = 0
    for (let k = 0; k < 8; k += 1) {
      const t = play([...s.p.pos], (k * Math.PI) / 4)
      for (let frame = 0; frame < 60; frame += 1) { input(t, 'back'); t.frame() }
      if (Math.hypot(t.p.pos[0] - s.p.pos[0], t.p.pos[2] - s.p.pos[2]) > 2.5) ways += 1
    }
    assert.ok(ways >= 6, `station ${station.n}: only ${ways} of 8 ways out`)
  }
})

test('sahara: nowhere on the plain is Bulbuli trapped between dunes, rocks and steps', () => {
  let tried = 0
  for (let x = -30; x <= 30; x += 4.3) {
    for (let z = -30; z <= 30; z += 4.3) {
      if (drawnTerrain(x, z) === null || !colliders.some((c) => c.kind === 'land' && Math.hypot(x - c.x, z - c.z) <= c.r - 1)) continue
      const base = dropAt(x, z)
      let best = 0
      for (let k = 0; k < 8; k += 1) {
        const t = play([...base.p.pos], (k * Math.PI) / 4)
        for (let frame = 0; frame < 90; frame += 1) { input(t, 'back'); t.frame() }
        best = Math.max(best, Math.hypot(t.p.pos[0] - base.p.pos[0], t.p.pos[2] - base.p.pos[2]))
      }
      tried += 1
      assert.ok(best > 4, `stuck near (${x.toFixed(1)}, ${z.toFixed(1)}): furthest walk ${best.toFixed(1)} m`)
    }
  }
  assert.ok(tried > 100)
})

test('sahara pass: the Amazon and the Sundarbans have exactly the colliders they had', () => {
  const sign = (id) => createHash('sha256').update(JSON.stringify(collidersFor(BIOMES[id]).map((c) => [c.id, c.kind, +(c.x ?? 0).toFixed(4), +(c.z ?? 0).toFixed(4), +(c.r ?? 0).toFixed(4), +(c.top ?? 0).toFixed(4), +(c.bottom ?? 0).toFixed(4), Boolean(c.walkable)]))).digest('hex').slice(0, 16)
  assert.equal(sign('amazon'), '0c17d8339da7fa80')
  assert.equal(sign('sundarbans'), '5f8f0487cc358af1')
})
