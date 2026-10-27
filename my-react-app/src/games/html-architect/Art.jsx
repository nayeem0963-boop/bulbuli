/** Home-page tile: a code tag building a little tower with a neon sign. Plain SVG, no extra CSS. */
export default function HTMLArchitectArt() {
  return (
    <div className="art art-html-architect" aria-hidden="true" style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <svg viewBox="0 0 160 110" width="100%" height="100%" style={{ maxHeight: 120 }}>
        {/* floating grass plot */}
        <path d="M30 88 L130 88 L118 100 L42 100 Z" fill="#8b5e3c" />
        <rect x="26" y="82" width="108" height="8" rx="3" fill="#7cc957" />
        {/* tower blocks */}
        <rect x="58" y="56" width="44" height="26" rx="3" fill="#ffc145" stroke="#241f3d" strokeWidth="2" />
        <rect x="64" y="34" width="32" height="22" rx="3" fill="#4ecdc4" stroke="#241f3d" strokeWidth="2" />
        <rect x="70" y="64" width="8" height="8" fill="#fff" opacity="0.8" />
        <rect x="83" y="64" width="8" height="8" fill="#fff" opacity="0.8" />
        {/* neon sign */}
        <rect x="56" y="14" width="48" height="16" rx="4" fill="#1b1530" stroke="#2ef2ff" strokeWidth="2" />
        <text x="80" y="26" textAnchor="middle" fontFamily="monospace" fontWeight="700" fontSize="10" fill="#ff7cc4">&lt;h1&gt;</text>
        {/* code brackets */}
        <text x="20" y="60" fontFamily="monospace" fontWeight="800" fontSize="26" fill="#7b6cff">&lt;</text>
        <text x="122" y="60" fontFamily="monospace" fontWeight="800" fontSize="26" fill="#7b6cff">/&gt;</text>
        {/* Bulbuli */}
        <ellipse cx="116" cy="76" rx="9" ry="7" fill="#6b5a4c" />
        <circle cx="121" cy="68" r="5.5" fill="#1d1c22" />
        <path d="M119 63 L121 57 L124 63 Z" fill="#1d1c22" />
        <circle cx="123" cy="67" r="1.4" fill="#fff" />
        <path d="M126 68 L130 69 L126 70 Z" fill="#f2b33d" />
        <circle cx="109" cy="80" r="2.5" fill="#e0283f" />
      </svg>
    </div>
  )
}
