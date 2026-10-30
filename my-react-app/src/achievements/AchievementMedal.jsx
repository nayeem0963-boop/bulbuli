import { useId } from 'react'

/**
 * The gold achievement medal on screen (celebration, share panel, verification page): ribbon
 * tails in the badge category's colours, a gold rosette, and the badge's own icon in the middle.
 * The certificate and share image draw the same medal on a canvas (render/canvasKit.js drawMedal).
 */
const RIBBONS = {
  level: ['#7c3aed', '#5b21b6'],
  skill: ['#0891b2', '#0e7490'],
  mastery: ['#b91c1c', '#1e3a8a'],
}

const BURST = Array.from({ length: 48 }, (_, i) => {
  const a = (i / 48) * Math.PI * 2
  const r = i % 2 ? 40 : 46
  return `${i ? 'L' : 'M'}${(50 + r * Math.sin(a)).toFixed(2)} ${(50 - r * Math.cos(a)).toFixed(2)}`
}).join(' ') + 'Z'

export default function AchievementMedal({ icon, category = 'mastery', className = '', ribbons = true, label }) {
  const [left, right] = RIBBONS[category] ?? RIBBONS.mastery
  const id = useId().replace(/:/g, '')
  return (
    <span className={`amd ${className}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
      <svg viewBox="0 0 100 124" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-burst`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f6d365" />
            <stop offset="0.55" stopColor="#d4a017" />
            <stop offset="1" stopColor="#a87b05" />
          </linearGradient>
          <radialGradient id={`${id}-disc`} cx="0.38" cy="0.32" r="0.75">
            <stop offset="0" stopColor="#fff6c9" />
            <stop offset="0.6" stopColor="#f5d061" />
            <stop offset="1" stopColor="#d9a91c" />
          </radialGradient>
        </defs>
        {ribbons && (
          <g className="amd-ribbons">
            <path d="M26 64h26l-4 58-10-8-12 8Z" fill={left} />
            <path d="M48 64h26l-2 58-12-8-10 8Z" fill={right} />
          </g>
        )}
        <path className="amd-burst" d={BURST} fill={`url(#${id}-burst)`} />
        <circle cx="50" cy="50" r="35" fill={`url(#${id}-disc)`} stroke="#a87b05" strokeWidth="1.4" />
        <circle cx="50" cy="50" r="30.5" fill="none" stroke="#a87b05" strokeWidth="0.8" strokeDasharray="2.4 2.4" />
      </svg>
      <span className="amd-icon">{icon || '★'}</span>
    </span>
  )
}
