/**
 * The 3D figure for each kind of question (`question.visual.type`). Every figure is drawn to scale
 * from the numbers in the question data, then fitted into a ~5 × 4 unit box above the platform.
 *
 * Labels are real DOM text placed over the canvas (Labels.jsx): crisp at any size, scaled by the
 * browser's zoom, and no font file to download.
 */
import { memo, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges, Instance, Instances, Line, RoundedBox, useCursor } from '@react-three/drei'
import { Color, DoubleSide, ExtrudeGeometry, Shape } from 'three'

import { Label } from './Labels.jsx'

const INK = '#e9f0ff'
const MUTED = '#8ea0cf'
const TAP_SLOP_PX = 12

/* ---------------- default: the level core ---------------- */

function Core({ color, glyph, reducedMotion }) {
  const inner = useRef()
  const shell = useRef()
  useFrame((_, delta) => {
    if (reducedMotion) return
    if (inner.current) inner.current.rotation.y += delta * 0.35
    if (shell.current) {
      shell.current.rotation.y -= delta * 0.18
      shell.current.rotation.x += delta * 0.07
    }
  })
  return (
    <group position={[0, 0.2, 0]}>
      <mesh ref={inner} rotation={[0.35, 0, 0.2]} castShadow>
        <icosahedronGeometry args={[1.05, 0]} />
        <meshStandardMaterial color={color} roughness={0.32} metalness={0.25} flatShading emissive={color} emissiveIntensity={0.12} />
      </mesh>
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.55, 1]} />
        <meshBasicMaterial color={INK} wireframe transparent opacity={0.16} />
      </mesh>
      {glyph && <Label position={[0, 1.95, 0]} tone="glyph">{glyph}</Label>}
    </group>
  )
}

/* ---------------- tiles: a fraction grid ---------------- */

function Tiles({ visual, color }) {
  const { cols, rows, filled } = visual
  const size = Math.min(4.8 / cols, 3.4 / rows)
  const tile = size * 0.84
  const cells = []
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const index = r * cols + c
      cells.push({ index, on: index < filled, position: [(c - (cols - 1) / 2) * size, ((rows - 1) / 2 - r) * size + 0.55, 0] })
    }
  }
  return (
    <group>
      <Instances limit={cells.length}>
        <boxGeometry args={[tile, tile, 0.22]} />
        <meshStandardMaterial roughness={0.45} metalness={0.1} />
        {cells.map((cell) => (
          <Instance key={cell.index} position={cell.position} color={cell.on ? color : '#6b7bb8'} scale={cell.on ? 1 : [1, 1, 0.45]} />
        ))}
      </Instances>
    </group>
  )
}

/* ---------------- cubes: an n × n × n block ---------------- */

function CubeBlock({ visual, color }) {
  const { n } = visual
  const size = 2.6 / n
  const cube = size * 0.92
  const base = new Color(color)
  const cubes = []
  for (let x = 0; x < n; x += 1) {
    for (let y = 0; y < n; y += 1) {
      for (let z = 0; z < n; z += 1) {
        const shade = base.clone().offsetHSL(0, 0, (y - (n - 1) / 2) * 0.08)
        cubes.push({ key: `${x}-${y}-${z}`, position: [(x - (n - 1) / 2) * size, (y - (n - 1) / 2) * size + 0.15, (z - (n - 1) / 2) * size], color: `#${shade.getHexString()}` })
      }
    }
  }
  return (
    <group rotation={[0.35, -0.6, 0]}>
      <Instances limit={cubes.length} castShadow>
        <boxGeometry args={[cube, cube, cube]} />
        <meshStandardMaterial roughness={0.4} metalness={0.15} />
        {cubes.map((c) => <Instance key={c.key} position={c.position} color={c.color} />)}
      </Instances>
      <Label position={[0, -1.25 - 0.15, 1.5]} tone="soft">{`${n} × ${n} × ${n}`}</Label>
    </group>
  )
}

/* ---------------- balance: an equation on a scale ---------------- */

