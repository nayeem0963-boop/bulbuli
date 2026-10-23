import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cardPath, COURSES, courseFromSearch, getCard, grammarPath, nextCard, parseCardPath, starsKey } from './catalog.js'

test('the picker lists the tenses first, then the nine other courses', () => {
  assert.deepEqual(COURSES.map((course) => course.id), [
    'tenses', 'subject-verb-agreement', 'articles-prepositions', 'active-passive-voice', 'punctuation-sentences',
    'modals', 'conditionals', 'reported-speech', 'relative-clauses', 'comparatives-superlatives',
  ])
  for (const course of COURSES) {
    assert.ok(course.icon && course.title.en && course.title.bn && course.tagline.en && course.subtitle.bn, course.id)
    assert.equal(course.sections.flatMap((section) => section.cards).length, course.cards.length, `${course.id}: a card is in no section`)
    for (const card of course.cards) assert.ok(card.badge && card.badge.length <= 40, `${course.id}/${card.id} badge`)
  }
  assert.deepEqual(COURSES[0].sections.map((s) => [s.id, s.tone, s.cards.length]), [['present', 0, 4], ['past', 1, 4], ['future', 2, 4]])
})

test('addresses: tenses keep their short links, other courses get /grammar/<course>/<card>', () => {
  assert.equal(cardPath('tenses', 'simple-past'), '/grammar/simple-past')
  assert.equal(cardPath('articles-prepositions', 'a-or-an'), '/grammar/articles-prepositions/a-or-an')
  assert.deepEqual(parseCardPath('simple-past'), { courseId: 'tenses', cardId: 'simple-past' })
  assert.deepEqual(parseCardPath('articles-prepositions', 'a-or-an'), { courseId: 'articles-prepositions', cardId: 'a-or-an' })
  for (const course of COURSES) {
    for (const card of course.cards) {
      const [, , first, second] = cardPath(course.id, card.id).split('/')
      const { courseId, cardId } = parseCardPath(first, second)
      assert.equal(getCard(courseId, cardId)?.card, card, `${course.id}/${card.id} round-trips`)
    }
  }
  assert.equal(getCard('tenses', 'nope'), null)
  assert.equal(getCard('nope', 'a-or-an'), null)
})

test('the course lives in the Grammar address; unknown courses fall back to the tenses', () => {
  assert.equal(grammarPath(), '/?zone=learn&track=grammar')
  assert.equal(grammarPath('tenses'), '/?zone=learn&track=grammar')
  assert.equal(grammarPath('active-passive-voice'), '/?zone=learn&track=grammar&course=active-passive-voice')
  assert.equal(courseFromSearch('?zone=learn&track=grammar').id, 'tenses')
  assert.equal(courseFromSearch('?zone=learn&track=grammar&course=active-passive-voice').id, 'active-passive-voice')
  assert.equal(courseFromSearch('?course=nope').id, 'tenses')
})

test('next card stays inside its course; stars keep the old keys for tenses', () => {
  const voice = COURSES.find((course) => course.id === 'active-passive-voice')
  assert.equal(nextCard(voice, voice.cards[0].id), voice.cards[1])
  assert.equal(nextCard(voice, voice.cards.at(-1).id), null)
  assert.equal(starsKey('tenses', 'simple-past'), 'simple-past')
  assert.equal(starsKey('active-passive-voice', 'using-by'), 'active-passive-voice/using-by')
})
