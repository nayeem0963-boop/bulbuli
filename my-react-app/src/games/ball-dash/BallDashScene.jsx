/**
 * Bulbuli Ball Dash — the 3D scene (React Three Fiber, three.js; both already in the project).
 *
 * It draws what the engine says (engine.js) and steps the engine once per frame. Nothing here
 * decides gameplay. Per-frame state never touches React: the scene reads `runRef.current` in
 * useFrame and moves pooled objects. Every crate, cone, bumper, hurdle, gate, star, sparkle, lane
 * dash, track tile and tree is made once and recycled as the track scrolls.
 *
 * Usage (BallDashGame.jsx):
 *   <BallDashScene runRef={run} running paused={false} onEvents={(events) => …} reducedMotion={…} />
 *
 * Performance: dpr capped at 1.5, no shadow maps (a soft blob shadow under the ball instead),
 * instanced meshes for repeated things, and the render loop stops while paused (frameloop="demand").
 */
import { Component, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  BoxGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, ExtrudeGeometry, IcosahedronGeometry,
  MeshStandardMaterial, Object3D, PlaneGeometry, Shape, SphereGeometry, TorusGeometry,
} from 'three'
import { BALL_DASH_CONFIG as CFG } from './config.js'
import { createRng, drainEvents, stepRun } from './engine.js'

const LANES = CFG.lanes
const R = CFG.ball.radius
const TRACK_WIDTH = 6.6
const TILE = 6 // track tiles are this long (alternating colours show the speed)
const TILES = 16
const VIEW = 80 // things further than this are hidden (they're in the fog anyway)
const DASH_GAP = 3
const DASHES = 30
const CURB = 1.5
const CURBS = 56
const TREES = 26
const FLOWERS = 40
const CLOUDS = 9
const HILLS = 8
const STARS = 48
const BIG_STARS = 6
const SPARKLES = 24
const POOL = { crate: 8, cone: 8, bumper: 8, hurdle: 4, gate: 4 }

const dummy = new Object3D()
const wrap = (value, size) => ((value % size) + size) % size

/* ------------------------------------------------------------------ shared geometry */

