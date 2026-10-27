// Level 6 · Statistics & Probability (Expert) — 10 questions.

const sum = (list) => list.reduce((total, value) => total + value, 0)
const median = (list) => {
  const sorted = [...list].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
const modeOf = (list) => {
  const counts = new Map()
  for (const value of list) counts.set(value, (counts.get(value) ?? 0) + 1)
  const top = Math.max(...counts.values())
  const modes = [...counts].filter(([, count]) => count === top).map(([value]) => value)
  return modes.length === 1 ? modes[0] : NaN
}

const goals = [{ goals: 0, matches: 4 }, { goals: 1, matches: 6 }, { goals: 2, matches: 7 }, { goals: 3, matches: 3 }]
const sales = [
  { label: 'Mon', value: 12 }, { label: 'Tue', value: 18 }, { label: 'Wed', value: 9 },
  { label: 'Thu', value: 15 }, { label: 'Fri', value: 21 },
]
const modeData = [6, 3, 9, 6, 2, 8, 6, 3]

export default [
  {
    id: 'L6-01',
    topic: 'Mean',
    prompt: 'Find the mean of 12, 15, 9, 18, 11 and 13.',
    choices: ['13', '12.5', '15', '9'],
    answer: '13',
    hint: 'Mean = total of the values ÷ how many values there are.',
    explanation: 'Total = 12 + 15 + 9 + 18 + 11 + 13 = 78. There are 6 values. 78 ÷ 6 = 13. (12.5 is the median.)',
    steps: ['sum = 78', '78 ÷ 6 = 13'],
    verify: { value: sum([12, 15, 9, 18, 11, 13]) / 6 },
  },
  {
    id: 'L6-02',
    topic: 'Median',
    prompt: 'Find the median of 3, 9, 4, 7, 12, 5, 8.',
    choices: ['7', '5', '6.9', '12'],
    answer: '7',
    hint: 'Put the values in order first, then find the middle one.',
    explanation: 'In order: 3, 4, 5, 7, 8, 9, 12. There are 7 values, so the median is the 4th: 7.',
    steps: ['3, 4, 5, 7, 8, 9, 12', '4th value = 7'],
    verify: { value: median([3, 9, 4, 7, 12, 5, 8]) },
  },
  {
    id: 'L6-03',
    topic: 'Mode & range',
    prompt: 'For the data 6, 3, 9, 6, 2, 8, 6, 3, what are the mode and the range?',
    choices: ['Mode 6, range 7', 'Mode 3, range 7', 'Mode 6, range 9', 'Mode 7, range 6'],
    answer: 'Mode 6, range 7',
    hint: 'Mode = the most frequent value. Range = largest − smallest.',
    explanation: '6 appears three times, more than any other value, so the mode is 6. Range = 9 − 2 = 7.',
    verify: { text: `Mode ${modeOf(modeData)}, range ${Math.max(...modeData) - Math.min(...modeData)}` },
  },
  {
    id: 'L6-04',
    topic: 'Interpreting data tables',
    prompt: 'The chart shows how many goals a team scored in 20 matches: 0 goals in 4 matches, 1 goal in 6, 2 goals in 7, and 3 goals in 3. What is the mean number of goals per match?',
    choices: ['1.45', '1.5', '7.25', '2'],
    answer: '1.45',
    hint: 'Total goals = Σ (goals × number of matches). Then divide by the number of matches.',
    explanation: 'Total goals = 0×4 + 1×6 + 2×7 + 3×3 = 0 + 6 + 14 + 9 = 29. Matches = 20. Mean = 29 ÷ 20 = 1.45.',
    steps: ['0 + 6 + 14 + 9 = 29 goals', '29 ÷ 20 = 1.45'],
    visual: {
      type: 'bars',
      data: goals.map((row) => ({ label: `${row.goals} ${row.goals === 1 ? 'goal' : 'goals'}`, value: row.matches })),
      axis: 'matches',
    },
    figure: 'Bar chart of matches by goals scored: 0 goals 4, 1 goal 6, 2 goals 7, 3 goals 3.',
    verify: { value: sum(goals.map((row) => row.goals * row.matches)) / sum(goals.map((row) => row.matches)) },
  },
  {
    id: 'L6-05',
    topic: 'Reading graphs',
    prompt: 'The 3D bar chart shows smoothies sold each day. How many more were sold on Friday than on Wednesday?',
    choices: ['12', '21', '9', '6'],
    answer: '12',
    hint: 'Read the Friday bar and the Wednesday bar, then subtract.',
    explanation: 'Friday: 21. Wednesday: 9. 21 − 9 = 12 more on Friday.',
    visual: { type: 'bars', data: sales, axis: 'smoothies' },
    figure: 'Bar chart of smoothies sold: Mon 12, Tue 18, Wed 9, Thu 15, Fri 21.',
    verify: { value: sales[4].value - sales[2].value },
  },
  {
    id: 'L6-06',
    topic: 'Basic probability',
    prompt: 'A bag holds 5 red, 3 blue and 2 green marbles. One marble is picked at random. What is P(blue)?',
    choices: ['3/10', '3/7', '1/3', '3/5'],
    answer: '3/10',
    hint: 'Probability = favourable outcomes ÷ total outcomes.',
    explanation: 'There are 5 + 3 + 2 = 10 marbles and 3 are blue, so P(blue) = 3/10. (3/7 compares blue with non-blue, which is odds, not probability.)',
    visual: {
      type: 'marbles',
      groups: [{ name: 'red', color: '#ff5f6d', count: 5 }, { name: 'blue', color: '#5db8ff', count: 3 }, { name: 'green', color: '#4fc58d', count: 2 }],
    },
    figure: 'A bowl of 10 marbles: 5 red, 3 blue and 2 green.',
    verify: { value: 3 / (5 + 3 + 2) },
  },
  {
    id: 'L6-07',
    topic: 'Complementary probability',
    prompt: 'The probability that it rains tomorrow is 0.35. What is the probability that it does not rain?',
    choices: ['0.65', '0.35', '0.5', '1.35'],
    answer: '0.65',
    hint: 'An event either happens or it doesn’t, so the two probabilities add to 1.',
    explanation: 'P(not rain) = 1 − P(rain) = 1 − 0.35 = 0.65.',
    verify: { value: 1 - 0.35 },
  },
  {
    id: 'L6-08',
    topic: 'Independent events',
    prompt: 'A fair coin is flipped and a fair six-sided die is rolled. What is the probability of heads and a 6?',
    choices: ['1/12', '1/8', '2/3', '1/6'],
    answer: '1/12',
    hint: 'For independent events, multiply the probabilities.',
    explanation: 'P(heads) = 1/2 and P(6) = 1/6. They don’t affect each other, so P(both) = 1/2 × 1/6 = 1/12.',
    steps: ['1/2 × 1/6', '= 1/12'],
    visual: { type: 'dice', dice: 1, coin: true },
    figure: 'A coin and one six-sided die.',
    verify: { value: (1 / 2) * (1 / 6) },
  },
  {
    id: 'L6-09',
    topic: 'Sample spaces & compound probability',
    prompt: 'Two fair six-sided dice are rolled. What is the probability that the two numbers add up to 7?',
    choices: ['1/6', '7/36', '1/12', '1/11'],
    answer: '1/6',
    hint: 'There are 6 × 6 = 36 equally likely outcomes. List the pairs that make 7.',
    explanation: 'Pairs making 7: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) — 6 of the 36 outcomes. 6/36 = 1/6.',
    steps: ['36 outcomes', '6 make a total of 7', '6/36 = 1/6'],
    visual: { type: 'dice', dice: 2 },
    figure: 'Two six-sided dice.',
    verify: {
      value: (() => {
        let hits = 0
        for (let a = 1; a <= 6; a += 1) for (let b = 1; b <= 6; b += 1) if (a + b === 7) hits += 1
        return hits / 36
      })(),
    },
  },
  {
    id: 'L6-10',
    topic: 'Interpreting statistical claims',
    prompt: '20 students at a basketball practice were asked if the school needs a new court; 18 said yes. A headline says “90% of the school wants a new court.” What is the main problem with the claim?',
    choices: [
      'The sample is small and biased towards basketball players',
      '18 out of 20 is not 90%',
      'Surveys can never be used to draw conclusions',
      'The headline should say 18%',
    ],
    answer: 'The sample is small and biased towards basketball players',
    hint: 'Is the arithmetic wrong, or is it who was asked?',
    explanation: '18 ÷ 20 = 90%, so the arithmetic is right. But only 20 students were asked, all at basketball practice — people likely to want a court. The sample doesn’t represent the whole school.',
    verify: { manual: '18/20 = 0.9 so the percentage is correct; only the sampling objection is valid.' },
  },
]
