# Bulbuli

Bulbuli is a free learning arcade for children under 12, built with React and
Vite. Games are open to everyone (no sign-in); progress and XP are saved on the
device, and optionally to a free account. Every game works in English and Bangla.

| Game | Route | Practises |
|------|-------|-----------|
| Math Hero | `/games/math-hero` | addition and subtraction against the clock |
| Memory Match | `/games/memory-match` | memory, then matching pictures to written words |
| Pattern Quest | `/games/pattern-quest` | number and shape patterns, quick sums |
| DevCraft Studio | `/games/devcraft-studio` | ages 12+: real CSS (flexbox, grid, spacing, card styling) matched to a target design |
| Logic Gate Builder | `/games/logic-gate-builder` | ages 12+: Boolean logic with AND, OR, NOT, XOR and NAND gates and truth tables |

To add a game, see [`src/games/README.md`](src/games/README.md).

## Home page and navigation

Bulbuli is games only. The header (`src/arcade/ArcadeHeader.jsx`) shows the brand, the **Play**
tab with its **Educational | Adventure** switch (`src/arcade/PlayNav.jsx`), the language switch,
and the profile button (Sign in, or the player's avatar linking to `/dashboard`). On a game page
the navigation becomes a big "All games" button, and sound and day/night join the controls.

The category and an open launcher game live in the address (`src/arcade/zone.js`):

| Address | Shows |
|---------|-------|
| `/` | Educational games (the default) |
| `/?category=adventure` | Adventure games |
| `/?category=adventure&play=<id>` | that game open in the launcher |
| `/games/<id>` | a game on its own page |
| `/dashboard` | a signed-in player's level, XP and per-game activity |

Old Learn, course, exam and grammar links (`/?zone=learn`, `/tutorials/…`, `/grammar/…`) land on
the games.

## Saved progress and accounts

Progress is kept per player on the device by `useGameProgress(playerId)`
(`src/hooks/useGameProgress.js`): each game's record, Math Hero's run, and total XP. Signing in is
optional; signed-in players' XP is also saved to their Supabase profile (`src/lib/xp.js`, the
`award_xp()` function in `supabase/migrations/`), and `/dashboard` shows it.

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

## Shared answer feedback (Math Hero)

Math Hero builds its question card from reusable feedback pieces:

```jsx
import AnimatedAnswerOption from './components/AnimatedAnswerOption.jsx'
import AnimatedQuizCard from './components/AnimatedQuizCard.jsx'
import LifeCounter from './components/LifeCounter.jsx'
import MilestoneBanner from './components/MilestoneBanner.jsx'
import useQuizFeedback from './hooks/useQuizFeedback.js'

const { feedback, milestone, triggerCorrect, triggerWrong, triggerBonus } = useQuizFeedback()
```

Pass `feedback` to the animated card and answer options; use the life counter and milestone
banner for game events. The hook also exposes `triggerClick`, `triggerLevelUp` and
`triggerGameOver`. Sound and animation timings/colours live in `src/utils/sound.js` and
`src/utils/feedbackConfig.js`.

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
