import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BADGES, getBadge } from '../data/badgesConfig.js'
import { normalizeCelebrations } from '../badges/celebrationStore.js'
import { certificateUrl, displayUrl, isVerificationToken, SITE_URL } from './links.js'
import { congratsFor, defaultShareMessage, GENERAL_MESSAGE, motivationFor } from './messages.js'
import { buildImagePdf } from './pdf.js'
import { mayShareAvatar, publicName } from './privacy.js'
import { qrMatrix, qrRuns } from './qr.js'
import { isPlayingGame } from './routes.js'
import { buildSheet } from './sheet.js'

const TOKEN = '0123456789abcdef0123456789abcdef'

test('messages: specific → game → category → general, never competitive', () => {
  assert.match(motivationFor(getBadge('math-hero-master')), /math superstar/)
  assert.match(motivationFor(getBadge('math-master-champion')), /problem-solving/)
  assert.match(motivationFor(getBadge('code-architect')), /one line of code/)
  assert.match(motivationFor(getBadge('hatchling')), /level/)
  assert.equal(motivationFor({ id: 'x', category: 'nope' }), GENERAL_MESSAGE)
  assert.equal(motivationFor(null), GENERAL_MESSAGE)
  for (const badge of BADGES) {
    const text = motivationFor(badge)
    assert.ok(text.length > 10, badge.id)
    assert.doesNotMatch(text, /\b(beat|better than|rank|winner|others)\b/i, badge.id)
  }
})

test('messages: congrats uses the first name only; share message carries the link', () => {
  assert.equal(congratsFor('Nayeem Hasan'), 'Way to go, Nayeem!')
  assert.equal(congratsFor('  '), 'Way to go!')
  const text = defaultShareMessage({ badge: getBadge('sky-explorer'), link: certificateUrl(TOKEN) })
  assert.match(text, /^I'm proud of my learning journey!/)
  assert.match(text, /"Sky Explorer"/)
  assert.ok(text.endsWith(`https://bulbuli.org/certificate/${TOKEN}`))
})

test('privacy: public name modes and avatar rules', () => {
  assert.equal(publicName('Nayeem  Hasan', 'full'), 'Nayeem Hasan')
  assert.equal(publicName('Nayeem Hasan', 'first_name'), 'Nayeem')
  assert.equal(publicName('Nayeem Hasan', 'initials'), 'N. H.')
  assert.equal(publicName('Nayeem Hasan', 'hidden'), '')
  assert.equal(publicName('Nayeem Hasan', 'bogus'), 'Nayeem') // unknown → safe default
  assert.equal(publicName('', 'full'), '')
  assert.equal(mayShareAvatar({ kind: 'image' }, 'first_name'), true)
  assert.equal(mayShareAvatar({ kind: 'photo' }, 'first_name'), false)
  assert.equal(mayShareAvatar({ kind: 'photo' }, 'full'), true)
  assert.equal(mayShareAvatar({ kind: 'image' }, 'hidden'), false)
})

test('links: only well-formed tokens make a link, always on the public site', () => {
  assert.equal(isVerificationToken(TOKEN), true)
  assert.equal(isVerificationToken(TOKEN.toUpperCase()), false)
  assert.equal(isVerificationToken('../../etc'), false)
  assert.equal(certificateUrl('nope'), '')
  assert.equal(certificateUrl(TOKEN), `${SITE_URL}/certificate/${TOKEN}`)
  assert.equal(displayUrl(certificateUrl(TOKEN)), `bulbuli.org/certificate/${TOKEN}`)
})

test('qr: a real code for the certificate URL, merged into runs', () => {
  const m = qrMatrix(certificateUrl(TOKEN))
  assert.ok(m.size >= 21 && (m.size - 17) % 4 === 0, `QR size ${m.size}`)
  assert.equal(m.rows.length, m.size)
  // finder pattern in the top-left corner: 7 dark modules across the first row
  assert.deepEqual(m.rows[0].slice(0, 7), [true, true, true, true, true, true, true])
  const dark = m.rows.flat().filter(Boolean).length
  assert.equal(qrRuns(m).reduce((sum, run) => sum + run.w, 0), dark)
  assert.throws(() => qrMatrix(''))
})

test('pdf: valid structure, correct xref offsets, vector QR and a clickable URI link', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9])
  const url = certificateUrl(TOKEN)
  const matrix = qrMatrix(url)
  const bytes = buildImagePdf({
    jpeg, imageWidth: 2970, imageHeight: 2100,
    qr: { matrix, rect: { x: 100, y: 1500, w: 240, h: 240 } },
    links: [{ rect: { x: 900, y: 1880, w: 1200, h: 40 }, url }],
    info: { title: 'Certificate: Sky Explorer 🪽' },
  })
  const text = new TextDecoder('latin1').decode(bytes)
  assert.ok(text.startsWith('%PDF-1.4'))
  assert.ok(text.trimEnd().endsWith('%%EOF'))
  assert.match(text, /\/MediaBox \[0 0 841\.89 595\.28\]/)
  assert.match(text, new RegExp(`/S /URI /URI \\(${url.replace(/[/.]/g, '\\$&')}\\)`))
  assert.match(text, /\/Filter \/DCTDecode/)
  assert.ok((text.match(/ re\n/g) ?? []).length >= qrRuns(matrix).length)
  // every xref offset points at "<n> 0 obj"
  const xrefAt = Number(text.match(/startxref\n(\d+)/)[1])
  const table = text.slice(xrefAt).split('\n').slice(3).filter((l) => / n $/.test(l))
  table.forEach((line, i) => {
    const offset = Number(line.slice(0, 10))
    assert.ok(text.startsWith(`${i + 1} 0 obj`, offset), `object ${i + 1} at ${offset}`)
  })
  assert.throws(() => buildImagePdf({ jpeg: new Uint8Array([1, 2, 3, 4]), imageWidth: 1, imageHeight: 1 }))
  assert.throws(() => buildImagePdf({ jpeg, imageWidth: 1, imageHeight: 1, links: [{ rect: { x: 0, y: 0, w: 1, h: 1 }, url: 'javascript:alert(1)' }] }))
})

