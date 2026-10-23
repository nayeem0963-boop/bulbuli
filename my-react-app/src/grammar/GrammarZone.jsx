import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { zonePath } from '../arcade/zone.js'
import { formatDigits } from '../utils/mathHeroText.js'
import { cardPath, COURSES, courseFromSearch, grammarPath, starsKey } from './catalog.js'
import { usePageMeta } from './meta.js'
import { useGrammarStars } from './progress.js'
import './grammar.css'

export function Stars({ count, label }) {
  return (
    <span className="grammar-stars" role="img" aria-label={label}>
      {[0, 1, 2].map((i) => <span key={i} className={i < count ? 'is-on' : ''} aria-hidden="true">★</span>)}
    </span>
  )
}

/** The row of courses at the top. Each is a link, so Back steps through the courses you opened. */
function CoursePicker({ current, language, text }) {
  const list = useRef(null)

  // On phones the picker is a sideways-scrolling row: bring the chosen course into view.
  useEffect(() => {
    const row = list.current
    const active = row?.querySelector('.is-active')
    if (!row || !active || row.scrollWidth <= row.clientWidth) return
    const target = active.parentElement.offsetLeft - (row.clientWidth - active.offsetWidth) / 2
    row.scrollTo({ left: Math.max(0, target - row.offsetLeft), behavior: 'auto' })
  }, [current.id])

  return (
    <nav className="grammar-picker" aria-label={text.grammarCourses}>
      <ul ref={list}>
        {COURSES.map((course) => {
          const active = course.id === current.id
          return (
            <li key={course.id}>
              <Link
                to={grammarPath(course.id)}
                className={`grammar-course-pick${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="grammar-course-icon" aria-hidden="true">{course.icon}</span>
                <span className="grammar-course-name">
                  <strong>{course.title[language]}</strong>
                  <span>{text.grammarTopics(formatDigits(course.cards.length, language))}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function TopicCard({ course, card, stars, language, text }) {
  const tried = stars !== undefined
  const showBangla = language === 'bn' && card.title.bn !== card.title.en
  return (
    <li>
      <Link to={cardPath(course.id, card.id)} className="grammar-card">
        <span className="grammar-card-number" aria-hidden="true">{formatDigits(card.order, language)}</span>
        <span className="grammar-card-body">
          <strong lang="en">{card.title.en}</strong>
          {showBangla && <span className="grammar-card-bn">{card.title.bn}</span>}
          <code className="grammar-card-form" lang="en">{card.badge}</code>
          <span className="grammar-card-meta">
            <span>{text.grammarQuestions(formatDigits(card.questions.length, language))}</span>
            {tried
              ? <Stars count={stars} label={text.grammarStarsLabel(formatDigits(stars, language))} />
              : <span className="grammar-card-new">{text.grammarNotTried}</span>}
          </span>
        </span>
      </Link>
    </li>
  )
}

/** The picture beside the heading: a timeline for the tenses, the course's rule badges for the rest. */
function HeroArt({ course, text }) {
  if (course.kind === 'tenses') {
    return (
      <div className="grammar-art" aria-hidden="true">
        <p className="grammar-art-sentence" lang="en">
          I <mark className="is-past">played</mark> · I <mark className="is-present">play</mark> · I <mark className="is-future">will play</mark>
        </p>
        <div className="grammar-art-line">
          {['past', 'present', 'future'].map((time) => (
            <span key={time} className={`grammar-art-stop is-${time}`}>
              <i />
              {text.grammarArt[time]}
            </span>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="grammar-art is-badges" aria-hidden="true">
      <span className="grammar-art-icon">{course.icon}</span>
      <ul lang="en">
        {course.sections.map((section) => (
          <li key={section.id} className={`is-tone-${section.tone}`}>{section.cards[0].badge}</li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The Learn zone's Grammar track: a course picker on top (12 Tenses and nine more courses),
 * then the chosen course's topic cards in sections. Open to everyone; stars stay on this device.
 */
export default function GrammarZone({ language, text }) {
  const { search } = useLocation()
  const course = courseFromSearch(search)
  const stars = useGrammarStars()
  const questionCount = course.cards.reduce((sum, card) => sum + card.questions.length, 0)

  usePageMeta(
    `${course.title.en}: English Grammar Quizzes | Bulbuli`,
    `${course.tagline.en}. ${course.cards.length} topics and ${questionCount} free quiz questions, each with a short rule recap and an explanation for every answer.`,
  )

  return (
    <div className="learn grammar">
      <CoursePicker current={course} language={language} text={text} />

      {/* Re-keyed per course, so switching course replays the entrance animation. */}
      <div key={course.id} className="grammar-course">
        <section className="learn-hero" aria-labelledby="grammar-title">
          <div className="learn-hero-copy">
            <p className="learn-eyebrow">{text.grammarEyebrow} · {course.title[language]}</p>
            <h1 id="grammar-title">{course.tagline[language]}</h1>
            <p className="learn-intro">{course.subtitle[language]}</p>
          </div>
          <HeroArt course={course} text={text} />
        </section>

        {course.sections.map((section) => (
          <section
            key={section.id}
            className={`learn-section grammar-group is-tone-${section.tone}`}
            aria-labelledby={`grammar-${section.id}`}
          >
            <h2 id={`grammar-${section.id}`}>
              {section.title[language]}
              <span className="grammar-group-hint">{section.hint[language]}</span>
            </h2>
            <ul className="grammar-cards">
              {section.cards.map((card) => (
                <TopicCard
                  key={card.id}
                  course={course}
                  card={card}
                  stars={stars[starsKey(course.id, card.id)]}
                  language={language}
                  text={text}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="learn-play-link"><Link to={zonePath('learn', 'coding')}>{text.grammarCodingLink}</Link></p>
    </div>
  )
}
