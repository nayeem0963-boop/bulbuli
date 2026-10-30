import { useState } from 'react'
import { Star } from 'lucide-react'

const COLORS = ['#FACC15', '#FDE68A', '#38BDF8', '#A78BFA', '#34D399', '#FB7185', '#F472B6']

function makePieces(count, spread) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: spread === 'burst' ? 35 + Math.random() * 30 : Math.random() * 100,
    delay: Math.random() * (spread === 'burst' ? 0.15 : 0.9),
    duration: 1.4 + Math.random() * 1.6,
    drift: (Math.random() - 0.5) * (spread === 'burst' ? 260 : 120),
    spin: 360 + Math.random() * 720,
    color: COLORS[i % COLORS.length],
    round: i % 3 === 0,
    size: 6 + Math.random() * 7,
  }))
}

/**
 * Falling confetti (CSS only, so it costs nothing once it's done). Give it a new `key` to fire again.
 * It's purely decorative and switches itself off for players who ask for reduced motion (see the base CSS).
 */
export function Confetti({ count = 60, spread = 'rain' }) {
  const [pieces] = useState(() => makePieces(count, spread))
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden mhpp-confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className={`absolute -top-4 block mhpp-confetti-piece ${p.round ? 'rounded-full' : 'rounded-[2px]'}`}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.45,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--mhpp-drift': `${p.drift}px`,
            '--mhpp-spin': `${p.spin}deg`,
          }}
        />
      ))}
    </div>
  )
}

/** A row of 0–3 gold stars. `animate` pops earned stars in one after another. */
export function StarRow({ stars, size = 20, animate = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => {
        const on = i < stars
        return (
          <Star
            key={i}
            size={size}
            strokeWidth={2.25}
            aria-hidden="true"
            focusable="false"
            className={`${on ? 'fill-mf-star text-mf-star drop-shadow-[0_0_8px_rgba(252,211,77,0.6)]' : 'fill-mf-star-off/60 text-mf-star-off'} ${on && animate ? 'mhpp-anim-star' : ''}`}
            style={on && animate ? { animationDelay: `${0.35 + i * 0.3}s` } : undefined}
          />
        )
      })}
    </span>
  )
}