test('sheet: an issued certificate wins; without one, real profile data and no verification', () => {
  const badge = getBadge('math-hero-master')
  const profile = { xp: 2400, stats: { 'math-hero': { xp: 1100, plays: 40 } } }
  const loose = buildSheet({ badge, unlockedAt: '2026-10-28T09:45:00Z', profile, playerName: 'Nayeem', gameName: () => 'Math Hero' })
  assert.equal(loose.xpEarned, 1100)
  assert.equal(loose.xpLabel, 'Math Hero XP')
  assert.equal(loose.code, '')
  assert.equal(loose.verifyUrl, '')
  assert.equal(loose.awardedLabel, '28 Oct 2026')

  const certificate = { badgeId: badge.id, code: 'BLB-1A2B-3C4D', token: TOKEN, studentName: 'Nayeem Hasan', badgeTitle: badge.title, badgeDescription: badge.description, xpEarned: 1050, xpLabel: 'Math Hero XP', awardedAt: '2026-10-27T10:00:00Z', revokedAt: null }
  const issued = buildSheet({ badge, certificate, unlockedAt: '2026-10-28T09:45:00Z', profile, playerName: 'Someone' })
  assert.equal(issued.studentName, 'Nayeem Hasan')
  assert.equal(issued.xpEarned, 1050)
  assert.equal(issued.code, 'BLB-1A2B-3C4D')
  assert.equal(issued.verifyUrl, certificateUrl(TOKEN))
  assert.equal(buildSheet({ badge, certificate: { ...certificate, revokedAt: '2026-10-29T00:00:00Z' }, profile }).verifyUrl, '')
})

