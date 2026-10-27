// Level 10 · Master Challenges (Math Master) — 6 mixed, multi-step questions.

// Positive root of ax² + bx + c = 0.
const positiveRoot = (a, b, c) => (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a)

export default [
  {
    id: 'L10-01',
    format: 'input',
    topic: 'Multi-step algebra',
    prompt: 'Solve 2(3x − 1) − (x + 4) = 3(x − 2) + 10. Type the value of x.',
    answer: 5,
    hint: 'Expand every bracket (watch the minus in front of the second one), then collect x-terms on one side.',
    explanation: 'Left: 6x − 2 − x − 4 = 5x − 6. Right: 3x − 6 + 10 = 3x + 4. So 5x − 6 = 3x + 4 → 2x = 10 → x = 5. Check: 2(14) − 9 = 19 and 3(3) + 10 = 19. ✓',
    steps: ['5x − 6 = 3x + 4', '2x = 10', 'x = 5'],
    visual: { type: 'balance', left: '2(3x − 1) − (x + 4)', right: '3(x − 2) + 10' },
    figure: 'A balanced scale: 2(3x − 1) − (x + 4) on the left pan, 3(x − 2) + 10 on the right pan.',
    verify: {
      value: (() => {
        const difference = (x) => 2 * (3 * x - 1) - (x + 4) - (3 * (x - 2) + 10)
        return -difference(0) / (difference(1) - difference(0))
      })(),
    },
  },
  {
    id: 'L10-02',
    topic: 'Geometry with algebra',
    prompt: 'A rectangle is x cm wide and (x + 5) cm long. Its area is 84 cm². What is its perimeter?',
    choices: ['38', '24', '48', '19'],
    unit: 'cm',
    answer: '38',
    hint: 'Write x(x + 5) = 84 as a quadratic, solve it, and keep the positive width.',
    explanation: 'x(x + 5) = 84 → x² + 5x − 84 = 0 → (x + 12)(x − 7) = 0. A width can’t be negative, so x = 7: the rectangle is 7 cm × 12 cm. Perimeter = 2(7 + 12) = 38 cm.',
    steps: ['x² + 5x − 84 = 0', '(x + 12)(x − 7) = 0 → x = 7', '2(7 + 12) = 38'],
    visual: {
      type: 'flat',
      polygons: [{ points: [[0, 0], [12, 0], [12, 7], [0, 7]] }],
      labels: [
        { x: 6, y: -0.9, text: '(x + 5) cm' },
        { x: -1.5, y: 3.5, text: 'x cm' },
        { x: 6, y: 3.5, text: '84 cm²' },
      ],
    },
    figure: 'A rectangle labelled x cm wide and (x + 5) cm long, with area 84 cm² (drawn to the true 7 cm by 12 cm proportions).',
    verify: { value: ((x) => 2 * (x + x + 5))(positiveRoot(1, 5, -84)) },
  },
  {
    id: 'L10-03',
    topic: 'Probability & reasoning',
    prompt: 'A bag has 4 red and 6 blue counters. Two counters are taken out, one after the other, without putting the first back. What is the probability both are red?',
    choices: ['2/15', '4/25', '1/5', '2/5'],
    answer: '2/15',
    hint: 'After one red is removed, there are fewer reds and fewer counters in total.',
    explanation: 'P(1st red) = 4/10. Then 3 reds remain out of 9, so P(2nd red) = 3/9. P(both) = 4/10 × 3/9 = 12/90 = 2/15. (4/25 would be with replacement.)',
    steps: ['4/10 × 3/9', '= 12/90', '= 2/15'],
    visual: {
      type: 'marbles',
      groups: [{ name: 'red', color: '#ff5f6d', count: 4 }, { name: 'blue', color: '#5db8ff', count: 6 }],
    },
    figure: 'A bowl with 4 red and 6 blue counters.',
    verify: { value: (4 / 10) * (3 / 9) },
  },
  {
    id: 'L10-04',
    topic: 'Applied real-world maths',
    prompt: 'A cylindrical water tank has radius 0.5 m and height 1.2 m. It fills at 6 litres per minute. How long does it take to fill, to the nearest minute? (1 m³ = 1000 litres)',
    choices: ['157', '94', '314', '942'],
    unit: 'minutes',
    answer: '157',
    hint: 'Find the volume in m³, convert to litres, then divide by the rate.',
    explanation: 'V = π × 0.5² × 1.2 = 0.3π ≈ 0.9425 m³ ≈ 942.5 litres. 942.5 ÷ 6 ≈ 157.1, so about 157 minutes.',
    steps: ['V = π × 0.25 × 1.2 ≈ 0.9425 m³', '≈ 942.5 L', '942.5 ÷ 6 ≈ 157'],
    visual: { type: 'solid', shape: 'cylinder', size: { r: 0.5, h: 1.2 }, labels: { r: '0.5 m', h: '1.2 m' } },
    figure: 'A cylindrical tank with radius 0.5 m and height 1.2 m.',
    verify: { value: Math.round((Math.PI * 0.5 ** 2 * 1.2 * 1000) / 6) },
  },
  {
    id: 'L10-05',
    topic: 'Geometry with algebra',
    prompt: 'Rotate the cone. Its base radius is 6 cm and its slant height is 10 cm. Find its exact volume. (V = ⅓πr²h, where h is the vertical height)',
    choices: ['96π', '120π', '360π', '288π'],
    unit: 'cm³',
    answer: '96π',
    hint: 'The vertical height, the radius and the slant height form a right-angled triangle.',
    explanation: 'h² + 6² = 10², so h² = 64 and h = 8 cm. V = ⅓ × π × 6² × 8 = ⅓ × 288π = 96π cm³. (Using the slant height 10 instead of h gives 120π.)',
    steps: ['h = √(10² − 6²) = 8', 'V = ⅓ × π × 36 × 8', '= 96π'],
    visual: { type: 'solid', shape: 'cone', size: { r: 6, slant: 10 }, labels: { r: '6 cm', slant: '10 cm' } },
    figure: 'A cone with base radius 6 cm and slant height 10 cm; the vertical height is not given.',
    verify: { value: (1 / 3) * Math.PI * 6 ** 2 * Math.sqrt(10 ** 2 - 6 ** 2) },
  },
  {
    id: 'L10-06',
    topic: 'Final challenge',
    prompt: 'Final challenge: a shop raises the $40 price of a lamp by 30%, then offers 20% off the new price. A customer buys 3 lamps and pays 5% sales tax on the total. How much do they pay?',
    choices: ['131.04', '138.60', '124.80', '126.00'],
    prefix: '$',
    answer: '131.04',
    hint: 'Do one step at a time: increase, discount, multiply by 3, then add tax.',
    explanation: '+30%: 40 × 1.3 = $52. −20%: 52 × 0.8 = $41.60. Three lamps: 3 × 41.60 = $124.80. +5% tax: 124.80 × 1.05 = $131.04. (+30% then −20% is not the same as +10%.)',
    steps: ['40 × 1.3 = 52', '52 × 0.8 = 41.60', '41.60 × 3 = 124.80', '124.80 × 1.05 = 131.04'],
    verify: { value: Math.round(40 * 1.3 * 0.8 * 3 * 1.05 * 100) / 100 },
  },
]
