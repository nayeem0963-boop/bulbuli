import { Gamepad2, Hammer, Trophy, UserRound } from 'lucide-react'
import { useRef } from 'react'
import { TABS } from '../../data/mockData.js'

const ICONS = { play: Gamepad2, build: Hammer, leaderboards: Trophy, profile: UserRound }

export const tabId = (id) => `tab-${id}`
export const panelId = (id) => `panel-${id}`

/** WAI-ARIA tabs: roving tabindex, arrow keys / Home / End move focus and select. */
export default function NavTabs({ activeTab, onChange, className = '' }) {
  const refs = useRef({})

  const onKeyDown = (e) => {
    const i = TABS.findIndex((t) => t.id === activeTab)
    const moves = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 }
    if (!(e.key in moves)) return
    e.preventDefault()
    const next = TABS[(moves[e.key] + TABS.length) % TABS.length]
    onChange(next.id)
    refs.current[next.id]?.focus()
  }

  return (
    <nav aria-label="Main" className={className}>
      <div role="tablist" aria-orientation="horizontal" onKeyDown={onKeyDown} className="flex gap-1">
        {TABS.map(({ id, label }) => {
          const Icon = ICONS[id]
          const selected = id === activeTab
          return (
            <button
              key={id}
              ref={(el) => (refs.current[id] = el)}
              id={tabId(id)}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={panelId(id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(id)}
              className={[
                'group relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                selected
                  ? 'bg-indigo-500/15 text-white ring-1 ring-indigo-400/50'
                  : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100',
              ].join(' ')}
            >
              <Icon
                className={selected ? 'size-4 text-indigo-300' : 'size-4 text-slate-500 group-hover:text-slate-300'}
                aria-hidden="true"
              />
              <span className="whitespace-nowrap">{label}</span>
              {selected && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 -bottom-[9px] h-0.5 rounded-full bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 shadow-[0_0_10px_rgba(129,140,248,0.9)]"
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
