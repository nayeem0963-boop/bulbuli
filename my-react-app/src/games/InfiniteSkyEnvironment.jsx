import { memo, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BoxGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
} from 'three'

const CLOUD_GEOMETRY = new DodecahedronGeometry(1, 0)
const ISLAND_TOP_GEOMETRY = new CylinderGeometry(1, 0.88, 0.22, 7)
const ISLAND_ROCK_GEOMETRY = new DodecahedronGeometry(1, 0)
const WIND_GEOMETRY = new BoxGeometry(1, 1, 1)
const DUST_GEOMETRY = new OctahedronGeometry(1, 0)
const CLOUD_MATERIAL = new MeshStandardMaterial({
  color: '#f8fcff',
  flatShading: true,
  roughness: 1,
})
const GRASS_MATERIAL = new MeshStandardMaterial({
  color: '#75b85b',
  flatShading: true,
  roughness: 1,
})
const ROCK_MATERIAL = new MeshStandardMaterial({
  color: '#806c58',
  flatShading: true,
  roughness: 1,
})
const WIND_MATERIAL = new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.42 })
const DUST_MATERIAL = new MeshBasicMaterial({ color: '#ffd76a' })

const FIELD_LENGTH = 52
const RESET_Z = -9

function createRandom(seed) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 0x100000000
  }
}

function createPositions(count, seed, ranges) {
  const random = createRandom(seed)
  return Array.from({ length: count }, () => ranges.map(([min, max]) => min + random() * (max - min)))
}

function createParticles(count, seed, minSize, maxSize) {
  const random = createRandom(seed)
  return Array.from({ length: count }, () => ({
    position: [-8 + random() * 16, -5 + random() * 11, 3 + random() * (FIELD_LENGTH - 7)],
    size: minSize + random() * (maxSize - minSize),
    rotation: random() * Math.PI,
  }))
}

function ParticleField({ count, seed, speed, minSize, maxSize, geometry, material, streaks = false }) {
  const mesh = useRef()
  const particles = useMemo(() => createParticles(count, seed, minSize, maxSize), [count, seed, minSize, maxSize])
  const dummy = useMemo(() => new Object3D(), [])
  const positions = useMemo(() => particles.map(({ position }) => [...position]), [particles])

  useFrame((_, delta) => {
    if (!mesh.current) return

    particles.forEach((particle, index) => {
      const position = positions[index]
      position[2] -= speed * delta
      if (position[2] < RESET_Z) position[2] += FIELD_LENGTH

      dummy.position.set(...position)
      dummy.rotation.set(0, 0, streaks ? particle.rotation : 0)
      dummy.scale.set(
        streaks ? particle.size * 2.8 : particle.size,
        streaks ? particle.size * 0.18 : particle.size,
        streaks ? particle.size * 0.18 : particle.size,
      )
      dummy.updateMatrix()
      mesh.current.setMatrixAt(index, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, count]}
      frustumCulled={false}
    />
  )
}

function MovingCluster({ position, speed, wrapDistance, children }) {
  const cluster = useRef()

  useFrame((_, delta) => {
    if (!cluster.current) return
    cluster.current.position.z -= speed * delta
    if (cluster.current.position.z < RESET_Z) cluster.current.position.z += wrapDistance
  })

  return <group ref={cluster} position={position}>{children}</group>
}

function CloudCluster({ position, speed, wrapDistance, index }) {
  const scale = 0.7 + (index % 3) * 0.18
  return (
    <MovingCluster position={position} speed={speed} wrapDistance={wrapDistance}>
      <mesh geometry={CLOUD_GEOMETRY} material={CLOUD_MATERIAL} position={[-0.65 * scale, 0, 0]} scale={[scale, 0.42 * scale, 0.48 * scale]} />
      <mesh geometry={CLOUD_GEOMETRY} material={CLOUD_MATERIAL} position={[0, 0.12 * scale, 0]} scale={[0.82 * scale, 0.58 * scale, 0.58 * scale]} />
      <mesh geometry={CLOUD_GEOMETRY} material={CLOUD_MATERIAL} position={[0.62 * scale, 0, 0.04]} scale={[0.7 * scale, 0.38 * scale, 0.44 * scale]} />
    </MovingCluster>
  )
}

function IslandPlatform({ position, speed, wrapDistance, index }) {
  const size = 0.85 + (index % 3) * 0.2
  return (
    <MovingCluster position={position} speed={speed} wrapDistance={wrapDistance}>
      <mesh
        geometry={ISLAND_TOP_GEOMETRY}
        material={GRASS_MATERIAL}
        scale={[size, 1, size * 0.82]}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={ISLAND_ROCK_GEOMETRY}
        material={ROCK_MATERIAL}
        position={[0, -0.48 * size, 0]}
        scale={[0.72 * size, 0.6 * size, 0.64 * size]}
        castShadow
      />
      <mesh
        geometry={ISLAND_ROCK_GEOMETRY}
        material={ROCK_MATERIAL}
        position={[0.14 * size, -0.88 * size, 0.04]}
        scale={[0.28 * size, 0.52 * size, 0.3 * size]}
        castShadow
      />
    </MovingCluster>
  )
}

function InfiniteSkyEnvironment({
  speed = 8,
  cloudCount = 8,
  islandCount = 7,
  windCount = 36,
  dustCount = 48,
}) {
  const clouds = useMemo(
    () => createPositions(cloudCount, 713, [[-8, 8], [0, 5], [5, FIELD_LENGTH - 4]]),
    [cloudCount],
  )
  const islands = useMemo(
    () => createPositions(islandCount, 2903, [[-7, 7], [-2.2, 0.8], [6, FIELD_LENGTH - 2]]),
    [islandCount],
  )

  return (
    <group>
      {clouds.map((position, index) => (
        <CloudCluster
          key={`cloud-${index}`}
          position={position}
          speed={speed * 0.55}
          wrapDistance={FIELD_LENGTH}
          index={index}
        />
      ))}
      {islands.map((position, index) => (
        <IslandPlatform
          key={`island-${index}`}
          position={position}
          speed={speed}
          wrapDistance={FIELD_LENGTH}
          index={index}
        />
      ))}
      <ParticleField
        count={windCount}
        seed={4821}
        speed={speed * 1.8}
        minSize={0.14}
        maxSize={0.42}
        geometry={WIND_GEOMETRY}
        material={WIND_MATERIAL}
        streaks
      />
      <ParticleField
        count={dustCount}
        seed={971}
        speed={speed * 1.35}
        minSize={0.035}
        maxSize={0.11}
        geometry={DUST_GEOMETRY}
        material={DUST_MATERIAL}
      />
    </group>
  )
}

export default memo(InfiniteSkyEnvironment)
