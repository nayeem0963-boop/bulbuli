import { useCallback, useEffect, useRef, useState } from 'react'
import { useGameProgress } from '../../hooks/useGameProgress.js'
import { isMuted, playSound } from '../../utils/sound.js'
import { formatDigits } from '../../utils/mathHeroText.js'
import { DECKS, getDeck } from './decks.js'
import {
  createGame, flipCard, getLevel, hideOpenCards, isFaceUp, LEVELS, MISMATCH_DELAY, starsFor, xpFor,
} from './engine.js'
import { MEMORY_MATCH_TEXT } from './text.js'
import './memory-match.css'
import { GameFullscreenButton } from '../../arcade/GameFullscreen.jsx'

const GAME_ID = 'memory-match'

/** Says the word out loud when the browser has a voice for that language. Silent otherwise. */
function speak(word, language) {
  if (isMuted() || typeof window === 'undefined' || !window.speechSynthesis) return
  const lang = language === 'bn' ? 'bn' : 'en'
  const voice = window.speechSynthesis.getVoices().find((candidate) => candidate.lang?.toLowerCase().startsWith(lang))
  if (!voice && lang === 'bn') return
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = voice?.lang ?? 'en-US'
  if (voice) utterance.voice = voice
  utterance.rate = 0.9
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

function Stars({ count, label, size = 'md' }) {
  return (
    <span className={`mm-stars is-${size}`} role="img" aria-label={label}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= count ? 'is-on' : ''} aria-hidden="true">★</span>
      ))}
    </span>
  )
}

function Card({ card, index, faceUp, matched, language, text, onFlip }) {
  const word = card.item.word[language]
  const label = !faceUp
    ? text.hiddenCard(formatDigits(index + 1, language))
    : card.face === 'word' ? text.wordCard(word) : text.pictureCard(word)

  return (
    <button
      type="button"
      className={`mm-card${faceUp ? ' is-up' : ''}${matched ? ' is-matched' : ''}`}
      onClick={() => onFlip(card.id)}
      aria-label={label}
      aria-disabled={matched || undefined}
    >
      <span className="mm-card-inner" aria-hidden="true">
        <span className="mm-card-back" />
        <span
          className={`mm-card-front is-${card.face}${card.face === 'word' && word.length > 7 ? ' is-long' : ''}`}
          lang={card.face === 'word' ? language : undefined}
        >
          {card.face === 'word' ? word : card.item.picture}
        </span>
      </span>
    </button>
  )
}

