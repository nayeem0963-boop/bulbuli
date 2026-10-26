import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import { useLoadout } from '../../hooks/useLoadout'
import { runtime } from '../../stores/runtime'
import { GameStatus, useGameStore } from '../../stores/useGameStore'
import { WingAccessory } from './WingAccessory'

/**
 * Bulbuli — a low-poly red-whiskered bulbul built from primitives:
 * dark body, pointed crest, cheek patches, vent under the tail.
 * Faces −Z (the running direction).
 *
 * Colours come from the equipped skin, wing extras from the equipped wings
 * (both via useLoadout, so Vault try-ons show up live on the menu bird).
 * `ghost` renders a translucent, unlit version for replays.
 */
export function BulbuliModel({ ghost = false, loadout: loadoutOverride, animate = true }) {
  const equipped = useLoadout()
  const { skin, wings } = loadoutOverride ?? equipped
  const c = skin.colors
  const root = useRef()
  const wingL = useRef()
  const wingR = useRef()

  useFrame((state) => {
    if (!animate) return
    const t = state.clock.elapsedTime
    const playing = useGameStore.getState().status === GameStatus.PLAYING
    const mode = ghost ? 'RUN' : runtime.playerMode

    let base = 0.25
    let flap = Math.sin(t * (playing ? 16 : 5)) * (playing ? 0.7 : 0.35)
    if (playing && mode === 'GLIDE') { base = -0.05; flap = Math.sin(t * 3) * 0.05 }
    else if (playing && mode === 'SLIDE') { base = 1.2; flap = 0 }
    else if (playing && (mode === 'GRIND' || mode === 'WALLRUN')) { base = 0.6; flap *= 0.3 }
    else if (playing && mode === 'AIR') { flap *= 1.4 }

    if (wingL.current) wingL.current.rotation.z = MathUtils.lerp(wingL.current.rotation.z, base + flap, 0.35)
    if (wingR.current) wingR.current.rotation.z = MathUtils.lerp(wingR.current.rotation.z, -base - flap, 0.35)
    if (root.current) root.current.position.y = Math.sin(t * 6) * 0.04
  })

  // Materials as JSX factories — React reuses them until the skin changes
  const m = useMemo(() => {
    if (ghost) {
      const ghostMat = (color) => (
        <meshBasicMaterial color={color} transparent opacity={0.28} depthWrite={false} toneMapped={false} />
      )
      return { dark: ghostMat('#9fe8ff'), belly: ghostMat('#9fe8ff'), crest: ghostMat('#22f3ff'), cheek: ghostMat('#22f3ff'), beak: ghostMat('#22f3ff'), accent: ghostMat('#ffffff'), eye: ghostMat('#ffffff') }
    }
    const glowMat = (color, intensity = 3) => (
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} toneMapped={false} />
    )
    return {
      dark: (
        <meshStandardMaterial
          color={c.body}
          emissive={c.glow}
          emissiveIntensity={skin.metallic ? 0.15 : 0.35}
          metalness={skin.metallic ? 1 : 0.1}
          roughness={skin.metallic ? 0.12 : 0.5}
          flatShading
        />
      ),
      belly: <meshStandardMaterial color={c.belly} emissive={c.belly} emissiveIntensity={0.25} flatShading />,
      crest: glowMat(c.crest, 3),
      cheek: glowMat(c.cheek, 3),
      beak: glowMat(c.beak, 2),
      accent: glowMat(c.accent, 2.5),
      eye: <meshBasicMaterial color="#ffffff" toneMapped={false} />,
    }
  }, [ghost, c, skin.metallic])

  return (
    <group ref={root} scale={0.9}>
      <mesh scale={[0.85, 0.8, 1.1]}>
        <icosahedronGeometry args={[0.4, 1]} />
        {m.dark}
      </mesh>
      <mesh position={[0, -0.12, -0.05]} scale={[0.7, 0.55, 0.9]}>
        <icosahedronGeometry args={[0.36, 1]} />
        {m.belly}
      </mesh>

      {/* Head */}
      <group position={[0, 0.3, -0.34]}>
        <mesh>
          <icosahedronGeometry args={[0.24, 1]} />
          {m.dark}
        </mesh>
        <mesh position={[0, 0.27, 0.05]} rotation={[0.45, 0, 0]}>
          <coneGeometry args={[0.09, 0.32, 5]} />
          {m.crest}
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.19, -0.03, -0.04]} scale={[0.5, 0.7, 0.7]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            {m.cheek}
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={`e${s}`} position={[s * 0.12, 0.06, -0.17]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            {m.eye}
          </mesh>
        ))}
        <mesh position={[0, -0.02, -0.29]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.06, 0.18, 4]} />
          {m.beak}
        </mesh>
        {!ghost && wings.style === 'halo' && <WingAccessory style="halo" color={c.accent} />}
      </group>

      {/* Wings (pivot at the shoulder) */}
      {[-1, 1].map((s) => (
        <group key={s} ref={s < 0 ? wingL : wingR} position={[s * 0.3, 0.08, 0]}>
          <mesh position={[s * 0.25, 0, 0.05]} scale={[1, 0.18, 0.7]}>
            <boxGeometry args={[0.5, 0.25, 0.5]} />
            {m.dark}
          </mesh>
          <mesh position={[s * 0.5, 0, 0.05]} scale={[0.04, 0.04, 0.35]}>
            <boxGeometry args={[1, 1, 1]} />
            {m.accent}
          </mesh>
          {!ghost && wings.style !== 'halo' && wings.style !== 'standard' && (
            <WingAccessory style={wings.style} side={s} color={c.accent} altColor={c.crest} />
          )}
        </group>
      ))}

      {/* Tail + vent */}
      <mesh position={[0, 0.08, 0.5]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.18, 0.05, 0.45]} />
        {m.accent}
      </mesh>
      <mesh position={[0, -0.14, 0.36]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        {m.cheek}
      </mesh>
    </group>
  )
}
