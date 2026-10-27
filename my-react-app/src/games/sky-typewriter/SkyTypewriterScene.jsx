/**
 * SkyTypewriter 3D: everything that needs three.js, in one lazily loaded chunk.
 *
 * SkyTypewriterGame.jsx (the screen: start card, typing, results) loads with the game and shows
 * at once. This module (the <Canvas>, sky, Bulbuli and the word spawner, plus three.js, R3F,
 * drei <Text>/troika) arrives behind it, under a <GameViewport> spinner. The spinner stays until
 * the first frame is drawn, so the shader compile for the 2048 shadow map doesn't show as a
 * frozen canvas.
 *
 * Same props as before the split: the canvas props of SkyTypewriter3D plus what its three
 * children took. The <Canvas> still stays mounted across Play Again (no WebGL context churn).
 *
 * @typedef {object} SkyTypewriterSceneProps
 * @property {string} [className]
 * @property {{ current: Array<object> }} effectsRef   hit-beam events, drained by WordHitEffects
 * @property {number} score
 * @property {number} lives
 * @property {number} combo
 * @property {boolean} paused
 * @property {string} status                           SKY_TYPEWRITER_STATUS value
 * @property {() => void} onTogglePause
 * @property {number} worldSpeed                       InfiniteSkyEnvironment scroll speed
 * @property {string[]} words                          word list for WordSpawner
 * @property {number} runId                            new id = WordSpawner clears the sky
 * @property {boolean} active                          words move / spawn only while true
 * @property {{ current: Array<object> }} wordsRef     live words, read by useWordTyping
 * @property {(word: object) => void} onMiss
 * @property {string} [loadingLabel]                   spinner text until the first frame
 */
import { useCallback, useState } from 'react'
import GameLoadingSpinner from '../../components/game/GameLoadingSpinner.jsx'
import SceneReady from '../../components/game/SceneReady.jsx'
import InfiniteSkyEnvironment from '../InfiniteSkyEnvironment.jsx'
import PlayerBird3D from '../PlayerBird3D.jsx'
import SkyTypewriter3D from '../SkyTypewriter3D.jsx'
import WordSpawner from '../WordSpawner.jsx'

/** @param {SkyTypewriterSceneProps} props */
export default function SkyTypewriterScene({
  className,
  effectsRef,
  score,
  lives,
  combo,
  paused,
  status,
  onTogglePause,
  worldSpeed,
  words,
  runId,
  active,
  wordsRef,
  onMiss,
  loadingLabel,
}) {
  const [ready, setReady] = useState(false)
  const markReady = useCallback(() => setReady(true), [])

  return (
    <>
      <SkyTypewriter3D
        className={className}
        effectsRef={effectsRef}
        score={score}
        lives={lives}
        combo={combo}
        paused={paused}
        status={status}
        onTogglePause={onTogglePause}
      >
        <InfiniteSkyEnvironment speed={worldSpeed} />
        <PlayerBird3D />
        <WordSpawner
          words={words}
          score={score}
          runId={runId}
          active={active}
          wordsRef={wordsRef}
          onMiss={onMiss}
        />
        <SceneReady onReady={markReady} />
      </SkyTypewriter3D>
      {!ready && <GameLoadingSpinner label={loadingLabel} fill delayMs={0} />}
    </>
  )
}
