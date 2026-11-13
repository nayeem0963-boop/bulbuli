/**
 * The pool of pale ground light under Bulbuli at night (playerGlow.js). One small unlit disc that
 * follows the bird: no light source, no shadows, one draw call. Mounted inside the avatar group by
 * ExplorerController on maps that set `playerGlow`.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CircleGeometry, Color, Float32BufferAttribute } from 'three'
import { SKY_STATE } from './rendering/daylight.js'
import { glowFalloff, glowStrength } from './playerGlow.js'

export default function PlayerGlow({ settings, motion }) {
  const material = useRef()
  const geometry = useMemo(() => {
    const disc = new CircleGeometry(settings.radius, 28, 0, Math.PI * 2)
    const position = disc.getAttribute('position')
    const tint = new Color(settings.color)
    const colors = []
    // additive: the colour itself fades to black at the rim
    for (let i = 0; i < position.count; i += 1) {
      const fade = glowFalloff(Math.hypot(position.getX(i), position.getY(i)) / settings.radius)
      colors.push(tint.r * fade, tint.g * fade, tint.b * fade)
    }
    disc.setAttribute('color', new Float32BufferAttribute(colors, 3))
    return disc
  }, [settings])
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((_, dt) => {
    if (!material.current) return
    const target = settings.opacity * glowStrength(SKY_STATE.daylight, Boolean(motion.current?.grounded))
    const ease = 1 - Math.exp(-Math.max(0, Math.min(dt, 1 / 30)) * 5)
    material.current.opacity += (target - material.current.opacity) * ease
    material.current.visible = material.current.opacity > 0.004
  })

  return (
    <mesh geometry={geometry} rotation-x={-Math.PI / 2} position={[0, 0.045, 0]} renderOrder={1}>
      <meshBasicMaterial
        ref={material}
        vertexColors transparent opacity={0} depthWrite={false} blending={AdditiveBlending} fog={false} toneMapped={false}
        polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3}
      />
    </mesh>
  )
}
