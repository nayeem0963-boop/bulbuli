import { Link } from 'react-router-dom'
import { zonePath } from '../arcade/zone.js'
import { formatDigits } from '../utils/mathHeroText.js'
import { useGrammarStars } from './progress.js'
import { TENSE_GROUPS } from './tenseModules.js'
import './grammar.css'

export function Stars({ count, label }) {
  return (
    <span className="grammar-stars" role="img" aria-label={label}>
      {[0, 1, 2].map((i) => <span key={i} className={i < count ? 'is-on' : ''} aria-hidden="true">★</span>)}
    </span>
  )
}

function ModuleCard({ module, stars, language, text }) {
  const tried = stars !== undefined
  return (
    <li>
      <Link to={`/grammar/${module.id}`} className={`grammar-card is-${module.time}`}>
        <span className="grammar-card-number" aria-hidden="true">{formatDigits(module.order, language)}</span>
        <span className="grammar-card-body">
          <strong lang="en">{module.title.en}</strong>
          {language === 'bn' && <span className="grammar-card-bn">{module.title.bn}</span>}
          <code className="grammar-card-form" lang="en">{module.recap.form[0].pattern}</code>
          <span className="grammar-card-meta">
            <span>{text.grammarQuestions(formatDigits(module.questions.length, language))}</span>
            {tried
              ? <Stars count={stars} label={text.grammarStarsLabel(formatDigits(stars, language))} />
              : <span className="grammar-card-new">{text.grammarNotTried}</span>}
          </span>
        </span>
      </Link>
    </li>
  )
}

/**
 * The Learn zone's Grammar track: the 12 tense quizzes, grouped as Present, Past and Future.
 * Open to everyone (no sign-in); best stars are kept on this device.
 */
export default function GrammarZone({ language, text }) {
  const stars = useGrammarStars()

  return (
    <div className="learn grammar">
      <section className="learn-hero" aria-labelledby="grammar-title">
        <div className="learn-hero-copy">
          <p className="learn-eyebrow">{text.grammarEyebrow}</p>
          <h1 id="grammar-title">{text.grammarTitle}</h1>
          <p className="learn-intro">{text.grammarIntro}</p>
        </div>
        {/* a little timeline: the three times every tense belongs to */}
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
      </section>

      {TENSE_GROUPS.map((group) => (
        <section key={group.time} className={`learn-section grammar-group is-${group.time}`} aria-labelledby={`grammar-${group.time}`}>
          <h2 id={`grammar-${group.time}`}>
            {text.grammarTimes[group.time]}
            <span className="grammar-group-hint">{text.grammarTimeHints[group.time]}</span>
          </h2>
          <ul className="grammar-cards">
            {group.modules.map((module) => (
              <ModuleCard key={module.id} module={module} stars={stars[module.id]} language={language} text={text} />
            ))}
          </ul>
        </section>
      ))}

      <p className="learn-play-link"><Link to={zonePath('learn', 'coding')}>{text.grammarCodingLink}</Link></p>
    </div>
  )
}
