// Level 9 · Logical & Mathematical Reasoning (Expert) — 8 questions.

export default [
  {
    id: 'L9-01',
    format: 'input',
    topic: 'Number sequences',
    prompt: 'What comes next? 2, 6, 12, 20, 30, …',
    answer: 42,
    hint: 'Look at the gaps between the terms: 4, 6, 8, 10, …',
    explanation: 'The differences are 4, 6, 8, 10, so the next difference is 12: 30 + 12 = 42. (The nth term is n(n + 1): 6 × 7 = 42.)',
    steps: ['gaps: 4, 6, 8, 10 → next 12', '30 + 12 = 42'],
    verify: { value: ((n) => n * (n + 1))(6) },
  },
  {
    id: 'L9-02',
    topic: 'Logical deduction',
    prompt: 'Ana, Ben and Chen each own one different pet: a cat, a dog or a fish. Ana owns neither the cat nor the dog. Ben does not own the cat. Who owns the cat?',
    choices: ['Chen', 'Ben', 'Ana', 'It cannot be determined'],
    answer: 'Chen',
    hint: 'Start with Ana — only one pet is left for her.',
    explanation: 'Ana can only have the fish. Ben can’t have the cat, and the fish is taken, so Ben has the dog. That leaves the cat for Chen.',
    verify: {
      text: (() => {
        const people = ['Ana', 'Ben', 'Chen']
        const pets = ['cat', 'dog', 'fish']
        const orders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]
        const valid = orders.filter((o) => pets[o[0]] === 'fish' && pets[o[1]] !== 'cat')
        const owners = new Set(valid.map((o) => people[o.findIndex((pet) => pets[pet] === 'cat')]))
        return owners.size === 1 ? [...owners][0] : 'It cannot be determined'
      })(),
    },
  },
  {
    id: 'L9-03',
    topic: 'Identifying patterns',
    prompt: 'Squares are made from matchsticks in a row: 1 square uses 4 matches, 2 squares use 7, 3 squares use 10. How many matches make 15 squares?',
    choices: ['46', '60', '45', '49'],
    answer: '46',
    hint: 'Each new square shares a side with the one before, so it adds 3 matches.',
    explanation: 'The pattern is 3n + 1 (4, 7, 10, …). For n = 15: 3 × 15 + 1 = 46. (60 would count every square separately.)',
    steps: ['rule: 3n + 1', '3 × 15 + 1 = 46'],
    visual: { type: 'matches', squares: 3 },
    figure: 'Three squares in a row made from 10 matchsticks.',
    verify: { value: 3 * 15 + 1 },
  },
  {
    id: 'L9-04',
    topic: 'Multi-step word problems',
    prompt: 'Tickets cost $8 for adults and $5 for children. A group of 12 people paid $75 in total. How many adults were in the group?',
    choices: ['5', '7', '6', '4'],
    answer: '5',
    hint: 'If everyone were a child, the cost would be 12 × $5. Each adult adds $3 more.',
    explanation: 'All children would cost 12 × 5 = $60. The extra $15 comes from adults, each costing $3 more: 15 ÷ 3 = 5 adults (and 7 children). Check: 5 × 8 + 7 × 5 = 40 + 35 = 75. ✓',
    steps: ['12 × 5 = 60', '75 − 60 = 15', '15 ÷ 3 = 5 adults'],
    verify: { only: (adults) => Number.isInteger(adults) && adults >= 0 && adults <= 12 && 8 * adults + 5 * (12 - adults) === 75 },
  },
  {
    id: 'L9-05',
    format: 'input',
    topic: 'Finding missing values',
    prompt: 'The mean of five numbers is 14. Four of them are 10, 12, 15 and 18. What is the fifth number?',
    answer: 15,
    hint: 'If the mean of 5 numbers is 14, what must they add up to?',
    explanation: 'Total = 5 × 14 = 70. The four known numbers add to 10 + 12 + 15 + 18 = 55. Fifth = 70 − 55 = 15.',
    steps: ['5 × 14 = 70', '10 + 12 + 15 + 18 = 55', '70 − 55 = 15'],
    verify: { value: 5 * 14 - (10 + 12 + 15 + 18) },
  },
  {
    id: 'L9-06',
    topic: 'Comparing solution strategies',
    prompt: 'Which method correctly finds 25% of 64?',
    choices: ['Halve 64, then halve the result', 'Divide 64 by 25', 'Multiply 64 by 25, then divide by 10', 'Subtract 25 from 64'],
    answer: 'Halve 64, then halve the result',
    hint: '25% is the same as one quarter.',
    explanation: '25% = 1/4, and halving twice divides by 4: 64 → 32 → 16. The others give 2.56, 160 and 39.',
    verify: { manual: '64/2/2 = 16 = 0.25×64; 64/25 = 2.56; 64×25/10 = 160; 64−25 = 39.' },
  },
  {
    id: 'L9-07',
    topic: 'Detecting errors',
    prompt: 'Sam solved 3(x − 4) = 21 like this. Step 1: 3x − 4 = 21. Step 2: 3x = 25. Step 3: x = 25/3. Which step has the first mistake?',
    choices: ['Step 1', 'Step 2', 'Step 3', 'There is no mistake'],
    answer: 'Step 1',
    hint: 'When you expand a bracket, multiply every term inside it.',
    explanation: '3(x − 4) = 3x − 12, not 3x − 4. Steps 2 and 3 follow correctly from Step 1, but the bracket was expanded wrongly. The correct answer is 3x = 33, so x = 11.',
    verify: { manual: '3(x−4) = 3x−12, so Step 1 is wrong; Step 2 (add 4) and Step 3 (divide by 3) are valid from Step 1.' },
  },
  {
    id: 'L9-08',
    topic: 'Reasoning through constraints',
    prompt: 'I am a two-digit number. I am a multiple of 7, my digits add up to 10, and I am odd. What number am I?',
    choices: ['91', '28', '73', '55'],
    answer: '91',
    hint: 'List the two-digit multiples of 7 and check their digit sums.',
    explanation: 'Two-digit multiples of 7 with digit sum 10 are 28 (2 + 8) and 91 (9 + 1). 28 is even, so the number is 91.',
    verify: {
      only: (n) => n >= 10 && n <= 99 && n % 7 === 0 && n % 2 === 1 && String(n).split('').reduce((s, d) => s + Number(d), 0) === 10,
    },
  },
]