test('celebrations: one per badge, valid ids only', () => {
  const list = normalizeCelebrations([
    { badgeId: 'sky-explorer', unlockedAt: '2026-10-28T09:45:00Z' },
    { badgeId: 'sky-explorer', unlockedAt: '2026-10-29T09:45:00Z' },
    { badgeId: 'Bad Id!' },
    null,
    { badgeId: 'hatchling' },
  ])
  assert.deepEqual(list.map((e) => e.badgeId), ['sky-explorer', 'hatchling'])
  assert.deepEqual(normalizeCelebrations('nope'), [])
})

test('routes: celebrations wait while a game is being played', () => {
  assert.equal(isPlayingGame('/games/math-hero'), true)
  assert.equal(isPlayingGame('/play/html-architect'), true)
  assert.equal(isPlayingGame('/', '?category=arcade&play=neon-velocity'), true)
  assert.equal(isPlayingGame('/game'), true)
  assert.equal(isPlayingGame('/dashboard'), false)
  assert.equal(isPlayingGame('/', '?category=arcade'), false)
})

test('server catalog (certificates migration) matches every certificate badge in badgesConfig.js', () => {
  const sql = readFileSync(new URL('../../supabase/migrations/20261030000000_certificates.sql', import.meta.url), 'utf8')
  const rows = new Map()
  const re = /\(\s*'([a-z0-9-]+)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'([^']*)',\s*'([a-z_]+)',\s*(null|'[a-z0-9-]+'),\s*(null|'[^']*'),\s*(\d+)\)/g
  for (const m of sql.matchAll(re)) {
    rows.set(m[1], { title: m[2].replace(/''/g, "'"), description: m[3].replace(/''/g, "'"), icon: m[4], type: m[5], gameId: m[6] === 'null' ? undefined : m[6].slice(1, -1), target: Number(m[8]) })
  }
  const eligible = BADGES.filter((badge) => badge.certificateEligible)
  assert.equal(rows.size, eligible.length, 'one row per certificate badge')
  for (const badge of eligible) {
    const row = rows.get(badge.id)
    assert.ok(row, `${badge.id} missing from the migration`)
    assert.equal(row.title, badge.title, badge.id)
    assert.equal(row.description, badge.description, badge.id)
    assert.equal(row.icon, badge.icon, badge.id)
    assert.equal(row.type, badge.requirement.type, badge.id)
    assert.equal(row.gameId, badge.requirement.gameId, badge.id)
    assert.equal(row.target, badge.requirement.target, badge.id)
  }
})

test('emblems: every certificate badge gets a vector emblem, never an emoji', async () => {
  const { EMBLEMS, emblemFor } = await import('./emblems.js')
  const specific = { 'math-hero-master': 'math', 'math-master-champion': 'geometry', 'code-architect': 'code' }
  for (const [id, emblem] of Object.entries(specific)) assert.equal(emblemFor(getBadge(id)), emblem, id)
  assert.equal(emblemFor({ id: 'x', requirement: { gameId: 'memory-match' } }), 'brain')
  assert.equal(emblemFor({ id: 'x', requirement: { gameId: 'pattern-quest' } }), 'pattern')
  assert.equal(emblemFor(null), 'star')
  for (const badge of BADGES) assert.ok(EMBLEMS[emblemFor(badge)], badge.id)
  for (const [id, emblem] of Object.entries(EMBLEMS)) {
    assert.ok(emblem.label && emblem.parts.length > 0, id)
    for (const part of emblem.parts) {
      assert.match(part.d, /^M[0-9MLHVCAZmlhvcaz .,-]+$/, `${id}: path data only`)
      assert.ok(['fill', 'stroke'].includes(part.mode), id)
    }
  }
  const sheet = buildSheet({ badge: getBadge('code-architect'), profile: {}, playerName: 'A' })
  assert.equal(sheet.emblem, 'code')
})
