// Speech prompts, same behaviour as the other arcade games (Shape Hunt, Memory Match):
// respects the app's mute switch, uses a Bangla voice when the browser has one and
// stays silent in Bangla mode when it doesn't (rather than reading Bangla with an English voice).
import { isMuted } from '../../utils/sound.js'

const hasSpeech = () => typeof window !== 'undefined' && Boolean(window.speechSynthesis)

// Chrome fills the voice list asynchronously; touching it early makes it ready by the first prompt.
if (hasSpeech()) window.speechSynthesis.getVoices()

/**
 * @param {string} words
 * @param {'en'|'bn'} language
 * @param {{ interrupt?: boolean }} [options]  interrupt=false queues after what is being said
 */
export function speak(words, language, { interrupt = true } = {}) {
  if (!words || isMuted() || !hasSpeech()) return
  const lang = language === 'bn' ? 'bn' : 'en'
  const voice = window.speechSynthesis.getVoices().find((candidate) => candidate.lang?.toLowerCase().startsWith(lang))
  if (!voice && lang === 'bn') return
  const utterance = new SpeechSynthesisUtterance(words)
  utterance.lang = voice?.lang ?? 'en-US'
  if (voice) utterance.voice = voice
  utterance.rate = 0.9
  utterance.pitch = 1.1
  if (interrupt) window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  if (hasSpeech()) window.speechSynthesis.cancel()
}
