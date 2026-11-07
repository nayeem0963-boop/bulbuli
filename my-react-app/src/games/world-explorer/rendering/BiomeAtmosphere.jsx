import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Color } from 'three'
import { mulberry32 } from '../../../core/rng.js'

const ENVIRONMENT_PROFILES = Object.freeze({
  // humid tropical haze: lighter fog so the layered forest reads at 30–140 m; soft, lighter
  // shadows; a readable blue-hour night instead of near-black mud
  sundarbans: {
    fogDensity: 0.014, fogHeight: 24, particles: 'motes', particleCount: 90,
    dayColor: '#fff1d4', nightColor: '#a9b9d8', nightGround: '#5f6b63', skyFill: '#cde8dc', groundFill: '#6f7450',
    shadow: { mapSize: 2048, radius: 3.2, intensity: 0.68 },
    night: { sunFloor: 0.78, sunElevation: 16, fill: 1.08, ambient: 0.52 },
  },
  // under a closed canopy: softer, partial shadows and a slightly warmer ground bounce, so the
  // forest floor stays dim and dappled but Bulbuli (dark brown) still reads clearly against it
  amazon: {
    fogDensity: 0.019, fogHeight: 16, particles: 'leaves', particleCount: 72,
    dayColor: '#fff1c9', nightColor: '#7389b1', nightGround: '#4f5b5c', skyFill: '#b2d8bc', groundFill: '#4a5c3c',
    shadow: { mapSize: 2048, radius: 3, intensity: 0.62 },
  },
  sahara: {
    fogDensity: 0.021, fogHeight: 22, particles: 'sand', particleCount: 180,
    dayColor: '#fff0d1', nightColor: '#8298c2', nightGround: '#64657a', skyFill: '#f0d7b1', groundFill: '#816b50',
  },
})

function HeightFog({ biome, dark }) {
  const { camera } = useThree()
  const profile = ENVIRONMENT_PROFILES[biome.id]
  const fogColor = biome.id === 'sundarbans'
    ? '#b3c4b0'
    : biome.id === 'amazon'
      ? dark ? biome.sky.dark.fog : biome.sky.fog
      : dark ? biome.sky.dark.fog : biome.sky.fog
  const fog = useRef()

  useFrame(() => {
    if (!fog.current) return
    const altitude = Math.max(0, camera.position.y)
    const heightFactor = Math.max(0.72, Math.exp(-altitude / profile.fogHeight))
    fog.current.density = profile.fogDensity * heightFactor
  })

  return <fogExp2 ref={fog} attach="fog" args={[fogColor, profile.fogDensity]} />
}

/**
 * Length of one full day-night cycle. Each expedition starts at midday (or night in dark mode),
 * so 20 minutes gives about five minutes of high daylight before the long low-sun shadows and
 * dusk (3 minutes made the sun set ~45 s into an expedition, darkening the whole map).
 */
const DAY_CYCLE_SECONDS = 1200

