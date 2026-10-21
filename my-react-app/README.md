# Bulbuli

Bulbuli is a small-step learning app built with React and Vite. Signed-in
learners can follow five guided tutorials covering HTML, CSS, JavaScript,
GitHub, and React.

## Math Hero

Open **Math Hero** from the learning home page for a friendly addition and
subtraction game. Each multiple-choice question has a two-minute timer; correct
answers earn 5 XP, and game progress resumes from the saved question and level
on the same device.

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
npm run build
```
