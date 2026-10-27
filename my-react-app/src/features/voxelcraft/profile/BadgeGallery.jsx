import { Blocks, Check, Crown, Gem, Lock, Medal, Rocket, Sparkles, ThumbsUp, Trophy, Zap } from 'lucide-react'
import { BADGES, badgeProgress } from './achievements.js'
import { COSMETICS } from './cosmetics.js'
import { CARD, CARD_PAD, H2, StatusTag } from './ui.jsx'

const ICONS = { rocket: Rocket, blocks: Blocks, crown: Crown, trophy: Trophy, sparkles: Sparkles, medal: Medal, thumbs: ThumbsUp }
const GLOW = {
  'First Creator': 'from-emerald-300 to-indigo-500',
  'Master Builder': 'from-purple-300 to-fuchsia-600',
  'Parkour King': 'from-amber-200 to-orange-500',
  'Contest Winner': 'from-yellow-200 to-amber-500',
}

/** Which cosmetic each badge unlocks, shown as a perk line. */
const PERKS = Object.fromEntries(COSMETICS.filter((c) => c.unlock.type === 'badge').map((c) => [c.unlock.badge, c.name]))

export default function BadgeGallery({ state }) {
  const earnable = BADGES.filter((b) => !b.legacy)
  const legacy = BADGES.filter((b) => b.legacy && state.player.badges.includes(b.id))
  const earned = earnable.filter((b) => state.player.badges.includes(b.id)).length + legacy.length

  return (
    <section aria-labelledby="badges-title" className={`${CARD} ${CARD_PAD}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="badges-title" className={H2}>Achievements &amp; badges</h2>
        <StatusTag tone={earned ? 'earned' : 'locked'}>{earned} earned</StatusTag>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {earnable.map((b) => {
          const Icon = ICONS[b.icon]
          const p = badgeProgress(b, state)
          return (
            <li
              key={b.id}
              className={`flex gap-3 rounded-xl border p-3 ${p.done ? 'border-amber-300/50 bg-amber-400/[0.06] shadow-[0_0_24px_rgba(251,191,36,0.14)]' : 'border-slate-700/70 bg-slate-900/70'}`}
              aria-label={`${b.id}: ${p.done ? 'earned' : `${p.current} of ${p.goal}`}`}
            >
              <div className={`relative grid size-12 shrink-0 place-items-center rounded-xl sm:size-14 ${p.done ? `bg-gradient-to-br ${GLOW[b.id]} shadow-lg ring-2 ring-amber-300/40` : 'bg-slate-800 ring-1 ring-slate-700'}`}>
                <Icon className={`size-7 ${p.done ? 'text-slate-950' : 'text-slate-500'}`} aria-hidden="true" />
                {!p.done && <Lock className="absolute -bottom-1 -right-1 size-5 rounded-full bg-slate-900 p-1 text-slate-400" aria-hidden="true" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className={`font-display font-bold ${p.done ? 'text-white' : 'text-slate-300'}`}>{b.id}</p>
                  {p.done && <StatusTag tone="earned" icon={Check}>Earned</StatusTag>}
                </div>
                <p className="text-sm text-slate-400">{b.blurb}</p>
                {p.done ? (
                  PERKS[b.id] && <p className="mt-1 text-xs font-semibold text-amber-200">Unlocked {PERKS[b.id]}</p>
                ) : (
                  <>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800 ring-1 ring-slate-700/60" role="progressbar" aria-valuemin={0} aria-valuemax={p.goal} aria-valuenow={p.current}>
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-400" style={{ width: `${(p.current / p.goal) * 100}%` }} />
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                      <span className="tabular-nums">{p.current} / {p.goal}</span>
                      {b.reward?.xp > 0 && <span className="flex items-center gap-0.5 text-emerald-300"><Zap className="size-3" aria-hidden="true" />+{b.reward.xp}</span>}
                      {b.reward?.gems > 0 && <span className="flex items-center gap-0.5 text-purple-300"><Gem className="size-3" aria-hidden="true" />+{b.reward.gems}</span>}
                      {PERKS[b.id] && <span>unlocks {PERKS[b.id]}</span>}
                    </p>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {legacy.length > 0 && (
        <>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Earlier badges</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {legacy.map((b) => {
              const Icon = ICONS[b.icon]
              return (
                <li key={b.id} title={b.blurb} className="flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1.5 text-sm text-purple-200 ring-1 ring-purple-400/30">
                  <Icon className="size-4 text-purple-300" aria-hidden="true" /> {b.id}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
