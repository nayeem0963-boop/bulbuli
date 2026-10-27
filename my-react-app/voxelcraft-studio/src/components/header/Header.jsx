import { Box } from 'lucide-react'
import { useMemo } from 'react'
import { effectiveLook } from '../../profile/cosmetics.js'
import { useGameActions, useGameState } from '../../state/GameStateProvider.jsx'
import GemCounter from './GemCounter.jsx'
import NavTabs from './NavTabs.jsx'
import XpMeter from './XpMeter.jsx'

export default function Header() {
  const game = useGameState()
  const { activeTab, player } = game
  const look = useMemo(() => effectiveLook(game), [game.player, game.cosmetics]) // eslint-disable-line react-hooks/exhaustive-deps
  const { setTab } = useGameActions()

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-2.5 lg:px-6">
        {/* Brand */}
        {/* A button, not a link: a full page load would throw away the level being built. */}
        <button
          type="button"
          onClick={() => setTab('play')}
          aria-label="VoxelCraft Studio home"
          className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_18px_rgba(129,140,248,0.55)]">
            <Box className="size-5 text-white" aria-hidden="true" />
          </span>
          <span className="hidden font-display text-lg font-bold leading-none tracking-wide text-white sm:block">
            VoxelCraft <span className="bg-gradient-to-r from-purple-300 to-emerald-300 bg-clip-text text-transparent">Studio</span>
          </span>
        </button>

        {/* Tabs inline on wide screens */}
        <NavTabs activeTab={activeTab} onChange={setTab} className="mx-auto hidden lg:block" />

        {/* Currency + profile */}
        <div className="ml-auto flex items-center gap-3 lg:ml-0">
          <XpMeter level={player.level} xp={player.xp} />
          <GemCounter gems={player.gems} />
          <button
            type="button"
            onClick={() => setTab('profile')}
            className="hidden size-9 place-items-center rounded-full font-display text-sm font-bold text-white ring-2 ring-slate-900 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] sm:grid focus-visible:outline-none focus-visible:ring-indigo-300"
            style={{ background: `linear-gradient(135deg, ${look.skin.color}, ${look.shirt.color})` }}
            aria-label={`${player.handle}: open my profile`}
          >
            {player.handle.slice(0, 2).toUpperCase()}
          </button>
        </div>
      </div>

      {/* Tabs on their own scrollable row on small screens */}
      <NavTabs
        activeTab={activeTab}
        onChange={setTab}
        className="overflow-x-auto border-t border-slate-800/80 px-3 pb-2.5 pt-2 lg:hidden"
      />
    </header>
  )
}
