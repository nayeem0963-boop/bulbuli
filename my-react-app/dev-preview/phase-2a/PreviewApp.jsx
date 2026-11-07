/**
 * The Phase 2A page chrome around the two new games (design 1.6), used by two entries:
 *   mode 'dev'    : dev-preview/phase-2a/ (npm run dev only; see its main.jsx)
 *   mode 'review' : the controlled review build (review/, npm run build:review; see review/main.jsx)
 * Both mount a sandbox adapter (preview / review) that awards nothing and talks to no server.
 *
 * The selected game is kept in the URL hash (#sky / #world), so a reviewer's direct link and a
 * page refresh both land on the same game.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLearningSnapshot } from '../../src/learning/store/learningStore.js'
import SkyScienceGame from '../../src/games/sky-science/index.jsx'
import WorldExplorerGame from '../../src/games/world-explorer/index.jsx'

const TABS = ['sky', 'world']
const tabFromHash = () => {
  const tab = window.location.hash.replace(/^#\/?/, '').split('/')[0]
  return TABS.includes(tab) ? tab : null
}

const CHROME = {
  dev: {
    title: 'Phase 2A preview',
    warning: 'Development only · unreviewed content · no real XP',
    reset: 'Reset preview data',
  },
  review: {
    title: 'Bulbuli · Phase 2A review',
    warning: 'REVIEW BUILD — EDUCATIONAL CONTENT PENDING APPROVAL — NO REAL XP',
    reset: 'Reset review data',
  },
}

export default function PreviewApp({ adapter, items, isReviewed, report, onStepShown, onWorldQa, mode = 'dev' }) {
  const chrome = CHROME[mode] ?? CHROME.dev
  const [language, setLanguage] = useState('en')
  const [theme, setTheme] = useState(() => (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  const [tab, setTabState] = useState(() => tabFromHash() ?? 'sky')
  const setTab = (next) => {
    setTabState(next)
    if (tabFromHash() !== next) window.history.replaceState(null, '', `#${next}`)
  }
  // the game area's real height, so an expedition's 3D stage fills it exactly (preview.css)
  const shellRef = useRef(null)
  const mainRef = useRef(null)
  useLayoutEffect(() => {
    const main = mainRef.current
    const shell = shellRef.current
    if (!main || !shell || typeof ResizeObserver === 'undefined') return undefined
    const measure = () => shell.style.setProperty('--pv-main-h', `${main.clientHeight}px`)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(main)
    return () => observer.disconnect()
  }, [])
  // back/forward or a hand-edited hash switches the game too
  useEffect(() => {
    const onHash = () => { const next = tabFromHash(); if (next) setTabState(next) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  // the gate panel closes on a click elsewhere or Escape, so it never lingers over a game
  const gateRef = useRef(null)
  useEffect(() => {
    const close = (event) => {
      const gate = gateRef.current
      if (!gate?.open) return
      if (event.type === 'keydown' ? event.key === 'Escape' : !gate.contains(event.target)) gate.open = false
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close) }
  }, [])
  const snapshot = useLearningSnapshot(adapter.store)
  const awards = useMemo(() => adapter.wouldBeAwards(), [snapshot.version]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { document.documentElement.lang = language }, [language])

  return (
    <div ref={shellRef} className="app-shell pv" data-theme={theme} data-mode={mode}>
      <div className="pv-bar" role="banner">
        <strong>{chrome.title}</strong>
        <span className="pv-warn" data-testid="pv-status">{chrome.warning}</span>
        <span className="pv-spacer" />
        <details ref={gateRef} className="pv-gate">
          <summary title="Content release gate">Gate: {report.approved}/{report.total} approved · science {report.awaitingAccuracyReview} · Bangla {report.awaitingBanglaReview} pending</summary>
          <div className="pv-gate-panel" aria-label="Content release gate and would-be XP">
            <h2>Content release gate</h2>
            <p data-testid="pv-report">{report.total} items · awaiting science review {report.awaitingAccuracyReview} · awaiting Bangla review {report.awaitingBanglaReview} · approved {report.approved}</p>
            <p className="pv-note">An item is released only with BOTH a science and a Bangla approval by a named reviewer, for its exact current content.</p>
            <h2>XP a live game would send</h2>
            <p className="pv-note">Recorded here only. Nothing is sent anywhere. {mode === 'review' ? 'Review' : 'Preview'} total: {snapshot.learningXp ?? 0} XP (not real XP)</p>
            <ol data-testid="pv-awards">{awards.map((a) => <li key={a.roundKey}>{a.gameId}: +{a.amount} XP</li>)}</ol>
            <h2>Credits</h2>
            <p className="pv-note" data-testid="pv-credits">
              Amazon Rainforest bird: <a href="https://sketchfab.com/3d-models/bird-orange-0d31748606c2499fb652c0c1052b7cfa" target="_blank" rel="noreferrer">&ldquo;Bird Orange&rdquo;</a> by Wen Yeh, licensed under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">CC BY-NC-SA 4.0</a> (non-commercial; shown with code-drawn wings and its own lighting).
            </p>
          </div>
        </details>
        <button type="button" onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}>{language === 'en' ? 'বাংলা' : 'English'}</button>
        <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</button>
        <button type="button" onClick={async () => { await adapter.resetPreviewData(); window.location.reload() }}>{chrome.reset}</button>
      </div>
      <nav className="pv-tabs" aria-label="Preview games">
        <button type="button" aria-pressed={tab === 'sky'} onClick={() => setTab('sky')} data-tab="sky">Sky Science Explorer</button>
        <button type="button" aria-pressed={tab === 'world'} onClick={() => setTab('world')} data-tab="world">World Explorer 3D</button>
      </nav>
      <main ref={mainRef} className="pv-main">
        {tab === 'sky' && (
          <SkyScienceGame
            language={language}
            items={items}
            isReviewed={isReviewed}
            dark={theme === 'dark'}
            preview
            onStepShown={onStepShown}
          />
        )}
        {tab === 'world' && (
          <WorldExplorerGame
            language={language}
            items={items}
            isReviewed={isReviewed}
            dark={theme === 'dark'}
            preview
            onQa={onWorldQa}
          />
        )}
      </main>
    </div>
  )
}
