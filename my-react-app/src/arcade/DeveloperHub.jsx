import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { tutorialCatalog } from '../data/tutorialCatalog.js'
import { EXAM_CONFIGS } from '../utils/comprehensiveExam.js'
import { ARCADE_TEXT } from './text.js'

const OPEN_STORAGE_KEY = 'bulbuli.developerHub.open'
export const DEVELOPER_HUB_ANCHOR = 'developer-hub'

function readOpen() {
  if (typeof window === 'undefined') return false
  if (window.location.hash === `#${DEVELOPER_HUB_ANCHOR}`) return true
  try {
    return window.localStorage.getItem(OPEN_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * The legacy programming courses and exams, folded away at the bottom of the arcade.
 * Collapsed by default; remembers whether a grown-up left it open.
 */
export default function DeveloperHub({ session, language }) {
  const text = ARCADE_TEXT[language]
  const [open, setOpen] = useState(readOpen)
  const panelId = useId()

  useEffect(() => {
    try {
      window.localStorage.setItem(OPEN_STORAGE_KEY, String(open))
    } catch {
      // Remembering the toggle is only a convenience.
    }
  }, [open])

  // The "Grown-ups" link in the header jumps here, so open the section when it does.
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === `#${DEVELOPER_HUB_ANCHOR}`) setOpen(true)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const subjectExams = Object.values(EXAM_CONFIGS).filter((exam) => exam.tutorialId)

  return (
    <section className={`dev-hub${open ? ' is-open' : ''}`} id={DEVELOPER_HUB_ANCHOR} aria-label={text.navGrownUps}>
      <button
        type="button"
        className="dev-hub-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="dev-hub-toggle-icon" aria-hidden="true">{'</>'}</span>
        <span className="dev-hub-toggle-text">
          <strong>{text.hubToggle}</strong>
          <span>{text.hubToggleHint}</span>
        </span>
        <span className="dev-hub-chevron" aria-hidden="true" />
      </button>

      <div className="dev-hub-panel" id={panelId} hidden={!open}>
        <p className="dev-hub-intro">{text.hubIntro}</p>
        <ul className="dev-hub-courses" lang="en">
          {tutorialCatalog.map((course) => (
            <li key={course.id}>
              <Link to={`/tutorials/${course.id}`} className="dev-hub-course">
                <span className="dev-hub-symbol" aria-hidden="true">{course.symbol}</span>
                <span>
                  <strong>{course.title}</strong>
                  <span>{course.description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <h3 className="dev-hub-subheading">{text.hubExams}</h3>
        <ul className="dev-hub-exams">
          <li><Link to="/exam">{text.hubPrepExam}</Link></li>
          {subjectExams.map((exam) => (
            <li key={exam.id} lang="en"><Link to={`/exams/${exam.id}`}>{exam.title}</Link></li>
          ))}
        </ul>

        <div className="dev-hub-actions">
          {session ? (
            <>
              <Link className="button" to="/developer">{text.hubOpen}</Link>
              <Link className="button button-secondary" to="/dashboard">{text.hubAccount}</Link>
            </>
          ) : (
            <Link className="button" to="/login" state={{ from: { pathname: '/developer' } }}>{text.hubSignIn}</Link>
          )}
        </div>
      </div>
    </section>
  )
}
