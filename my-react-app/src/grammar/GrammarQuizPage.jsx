import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ArcadeHeader from '../arcade/ArcadeHeader.jsx'
import { useLanguage } from '../arcade/preferences.js'
import { ARCADE_TEXT } from '../arcade/text.js'
import { formatDigits } from '../utils/mathHeroText.js'
import { playSound } from '../utils/sound.js'
import { cardPath, getCard, getCourse, grammarPath, nextCard, parseCardPath, starsKey } from './catalog.js'
import { Stars } from './GrammarZone.jsx'
import { usePageMeta } from './meta.js'
import { saveStars } from './progress.js'
import { promptPieces, starsFor } from './tenseModules.js'
import '../arcade/arcade.css'
import './grammar.css'

/** The sentence with its gap: a blank before answering, then filled with the chosen words. */
function Prompt({ prompt, fill, correct }) {
  return (
    <p className="grammar-prompt" lang="en">
      {promptPieces(prompt, fill).map((piece, index) => (piece.gap
        ? <span key={index} className={`grammar-gap${fill ? (correct ? ' is-right' : ' is-wrong') : ''}`}>{piece.text || ' '}</span>
        : <span key={index}>{piece.text}</span>))}
    </p>
  )
}

/** The recap for one of the other courses: the rule, its formula badge, and an example. */
function RuleRecap({ card, language, text }) {
  const { recap } = card
  return (
    <div className="grammar-recap-grid">
      <div className="grammar-recap-box is-when">
        <h2>{text.grammarRule}</h2>
        <p>{recap.rule[language]}</p>
      </div>
      <div className="grammar-recap-box is-form">
        <h2>{text.grammarFormula}</h2>
        <ul className="grammar-formulas" lang="en"><li><code>{card.badge}</code></li></ul>
      </div>
      <div className="grammar-recap-box is-examples is-wide">
        <h2>{text.grammarExamples}</h2>
        <ul className="grammar-examples" lang="en">{recap.example.split(' · ').map((line) => <li key={line}>{line}</li>)}</ul>
      </div>
    </div>
  )
}

/** The tenses' fuller recap: when to use it, how to make it, signal words, examples and a tip. */
function TenseRecap({ card, language, text }) {
  const { recap } = card
  return (
    <>
      <div className="grammar-recap-grid">
        <div className="grammar-recap-box is-when">
          <h2>{text.grammarWhen}</h2>
          <p>{recap.use[language]}</p>
        </div>
        <div className="grammar-recap-box is-form">
          <h2>{text.grammarForm}</h2>
          <ul className="grammar-formulas" lang="en">
            {recap.form.map((row) => (
              <li key={row.pattern}><code>{row.pattern}</code><span>{row.example}</span></li>
            ))}
          </ul>
        </div>
        <div className="grammar-recap-box is-signals">
          <h2>{text.grammarSignals}</h2>
          <ul className="grammar-chips" lang="en">{recap.signals.map((word) => <li key={word}>{word}</li>)}</ul>
        </div>
        <div className="grammar-recap-box is-examples">
          <h2>{text.grammarExamples}</h2>
          <ul className="grammar-examples" lang="en">{recap.examples.map((line) => <li key={line}>{line}</li>)}</ul>
        </div>
      </div>
      <p className="grammar-tip"><strong>{text.grammarTip}:</strong> <span lang="en">{recap.tip}</span></p>
    </>
  )
}

function Recap({ course, card, language, text, onBegin }) {
  return (
    <section className="grammar-recap" aria-labelledby="recap-title">
      <p className="learn-eyebrow">{text.grammarRecap} · {course.title[language]}</p>
      <h1 id="recap-title" lang="en">{card.title.en}</h1>
      {language === 'bn' && card.title.bn !== card.title.en && <p className="grammar-recap-bn">{card.title.bn}</p>}
      {course.kind === 'tenses'
        ? <TenseRecap card={card} language={language} text={text} />
        : <RuleRecap card={card} language={language} text={text} />}
      <button type="button" className="learn-button is-primary grammar-begin" onClick={onBegin}>
        {text.grammarBegin} <span aria-hidden="true">→</span>
      </button>
    </section>
  )
}

