/** Which station Bulbuli is standing next to (pure; used by ExplorerController and tests). */
export const NEAR_DISTANCE = 2.4

export function nearestStation(stations, x, z, y, discTops) {
  let best = null
  let bestD = NEAR_DISTANCE
  for (const s of stations) {
    const d = Math.hypot(s.x - x, s.z - z)
    if (d < bestD && Math.abs((discTops[s.disc] ?? 0) - y) < 1.2) { best = s.n; bestD = d }
  }
  return best
}
