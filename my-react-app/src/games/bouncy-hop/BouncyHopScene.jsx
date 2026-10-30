/**
 * Bulbuli Bouncy Hop 3D — the 3D scene (React Three Fiber + three.js, both already in the project).
 *
 * It steps the engine once a frame and draws what the engine says (engine.js); nothing here decides
 * gameplay. Per-frame state never goes through React: everything is read from `runRef.current` in
 * useFrame and applied to pooled objects. Tiles, clouds, sparkles and particles are made once and
 * recycled as the ball hops on.
 *
 *   <BouncyHopScene runRef={run} running paused={false} onEvents={(events) => …}
 *     formatLabel={(label) => …} reducedMotion={false} noWebglMessage="…" />
 *
 * Look: a soft gradient sky sphere, low-poly drifting clouds above and below the path, twinkling
 * star sparkles (one Points draw call), floating rounded tiles with neon outlines and an underglow,
 * a bird-ball with squash and stretch, landing rings on the next row's tiles (the one the ball is lined
 * up with glows), a landing marker that shows where the ball will come down (red over a gap), sparkle bursts, a rainbow trail and a little camera shake on super bounces.
 * Performance: dpr capped at 1.75, no shadow maps, instancing for particles, the loop stops while paused.
 */
import { Component, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, CanvasTexture, Color, ConeGeometry,
  IcosahedronGeometry, MeshBasicMaterial, MeshStandardMaterial, Object3D, OctahedronGeometry,
  PlaneGeometry, RingGeometry, ShaderMaterial, SphereGeometry, SRGBColorSpace,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { HOP_CONFIG as CFG, ballPosition, bob, ballVerticalSpeed, drainEvents, landingPreview, stepRun, tileX } from './engine.js'

const R = CFG.ballRadius
const TILE_H = 0.5
const BASE_W = 1.8 // tile geometry width; each tile is scaled to its own width
const POOL = 54 // tiles drawn at most (rows behind + rows ahead, up to 3 each)
const ROWS_AHEAD = 13
const CLOUDS = 16
const CLOUD_SPAN = 150
const SPARKLES = 260
const PARTICLES = 120
const TRAIL = 14

// pastel tile bodies and the neon edge that goes with each
const BODY = ['#ffd45c', '#6fcfff', '#7ee6a4', '#ff9cc0', '#c7a6ff']
const NEON = ['#ffe600', '#00e1ff', '#2dff8a', '#ff3fa4', '#a96bff']
const GOOD = new Color('#25e07a')
const BAD = new Color('#ff3b4e')
const PAD_BODY = '#ffffff'
const PAD_NEON = '#ffb703'
const WHITE = new Color('#ffffff')

const dummy = new Object3D()
const tmpColor = new Color()
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/* ------------------------------------------------------------------ textures */

function radialTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, inner)
  grad.addColorStop(1, outer)
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

/**
 * Labels on the tiles (numbers and letters), drawn on canvases and cached by text. They lie flat on
 * the tiles and the camera looks down at them at a slant, so the text is drawn taller than wide.
 * Redrawn once the web fonts have loaded (Baloo 2 / Hind Siliguri for Bangla).
 */
const FONT = '"Baloo 2", "Baloo Da 2", "Hind Siliguri", "Trebuchet MS", system-ui, sans-serif'
const labelCache = new Map()
function drawLabel(canvas, text) {
  const g = canvas.getContext('2d')
  const W = canvas.width
  const H = canvas.height
  g.clearRect(0, 0, W, H)
  // a soft white badge so the text reads on every tile colour
  g.fillStyle = 'rgba(255,255,255,0.88)'
  g.strokeStyle = 'rgba(27,42,73,0.9)'
  g.lineWidth = 10
  const r = 70
  const x = 18
  const y = 18
  const w = W - 36
  const h = H - 36
  g.beginPath()
  if (g.roundRect) g.roundRect(x, y, w, h, r)
  else g.rect(x, y, w, h)
  g.fill()
  g.stroke()
  const size = text.length >= 3 ? 150 : text.length === 2 ? 190 : 230
  g.save()
  g.translate(W / 2, H / 2 + 6)
  g.scale(1, 1.25)
  g.font = `800 ${size}px ${FONT}`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.lineJoin = 'round'
  g.lineWidth = 16
  g.strokeStyle = '#ffffff'
  g.strokeText(text, 0, 4)
  g.fillStyle = '#1b2a49'
  g.fillText(text, 0, 4)
  g.restore()
}
function labelTexture(text) {
  let entry = labelCache.get(text)
  if (!entry) {
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 320
    drawLabel(canvas, text)
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 4
    entry = { canvas, texture }
    labelCache.set(text, entry)
  }
  return entry.texture
}
if (typeof document !== 'undefined' && document.fonts?.ready) {
  document.fonts.ready.then(() => {
    for (const [text, entry] of labelCache) { drawLabel(entry.canvas, text); entry.texture.needsUpdate = true }
  }).catch(() => {})
}

