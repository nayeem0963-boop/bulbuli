/**
 * The Math Hero series' home-page tile picture, shared by all three games so they read as one family:
 *
 *   tier 1  Math Hero        3 + 4 = ?   a floating "+" cube        sunny tile
 *   tier 2  Math Hero Pro    3 × 4 = ?   a floating fraction coin   sky tile
 *   tier 3  Math Hero Pro+   3x + 5      a floating triangle prism  berry tile
 *
 * A 3D scene in plain DOM + CSS (no three.js on the home page): chunky extruded numbers bob above a
 * glowing navy platform, tilted in perspective, with a series plate (one, two or three pips) in the
 * corner. Styles: `.art-mh3d` in arcade/arcade.css. Decorative, so hidden from screen readers.
 */
const SCENES = {
  1: { glyphs: ['3', '+', '4', '=', '?'], prop: 'cube', tier: '' },
  2: { glyphs: ['3', '×', '4', '=', '?'], prop: 'coin', tier: 'PRO' },
  3: { glyphs: ['3', 'x', '+', '5'], prop: 'prism', tier: 'PRO+' },
}

const OPERATORS = new Set(['+', '−', '×', '÷', '='])

export default function MathHeroSeriesArt({ tier = 1 }) {
  const scene = SCENES[tier] ?? SCENES[1]
  return (
    <div className={`art art-mh3d is-tier-${tier}`} aria-hidden="true">
      <div className="mh3d-stage">
        <span className="mh3d-platform" />
        <span className="mh3d-floor-shadow" />
        <span className="mh3d-sum">
          {scene.glyphs.map((glyph, i) => (
            <span
              key={i}
              className={`mh3d-glyph${OPERATORS.has(glyph) ? ' is-op' : ''}${glyph === '?' ? ' is-ask' : ''}${glyph === 'x' ? ' is-var' : ''}`}
              style={{ '--i': i }}
            >
              {glyph}
            </span>
          ))}
        </span>
        <span className={`mh3d-prop is-${scene.prop}`}>
          {scene.prop === 'cube' && <span className="mh3d-cube-face">+</span>}
        </span>
      </div>
      {/* the series plate: one pip per game in the series, lit up to this one */}
      <span className="mh3d-series">
        {[1, 2, 3].map((pip) => <i key={pip} className={pip <= tier ? 'is-on' : ''} />)}
        {scene.tier && <b>{scene.tier}</b>}
      </span>
    </div>
  )
}
