/**
 * Bulbuli Phase 2A dev preview (design 1.6). DEVELOPMENT ONLY: never built, never deployed.
 *
 * - Mounts ONLY the preview adapter: its own IndexedDB database, a fixed preview player, no
 *   account, no Supabase, no XP queue, no badges. A real signed-in session in this browser is
 *   never read (tests I3, I9, B5).
 * - Shows every content item, including unreviewed ones, each clearly badged.
 * - Exposes window.__phase2aQA for the automated real-browser tests (B1–B6): the Sky Science step
 *   and options, and `world` (World Explorer's current screen and right answer key, for B3).
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/styles/global.css'
import './preview.css'
import { AdapterProvider } from '../../src/learning/adapters/adapterContext.js'
import { createPreviewAdapter } from '../../src/learning/adapters/preview.js'
import { ALL_CONTENT_ITEMS } from '../../src/learning/content/index.js'
import { contentReport, isShippable } from '../../src/learning/contentGate.js'
import { REVIEWERS } from '../../src/learning/reviewers.js'
import PreviewApp from './PreviewApp.jsx'

const adapter = createPreviewAdapter()
const items = [...ALL_CONTENT_ITEMS]
const report = contentReport(items, [...REVIEWERS])
const isReviewed = (item) => isShippable(item, [...REVIEWERS])

const qa = { adapter, step: null, options: [], correctLane: () => qa.options.findIndex((o) => o.correct), world: null }
window.__phase2aQA = qa

/** Stable callback: World Explorer reports its current screen (and the right answer) for the B3 test. */
const onWorldQa = (info) => { qa.world = info }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AdapterProvider adapter={adapter}>
      <PreviewApp
        adapter={adapter} items={items} isReviewed={isReviewed} report={report}
        onStepShown={(step, options) => { qa.step = step; qa.options = options }}
        onWorldQa={onWorldQa}
      />
    </AdapterProvider>
  </StrictMode>,
)
