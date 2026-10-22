import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import BrandMark from '../arcade/BrandMark.jsx'
import mascot from '../assets/math-hero-mascot-cutout.webp'
import { useMuted } from '../arcade/preferences.js'
import { AD_LAYOUT as L, AD_TEXT } from './adContent.js'
import { speak, warmUpVoices } from './adVoice.js'
import { renderAdCardBlob } from './renderAdCard.js'
import './ad-card.css'

// 1 card unit = 1% of the card's width (the card is a size container), matching the canvas export.
const u = (n) => `${n}cqw`

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

const isTouchDevice = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

function canShareFiles() {
  if (typeof navigator === 'undefined' || !navigator.canShare || typeof File === 'undefined') return false
  try {
    return navigator.canShare({ files: [new File([''], 'test.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}

/**
 * Math Hero advert card with a "Play" link and a Download & Share button.
 * Tapping Math Hero, his speech bubble or the Listen button makes him read his message aloud in
 * Bengali (bn-BD, then any bn voice; see adVoice.js). While he talks, the bubble shows the words he says.
 *
 * Props:
 *   language   'en' | 'bn'
 *   to         where the Play button goes: an in-app path ('/games/math-hero') or a full URL
 *   voiceLanguage  the language Math Hero speaks in (default 'bn')
 *   shareUrl   public link included when the picture is shared
 *   siteLabel  web address printed on the picture
 */
export default function MathHeroAdCard({
  language = 'en',
  to = '/games/math-hero',
  shareUrl = 'https://bulbuli.org/games/math-hero',
  siteLabel = 'bulbuli.org',
  voiceLanguage = 'bn',
}) {
  const text = AD_TEXT[language] ?? AD_TEXT.en
  const [status, setStatus] = useState({ kind: 'idle', message: '' })
  const [shareSupported] = useState(canShareFiles)
  const [touch] = useState(isTouchDevice)
  const pngPromise = useRef(null)
  const { muted } = useMuted()
  const [talking, setTalking] = useState(false)
  const voice = useRef(null)

  const stopTalking = () => {
    voice.current?.stop()
    voice.current = null
    setTalking(false)
  }

  useEffect(() => warmUpVoices(), [])

  // Stop the voice when the language changes, the sound is muted, or the card goes away.
  useEffect(() => () => {
    voice.current?.stop()
    voice.current = null
    setTalking(false)
  }, [language, muted])

  const toggleTalk = () => {
    if (talking) {
      stopTalking()
      return
    }
    if (muted) {
      setStatus({ kind: 'voice', message: text.soundIsOff })
      return
    }
    setStatus({ kind: 'idle', message: '' })
    setTalking(true) // start moving right away; the voice can take a moment to begin
    const handle = speak((AD_TEXT[voiceLanguage] ?? text).speech, {
      language: voiceLanguage,
      onEnd: (reason) => {
        if (voice.current === handle) voice.current = null
        setTalking(false)
        if (reason === 'error' || reason === 'unsupported') setStatus({ kind: 'voice', message: text.noVoice })
      },
    })
    if (handle.method !== 'none') voice.current = handle
  }

  // Make the picture ahead of time, so the share sheet can open straight from the tap.
  useEffect(() => {
    const promise = renderAdCardBlob({ language, siteLabel })
    promise.catch(() => {}) // a failure is reported when the button is pressed
    pngPromise.current = promise
  }, [language, siteLabel])

  const getPng = () => {
    if (!pngPromise.current) pngPromise.current = renderAdCardBlob({ language, siteLabel })
    return pngPromise.current.catch((error) => {
      pngPromise.current = null // try again from scratch next time
      throw error
    })
  }

  const save = async () => {
    setStatus({ kind: 'working', message: text.working })
    try {
      downloadBlob(await getPng(), text.fileName)
      setStatus({ kind: 'done', message: text.saved })
    } catch (error) {
      console.error('Could not make the Math Hero picture.', error)
      setStatus({ kind: 'error', message: text.failed })
    }
  }

  const share = async () => {
    setStatus({ kind: 'working', message: text.working })
    let blob
    try {
      blob = await getPng()
    } catch (error) {
      console.error('Could not make the Math Hero picture.', error)
      setStatus({ kind: 'error', message: text.failed })
      return
    }
    const file = new File([blob], text.fileName, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: text.shareTitle, text: `${text.shareText} ${shareUrl}` })
        setStatus({ kind: 'done', message: text.shared })
        return
      } catch (error) {
        if (error?.name === 'AbortError') {
          setStatus({ kind: 'idle', message: '' }) // the player closed the share sheet
          return
        }
        // Sharing failed (or isn't allowed here): fall back to saving the picture.
      }
    }
    downloadBlob(blob, text.fileName)
    setStatus({ kind: 'done', message: text.saved })
  }

  // Phones and tablets: the main button opens the share sheet (which can also save).
  // Computers: the main button downloads; a second button shares when the browser can.
  const primary = touch && shareSupported ? share : save
  const secondary = touch && shareSupported
    ? { label: text.saveOnly, onClick: save }
    : shareSupported ? { label: text.shareOnly, onClick: share } : null

  const { bubble: bb, cta, mascot: m, hill, brand, title, rays } = L
  const ctaStyle = { top: u(cta.y), width: u(cta.w), height: u(cta.h), fontSize: u(cta.size) }

  return (
    <article className="ad" lang={language}>
      <div className={`ad-card${talking ? ' is-talking' : ''}`} role="group" aria-label={text.imageAlt}>
        <div
          className="ad-rays"
          aria-hidden="true"
          style={{ '--ray-x': `${rays.cx}%`, '--ray-y': `${(rays.cy / L.height) * 100}%`, '--ray-step': `${360 / rays.count}deg` }}
        />
        {L.symbols.map((symbol, i) => (
          <span
            key={symbol.text}
            className="ad-symbol"
            aria-hidden="true"
            style={{ left: u(symbol.x), top: u(symbol.y), fontSize: u(symbol.size), color: symbol.color, '--r': `${symbol.rotate}deg`, '--delay': `${i * -0.7}s` }}
          >
            {symbol.text}
          </span>
        ))}
        <div
          className="ad-hill"
          aria-hidden="true"
          style={{ left: u(hill.cx - hill.rx), top: u(hill.cy - hill.ry), width: u(hill.rx * 2), height: u(hill.ry * 2) }}
        />

        <p className="ad-brand" style={{ left: u(brand.x), top: u(brand.y), height: u(brand.mark) }}>
          <BrandMark size={40} />
          <span className="ad-brand-name" lang="en">bulbuli</span>
          <span className="ad-brand-presents">{text.presents}</span>
        </p>

        <h2 className="ad-title" style={{ top: u(title.y), fontSize: u(title.size), '--r': `${title.rotate}deg` }}>
          {text.title}
        </h2>

        <button
          type="button"
          className="ad-talk"
          onClick={toggleTalk}
          aria-pressed={talking}
          aria-label={talking ? text.stopTalk : text.talk}
          title={talking ? text.stopTalk : text.talk}
          style={{ left: u(m.x), bottom: u(m.bottom), height: u(m.h), width: u(m.h * 520 / 638) }}
        >
          <img className="ad-mascot" src={mascot} alt="" width="520" height="638" />
          <span className="ad-tap-hint" aria-hidden="true">👆 {text.tapHint}</span>
        </button>

        {/* The bubble can be tapped too; keyboard and screen-reader users use the Math Hero button. */}
        <div
          className="ad-bubble"
          onClick={toggleTalk}
          style={{ left: u(bb.x), top: u(bb.y), width: u(bb.w), padding: u(bb.pad - bb.border), paddingBottom: u(bb.pad - bb.border + 2.5), fontSize: u(bb.size), lineHeight: bb.lineHeight }}
        >
          {/* While Math Hero talks, the bubble shows the words he is saying (Bengali by default). */}
          <p lang={talking ? voiceLanguage : undefined}>{talking ? (AD_TEXT[voiceLanguage] ?? text).speech : text.speech}</p>
          <button
            type="button"
            className="ad-listen"
            onClick={(event) => { event.stopPropagation(); toggleTalk() }}
            aria-pressed={talking}
            aria-label={talking ? text.stopTalk : text.talk}
            title={talking ? text.stopTalk : text.talk}
          >
            {talking
              ? <span className="ad-sound-bars" aria-hidden="true"><i /><i /><i /></span>
              : <><span aria-hidden="true">🔊</span> {text.listen}</>}
          </button>
          <svg
            className="ad-bubble-tail"
            viewBox="0 0 8 8"
            aria-hidden="true"
            style={{ top: `calc(${bb.tailAt * 100}% - ${u(3)})`, left: u(bb.tailTip.dx), width: u(-bb.tailTip.dx + 0.5), height: u(8) }}
            preserveAspectRatio="none"
          >
            <path d="M8 0 L0 8 L8 6" />
          </svg>
        </div>

        {/^https?:\/\//.test(to) ? (
          <a className="ad-cta" href={to} style={ctaStyle}>
            <span>{text.cta}</span> <span aria-hidden="true">▶</span>
          </a>
        ) : (
          <Link className="ad-cta" to={to} style={ctaStyle}>
            <span>{text.cta}</span> <span aria-hidden="true">▶</span>
          </Link>
        )}
        <p className="ad-url" lang="en" style={{ top: u(L.url.y - L.url.size / 2), fontSize: u(L.url.size) }}>
          {siteLabel}
        </p>
      </div>

      <div className="ad-actions">
        <button type="button" className="ad-share" onClick={primary} disabled={status.kind === 'working'}>
          <span aria-hidden="true">⬇</span> {text.share}
        </button>
        {secondary && (
          <button
            type="button"
            className="ad-share-secondary"
            onClick={secondary.onClick}
            disabled={status.kind === 'working'}
          >
            {secondary.label}
          </button>
        )}
        <p className={`ad-status is-${status.kind}`} role="status">{status.message}</p>
      </div>
    </article>
  )
}
