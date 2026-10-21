const eq = (text) => ({ key: 'eq', params: { t: text } });

/** Build four unique numeric options around the answer. */
export function numberOptions(R, answer, spread = 3) {
  const set = new Set([answer]);
  let guard = 0;
  while (set.size < 4 && guard++ < 60) {
    const v = answer + R.int(1, spread) * (R.chance(0.5) ? -1 : 1);
    if (v >= 0 || answer < 0) set.add(v);
  }
  for (let k = 1; set.size < 4; k++) set.add(answer + k);
  const options = R.shuffle([...set]);
  return { optionType: 'text', options: options.map(String), answerIndex: options.indexOf(answer) };
}

// Each recipe returns { expr, answer, explain }. Recipes are grouped by level.
const RECIPES = {
  1: [
    [0.4, (R) => { const a = R.int(5, 30), b = R.int(2, 20), ans = a + b; return { expr: `${a} + ${b} = ?`, answer: ans, explain: eq(`${a} + ${b} = ${ans}`) }; }],
    [0.3, (R) => { const a = R.int(5, 30), b = R.int(2, 20), x = Math.max(a, b) + R.int(0, 5), y = Math.min(a, b), ans = x - y; return { expr: `${x} − ${y} = ?`, answer: ans, explain: eq(`${x} − ${y} = ${ans}`) }; }],
    [0.3, (R) => { const a = R.int(5, 30), b = R.int(2, 20), c = a + b; return { expr: `? + ${b} = ${c}`, answer: a, explain: { key: 'back', params: { c, b, a } } }; }],
  ],
  2: [
    [0.3, (R) => { const a = R.int(20, 150), b = R.int(20, 99), ans = a + b; return { expr: `${a} + ${b} = ?`, answer: ans, explain: eq(`${a} + ${b} = ${ans}`) }; }],
    [0.25, (R) => { const a = R.int(3, 12), b = R.int(3, 12), ans = a * b; return { expr: `${a} × ${b} = ?`, answer: ans, explain: { key: 'groups', params: { a, b, ans } } }; }],
    [0.25, (R) => { const a = R.int(60, 200), b = R.int(15, 59), ans = a - b; return { expr: `${a} − ${b} = ?`, answer: ans, explain: eq(`${a} − ${b} = ${ans}`) }; }],
    [0.2, (R) => { const a = R.int(3, 12), b = R.int(3, 12); return { expr: `${a} × ? = ${a * b}`, answer: b, explain: eq(`${a * b} ÷ ${a} = ${b}`) }; }],
  ],
  3: [
    [0.3, (R) => { const a = R.int(12, 25), b = R.int(3, 9), ans = a * b; return { expr: `${a} × ${b} = ?`, answer: ans, explain: eq(`${a} × ${b} = ${ans}`) }; }],
    [0.25, (R) => { const b = R.int(3, 12), q = R.int(4, 15); return { expr: `${b * q} ÷ ${b} = ?`, answer: q, explain: { key: 'divmul', params: { b, q, bq: b * q } } }; }],
    [0.25, (R) => { const a = R.int(2, 9), b = R.int(2, 9), c = R.int(2, 9), ans = a + b * c; return { expr: `${a} + ${b} × ${c} = ?`, answer: ans, explain: { key: 'mixed', params: { a, b, c, bc: b * c, ans } } }; }],
    [0.2, (R) => { const a = R.int(3, 9), x = R.int(3, 12), c = R.int(2, 15); return { expr: `${a} × ? − ${c} = ${a * x - c}`, answer: x, explain: { key: 'unmix', params: { d: a * x - c, c, ax: a * x, a, x } } }; }],
  ],
};

const SPREAD = { 1: 3, 2: 6, 3: 10 };

/** @returns {import('./constants.js').Question} */
export function arithmetic(level, R) {
  const recipes = RECIPES[level];
  let roll = R.rng();
  let recipe = recipes[recipes.length - 1][1];
  for (const [weight, fn] of recipes) {
    if ((roll -= weight) < 0) { recipe = fn; break; }
  }
  const { expr, answer, explain } = recipe(R);
  return {
    kind: 'arithmetic',
    category: 'arithmetic',
    prompt: expr.includes('= ?') ? 'solve' : 'missing',
    stem: { type: 'expr', text: expr },
    explain,
    answer,
    ...numberOptions(R, answer, SPREAD[level]),
  };
}