function makeStarShape(outer = 0.42, inner = 0.19) {
  const shape = new Shape()
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

function useAssets() {
  const assets = useMemo(() => {
    const starGeo = new ExtrudeGeometry(makeStarShape(), { depth: 0.14, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 2 })
    starGeo.center()
    const mat = (color, extra = {}) => new MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, ...extra })
    return {
      geo: {
        star: starGeo,
        tile: new PlaneGeometry(TRACK_WIDTH, TILE),
        dash: new BoxGeometry(0.12, 0.02, 1.2),
        curb: new BoxGeometry(0.35, 0.22, CURB),
        crate: new BoxGeometry(1.15, 1.15, 1.0),
        plank: new BoxGeometry(1.2, 0.16, 1.05),
        cone: new ConeGeometry(0.45, 1.0, 20),
        coneBand: new CylinderGeometry(0.29, 0.34, 0.16, 20, 1, true),
        coneBase: new BoxGeometry(0.9, 0.08, 0.9),
        pillar: new CylinderGeometry(0.48, 0.52, 0.9, 24),
        ring: new TorusGeometry(0.5, 0.07, 8, 28),
        knob: new SphereGeometry(0.32, 20, 14),
        barSegment: new BoxGeometry(TRACK_WIDTH / 6, 0.2, 0.26),
        post: new BoxGeometry(0.22, 1, 0.22),
        beam: new BoxGeometry(TRACK_WIDTH + 0.8, 0.5, 0.55),
        arrow: new ConeGeometry(0.28, 0.42, 4),
        trunk: new CylinderGeometry(0.12, 0.16, 0.8, 8),
        leaves: new IcosahedronGeometry(0.75, 0),
        flower: new SphereGeometry(0.14, 8, 6),
        cloud: new SphereGeometry(1, 12, 8),
        hill: new SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        sparkle: new IcosahedronGeometry(0.09, 0),
        ball: new SphereGeometry(R, 40, 28),
        band: new TorusGeometry(R * 0.995, 0.06, 10, 40),
        eye: new SphereGeometry(0.1, 16, 12),
        pupil: new SphereGeometry(0.055, 12, 10),
        shine: new SphereGeometry(0.025, 8, 6),
        cheek: new CircleGeometry(0.07, 14),
        smile: new TorusGeometry(0.11, 0.022, 8, 20, Math.PI),
        shadow: new CircleGeometry(R * 0.95, 28),
        ground: new PlaneGeometry(220, 220),
        sun: new CircleGeometry(4, 32),
      },
      mat: {
        tileA: mat('#ffe9b8'),
        tileB: mat('#ffdc96'),
        dash: mat('#ffffff', { roughness: 0.4 }),
        curbA: mat('#ff5a6e'),
        curbB: mat('#ffffff'),
        crate: mat('#f2a33a'),
        plank: mat('#c9761f'),
        cone: mat('#ff7a2f'),
        coneBand: mat('#ffffff'),
        bumper: mat('#ff4d8d', { roughness: 0.35 }),
        bumperRing: mat('#ffffff', { roughness: 0.3 }),
        bumperKnob: mat('#ffd23f', { roughness: 0.3 }),
        barA: mat('#3fa3ec'),
        barB: mat('#ffffff'),
        hurdlePost: mat('#1b6fb3'),
        gate: [mat('#ff5a6e'), mat('#ffb13b'), mat('#ffd23f'), mat('#5fcf6f'), mat('#3fa3ec'), mat('#9b6cff')],
        gatePost: mat('#7c4dd8'),
        arrowDown: mat('#ffffff', { emissive: new Color('#9b6cff'), emissiveIntensity: 0.25 }),
        arrowUp: mat('#ffffff', { emissive: new Color('#3fa3ec'), emissiveIntensity: 0.25 }),
        star: mat('#ffcf33', { emissive: new Color('#ffb300'), emissiveIntensity: 0.45, roughness: 0.3, metalness: 0.2 }),
        trunk: mat('#8a5a35'),
        leaves: mat('#3dbb5c', { flatShading: true }),
        flower: mat('#ffffff'),
        cloud: mat('#ffffff', { roughness: 1 }),
        hill: mat('#7fd36b', { flatShading: true }),
        grass: mat('#8fdc74', { roughness: 1 }),
        sparkle: mat('#fff6b0', { emissive: new Color('#ffd23f'), emissiveIntensity: 0.8 }),
        ball: new MeshStandardMaterial({ color: '#ffc93c', roughness: 0.22, metalness: 0.05, emissive: new Color('#ff9a00'), emissiveIntensity: 0.06 }),
        band: mat('#ff5a6e', { roughness: 0.3 }),
        eye: mat('#ffffff', { roughness: 0.2 }),
        pupil: mat('#1b2a49', { roughness: 0.2 }),
        shine: mat('#ffffff', { emissive: new Color('#ffffff'), emissiveIntensity: 1 }),
        cheek: mat('#ff8fa3', { transparent: true, opacity: 0.8 }),
        smile: mat('#1b2a49'),
        shadow: new MeshStandardMaterial({ color: '#1b2a49', transparent: true, opacity: 0.22, depthWrite: false }),
        sun: new MeshStandardMaterial({ color: '#fff3b0', emissive: new Color('#ffe27a'), emissiveIntensity: 1, fog: false }),
      },
    }
  }, [])
  useEffect(() => () => {
    Object.values(assets.geo).forEach((g) => g.dispose())
    Object.values(assets.mat).flat().forEach((m) => m.dispose())
  }, [assets])
  return assets
}

/* ------------------------------------------------------------------ the ball */

