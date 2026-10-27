import { Crown, Gem, ThumbsUp } from 'lucide-react'
import { useGameState } from '../state/GameStateProvider.jsx'

const fmt = new Intl.NumberFormat('en-US')
const PODIUM = ['text-amber-300', 'text-slate-300', 'text-orange-400']

export default function LeaderboardsView() {
  const { leaderboard, player } = useGameState()

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <h2 className="font-display text-2xl font-bold text-white">Leaderboards</h2>
        <p className="text-sm text-slate-400">Top creators this season, ranked by votes on their builds.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-slate-900 ring-1 ring-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-slate-500">
            <tr className="border-b border-slate-800">
              <th scope="col" className="px-4 py-3">Rank</th>
              <th scope="col" className="px-4 py-3">Creator</th>
              <th scope="col" className="px-4 py-3 text-right">Level</th>
              <th scope="col" className="px-4 py-3 text-right">Votes</th>
              <th scope="col" className="px-4 py-3 text-right">Gems</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row) => {
              const me = row.handle === player.handle
              return (
                <tr
                  key={row.handle}
                  className={`border-b border-slate-800/70 last:border-0 ${me ? 'bg-indigo-500/10' : 'hover:bg-slate-800/40'}`}
                >
                  <td className="px-4 py-3 font-display font-bold tabular-nums">
                    {row.rank <= 3 ? (
                      <span className={`flex items-center gap-1 ${PODIUM[row.rank - 1]}`}>
                        <Crown className="size-4" aria-hidden="true" /> {row.rank}
                      </span>
                    ) : (
                      <span className="text-slate-400">{row.rank}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">
                    {row.handle}
                    {me && <span className="ml-2 rounded bg-indigo-500/30 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-200">You</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-300">{row.level}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                    <span className="inline-flex items-center gap-1"><ThumbsUp className="size-3.5 text-slate-500" aria-hidden="true" />{fmt.format(row.votes)}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-purple-200">
                    <span className="inline-flex items-center gap-1"><Gem className="size-3.5 text-purple-400" aria-hidden="true" />{fmt.format(row.gems)}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
