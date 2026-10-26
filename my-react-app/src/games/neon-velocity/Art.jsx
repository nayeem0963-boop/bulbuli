// Home-page tile picture. Inline SVG only, so three.js and the game stay out of the home page bundle.
// A synthwave sun over a neon grid, with Bulbuli streaking past on a light trail.
export default function NeonVelocityArt() {
  return (
    <div className="art art-neon-velocity" aria-hidden="true">
      <svg viewBox="0 0 160 110" width="100%" height="100%" style={{ maxWidth: 170, overflow: 'visible' }}>
        <defs>
          <linearGradient id="nv-art-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1a0633" />
            <stop offset="1" stopColor="#07020f" />
          </linearGradient>
          <linearGradient id="nv-art-sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd23f" />
            <stop offset="1" stopColor="#ff2bd6" />
          </linearGradient>
          <linearGradient id="nv-art-trail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#7b2bff" stopOpacity="0" />
            <stop offset="1" stopColor="#ff2bd6" />
          </linearGradient>
          <clipPath id="nv-art-frame"><rect x="2" y="2" width="156" height="106" rx="14" /></clipPath>
        </defs>
        <g clipPath="url(#nv-art-frame)">
          <rect x="0" y="0" width="160" height="110" fill="url(#nv-art-sky)" />
          {/* sun with slits */}
          <circle cx="80" cy="56" r="30" fill="url(#nv-art-sun)" />
          {[44, 52, 59, 65, 70].map((y, i) => (
            <rect key={y} x="48" y={y} width="64" height={1.5 + i * 0.8} fill="#1a0633" />
          ))}
          {/* grid floor */}
          <rect x="0" y="72" width="160" height="38" fill="#0c0420" />
          <g stroke="#ff2bd6" strokeWidth="1.2" opacity="0.9">
            <path d="M0 72 H160 M0 78 H160 M0 86 H160 M0 97 H160" />
            <path d="M80 72 L80 110 M80 72 L50 110 M80 72 L20 110 M80 72 L-10 110 M80 72 L110 110 M80 72 L140 110 M80 72 L170 110" />
          </g>
        </g>
        {/* trail + Bulbuli */}
        <path d="M16 70 Q60 62 104 50" stroke="url(#nv-art-trail)" strokeWidth="7" strokeLinecap="round" fill="none" />
        <g transform="translate(112 46) rotate(-14)" stroke="#07020f" strokeWidth="2.5" strokeLinejoin="round">
          <ellipse cx="0" cy="0" rx="12" ry="8.5" fill="#1b1636" />
          <path d="M-4 -2 L-14 -12 L2 -5 Z" fill="#22f3ff" />
          <circle cx="9" cy="-6" r="6" fill="#1b1636" />
          <path d="M8 -12 L5 -20 L12 -12 Z" fill="#ff2bd6" />
          <circle cx="11" cy="-5" r="1.6" fill="#fff" stroke="none" />
          <circle cx="8" cy="-2.5" r="2" fill="#ff3355" stroke="none" />
          <path d="M15 -6 L21 -5 L15 -3 Z" fill="#ffd23f" />
        </g>
        {/* crystals */}
        <g stroke="#07020f" strokeWidth="2" strokeLinejoin="round">
          <path d="M136 20 L141 28 L136 36 L131 28 Z" fill="#22f3ff" />
          <path d="M24 22 L28 28 L24 34 L20 28 Z" fill="#ff2bd6" />
        </g>
        <rect x="2" y="2" width="156" height="106" rx="14" fill="none" stroke="#1b2a49" strokeWidth="3" />
      </svg>
    </div>
  )
}
