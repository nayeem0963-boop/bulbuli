import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SHARE_URL } from '../promo/shareData.js'
import { requestedHomeMode, searchWithoutMode } from '../games/categories.js'
import { fullInvitation, SHARE_KINDS, SHARE_MESSAGES, shareMessage, shareTitle } from './shareMessages.js'
import { inviteUrl, SHARE_PATHS, shareUrl } from './shareLinks.js'
import { canNativeShare, copyText, nativeShare } from './shareActions.js'
import { BUDDIES_TEXT } from './text.js'

// ---------- messages ----------

test('the invitation messages are the agreed English wording', () => {
  assert.equal(shareMessage('general'), 'Hey! I found Bulbuli, a fun place to play games, learn new skills, and explore creative activities. Come check it out! ✨')
  assert.equal(shareMessage('play-learn'), "Want to play something fun? Check out Bulbuli's Play & Learn games and see which one you like best! 🎮")
  assert.equal(shareMessage('build-create'), "Want to build something cool? Explore Bulbuli's coding and 3D creation activities. 🚀")
  assert.equal(shareMessage('game'), 'I found this game on Bulbuli. Give it a try and see how far you can get! 🎮')
})

test('every invitation exists in English and Bangla, and unknown kinds fall back to the general one', () => {
  for (const language of ['en', 'bn']) {
    for (const kind of SHARE_KINDS) assert.ok(SHARE_MESSAGES[language][kind]?.length > 20, `${language}.${kind}`)
  }
  assert.equal(shareMessage('nope', 'en'), SHARE_MESSAGES.en.general)
  assert.equal(shareMessage('game', 'xx'), SHARE_MESSAGES.en.game)
})

test('messages carry no links, no pressure and no promised rewards', () => {
  for (const language of ['en', 'bn']) {
    for (const message of Object.values(SHARE_MESSAGES[language])) {
      assert.doesNotMatch(message, /https?:|www\./)
      assert.doesNotMatch(message, /hurry|now or never|last chance|reward|stars? for/i)
      assert.doesNotMatch(message, /\bXP\b/)
    }
  }
})

test('share titles and the copied invitation', () => {
  assert.equal(shareTitle('general'), 'Bulbuli')
  assert.equal(shareTitle('game', 'Bulbuli Ball Dash'), 'Bulbuli Ball Dash · Bulbuli')
  assert.equal(fullInvitation('Hi!', 'https://bulbuli.org'), 'Hi!\nhttps://bulbuli.org')
})

// ---------- links ----------

test('invitation links point at the public site, with the mode for zone invitations', () => {
  assert.equal(SHARE_URL, 'https://bulbuli.org')
  assert.equal(inviteUrl('general'), 'https://bulbuli.org')
  assert.equal(inviteUrl('play-learn'), 'https://bulbuli.org/?mode=play-learn')
  assert.equal(inviteUrl('build-create'), 'https://bulbuli.org/?mode=build-create')
  assert.equal(inviteUrl('whatever'), 'https://bulbuli.org')
})

test('game links use the existing routes', () => {
  assert.equal(shareUrl('/games/ball-dash'), 'https://bulbuli.org/games/ball-dash')
  assert.equal(shareUrl('/play/html-architect'), 'https://bulbuli.org/play/html-architect')
  assert.equal(shareUrl(SHARE_PATHS.proCoder), 'https://bulbuli.org/quiz/?course=html')
  assert.equal(shareUrl(SHARE_PATHS.studio), 'https://bulbuli.org/game')
})

test('only same-site paths can be shared', () => {
  for (const bad of ['https://evil.example', '//evil.example/x', 'games/x', '', null, undefined]) {
    if (bad === undefined) continue // undefined means the home page
    assert.throws(() => shareUrl(bad), /Not a site path/, String(bad))
  }
  assert.equal(shareUrl(), 'https://bulbuli.org')
})

test('no development address or player detail can reach a shared link', () => {
  const links = [...['general', 'play-learn', 'build-create'].map(inviteUrl), ...Object.values(SHARE_PATHS).map(shareUrl)]
  for (const link of links) {
    assert.match(link, /^https:\/\/bulbuli\.org(\/|$)/)
    assert.doesNotMatch(link, /localhost|127\.0\.0\.1|netlify\.app|ref=|uid=|user|email|score/i)
  }
})

