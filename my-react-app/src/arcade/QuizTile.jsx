import { formatDigits } from '../utils/mathHeroText.js'
import { COURSE_CATALOG } from '../courses/catalog.js'

/**
 * Home-page tile for Pro Coder (the HTML course; the card shows "Pro Coder", ages 12+). The course is not a registry game: it is played
 * on its own standalone page (quiz/index.html at the project root, data in src/courses/), served
 * at /quiz/ by vite.config.js in dev and built to dist/quiz/. So this tile uses a plain <a>
 * (a full page load), not <Link>. Its numbers come from src/courses/catalog.js, which the tests
 * keep in step with the real question bank.
 */
const HTML_COURSE = COURSE_CATALOG.find((c) => c.id === 'html')
const QUIZ = {
  href: HTML_COURSE.href,
  title: HTML_COURSE.title,
  tagline: {
    en: `${HTML_COURSE.questionCount} questions in ${HTML_COURSE.levelCount} levels, from <html> to forms, semantic HTML and accessibility. Each has a mini-lesson.`,
    bn: `<html> থেকে ফর্ম, সেমান্টিক HTML আর অ্যাক্সেসিবিলিটি পর্যন্ত ${formatDigits(String(HTML_COURSE.levelCount), 'bn')}টি লেভেলে ${formatDigits(String(HTML_COURSE.questionCount), 'bn')}টি প্রশ্ন, প্রতিটির সাথে ছোট্ট পাঠ (ইংরেজিতে)।`,
  },
  skill: HTML_COURSE.skill,
  ages: HTML_COURSE.ages,
}

/** The audience pills the quiz tile shows under ('all' = All Games). */
const QUIZ_FILTERS = ['all', 'logic']
export const showQuizTile = (filter) => QUIZ_FILTERS.includes(filter)

/** Adds the quiz tile to the pill counts from categoryCounts(), so each pill matches the cards shown. */
export const withQuizTile = (counts) =>
  Object.fromEntries(Object.entries(counts).map(([filter, n]) => [filter, n + (showQuizTile(filter) ? 1 : 0)]))

/** Tile art: a quiz card with a code question, four answers (one ticked) and a timer. Plain SVG. */
function QuizArt() {
  const answers = [
    { y: 52, letter: 'A', fill: '#ffffff' },
    { y: 66, letter: 'B', fill: '#7cc957' },
    { y: 80, letter: 'C', fill: '#ffffff' },
    { y: 94, letter: 'D', fill: '#ffffff' },
  ]
  return (
    <div className="art art-html-quiz" aria-hidden="true" style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <svg viewBox="0 0 160 110" width="100%" height="100%" style={{ maxHeight: 130 }}>
        {/* card */}
        <rect x="34" y="8" width="92" height="98" rx="8" fill="#1e293b" stroke="#241f3d" strokeWidth="2" />
        <rect x="42" y="16" width="76" height="26" rx="4" fill="#0b1220" />
        <text x="80" y="33" textAnchor="middle" fontFamily="monospace" fontWeight="700" fontSize="11" fill="#a5f3fc">&lt;?&gt;</text>
        {answers.map(({ y, letter, fill }) => (
          <g key={letter}>
            <rect x="42" y={y - 8} width="76" height="11" rx="3" fill={fill} opacity={fill === '#ffffff' ? 0.85 : 1} />
            <text x="48" y={y} fontFamily="monospace" fontWeight="700" fontSize="8" fill="#241f3d">{letter}</text>
          </g>
        ))}
        <path d="M104 60 L108 64 L115 55" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* timer */}
        <circle cx="132" cy="22" r="13" fill="#ffc145" stroke="#241f3d" strokeWidth="2" />
        <path d="M132 14 L132 22 L138 25" fill="none" stroke="#241f3d" strokeWidth="2" strokeLinecap="round" />
        {/* lightbulb hint */}
        <circle cx="22" cy="78" r="9" fill="#fff3a8" stroke="#241f3d" strokeWidth="2" />
        <rect x="18" y="86" width="8" height="6" rx="1.5" fill="#241f3d" />
      </svg>
    </div>
  )
}

export default function QuizTile({ language, text, index }) {
  const title = QUIZ.title[language]
  return (
    <li className="game-tile is-leaf" style={{ viewTransitionName: 'game-html-quiz', '--i': index }}>
      <a className="game-tile-link" href={QUIZ.href} aria-label={text.playGame(title)}>
        <div className="game-tile-art">
          <QuizArt />
          <span className="game-tile-badge">{text.newBadge}</span>
        </div>
        <div className="game-tile-body">
          <h3>{title}</h3>
          <p>{QUIZ.tagline[language]}</p>
          <p className="game-tile-meta">
            <span>{QUIZ.skill[language]}</span>
            <span>{text.ages(formatDigits(QUIZ.ages, language))}</span>
          </p>
        </div>
        <span className="game-tile-play" aria-hidden="true">{text.play}</span>
      </a>
    </li>
  )
}
