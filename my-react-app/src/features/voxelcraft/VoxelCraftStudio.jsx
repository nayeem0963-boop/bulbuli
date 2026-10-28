import { useEffect, useState } from 'react'
import Header from './components/header/Header.jsx'
import { panelId, tabId } from './components/header/NavTabs.jsx'
import { PortalRootContext } from './components/portalRoot.js'
import RewardToasts from './components/RewardToasts.jsx'
import SimulationDriver from './dev/SimulationDriver.jsx'
import { mockStarterLevel } from './data/mockData.js'
import { LevelEditorProvider } from './level/LevelEditorProvider.jsx'
import { parseLevel } from './level/levelSchema.js'
import { GameStateProvider, useGameState } from './state/GameStateProvider.jsx'
import { loadStudioLevel } from './state/saveGame.js'
import BuildStudioView from './views/BuildStudioView.jsx'
import LeaderboardsView from './views/LeaderboardsView.jsx'
import PlayVoteView from './views/PlayVoteView.jsx'
import ProfileView from './views/ProfileView.jsx'
// Precompiled, fully scoped styles: every rule is prefixed with #voxelcraft-root, so nothing
// leaks into the host app and the host's global button/link/heading styles can't leak in.
// Regenerate with `npm run build:voxelcraft-css` after changing Tailwind classes.
import './styles/voxelcraft.css'

export const ROOT_ID = 'voxelcraft-root'
const FONTS_ID = 'voxelcraft-fonts'
const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap'
const THEME_COLOR = '#0f172a'

const VIEWS = {
  play: PlayVoteView,
  build: BuildStudioView,
  leaderboards: LeaderboardsView,
  profile: ProfileView,
}

function Shell({ exit }) {
  const { activeTab } = useGameState()
  const View = VIEWS[activeTab]
  // The Studio is a fixed-height workspace on desktop (the canvas fills it); other tabs scroll.
  const isStudio = activeTab === 'build'

  return (
    <div className="relative flex h-full flex-col bg-slate-900 text-slate-100 antialiased">
      {/* Soft neon glow behind the content. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_15%_0%,rgba(99,102,241,0.16),transparent),radial-gradient(50%_40%_at_100%_100%,rgba(16,185,129,0.10),transparent)]"
      />
      <Header exit={exit} />
      <main
        id={panelId(activeTab)}
        role="tabpanel"
        aria-labelledby={tabId(activeTab)}
        className={`relative mx-auto w-full max-w-[1600px] flex-1 p-4 lg:p-6 ${isStudio ? 'min-h-0 overflow-y-auto lg:overflow-hidden' : 'overflow-y-auto'}`}
      >
        <View />
      </main>
      <RewardToasts />
      <SimulationDriver />
    </div>
  )
}

/** Loads the game's two web fonts once, the first time the studio opens. */
function useGameFonts() {
  useEffect(() => {
    if (document.getElementById(FONTS_ID)) return
    const link = document.createElement('link')
    link.id = FONTS_ID
    link.rel = 'stylesheet'
    link.href = FONTS_HREF
    document.head.appendChild(link)
  }, [])
}

/** Dark browser chrome (mobile address bar) while the studio is open; the host's colour after. */
function useThemeColor(color) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) return
    const previous = meta.getAttribute('content')
    meta.setAttribute('content', color)
    return () => {
      if (previous !== null) meta.setAttribute('content', previous)
    }
  }, [color])
}

// The starter level goes through the same validation as any loaded/untrusted level.
const starterLevel = parseLevel(mockStarterLevel).level

/**
 * VoxelCraft UGC Studio: build voxel levels, play and vote on community levels, profile & shop.
 *
 * Self-contained: its state (GameStateProvider, LevelEditorProvider) lives inside this
 * component, its storage keys are prefixed `bulbuli_voxelcraft_`, and its styles only apply
 * inside its root element.
 *
 * Props (all optional):
 *   onExit       called by the "‹ Pro Coder" link in the game header (e.g. router navigate('/')).
 *                Without it the link is an ordinary link to `exitHref`.
 *   exitHref     where that link points (default '/'); exitLabel its text (default 'Pro Coder').
 *   height       CSS height of the studio (default '100dvh', a full page). Use '100%' to fill a
 *                sized container; the 3D viewport resizes with it.
 *   initialLevel a LevelState to open in the Build Studio (default: the level saved on this
 *                device, else the starter level).
 */
export function VoxelCraftStudio({ onExit, exitHref = '/', exitLabel = 'Bulbuli', height = '100dvh', initialLevel }) {
  const [studioLevel] = useState(() => initialLevel ?? loadStudioLevel() ?? starterLevel)
  const [root, setRoot] = useState(null)
  useGameFonts()
  useThemeColor(THEME_COLOR)

  return (
    <div id={ROOT_ID} ref={setRoot} style={{ height }}>
      <PortalRootContext.Provider value={root}>
        <GameStateProvider>
          {/* Above the tabs so the level being built survives switching tabs. */}
          <LevelEditorProvider initialLevel={studioLevel}>
            <Shell exit={{ href: exitHref, label: exitLabel, onExit }} />
          </LevelEditorProvider>
        </GameStateProvider>
      </PortalRootContext.Provider>
    </div>
  )
}

export default VoxelCraftStudio
