/** Home-page tile: a wireframe solid floating over the lab platform. Plain SVG, no three.js. */
export default function MathMasterArt() {
  return (
    <div className="art art-math-master" aria-hidden="true" style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <svg viewBox="0 0 160 110" width="100%" height="100%" style={{ maxHeight: 120 }}>
        <defs>
          <radialGradient id="mm-art-glow" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#3b4fb0" />
            <stop offset="100%" stopColor="#0d1433" />
          </radialGradient>
        </defs>
        <rect x="6" y="4" width="148" height="102" rx="18" fill="url(#mm-art-glow)" stroke="#1b2a49" strokeWidth="3" />
        {/* platform */}
        <ellipse cx="80" cy="88" rx="44" ry="9" fill="#1c2756" stroke="#ffc93c" strokeWidth="2" />
        {/* icosahedron-ish wireframe */}
        <g fill="none" stroke="#b48cff" strokeWidth="2" strokeLinejoin="round">
          <polygon points="80,20 106,36 106,64 80,78 54,64 54,36" fill="rgb(180 140 255 / 22%)" />
          <polyline points="80,20 80,50 106,64" />
          <polyline points="80,50 54,64" />
          <polyline points="54,36 80,50 106,36" />
        </g>
        {/* floating symbols */}
        <text x="22" y="34" fontFamily="Baloo 2, sans-serif" fontWeight="800" fontSize="16" fill="#ffc93c">x²</text>
        <text x="122" y="32" fontFamily="Baloo 2, sans-serif" fontWeight="800" fontSize="17" fill="#2ee6c8">π</text>
        <text x="20" y="78" fontFamily="Baloo 2, sans-serif" fontWeight="800" fontSize="15" fill="#5db8ff">√</text>
        <text x="124" y="76" fontFamily="Baloo 2, sans-serif" fontWeight="800" fontSize="15" fill="#ff7cc4">∑</text>
      </svg>
    </div>
  )
}