function Question({ question, index, total, picked, onPick, onNext, language, text }) {
  const nextButton = useRef(null)
  const answered = picked !== null
  const correct = picked === question.answer
  const chosen = question.options.find((option) => option.id === picked)
  const answer = question.options.find((option) => option.id === question.answer)
  const isLast = index === total - 1

  useEffect(() => {
    if (answered) nextButton.current?.focus()
  }, [answered])

  return (
    <section className="grammar-question" aria-labelledby="question-count">
      <div className="grammar-progress" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={i < index ? 'is-done' : i === index ? 'is-now' : ''} />
        ))}
      </div>
      <p id="question-count" className="grammar-count">
        {text.grammarQuestionOf(formatDigits(index + 1, language), formatDigits(total, language))}
      </p>
      <Prompt prompt={question.prompt} fill={answered && question.prompt.includes('___') ? chosen.text : null} correct={correct} />
      <p className="grammar-pick">{text.grammarPick}</p>

      <div className="grammar-options" role="group" aria-label={text.grammarPick} lang="en">
        {question.options.map((option) => {
          const state = !answered ? '' : option.id === question.answer ? ' is-right' : option.id === picked ? ' is-wrong' : ' is-dim'
          return (
            <button
              key={option.id}
              type="button"
              className={`grammar-option${state}`}
              disabled={answered}
              aria-pressed={option.id === picked}
              onClick={() => onPick(option.id)}
            >
              <span className="grammar-option-letter" aria-hidden="true">{option.id.toUpperCase()}</span>
              <span>{option.text}</span>
              {answered && option.id === question.answer && <span className="grammar-option-mark" aria-hidden="true">✓</span>}
              {answered && option.id === picked && !correct && <span className="grammar-option-mark" aria-hidden="true">✗</span>}
            </button>
          )
        })}
      </div>

      <div className="grammar-feedback-slot" aria-live="polite">
        {answered && (
          <div className={`grammar-feedback ${correct ? 'is-right' : 'is-wrong'}`}>
            <p className="grammar-feedback-title">{correct ? text.grammarRight : text.grammarWrong}</p>
            {!correct && <p lang="en">{chosen.why}</p>}
            {!correct && <p><strong>{text.grammarAnswerWas}</strong> <span lang="en">{answer.text}</span></p>}
            <p lang="en">{question.explanation}</p>
            <button ref={nextButton} type="button" className="learn-button is-primary" onClick={onNext}>
              {isLast ? text.grammarFinish : text.grammarNext} <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function Results({ course, card, score, total, newBest, language, text, onRetry, onReread }) {
  const stars = starsFor(score, total)
  const next = nextCard(course, card.id)
  return (
    <section className={`grammar-results is-${stars}`} aria-labelledby="results-title">
      <Stars count={stars} label={text.grammarStarsLabel(formatDigits(stars, language))} />
      <h1 id="results-title">{text.grammarScore(formatDigits(score, language), formatDigits(total, language))}</h1>
      <p>{text.grammarResult[stars]}</p>
      {newBest && <p className="grammar-new-best">{text.grammarNewBest}</p>}
      <div className="learn-actions">
        {next
          ? <Link className="learn-button is-primary" to={cardPath(course.id, next.id)}>{text.grammarNextModule(next.title.en)}</Link>
          : <p className="grammar-all-done">{text.grammarAllDone}</p>}
        <button type="button" className="learn-button" onClick={onRetry}>{text.grammarRetry}</button>
        <button type="button" className="learn-button" onClick={onReread}>{text.grammarReread}</button>
      </div>
    </section>
  )
}

function Quiz({ course, card, language, text }) {
  const [stage, setStage] = useState('recap') // recap → quiz → done
  const [index, setIndex] = useState(0)
  const [picks, setPicks] = useState([])
  const [newBest, setNewBest] = useState(false)

  const questions = card.questions
  const picked = picks[index] ?? null
  const score = picks.filter((pick, i) => pick === questions[i].answer).length

  const restart = (nextStage) => {
    setPicks([])
    setIndex(0)
    setNewBest(false)
    setStage(nextStage)
    window.scrollTo(0, 0)
  }

  const pick = (optionId) => {
    if (picked !== null) return
    const isRight = optionId === questions[index].answer
    playSound(isRight ? 'correct' : 'wrong')
    setPicks((current) => { const next = [...current]; next[index] = optionId; return next })
  }

  const next = () => {
    if (index < questions.length - 1) {
      setIndex(index + 1)
      return
    }
    const stars = starsFor(score, questions.length)
    setNewBest(saveStars(starsKey(course.id, card.id), stars) && stars > 0)
    playSound('complete')
    setStage('done')
  }

  if (stage === 'recap') return <Recap course={course} card={card} language={language} text={text} onBegin={() => { playSound('click'); setStage('quiz') }} />
  if (stage === 'done') {
    return (
      <Results
        course={course}
        card={card}
        score={score}
        total={questions.length}
        newBest={newBest}
        language={language}
        text={text}
        onRetry={() => restart('quiz')}
        onReread={() => restart('recap')}
      />
    )
  }
  return (
    <Question
      key={index}
      question={questions[index]}
      index={index}
      total={questions.length}
      picked={picked}
      onPick={pick}
      onNext={next}
      language={language}
      text={text}
    />
  )
}

/**
 * One topic card: its rule recap, then its questions. Open to everyone.
 * /grammar/:first is a tense (/grammar/simple-past); /grammar/:first/:second is a card in
 * another course (/grammar/articles-prepositions/a-or-an).
 */
export default function GrammarQuizPage({ theme, onToggleTheme }) {
  const { first, second } = useParams()
  const { courseId, cardId } = parseCardPath(first, second)
  const found = getCard(courseId, cardId)
  const backCourse = found?.course ?? getCourse(courseId)
  const [language] = useLanguage()
  const text = ARCADE_TEXT[language]
  const backTo = grammarPath(backCourse?.id)
  const backLabel = backCourse?.kind === 'tenses' ? text.grammarBackTenses : text.grammarBack

  usePageMeta(
    found ? `${found.card.title.en} Quiz: ${found.course.title.en} | Bulbuli` : 'English Grammar | Bulbuli',
    found
      ? `${found.card.recap.rule?.en ?? found.card.recap.use.en} Read the rule, then answer ${found.card.questions.length} questions with an explanation for every choice.`
      : 'Free English grammar quizzes for learners.',
  )

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [first, second])

  return (
    <div className="arcade is-grammar-page" data-zone="learn" lang={language}>
      <ArcadeHeader
        theme={theme}
        onToggleTheme={onToggleTheme}
        back={{ to: backTo, label: backLabel }}
      />
      <main id="main" className="arcade-main grammar-stage">
        {found
          ? <Quiz key={`${found.course.id}/${found.card.id}`} course={found.course} card={found.card} language={language} text={text} />
          : (
            <div className="grammar-recap">
              <h1>{text.grammarMissing}</h1>
              <Link className="learn-button is-primary" to={backTo}>{backLabel}</Link>
            </div>
          )}
      </main>
    </div>
  )
}