/* ------------------------------------------------------------------ sky */

const skyMaterial = () => new ShaderMaterial({
  side: BackSide,
  depthWrite: false,
  fog: false,
  uniforms: {
    top: { value: new Color('#4fa8ff') },
    mid: { value: new Color('#9fd6ff') },
    horizon: { value: new Color('#ffe9f6') },
    bottom: { value: new Color('#e3d4ff') },
  },
  vertexShader: /* glsl */`
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */`
    uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 bottom;
    varying vec3 vDir;
    void main() {
      float h = vDir.y;
      vec3 c = mix(horizon, mid, smoothstep(0.0, 0.25, h));
      c = mix(c, top, smoothstep(0.25, 0.75, h));
      c = mix(c, bottom, smoothstep(0.0, -0.45, h));
      gl_FragColor = vec4(c, 1.0);
    }`,
})

function Sky() {
  const ref = useRef(null)
  const material = useMemo(() => skyMaterial(), [])
  const { camera } = useThree()
  useFrame(() => { ref.current?.position.copy(camera.position) })
  return (
    <mesh ref={ref} material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[180, 32, 16]} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ clouds */

function makeCloudParts(rng) {
  const parts = []
  const n = 4 + Math.floor(rng() * 3)
  for (let i = 0; i < n; i += 1) {
    parts.push({
      x: (i - (n - 1) / 2) * 0.9 + (rng() - 0.5) * 0.4,
      y: (rng() - 0.3) * 0.5,
      z: (rng() - 0.5) * 0.8,
      s: 0.7 + rng() * 0.7 - Math.abs(i - (n - 1) / 2) * 0.12,
    })
  }
  return parts
}

function Clouds({ reducedMotion }) {
  const { camera } = useThree()
  const geo = useMemo(() => new IcosahedronGeometry(1, 1), [])
  const mat = useMemo(() => new MeshStandardMaterial({ color: '#ffffff', emissive: '#f4f0ff', emissiveIntensity: 0.35, roughness: 1, flatShading: true, transparent: true, opacity: 0.95 }), [])
  const clouds = useMemo(() => {
    let seed = 7
    const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    return Array.from({ length: CLOUDS }, (_, i) => {
      const below = i % 3 === 0
      const side = i % 2 === 0 ? -1 : 1
      return {
        parts: makeCloudParts(rng),
        x: below ? (rng() - 0.5) * 16 : side * (7 + rng() * 18),
        y: below ? -7 - rng() * 6 : -3 + rng() * 7,
        z: -(i / CLOUDS) * CLOUD_SPAN + 10,
        scale: below ? 1.6 + rng() * 1.2 : 1 + rng() * 1.3,
        drift: (rng() - 0.5) * 0.5,
      }
    })
  }, [])
  const refs = useRef([])
  useFrame((_, delta) => {
    const camZ = camera.position.z
    clouds.forEach((c, i) => {
      const g = refs.current[i]
      if (!g) return
      if (!reducedMotion) c.x += c.drift * delta
      if (c.z > camZ + 12) c.z -= CLOUD_SPAN
      if (c.z < camZ - CLOUD_SPAN + 12) c.z += CLOUD_SPAN
      g.position.set(c.x, c.y, c.z)
    })
  })
  return clouds.map((c, i) => (
    <group key={i} ref={(el) => { refs.current[i] = el }} scale={c.scale}>
      {c.parts.map((p, j) => (
        <mesh key={j} geometry={geo} material={mat} position={[p.x, p.y, p.z]} scale={[p.s * 1.1, p.s * 0.8, p.s]} />
      ))}
    </group>
  ))
}

/* ------------------------------------------------------------------ star sparkles */

function Sparkles() {
  const { camera } = useThree()
  const { geometry, material, data } = useMemo(() => {
    const pos = new Float32Array(SPARKLES * 3)
    const phase = new Float32Array(SPARKLES)
    const size = new Float32Array(SPARKLES)
    const data = []
    let seed = 99
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    for (let i = 0; i < SPARKLES; i += 1) {
      const x = (rand() - 0.5) * 60
      const y = -12 + rand() * 26
      const z = -rand() * 120 + 10
      data.push([x, y, z])
      pos.set([x, y, z], i * 3)
      phase[i] = rand() * Math.PI * 2
      size[i] = 0.5 + rand() * 1.1
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(pos, 3))
    geometry.setAttribute('phase', new BufferAttribute(phase, 1))
    geometry.setAttribute('size', new BufferAttribute(size, 1))
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { time: { value: 0 }, scale: { value: 300 } },
      vertexShader: /* glsl */`
        attribute float phase; attribute float size;
        uniform float time; uniform float scale;
        varying float vTw;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vTw = 0.55 + 0.45 * sin(time * 2.2 + phase);
          gl_PointSize = size * vTw * scale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        varying float vTw;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float d = length(p);
          float glow = smoothstep(0.5, 0.0, d) * 0.55;
          float cross = max(0.0, 1.0 - abs(p.x) * 10.0) * smoothstep(0.5, 0.0, abs(p.y))
                      + max(0.0, 1.0 - abs(p.y) * 10.0) * smoothstep(0.5, 0.0, abs(p.x));
          float a = (glow * glow + cross * 0.8) * vTw;
          gl_FragColor = vec4(vec3(1.0, 0.97, 0.85) * a, a);
        }`,
    })
    return { geometry, material, data }
  }, [])
  useFrame((state) => {
    material.uniforms.time.value = state.clock.elapsedTime
    material.uniforms.scale.value = state.size.height * 0.45
    const camZ = camera.position.z
    const pos = geometry.attributes.position
    let changed = false
    for (let i = 0; i < SPARKLES; i += 1) {
      const d = data[i]
      if (d[2] > camZ + 8) { d[2] -= 120; changed = true; pos.setZ(i, d[2]) }
    }
    if (changed) pos.needsUpdate = true
  })
  return <points geometry={geometry} material={material} frustumCulled={false} />
}

/* ------------------------------------------------------------------ tiles */

function useTileAssets() {
  return useMemo(() => {
    const body = new RoundedBoxGeometry(BASE_W, TILE_H, CFG.tile.depth, 4, 0.2)
    const glowTex = radialTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)')
    const slots = Array.from({ length: POOL }, () => ({
      body: new MeshStandardMaterial({ color: BODY[0], roughness: 0.42, metalness: 0.05, emissive: '#000000', transparent: true }),
      outline: new MeshBasicMaterial({ color: NEON[0], side: BackSide, transparent: true, opacity: 0.95, toneMapped: false }),
      glow: new MeshBasicMaterial({ map: glowTex, color: NEON[0], transparent: true, opacity: 0.6, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
      label: new MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false }),
      ring: new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
      key: '', // which tile is drawn in this slot (row:index), to know when to repaint
      text: '',
    }))
    return {
      body,
      label: new PlaneGeometry(1.42, 1.42),
      glow: new PlaneGeometry(1, 1),
      ring: new RingGeometry(0.68, 0.79, 48), // the landing ring around a label
      slots,
    }
  }, [])
}

function Tiles({ runRef, assets, formatLabel, reducedMotion }) {
  const groups = useRef([])
  const bodies = useRef([])
  const labels = useRef([])
  const glows = useRef([])
  const rings = useRef([])
  const formatRef = useRef(formatLabel)
  useEffect(() => { formatRef.current = formatLabel; for (const s of assets.slots) s.text = '' }, [formatLabel, assets])

  useFrame(() => {
    const run = runRef.current
    if (!run) return
    const t = run.t
    const now = performance.now() / 1000
    let used = 0
    // the row the ball is heading for, and the tile it is lined up with (null = the gap)
    const preview = landingPreview(run)
    const first = Math.max(0, run.row - 2)
    const last = Math.min(run.rows.length - 1, run.row + ROWS_AHEAD)
    for (let k = first; k <= last; k += 1) {
      const row = run.rows[k]
      // rows the ball has left fall away into the clouds
      const next = run.rows[k + 1]
      const leftAt = k < run.row && next?.clearedAt != null ? next.clearedAt : null
      const leftAge = leftAt != null ? t - leftAt : -1
      if (leftAge > 1.6) continue
      for (let i = 0; i < row.tiles.length && used < POOL; i += 1) {
        const tile = row.tiles[i]
        const slot = assets.slots[used]
        const g = groups.current[used]
        if (!g) { used += 1; continue }
        g.visible = true
        const key = `${k}:${i}`
        // the tiles not chosen sink and fade once the row is cleared
        const loserAge = row.clearedAt != null && tile.hit !== 'correct' ? t - row.clearedAt : -1
        const dropAge = Math.max(leftAge, loserAge)
        if (dropAge > 1.6) { g.visible = false; used += 1; continue }
        const drop = dropAge > 0 ? 6 * dropAge * dropAge : 0
        const fade = dropAge > 0 ? clamp(1 - dropAge / 1.2, 0, 1) : 1
        // landing: the tile squashes and springs back; a wrong tile also wobbles
        const hitAge = tile.hit ? t - tile.hitAt : 99
        const spring = hitAge < 1 ? Math.exp(-hitAge * 7) * Math.cos(hitAge * 22) : 0
        const shake = tile.hit === 'wrong' && hitAge < 0.6 && !reducedMotion ? Math.sin(hitAge * 60) * 0.12 * (1 - hitAge / 0.6) : 0
        const x = tileX(row, tile, t) + shake
        const y = bob(k, reducedMotion ? 0 : t) - drop - spring * 0.16
        g.position.set(x, y, row.z)
        g.rotation.z = dropAge > 0 ? dropAge * 0.6 * (i % 2 ? 1 : -1) : 0
        const sx = tile.w / BASE_W
        const body = bodies.current[used]
        body.scale.set(sx * (1 + spring * 0.08), 1 - spring * 0.32, 1 + spring * 0.08)
        body.position.y = -TILE_H / 2 - spring * 0.06

        // colours: pastel body + neon edge; green / red once landed on; a pulse to hint the answer
        if (slot.key !== key) {
          slot.key = key
          slot.text = ''
          slot.body.color.set(tile.pad ? PAD_BODY : BODY[tile.color])
        }
        const neon = tile.pad ? PAD_NEON : NEON[tile.color]
        if (tile.hit === 'correct') slot.outline.color.copy(GOOD)
        else if (tile.hit === 'wrong') slot.outline.color.copy(BAD)
        else slot.outline.color.set(neon)
        const hint = row.hint && tile.correct && !tile.hit
        const pulse = hint ? 0.5 + 0.5 * Math.sin(now * 8) : 0
        // landing anticipation: every tile in the next row shows a soft ring; the one the ball is
        // lined up with lights up (whether it is right or wrong is never shown)
        const upcoming = preview && preview.k === k && !tile.hit && row.clearedAt == null
        const aimed = upcoming && preview.tile === tile
        const beat = reducedMotion ? 0 : Math.sin(now * 6)
        slot.body.emissive.copy(tile.hit === 'correct' ? GOOD : tile.hit === 'wrong' ? BAD : tmpColor.set(neon))
        slot.body.emissiveIntensity = tile.hit === 'correct' ? 0.35 * Math.max(0, 1 - hitAge) + 0.1
          : tile.hit === 'wrong' ? 0.25 : hint ? 0.25 + pulse * 0.4 : aimed ? 0.3 + beat * 0.06 : 0.06
        slot.body.opacity = fade * (tile.hit === 'wrong' ? 0.75 : 1)
        slot.outline.opacity = 0.95 * fade
        slot.glow.color.copy(slot.outline.color)
        slot.glow.opacity = (0.45 + pulse * 0.5 + (aimed ? 0.35 : 0) + (hitAge < 0.5 ? (0.5 - hitAge) : 0)) * fade
        const glow = glows.current[used]
        const swell = 1 + pulse * 0.15 + (aimed ? 0.12 : 0)
        glow.scale.set(tile.w * 1.9 * swell, CFG.tile.depth * 1.9 * (aimed ? 1.12 : 1), 1)
        const ring = rings.current[used]
        if (ring) {
          ring.visible = Boolean(upcoming)
          if (upcoming) {
            // soft white rings on every tile ahead; the lined-up one bright, in its own neon
            if (aimed) slot.ring.color.set('#ffffff')
            else slot.ring.color.set(neon).lerp(WHITE, 0.55)
            slot.ring.opacity = aimed ? 0.9 + beat * 0.1 : 0.62
            const rs = Math.min(1, (tile.w - 0.2) / 1.6) * (aimed ? 1 + beat * 0.04 : 1)
            ring.scale.set(rs, rs, rs)
            ring.position.y = 0.02 - spring * 0.16
          }
        }

        // the label
        const text = formatRef.current ? formatRef.current(tile.label) : tile.label
        if (slot.text !== text) {
          slot.text = text
          slot.label.map = labelTexture(text)
          slot.label.needsUpdate = true
        }
        slot.label.opacity = fade
        const lab = labels.current[used]
        const ls = Math.min(1, (tile.w - 0.25) / 1.42)
        lab.scale.set(ls, ls, ls)
        lab.position.y = 0.012 - spring * 0.16
        used += 1
      }
    }
    for (let j = used; j < POOL; j += 1) if (groups.current[j]) groups.current[j].visible = false
  })

  return assets.slots.map((slot, i) => (
    <group key={i} ref={(el) => { groups.current[i] = el }} visible={false}>
      <mesh ref={(el) => { bodies.current[i] = el }} geometry={assets.body} material={slot.body}>
        <mesh geometry={assets.body} material={slot.outline} scale={[1.06, 1.14, 1.06]} />
      </mesh>
      <mesh ref={(el) => { labels.current[i] = el }} geometry={assets.label} material={slot.label} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2} />
      <mesh ref={(el) => { rings.current[i] = el }} geometry={assets.ring} material={slot.ring} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3} visible={false} />
      <mesh ref={(el) => { glows.current[i] = el }} geometry={assets.glow} material={slot.glow} rotation={[-Math.PI / 2, 0, 0]} position={[0, -TILE_H - 0.25, 0]} />
    </group>
  ))
}

/* ------------------------------------------------------------------ the ball (Bulbuli, round) */

/** Where the ball's resting height is right now: on the bobbing tile(s) it's between. */
function groundY(run, reducedMotion) {
  const t = reducedMotion ? 0 : run.t
  if (run.phase === 'air') {
    const p = clamp(run.phaseT / run.phaseDur, 0, 1)
    return bob(run.from, t) * (1 - p) + bob(run.to, t) * p
  }
  if (run.phase === 'back') {
    const p = clamp(run.phaseT / run.phaseDur, 0, 1)
    return bob(run.to, t) * (1 - p) + bob(run.from, t) * p
  }
  if (run.phase === 'fall') return bob(run.to, t)
  return bob(run.row, t)
}

function Ball({ runRef, reducedMotion, ballRef }) {
  const squash = useRef(null)
  const wingL = useRef(null)
  const wingR = useRef(null)
  const mats = useMemo(() => ({
    body: new MeshStandardMaterial({ color: '#ffd23f', roughness: 0.32, emissive: '#ffb000', emissiveIntensity: 0.28 }),
    dark: new MeshStandardMaterial({ color: '#2b2f45', roughness: 0.5 }),
    cheek: new MeshStandardMaterial({ color: '#ff5a6e', roughness: 0.6 }),
    beak: new MeshStandardMaterial({ color: '#ff8a1f', roughness: 0.4 }),
    wing: new MeshStandardMaterial({ color: '#f2a91c', roughness: 0.45 }),
    white: new MeshBasicMaterial({ color: '#ffffff' }),
  }), [])
  const geo = useMemo(() => ({
    body: new SphereGeometry(R, 32, 24),
    eye: new SphereGeometry(R * 0.2, 16, 12),
    pupil: new SphereGeometry(R * 0.11, 12, 8),
    shine: new SphereGeometry(R * 0.045, 8, 6),
    crest: new ConeGeometry(R * 0.16, R * 0.6, 10),
    beak: new ConeGeometry(R * 0.14, R * 0.36, 12),
    wing: new SphereGeometry(R * 0.42, 16, 12),
    tail: new ConeGeometry(R * 0.22, R * 0.6, 10),
    cheek: new SphereGeometry(R * 0.2, 12, 8),
  }), [])
  const landAt = useRef(-1)
  const lastPhase = useRef('contact')

  useFrame((_, delta) => {
    const run = runRef.current
    const g = ballRef.current
    if (!run || !g) return
    const pos = ballPosition(run)
    const base = groundY(run, reducedMotion)
    g.position.set(pos.x, base + pos.y + R, pos.z)

    if (lastPhase.current === 'air' && run.phase !== 'air') landAt.current = run.t
    lastPhase.current = run.phase
    // squash on the ground, stretch with speed in the air; volume roughly kept (x·y·z ≈ 1)
    let sy = 1
    if (!reducedMotion) {
      const vy = ballVerticalSpeed(run)
      const stretch = clamp(Math.abs(vy) * 0.028, 0, 0.32)
      sy = 1 + stretch
      const sinceLand = run.t - landAt.current
      if (run.phase === 'contact' && sinceLand >= 0 && sinceLand < 0.25) sy = 1 - 0.42 * Math.exp(-sinceLand * 14) * Math.cos(sinceLand * 18)
      if (run.phase === 'air' && run.phaseDur - run.phaseT < 0.05) sy = Math.min(sy, 1.05)
    }
    const sx = 1 / Math.sqrt(sy)
    squash.current.scale.set(sx, sy, sx)
    squash.current.position.y = (sy - 1) * R // squash from the bottom (it stays on the tile), not the middle
    // lean into the steering; face forward
    const lean = clamp(-run.vx * 0.045, -0.35, 0.35)
    g.rotation.z += (lean - g.rotation.z) * Math.min(1, delta * 10)
    g.rotation.x = run.phase === 'fall' ? g.rotation.x + delta * 6 : 0
    // wings flap in the air
    const flap = run.phase === 'air' ? Math.sin(run.t * 26) * 0.6 : run.phase === 'fall' ? Math.sin(run.t * 40) * 0.9 : 0.1
    if (wingL.current) wingL.current.rotation.z = 0.5 + flap
    if (wingR.current) wingR.current.rotation.z = -0.5 - flap
  })

  // the bird is a ball, so it can bounce along facing the player: the model is turned to the camera
  return (
    <group ref={ballRef}>
      <group ref={squash} rotation={[0, Math.PI, 0]}>
        <mesh geometry={geo.body} material={mats.body} />
        {/* crest */}
        <mesh geometry={geo.crest} material={mats.dark} position={[0, R * 1.05, R * 0.05]} rotation={[0.35, 0, 0]} />
        <mesh geometry={geo.crest} material={mats.dark} position={[R * 0.18, R * 0.98, R * 0.18]} rotation={[0.6, 0, -0.4]} scale={0.8} />
        <mesh geometry={geo.crest} material={mats.dark} position={[-R * 0.18, R * 0.98, R * 0.18]} rotation={[0.6, 0, 0.4]} scale={0.8} />
        {/* face (front = -z) */}
        <mesh geometry={geo.eye} material={mats.white} position={[R * 0.4, R * 0.25, -R * 0.82]} />
        <mesh geometry={geo.eye} material={mats.white} position={[-R * 0.4, R * 0.25, -R * 0.82]} />
        <mesh geometry={geo.pupil} material={mats.dark} position={[R * 0.42, R * 0.25, -R * 0.98]} />
        <mesh geometry={geo.pupil} material={mats.dark} position={[-R * 0.42, R * 0.25, -R * 0.98]} />
        <mesh geometry={geo.beak} material={mats.beak} position={[0, 0, -R * 1.05]} rotation={[-Math.PI / 2, 0, 0]} />
        <mesh geometry={geo.cheek} material={mats.cheek} position={[R * 0.62, -R * 0.15, -R * 0.66]} scale={[1, 0.6, 0.5]} />
        <mesh geometry={geo.cheek} material={mats.cheek} position={[-R * 0.62, -R * 0.15, -R * 0.66]} scale={[1, 0.6, 0.5]} />
        {/* wings and tail (seen from behind) */}
        <group ref={wingL} position={[R * 0.92, 0, R * 0.1]}>
          <mesh geometry={geo.wing} material={mats.wing} position={[R * 0.2, 0, 0]} scale={[0.45, 1, 0.8]} />
        </group>
        <group ref={wingR} position={[-R * 0.92, 0, R * 0.1]}>
          <mesh geometry={geo.wing} material={mats.wing} position={[-R * 0.2, 0, 0]} scale={[0.45, 1, 0.8]} />
        </group>
        <mesh geometry={geo.tail} material={mats.dark} position={[0, R * 0.05, R * 1.08]} rotation={[Math.PI / 2 + 0.5, 0, 0]} scale={[1.3, 1, 0.5]} />
        {/* the bulbul's red patch under the tail */}
        <mesh geometry={geo.cheek} material={mats.cheek} position={[0, -R * 0.55, R * 0.72]} scale={[0.9, 0.6, 0.6]} />
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ landing shadow */

/**
 * Where the ball will come down: a soft shadow on the row it is heading for that grows and darkens as
 * it falls, and a ring that is white over a tile and red over a gap, so a miss is seen in time to
 * steer. While the ball rests on a tile the ring already shows on the next row, faintly.
 */
function LandingShadow({ runRef, reducedMotion }) {
  const blob = useRef(null)
  const ring = useRef(null)
  const mats = useMemo(() => ({
    blob: new MeshBasicMaterial({ map: radialTexture('rgba(20,20,60,0.75)', 'rgba(20,20,60,0)'), transparent: true, depthWrite: false }),
    ring: new MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, toneMapped: false }),
  }), [])
  const geo = useMemo(() => ({ blob: new PlaneGeometry(1, 1), ring: new RingGeometry(0.36, 0.5, 36) }), [])
  useFrame((state) => {
    const run = runRef.current
    if (!run || !blob.current) return
    const preview = landingPreview(run)
    const row = preview ? run.rows[preview.k] : null
    blob.current.visible = ring.current.visible = Boolean(row)
    if (!row) return
    const airborne = run.phase === 'air'
    const p = airborne ? clamp(run.phaseT / run.phaseDur, 0, 1) : 0
    const over = preview.tile
    const y = bob(preview.k, reducedMotion ? 0 : run.t) + (over ? 0.03 : -0.2) // over a gap: at tile level
    const size = 0.5 + p * 0.55
    blob.current.visible = airborne && Boolean(over)
    blob.current.position.set(run.x, y, row.z)
    blob.current.scale.set(size * 1.4, size * 1.4, 1)
    mats.blob.opacity = 0.35 + p * 0.55
    ring.current.position.set(run.x, y + 0.005, row.z)
    const pulse = reducedMotion ? 1 : 1 + Math.sin(state.clock.elapsedTime * 10) * (over ? 0.06 : 0.12)
    ring.current.scale.set(pulse * (1.2 - p * 0.3), pulse * (1.2 - p * 0.3), 1)
    mats.ring.color.set(!over ? '#ff4d6a' : over.correct && row.hint ? '#25e07a' : '#ffffff')
    mats.ring.opacity = airborne ? 0.45 + p * 0.5 : 0.3
  })
  return (
    <>
      <mesh ref={blob} geometry={geo.blob} material={mats.blob} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3} />
      <mesh ref={ring} geometry={geo.ring} material={mats.ring} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4} />
    </>
  )
}

/* ------------------------------------------------------------------ particles + trail */

const BURST_COLORS = {
  good: ['#ffe600', '#ffffff', '#2dff8a', '#00e1ff', '#ff9cc0'],
  bad: ['#ff3b4e', '#ff8a8a', '#ffffff'],
  boost: ['#ff3fa4', '#ffe600', '#2dff8a', '#00e1ff', '#a96bff', '#ff8a1f'],
}

function Particles({ apiRef, reducedMotion }) {
  const mesh = useRef(null)
  const parts = useMemo(() => Array.from({ length: PARTICLES }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 1, spin: 0 })), [])
  const geo = useMemo(() => new OctahedronGeometry(0.1, 0), [])
  const mat = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), [])
  const cursor = useRef(0)
  useEffect(() => {
    apiRef.current = (x, y, z, kind = 'good', count = 22, speed = 4) => {
      const colors = BURST_COLORS[kind] ?? BURST_COLORS.good
      const n = reducedMotion ? Math.ceil(count / 3) : count
      for (let i = 0; i < n; i += 1) {
        const p = parts[cursor.current]
        const idx = cursor.current
        cursor.current = (cursor.current + 1) % PARTICLES
        const a = Math.random() * Math.PI * 2
        const up = 0.4 + Math.random() * 0.8
        const sp = speed * (0.4 + Math.random() * 0.7)
        Object.assign(p, {
          life: 0, max: 0.6 + Math.random() * 0.5, x, y, z,
          vx: Math.cos(a) * sp, vy: up * sp * 0.9, vz: Math.sin(a) * sp * 0.6,
          s: 0.7 + Math.random() * 1.1, spin: Math.random() * 10,
        })
        mesh.current?.setColorAt(idx, tmpColor.set(colors[i % colors.length]))
      }
      if (mesh.current?.instanceColor) mesh.current.instanceColor.needsUpdate = true
    }
    return () => { apiRef.current = null }
  }, [apiRef, parts, reducedMotion])
  useFrame((_, delta) => {
    const m = mesh.current
    if (!m) return
    const dt = Math.min(delta, 0.05)
    for (let i = 0; i < PARTICLES; i += 1) {
      const p = parts[i]
      if (p.life >= p.max) { dummy.scale.setScalar(0); dummy.position.set(0, -999, 0) } else {
        p.life += dt
        p.vy -= 9 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.z += p.vz * dt
        const k = 1 - p.life / p.max
        dummy.position.set(p.x, p.y, p.z)
        dummy.rotation.set(p.spin * p.life, p.spin * p.life * 0.7, 0)
        dummy.scale.setScalar(p.s * Math.max(0, k))
      }
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[geo, mat, PARTICLES]} frustumCulled={false}>
      <instancedBufferAttribute attach="instanceColor" args={[new Float32Array(PARTICLES * 3).fill(1), 3]} />
    </instancedMesh>
  )
}

/** A rainbow of little balls behind the ball during a super bounce. */
function Trail({ runRef, ballRef, reducedMotion }) {
  const mesh = useRef(null)
  const history = useRef([])
  const geo = useMemo(() => new SphereGeometry(R * 0.55, 12, 8), [])
  const mat = useMemo(() => new MeshBasicMaterial({ transparent: true, opacity: 0.85, toneMapped: false }), [])
  useEffect(() => {
    const colors = BURST_COLORS.boost
    for (let i = 0; i < TRAIL; i += 1) mesh.current?.setColorAt(i, tmpColor.set(colors[i % colors.length]))
    if (mesh.current?.instanceColor) mesh.current.instanceColor.needsUpdate = true
  }, [])
  useFrame(() => {
    const run = runRef.current
    const m = mesh.current
    const b = ballRef.current
    if (!run || !m || !b) return
    const on = run.superHop && run.phase === 'air' && !reducedMotion
    if (on) history.current.unshift([b.position.x, b.position.y, b.position.z])
    else history.current.shift()
    if (history.current.length > TRAIL) history.current.length = TRAIL
    for (let i = 0; i < TRAIL; i += 1) {
      const h = history.current[i]
      if (!h) { dummy.position.set(0, -999, 0); dummy.scale.setScalar(0) } else {
        dummy.position.set(h[0], h[1], h[2])
        dummy.scale.setScalar(1 - i / TRAIL)
      }
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[geo, mat, TRAIL]} frustumCulled={false}>
      <instancedBufferAttribute attach="instanceColor" args={[new Float32Array(TRAIL * 3).fill(1), 3]} />
    </instancedMesh>
  )
}

/* ------------------------------------------------------------------ camera + engine step */

function Rig({ runRef, running, paused, onEvents, reducedMotion, burstRef, ballRef }) {
  const { camera, size } = useThree()
  const cam = useRef({ x: 0, y: 0, z: 0, ready: false })
  const shake = useRef({ amp: 0 })
  useFrame((_, delta) => {
    const run = runRef.current
    if (!run) return
    if (running && !paused) stepRun(run, delta)
    if (run.events.length) {
      const events = drainEvents(run)
      for (const e of events) {
        if (e.type === 'land') burstRef.current?.(e.x, 0.3, e.z, 'good', 20 + Math.min(20, e.combo * 2), 4.2)
        else if (e.type === 'wrong') { burstRef.current?.(e.x, 0.3, e.z, 'bad', 14, 3); shake.current.amp = Math.max(shake.current.amp, 0.14) }
        else if (e.type === 'boost') {
          const b = ballRef.current?.position
          if (b) burstRef.current?.(b.x, b.y, b.z, 'boost', 36, 6)
          shake.current.amp = 0.4
        } else if (e.type === 'milestone') {
          const b = ballRef.current?.position
          if (b) burstRef.current?.(b.x, b.y + 0.5, b.z, 'boost', 40, 7)
        }
      }
      onEvents?.(events)
    }
    // follow behind and a little above; tall (portrait) screens step back so all three tiles show
    const aspect = size.width / Math.max(1, size.height)
    const tall = clamp((1.25 - aspect) / 0.7, 0, 1)
    const fov = 55 + tall * 17
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix() }
    const back = 6.4 + tall * 2.6
    const up = 4.6 + tall * 2.2
    const pos = ballPosition(run)
    const followY = run.phase === 'fall' ? 0 : reducedMotion ? 0 : Math.max(0, pos.y) * 0.18
    const k = 1 - Math.exp(-delta * 6)
    const c = cam.current
    if (!c.ready) { c.x = pos.x * 0.35; c.z = pos.z; c.y = 0; c.ready = true }
    c.x += (pos.x * 0.35 - c.x) * k
    c.z += (pos.z - c.z) * (1 - Math.exp(-delta * 8))
    c.y += (followY - c.y) * k
    let sx = 0
    let sy = 0
    if (shake.current.amp > 0.001 && !reducedMotion) {
      sx = (Math.random() - 0.5) * shake.current.amp
      sy = (Math.random() - 0.5) * shake.current.amp
    }
    shake.current.amp *= Math.exp(-delta * 7)
    camera.position.set(c.x + sx, up + c.y + sy, c.z + back)
    camera.lookAt(c.x * 0.8, 0.2 + c.y * 0.6, c.z - 4.2)
  })
  return null
}

class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) { console.error('Bouncy Hop 3D scene could not start.', error) }
  render() {
    if (this.state.failed) return <p className="bh-noweb" role="alert">{this.props.message}</p>
    return this.props.children
  }
}

export default function BouncyHopScene({ runRef, running, paused, onEvents, formatLabel, reducedMotion = false, noWebglMessage }) {
  const burstRef = useRef(null)
  const ballRef = useRef(null)
  return (
    <SceneBoundary message={noWebglMessage}>
      <Canvas
        className="bh-canvas"
        dpr={[1, 1.75]}
        frameloop={paused ? 'demand' : 'always'}
        camera={{ fov: 55, near: 0.1, far: 400, position: [0, 4.6, 6.4] }}
        gl={{ antialias: true, powerPreference: 'default', stencil: false }}
      >
        <SceneContents
          runRef={runRef}
          running={running}
          paused={paused}
          onEvents={onEvents}
          formatLabel={formatLabel}
          reducedMotion={reducedMotion}
          burstRef={burstRef}
          ballRef={ballRef}
        />
      </Canvas>
    </SceneBoundary>
  )
}

function SceneContents({ runRef, running, paused, onEvents, formatLabel, reducedMotion, burstRef, ballRef }) {
  const tileAssets = useTileAssets()
  return (
    <>
      <fog attach="fog" args={['#f3e3ff', 26, 62]} />
      <hemisphereLight args={['#eaf6ff', '#c9b6ff', 1.25]} />
      <directionalLight position={[3, 10, 6]} intensity={1.5} />
      <Sky />
      <Clouds reducedMotion={reducedMotion} />
      <Sparkles />
      <Tiles runRef={runRef} assets={tileAssets} formatLabel={formatLabel} reducedMotion={reducedMotion} />
      <LandingShadow runRef={runRef} reducedMotion={reducedMotion} />
      <Ball runRef={runRef} reducedMotion={reducedMotion} ballRef={ballRef} />
      <Trail runRef={runRef} ballRef={ballRef} reducedMotion={reducedMotion} />
      <Particles apiRef={burstRef} reducedMotion={reducedMotion} />
      <Rig runRef={runRef} running={running} paused={paused} onEvents={onEvents} reducedMotion={reducedMotion} burstRef={burstRef} ballRef={ballRef} />
    </>
  )
}
