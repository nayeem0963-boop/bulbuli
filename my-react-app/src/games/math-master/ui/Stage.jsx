/**
 * The 3D stage beside the question: the lazy scene, a loading spinner, a text caption describing the
 * figure (read by screen readers and always visible), and a readable fallback when WebGL is missing.
 */
import { memo, useState } from 'react'
import GameViewport from '../../../components/game/GameViewport.jsx'
import { isBoardVisual } from './visualKinds.js'
import { MathMasterScene } from './sceneLoader.js'

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')))
  } catch {
    return false
  }
}

function FigureFallback({ level, figure, text }) {
  return (
    <div className="mm-fallback" role="note">
      <span className="mm-fallback-glyph" aria-hidden="true">{level.glyph}</span>
      <p>{text.noWebgl}</p>
      {figure && <p className="mm-fallback-figure">{figure}</p>}
    </div>
  )
}

function Stage({ level, question, figureKey, feedback, pickable, onPick, reveal, text }) {
  const [webgl] = useState(hasWebGL)
  const visual = question?.visual ?? null
  const figure = question?.figure ?? null
  const fallback = <FigureFallback level={level} figure={figure} text={text} />
  const hint = !visual ? null : isBoardVisual(visual) ? text.dragToTilt : text.dragToRotate

  return (
    <figure className="mm-stage" style={{ '--mm-level': level.color }}>
      <div className="mm-stage-view">
        {webgl ? (
          <GameViewport label={text.loading} tone="dark">
            <MathMasterScene
              level={level}
              visual={visual}
              figureKey={figureKey}
              feedback={feedback}
              pickable={pickable}
              onPick={onPick}
              reveal={reveal}
              fallback={fallback}
              loadingLabel={text.loading}
            />
          </GameViewport>
        ) : fallback}
        {hint && webgl && <span className="mm-stage-hint" aria-hidden="true">{hint}</span>}
      </div>
      {figure && (
        <figcaption className="mm-stage-caption">
          <span className="mm-stage-caption-label">{text.figure}:</span> {figure}
        </figcaption>
      )}
    </figure>
  )
}

export default memo(Stage)
