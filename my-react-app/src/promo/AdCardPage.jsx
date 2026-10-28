import ArcadeHeader from '../arcade/ArcadeHeader.jsx'
import { useLanguage } from '../arcade/preferences.js'
import '../arcade/arcade.css'
import MathHeroAdCard from './MathHeroAdCard.jsx'

const PAGE_TEXT = {
  en: { title: 'Share Math Hero', intro: 'Share this page with your friends, and play Math Hero together on Bulbuli.' },
  bn: { title: 'ম্যাথ হিরো শেয়ার করো', intro: 'এই পাতাটি বন্ধুদের সাথে শেয়ার করো, তারপর Bulbuli-এ একসাথে ম্যাথ হিরো খেলো।' },
}

/** /share/math-hero: the Math Hero ad card on its own page, ready to download or share. */
export default function AdCardPage({ theme, onToggleTheme }) {
  const [language] = useLanguage()
  const text = PAGE_TEXT[language]
  return (
    <div className="arcade" lang={language}>
      <ArcadeHeader theme={theme} onToggleTheme={onToggleTheme} />
      <main id="main" className="arcade-main ad-page">
        <h1 className="ad-page-title">{text.title}</h1>
        <p className="ad-page-intro">{text.intro}</p>
        <MathHeroAdCard language={language} introTalk />
      </main>
    </div>
  )
}
