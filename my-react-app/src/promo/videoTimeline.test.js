import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AD_TEXT } from './adContent.js'
import { VIDEO_TIMING, videoFrameAt, videoLength, wordStartFractions } from './videoTimeline.js'

const speech = AD_TEXT.bn.speech
const plan = { voiceSeconds: 11.4, wordStarts: wordStartFractions(speech) }

test('word start times rise from 0 and stay below 1', () => {
  const starts = plan.wordStarts
  assert.equal(starts.length, speech.split(' ').length)
  assert.equal(starts[0], 0)
  assert.ok(starts.every((s, i) => s >= 0 && s < 1 && (i === 0 || s > starts[i - 1])))
})

test('the video: empty bubble, words in step with the voice, then the closing glow', () => {
  assert.equal(videoLength(11.4), VIDEO_TIMING.lead + 11.4 + VIDEO_TIMING.end)
  assert.equal(videoFrameAt(0.2, plan).words, 0)
  const words = speech.split(' ').length
  let previous = 0
  for (let t = VIDEO_TIMING.lead; t <= VIDEO_TIMING.lead + 11.4; t += 0.25) {
    const frame = videoFrameAt(t, plan)
    assert.equal(frame.phase, 'speaking')
    assert.ok(frame.words >= previous && frame.words <= words)
    previous = frame.words
  }
  assert.equal(previous, words, 'every word is showing by the end of the narration')
  const end = videoFrameAt(VIDEO_TIMING.lead + 11.4 + 2, plan)
  assert.equal(end.phase, 'end')
  assert.ok(end.footerGlow > 0)
  assert.equal(end.words, undefined, 'the end shows the whole message')
})
