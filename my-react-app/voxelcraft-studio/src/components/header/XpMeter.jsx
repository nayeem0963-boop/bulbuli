import { Zap } from 'lucide-react'
import { xpForLevel } from '../../data/mockData.js'

const fmt = new Intl.NumberFormat('en-US')

export default function XpMeter({ level, xp }) {
  const needed = xpForLevel(level)
  const pct = Math.min(100, Math.round((xp / needed) * 100))

  return (
    <div className="flex items-center gap-2.5" title={`${fmt.format(needed - xp)} XP to level ${level + 1}`}>
      <div className="relative grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-400/40">
        <span className="font-display text-sm font-bold text-emerald-300">{level}</span>
        <span className="sr-only">Level {level}</span>
      </div>
      <div className="w-28 sm:w-36">
        <div className="mb-1 flex items-center justify-between text-[11px] font-medium leading-none">
          <span className="flex items-center gap-1 text-emerald-300">
            <Zap className="size-3" aria-hidden="true" /> XP
          </span>
          <span className="tabular-nums text-slate-400">
            {fmt.format(xp)} / {fmt.format(needed)}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-800 ring-1 ring-slate-700/60"
          role="progressbar"
          aria-label="Experience toward next level"
          aria-valuemin={0}
          aria-valuemax={needed}
          aria-valuenow={xp}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.6)] transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
