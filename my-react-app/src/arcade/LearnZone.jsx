import { Link } from 'react-router-dom'
import { tutorialCatalog } from '../data/tutorialCatalog.js'
import { EXAM_CONFIGS } from '../utils/comprehensiveExam.js'
import { zonePath } from './zone.js'

/**
 * The Learn zone: the coding courses and exams, for teens and grown-ups.
 * Courses and exams need a sign-in (their pages ask for it); this view itself is open to all.
 */
export default function LearnZone({ session, text }) {
  const subjectExams = Object.values(EXAM_CONFIGS).filter((exam) => exam.tutorialId)
  const prepExam = EXAM_CONFIGS.preparation

  return (
    <div className="learn">
      <section className="learn-hero" aria-labelledby="learn-title">
        <div className="learn-hero-copy">
          <p className="learn-eyebrow">{text.learnEyebrow}</p>
          <h1 id="learn-title">{text.learnTitle}</h1>
          <p className="learn-intro">{text.hubIntro}</p>
          <div className="learn-actions">
            {session ? (
              <>
                <Link className="learn-button is-primary" to="/developer">{text.hubOpen}</Link>
                <Link className="learn-button" to="/dashboard">{text.hubAccount}</Link>
              </>
            ) : (
              <Link className="learn-button is-primary" to="/login" state={{ from: { pathname: '/developer' } }}>
                {text.hubSignIn}
              </Link>
            )}
          </div>
        </div>
        {/* a little code window: what learners will build */}
        <div className="learn-art" aria-hidden="true" lang="en">
          <div className="learn-art-bar"><i /><i /><i /></div>
          <pre>
            <span className="t-tag">&lt;h1&gt;</span>Hello, web!<span className="t-tag">&lt;/h1&gt;</span>{'\n'}
            <span className="t-tag">&lt;button&gt;</span>Play<span className="t-tag">&lt;/button&gt;</span>{'\n'}
            {'\n'}
            <span className="t-key">button</span>.onclick = () =&gt;{'\n'}
            {'  '}alert(<span className="t-str">'Hi!'</span>)
          </pre>
        </div>
      </section>

      <section className="learn-section" aria-labelledby="learn-courses-heading">
        <h2 id="learn-courses-heading">{text.learnCourses}</h2>
        <ul className="learn-courses" lang="en">
          {tutorialCatalog.map((course) => (
            <li key={course.id}>
              <Link to={`/tutorials/${course.id}`} className="learn-course">
                <span className="learn-symbol" aria-hidden="true">{course.symbol}</span>
                <span className="learn-course-body">
                  <span className="learn-course-category">{course.category}</span>
                  <strong>{course.title}</strong>
                  <span className="learn-course-text">{course.description}</span>
                  <span className="learn-course-meta">{course.sections.length} modules</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="learn-section" aria-labelledby="learn-exams-heading">
        <h2 id="learn-exams-heading">{text.hubExams}</h2>
        <ul className="learn-exams" lang="en">
          <li>
            <Link to="/exam" className="learn-exam is-featured">
              <strong>{prepExam.title}</strong>
              <span>{prepExam.questionCount} questions · {Math.round(prepExam.durationSeconds / 60)} min</span>
            </Link>
          </li>
          {subjectExams.map((exam) => (
            <li key={exam.id}>
              <Link to={`/exams/${exam.id}`} className="learn-exam">
                <strong>{exam.title}</strong>
                <span>{exam.questionCount} questions · {Math.round(exam.durationSeconds / 60)} min</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="learn-play-link"><Link to={zonePath('play')}>{text.learnPlayLink}</Link></p>
    </div>
  )
}
