import { Camera, MousePointer2, X } from 'lucide-react'
import { useEffect } from 'react'

/**
 * Thumbnail framing mode: shows the exact 4:3 box that will be captured (the same centred crop
 * captureView() takes) and dims the rest. The camera stays live, so the player can orbit and
 * zoom; editing is switched off meanwhile. Enter (the focused button) captures, Esc goes back.
 */
export default function FramingOverlay({ onCapture, onCancel }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="pointer-events-none absolute inset-0 z-20" style={{ containerType: 'size' }}>
      {/* largest centred 4:3 box: min(100% width, 4/3 × 100% height) */}
      <div className="absolute inset-0 grid place-items-center">
        <div
          className="relative rounded-md ring-2 ring-emerald-300 shadow-[0_0_0_9999px_rgba(2,6,23,0.55)]"
          style={{ width: 'min(100cqw, 133.333cqh)', aspectRatio: '4 / 3' }}
          aria-hidden="true"
        >
          <span className="absolute left-1/2 top-1/2 h-4 w-px -translate-1/2 bg-emerald-200/60" />
          <span className="absolute left-1/2 top-1/2 h-px w-4 -translate-1/2 bg-emerald-200/60" />
        </div>
      </div>

      <div className="absolute inset-x-0 top-3 flex justify-center px-3">
        <p className="flex items-center gap-2 rounded-xl bg-slate-950/85 px-4 py-2 text-sm text-slate-200 ring-1 ring-emerald-400/40 backdrop-blur">
          <MousePointer2 className="size-4 text-emerald-300" aria-hidden="true" />
          Frame your thumbnail: <span className="font-semibold text-white">drag</span> to rotate, <span className="font-semibold text-white">scroll</span> to zoom, <span className="font-semibold text-white">right-drag</span> to pan
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 px-3">
        <button
          type="button"
          onClick={onCancel}
          className="pointer-events-auto flex items-center gap-1.5 rounded-xl bg-slate-900/90 px-4 py-2.5 text-sm font-semibold text-slate-200 ring-1 ring-slate-700 backdrop-blur hover:bg-slate-800"
        >
          <X className="size-4" aria-hidden="true" /> Back
        </button>
        <button
          type="button"
          onClick={onCapture}
          autoFocus
          className="pointer-events-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-500 px-5 py-2.5 font-display font-bold text-white shadow-[0_0_24px_rgba(52,211,153,0.4)] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Camera className="size-4" aria-hidden="true" /> Use this view
        </button>
      </div>
    </div>
  )
}
