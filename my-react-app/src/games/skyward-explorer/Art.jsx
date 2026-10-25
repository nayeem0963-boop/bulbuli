// Home-page tile picture. Inline SVG with its own styles, so three.js stays out of the home page bundle.
export default function SkywardExplorerArt() {
  return (
    <div className="art art-skyward-explorer" aria-hidden="true">
      <svg viewBox="0 0 160 110" width="100%" height="100%" style={{ maxWidth: 170, overflow: 'visible' }}>
        <g stroke="#1b2a49" strokeWidth="3" strokeLinejoin="round">
          {/* main island */}
          <path d="M28 58 H104 L92 70 L74 98 L60 72 Z" fill="#7b7888" />
          <path d="M26 52 H106 V60 H26 Z" fill="#79c85a" />
          {/* tree */}
          <path d="M46 52 V42" fill="none" />
          <path d="M36 44 L46 22 L56 44 Z" fill="#3f9e4a" />
          {/* pillars */}
          <path d="M70 52 V32 M84 52 V40" strokeWidth="6" stroke="#ddd2b8" />
          <path d="M70 52 V32 M84 52 V40" strokeWidth="2" fill="none" />
          {/* small platforms */}
          <path d="M112 40 H138 L130 46 L125 56 L120 46 Z" fill="#7b7888" />
          <path d="M111 36 H139 V41 H111 Z" fill="#79c85a" />
          <path d="M120 74 H142 L136 79 L131 88 L126 79 Z" fill="#7b7888" />
          <path d="M119 70 H143 V75 H119 Z" fill="#79c85a" />
        </g>
        {/* crystals */}
        <g stroke="#1b2a49" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M125 14 L131 24 L125 34 L119 24 Z" fill="#5ef2ff" />
          <path d="M131 52 L135 58 L131 64 L127 58 Z" fill="#ff7ad9" />
          <path d="M18 26 L23 34 L18 42 L13 34 Z" fill="#b48cff" />
        </g>
      </svg>
    </div>
  )
}
