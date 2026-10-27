/**
 * GameLoadingSpinner: the Bulbuli loader shown while a 3D game's code downloads, its glTF models
 * load and its shaders compile.
 *
 * It is plain DOM + CSS on purpose. It must never import three.js, @react-three/fiber or drei:
 * it ships in the arcade shell (GamePage / GameModal fallbacks), and pulling the 3D stack in here
 * would undo the code-splitting it exists to cover.
 *
 * Accessibility
 *   • role="status" + aria-live="polite": screen readers hear the label once, without interruption.
 *   • aria-busy on the element; the bird art is aria-hidden, the label is real text.
 *   • prefers-reduced-motion: the bird stops flapping and the dots fade instead of bouncing.
 *   • It appears after a short delay (CSS only), so a chunk that's already cached never flashes.
 *
 * Usage
 *   <Suspense fallback={<GameLoadingSpinner label={text.loading} fill />}>
 *     <ShapeScene … />
 *   </Suspense>
 *
 * @typedef {object} GameLoadingSpinnerProps
 * @property {string} [label]        what's happening, in the player's language. Default: English.
 * @property {number} [progress]     0–100 when known (e.g. drei's useProgress); omit for "busy".
 * @property {boolean} [fill]        cover the nearest positioned parent (a game stage / canvas box)
 *                                   instead of sitting in the page flow.
 * @property {'light'|'dark'} [tone] 'dark' for night-themed games (Neon Velocity).
 * @property {number} [delayMs]      wait this long before showing (default 150ms; 0 = at once).
 * @property {string} [className]
 */
import './GameLoadingSpinner.css'

const DEFAULT_LABEL = 'Getting the game ready…'

/** @param {GameLoadingSpinnerProps} props */
export default function GameLoadingSpinner({
  label = DEFAULT_LABEL,
  progress,
  fill = false,
  tone = 'light',
  delayMs = 150,
  className = '',
}) {
  const known = typeof progress === 'number' && Number.isFinite(progress)
  const pct = known ? Math.max(0, Math.min(100, Math.round(progress))) : null

  return (
    <div
      className={`bgl${fill ? ' bgl--fill' : ''} bgl--${tone} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{ '--bgl-delay': `${delayMs}ms` }}
    >
      <div className="bgl__card">
        <svg className="bgl__bird" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false">
          <ellipse className="bgl__shadow" cx="32" cy="58" rx="13" ry="3" />
          <g className="bgl__body">
            <path className="bgl__wing bgl__wing--back" d="M30 30 C18 18 8 22 6 30 C14 30 22 34 30 36 Z" />
            <ellipse className="bgl__belly" cx="34" cy="36" rx="16" ry="13" />
            <circle className="bgl__head" cx="44" cy="24" r="9" />
            <path className="bgl__crest" d="M42 15 C42 9 47 7 50 9 C47 11 46 13 47 16 Z" />
            <path className="bgl__beak" d="M52 23 L60 25 L52 28 Z" />
            <circle className="bgl__eye" cx="47" cy="22.5" r="1.8" />
            <circle className="bgl__cheek" cx="46" cy="28" r="2.4" />
            <path className="bgl__wing bgl__wing--front" d="M32 34 C22 24 12 28 10 36 C18 36 26 40 34 41 Z" />
          </g>
        </svg>

        <p className="bgl__label">{label}</p>

        {known ? (
          <div className="bgl__bar" aria-hidden="true">
            <span style={{ width: `${pct}%` }} />
          </div>
        ) : (
          <div className="bgl__dots" aria-hidden="true">
            <span /><span /><span />
          </div>
        )}
        {known && <span className="bgl__sr">{pct}%</span>}
      </div>
    </div>
  )
}
