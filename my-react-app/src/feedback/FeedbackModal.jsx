/**
 * The "How was it?" card shown after a round, or when leaving a game.
 *
 *   😄 Fun!        one tap: says thank you and closes by itself
 *   😐 / 😖         shows four optional chips (Too Hard, Boring, Glitchy, Confusing) and Send
 *   Skip, ✕, Esc   closes without asking anything
 *
 * Rendered in place (not in a portal) so it keeps the day/night colours and, inside the
 * launcher, still shows in full screen. Keys pressed in the card don't reach the game.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { rememberFeedbackAsked } from '../session/feedbackPolicy.js'
import { FEEDBACK_TAGS, REACTIONS, submitFeedback } from './submitFeedback.js'
import { FEEDBACK_TEXT } from './text.js'
import './feedback-modal.css'

const EMOJI = { fun: '😄', okay: '😐', dislike: '😖' }
const THANKS_MS = 1300

export default function FeedbackModal({ open, game, trigger = 'completed', language = 'en', onClose }) {
  const text = FEEDBACK_TEXT[language] ?? FEEDBACK_TEXT.en
  const titleId = useId()
  const card = useRef(null)
  const [reaction, setReaction] = useState(null)
  const [tags, setTags] = useState([])
  const [sent, setSent] = useState(false)

  // fresh card each time it opens; focus moves into it
  useEffect(() => {
    if (!open) return undefined
    setReaction(null)
    setTags([])
    setSent(false)
    const frame = requestAnimationFrame(() => card.current?.querySelector('.fb-reaction')?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [open])

  // after "Thank you!", close by itself
  useEffect(() => {
    if (!sent) return undefined
    const timer = setTimeout(onClose, THANKS_MS)
    return () => clearTimeout(timer)
  }, [sent, onClose])

  if (!open || !game) return null
  const title = game.title[language] ?? game.title.en

  const skip = () => {
    if (sent) return
    rememberFeedbackAsked(game.id, false)
    onClose()
  }

  const send = (finalReaction, finalTags) => {
    submitFeedback({ gameId: game.id, reaction: finalReaction, tags: finalTags, trigger, language })
    rememberFeedbackAsked(game.id, true)
    setSent(true)
  }

  const pick = (id) => {
    setReaction(id)
    if (id === 'fun') send(id, [])
  }

  const toggleTag = (id) => setTags((current) => (current.includes(id) ? current.filter((t) => t !== id) : [...current, id]))

  const onKeyDown = (event) => {
    if (event.key === 'Tab') return // let the launcher keep Tab inside its dialog
    event.stopPropagation() // the game behind never sees these keys
    if (event.key === 'Escape') skip()
  }

  const showTags = reaction === 'okay' || reaction === 'dislike'

  return (
    <div className="fb-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) skip() }}>
      <div
        ref={card}
        className="fb-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
      >
        {sent ? (
          <p className="fb-thanks" role="status">
            <span className="fb-thanks-emoji" aria-hidden="true">🎉</span>
            {text.thanks}
          </p>
        ) : (
          <>
            <button type="button" className="fb-close" onClick={skip} aria-label={text.skipLabel} title={text.skipLabel}>
              <span aria-hidden="true">✕</span>
            </button>
            <h2 id={titleId} className="fb-title">{trigger === 'exit' ? text.titleExit : text.titleCompleted}</h2>
            <p className="fb-question">{text.question(title)}</p>

            <div className="fb-reactions" role="group" aria-label={text.reactionsLabel}>
              {REACTIONS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`fb-reaction is-${id}${reaction === id ? ' is-picked' : ''}`}
                  aria-pressed={reaction === id}
                  onClick={() => pick(id)}
                >
                  <span className="fb-reaction-emoji" aria-hidden="true">{EMOJI[id]}</span>
                  <span className="fb-reaction-label">{text.reactions[id]}</span>
                </button>
              ))}
            </div>

            {showTags && (
              <div className="fb-more">
                <p className="fb-tags-prompt">{text.tagsPrompt}</p>
                <div className="fb-tags">
                  {FEEDBACK_TAGS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={`fb-chip${tags.includes(id) ? ' is-picked' : ''}`}
                      aria-pressed={tags.includes(id)}
                      onClick={() => toggleTag(id)}
                    >
                      {text.tags[id]}
                    </button>
                  ))}
                </div>
                <button type="button" className="fb-send" onClick={() => send(reaction, tags)}>
                  {text.send} <span aria-hidden="true">👍</span>
                </button>
              </div>
            )}

            {!reaction && (
              <button type="button" className="fb-skip" onClick={skip}>{text.skip}</button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
