// Tiny synthesized "boing" sounds for jump and shrink (no audio files to download). Stars, bumps
// and milestones use the arcade's own sounds (src/utils/sound.js). Everything respects the
// arcade's shared mute switch, and nothing plays before the player has pressed something.
import { isMuted } from '../../utils/sound.js'

let ctx = null
function audio() {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  if (!ctx) {
    try { ctx = new Ctor() } catch { return null }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

function sweep(from, to, seconds, type = 'sine', volume = 0.08) {
  if (isMuted()) return
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, now)
  osc.frequency.exponentialRampToValueAtTime(to, now + seconds)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds)
  osc.connect(gain).connect(ac.destination)
  osc.start(now)
  osc.stop(now + seconds + 0.02)
}

export const sfx = {
  jump: () => sweep(320, 720, 0.22, 'triangle'),
  shrink: () => sweep(620, 260, 0.2, 'sine'),
  land: () => sweep(180, 120, 0.08, 'sine', 0.04),
}
