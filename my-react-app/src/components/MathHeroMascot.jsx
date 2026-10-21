import { useEffect, useRef, useState } from 'react'
import { formatDigits, MATH_HERO_TEXT } from '../utils/mathHeroText.js'

const TALK_DURATION_MS = 3600

// A hint that points the way without giving the answer away.
function getHint(question, text, language) {
  if (!question) return null
  const left = Number(question.left)
  const right = Number(question.right)
  const adding = question.operator === '+'
  if (!adding && question.operator !== '-' && question.operator !== '−') return null

  const n = (value) => formatDigits(value, language)
  const smaller = Math.min(left, right)
  if (smaller <= 10) {
    return adding
      ? text.hintCountUp(n(Math.max(left, right)), n(smaller))
      : text.hintCountBack(n(left), n(right))
  }

  // Counting one by one stops helping with bigger numbers, so switch to place value.
  const hundreds = Math.max(left, right) >= 100
  return adding ? text.hintAddPlaces(hundreds) : text.hintSubtractPlaces(hundreds)
}

function getLines({ question, gameOver, text, language }) {
  if (gameOver) return [text.mascotGameOver]
  const hint = getHint(question, text, language)
  return hint ? [hint, ...text.cheers] : text.cheers
}

function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// Bangla voices are missing on most Windows computers (Chrome only offers English ones there),
// so Bangla falls back to Google Translate's speech audio. The page's `same-origin` referrer
// policy in index.html is what lets this audio load from another site.
const ONLINE_BANGLA_VOICE = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=bn&q='

function findVoice(language) {
  if (!canSpeak()) return null
  const prefix = language === 'bn' ? 'bn' : 'en'
  return window.speechSynthesis.getVoices().find((voice) => voice.lang?.toLowerCase().startsWith(prefix)) ?? null
}

function stopTalking(audioRef) {
  if (canSpeak()) window.speechSynthesis.cancel()
  if (audioRef.current) {
    audioRef.current.pause()
    audioRef.current.removeAttribute('src')
    audioRef.current = null
  }
}

function speak(line, { language, text, audioRef }) {
  const spoken = line.replace(text.hintPrefix, '')
  const voice = findVoice(language)

  try {
    if (language === 'bn' && !voice) {
      const audio = new Audio(`${ONLINE_BANGLA_VOICE}${encodeURIComponent(spoken)}`)
      // A touch faster and higher, so it sounds more like a small bird.
      audio.preservesPitch = false
      audio.playbackRate = 1.08
      audioRef.current = audio
      audio.play().catch((error) => console.warn('Unable to play the Bangla Math Hero voice.', error))
      return
    }

    if (!canSpeak()) return
    const utterance = new SpeechSynthesisUtterance(spoken)
    utterance.lang = language === 'bn' ? 'bn-BD' : 'en-US'
    if (voice) utterance.voice = voice
    utterance.pitch = 1.35
    utterance.rate = language === 'bn' ? 0.95 : 1.05
    window.speechSynthesis.speak(utterance)
  } catch (error) {
    console.warn('Unable to play the Math Hero voice.', error)
  }
}

function MathHeroMascot({ src, question, gameOver, muted, language = 'en' }) {
  const text = MATH_HERO_TEXT[language] ?? MATH_HERO_TEXT.en
  const [line, setLine] = useState(null)
  const [tapCount, setTapCount] = useState(0)
  const nextLine = useRef(0)
  const hideTimer = useRef(null)
  const audioRef = useRef(null)

  useEffect(() => () => {
    window.clearTimeout(hideTimer.current)
    stopTalking(audioRef)
  }, [])

  // Browsers load their voice list in the background; asking early means it is ready by the first tap.
  useEffect(() => {
    if (!canSpeak()) return undefined
    const warmUp = () => window.speechSynthesis.getVoices()
    warmUp()
    window.speechSynthesis.addEventListener?.('voiceschanged', warmUp)
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', warmUp)
  }, [])

  // A new question resets the order, so the first tap always offers a hint for it.
  useEffect(() => {
    nextLine.current = 0
  }, [question?.left, question?.operator, question?.right])

  // Switching language closes the bubble, so an old-language line never lingers.
  useEffect(() => {
    window.clearTimeout(hideTimer.current)
    setLine(null)
    nextLine.current = 0
    stopTalking(audioRef)
  }, [language])

  useEffect(() => {
    if (muted) stopTalking(audioRef)
  }, [muted])

  const handleTap = () => {
    const lines = getLines({ question, gameOver, text, language })
    const nextText = lines[nextLine.current % lines.length]
    nextLine.current += 1

    setLine(nextText)
    setTapCount((count) => count + 1)
    stopTalking(audioRef)
    if (!muted) speak(nextText, { language, text, audioRef })

    window.clearTimeout(hideTimer.current)
    // Longer lines (Bangla runs longer) stay up a little longer so they can be read.
    hideTimer.current = window.setTimeout(() => setLine(null), Math.max(TALK_DURATION_MS, nextText.length * 65))
  }

  return (
    <div className={`math-hero-mascot-wrap${line ? ' is-talking' : ''}`}>
      <button
        className="math-hero-mascot-button"
        type="button"
        onClick={handleTap}
        aria-label={text.talkToMascot}
      >
        {/* Re-keying the image restarts the pop animation on every tap. */}
        <img key={tapCount} className="math-hero-mascot" src={src} alt="" />
      </button>
      <p className="math-hero-speech" role="status" aria-live="polite">
        {line && <span key={tapCount}>{line}</span>}
      </p>
    </div>
  )
}

export default MathHeroMascot
