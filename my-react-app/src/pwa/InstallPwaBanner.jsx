import { useEffect, useId, useState } from 'react'
import { useLanguage } from '../arcade/preferences.js'
import { promptInstall, useInstallPrompt } from './installPrompt.js'
import { bannerMode, isDismissed, isInAppBrowser, isIosDevice, isMobileDevice, isStandalone } from './platform.js'
import './InstallPwaBanner.css'

/*
 * "📲 Install Bulbuli App" banner for the home page.
 *
 *  Android / Chrome / Edge / Samsung Internet → our button opens the browser's own install
 *     dialog (the `beforeinstallprompt` event captured in installPrompt.js).
 *  iPhone / iPad (no such event) → the button opens step-by-step "Add to Home Screen" help.
 *  Shown only on phones, tablets or small screens; never inside the installed app; gone once
 *  installed; and the ✕ hides it for 30 days (DISMISS_DAYS in platform.js).
 */

const DISMISS_KEY = 'bulbuli.pwa-banner-dismissed-at'

const TEXT = {
  en: {
    region: 'Install the Bulbuli app',
    title: 'Install Bulbuli App',
    text: 'Play from your home screen: one tap, full screen.',
    install: '📲 Install',
    howTo: '📲 Show me how',
    close: 'Close',
    iosTitle: 'Add Bulbuli to your Home Screen',
    iosSteps: [
      <>Tap the <strong>Share</strong> button <ShareIcon /> in Safari’s toolbar. (If you see <strong>•••</strong>, tap that first.)</>,
      <>Scroll down and tap <strong>Add to Home Screen</strong> <span aria-hidden="true">➕</span></>,
      <>Tap <strong>Add</strong>. Bulbuli is now on your Home Screen! <span aria-hidden="true">🎉</span></>,
    ],
    inApp: 'You’re inside another app’s browser. Open this page in Safari first, then follow these steps.',
    gotIt: 'Got it',
  },
  bn: {
    region: 'Bulbuli অ্যাপ ইনস্টল করো',
    title: 'Bulbuli অ্যাপ ইনস্টল করো',
    text: 'হোম স্ক্রিন থেকে এক চাপে পুরো স্ক্রিনে খেলো।',
    install: '📲 ইনস্টল',
    howTo: '📲 কীভাবে দেখাও',
    close: 'বন্ধ করো',
    iosTitle: 'হোম স্ক্রিনে Bulbuli যোগ করো',
    iosSteps: [
      <>Safari-র টুলবারে <strong>Share</strong> বোতামে <ShareIcon /> চাপ দাও। (<strong>•••</strong> দেখলে আগে সেটায় চাপ দাও।)</>,
      <>নিচে নেমে <strong>Add to Home Screen</strong> <span aria-hidden="true">➕</span> চাপ দাও।</>,
      <><strong>Add</strong> চাপ দাও। Bulbuli এখন তোমার হোম স্ক্রিনে! <span aria-hidden="true">🎉</span></>,
    ],
    inApp: 'তুমি অন্য একটি অ্যাপের ভেতরে আছ। আগে পাতাটি Safari-তে খোলো, তারপর এই ধাপগুলো মেনে চলো।',
    gotIt: 'বুঝেছি',
  },
}

function ShareIcon() {
  return (
    <svg className="pwa-share-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
      <path d="M7 10H5.5A1.5 1.5 0 0 0 4 11.5v8A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H17" />
    </svg>
  )
}

const media = (query) => typeof window !== 'undefined' && window.matchMedia?.(query).matches

function readDevice() {
  const nav = typeof navigator === 'undefined' ? {} : navigator
  const info = {
    userAgent: nav.userAgent ?? '',
    platform: nav.platform ?? '',
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    userAgentDataMobile: nav.userAgentData?.mobile,
  }
  return {
    ios: isIosDevice(info),
    inApp: isInAppBrowser(info.userAgent),
    mobileOrSmall: isMobileDevice(info) || media('(max-width: 768px)'),
    standalone: isStandalone({
      displayModeStandalone: media('(display-mode: standalone)') || media('(display-mode: fullscreen)'),
      navigatorStandalone: nav.standalone === true,
    }),
  }
}

function readDismissed() {
  try {
    return isDismissed(window.localStorage.getItem(DISMISS_KEY))
  } catch {
    return false
  }
}

export default function InstallPwaBanner() {
  const [language] = useLanguage()
  const text = TEXT[language] ?? TEXT.en
  const { canPrompt, installed } = useInstallPrompt()
  const [device, setDevice] = useState(readDevice)
  const [dismissed, setDismissed] = useState(readDismissed)
  const [showSteps, setShowSteps] = useState(false)
  const titleId = useId()

  // Re-check on rotate/resize and if the display mode changes (e.g. after installing).
  useEffect(() => {
    const update = () => setDevice(readDevice())
    const queries = ['(max-width: 768px)', '(display-mode: standalone)']
      .map((q) => window.matchMedia?.(q))
      .filter(Boolean)
    queries.forEach((q) => q.addEventListener?.('change', update))
    return () => queries.forEach((q) => q.removeEventListener?.('change', update))
  }, [])

  const mode = bannerMode({ ...device, installed, dismissed, canPrompt })
  if (!mode) return null

  const dismiss = () => {
    setDismissed(true)
    setShowSteps(false)
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch { /* ignore */ }
  }

  const install = async () => {
    if (mode === 'ios') {
      setShowSteps((open) => !open)
      return
    }
    await promptInstall() // 'accepted' → appinstalled hides us; 'dismissed' → Chrome may offer again later
  }

  return (
    <>
      {/* keeps the fixed banner from covering the end of the page */}
      <div className="pwa-spacer" aria-hidden="true" />

      <section className="pwa-banner" role="region" aria-labelledby={titleId} lang={language}>
        {showSteps && (
          <div className="pwa-steps" id={`${titleId}-steps`}>
            <h2 className="pwa-steps-title">{text.iosTitle}</h2>
            {device.inApp && <p className="pwa-steps-warning">{text.inApp}</p>}
            <ol>
              {text.iosSteps.map((step, index) => (
                <li key={index}>
                  <span className="pwa-step-number" aria-hidden="true">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <button type="button" className="pwa-btn pwa-btn-secondary" onClick={() => setShowSteps(false)}>
              {text.gotIt}
            </button>
          </div>
        )}

        <div className="pwa-row">
          <img className="pwa-icon" src="/icons/icon-192.png" alt="" width="48" height="48" />
          <div className="pwa-copy">
            <h2 id={titleId} className="pwa-title">{text.title}</h2>
            <p className="pwa-text">{text.text}</p>
          </div>
          <button
            type="button"
            className="pwa-btn pwa-btn-primary"
            onClick={install}
            aria-expanded={mode === 'ios' ? showSteps : undefined}
            aria-controls={mode === 'ios' && showSteps ? `${titleId}-steps` : undefined}
          >
            {mode === 'ios' ? text.howTo : text.install}
          </button>
          <button type="button" className="pwa-close" onClick={dismiss} aria-label={text.close} title={text.close}>
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </section>
    </>
  )
}
