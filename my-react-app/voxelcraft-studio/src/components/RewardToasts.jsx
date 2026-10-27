import { Gem, Medal, Zap } from 'lucide-react'
import { useEffect } from 'react'
import { useGameActions, useGameState } from '../state/GameStateProvider.jsx'

const TOAST_MS = 2600
const BADGE_TOAST_MS = 5000 // badges deserve a longer look

function Toast({ toast, onDismiss }) {
  // Depends only on stable values, so new rewards don't restart older toasts' timers.
  const { id } = toast
  useEffect(() => {
    const t = setTimeout(() => onDismiss(id), toast.badge ? BADGE_TOAST_MS : TOAST_MS)
    return () => clearTimeout(t)
  }, [id, onDismiss, toast.badge])

  return (
    <li className={`flex items-center gap-3 rounded-xl bg-slate-900/95 px-4 py-3 text-sm shadow-xl ring-1 backdrop-blur ${toast.badge ? 'ring-amber-300/60 shadow-[0_0_30px_rgba(251,191,36,0.25)]' : 'ring-emerald-400/40'}`}>
      {toast.badge && (
        <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-amber-300 to-amber-500">
          <Medal className="size-5 text-amber-950" aria-hidden="true" />
        </span>
      )}
      <span className="text-slate-200">
        {toast.reason}
        {toast.badge && <span className="block font-display font-bold text-amber-200">{toast.badge}</span>}
      </span>
      {toast.xp > 0 && (
        <span className="flex items-center gap-1 font-semibold text-emerald-300">
          <Zap className="size-3.5" aria-hidden="true" />+{toast.xp} XP
        </span>
      )}
      {toast.gems !== 0 && (
        <span className="flex items-center gap-1 font-semibold text-purple-300">
          <Gem className="size-3.5" aria-hidden="true" />{toast.gems > 0 ? `+${toast.gems}` : `−${-toast.gems}`}
        </span>
      )}
    </li>
  )
}

export default function RewardToasts() {
  const { toasts } = useGameState()
  const { dismissToast } = useGameActions()

  return (
    <ol aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {toasts.slice(-3).map((t) => (
        <Toast key={t.id} toast={t} onDismiss={dismissToast} />
      ))}
    </ol>
  )
}