function Balance({ visual, color }) {
  const longest = Math.max(visual.left.length, visual.right.length)
  const size = longest > 14 ? 'sm' : longest > 8 ? 'md' : ''
  const pans = [
    { x: -2.15, text: visual.left },
    { x: 2.15, text: visual.right },
  ]
  return (
    <group position={[0, -0.1, 0]}>
      <mesh position={[0, -1.38, 0]}>
        <cylinderGeometry args={[0.85, 1, 0.16, 32]} />
        <meshStandardMaterial color="#2b3a74" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, -0.32, 0]}>
        <boxGeometry args={[0.18, 2.0, 0.18]} />
        <meshStandardMaterial color="#3c4f94" roughness={0.45} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <coneGeometry args={[0.3, 0.42, 3]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.07, 0]} castShadow>
        <boxGeometry args={[5.0, 0.12, 0.26]} />
        <meshStandardMaterial color="#c9d6ff" roughness={0.3} metalness={0.55} />
      </mesh>
      {pans.map((pan) => (
        <group key={pan.x} position={[pan.x, 0, 0]}>
          <Line points={[[0, 1.05, 0], [-0.62, 0.02, 0]]} color={MUTED} lineWidth={1.2} />
          <Line points={[[0, 1.05, 0], [0.62, 0.02, 0]]} color={MUTED} lineWidth={1.2} />
          <mesh position={[0, 0, 0]} castShadow>
            <cylinderGeometry args={[0.78, 0.66, 0.1, 40]} />
            <meshStandardMaterial color="#9fb2ec" roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[1.3, 0.4, 0.4]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
          </mesh>
          <Label position={[0, 0.78, 0]} tone="plate" size={size}>{pan.text}</Label>
        </group>
      ))}
      <Label position={[0, 1.5, 0]} tone="soft">=</Label>
    </group>
  )
}

/* ---------------- coords: a grid board with points and lines ---------------- */

function useTap(onTap) {
  const start = useRef(null)
  return useMemo(() => ({
    onPointerDown: (e) => {
      e.stopPropagation()
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    },
    onPointerUp: (e) => {
      e.stopPropagation()
      const s = start.current
      start.current = null
      if (!s || s.id !== e.pointerId) return
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > TAP_SLOP_PX) return
      onTap?.()
    },
    onPointerCancel: () => { start.current = null },
  }), [onTap])
}

