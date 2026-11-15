/**
 * Bulbuli Phase 2A CONTROLLED REVIEW build (built by `npm run build:review`, deployed as its own
 * site; see docs/PHASE-2A-REVIEW-BUILD.md).
 *
 * - Mounts ONLY the review adapter: its own IndexedDB database on the review site's own origin, a
 *   fixed review player, no account, no Supabase, no XP queue, no badges or certificates. The
 *   main site's sign-in session and progress live on a different origin and can't be read here.
 * - Shows every content item, including unreviewed ones, each clearly badged, with the content
 *   release gate exactly as computed from the real (empty) reviewer list: nothing is approved.
 * - window.__phase2aQA (answer keys for the automated browser tests) is exposed only with ?qa=1.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/styles/global.css'
import '../dev-preview/phase-2a/preview.css'
import { AdapterProvider } from '../src/learning/adapters/adapterContext.js'
import { createReviewAdapter } from '../src/learning/adapters/review.js'
import { ALL_CONTENT_ITEMS } from '../src/learning/content/index.js'
import { contentReport, isShippable } from '../src/learning/contentGate.js'
import { REVIEWERS } from '../src/learning/reviewers.js'
import PreviewApp from '../dev-preview/phase-2a/PreviewApp.jsx'

const adapter = createReviewAdapter()
const items = [...ALL_CONTENT_ITEMS]
const report = contentReport(items, [...REVIEWERS])
const isReviewed = (item) => isShippable(item, [...REVIEWERS])

const qaEnabled = new URLSearchParams(window.location.search).get('qa') === '1'
const qa = { adapter, step: null, options: [], correctLane: () => qa.options.findIndex((o) => o.correct), world: null }
if (qaEnabled) window.__phase2aQA = qa

const onStepShown = (step, options) => { qa.step = step; qa.options = options }
const onWorldQa = (info) => { qa.world = info }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AdapterProvider adapter={adapter}>
      <PreviewApp
        mode="review"
        adapter={adapter} items={items} isReviewed={isReviewed} report={report}
        onStepShown={onStepShown}
        onWorldQa={onWorldQa}
      />
    </AdapterProvider>
  </StrictMode>,
)
