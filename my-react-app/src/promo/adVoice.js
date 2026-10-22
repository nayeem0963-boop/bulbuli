// Math Hero's voice for the ad card.
//
// 1. The browser's own speech (window.speechSynthesis) with a Bengali voice: bn-BD first, then any bn.
// 2. If the device has no Bengali voice (most Windows PCs, iPhones and iPads), the same online Bangla
//    voice the Math Hero game already uses. The `same-origin` referrer policy in index.html lets it load.
// English text uses an English speechSynthesis voice.

const ONLINE_BANGLA_VOICE = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=bn&q='
const ONLINE_CHUNK = 180 // the online voice reads at most about 200 characters per request

export const canUseSpeechSynthesis = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** Emoji are read out as words ("rocket"), so take them out before speaking. */
export const speakableText = (text) => text
  .replace(/\p{Extended_Pictographic}️?/gu, '')
  .replace(/\s{2,}/g, ' ')
  .trim()

/** The best installed voice for a language: an exact locale (bn-BD) beats a general one (bn-IN, bn). */
export function findVoice(language) {
  if (!canUseSpeechSynthesis()) return null
  const voices = window.speechSynthesis.getVoices()
  const lang = (voice) => voice.lang?.toLowerCase().replace('_', '-') ?? ''
  if (language === 'bn') {
    return voices.find((v) => lang(v) === 'bn-bd')
      ?? voices.find((v) => lang(v).startsWith('bn'))
      ?? null
  }
  return voices.find((v) => lang(v) === 'en-us') ?? voices.find((v) => lang(v).startsWith('en')) ?? null
}

/** Browsers load voices in the background: ask early so they are ready by the first tap. */
export function warmUpVoices() {
  if (!canUseSpeechSynthesis()) return () => {}
  const load = () => window.speechSynthesis.getVoices()
  load()
  window.speechSynthesis.addEventListener?.('voiceschanged', load)
  return () => window.speechSynthesis.removeEventListener?.('voiceschanged', load)
}

/** Splits Bangla text at sentence ends (। ! ?) and commas so each piece fits one online request. */
export function splitForOnlineVoice(text, limit = ONLINE_CHUNK) {
  const pieces = text.match(/[^।!?,]+[।!?,]?/g)?.map((piece) => piece.trim()).filter(Boolean) ?? [text]
  const chunks = []
  for (const piece of pieces) {
    const last = chunks.at(-1)
    if (last && last.length + piece.length + 1 <= limit) chunks[chunks.length - 1] = `${last} ${piece}`
    else chunks.push(piece.slice(0, limit))
  }
  return chunks
}

/**
 * Speaks `text`. Must be called straight from a tap or click (browsers only allow sound then).
 * Calls onStart when the voice begins and onEnd when it finishes, fails or is stopped.
 * Returns { stop, method } where method is 'speech' | 'online' | 'none'.
 */
export function speak(text, { language, onStart, onEnd }) {
  const spoken = speakableText(text)
  let finished = false
  const finish = (reason) => {
    if (finished) return
    finished = true
    onEnd?.(reason)
  }

  const voice = findVoice(language)

  // 1. The device's own voice.
  if (canUseSpeechSynthesis() && (voice || language !== 'bn')) {
    const synth = window.speechSynthesis
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(spoken)
    utterance.lang = voice?.lang ?? (language === 'bn' ? 'bn-BD' : 'en-US')
    if (voice) utterance.voice = voice
    utterance.pitch = 1.3 // a little higher: Math Hero is a small bird
    utterance.rate = language === 'bn' ? 0.92 : 1
    utterance.onstart = () => onStart?.()
    utterance.onend = () => finish('done')
    utterance.onerror = (event) => finish(event.error === 'interrupted' || event.error === 'canceled' ? 'stopped' : 'error')
    synth.speak(utterance)
    // Chrome can pause long speech in background tabs; a gentle resume keeps it going.
    const keepAlive = window.setInterval(() => {
      if (finished) window.clearInterval(keepAlive)
      else if (synth.paused) synth.resume()
    }, 1000)
    return {
      method: 'speech',
      stop: () => { window.clearInterval(keepAlive); synth.cancel(); finish('stopped') },
    }
  }

  // 2. No Bengali voice installed: use the online Bangla voice, one sentence at a time.
  if (language === 'bn' && typeof Audio !== 'undefined') {
    const chunks = splitForOnlineVoice(spoken)
    const audio = new Audio()
    audio.preservesPitch = false
    let index = 0
    let started = false
    const playNext = () => {
      if (index >= chunks.length) { finish('done'); return }
      audio.src = `${ONLINE_BANGLA_VOICE}${encodeURIComponent(chunks[index])}`
      audio.playbackRate = 1.08
      index += 1
      audio.play().catch(() => finish('error'))
    }
    audio.addEventListener('playing', () => { if (!started) { started = true; onStart?.() } })
    audio.addEventListener('ended', playNext)
    audio.addEventListener('error', () => finish('error'))
    playNext() // the first play() happens inside the tap, which is what unlocks sound on phones
    return {
      method: 'online',
      stop: () => { audio.pause(); audio.removeAttribute('src'); finish('stopped') },
    }
  }

  finish('unsupported')
  return { method: 'none', stop: () => {} }
}
