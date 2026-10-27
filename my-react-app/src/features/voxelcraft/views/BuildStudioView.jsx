import { LoaderCircle } from 'lucide-react'
import { Suspense, lazy, useCallback, useRef, useState } from 'react'
import ErrorBoundary from '../components/ErrorBoundary.jsx'
import FramingOverlay from '../components/studio/FramingOverlay.jsx'
import Hotbar from '../components/studio/Hotbar.jsx'
import LevelPanel from '../components/studio/LevelPanel.jsx'
import PublishModal from '../components/studio/PublishModal.jsx'
import useEditorShortcuts from '../components/studio/useEditorShortcuts.js'
import { useEditorActions } from '../level/LevelEditorProvider.jsx'
import { createPlayStore } from '../play/playStore.js'

// three + R3F + drei are the heaviest part of the app: load them only when the Studio opens.
const Viewport3D = lazy(() => import('../components/viewport/Viewport3D.jsx'))

function ViewportLoading() {
  return (
    <div className="grid h-full place-items-center rounded-2xl bg-slate-900 ring-1 ring-slate-800">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <LoaderCircle className="size-4 animate-spin text-indigo-400" aria-hidden="true" /> Loading 3D studio…
      </div>
    </div>
  )
}

export default function BuildStudioView() {
  const { getLevel } = useEditorActions()
  // PlayMode: 'build' edits the level; 'play' test-runs a snapshot of it. A new play store
  // (timer, respawns) is created each time Play starts, so every test run starts clean.
  const [session, setSession] = useState({ mode: 'build', store: null })

  const setMode = useCallback(
    (mode) => {
      if (mode === 'play') {
        const level = getLevel()
        if (!level.spawnPoint) return // the toggle is disabled too; this guards the P shortcut
        setSession({ mode: 'play', store: createPlayStore(level) })
      } else {
        setSession({ mode: 'build', store: null })
      }
    },
    [getLevel],
  )
  const startPlay = useCallback(() => setMode('play'), [setMode])

  const playing = session.mode === 'play'

  // Publish flow: modal ⇄ framing mode. The thumbnail is a snapshot of the Studio camera,
  // taken when the modal opens and again on Retake / "Use this view".
  const captureRef = useRef(null)
  const [publish, setPublish] = useState({ open: false, framing: false, thumbnail: null })
  const capture = () => captureRef.current?.() ?? null
  const openPublish = () => setPublish({ open: true, framing: false, thumbnail: capture() })
  const closePublish = useCallback(() => setPublish({ open: false, framing: false, thumbnail: null }), [])
  const startFraming = () => setPublish((p) => ({ ...p, framing: true }))
  const takeFramedShot = () => setPublish((p) => ({ ...p, framing: false, thumbnail: capture() ?? p.thumbnail }))
  const cancelFraming = useCallback(() => setPublish((p) => ({ ...p, framing: false })), [])

  useEditorShortcuts({ enabled: !playing && !publish.open, onPlay: startPlay })

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 lg:flex-row">
      {/* Central viewport: grows to fill; min height keeps it usable on phones. */}
      <section className="relative min-h-[480px] min-w-0 flex-1 lg:min-h-0" aria-label={playing ? '3D play test' : '3D build viewport'}>
        <ErrorBoundary title="The 3D viewport stopped">
          <Suspense fallback={<ViewportLoading />}>
            <Viewport3D
              mode={session.mode}
              playStore={session.store}
              onModeChange={setMode}
              captureRef={captureRef}
              framing={publish.framing}
              buildOverlay={publish.framing ? <FramingOverlay onCapture={takeFramedShot} onCancel={cancelFraming} /> : <Hotbar />}
            />
          </Suspense>
        </ErrorBoundary>
      </section>
      <LevelPanel playing={playing} onPlay={startPlay} onPublish={openPublish} />
      {publish.open && (
        <PublishModal
          hidden={publish.framing}
          thumbnail={publish.thumbnail}
          onRetake={() => setPublish((p) => ({ ...p, thumbnail: capture() ?? p.thumbnail }))}
          onFrame={startFraming}
          onClose={closePublish}
        />
      )}
    </div>
  )
}