function Ball({ runRef, assets, reducedMotion }) {
  const { geo, mat } = assets
  const root = useRef(null)
  const body = useRef(null)
  const shadow = useRef(null)
  const look = useRef({ squash: 0, wasAir: false, blink: 0 })

  useFrame((_, delta) => {
    const run = runRef.current
    if (!run || !root.current) return
    const s = run.scale
    const air = run.jumpT >= 0
    const l = look.current
    if (l.wasAir && !air) l.squash = 1 // landed: a little squash
    l.wasAir = air
    l.squash = Math.max(0, l.squash - delta * 5)
    const squash = reducedMotion ? 0 : l.squash * 0.18
    root.current.position.set(run.x, run.y + R * s * (1 - squash), 0)
    root.current.scale.set(s * (1 + squash), s * (1 - squash), s * (1 + squash))
    // a little lean into lane changes
    root.current.rotation.z = (LANES[run.lane] - run.x) * -0.12
    // the body rolls; the face stays looking back at the player
    if (body.current && !run.over) body.current.rotation.x -= (run.speed * Math.min(delta, 0.05)) / (R * s)
    // blink while safe after a bump
    l.blink += delta
    root.current.visible = run.invulnerable <= 0 || Math.floor(l.blink * 9) % 2 === 0
    if (shadow.current) {
      const k = 1 / (1 + run.y * 0.8)
      shadow.current.position.set(run.x, 0.012, 0)
      shadow.current.scale.set(k * s, k * s, 1)
      shadow.current.material.opacity = 0.24 * k
    }
  })

  return (
    <>
      <group ref={root}>
        <group ref={body}>
          <mesh geometry={geo.ball} material={mat.ball} />
          {/* two stripes on the sides show the roll without crossing the face */}
          <mesh geometry={geo.band} material={mat.band} rotation={[0, Math.PI / 2, 0]} scale={[0.62, 0.62, 1.04]} position={[0.36, 0, 0]} />
          <mesh geometry={geo.band} material={mat.band} rotation={[0, Math.PI / 2, 0]} scale={[0.62, 0.62, 1.04]} position={[-0.36, 0, 0]} />
        </group>
        {/* face, looking back at the player (+z) */}
        <group position={[0, 0.06, R * 0.86]}>
          <mesh geometry={geo.eye} material={mat.eye} position={[-0.15, 0.08, 0.04]} />
          <mesh geometry={geo.eye} material={mat.eye} position={[0.15, 0.08, 0.04]} />
          <mesh geometry={geo.pupil} material={mat.pupil} position={[-0.15, 0.08, 0.12]} />
          <mesh geometry={geo.pupil} material={mat.pupil} position={[0.15, 0.08, 0.12]} />
          <mesh geometry={geo.shine} material={mat.shine} position={[-0.13, 0.11, 0.17]} />
          <mesh geometry={geo.shine} material={mat.shine} position={[0.17, 0.11, 0.17]} />
          <mesh geometry={geo.cheek} material={mat.cheek} position={[-0.25, -0.06, 0.03]} rotation={[0, -0.5, 0]} />
          <mesh geometry={geo.cheek} material={mat.cheek} position={[0.25, -0.06, 0.03]} rotation={[0, 0.5, 0]} />
          <mesh geometry={geo.smile} material={mat.smile} position={[0, -0.06, 0.08]} rotation={[0, 0, Math.PI]} />
        </group>
      </group>
      <mesh ref={shadow} geometry={geo.shadow} material={mat.shadow} rotation={[-Math.PI / 2, 0, 0]} />
    </>
  )
}

/* ------------------------------------------------------------------ track and scenery */

function Track({ runRef, assets }) {
  const { geo, mat } = assets
  const tiles = useRef([])
  const dashes = useRef(null)
  const curbsA = useRef(null)
  const curbsB = useRef(null)
  useFrame(() => {
    const run = runRef.current
    if (!run) return
    const d = run.dist
    tiles.current.forEach((tile, i) => {
      if (!tile) return
      // tile i sits at track position k*TILE; wrap so they keep flowing past
      const z = -(wrap(i * TILE - d, TILES * TILE) - TILE * 2) // from 2 tiles behind to the fog
      tile.position.z = z
    })
    if (dashes.current) {
      let i = 0
      for (let k = 0; k < DASHES; k += 1) {
        const z = -(wrap(k * DASH_GAP - d, DASHES * DASH_GAP) - 6)
        for (const x of [(LANES[0] + LANES[1]) / 2, (LANES[1] + LANES[2]) / 2]) {
          dummy.position.set(x, 0.011, z)
          dummy.rotation.set(0, 0, 0)
          dummy.scale.set(1, 1, 1)
          dummy.updateMatrix()
          dashes.current.setMatrixAt(i, dummy.matrix)
          i += 1
        }
      }
      dashes.current.instanceMatrix.needsUpdate = true
    }
    for (const [ref, offset] of [[curbsA, 0], [curbsB, CURB]]) {
      if (!ref.current) continue
      let i = 0
      for (let k = 0; k < CURBS / 2; k += 1) {
        const z = -(wrap(k * CURB * 2 + offset - d, CURBS * CURB) - 6)
        for (const x of [-TRACK_WIDTH / 2 - 0.12, TRACK_WIDTH / 2 + 0.12]) {
          dummy.position.set(x, 0.11, z)
          dummy.updateMatrix()
          ref.current.setMatrixAt(i, dummy.matrix)
          i += 1
        }
      }
      ref.current.instanceMatrix.needsUpdate = true
    }
  })
  return (
    <>
      <mesh geometry={geo.ground} material={mat.grass} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -60]} />
      {Array.from({ length: TILES }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => { tiles.current[i] = m }}
          geometry={geo.tile}
          material={i % 2 ? mat.tileA : mat.tileB}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      ))}
      <instancedMesh ref={dashes} args={[geo.dash, mat.dash, DASHES * 2]} frustumCulled={false} />
      <instancedMesh ref={curbsA} args={[geo.curb, mat.curbA, CURBS]} frustumCulled={false} />
      <instancedMesh ref={curbsB} args={[geo.curb, mat.curbB, CURBS]} frustumCulled={false} />
    </>
  )
}

