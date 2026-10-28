import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canRequestFullscreen, exitFullscreen, fullscreenElement, onFullscreenChange, requestFullscreen,
} from './fullscreen.js'

/** A tiny stand-in for `document` with the standard (or webkit) Fullscreen API. */
function fakeDocument({ prefixed = false, enabled = true } = {}) {
  const listeners = new Map()
  const doc = {
    current: null,
    addEventListener: (type, fn) => listeners.set(type, [...(listeners.get(type) ?? []), fn]),
    removeEventListener: (type, fn) => listeners.set(type, (listeners.get(type) ?? []).filter((f) => f !== fn)),
    fire: (type) => (listeners.get(type) ?? []).forEach((fn) => fn()),
    count: (type) => (listeners.get(type) ?? []).length,
  }
  if (prefixed) {
    doc.webkitFullscreenEnabled = enabled
    Object.defineProperty(doc, 'webkitFullscreenElement', { get: () => doc.current })
    doc.webkitExitFullscreen = () => { doc.current = null }
  } else {
    doc.fullscreenEnabled = enabled
    Object.defineProperty(doc, 'fullscreenElement', { get: () => doc.current })
    doc.exitFullscreen = async () => { doc.current = null }
  }
  const element = prefixed
    ? { webkitRequestFullscreen() { doc.current = element } }
    : { async requestFullscreen() { doc.current = element } }
  return { doc, element }
}

test('enters and leaves full screen with the standard API', async () => {
  const { doc, element } = fakeDocument()
  assert.equal(canRequestFullscreen(element, doc), true)
  await requestFullscreen(element)
  assert.equal(fullscreenElement(doc), element)
  await exitFullscreen(doc)
  assert.equal(fullscreenElement(doc), null)
})

test('falls back to the webkit-prefixed API (older Safari)', async () => {
  const { doc, element } = fakeDocument({ prefixed: true })
  assert.equal(canRequestFullscreen(element, doc), true)
  await requestFullscreen(element)
  assert.equal(fullscreenElement(doc), element)
  await exitFullscreen(doc)
  assert.equal(fullscreenElement(doc), null)
})

test('reports no support where full screen is turned off or missing (iPhone Safari)', async () => {
  const { doc, element } = fakeDocument({ enabled: false })
  assert.equal(canRequestFullscreen(element, doc), false)
  assert.equal(canRequestFullscreen({}, doc), false)
  assert.equal(canRequestFullscreen(null, doc), false)
  await assert.rejects(requestFullscreen({}))
})

test('exitFullscreen does nothing (and never throws) when nothing is full screen', async () => {
  const { doc } = fakeDocument()
  doc.exitFullscreen = async () => { throw new Error('should not be called') }
  await exitFullscreen(doc)
  doc.current = {}
  await exitFullscreen(doc) // rejects inside, swallowed
})

test('onFullscreenChange hears both event names and unsubscribes cleanly', () => {
  const { doc } = fakeDocument()
  let calls = 0
  const off = onFullscreenChange(() => { calls += 1 }, doc)
  doc.fire('fullscreenchange')
  doc.fire('webkitfullscreenchange')
  assert.equal(calls, 2)
  off()
  assert.equal(doc.count('fullscreenchange'), 0)
  assert.equal(doc.count('webkitfullscreenchange'), 0)
})