test('the Pro Coder link is the course catalog\'s own address', () => {
  const catalog = readFileSync(new URL('../courses/catalog.js', import.meta.url), 'utf8')
  assert.match(catalog, /href: '\/quiz\/\?course=html'/)
})

// ---------- ?mode= deep links ----------

test('?mode= opens only real modes, and is removed from the address afterwards', () => {
  assert.equal(requestedHomeMode('?mode=build-create'), 'build-create')
  assert.equal(requestedHomeMode('?mode=play-learn&category=young'), 'play-learn')
  assert.equal(requestedHomeMode('?mode=<script>'), null)
  assert.equal(requestedHomeMode(''), null)
  assert.equal(requestedHomeMode(undefined), null)
  assert.equal(searchWithoutMode('?mode=build-create'), '')
  assert.equal(searchWithoutMode('?mode=build-create&category=arcade'), '?category=arcade')
})

// ---------- share sheet and clipboard ----------

test('the share sheet is used only where the browser has one', () => {
  const data = { title: 'Bulbuli', text: 'Hi', url: 'https://bulbuli.org' }
  assert.equal(canNativeShare(data, {}), false)
  assert.equal(canNativeShare(data, null), false)
  assert.equal(canNativeShare(data, { share() {} }), true)
  assert.equal(canNativeShare(data, { share() {}, canShare: () => false }), false)
  assert.equal(canNativeShare(data, { share() {}, canShare: () => { throw new Error('x') } }), false)
})

test('share results say what really happened', async () => {
  const data = { url: 'https://bulbuli.org' }
  assert.equal(await nativeShare(data, { share: async () => {} }), 'shared')
  const abort = Object.assign(new Error('closed'), { name: 'AbortError' })
  assert.equal(await nativeShare(data, { share: async () => { throw abort } }), 'cancelled')
  const denied = Object.assign(new Error('no'), { name: 'NotAllowedError' })
  assert.equal(await nativeShare(data, { share: async () => { throw denied } }), 'failed')
})

test('copying uses the clipboard, falls back to the selection trick, and reports failure', async () => {
  let written = ''
  assert.equal(await copyText('abc', { nav: { clipboard: { writeText: async (v) => { written = v } } }, doc: null }), true)
  assert.equal(written, 'abc')

  // clipboard refused: the fallback copies
  const fakeDoc = () => {
    const field = { style: {}, setAttribute() {}, select() {}, remove() { this.removed = true } }
    return {
      field,
      body: { appendChild() {} },
      activeElement: null,
      createElement: () => field,
      execCommand: (cmd) => cmd === 'copy',
    }
  }
  const doc = fakeDoc()
  const refused = { clipboard: { writeText: async () => { throw new Error('denied') } } }
  assert.equal(await copyText('abc', { nav: refused, doc }), true)
  assert.equal(doc.field.value, 'abc')
  assert.equal(doc.field.removed, true)

  // nothing works: false, never a pretend success
  assert.equal(await copyText('abc', { nav: refused, doc: { ...fakeDoc(), execCommand: () => false } }), false)
  assert.equal(await copyText('abc', { nav: {}, doc: null }), false)
})

// ---------- words ----------

test('the dialog says the agreed status lines, in both languages', () => {
  const { status } = BUDDIES_TEXT.en
  assert.equal(status.linkCopied, 'Invitation link copied!')
  assert.equal(status.ready, 'Your message is ready to share.')
  assert.equal(status.cancelled, 'Sharing was cancelled.')
  assert.equal(status.copyFailed, 'We couldn’t copy the link. Please try again.')
  assert.equal(BUDDIES_TEXT.en.cardTitle, 'Play better together!')
  assert.equal(BUDDIES_TEXT.en.cardButton, 'Invite a Buddy ✨')
  assert.deepEqual(Object.keys(BUDDIES_TEXT.bn.status).sort(), Object.keys(status).sort())
  assert.deepEqual(Object.keys(BUDDIES_TEXT.bn).sort(), Object.keys(BUDDIES_TEXT.en).sort())
})
