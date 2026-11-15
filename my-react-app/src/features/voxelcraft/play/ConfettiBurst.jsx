import { useFrame } from '@react-three/fiber'
import { useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import * as THREE from 'three'

const COUNT = 220
const LIFE = 3.5 // seconds
const PALETTE = ['#818cf8', '#a855f7', '#34d399', '#fbbf24', '#f472b6', '#22d3ee', '#f8fafc']
const noRaycast = () => null

// scratch objects for composing instance matrices (used synchronously in useFrame only)
const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3(1, 1, 1)

/**
 * Victory confetti: 220 paper chips in ONE instanced draw call, simulated on the CPU with
 * gravity, air drag and tumbling. `ref.current.fire({ x, y, z })` launches a burst.
 */
export default function ConfettiBurst({ ref }) {
  const mesh = useRef(null)
  // the simulation is mutable frame-loop state: a ref (lazy init is the one allowed ref write in render)
  const simRef = useRef(null)
  if (simRef.current === null) {
    simRef.current = {
      active: false,
      age: 0,
      pos: new Float32Array(COUNT * 3),
      vel: new Float32Array(COUNT * 3),
      rot: new Float32Array(COUNT * 3),
      spin: new Float32Array(COUNT * 3),
    }
  }
  const geo = useMemo(() => new THREE.PlaneGeometry(0.12, 0.07), [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), [])
  useEffect(() => () => { geo.dispose(); mat.dispose() }, [geo, mat])

  useEffect(() => {
    const c = new THREE.Color()
    for (let i = 0; i < COUNT; i++) mesh.current.setColorAt(i, c.set(PALETTE[i % PALETTE.length]))
    mesh.current.instanceColor.needsUpdate = true
    mesh.current.count = 0
  }, [])

  useImperativeHandle(ref, () => ({
    fire(origin) {
      const sim = simRef.current
      for (let i = 0; i < COUNT; i++) {
        const k = i * 3
        const a = Math.random() * Math.PI * 2
        const up = 5 + Math.random() * 6
        const out = 1.5 + Math.random() * 3.5
        sim.pos[k] = origin.x; sim.pos[k + 1] = origin.y; sim.pos[k + 2] = origin.z
        sim.vel[k] = Math.cos(a) * out; sim.vel[k + 1] = up; sim.vel[k + 2] = Math.sin(a) * out
        for (let j = 0; j < 3; j++) { sim.rot[k + j] = Math.random() * 6.28; sim.spin[k + j] = (Math.random() - 0.5) * 18 }
      }
      sim.active = true
      sim.age = 0
      mesh.current.count = COUNT
    },
  }), [])

  useFrame((_, delta) => {
    const sim = simRef.current
    if (!sim.active) return
    const dt = Math.min(delta, 0.05)
    sim.age += dt
    if (sim.age > LIFE) {
      sim.active = false
      mesh.current.count = 0
      return
    }
    const drag = Math.exp(-1.8 * dt)
    const fade = Math.min(1, (LIFE - sim.age) / 0.6) // shrink away in the last 0.6 s
    _s.setScalar(fade)
    for (let i = 0; i < COUNT; i++) {
      const k = i * 3
      sim.vel[k] *= drag; sim.vel[k + 2] *= drag
      sim.vel[k + 1] = Math.max(-2.2, (sim.vel[k + 1] - 9 * dt) * drag) // paper flutters: low terminal speed
      sim.pos[k] += sim.vel[k] * dt; sim.pos[k + 1] += sim.vel[k + 1] * dt; sim.pos[k + 2] += sim.vel[k + 2] * dt
      for (let j = 0; j < 3; j++) sim.rot[k + j] += sim.spin[k + j] * dt
      _p.set(sim.pos[k], sim.pos[k + 1], sim.pos[k + 2])
      _q.setFromEuler(_e.set(sim.rot[k], sim.rot[k + 1], sim.rot[k + 2]))
      mesh.current.setMatrixAt(i, _m.compose(_p, _q, _s))
    }
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={mesh} args={[geo, mat, COUNT]} frustumCulled={false} raycast={noRaycast} />
}
