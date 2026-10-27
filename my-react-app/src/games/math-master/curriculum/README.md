# Math Master curriculum

Ten levels, 100 questions (10 · 12 · 14 · 12 · 10 · 10 · 10 · 8 · 8 · 6). Level metadata (tier,
difficulty, objective, badge, colour) is in `levels.js`; each level's questions are in
`questions/level-NN.js`, in the order players meet them (easiest first).

## Question schema

```js
{
  id: 'L4-09',                 // unique: L<level>-<nn>
  format: 'choice',            // 'choice' (default) | 'input' (type a number) | 'pick' (tap A–D in 3D)
  topic: 'Volume of 3D solids',// used for the results screen's topic breakdown
  prompt: 'A cylinder has radius 3 cm and height 10 cm. Find its volume to the nearest cm³.',
  choices: ['283', '94', '188', '565'], // exactly 4, shuffled each round (not for 'pick'); omit for 'input'
  answer: '283',               // one of the choices; a number for 'input'; a point label for 'pick'
  unit: 'cm³',                 // optional, shown after every choice ('°' and '%' join with no space)
  prefix: '$',                 // optional, shown before every choice
  hint: '…',                   // must not contain the answer
  explanation: '…',            // shown after answering
  steps: ['…', '…'],           // optional worked lines
  visual: { type: 'solid', shape: 'cylinder', size: { r: 3, h: 10 }, labels: { r: '3 cm', h: '10 cm' } },
  figure: 'A cylinder with radius 3 cm and height 10 cm.', // required with a visual: caption + no-WebGL text
  verify: { value: Math.round(Math.PI * 3 ** 2 * 10) },    // recomputed by curriculum.test.js
}
```

### Visual types (drawn to scale in `../scene/Figures.jsx`)

`tiles` fraction grid · `cubes` n×n×n block · `balance` equation scale · `coords` grid with points/lines
(points are tappable in `pick` questions) · `flat` 2D polygons, circles, segments and labels · `solid`
cuboid / prism / cylinder / sphere / cone · `bars` bar chart · `marbles` bowl of counters · `dice` dice
and coin · `matches` matchstick squares.

### Verify rules

Every rule is checked against all four choices: exactly one may pass, and it must be `answer`.

| rule | passes when |
|------|-------------|
| `value: n` | the choice evaluates to n (handles `4.7 × 10⁻⁴`, `6√2`, `36π`, `3/10`, `x = 5`) |
| `expr: fn, vars` | the choice is algebraically equivalent to fn (sampled at several points) |
| `only: predicate` | predicate(choice as a number) is true |
| `pairWhere: (x, y) => bool` | the choice `(x, y)` satisfies it |
| `roots: f, count` | the choice lists exactly `count` distinct roots of f |
| `point: [x, y]` | the labelled point in the figure sits at (x, y) |
| `line: [[x, y], …]` | the choice `y = …` passes through every point |
| `inequality: { holds }` | the choice `x > a` agrees with holds(x) everywhere it is probed |
| `text: string` | the choice equals a string computed from the data |
| `notFunction`, `proportionalTable` | parsed from the choices' sets / tables |
| `manual: note` | sentence answers checked by a person; the note records how (7 questions) |

Run `npm test` after any change.

The questions and explanations are in English; the game's buttons, levels and objectives are in
English and Bangla.
