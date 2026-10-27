# Pro Coder courses

Course data for the quiz page at `/quiz/` (`quiz/index.html` + `quiz/engine.js`).
The engine is generic: it plays whichever course `?course=<id>` names, and the HTML course
when there is no id.

```
src/courses/
  index.js         COURSES registry + getCourse(id)
  catalog.js       light summaries for the home-page tile (no question data)
  validate.js      validateCourse(course) → list of problems
  courses.test.js  `npm test` checks (ids, answers, counts, curriculum)
  html/
    index.js       course metadata, levels, badges; imports the questions
    questions/     one file per level: 01-fundamentals.js … 10-practical.js
```

## The HTML course (70 questions)

| Level | Name | Questions |
|------:|------|----------:|
| 1 | HTML Fundamentals | 8 |
| 2 | Text & Content | 8 |
| 3 | Links & Navigation | 6 |
| 4 | Images & Media | 6 |
| 5 | Lists & Tables | 7 |
| 6 | Forms & User Input | 10 |
| 7 | Semantic HTML | 8 |
| 8 | Metadata & Document Structure | 6 |
| 9 | Attributes & Accessibility | 6 |
| 10 | Practical HTML & Knowledge Check | 5 |

## Question format

```js
{
  id: 'html-6-04',          // unique: <course>-<level>-<nn>
  level: 6,                 // a level `number` from the course's `levels`
  topic: 'name, value & placeholder',   // short tag shown on the card
  question: `<p>…</p><pre><code>…</code></pre>`, // HTML; write "<" as &lt; inside code
  options: ['…', '…', '…', '…'],  // exactly 4 plain-text strings, shown literally
  correctIndex: 0,          // 0–3
  hint: '…',                // plain text, shown at the top of the lesson drawer
  lesson: `<h3>…</h3><p>…</p>`, // HTML mini-lesson
}
```

Questions play in array order, level by level. Spread `correctIndex` across 0–3; a test
fails if one letter holds more than 35% of the answers.

## Adding a course (e.g. CSS)

1. Copy `html/` to `css/`, give it `id: 'css'`, its own `levels`, `questions` and `badges`.
2. Register it in `index.js` (`COURSES`) and add a summary to `catalog.js`.
3. Run `npm test`. The course plays at `/quiz/?course=css`.