function SunCycle({ biome, dark }) {
  const profile = ENVIRONMENT_PROFILES[biome.id]
  const sun = useRef()
  const fill = useRef()
  const ambient = useRef()
  const phase = useRef(dark ? 0.75 : 0.25)
  const daytime = useMemo(() => new Color(profile.dayColor), [profile])
  const nighttime = useMemo(() => new Color(profile.nightColor), [profile])
  const nightGround = useMemo(() => new Color(profile.nightGround), [profile])
  const skyFill = useMemo(() => new Color(profile.skyFill), [profile])
  const groundFill = useMemo(() => new Color(profile.groundFill), [profile])
  const currentFill = useMemo(() => new Color(), [])

  useEffect(() => {
    phase.current = dark ? 0.75 : 0.25
  }, [dark])

  useFrame((_, delta) => {
    phase.current = (phase.current + delta / DAY_CYCLE_SECONDS) % 1
    const angle = phase.current * Math.PI * 2
    const elevation = Math.sin(angle)
    const daylight = Math.max(0, Math.min(1, (elevation + 0.12) / 0.62))
    const night = profile.night
    if (sun.current) {
      // at night the key light becomes a high moon, so shadows never stretch across the whole map
      const minElevation = night ? night.sunElevation + daylight * (3 - night.sunElevation) : 3
      sun.current.position.set(Math.cos(angle) * 28, Math.max(minElevation, elevation * 30 + 4), Math.sin(angle) * 28)
      sun.current.intensity = night
        ? night.sunFloor + daylight * (dark ? 0.6 : 0.78)
        : 0.5 + daylight * (dark ? 0.62 : 0.75)
      sun.current.color.lerpColors(nighttime, daytime, daylight)
    }
    if (fill.current) {
      fill.current.color.lerpColors(nighttime, skyFill, daylight)
      fill.current.groundColor.lerpColors(nightGround, groundFill, daylight)
      fill.current.intensity = night ? night.fill + daylight * 0.12 : 0.78 + daylight * 0.2
    }
    if (ambient.current) {
      currentFill.lerpColors(nighttime, daytime, daylight)
      ambient.current.color.copy(currentFill)
      ambient.current.intensity = night ? night.ambient + daylight * 0.12 : 0.35 + daylight * 0.18
    }
  })

  return (
    <>
      <directionalLight
        ref={sun}
        position={[8, 24, 6]}
        castShadow
        shadow-mapSize-width={profile.shadow?.mapSize ?? 1024}
        shadow-mapSize-height={profile.shadow?.mapSize ?? 1024}
        shadow-radius={profile.shadow?.radius ?? 1}
        shadow-intensity={profile.shadow?.intensity ?? 1}
        shadow-camera-left={-38}
        shadow-camera-right={38}
        shadow-camera-top={38}
        shadow-camera-bottom={-38}
        shadow-bias={-0.00015}
        shadow-normalBias={0.025}
      />
      <hemisphereLight ref={fill} args={[profile.skyFill, profile.groundFill, 0.72]} />
      <ambientLight ref={ambient} intensity={0.25} />
    </>
  )
}

function ParticleField({ biome }) {
  const profile = ENVIRONMENT_PROFILES[biome.id]
  const points = useRef()
  const elapsed = useRef(0)
  const geometry = useMemo(() => {
    const random = mulberry32(biome.id.length * 971 + profile.particleCount)
    const positions = new Float32Array(profile.particleCount * 3)
    for (let i = 0; i < profile.particleCount; i += 1) {
      positions[i * 3] = (random() - 0.5) * 190
      positions[i * 3 + 1] = 0.5 + random() * 32
      positions[i * 3 + 2] = (random() - 0.5) * 190
    }
    const value = new BufferGeometry()
    value.setAttribute('position', new BufferAttribute(positions, 3))
    return value
  }, [biome.id, profile])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((_, delta) => {
    if (!points.current) return
    elapsed.current += delta
    const positions = geometry.getAttribute('position')
    for (let i = 0; i < positions.count; i += 1) {
      let x = positions.getX(i)
      let y = positions.getY(i)
      let z = positions.getZ(i)
      if (profile.particles === 'leaves') {
        y -= delta * (0.25 + (i % 5) * 0.035)
        x += Math.sin(elapsed.current * 0.7 + i) * delta * 0.18
      } else if (profile.particles === 'sand') {
        x += delta * (0.8 + (i % 7) * 0.08)
        y += Math.sin(elapsed.current * 1.4 + i) * delta * 0.06
      } else {
        y += Math.sin(elapsed.current + i * 0.7) * delta * 0.08
        x += Math.cos(elapsed.current * 0.6 + i) * delta * 0.06
      }
      if (y < 0.2) y = profile.particles === 'leaves' ? 13 + (i % 4) : 0.5
      if (x > 95) x = -95
      if (x < -95) x = 95
      if (z > 95) z = -95
      if (z < -95) z = 95
      positions.setXYZ(i, x, y, z)
    }
    positions.needsUpdate = true
  })

  const color = profile.particles === 'sand' ? '#f5d69c' : profile.particles === 'leaves' ? '#b9d982' : '#f5edcb'
  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color={color}
        size={profile.particles === 'sand' ? 0.075 : 0.095}
        transparent
        opacity={profile.particles === 'sand' ? 0.34 : 0.48}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

export default function BiomeAtmosphere({ biome, dark }) {
  return (
    <>
      <HeightFog biome={biome} dark={dark} />
      <SunCycle biome={biome} dark={dark} />
      <ParticleField biome={biome} />
    </>
  )
}