function PickPoint({ point, position, color, pickable, state, onPick }) {
  const [hovered, setHovered] = useState(false)
  const active = pickable && !point.fixed
  useCursor(hovered && active)
  const handlers = useTap(active ? () => onPick(point.label) : null)
  const tone = state === 'right' ? 'right' : state === 'wrong' ? 'wrong' : point.fixed ? 'fixed' : ''
  const fill = state === 'right' ? '#4fe39a' : state === 'wrong' ? '#ffb04f' : point.fixed ? '#ffffff' : color
  const scale = hovered && active ? 1.35 : 1
  return (
    <group position={position}>
      <mesh scale={scale}>
        <sphereGeometry args={[0.12, 20, 14]} />
        <meshStandardMaterial color={fill} emissive={fill} emissiveIntensity={0.35} roughness={0.3} />
      </mesh>
      {active && (
        <mesh
          {...handlers}
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
          onPointerOut={() => setHovered(false)}
        >
          <sphereGeometry args={[0.36, 10, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      <Label position={[0.32, 0.3, 0]} tone={tone || 'point'}>{point.label}</Label>
    </group>
  )
}

function ticks(min, max, step) {
  const values = []
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) values.push(Math.round(v * 1000) / 1000)
  return values
}

function clipLine({ m, b }, [x0, x1], [y0, y1]) {
  let a = x0
  let c = x1
  if (m !== 0) {
    const xa = (y0 - b) / m
    const xb = (y1 - b) / m
    a = Math.max(x0, Math.min(xa, xb))
    c = Math.min(x1, Math.max(xa, xb))
  }
  return a < c ? [[a, m * a + b], [c, m * c + b]] : null
}

function Coords({ visual, color, pickable, onPick, reveal }) {
  const { x: xr, y: yr } = visual
  const step = { x: visual.step?.x ?? 1, y: visual.step?.y ?? 1 }
  const maxW = 5.4
  const maxH = 3.9
  let sx = maxW / (xr[1] - xr[0])
  let sy = maxH / (yr[1] - yr[0])
  if (!visual.step) sx = sy = Math.min(sx, sy) // a unit grid keeps squares square
  const cx = (xr[0] + xr[1]) / 2
  const cy = (yr[0] + yr[1]) / 2
  const map = (x, y, z = 0.03) => [(x - cx) * sx, (y - cy) * sy + 0.35, z]
  const width = (xr[1] - xr[0]) * sx
  const height = (yr[1] - yr[0]) * sy

  const segments = []
  for (const x of ticks(xr[0], xr[1], step.x)) segments.push(...map(x, yr[0], 0.01), ...map(x, yr[1], 0.01))
  for (const y of ticks(yr[0], yr[1], step.y)) segments.push(...map(xr[0], y, 0.01), ...map(xr[1], y, 0.01))
  const grid = new Float32Array(segments)

  const xLabels = ticks(xr[0], xr[1], step.x).filter((v, i, all) => v !== 0 && (all.length <= 13 || i % 2 === 0))
  const yLabels = ticks(yr[0], yr[1], step.y).filter((v, i, all) => v !== 0 && (all.length <= 13 || i % 2 === 0))
  const hasXAxis = yr[0] <= 0 && yr[1] >= 0
  const hasYAxis = xr[0] <= 0 && xr[1] >= 0
  const axisY = hasXAxis ? 0 : yr[0]
  const axisX = hasYAxis ? 0 : xr[0]
  const lineColors = [color, '#ffd25e', '#ff7cc4']

  const stateOf = (label) => {
    if (!reveal) return null
    if (label === reveal.answer) return 'right'
    if (label === reveal.chosen) return 'wrong'
    return null
  }

  return (
    <group>
      <mesh position={[0, 0.35, -0.06]}>
        <boxGeometry args={[width + 0.7, height + 0.7, 0.08]} />
        <meshStandardMaterial color="#101839" roughness={0.6} metalness={0.2} transparent opacity={0.92} />
      </mesh>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[grid, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#33447e" />
      </lineSegments>
      <Line points={[map(xr[0], axisY), map(xr[1], axisY)]} color={INK} lineWidth={2} />
      <Line points={[map(axisX, yr[0]), map(axisX, yr[1])]} color={INK} lineWidth={2} />
      <Label position={map(xr[1], axisY, 0.05).map((v, i) => (i === 0 ? v + 0.22 : v))} tone="axis">x</Label>
      <Label position={map(axisX, yr[1], 0.05).map((v, i) => (i === 1 ? v + 0.22 : v))} tone="axis">y</Label>
      {xLabels.map((v) => (
        <Label key={`x${v}`} position={map(v, axisY).map((p, i) => (i === 1 ? p - 0.2 : p))} tone="tick">{String(v).replace('-', '−')}</Label>
      ))}
      {yLabels.map((v) => (
        <Label key={`y${v}`} position={map(axisX, v).map((p, i) => (i === 0 ? p - 0.24 : p))} tone="tick">{String(v).replace('-', '−')}</Label>
      ))}

      {(visual.lines ?? []).map((line, i) => {
        const ends = clipLine(line, xr, yr)
        if (!ends) return null
        return (
          <group key={line.label ?? i}>
            <Line points={[map(...ends[0], 0.04), map(...ends[1], 0.04)]} color={lineColors[i % 3]} lineWidth={3} />
            {line.label && <Label position={map(ends[1][0], ends[1][1], 0.06).map((p, k) => (k === 0 ? p - 0.25 : k === 1 ? p - 0.1 : p))} tone="line">{line.label}</Label>}
          </group>
        )
      })}

      {(visual.points ?? []).map((point) => (
        <PickPoint
          key={point.label}
          point={point}
          position={map(point.x, point.y, 0.08)}
          color={color}
          pickable={pickable}
          state={stateOf(point.label)}
          onPick={onPick}
        />
      ))}
    </group>
  )
}

/* ---------------- flat: 2D geometry on a board ---------------- */

function Flat({ visual, color }) {
  const layout = useMemo(() => {
    const xs = []
    const ys = []
    for (const polygon of visual.polygons ?? []) for (const [x, y] of polygon.points) { xs.push(x); ys.push(y) }
    for (const [x1, y1, x2, y2] of visual.segments ?? []) { xs.push(x1, x2); ys.push(y1, y2) }
    for (const c of visual.circles ?? []) { xs.push(c.x - c.r, c.x + c.r); ys.push(c.y - c.r, c.y + c.r) }
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const scale = Math.min(4.6 / (maxX - minX || 1), 3.3 / (maxY - minY || 1))
    return { scale, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, width: (maxX - minX) * scale, height: (maxY - minY) * scale }
  }, [visual])
  const { scale, cx, cy } = layout
  const map = (x, y, z = 0.02) => [(x - cx) * scale, (y - cy) * scale + 0.35, z]

  const shapes = useMemo(() => (visual.polygons ?? []).map((polygon) => {
    const shape = new Shape()
    polygon.points.forEach(([x, y], i) => {
      const [px, py] = [(x - cx) * scale, (y - cy) * scale + 0.35]
      if (i === 0) shape.moveTo(px, py)
      else shape.lineTo(px, py)
    })
    shape.closePath()
    return shape
  }), [visual, cx, cy, scale])

  const tones = { a: color, b: '#ffd25e' }
  return (
    <group>
      <mesh position={[0, 0.35, -0.08]}>
        <boxGeometry args={[layout.width + 1.6, layout.height + 1.4, 0.08]} />
        <meshStandardMaterial color="#101839" roughness={0.6} metalness={0.2} transparent opacity={0.9} />
      </mesh>
      {(visual.polygons ?? []).map((polygon, i) => {
        const fill = tones[polygon.tone] ?? color
        const outline = [...polygon.points, polygon.points[0]].map(([x, y]) => map(x, y, 0.03))
        return (
          <group key={i}>
            <mesh>
              <shapeGeometry args={[shapes[i]]} />
              <meshStandardMaterial color={fill} transparent opacity={0.38} side={DoubleSide} roughness={0.5} />
            </mesh>
            <Line points={outline} color={fill} lineWidth={2.6} />
          </group>
        )
      })}
      {(visual.circles ?? []).map((c, i) => {
        const ring = Array.from({ length: 73 }, (_, k) => {
          const angle = (k / 72) * Math.PI * 2
          return map(c.x + c.r * Math.cos(angle), c.y + c.r * Math.sin(angle), 0.03)
        })
        return (
          <group key={`c${i}`}>
            <mesh position={map(c.x, c.y, 0)}>
              <circleGeometry args={[c.r * scale, 64]} />
              <meshStandardMaterial color={color} transparent opacity={0.3} roughness={0.5} />
            </mesh>
            <Line points={ring} color={color} lineWidth={2.6} />
            <mesh position={map(c.x, c.y, 0.04)}>
              <circleGeometry args={[0.06, 16]} />
              <meshBasicMaterial color={INK} />
            </mesh>
          </group>
        )
      })}
      {(visual.segments ?? []).map(([x1, y1, x2, y2], i) => (
        <Line
          key={`s${i}`}
          points={[map(x1, y1, 0.04), map(x2, y2, 0.04)]}
          color={INK}
          lineWidth={2}
          dashed={(visual.dashed ?? []).includes(i)}
          dashSize={0.12}
          gapSize={0.08}
        />
      ))}
      {(visual.labels ?? []).map((label, i) => (
        <Label key={`l${i}`} position={map(label.x, label.y, 0.08)}>{label.text}</Label>
      ))}
    </group>
  )
}

/* ---------------- solids: rotatable 3D shapes with measurements ---------------- */

function SolidMaterial({ color, opacity = 0.92 }) {
  return <meshStandardMaterial color={color} roughness={0.35} metalness={0.15} transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 0.9} />
}

function Cuboid({ size, labels, color }) {
  const k = 3.1 / Math.max(size.l, size.w, size.h)
  const [l, h, w] = [size.l * k, size.h * k, size.w * k]
  return (
    <group rotation={[0.28, -0.55, 0]} position={[0, 0.5, 0]}>
      <mesh castShadow>
        <boxGeometry args={[l, h, w]} />
        <SolidMaterial color={color} />
        <Edges color={INK} />
      </mesh>
      {/* length on the front bottom edge, width on the right bottom edge, height on the front-left edge */}
      {labels?.l && <Label position={[0, -h / 2 - 0.25, w / 2 + 0.2]}>{labels.l}</Label>}
      {labels?.w && <Label position={[l / 2 + 0.45, -h / 2 - 0.1, -w / 4]}>{labels.w}</Label>}
      {labels?.h && <Label position={[-l / 2 - 0.5, 0, w / 2]}>{labels.h}</Label>}
    </group>
  )
}

function Prism({ size, color }) {
  const geometry = useMemo(() => {
    const k = 3.2 / Math.max(size.base, size.height, size.length)
    const shape = new Shape()
    shape.moveTo((-size.base / 2) * k, 0)
    shape.lineTo((size.base / 2) * k, 0)
    shape.lineTo(0, size.height * k)
    shape.closePath()
    const extruded = new ExtrudeGeometry(shape, { depth: size.length * k, bevelEnabled: false })
    extruded.center()
    return extruded
  }, [size])
  return (
    <group rotation={[0.3, -0.75, 0]} position={[0, 0.6, 0]}>
      <mesh geometry={geometry} castShadow>
        <SolidMaterial color={color} opacity={0.82} />
        <Edges color={INK} threshold={15} />
      </mesh>
    </group>
  )
}

function Cylinder({ size, labels, color }) {
  const k = 3.2 / Math.max(size.r * 2, size.h)
  const r = size.r * k
  const h = size.h * k
  return (
    <group rotation={[0.22, 0, 0]} position={[0, 0.25, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[r, r, h, 48]} />
        <SolidMaterial color={color} opacity={0.85} />
        <Edges color={INK} threshold={15} />
      </mesh>
      <Line points={[[0, h / 2 + 0.01, 0], [r, h / 2 + 0.01, 0]]} color={INK} lineWidth={2.4} />
      <Line points={[[r + 0.25, -h / 2, 0], [r + 0.25, h / 2, 0]]} color={INK} lineWidth={1.6} dashed dashSize={0.1} gapSize={0.07} />
      {labels?.r && <Label position={[r / 2, h / 2 + 0.3, 0]}>{labels.r}</Label>}
      {labels?.h && <Label position={[r + 0.7, 0, 0]}>{labels.h}</Label>}
    </group>
  )
}

function Sphere({ labels, color }) {
  const r = 1.55
  return (
    <group position={[0, 0.3, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[r, 40, 28]} />
        <SolidMaterial color={color} opacity={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r, 0.012, 6, 80]} />
        <meshBasicMaterial color={INK} transparent opacity={0.6} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.06, 12, 8]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <Line points={[[0, 0, 0], [r, 0, 0]]} color={INK} lineWidth={2.4} />
      {labels?.r && <Label position={[r / 2, 0.28, 0]}>{labels.r}</Label>}
    </group>
  )
}

function Cone({ size, labels, color }) {
  const height = Math.sqrt(size.slant ** 2 - size.r ** 2)
  const k = 3.2 / Math.max(size.r * 2, height)
  const r = size.r * k
  const h = height * k
  return (
    <group rotation={[0.18, 0, 0]} position={[0, 0.2, 0]}>
      <mesh castShadow>
        <coneGeometry args={[r, h, 48]} />
        <SolidMaterial color={color} opacity={0.82} />
        <Edges color={INK} threshold={15} />
      </mesh>
      <Line points={[[0, h / 2, 0], [r, -h / 2, 0]]} color={INK} lineWidth={2.4} />
      <Line points={[[0, -h / 2 + 0.01, 0], [-r, -h / 2 + 0.01, 0]]} color={INK} lineWidth={2.4} />
      {labels?.slant && <Label position={[r / 2 + 0.45, 0.1, 0]}>{labels.slant}</Label>}
      {labels?.r && <Label position={[-r / 2, -h / 2 - 0.3, 0]}>{labels.r}</Label>}
    </group>
  )
}

function Solid({ visual, color }) {
  switch (visual.shape) {
    case 'cuboid': return <Cuboid size={visual.size} labels={visual.labels} color={color} />
    case 'prism': return <Prism size={visual.size} color={color} />
    case 'cylinder': return <Cylinder size={visual.size} labels={visual.labels} color={color} />
    case 'sphere': return <Sphere labels={visual.labels} color={color} />
    case 'cone': return <Cone size={visual.size} labels={visual.labels} color={color} />
    default: return null
  }
}

/* ---------------- bars: a 3D bar chart ---------------- */

function Bars({ visual, color, reducedMotion }) {
  const group = useRef()
  const grow = useRef(reducedMotion ? 1 : 0)
  const max = Math.max(...visual.data.map((d) => d.value))
  const spacing = Math.min(1.1, 5 / visual.data.length)
  const toHeight = (v) => (v / max) * 2.7
  useFrame((_, delta) => {
    if (grow.current >= 1 || !group.current) return
    grow.current = Math.min(1, grow.current + delta * 1.8)
    group.current.scale.y = 1 - (1 - grow.current) ** 3
  })
  return (
    <group position={[0, -1.25, 0]} rotation={[0, -0.2, 0]}>
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <boxGeometry args={[spacing * visual.data.length + 0.4, 0.12, 1.1]} />
        <meshStandardMaterial color="#26336a" roughness={0.6} />
      </mesh>
      <group ref={group} scale={[1, reducedMotion ? 1 : 0.001, 1]}>
        {visual.data.map((d, i) => {
          const x = (i - (visual.data.length - 1) / 2) * spacing
          const h = toHeight(d.value)
          return (
            <mesh key={d.label} position={[x, h / 2, 0]} castShadow>
              <boxGeometry args={[spacing * 0.6, h, 0.6]} />
              <meshStandardMaterial color={color} roughness={0.35} metalness={0.1} />
            </mesh>
          )
        })}
      </group>
      {visual.data.map((d, i) => {
        const x = (i - (visual.data.length - 1) / 2) * spacing
        return (
          <group key={`l${d.label}`}>
            <Label position={[x, toHeight(d.value) + 0.25, 0]} tone="value">{d.value}</Label>
            <Label position={[x, -0.32, 0.55]} tone="tick">{d.label}</Label>
          </group>
        )
      })}
    </group>
  )
}

/* ---------------- marbles in a glass bowl ---------------- */

const MARBLE_SLOTS = [
  [0, -1.6, 0], [0.62, -1.45, 0], [-0.31, -1.45, 0.54], [-0.31, -1.45, -0.54], [-0.62, -1.45, 0],
  [0.31, -1.45, 0.54], [0.31, -1.45, -0.54], [0.2, -0.95, 0.15], [-0.25, -0.95, 0.2], [0.02, -0.95, -0.3],
  [1.15, -1.1, 0.3], [-1.15, -1.1, -0.3],
]

function Marbles({ visual }) {
  // interleave the colours so the bowl looks mixed, not sorted
  const marbles = []
  const remaining = visual.groups.map((g) => g.count)
  while (remaining.some((n) => n > 0)) {
    visual.groups.forEach((g, i) => {
      if (remaining[i] > 0) { marbles.push(g.color); remaining[i] -= 1 }
    })
  }
  return (
    <group position={[0, 0.75, 0]}>
      <mesh>
        <sphereGeometry args={[1.95, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#bcd4ff" transparent opacity={0.18} roughness={0.1} metalness={0.1} side={DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.95, 0.03, 8, 80]} />
        <meshStandardMaterial color="#d5e3ff" roughness={0.2} />
      </mesh>
      {marbles.slice(0, MARBLE_SLOTS.length).map((marbleColor, i) => (
        <mesh key={i} position={MARBLE_SLOTS[i]} castShadow>
          <sphereGeometry args={[0.29, 24, 16]} />
          <meshStandardMaterial color={marbleColor} roughness={0.15} metalness={0.1} />
        </mesh>
      ))}
      <Label position={[0, -2.25, 0]} tone="legend">
        {visual.groups.map((g) => (
          <span key={g.name}><i style={{ background: g.color }} />{g.count} {g.name}</span>
        ))}
      </Label>
    </group>
  )
}

/* ---------------- dice and coin ---------------- */

// Pip positions on a face, in face-local (u, v) units of a quarter of the die.
const PIPS = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
}
// Opposite faces add to 7, like a real die.
const FACES = [
  { value: 1, normal: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { value: 6, normal: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
  { value: 2, normal: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  { value: 5, normal: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { value: 3, normal: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  { value: 4, normal: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
]

function Die({ position, rotation }) {
  const size = 1.1
  const pips = useMemo(() => FACES.flatMap((face) => PIPS[face.value].map(([a, b]) => (
    [0, 1, 2].map((axis) => face.normal[axis] * (size / 2 + 0.005) + (face.u[axis] * a + face.v[axis] * b) * size * 0.25)
  ))), [])
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[size, size, size]} radius={0.12} smoothness={3} castShadow>
        <meshStandardMaterial color="#f5f7ff" roughness={0.35} />
      </RoundedBox>
      <Instances limit={21}>
        <sphereGeometry args={[0.085, 12, 8]} />
        <meshStandardMaterial color="#1b2a49" roughness={0.5} />
        {pips.map((p, i) => <Instance key={i} position={p} />)}
      </Instances>
    </group>
  )
}

function Dice({ visual }) {
  const items = []
  if (visual.coin) items.push('coin')
  for (let i = 0; i < visual.dice; i += 1) items.push(`die${i}`)
  const spacing = 2.1
  return (
    <group position={[0, 0.1, 0]}>
      {items.map((item, i) => {
        const x = (i - (items.length - 1) / 2) * spacing
        if (item === 'coin') {
          return (
            <group key={item} position={[x, 0, 0]} rotation={[Math.PI / 2 - 0.35, 0, 0.2]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.72, 0.72, 0.1, 48]} />
                <meshStandardMaterial color="#ffc93c" roughness={0.3} metalness={0.7} />
              </mesh>
              <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.55, 0.03, 8, 48]} />
                <meshStandardMaterial color="#e2a92a" roughness={0.3} metalness={0.7} />
              </mesh>
            </group>
          )
        }
        return <Die key={item} position={[x, 0, 0]} rotation={[0.5 + i * 0.3, 0.7 - i * 0.5, 0.1]} />
      })}
    </group>
  )
}

/* ---------------- matchsticks ---------------- */

function Matches({ visual }) {
  const side = 1.15
  const n = visual.squares
  const sticks = []
  for (let i = 0; i < n; i += 1) {
    const x = (i - (n - 1) / 2) * side
    sticks.push({ position: [x, side / 2, 0], rotation: [0, 0, Math.PI / 2] })
    sticks.push({ position: [x, -side / 2, 0], rotation: [0, 0, Math.PI / 2] })
  }
  for (let i = 0; i <= n; i += 1) {
    sticks.push({ position: [(i - n / 2) * side, 0, 0], rotation: [0, 0, 0] })
  }
  return (
    <group position={[0, 0.75, 0]} rotation={[-0.25, 0, 0]}>
      {sticks.map((stick, i) => (
        <group key={i} position={stick.position} rotation={stick.rotation}>
          <mesh castShadow>
            <boxGeometry args={[0.07, side * 0.9, 0.07]} />
            <meshStandardMaterial color="#e8c48f" roughness={0.7} />
          </mesh>
          <mesh position={[0, side * 0.45, 0]}>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshStandardMaterial color="#ff5f6d" roughness={0.6} />
          </mesh>
        </group>
      ))}
      <Label position={[0, -side / 2 - 0.45, 0]} tone="soft">{`${n} squares · ${3 * n + 1} matches`}</Label>
    </group>
  )
}

/* ---------------- the switch ---------------- */

function Figure({ visual, color, glyph, reducedMotion, pickable, onPick, reveal }) {
  if (!visual) return <Core color={color} glyph={glyph} reducedMotion={reducedMotion} />
  switch (visual.type) {
    case 'tiles': return <Tiles visual={visual} color={color} />
    case 'cubes': return <CubeBlock visual={visual} color={color} />
    case 'balance': return <Balance visual={visual} color={color} />
    case 'coords': return <Coords visual={visual} color={color} pickable={pickable} onPick={onPick} reveal={reveal} />
    case 'flat': return <Flat visual={visual} color={color} />
    case 'solid': return <Solid visual={visual} color={color} />
    case 'bars': return <Bars visual={visual} color={color} reducedMotion={reducedMotion} />
    case 'marbles': return <Marbles visual={visual} />
    case 'dice': return <Dice visual={visual} />
    case 'matches': return <Matches visual={visual} />
    default: return <Core color={color} glyph={glyph} reducedMotion={reducedMotion} />
  }
}

export default memo(Figure)
