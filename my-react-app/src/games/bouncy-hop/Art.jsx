// Home-page tile picture (and the start screen's preview): round Bulbuli mid-bounce over floating
// neon number tiles counting by 2s. Inline SVG, so three.js stays out of the home page.
export default function BouncyHopArt({ large = false }) {
  const tile = (x, y, w, fill, glow, label, key) => (
    <g key={key}>
      <ellipse cx={x + w / 2} cy={y + 15} rx={w * 0.62} ry="5" fill={glow} opacity="0.45" />
      <rect x={x - 1.5} y={y - 1.5} width={w + 3} height="15" rx="7" fill={glow} />
      <rect x={x} y={y} width={w} height="12" rx="6" fill={fill} stroke="#1b2a49" strokeWidth="2" />
      <text x={x + w / 2} y={y + 9.6} textAnchor="middle" fontFamily="'Baloo 2', system-ui, sans-serif" fontWeight="800" fontSize="10" fill="#1b2a49">{label}</text>
    </g>
  )
  return (
    <div className={`art art-bouncy-hop${large ? ' is-large' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 160 110" width="100%" height="100%" style={{ maxWidth: large ? 420 : 190, overflow: 'visible' }}>
        {/* soft sky clouds and sparkles */}
        <g fill="#fff" opacity="0.9">
          <circle cx="22" cy="22" r="7" /><circle cx="31" cy="19" r="9" /><circle cx="41" cy="23" r="6" />
          <circle cx="126" cy="14" r="6" /><circle cx="134" cy="11" r="8" /><circle cx="143" cy="15" r="5" />
        </g>
        <g fill="#fff6c8">
          <path d="M60 10 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5z" />
          <path d="M146 44 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2z" />
          <path d="M12 56 l1 2.6 2.6 1 -2.6 1 -1 2.6 -1 -2.6 -2.6 -1 2.6 -1z" />
        </g>
        {/* tiles going into the distance: 2 4 6, and a wrong 5 */}
        {tile(64, 34, 22, '#c7a6ff', '#a96bff', '8', 'a')}
        {tile(98, 50, 26, '#ff9cc0', '#ff3fa4', '5', 'b')}
        {tile(44, 54, 28, '#6fcfff', '#00e1ff', '6', 'c')}
        {tile(28, 82, 36, '#7ee6a4', '#2dff8a', '4', 'd')}
        {tile(96, 84, 34, '#ffd45c', '#ffe600', '3', 'e')}
        {/* the bounce arc */}
        <path d="M46 80 Q52 30 58 52" fill="none" stroke="#fff" strokeWidth="2.5" strokeDasharray="3 4" strokeLinecap="round" opacity="0.95" />
        {/* the landing shadow */}
        <ellipse cx="58" cy="60" rx="8" ry="2.6" fill="#1b2a49" opacity="0.25" />
        {/* Bulbuli, stretched mid-air */}
        <g transform="translate(55 30)">
          <path d="M-2 -13 l-3 -8 5 5 2 -8 2 8 4 -5 -3 9z" fill="#2b2f45" />
          <ellipse cx="0" cy="0" rx="11" ry="13" fill="#ffc93c" stroke="#1b2a49" strokeWidth="2.5" />
          <ellipse cx="-11" cy="2" rx="4" ry="7" fill="#f2a91c" stroke="#1b2a49" strokeWidth="2" transform="rotate(25 -11 2)" />
          <ellipse cx="11" cy="2" rx="4" ry="7" fill="#f2a91c" stroke="#1b2a49" strokeWidth="2" transform="rotate(-25 11 2)" />
          <circle cx="-4" cy="-3" r="2.8" fill="#fff" stroke="#1b2a49" strokeWidth="1.2" />
          <circle cx="4" cy="-3" r="2.8" fill="#fff" stroke="#1b2a49" strokeWidth="1.2" />
          <circle cx="-3.6" cy="-2.6" r="1.4" fill="#1b2a49" />
          <circle cx="4.4" cy="-2.6" r="1.4" fill="#1b2a49" />
          <path d="M-2.5 1.5 L0 5 L2.5 1.5 Z" fill="#ff8a1f" stroke="#1b2a49" strokeWidth="1.2" strokeLinejoin="round" />
          <circle cx="-7" cy="3.5" r="2" fill="#ff5a6e" opacity="0.85" />
          <circle cx="7" cy="3.5" r="2" fill="#ff5a6e" opacity="0.85" />
        </g>
        {/* the target badge */}
        <g transform="translate(112 22)">
          <rect x="-20" y="-10" width="40" height="18" rx="9" fill="#ffc93c" stroke="#1b2a49" strokeWidth="2.5" />
          <text x="0" y="3.4" textAnchor="middle" fontFamily="'Baloo 2', system-ui, sans-serif" fontWeight="800" fontSize="11" fill="#1b2a49">+2</text>
        </g>
      </svg>
    </div>
  )
}
