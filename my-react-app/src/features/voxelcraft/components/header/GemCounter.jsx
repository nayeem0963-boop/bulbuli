import { Gem } from 'lucide-react'

const fmt = new Intl.NumberFormat('en-US')

export default function GemCounter({ gems }) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg bg-purple-500/10 px-3 py-1.5 ring-1 ring-purple-400/40"
      title="UGC Gems: earned when players enjoy your builds"
    >
      <Gem className="size-4 text-purple-300 drop-shadow-[0_0_6px_rgba(192,132,252,0.8)]" aria-hidden="true" />
      <span className="font-display text-sm font-semibold tabular-nums text-purple-100">{fmt.format(gems)}</span>
      <span className="sr-only">UGC Gems</span>
    </div>
  )
}
