import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bannerMode, isDismissed, isInAppBrowser, isIosDevice, isMobileDevice, isStandalone } from './platform.js'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const IPAD_AS_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

test('spots iPhones and iPads, including iPads that claim to be Macs', () => {
  assert.equal(isIosDevice({ userAgent: IPHONE }), true)
  assert.equal(isIosDevice({ userAgent: IPAD_AS_MAC, platform: 'MacIntel', maxTouchPoints: 5 }), true)
  assert.equal(isIosDevice({ userAgent: IPAD_AS_MAC, platform: 'MacIntel', maxTouchPoints: 0 }), false) // a real Mac
  assert.equal(isIosDevice({ userAgent: ANDROID }), false)
})

test('spots phones and tablets', () => {
  assert.equal(isMobileDevice({ userAgent: ANDROID }), true)
  assert.equal(isMobileDevice({ userAgent: IPHONE }), true)
  assert.equal(isMobileDevice({ userAgent: DESKTOP }), false)
  assert.equal(isMobileDevice({ userAgent: DESKTOP, userAgentDataMobile: true }), true)
})

test('spots in-app browsers', () => {
  assert.equal(isInAppBrowser(`${IPHONE} [FBAN/FBIOS;FBAV/400.0]`), true)
  assert.equal(isInAppBrowser(`${IPHONE} Instagram 300.0`), true)
  assert.equal(isInAppBrowser(IPHONE), false)
})

test('standalone covers both the CSS media query and iOS navigator.standalone', () => {
  assert.equal(isStandalone({ displayModeStandalone: true }), true)
  assert.equal(isStandalone({ navigatorStandalone: true }), true)
  assert.equal(isStandalone({}), false)
})

test('a dismissal lasts 30 days', () => {
  const now = Date.parse('2026-10-25T00:00:00Z')
  assert.equal(isDismissed(now - 29 * 864e5, now), true)
  assert.equal(isDismissed(now - 31 * 864e5, now), false)
  assert.equal(isDismissed(null, now), false)
})

test('banner mode: never when installed, dismissed or on a big desktop screen', () => {
  const base = { standalone: false, installed: false, dismissed: false, mobileOrSmall: true, canPrompt: false, ios: false }
  assert.equal(bannerMode({ ...base, canPrompt: true }), 'prompt')
  assert.equal(bannerMode({ ...base, ios: true }), 'ios')
  assert.equal(bannerMode(base), null) // e.g. Firefox on Android: no prompt to offer
  assert.equal(bannerMode({ ...base, canPrompt: true, standalone: true }), null)
  assert.equal(bannerMode({ ...base, canPrompt: true, installed: true }), null)
  assert.equal(bannerMode({ ...base, ios: true, dismissed: true }), null)
  assert.equal(bannerMode({ ...base, canPrompt: true, mobileOrSmall: false }), null)
})
