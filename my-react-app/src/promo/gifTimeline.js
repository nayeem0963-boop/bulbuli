// How the Math Hero GIF moves. Kept apart from the drawing code so it can be tested on its own.

export const GIF_TIMING = {
  frameMs: 100, // 10 frames a second
  wordsPerFrame: 1.5,
  afterWordsFrames: 5, // keep "talking" a moment after the last word
  restMs: 2600, // the finished card stays up before the loop starts again
}

/** The talking frames, as painter settings. Pure, so it can be tested. */
export function gifTimeline(wordCount, timing = GIF_TIMING) {
  const talkFrames = Math.ceil(wordCount / timing.wordsPerFrame) + timing.afterWordsFrames
  const frames = []
  for (let i = 0; i < talkFrames; i += 1) {
    const phase = i / 2.2
    frames.push({
      delay: timing.frameMs,
      paint: {
        words: Math.min(wordCount, Math.ceil((i + 1) * timing.wordsPerFrame)),
        tilt: i % 2 === 0 ? -1.8 : 1.8,
        glow: 0.5 + 0.5 * Math.sin(phase),
        bars: [0.45 + 0.55 * Math.abs(Math.sin(i * 1.3)), 0.4 + 0.6 * Math.abs(Math.sin(i * 0.9 + 1)), 0.5 + 0.5 * Math.abs(Math.sin(i * 1.7 + 2))],
      },
    })
  }
  frames.push({ delay: timing.restMs, paint: {} }) // the finished card, resting
  return frames
}
