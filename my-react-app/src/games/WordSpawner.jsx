import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Text } from '@react-three/drei'
import { getSkyTypewriterDifficulty } from './skyTypewriterDifficulty.js'

const DEFAULT_WORDS = ['sky', 'bird', 'cloud', 'fly', 'star', 'flower', 'rainbow', 'sunshine', 'butterfly', 'adventure']
const DEFAULT_X_RANGE = [-6, 6]
const DEFAULT_Y_RANGE = [-0.5, 4]

function randomInRange([min, max]) {
  return min + Math.random() * (max - min)
}

function WordTarget({ word, registerGroup }) {
  const group = useRef()
  const characterSpacing = 0.4

  useEffect(() => {
    registerGroup(word.id, group.current)
    return () => registerGroup(word.id, null)
  }, [registerGroup, word.id])

  return (
    <group ref={group} position={[word.position.x, word.position.y, word.position.z]} rotation-y={Math.PI}>
      {word.target.split('').map((character, index) => (
        <Text
          key={`${word.id}-${index}`}
          position={[(index - (word.target.length - 1) / 2) * characterSpacing, 0, 0]}
          color={index < word.progressIndex ? '#68f08a' : '#ffffff'}
          fontSize={0.72}
          anchorX="center"
          anchorY="middle"
          outlineColor="#17314a"
          outlineWidth={0.035}
          material-toneMapped={false}
        >
          {character}
        </Text>
      ))}
    </group>
  )
}

function WordSpawner({
  words = DEFAULT_WORDS,
  score = 0,
  runId = 0,
  active = true,
  spawnInterval = 2.5,
  speed = 8,
  spawnZ = 36,
  despawnZ = -7,
  maxWords = 5,
  xRange = DEFAULT_X_RANGE,
  yRange = DEFAULT_Y_RANGE,
  wordsRef,
  onSpawn,
  onPass,
  onMiss,
}) {
  const [visibleWords, setVisibleWords] = useState([])
  const records = useRef([])
  const groups = useRef(new Map())
  const renderedProgress = useRef(new Map())
  const flashOverlay = useRef(null)
  const flashStrength = useRef(0)
  const elapsed = useRef(0)
  const nextId = useRef(0)
  const wordIndex = useRef(0)
  const difficulty = getSkyTypewriterDifficulty(score)

  useEffect(() => {
    records.current = []
    groups.current.clear()
    renderedProgress.current.clear()
    elapsed.current = 0
    nextId.current = 0
    wordIndex.current = 0
    setVisibleWords([])
    if (wordsRef) wordsRef.current = []
  }, [runId, wordsRef])

  useEffect(() => {
    return () => {
      if (wordsRef) wordsRef.current = []
    }
  }, [wordsRef])

  const registerGroup = useCallback((id, group) => {
    if (group) groups.current.set(id, group)
    else groups.current.delete(id)
  }, [])

  useFrame((_, delta) => {
    flashStrength.current = Math.max(0, flashStrength.current - delta * 2.8)
    if (flashOverlay.current) flashOverlay.current.style.opacity = String(flashStrength.current * 0.5)
    // Paused, game over, victory or start screen: words hold still, nothing spawns, nothing is missed.
    if (!active || !Array.isArray(words) || words.length === 0) return

    elapsed.current += delta
    let changed = false

    for (const word of records.current) {
      if (word.completed) {
        changed = true
        continue
      }
      word.position.z -= speed * difficulty.speedMultiplier * delta
      const group = groups.current.get(word.id)
      if (group) group.position.z = word.position.z
      if (renderedProgress.current.get(word.id) !== word.progressIndex) {
        renderedProgress.current.set(word.id, word.progressIndex)
        changed = true
      }
    }

    const missed = records.current.filter((word) => !word.completed && word.position.z <= despawnZ)
    if (missed.length) {
      flashStrength.current = 1
      missed.forEach((word) => onMiss?.(word))
    }

    const removed = records.current.filter((word) => word.completed || word.position.z <= despawnZ)
    if (removed.length) {
      records.current.splice(
        0,
        records.current.length,
        ...records.current.filter((word) => !word.completed && word.position.z > despawnZ),
      )
      missed.forEach((word) => onPass?.(word))
      removed.forEach((word) => renderedProgress.current.delete(word.id))
      changed = true
    }

    const interval = Math.max(0.1, spawnInterval * difficulty.spawnIntervalMultiplier)
    if (elapsed.current >= interval && records.current.length < maxWords) {
      elapsed.current %= interval
      const eligibleWords = words.filter((word) => (
        String(word).length >= difficulty.minWordLength
      ))
      const wordPool = eligibleWords.length ? eligibleWords : words
      const target = wordPool[wordIndex.current % wordPool.length]
      wordIndex.current += 1
      const word = {
        id: nextId.current++,
        target: String(target),
        progressIndex: 0,
        position: {
          x: randomInRange(xRange),
          y: randomInRange(yRange),
          z: spawnZ,
        },
      }
      records.current.push(word)
      renderedProgress.current.set(word.id, word.progressIndex)
      onSpawn?.(word)
      changed = true
    } else if (elapsed.current >= interval) {
      elapsed.current = interval
    }
    if (changed) {
      setVisibleWords([...records.current])
      if (wordsRef) wordsRef.current = [...records.current]
    }
  })

  return (
    <>
      {visibleWords.map((word) => (
        <WordTarget key={word.id} word={word} registerGroup={registerGroup} />
      ))}
      <Html fullscreen>
        <div
          ref={flashOverlay}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: '#ff4b55',
            opacity: 0,
            pointerEvents: 'none',
          }}
        />
      </Html>
    </>
  )
}

export default memo(WordSpawner)