function Scenery({ runRef, assets, reducedMotion }) {
  const { geo, mat } = assets
  const trunks = useRef(null)
  const leaves = useRef(null)
  const flowers = useRef(null)
  const clouds = useRef(null)
  const hills = useRef(null)
  // fixed, varied layout: which side, how far out, how big (made once)
  const layout = useMemo(() => {
    const rnd = createRng(7)
    return {
      trees: Array.from({ length: TREES }, (_, i) => ({ side: i % 2 ? 1 : -1, out: 5 + rnd() * 9, size: 0.8 + rnd() * 0.7, step: 6 })),
      flowers: Array.from({ length: FLOWERS }, (_, i) => ({ side: i % 2 ? 1 : -1, out: 3.9 + rnd() * 3, hue: i % 4, step: 3 })),
      clouds: Array.from({ length: CLOUDS }, () => ({ x: (rnd() - 0.5) * 60, y: 9 + rnd() * 7, size: 1.6 + rnd() * 1.6, step: 18 })),
      hills: Array.from({ length: HILLS }, (_, i) => ({ side: i % 2 ? 1 : -1, out: 18 + rnd() * 14, size: 7 + rnd() * 8, step: 24 })),
    }
  }, [])
  const flowerColors = useMemo(() => ['#ff5a6e', '#ffd23f', '#ffffff', '#9b6cff'].map((c) => new Color(c)), [])

  useEffect(() => {
    if (!flowers.current) return
    layout.flowers.forEach((f, i) => flowers.current.setColorAt(i, flowerColors[f.hue]))
    flowers.current.instanceColor.needsUpdate = true
  }, [layout, flowerColors])

  useFrame(({ clock }) => {
    const run = runRef.current
    if (!run) return
    const d = run.dist
    const place = (ref, items, fn) => {
      if (!ref.current) return
      items.forEach((item, i) => { fn(item, i); dummy.updateMatrix(); ref.current.setMatrixAt(i, dummy.matrix) })
      ref.current.instanceMatrix.needsUpdate = true
    }
    const zOf = (i, step, count, parallax = 1) => -(wrap(i * step - d * parallax, count * step) - 8)
    place(trunks, layout.trees, (t, i) => {
      dummy.position.set(t.side * (TRACK_WIDTH / 2 + t.out), 0.4 * t.size, zOf(i, t.step, TREES))
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(t.size, t.size, t.size)
    })
    place(leaves, layout.trees, (t, i) => {
      dummy.position.set(t.side * (TRACK_WIDTH / 2 + t.out), 1.2 * t.size, zOf(i, t.step, TREES))
      dummy.rotation.set(0, i, 0)
      dummy.scale.set(t.size, t.size * 1.15, t.size)
    })
    place(flowers, layout.flowers, (f, i) => {
      dummy.position.set(f.side * (TRACK_WIDTH / 2 + f.out), 0.12, zOf(i, f.step, FLOWERS))
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(1, 1, 1)
    })
    const drift = reducedMotion ? 0 : clock.elapsedTime * 0.3
    place(clouds, layout.clouds, (c, i) => {
      dummy.position.set(c.x + Math.sin(drift + i) * 0.6, c.y, zOf(i, c.step, CLOUDS, 0.15) - 30)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(c.size * 2.2, c.size, c.size * 1.3)
    })
    place(hills, layout.hills, (h, i) => {
      dummy.position.set(h.side * (TRACK_WIDTH / 2 + h.out), -0.05, zOf(i, h.step, HILLS, 0.5) - 20)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(h.size, h.size * 0.45, h.size)
    })
  })

  return (
    <>
      <mesh geometry={geo.sun} material={mat.sun} position={[14, 26, -95]} />
      <instancedMesh ref={hills} args={[geo.hill, mat.hill, HILLS]} frustumCulled={false} />
      <instancedMesh ref={trunks} args={[geo.trunk, mat.trunk, TREES]} frustumCulled={false} />
      <instancedMesh ref={leaves} args={[geo.leaves, mat.leaves, TREES]} frustumCulled={false} />
      <instancedMesh ref={flowers} args={[geo.flower, mat.flower, FLOWERS]} frustumCulled={false} />
      <instancedMesh ref={clouds} args={[geo.cloud, mat.cloud, CLOUDS]} frustumCulled={false} />
    </>
  )
}

