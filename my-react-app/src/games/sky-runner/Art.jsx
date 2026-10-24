// Home-page tile picture. Inline SVG with its own styles, so it needs no CSS in
// src/arcade/arcade.css and keeps three.js out of the home page bundle.
export default function SkyRunnerArt() {
  return (
    <div className="art art-sky-runner" aria-hidden="true">
      <svg viewBox="0 0 160 110" width="100%" height="100%" style={{ maxWidth: 170, overflow: 'visible' }}>
        {/* lanes */}
        <path d="M70 18 L30 108 M90 18 L130 108" stroke="#fff" strokeWidth="3" strokeDasharray="7 7" opacity="0.8" />
        {/* cloud */}
        <g fill="#8f9cc0" stroke="#1b2a49" strokeWidth="3">
          <ellipse cx="118" cy="36" rx="20" ry="12" />
          <circle cx="110" cy="30" r="9" />
          <circle cx="124" cy="27" r="8" />
        </g>
        <circle cx="113" cy="37" r="2" fill="#1b2a49" />
        <circle cx="122" cy="37" r="2" fill="#1b2a49" />
        {/* stars */}
        <g fill="#ffd23f" stroke="#1b2a49" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M44 34 l3.5 7 7.7 1.1 -5.6 5.4 1.3 7.6 -6.9 -3.6 -6.9 3.6 1.3 -7.6 -5.6 -5.4 7.7 -1.1z" />
          <path d="M60 14 l2.4 4.9 5.4 .8 -3.9 3.8 .9 5.3 -4.8 -2.5 -4.8 2.5 .9 -5.3 -3.9 -3.8 5.4 -.8z" />
        </g>
        {/* Bulbuli from behind, wings up */}
        <g stroke="#1b2a49" strokeWidth="3" strokeLinejoin="round">
          <path d="M80 78 C64 62 46 60 34 66 C48 70 60 78 72 86 Z" fill="#5a4636" />
          <path d="M80 78 C96 62 114 60 126 66 C112 70 100 78 88 86 Z" fill="#5a4636" />
          <ellipse cx="80" cy="84" rx="13" ry="16" fill="#5a4636" />
          <circle cx="80" cy="68" r="10" fill="#2c2420" />
          <path d="M74 98 L80 108 L86 98 Z" fill="#e5322d" />
        </g>
      </svg>
    </div>
  )
}
