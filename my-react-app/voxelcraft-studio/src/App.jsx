import { useState } from 'react'
import Header from './components/header/Header.jsx'
import { panelId, tabId } from './components/header/NavTabs.jsx'
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

const VIEWS = {
  play: PlayVoteView,
  build: BuildStudioView,
  leaderboards: LeaderboardsView,
  profile: ProfileView,
}

function Shell() {
  const { activeTab } = useGameState()
  const View = VIEWS[activeTab]
  // The Studio is a fixed-height workspace on desktop (the canvas fills it); other tabs scroll.
  const isStudio = activeTab === 'build'

  return (
    <div className="flex h-dvh flex-col bg-slate-900 text-slate-100 antialiased">
      {/* Soft neon glow behind the content. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_50%_at_15%_0%,rgba(99,102,241,0.16),transparent),radial-gradient(50%_40%_at_100%_100%,rgba(16,185,129,0.10),transparent)]"
      />
      <Header />
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

// The starter level goes through the same validation as any loaded/untrusted level.
const starterLevel = parseLevel(mockStarterLevel).level

/**
 * `initialLevel`: a LevelState to open in the Studio. Defaults to the level saved on this device
 * from the last visit, else the starter level.
 */
export default function App({ initialLevel }) {
  const [studioLevel] = useState(() => initialLevel ?? loadStudioLevel() ?? starterLevel)
  return (
    <GameStateProvider>
      {/* Above the tabs so the level being built survives switching tabs. */}
      <LevelEditorProvider initialLevel={studioLevel}>
        <Shell />
      </LevelEditorProvider>
    </GameStateProvider>
  )
}
