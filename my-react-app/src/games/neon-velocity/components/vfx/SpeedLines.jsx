import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BoxGeometry, Color, MeshBasicMaterial, Object3D } from 'three'
import { useVfxQuality } from '../../hooks/useVisualFx'
import { runtime } from '../../stores/runtime'
import { vfx } from '../../systems/vfx'

/*
 * SpeedLines — light streaks rushing past in a tunnel around the player.
 * Invisible at low speed, fade in past ~35 % of max speed, flood the screen in
 * Neon Surge. One instanced draw call; lines live in player-relative space and
 * recycle when they pass the camera.
 */

const NEAR = 12
const FAR = -80
const dummy = new Object3D()
const palette = [new Color('#22f3ff'), new Color('#ff2bd6'), new Color('#ffffff')]

export function SpeedLines() {
  const quality = useVfxQuality()
  const count = quality === 'high' ? 90 : 40
  const group = useRef()
  const mesh = useRef()

  const lines = useMemo(() => Array.from({ length: count }, () => spawn({}, true)), [count])
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), [])
  const material = useMemo(() => new MeshBasicMaterial({
    color: new Color(2.5, 2.5, 2.5),
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }), [])
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])

  useEffect(() => {
    lines.forEach((l, i) => mesh.current.setColorAt(i, palette[i % palette.length]))
    mesh.current.instanceColor.needsUpdate = true
  }, [lines])

  useFrame((_, delta) => {
    const amount = smoothstep(0.35, 1, vfx.speedFactor) * 0.5 + vfx.surge * 0.9
    material.opacity = Math.min(1, amount)
    if (!group.current) return
    group.current.visible = amount > 0.01
    if (!group.current.visible) return

    const p = runtime.playerPosition
    group.current.position.set(p.x * 0.5, p.y, p.z)
    const dt = Math.min(delta, 0.05)
    const rel = runtime.speed * (1.2 + vfx.surge * 0.8)

    lines.forEach((l, i) => {
      l.z += rel * l.speedMul * dt
      if (l.z > NEAR) spawn(l, false)
      dummy.position.set(Math.cos(l.angle) * l.radius, Math.sin(l.angle) * l.radius * 0.7 + 1.2, l.z)
      dummy.scale.set(l.thickness, l.thickness, l.length * (1 + vfx.surge))
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={group} visible={false}>
      <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} />
    </group>
  )
}

function spawn(l, initial) {
  l.angle = Math.random() * Math.PI * 2
  l.radius = 3.5 + Math.random() * 7
  l.z = initial ? FAR + Math.random() * (NEAR - FAR) : FAR - Math.random() * 15
  l.length = 3 + Math.random() * 7
  l.thickness = 0.015 + Math.random() * 0.025
  l.speedMul = 0.7 + Math.random() * 0.6
  return l
}

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
