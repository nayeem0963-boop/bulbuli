import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'
import { DEFAULT_LOOK } from '../profile/cosmetics.js'
import { PHYSICS } from './physics.js'

const noRaycast = () => null

/** Applies a skin finish (matte / chrome / lava) to the body material. */
function paintSkin(mat, { item, color }) {
  mat.color.set(color)
  mat.emissive.set(color).multiplyScalar(0.18)
  mat.emissiveIntensity = 1
  mat.metalness = 0.1
  mat.roughness = 0.45
  if (item === 'skin_chrome') {
    mat.metalness = 0.75
    mat.roughness = 0.18
    mat.emissive.set(color).multiplyScalar(0.12)
  } else if (item === 'skin_lava') {
    mat.emissive.set('#ff4500')
    mat.roughness = 0.7
  }
}

function paintShirt(mat, { item, color }) {
  mat.color.set(color)
  mat.emissive.set('#000000')
  mat.emissiveIntensity = 1
  mat.toneMapped = true
  if (item === 'shirt_glow') {
    mat.emissive.set(color)
    mat.emissiveIntensity = 1.1
    mat.toneMapped = false
  } else if (item === 'shirt_holo') {
    mat.toneMapped = false
  }
  mat.needsUpdate = true
}

/**
 * Stylized capsule hero: body ("skin"), a shirt band, glowing visor and antenna light.
 * `look` = { skin, shirt } from the player's equipped cosmetics (see profile/cosmetics.js).
 * PlaySession / AvatarPreview move `ref` (root: position, facing) and `bodyRef` (squash/stretch)
 * every frame without React renders.
 */
export default function PlayerAvatar({ ref, bodyRef, look = DEFAULT_LOOK }) {
  const height = PHYSICS.HEIGHT
  const radius = PHYSICS.HALF_WIDTH
  const parts = useMemo(() => {
    const body = new THREE.CapsuleGeometry(radius, height - radius * 2, 6, 16)
    const shirt = new THREE.CylinderGeometry(radius + 0.018, radius + 0.03, 0.42, 20, 1, true)
    const visor = new THREE.BoxGeometry(0.42, 0.14, 0.12)
    const antenna = new THREE.CylinderGeometry(0.02, 0.02, 0.22, 6)
    const tip = new THREE.SphereGeometry(0.06, 12, 8)
    return {
      body, shirt, visor, antenna, tip,
      bodyMat: new THREE.MeshStandardMaterial(),
      shirtMat: new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.6 }),
      visorMat: new THREE.MeshBasicMaterial({ color: '#34d399', toneMapped: false }),
      tipMat: new THREE.MeshBasicMaterial({ color: '#f0abfc', toneMapped: false }),
    }
  }, [height, radius])
  useEffect(() => () => Object.values(parts).forEach((p) => p.dispose()), [parts])

  const skin = look.skin ?? DEFAULT_LOOK.skin
  const shirt = look.shirt ?? DEFAULT_LOOK.shirt
  useLayoutEffect(() => paintSkin(parts.bodyMat, skin), [parts, skin])
  useLayoutEffect(() => paintShirt(parts.shirtMat, shirt), [parts, shirt])

  // Animated finishes: one uniform update per frame, only when equipped.
  const animated = skin.item === 'skin_lava' || shirt.item === 'shirt_holo'
  useFrame(({ clock }) => {
    if (!animated) return
    const t = clock.elapsedTime
    if (skin.item === 'skin_lava') parts.bodyMat.emissiveIntensity = 0.55 + Math.sin(t * 3) * 0.25
    if (shirt.item === 'shirt_holo') {
      parts.shirtMat.color.setHSL((t * 0.15) % 1, 0.8, 0.55)
      parts.shirtMat.emissive.setHSL((t * 0.15 + 0.1) % 1, 0.9, 0.45)
    }
  })

  return (
    <group ref={ref}>
      {/* squash/stretch pivots at the feet so the avatar stays planted */}
      <group ref={bodyRef}>
        <mesh geometry={parts.body} material={parts.bodyMat} position-y={height / 2} castShadow raycast={noRaycast} />
        <mesh geometry={parts.shirt} material={parts.shirtMat} position-y={height * 0.47} raycast={noRaycast} />
        <mesh geometry={parts.visor} material={parts.visorMat} position={[0, height - 0.38, radius - 0.03]} raycast={noRaycast} />
        <mesh geometry={parts.antenna} material={parts.bodyMat} position-y={height + 0.08} raycast={noRaycast} />
        <mesh geometry={parts.tip} material={parts.tipMat} position-y={height + 0.2} raycast={noRaycast} />
      </group>
    </group>
  )
}