/* ------------------------------------------------------------------ obstacles */

function Crate({ assets }) {
  const { geo, mat } = assets
  return (
    <group>
      <mesh geometry={geo.crate} material={mat.crate} position={[0, 0.575, 0]} />
      <mesh geometry={geo.plank} material={mat.plank} position={[0, 0.3, 0]} />
      <mesh geometry={geo.plank} material={mat.plank} position={[0, 0.85, 0]} />
    </group>
  )
}
function Cone({ assets }) {
  const { geo, mat } = assets
  return (
    <group>
      <mesh geometry={geo.coneBase} material={mat.cone} position={[0, 0.04, 0]} />
      <mesh geometry={geo.cone} material={mat.cone} position={[0, 0.54, 0]} />
      <mesh geometry={geo.coneBand} material={mat.coneBand} position={[0, 0.52, 0]} />
    </group>
  )
}
function Bumper({ assets }) {
  const { geo, mat } = assets
  return (
    <group>
      <mesh geometry={geo.pillar} material={mat.bumper} position={[0, 0.45, 0]} />
      <mesh geometry={geo.ring} material={mat.bumperRing} position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={geo.ring} material={mat.bumperRing} position={[0, 0.65, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={geo.knob} material={mat.bumperKnob} position={[0, 0.98, 0]} />
    </group>
  )
}
function Hurdle({ assets }) {
  const { geo, mat } = assets
  const h = CFG.obstacles.hurdle.height
  return (
    <group>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} geometry={geo.barSegment} material={i % 2 ? mat.barB : mat.barA} position={[-TRACK_WIDTH / 2 + TRACK_WIDTH / 12 + (i * TRACK_WIDTH) / 6, h - 0.1, 0]} />
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={geo.post} material={mat.hurdlePost} position={[side * (TRACK_WIDTH / 2 + 0.1), h / 2, 0]} scale={[1, h, 1]} />
      ))}
      {/* "jump" arrows pointing up, beside the track */}
      {[-1, 1].map((side) => (
        <mesh key={`a${side}`} geometry={geo.arrow} material={mat.arrowUp} position={[side * (TRACK_WIDTH / 2 + 0.1), h + 0.35, 0]} />
      ))}
    </group>
  )
}
function Gate({ assets }) {
  const { geo, mat } = assets
  const bottom = CFG.obstacles.gate.clearance
  return (
    <group>
      {/* a rainbow beam: six stripes */}
      {mat.gate.map((m, i) => (
        <mesh key={i} geometry={geo.beam} material={m} position={[0, bottom + 0.06 + i * 0.075, 0]} scale={[1, 0.15, 1]} />
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={geo.post} material={mat.gatePost} position={[side * (TRACK_WIDTH / 2 + 0.3), (bottom + 0.5) / 2, 0]} scale={[1.2, bottom + 0.5, 1.2]} />
      ))}
      {/* "shrink" arrows pointing down from the beam */}
      {[-1.9, 0, 1.9].map((x) => (
        <mesh key={x} geometry={geo.arrow} material={mat.arrowDown} position={[x, bottom + 0.75, 0.05]} rotation={[Math.PI, 0, 0]} />
      ))}
    </group>
  )
}
const SHAPES = { crate: Crate, cone: Cone, bumper: Bumper, hurdle: Hurdle, gate: Gate }

