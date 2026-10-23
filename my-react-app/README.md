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

### Type Runner's forest

The bulbul (`src/assets/bulbul-runner.webp`) runs along a forest path that scrolls in two layers
(parallax): misty hills far away (`public/forest/back.webp`, slow) and the big trees and path
(`public/forest/front.webp`, moving with the runner). The forest drifts during a race and rushes
forward on every correct key; one animation loop sets a CSS variable, `--scroll`, and each layer
moves by it times its own speed (`src/games/type-runner/ForestScene.jsx`, `forestLayers.js`).
While racing, the bird bounces, leans and kicks up dust; at the finish he stands and breathes.
Everything stays still when "reduce motion" is on.

The layers are built from the painted scenes in `design/forest-source/` by
`python3 tools/build-forest-layers.py` (Pillow + NumPy): it crops them to the path band, makes the
trees layer's sky see-through, and joins the pictures so they loop without a visible seam. **To
change the forest**, replace the pictures in `design/forest-source/` and run the script again.
Don't put full scenes straight into `public/forest/`: an opaque picture in a front layer covers
the bird.

## Play and Learn zones

The home page has two zones, switched with the **Play | Learn** toggle in the header
(`src/arcade/ZoneToggle.jsx`):

- **Play** (default): the games and the Math Hero ad. Sky blue, sunny, toy-like.
- **Learn**: the five coding courses (HTML, CSS, JavaScript, GitHub, React) and their exams, for
  teens and grown-ups (`src/arcade/LearnZone.jsx`). Mint and teal on squared paper, flatter cards.
  Courses and exams need a Supabase sign-in; `/developer` is the signed-in course home.

The zone lives in the address: `/` is Play, `/?zone=learn` is Learn (`src/arcade/zone.js`,
`useZone()`). So Bulbuli always opens in Play, the Back button steps between zones, and a Learn
link can be shared. The Math Hero ad is part of the Play zone only.

### Coding and Grammar (inside Learn)

In Learn, a second switch, **Coding | Grammar**, appears beside Play | Learn. It is not shown in
Play. Both switches are the same `SlideToggle` in `src/arcade/ZoneToggle.jsx`, so they share
keyboard support (Tab, then the arrow keys).

| Address | Shows |
| --- | --- |
| `/` | Play |
| `/?zone=learn` | Learn, Coding (the default track) |
| `/?zone=learn&track=grammar` | Learn, Grammar |
| `/grammar/<tense-id>` | one tense: rule recap, then 5 questions |

`useZone()` and `useLearnTrack()` in `src/arcade/zone.js` read and set these. Opening Learn always
starts on Coding.

### Grammar: the 12 tense quizzes

Everything for Grammar is in `src/grammar/`:

- `tenses.json`: the 12 modules (Simple Present … Future Perfect Continuous). Each has a recap
  (when to use it, how to make it, signal words, examples and a tip) and 5 questions. Every
  question has 4 choices, the right answer's letter, an `explanation`, and a `why` on each wrong
  choice.
- `tenses.schema.json`: the JSON Schema for that file.
- `tenseModules.js`: helpers (groups, look-up, next module, stars).
- `GrammarZone.jsx`: the list of tenses. `GrammarQuizPage.jsx`: the recap and quiz.
- `progress.js`: best stars per tense, saved on this device (no sign-in needed).

To change a question, edit `tenses.json` and run `npm test`. `grammar.test.js` checks the file
against the schema and checks that every question has exactly one right answer and a `why` for
each wrong choice. The quiz code loads only when Grammar is opened, so Play stays light.

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
