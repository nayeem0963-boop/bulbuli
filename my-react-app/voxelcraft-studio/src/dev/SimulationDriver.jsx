import { useEffect } from 'react'
import { SIM_TICK_MS } from '../community/simulation.js'
import { useGameActions, useGameState } from '../state/GameStateProvider.jsx'
import { DEV_TOOLS } from './devMode.js'

/**
 * Runs the simulated community voters while Dev / Test Mode's toggle is on: every 5 real
 * seconds is one simulated hour of voting. Pauses while the tab is hidden (no catch-up burst).
 * Renders nothing.
 */
export default function SimulationDriver() {
  const { sim } = useGameState()
  const { simTick } = useGameActions()
  const active = DEV_TOOLS && sim.enabled

  useEffect(() => {
    if (!active) return
    const t = setInterval(() => {
      if (!document.hidden) simTick(1)
    }, SIM_TICK_MS)
    return () => clearInterval(t)
  }, [active, simTick])

  return null
}