function Obstacles({ runRef, assets, reducedMotion }) {
  const pools = useRef({})
  const used = useRef(new Map()) // "rowId:lane" → pooled group
  useFrame(({ clock }) => {
    const run = runRef.current
    if (!run) return
    const map = used.current
    const live = new Set()
    for (const row of run.rows) {
      const dz = row.at - run.dist
      if (dz > VIEW || dz < -10) continue
      const items = row.kind === 'lanes'
        ? row.lanes.map((type, lane) => (type ? [type, lane] : null)).filter(Boolean)
        : [[row.kind, 1]]
      for (const [type, lane] of items) {
        const key = `${row.id}:${lane}`
        live.add(key)
        let obj = map.get(key)
        if (!obj) {
          obj = pools.current[type]?.find((g) => g && !g.userData.busy)
          if (!obj) continue
          obj.userData.busy = true
          map.set(key, obj)
        }
        obj.visible = true
        obj.position.set(row.kind === 'lanes' ? LANES[lane] : 0, 0, -dz)
        // a little life: bumpers wobble, cones lean back after a bump
        obj.rotation.y = type === 'bumper' && !reducedMotion ? Math.sin(clock.elapsedTime * 3 + row.id) * 0.25 : 0
        obj.rotation.x = row.hit && type !== 'hurdle' && type !== 'gate' ? -0.25 : 0
      }
    }
    for (const [key, obj] of map) {
      if (live.has(key)) continue
      obj.visible = false
      obj.userData.busy = false
      map.delete(key)
    }
  })
  return (
    <>
      {Object.entries(POOL).map(([type, count]) => {
        const Shape3D = SHAPES[type]
        return Array.from({ length: count }, (_, i) => (
          <group
            key={`${type}${i}`}
            visible={false}
            ref={(g) => {
              pools.current[type] = pools.current[type] ?? []
              pools.current[type][i] = g
            }}
          >
            <Shape3D assets={assets} />
          </group>
        ))
      })}
    </>
  )
}

/* ------------------------------------------------------------------ stars and sparkles */

function Stars({ runRef, assets, reducedMotion, sparkleRef }) {
  const { geo, mat } = assets
  const small = useRef(null)
  const big = useRef(null)
  const sparkles = useRef(null)
  const bursts = useRef([]) // { x, y, t } of recent pickups
  useEffect(() => {
    sparkleRef.current = (x, y) => {
      bursts.current.push({ x, y, t: 0 })
      if (bursts.current.length > 4) bursts.current.shift()
    }
  }, [sparkleRef])

  useFrame(({ clock }, delta) => {
    const run = runRef.current
    if (!run) return
    const spin = reducedMotion ? 0.6 : clock.elapsedTime * 2.2
    let si = 0
    let bi = 0
    for (const star of run.pickups) {
      if (star.taken) continue
      const dz = star.at - run.dist
      if (dz > VIEW) break
      const ref = star.big ? big : small
      const index = star.big ? bi++ : si++
      if (!ref.current || index >= (star.big ? BIG_STARS : STARS)) continue
      const bob = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 3 + star.id) * 0.08
      dummy.position.set(LANES[star.lane], (star.big ? 0.9 : 0.6) + bob, -dz)
      dummy.rotation.set(0, spin + star.id, 0)
      const s = star.big ? 1.6 : 1
      dummy.scale.set(s, s, s)
      dummy.updateMatrix()
      ref.current.setMatrixAt(index, dummy.matrix)
    }
    if (small.current) { small.current.count = si; small.current.instanceMatrix.needsUpdate = true }
    if (big.current) { big.current.count = bi; big.current.instanceMatrix.needsUpdate = true }

    // sparkle bursts: a ring of little gems flying out and fading (shrinking) in half a second
    if (sparkles.current) {
      let n = 0
      const list = bursts.current
      for (let bi = 0; bi < list.length; bi += 1) {
        list[bi].t += Math.min(delta, 0.05)
        const b = list[bi]
        if (b.t > 0.5) continue
        for (let k = 0; k < 6 && n < SPARKLES; k += 1) {
          const a = (k / 6) * Math.PI * 2
          const r = b.t * 3
          dummy.position.set(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r * 0.7 + b.t, 0.3)
          dummy.rotation.set(a, a, 0)
          const s = 1 - b.t * 2
          dummy.scale.set(s, s, s)
          dummy.updateMatrix()
          sparkles.current.setMatrixAt(n, dummy.matrix)
          n += 1
        }
      }
      sparkles.current.count = n
      sparkles.current.instanceMatrix.needsUpdate = true
    }
  })
  return (
    <>
      <instancedMesh ref={small} args={[geo.star, mat.star, STARS]} frustumCulled={false} />
      <instancedMesh ref={big} args={[geo.star, mat.star, BIG_STARS]} frustumCulled={false} />
      <instancedMesh ref={sparkles} args={[geo.sparkle, mat.sparkle, SPARKLES]} frustumCulled={false} />
    </>
  )
}