export default function MemoryMatch({ playerId, language }) {
  const text = MEMORY_MATCH_TEXT[language]
  const n = (value) => formatDigits(value, language)
  const { games, saveGameResult, storageError } = useGameProgress(playerId)
  const record = games[GAME_ID] ?? {}

  const [deckId, setDeckId] = useState(() => getDeck(record.deckId).id)
  const [levelId, setLevelId] = useState(() => getLevel(record.levelId).id)
  const [game, setGame] = useState(null) // null = choosing a set and level
  const [result, setResult] = useState(null)
  const [announcement, setAnnouncement] = useState('')
  const hideTimer = useRef(null)
  const savedBoard = useRef(null)

  const deck = getDeck(deckId)
  const level = getLevel(levelId)
  const bestKey = (deckKey, levelKey) => `${deckKey}:${levelKey}`

  useEffect(() => () => window.clearTimeout(hideTimer.current), [])

  const start = useCallback((nextLevelId = levelId) => {
    window.clearTimeout(hideTimer.current)
    playSound('click')
    setLevelId(nextLevelId)
    setResult(null)
    setAnnouncement('')
    setGame(createGame(getDeck(deckId), getLevel(nextLevelId)))
  }, [deckId, levelId])

  const flip = (cardId) => {
    if (!game || game.won) return
    const next = flipCard(game, cardId)
    if (next === game) return
    setGame(next)

    if (next.open.length === 1) {
      playSound('click')
      return
    }
    if (next.lastMatch) {
      const word = next.cards.find((card) => card.pairId === next.lastMatch).item.word[language]
      playSound(next.won ? 'complete' : 'correct')
      speak(word, language)
      setAnnouncement(text.found(word))
      return
    }
    playSound('wrong')
    setAnnouncement(text.tryAgain)
    hideTimer.current = window.setTimeout(() => setGame((current) => hideOpenCards(current)), MISMATCH_DELAY)
  }

  // Finishing a board: save stars and XP once, then show the celebration.
  useEffect(() => {
    if (!game?.won || savedBoard.current === game) return
    savedBoard.current = game
    const stars = starsFor(game.moves, game.pairs)
    const xp = xpFor(game.pairs, stars)
    const key = bestKey(deckId, levelId)
    saveGameResult(GAME_ID, (previous) => ({
      ...previous,
      deckId,
      levelId,
      plays: (previous.plays ?? 0) + 1,
      bestStars: { ...previous.bestStars, [key]: Math.max(previous.bestStars?.[key] ?? 0, stars) },
    }), xp)
    const cheer = text.cheers[Math.floor(Math.random() * text.cheers.length)]
    setResult({ stars, xp, moves: game.moves, cheer })
  }, [deckId, game, levelId, saveGameResult, text.cheers])

  if (!game) {
    return (
      <div className="mm" lang={language}>
        <header className="mm-header game-fs-header">
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
          <GameFullscreenButton />
        </header>
        {storageError && <p className="notice" role="alert">{storageError}</p>}

        <section className="mm-setup" aria-labelledby="mm-set-heading">
          <h2 id="mm-set-heading">{text.pickSet}</h2>
          <div className="mm-choices is-sets">
            {DECKS.map((option) => (
              <button
                key={option.id}
                type="button"
                className="mm-choice"
                aria-pressed={option.id === deckId}
                onClick={() => { playSound('click'); setDeckId(option.id) }}
              >
                <span className="mm-choice-icon" aria-hidden="true">{option.icon}</span>
                <span className="mm-choice-label">{option.name[language]}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mm-setup" aria-labelledby="mm-level-heading">
          <h2 id="mm-level-heading">{text.pickLevel}</h2>
          <div className="mm-choices is-levels">
            {LEVELS.map((option) => {
              const best = record.bestStars?.[bestKey(deckId, option.id)] ?? 0
              return (
                <button
                  key={option.id}
                  type="button"
                  className="mm-choice"
                  aria-pressed={option.id === levelId}
                  onClick={() => { playSound('click'); setLevelId(option.id) }}
                >
                  <span className="mm-choice-label">{text.levelName(n(option.id))}</span>
                  <span className="mm-choice-hint">{text.levelHint[option.match](n(option.pairs))}</span>
                  <Stars count={best} size="sm" label={text.bestStars(n(best))} />
                </button>
              )
            })}
          </div>
        </section>

        <button type="button" className="mm-primary mm-start" onClick={() => start()}>
          {text.start}
        </button>
      </div>
    )
  }

  return (
    <div className="mm is-playing" lang={language}>
      <header className="mm-header is-compact game-fs-header">
        <h1>{text.title}</h1>
        <p>{deck.icon} {deck.name[language]} · {text.levelName(n(level.id))}</p>
        <GameFullscreenButton />
      </header>

      <div className="mm-bar">
        <p className="mm-count">
          <span>{text.pairsFound}</span>
          <strong>{n(game.matched.length)}/{n(game.pairs)}</strong>
        </p>
        <p className="mm-count">
          <span>{text.moves}</span>
          <strong>{n(game.moves)}</strong>
        </p>
        <div className="mm-bar-actions">
          <button type="button" className="mm-secondary" onClick={() => start()}>{text.newBoard}</button>
          <button type="button" className="mm-secondary" onClick={() => { setGame(null); setResult(null) }}>
            {text.changeLevel}
          </button>
        </div>
      </div>

      {level.match === 'word' && <p className="mm-tip">{text.wordTip}</p>}

      <div
        className="mm-grid"
        style={{ '--columns': level.columns, '--rows': Math.ceil(game.cards.length / level.columns) }}
        data-cards={game.cards.length}
      >
        {game.cards.map((card, index) => (
          <Card
            key={card.id}
            card={card}
            index={index}
            faceUp={isFaceUp(game, card)}
            matched={game.matched.includes(card.pairId)}
            language={language}
            text={text}
            onFlip={flip}
          />
        ))}
      </div>
      <p className="visually-hidden" aria-live="polite">{announcement}</p>

      {result && (
        <div className="mm-win-backdrop">
          <section className="mm-win" role="dialog" aria-modal="true" aria-labelledby="mm-win-title">
            <p className="mm-win-cheer">{result.cheer}</p>
            <h2 id="mm-win-title">{text.wonTitle}</h2>
            <Stars count={result.stars} size="lg" label={text.starsLabel(n(result.stars))} />
            <p>{text.wonText(n(result.moves))}</p>
            <p className="mm-win-xp">{text.xpEarned(n(result.xp))}</p>
            <div className="mm-win-actions">
              {level.id < LEVELS.length && (
                <button type="button" className="mm-primary" autoFocus onClick={() => start(level.id + 1)}>
                  {text.nextLevel}
                </button>
              )}
              <button
                type="button"
                className={level.id < LEVELS.length ? 'mm-secondary' : 'mm-primary'}
                autoFocus={level.id === LEVELS.length}
                onClick={() => start()}
              >
                {text.playAgain}
              </button>
              <button type="button" className="mm-secondary" onClick={() => { setGame(null); setResult(null) }}>
                {text.changeLevel}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
