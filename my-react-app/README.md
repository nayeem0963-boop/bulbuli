# Bulbuli

Bulbuli is a small-step learning app built with React and Vite. Signed-in
learners can follow five guided tutorials covering HTML, CSS, JavaScript,
GitHub, and React.

## Math Hero

Open **Math Hero** from the learning home page for a friendly addition and
subtraction game. Each multiple-choice question has a two-minute timer; correct
answers earn 5 XP, and game progress resumes from the saved question and level
on the same device.

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