/* ------------------------------------------------------------------ camera + loop */

function Rig({ runRef, running, paused, onEvents, reducedMotion, sparkleRef }) {
  const { camera, size } = useThree()
  // on tall (portrait) screens step back and up a little, so all three lanes stay in view
  const tall = Math.max(0, Math.min(1, 1 - size.width / size.height))
  const back = 6.3 + tall * 3.2
  const up = 3.1 + tall * 1.1
  const look = useRef({ x: 0, y: 0 })
  useFrame((_, delta) => {
    const run = runRef.current
    if (!run) return
    if (running && !paused) stepRun(run, delta)
    if (run.events.length) {
      const events = drainEvents(run)
      for (const e of events) if (e.type === 'star') sparkleRef.current?.(run.x, run.y + 0.6)
      onEvents?.(events)
    }
    // follow gently: a little sideways, a little up when jumping; never spins or shakes
    const k = 1 - Math.exp(-delta * 4)
    const cam = look.current
    cam.x += (run.x * 0.45 - cam.x) * k
    cam.y += ((reducedMotion ? 0 : run.y * 0.25) - cam.y) * k
    camera.position.set(cam.x * (1 - tall * 0.5), up + cam.y, back)
    camera.lookAt(cam.x, 0.7 + cam.y * 0.5, -7)
  })
  return null
}

class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) { console.error('Ball Dash 3D scene could not start.', error) }
  render() {
    if (this.state.failed) return <p className="bd-noweb" role="alert">{this.props.message}</p>
    return this.props.children
  }
}

export default function BallDashScene({ runRef, running, paused, onEvents, reducedMotion = false, noWebglMessage }) {
  const sparkleRef = useRef(null)
  return (
    <SceneBoundary message={noWebglMessage}>
      <Canvas
        className="bd-canvas"
        dpr={[1, 1.5]}
        frameloop={paused ? 'demand' : 'always'}
        camera={{ fov: 55, near: 0.1, far: 140, position: [0, 3.1, 6.3] }}
        gl={{ antialias: true, powerPreference: 'default', stencil: false }}
      >
        <SceneContents
          runRef={runRef}
          running={running}
          paused={paused}
          onEvents={onEvents}
          reducedMotion={reducedMotion}
          sparkleRef={sparkleRef}
        />
      </Canvas>
    </SceneBoundary>
  )
}

function SceneContents({ runRef, running, paused, onEvents, reducedMotion, sparkleRef }) {
  const assets = useAssets()
  return (
    <>
      <color attach="background" args={['#9fd8ff']} />
      <fog attach="fog" args={['#d4edff', 35, 85]} />
      <hemisphereLight args={['#d9f1ff', '#7fd36b', 1.05]} />
      <directionalLight position={[4, 9, 5]} intensity={1.35} />
      <Track runRef={runRef} assets={assets} />
      <Scenery runRef={runRef} assets={assets} reducedMotion={reducedMotion} />
      <Obstacles runRef={runRef} assets={assets} reducedMotion={reducedMotion} />
      <Stars runRef={runRef} assets={assets} reducedMotion={reducedMotion} sparkleRef={sparkleRef} />
      <Ball runRef={runRef} assets={assets} reducedMotion={reducedMotion} />
      <Rig runRef={runRef} running={running} paused={paused} onEvents={onEvents} reducedMotion={reducedMotion} sparkleRef={sparkleRef} />
    </>
  )
}
