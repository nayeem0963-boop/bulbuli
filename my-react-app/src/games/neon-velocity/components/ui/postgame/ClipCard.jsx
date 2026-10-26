import { useEffect, useMemo, useRef, useState } from 'react'
import {
  clipFilename, drawOverlay, exportGif, exportSnapshot, exportVideo, shareOrDownload, videoSupport,
} from '../../../clip/clipExporter'
import { highlightRecorder } from '../../../clip/highlightRecorder'

/**
 * Highlight clip: a looping preview of the top-speed moment plus export buttons
 * (GIF, video, photo). Uses the native share sheet on mobile, downloads elsewhere.
 */
export function ClipCard({ run }) {
  // grab the highlight once per finished run
  const highlight = useMemo(() => highlightRecorder.getHighlight(), [run])
  const [job, setJob] = useState(null) // { kind, progress, status: 'working'|'done'|'error', message }
  const canVideo = useMemo(() => !!videoSupport(), [])
  // stable identity so the preview loop doesn't restart on every progress update
  const meta = useMemo(() => ({ ...highlight?.meta, score: run.score }), [highlight, run.score])

  if (!highlight) {
    return (
      <div className="nv-clip-card nv-clip-card--empty">
        <p className="nv-hint">Run a little longer to capture a highlight clip.</p>
      </div>
    )
  }

  const shareText = `I hit ${highlight.meta?.speedKmh ?? Math.round(run.maxSpeedKmh)} km/h and scored ${run.score} in Bulbuli: Neon Velocity`

  const runExport = async (kind) => {
    if (job?.status === 'working') return
    setJob({ kind, progress: 0, status: 'working' })
    try {
      const h = { ...highlight, meta }
      const onProgress = (progress) => setJob((j) => ({ ...j, progress }))
      const blob = kind === 'gif'
        ? await exportGif(h, { onProgress })
        : kind === 'video'
          ? await exportVideo(h, { onProgress })
          : await exportSnapshot(h)
      const ext = kind === 'gif' ? 'gif' : kind === 'video' ? (blob.type.includes('mp4') ? 'mp4' : 'webm') : 'png'
      const result = await shareOrDownload(blob, clipFilename(ext, run.score), { text: shareText })
      setJob({ kind, status: 'done', message: result === 'shared' ? 'Shared' : result === 'cancelled' ? 'Cancelled' : `Saved ${ext.toUpperCase()} · ${(blob.size / 1024).toFixed(0)} KB` })
    } catch (e) {
      setJob({ kind, status: 'error', message: e.message || 'Export failed' })
    }
  }

  const busy = job?.status === 'working'
  return (
    <div className="nv-clip-card">
      <div className="nv-clip-card__head">
        <span className="nv-clip-card__label">Top-speed highlight</span>
        <span className="nv-clip-card__meta">{(highlight.frames.length / highlight.fps).toFixed(1)} s · {highlight.meta?.speedKmh} km/h</span>
      </div>
      <ClipPreview highlight={highlight} meta={meta} />
      <div className="nv-clip-card__actions">
        <button className="nv-chip-btn" disabled={busy} onClick={() => runExport('gif')}>
          {busy && job.kind === 'gif' ? `GIF ${Math.round(job.progress * 100)}%` : 'GIF'}
        </button>
        {canVideo && (
          <button className="nv-chip-btn" disabled={busy} onClick={() => runExport('video')}>
            {busy && job.kind === 'video' ? `Recording ${Math.round(job.progress * 100)}%` : 'Video'}
          </button>
        )}
        <button className="nv-chip-btn" disabled={busy} onClick={() => runExport('photo')}>Photo</button>
      </div>
      {job?.message && (
        <p className={`nv-clip-card__status ${job.status === 'error' ? 'is-error' : ''}`} role="status">{job.message}</p>
      )}
    </div>
  )
}

/** Loops the captured frames on a small canvas at the recording frame rate. */
function ClipPreview({ highlight, meta }) {
  const canvas = useRef()
  useEffect(() => {
    const c = canvas.current
    if (!c || !highlight.frames.length) return
    c.width = highlight.width * 2
    c.height = highlight.height * 2
    const ctx = c.getContext('2d')
    let i = 0
    let raf
    let last = 0
    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      if (now - last < 1000 / highlight.fps) return
      last = now
      ctx.drawImage(highlight.frames[i], 0, 0, c.width, c.height)
      drawOverlay(ctx, c.width, c.height, meta)
      i = (i + 1) % highlight.frames.length
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [highlight, meta])
  return <canvas ref={canvas} className="nv-clip-card__preview" aria-label="Highlight clip preview" />
}
