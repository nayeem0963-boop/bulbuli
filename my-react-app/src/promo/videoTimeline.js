// How the talking video moves over time. Pure functions, so they can be tested without a browser.
//
//   0 s            the card appears, bubble empty
//   LEAD           Math Hero starts speaking; words appear in step with the narration
//   LEAD + voice   he finishes; the card rests and the address + QR panel glows
//   + END          the video ends

export const VIDEO_TIMING = {
  lead: 0.7, // seconds before the narration starts
  end: 3.5, // seconds after it, showing the finished card and the bulbuli.org panel
  fps: 30,
}

/**
 * When each word should appear, as fractions (0..1) of the narration: longer words take longer
 * to say, so the reveal is weighted by letters rather than spread evenly.
 */
export function wordStartFractions(text) {
  const words = text.split(' ')
  const weights = words.map((word) => Math.max(1, word.replace(/\p{Extended_Pictographic}️?/gu, '').length) + 2)
  const total = weights.reduce((sum, w) => sum + w, 0)
  let running = 0
  return weights.map((w) => {
    const start = running / total
    running += w
    return start
  })
}

export const videoLength = (voiceSeconds, timing = VIDEO_TIMING) => timing.lead + voiceSeconds + timing.end

/** Painter settings for time `t` (seconds) in a video whose narration lasts `voiceSeconds`. */
export function videoFrameAt(t, { voiceSeconds, wordStarts, timing = VIDEO_TIMING }) {
  const speakingFor = t - timing.lead
  if (speakingFor < 0) return { words: 0, phase: 'intro' }
  if (speakingFor <= voiceSeconds) {
    const fraction = speakingFor / voiceSeconds
    const words = wordStarts.filter((start) => start <= fraction).length
    const beat = Math.floor(t * 8) // the bob changes direction 8 times a second
    return {
      phase: 'speaking',
      words,
      tilt: beat % 2 === 0 ? -1.8 : 1.8,
      glow: 0.5 + 0.5 * Math.sin(t * 5.5),
      bars: [0.45 + 0.55 * Math.abs(Math.sin(t * 9.1)), 0.4 + 0.6 * Math.abs(Math.sin(t * 7.3 + 1)), 0.5 + 0.5 * Math.abs(Math.sin(t * 11.7 + 2))],
    }
  }
  const after = speakingFor - voiceSeconds
  return { phase: 'end', footerGlow: Math.min(1, after / 0.4) * (0.65 + 0.35 * Math.sin(after * 4.5)) }
}
