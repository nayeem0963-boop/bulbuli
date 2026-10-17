import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { tutorialCatalog } from '../data/tutorialCatalog.js'
import { useTutorialProgress } from '../hooks/useTutorialProgress.js'

function TutorialOverview({ userId }) {
  const { tutorialId } = useParams()
  const tutorial = tutorialCatalog.find((item) => item.id === tutorialId)
  const {
    completedTutorials,
    moduleResults,
    quizProgress,
    storageError,
    startedTutorialIds,
  } = useTutorialProgress(userId)
  const [expandedSectionId, setExpandedSectionId] = useState(null)
  const [expandedReadingSectionId, setExpandedReadingSectionId] = useState(null)

  if (!tutorial) {
    return (
      <main className="page">
        <h1>Tutorial not found</h1>
        <Link to="/tutorials">Back to tutorials</Link>
      </main>
    )
  }

  const result = completedTutorials[tutorial.id]
  const attempt = quizProgress[tutorial.id]
  const started = startedTutorialIds.includes(tutorial.id)
  const courseSubject = tutorial.title.replace(/^Introduction to /, '')
  const completedCurrentVersion = result?.totalQuestions === tutorial.questions.length
  const answered = tutorial.questions.filter((_, index) => (
    attempt?.answers[index] !== null && attempt?.answers[index] !== undefined
  )).length
  const progress = completedCurrentVersion
    ? 100
    : Math.round((answered / tutorial.questions.length) * 100)

  return (
    <main className="page tutorial-hub tutorial-overview-page">
      <Link className="back-link" to="/tutorials">Back to tutorials</Link>
      <header className="tutorial-overview-hero">
        <div className={`tutorial-card-symbol tutorial-symbol-${tutorial.id}`} aria-hidden="true">
          {tutorial.symbol}
        </div>
        <div>
          <p className="eyebrow">{tutorial.category} · Tutorial overview</p>
          <h1>{tutorial.title}</h1>
          <p>{tutorial.description}</p>
        </div>
      </header>

      {storageError && <p className="notice" role="alert">{storageError}</p>}

      <section className="card tutorial-notes">
        <div className="tutorial-notes-heading">
          <div>
            <p className="eyebrow">The essentials</p>
            <h2>What you’ll learn</h2>
          </div>
          <span className="tutorial-duration">{tutorial.questions.length} quick questions</span>
        </div>
        <p className="tutorial-intro">{tutorial.intro}</p>
        <pre className="code-example"><code>{tutorial.codeExample}</code></pre>
        {result && (
          <div className="tutorial-result-callout">
            <span className="tutorial-result-check" aria-hidden="true">✓</span>
            <span>{completedCurrentVersion ? 'Best score' : 'Previous quiz score'} <strong>{result.bestScore}/{result.totalQuestions}</strong> · {result.attempts} {result.attempts === 1 ? 'attempt' : 'attempts'}</span>
          </div>
        )}
      </section>

      {tutorial.sections && (
        <section className="course-modules" aria-labelledby="course-modules-heading">
          <div className="course-modules-heading">
            <div>
              <p className="eyebrow">Course outline</p>
              <h2 id="course-modules-heading">{tutorial.sections.length} modules to build your {courseSubject} skills</h2>
            </div>
            <span>{tutorial.sections.length} modules</span>
          </div>
          <ol className="course-module-list">
            {tutorial.sections.map((section, index) => {
              const sectionIndices = tutorial.questions.flatMap((question, questionIndex) => (
                question.sectionId === section.id ? [questionIndex] : []
              ))
              const sectionAnswered = completedCurrentVersion
                ? sectionIndices.length
                : sectionIndices.filter((questionIndex) => (
                  attempt?.answers[questionIndex] !== null
                  && attempt?.answers[questionIndex] !== undefined
                )).length
              const sectionProgress = Math.round((sectionAnswered / sectionIndices.length) * 100)
              const expanded = expandedSectionId === section.id
              const readingExpanded = expandedReadingSectionId === section.id
              const moduleResult = moduleResults[`${tutorial.id}:${section.id}`]

              return (
                <li key={section.id}>
                  <div className={`course-module${expanded ? ' is-expanded' : ''}`}>
                    <button
                      className="course-module-summary"
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`module-panel-${section.id}`}
                      onClick={() => {
                        setExpandedSectionId(expanded ? null : section.id)
                        setExpandedReadingSectionId(null)
                      }}
                    >
                      <span className="course-module-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                      <div className="course-module-content">
                        <div className="course-module-copy">
                          <h3>{section.title}</h3>
                          <p>{section.description}</p>
                          {moduleResult && (
                            <p className={`course-module-summary-result is-${moduleResult.status}`}>
                              {moduleResult.status === 'completed' ? 'Completed' : 'Failed / Incomplete'}
                              {' · '}
                              {moduleResult.score}/{moduleResult.totalQuestions} correct
                            </p>
                          )}
                        </div>
                        <div className="course-module-progress">
                          <span>{sectionAnswered} of {sectionIndices.length} answered</span>
                          <progress value={sectionProgress} max="100" aria-label={`${section.title} progress`}>
                            {sectionProgress}%
                          </progress>
                        </div>
                      </div>
                    </button>
                    <div
                      className="course-module-panel"
                      id={`module-panel-${section.id}`}
                      aria-hidden={!expanded}
                    >
                      <div className="course-module-panel-inner">
                        <div className="course-module-expanded">
                          <div className="course-module-details">
                            <p>{sectionIndices.length} questions in this module.</p>
                            <button
                              className="text-button course-module-reading-toggle"
                              type="button"
                              aria-expanded={readingExpanded}
                              aria-controls={`module-reading-${section.id}`}
                              tabIndex={expanded ? 0 : -1}
                              onClick={() => setExpandedReadingSectionId(
                                readingExpanded ? null : section.id,
                              )}
                            >
                              {readingExpanded ? 'Hide Reading Material' : 'Show Reading Material'}
                            </button>
                            <div
                              className={`course-module-reading${readingExpanded ? ' is-expanded' : ''}`}
                              id={`module-reading-${section.id}`}
                              aria-hidden={!readingExpanded}
                            >
                              <div className="course-module-reading-inner">
                                <p>{section.readingMaterial}</p>
                              </div>
                            </div>
                          </div>
                          <Link
                            className="button course-module-quiz-link"
                            to={`/tutorials/${tutorial.id}/quiz?section=${encodeURIComponent(section.id)}`}
                            tabIndex={expanded ? 0 : -1}
                          >
                            {moduleResult?.status === 'failed' ? 'Retry' : moduleResult?.status === 'completed' ? 'Review' : 'Start'} {section.title} quiz <span aria-hidden="true">→</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      <section className="tutorial-start-panel" aria-label="Quiz progress">
        <div>
          <p className="eyebrow">{completedCurrentVersion ? 'Ready for another round?' : started ? 'Pick up where you left off' : 'Ready when you are'}</p>
          <h2>{completedCurrentVersion ? 'Try for a new personal best.' : 'Make it stick with a quick quiz.'}</h2>
          <div className="tutorial-inline-progress">
            <span>{completedCurrentVersion ? 'Completed' : `${answered} of ${tutorial.questions.length} answered`}</span>
            <progress value={progress} max="100" aria-label="Tutorial completion">{progress}%</progress>
          </div>
        </div>
        <Link className="button tutorial-start-button" to={`/tutorials/${tutorial.id}/quiz`}>
          {completedCurrentVersion || (result && !attempt) ? 'Take quiz again' : started ? 'Continue quiz' : 'Start quiz'}
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  )
}

export default TutorialOverview
