import { Gem } from 'lucide-react'

/**
 * Shared surface + tag styles for the Profile & Creator Shop, so every card has the same
 * contrast on the slate-900 page: raised slate-800 cards with a visible slate-700 edge, and
 * darker slate-900 insets inside them.
 */
export const CARD = 'rounded-2xl border border-slate-700 bg-slate-800/60 shadow-lg shadow-black/25'
export const CARD_PAD = 'p-4 sm:p-5'
export const INSET = 'rounded-xl border border-slate-700/80 bg-slate-900/70'
export const H2 = 'font-display text-lg font-bold tracking-tight text-white sm:text-xl'

const TAG_TONES = {
  equipped: 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/50',
  owned: 'bg-sky-400/10 text-sky-200 ring-sky-400/40',
  locked: 'bg-slate-950/80 text-slate-300 ring-slate-600',
  badge: 'bg-amber-400/15 text-amber-200 ring-amber-400/50',
  earned: 'bg-amber-400/20 text-amber-100 ring-amber-300/60',
  test: 'bg-fuchsia-500/20 text-fuchsia-100 ring-fuchsia-400/60',
  live: 'bg-rose-500/20 text-rose-100 ring-rose-400/60',
}

/** Small high-contrast status pill ("Equipped", "Locked", "Earned", "TEST"…). */
export function StatusTag({ tone = 'owned', icon: Icon, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ${TAG_TONES[tone]} ${className}`}>
      {Icon && <Icon className="size-3" aria-hidden="true" />}
      {children}
    </span>
  )
}

const gemFmt = new Intl.NumberFormat('en-US')

/** Gem currency badge: purple pill with a soft glow. `signed` shows +/−. */
export function GemBadge({ amount, size = 'sm', signed = false, className = '' }) {
  const text = signed && amount > 0 ? `+${gemFmt.format(amount)}` : gemFmt.format(amount)
  const sz = size === 'lg' ? 'px-3 py-1 text-sm gap-1.5' : 'px-2 py-0.5 text-xs gap-1'
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full bg-purple-500/15 font-bold tabular-nums text-purple-100 shadow-[0_0_12px_rgba(168,85,247,0.25)] ring-1 ring-purple-400/50 ${sz} ${className}`}>
      <Gem className={size === 'lg' ? 'size-4 text-purple-300' : 'size-3.5 text-purple-300'} aria-hidden="true" />
      {text}
      <span className="sr-only"> gems</span>
    </span>
  )
}
