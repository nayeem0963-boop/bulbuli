// Home-page tile picture (and the start screen's preview): the smiling ball rolling down a
// three-lane track, a crate and a star ahead. Inline SVG, so three.js stays out of the home page.
export default function BallDashArt({ large = false }) {
  return (
    <div className={`art art-ball-dash${large ? ' is-large' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 160 110" width="100%" height="100%" style={{ maxWidth: large ? 420 : 190, overflow: 'visible' }}>
        {/* hills */}
        <path d="M0 52 Q28 30 56 50 Q84 28 112 48 Q138 32 160 46 L160 60 L0 60 Z" fill="#7fd36b" stroke="#1b2a49" strokeWidth="2.5" strokeLinejoin="round" />
        {/* track in perspective */}
        <path d="M66 46 L94 46 L148 110 L12 110 Z" fill="#ffe2a0" stroke="#1b2a49" strokeWidth="3" strokeLinejoin="round" />
        <path d="M75 46 L57 110 M85 46 L103 110" stroke="#fff" strokeWidth="3" strokeDasharray="7 6" />
        {/* crate ahead in the right lane */}
        <g stroke="#1b2a49" strokeWidth="2.5" strokeLinejoin="round">
          <rect x="89" y="50" width="14" height="13" rx="2" fill="#f2a33a" />
          <path d="M89 56 H103" stroke="#c9761f" />
        </g>
        {/* a star in the left lane */}
        <path d="M70 58 l2.6 5.2 5.8 .8 -4.2 4.1 1 5.7 -5.2 -2.7 -5.2 2.7 1 -5.7 -4.2 -4.1 5.8 -.8z" fill="#ffd23f" stroke="#1b2a49" strokeWidth="2" strokeLinejoin="round" />
        {/* the ball */}
        <ellipse cx="80" cy="104" rx="20" ry="4.5" fill="#1b2a49" opacity="0.2" />
        <circle cx="80" cy="86" r="18" fill="#ffc93c" stroke="#1b2a49" strokeWidth="3" />
        <path d="M63 82 Q80 74 97 82" fill="none" stroke="#ff5a6e" strokeWidth="4" strokeLinecap="round" />
        <circle cx="73.5" cy="88" r="3.6" fill="#fff" stroke="#1b2a49" strokeWidth="1.5" />
        <circle cx="86.5" cy="88" r="3.6" fill="#fff" stroke="#1b2a49" strokeWidth="1.5" />
        <circle cx="74" cy="88.5" r="1.8" fill="#1b2a49" />
        <circle cx="87" cy="88.5" r="1.8" fill="#1b2a49" />
        <path d="M75 95 Q80 99 85 95" fill="none" stroke="#1b2a49" strokeWidth="2" strokeLinecap="round" />
        <circle cx="68" cy="94" r="2.5" fill="#ff8fa3" opacity="0.8" />
        <circle cx="92" cy="94" r="2.5" fill="#ff8fa3" opacity="0.8" />
        {/* speed lines */}
        <path d="M54 80 h-10 M56 88 h-14 M104 80 h10 M102 88 h14" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      </svg>
    </div>
  )
}
