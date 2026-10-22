import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AD_TEXT } from './adContent.js'
import { buildLinkShareData, buildVideoShareData, SHARE_PAGE_URL, SHARE_URL } from './shareData.js'

const file = { name: 'Bulbuli-MathHero-Video.mp4', type: 'video/mp4' }

test('Share with Friends sends the landing page with a friendly message', () => {
  assert.deepEqual(buildLinkShareData({ title: AD_TEXT.en.shareTitle, text: AD_TEXT.en.shareText }), {
    title: 'Math Hero on Bulbuli',
    text: 'Hey Explorer! 🚀 Play Math Hero with me for free on Bulbuli!',
    url: 'https://bulbuli.org/share/math-hero',
  })
  assert.equal(SHARE_PAGE_URL, 'https://bulbuli.org/share/math-hero')
})

test('a video share (kept for later use) carries the file, title, text and bulbuli.org link', () => {
  const data = buildVideoShareData({ file, title: 'Math Hero on Bulbuli', text: 'Play!' }, () => true)
  assert.deepEqual(data, { files: [file], title: 'Math Hero on Bulbuli', text: 'Play!', url: 'https://bulbuli.org' })
  assert.equal(SHARE_URL, 'https://bulbuli.org')
})

test('if a browser cannot take a file and a url together, the link moves into the caption', () => {
  const canShare = (d) => !('url' in d)
  const data = buildVideoShareData({ file, title: 'Math Hero on Bulbuli', text: 'Play!' }, canShare)
  assert.equal(data.url, undefined)
  assert.equal(data.text, 'Play! https://bulbuli.org')
  assert.deepEqual(data.files, [file])
})
