import { Brain, ChartPie, Divide, Plus, X } from 'lucide-react'

/** Each level's icon (by `level.icon` in engine.js). */
export const LEVEL_ICONS = { plus: Plus, times: X, divide: Divide, pie: ChartPie, brain: Brain }

/**
 * Each mission's own colour (by `level.accent`). Cards set it as --lvl (style={lvlStyle(accent)} on an
 * element with the `mhp-lvl` class), and Tailwind reads it as bg-lvl / border-lvl / text-lvl-ink.
 */
export const ACCENT_HEX = { sky: '#38bdf8', violet: '#a78bfa', emerald: '#34d399', rose: '#fb7185', amber: '#fbbf24' }
export const lvlStyle = (accent) => ({ '--lvl': ACCENT_HEX[accent] ?? ACCENT_HEX.sky })

/** The maths symbols floating on each mission card's picture. */
export const LEVEL_SYMBOLS = {
  plus: ['+', '−', '=', '7 + 5'],
  times: ['×', '6 × 7', '×', '3 × 4'],
  divide: ['÷', '12 ÷ 3', '÷', '='],
  pie: ['½', '¼', '⅓', '¾'],
  brain: ['?', '2, 4, 6…', '∴', '?'],
}

/** The gold "go" button used for every main action. */
export const GOLD_BUTTON =
  'inline-flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-0 bg-gradient-to-b from-yellow-300 to-amber-400 px-6 font-hero text-lg font-extrabold text-mf-on-gold shadow-[0_0_24px_-8px_rgba(250,204,21,0.8),inset_0_-3px_0_rgba(0,0,0,0.18)] transition duration-150 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-mf-focus'

/** The quiet outlined button next to it. */
export const GHOST_BUTTON =
  'inline-flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-mf-line bg-mf-panel px-5 font-hero text-lg font-bold text-mf-text transition duration-150 hover:-translate-y-0.5 hover:border-mf-accent active:translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-mf-focus'

/** The round header tools: light/dark and full screen. */
export const TOOL_BUTTON =
  'grid size-12 shrink-0 cursor-pointer place-items-center rounded-2xl border-2 border-mf-line bg-mf-panel p-0 text-mf-text transition hover:-translate-y-0.5 hover:border-mf-gold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-mf-focus'

/** The card every screen is built from. */
export const CARD = 'rounded-3xl border border-mf-line bg-mf-panel/90 shadow-[var(--mf-shadow)] backdrop-blur-sm'
