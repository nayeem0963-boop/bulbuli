import { Award, Sigma, Sparkles, Star, Zap } from 'lucide-react'
import { GameFullscreenButton } from '../../../arcade/GameFullscreen.jsx'
import GameThemeToggle from '../../../shared/components/GameThemeToggle.jsx'
import { useCountUp } from '../../../shared/hooks/useCountUp.js'
import { LEVELS, MAX_STARS, totalStars } from '../engine.js'
import { TOOL_BUTTON } from './theme.js'

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-2xl border-2 border-mf-line bg-mf-panel px-2.5 py-2 @xl:gap-2.5 @xl:px-3.5">
      <Icon size={22} strokeWidth={2.5} aria-hidden="true" focusable="false" className={tone} />
      <dl className="m-0 min-w-0">
        <dt className="text-[0.72rem] font-extrabold tracking-wider text-mf-muted uppercase">{label}</dt>
        <dd className="m-0 font-hero text-lg leading-tight font-extrabold whitespace-nowrap text-mf-text tabular-nums @xl:text-xl">{value}</dd>
      </dl>
    </div>
  )
}

export default function Header({ record, totalXp, compact, text, n, theme, onToggleTheme }) {
  const badgeCount = record.badges?.length ?? 0
  const xp = useCountUp(totalXp)
  return (
    <header className={`relative z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 @xl:gap-x-6 ${compact ? 'mb-3' : 'mb-5 @xl:mb-6'}`}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden="true"
          className={`grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-yellow-300 to-amber-500 text-mf-on-gold shadow-[0_0_30px_-6px_rgba(250,204,21,0.7)] ${compact ? 'size-11' : 'size-14 @xl:size-16'}`}
        >
          <Sigma size={compact ? 24 : 32} strokeWidth={2.75} />
        </span>
        <div className="min-w-0">
          {!compact && (
            <div className="mb-1 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-mf-gold/15 px-2.5 py-0.5 text-xs font-extrabold tracking-wide text-mf-gold-ink ring-1 ring-mf-gold/40">
                <Sparkles size={12} strokeWidth={3} aria-hidden="true" focusable="false" />
                {text.zone}
              </span>
              <span className="rounded-full bg-mf-accent/15 px-2.5 py-0.5 text-xs font-extrabold tracking-wide text-mf-accent ring-1 ring-mf-accent/40">
                {text.ages}
              </span>
            </div>
          )}
          <h1 className={`m-0 font-hero leading-none font-extrabold text-mf-text ${compact ? 'text-2xl' : 'text-3xl @md:text-4xl @xl:text-5xl'}`}>
            {text.title}
          </h1>
          {!compact && <p className="m-0 mt-1.5 hidden max-w-[52ch] text-sm text-mf-muted @2xl:block @xl:text-base">{text.tagline}</p>}
        </div>
      </div>

      {/* stats: beside the tools on wide screens, a row of their own under the title on narrow ones */}
      {!compact && (
        <div className="order-last grid w-full grid-cols-3 gap-2 @3xl:order-none @3xl:flex @3xl:w-auto @3xl:flex-wrap @3xl:items-center">
          <Stat icon={Star} label={text.stars} value={`${n(totalStars(record))} / ${n(MAX_STARS)}`} tone="fill-mf-star text-mf-star" />
          <Stat icon={Zap} label={text.xp} value={n(xp)} tone="text-mf-gold-ink" />
          <Stat icon={Award} label={text.badges} value={`${n(badgeCount)} / ${n(LEVELS.length)}`} tone="text-mf-accent-2" />
        </div>
      )}
      <div className="flex shrink-0 items-center gap-2">
        <GameThemeToggle
          theme={theme}
          onToggle={onToggleTheme}
          labels={{ toLight: text.themeToLight, toDark: text.themeToDark }}
          className={TOOL_BUTTON}
        />
        <GameFullscreenButton className={TOOL_BUTTON} iconSize={20} />
      </div>
    </header>
  )
}
