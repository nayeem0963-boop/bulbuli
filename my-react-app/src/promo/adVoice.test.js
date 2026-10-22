import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AD_TEXT } from './adContent.js'
import { speakableText, splitForOnlineVoice } from './adVoice.js'

test('emoji are not read out', () => {
  assert.equal(speakableText('Hey Explorer! 🚀 Ready?'), 'Hey Explorer! Ready?')
  assert.ok(!/🚀/u.test(speakableText(AD_TEXT.bn.speech)))
})

test('the online Bangla voice gets pieces it can read, with nothing lost', () => {
  const text = speakableText(AD_TEXT.bn.speech)
  for (const limit of [180, 40]) {
    const chunks = splitForOnlineVoice(text, limit)
    assert.ok(chunks.every((chunk) => chunk.length <= limit))
    assert.equal(chunks.join(' ').replace(/\s+/g, ' '), text)
  }
})
