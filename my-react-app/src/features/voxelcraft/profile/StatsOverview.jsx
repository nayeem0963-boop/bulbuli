import { ArrowBigUp, Layers, Medal, Zap } from 'lucide-react'
import { xpForLevel } from '../data/mockData.js'
import { publishedCount, upvotesReceived } from './achievements.js'
import { CARD } from './ui.jsx'

const fmt = new Intl.NumberFormat('en-US')
/** Gold / silver / bronze: metallic gradient + a matching glow ring so medals pop on dark cards. */
const MEDAL_STYLE = {
  1: { label: 'Gold', fill: 'from-yellow-100 via-amber-300 to-amber-600 text-amber-950', glow: 'ring-2 ring-amber-400/50 shadow-[0_0_14px_rgba(251,191,36,0.55)]' },
  2: { label: 'Silver', fill: 'from-white via-slate-200 to-slate-400 text-slate-900', glow: 'ring-2 ring-slate-300/50 shadow-[0_0_12px_rgba(203,213,225,0.4)]' },
  3: { label: 'Bronze', fill: 'from-orange-200 via-orange-400 to-orange-700 text-orange-950', glow: 'ring-2 ring-orange-400/50 shadow-[0_0_12px_rgba(251,146,60,0.45)]' },
}

export function MedalChip({ place, size = 'size-6' }) {
  const m = MEDAL_STYLE[place]
  if (!m) return null
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-full bg-gradient-to-br font-display text-[11px] font-black ${m.fill} ${m.glow}`} title={`${m.label} medal`}>
      {place}
      <span className="sr-only"> ({m.label} medal)</span>
    </span>
  )
}

function Tile({ icon: Icon, tone, label, children, sub }) {
  return (
    <div className={`${CARD} min-w-0 p-3 sm:p-4`}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">
        <Icon className={`size-4 shrink-0 ${tone}`} aria-hidden="true" /> <span className="truncate">{label}</span>
      </p>
      <div className="mt-1.5 font-display text-2xl font-bold tabular-nums text-white sm:mt-2 sm:text-3xl">{children}</div>
      {sub && <div className="mt-1 text-[11px] leading-snug text-slate-400 sm:text-xs">{sub}</div>}
    </div>
  )
}

/** The four headline numbers, all derived from live state (nothing hard-coded). */
export default function StatsOverview({ state }) {
  const { player } = state
  const need = xpForLevel(player.level)
  const medals = player.medals ?? []
  const count = (place) => medals.filter((m) => m.place === place).length

  return (
    <section aria-label="Player stats" className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
      <Tile icon={Zap} tone="text-emerald-300" label="Level" sub={`${fmt.format(need - player.xp)} XP to level ${player.level + 1}`}>
        {player.level}
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-900" role="progressbar" aria-label="XP toward next level" aria-valuemin={0} aria-valuemax={need} aria-valuenow={player.xp}>
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300" style={{ width: `${Math.round((player.xp / need) * 100)}%` }} />
        </div>
      </Tile>
      <Tile icon={ArrowBigUp} tone="text-indigo-300" label="Upvotes" sub="received on your levels">
        {fmt.format(upvotesReceived(state))}
      </Tile>
      <Tile icon={Layers} tone="text-purple-300" label="Published" sub="levels in the gallery">
        {publishedCount(state)}
      </Tile>
      <Tile icon={Medal} tone="text-amber-300" label="Medals" sub={medals.length ? `${count(1)} gold · ${count(2)} silver · ${count(3)} bronze` : 'Enter a weekly contest to earn one'}>
        <span className="flex items-center gap-2">
          {medals.length}
          <span className="flex -space-x-1" aria-hidden="true">
            {[1, 2, 3].flatMap((p) => Array.from({ length: Math.min(3, count(p)) }, (_, i) => <MedalChip key={`${p}-${i}`} place={p} />))}
          </span>
        </span>
      </Tile>
    </section>
  )
}
