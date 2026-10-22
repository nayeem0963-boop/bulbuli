# Bulbuli

Bulbuli is a free learning arcade for children under 12, built with React and
Vite. Games are open to everyone (no sign-in); progress and XP are saved on the
device. Every game works in English and Bangla.

| Game | Route | Practises |
|------|-------|-----------|
| Math Hero | `/games/math-hero` | addition and subtraction against the clock |
| Memory Match | `/games/memory-match` | memory, then matching pictures to written words |
| Pattern Quest | `/games/pattern-quest` | number and shape patterns, quick sums |
| Type Runner | `/games/type-runner` | keyboard letters (Speed Keys), then typing words |

To add a game, see [`src/games/README.md`](src/games/README.md).

## Math Hero ad card

`/share/math-hero` shows a shareable Math Hero advert (`src/promo/MathHeroAdCard.jsx`).
**Download & Share** saves a 1080 × 1350 PNG (`Bulbuli-MathHero-Ad.png`); on phones and
tablets it opens the share sheet instead (Web Share API), with **Save image only** as a
fallback. The PNG is painted on a canvas from the same layout as the card
(`src/promo/adContent.js`), so change text, colours or positions there.

On the live card, tap Math Hero, his speech bubble or the **Listen** button and he reads his
message aloud in Bengali (`src/promo/adVoice.js`): `window.speechSynthesis` with a `bn-BD` voice,
then any `bn` voice; on devices with no Bengali voice (most Windows PCs, iPhones, iPads) the same
online Bangla voice as the Math Hero game. It respects the arcade's mute switch. The **Play Now**
button links to `/games/math-hero` (pass a full URL as `to` to link elsewhere).

The downloaded PNG can't talk or be clicked, so instead of the button it prints a panel with
`bulbuli.org` and a QR code that opens `https://bulbuli.org/games/math-hero`
(`src/promo/qrMathHero.js`; make a new code there if the address changes).

### Share with Friends

Under the card there is one button, **Share with Friends** (`shareLink` in
`src/promo/MathHeroAdCard.jsx`). It opens the phone's or computer's share sheet
(`navigator.share`) with:

- title: `Math Hero on Bulbuli`
- text: `Hey Explorer! 🚀 Play Math Hero with me for free on Bulbuli!`
- url: `https://bulbuli.org/share/math-hero`

(Bangla title and text when the page is in Bangla; see `src/promo/adContent.js` and
`src/promo/shareData.js`.) Where sharing isn't available, as in many desktop browsers, it copies
the link to the clipboard; if that is blocked too, it shows the link to copy by hand.

The landing page `/share/math-hero` plays a word-by-word intro straight away, and Math Hero speaks
on the first tap. `share/math-hero/index.html` gives the shared link a Math Hero preview in chat
apps (built as a second page in `vite.config.js`).

Earlier export options (talking video, animated GIF and picture) are no longer shown. Their code
is unused and can be deleted: `renderAdVideo.js`, `videoTimeline.js` (+ test),
`public/audio/math-hero-ad-bn.mp3`, `renderAdGif.js`, `gifEncoder.js` (+ test), `gifTimeline.js`,
`fileLinks.js`, and `renderAdCardBlob` / `buildVideoShareData`.

## Shared quiz feedback

Reusable feedback primitives are available to quiz, course, and exam screens:

```jsx
import AnimatedAnswerOption from './components/AnimatedAnswerOption.jsx'
import AnimatedQuizCard from './components/AnimatedQuizCard.jsx'
import LifeCounter from './components/LifeCounter.jsx'
import MilestoneBanner from './components/MilestoneBanner.jsx'
import useQuizFeedback from './hooks/useQuizFeedback.js'

const { feedback, milestone, triggerCorrect, triggerWrong, triggerBonus } = useQuizFeedback()
```

Pass `feedback` to the animated card and answer options; use the life counter
and milestone banner for game-specific events. The hook also exposes
`triggerClick`, `triggerLevelUp`, and `triggerGameOver`. Sound and animation
timings/colors are managed by `src/utils/sound.js` and
`src/utils/feedbackConfig.js`. The shared tutorial quiz flow uses these
primitives across all five courses, and timed exam screens use the animated
card/options with click sounds while keeping answer correctness hidden until
submission.
The sound manager currently maps the bonus chime to `correct.mp3` and both
level-up/game-over fanfares to `complete.mp3`; dedicated files can be added
later by changing the source map in `src/utils/sound.js`.

## Guided tutorials

Open **Tutorials** from the learning home page to browse the five topics. Each
tutorial is organized into modules with optional reading material and a
five-minute module quiz (the full-tutorial quiz remains fifteen minutes). A
module or tutorial is completed only after every question is answered
correctly; incomplete attempts can be retried. Quiz answers and module results
are saved in localStorage separately for each signed-in user on that device.

## Development

```sh
npm install
npm run dev
```

## Validate

```sh
npm run lint
npm test
npm run build   # dist/ should contain share/math-hero/index.html too
```
