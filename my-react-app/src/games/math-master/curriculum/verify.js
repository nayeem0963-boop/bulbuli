/**
 * Independent checks for the question bank (used by curriculum.test.js, never shipped to players).
 *
 * Each question's `verify` rule is evaluated against every choice. A rule passes only when
 * exactly one choice is mathematically correct and that choice is the question's `answer`.
 *
 * To do that, choices written in maths notation ("3x² + 2x + 7", "4.7 × 10⁻⁴", "6√2", "36π",
 * "(7, 3)", "x = −5 or x = 3") are parsed into JavaScript and evaluated numerically.
 */

const SUPERSCRIPTS = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' }

/** Normalises typography: unicode minus, ×, ÷, and superscript exponents → ^(…). */
function normalise(text) {
  let out = ''
  let inExponent = false
  for (const char of String(text)) {
    if (SUPERSCRIPTS[char] !== undefined) {
      if (!inExponent) { out += '^('; inExponent = true }
      out += SUPERSCRIPTS[char]
      continue
    }
    if (inExponent) { out += ')'; inExponent = false }
    out += char
  }
  if (inExponent) out += ')'
  return out
    .replace(/[−–]/g, '-')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\s+/g, '')
}

/**
 * Turns a maths expression into a JS function of the given variables.
 * Handles implicit multiplication (3x, 2(x+1), )(, 6√2, 36π), ^ powers, √n / √(…), and unary minus.
 */
export function compile(expression, vars = []) {
  const source = normalise(expression)
  const tokens = []
  let i = 0
  while (i < source.length) {
    const char = source[i]
    if (/[0-9.]/.test(char)) {
      let number = char
      i += 1
      while (i < source.length && /[0-9.]/.test(source[i])) { number += source[i]; i += 1 }
      tokens.push({ type: 'num', text: number })
      continue
    }
    if (char === 'π') { tokens.push({ type: 'num', text: 'Math.PI' }); i += 1; continue }
    if (char === '√') { tokens.push({ type: 'fn', text: 'Math.sqrt' }); i += 1; continue }
    if (char === '∛') { tokens.push({ type: 'fn', text: 'Math.cbrt' }); i += 1; continue }
    if (/[a-z]/i.test(char)) {
      if (!vars.includes(char)) throw new Error(`Unknown variable "${char}" in "${expression}"`)
      tokens.push({ type: 'var', text: char })
      i += 1
      continue
    }
    if ('+-*/^()'.includes(char)) { tokens.push({ type: char === '(' || char === ')' ? char : 'op', text: char }); i += 1; continue }
    throw new Error(`Cannot parse "${char}" in "${expression}"`)
  }

  let js = ''
  let previous = null
  for (let k = 0; k < tokens.length; k += 1) {
    const token = tokens[k]
    const endsValue = previous && (previous.type === 'num' || previous.type === 'var' || previous.type === ')')
    const startsValue = token.type === 'num' || token.type === 'var' || token.type === '(' || token.type === 'fn'
    if (endsValue && startsValue) js += '*'
    if (token.type === 'op' && token.text === '-' && (!previous || previous.type === 'op' || previous.type === '(')) {
      js += '(-1)*'
    } else if (token.type === 'op' && token.text === '^') {
      js += '**'
    } else if (token.type === 'fn') {
      // √2 or √(…): wrap a bare number in brackets
      const next = tokens[k + 1]
      if (next?.type === 'num') {
        js += `${token.text}(${next.text})`
        k += 1
        previous = { type: ')' }
        continue
      }
      js += token.text
    } else {
      js += token.text
    }
    previous = token
  }
  // eslint-disable-next-line no-new-func
  return new Function(...vars, `return (${js})`)
}

export const numberOf = (text) => compile(String(text).replace(/^\s*[a-z]\s*=\s*/i, ''))()

export function close(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
}

const SAMPLES = [1.37, -2.41, 0.73, 3.29, -0.58, 2.06]

function equivalent(expression, reference, vars) {
  const fn = compile(expression.replace(/^\s*[a-z]\s*=\s*/i, ''), vars)
  return SAMPLES.every((_, s) => {
    const values = vars.map((_, v) => SAMPLES[(s + v * 2) % SAMPLES.length] + v * 0.5)
    const scope = Object.fromEntries(vars.map((name, v) => [name, values[v]]))
    return close(fn(...values), reference(scope))
  })
}

const parsePair = (text) => {
  const match = normalise(text).match(/^\((-?[\d.]+),(-?[\d.]+)\)$/)
  return match ? [Number(match[1]), Number(match[2])] : null
}

/** All the numbers written in a choice, e.g. "x = −5 or x = 3" → [−5, 3]. */
const numbersIn = (text) => (normalise(text).match(/-?\d+(\.\d+)?/g) ?? []).map(Number)

/** "{(1, 2), (1, 5)}" → [[1, 2], [1, 5]] */
const pairsIn = (text) => [...normalise(text).matchAll(/\((-?[\d.]+),(-?[\d.]+)\)/g)].map((m) => [Number(m[1]), Number(m[2])])

/** "x: 2, 4, 6 → y: 5, 10, 15" → [[2, 5], [4, 10], [6, 15]] */
function tableIn(text) {
  const [xs, ys] = String(text).split('→').map((part) => numbersIn(part.replace(/^[^:]*:/, '')))
  return xs.map((x, i) => [x, ys[i]])
}

/** "x > 3" → (x) => x > 3 */
function inequalityOf(text) {
  const match = normalise(text).match(/^x(<=|>=|<|>|≤|≥)(-?[\d.]+)$/)
  if (!match) return null
  const [, op, bound] = match
  const b = Number(bound)
  return { '<': (x) => x < b, '>': (x) => x > b, '<=': (x) => x <= b, '≤': (x) => x <= b, '>=': (x) => x >= b, '≥': (x) => x >= b }[op]
}

/**
 * Which choices satisfy the question's verify rule.
 * @returns {{ correct: string[], kind: string }}  kind 'manual' means a person checked it (see the rule's note).
 */
export function correctChoices(question) {
  const rule = question.verify
  if (!rule) throw new Error(`${question.id} has no verify rule`)

  if (question.format === 'input') {
    if (!('value' in rule)) throw new Error(`${question.id}: input questions need verify.value`)
    return { correct: close(rule.value, question.answer) ? [String(question.answer)] : [], kind: 'value' }
  }

  const choices = question.choices
  const pick = (kind, test) => ({ kind, correct: choices.filter((choice) => test(choice)) })

  if ('value' in rule) return pick('value', (choice) => close(numberOf(choice), rule.value))
  if ('expr' in rule) return pick('expr', (choice) => equivalent(choice, rule.expr, rule.vars))
  if ('only' in rule) return pick('only', (choice) => rule.only(numberOf(choice)))
  if ('text' in rule) return pick('text', (choice) => choice === rule.text)
  if ('pairWhere' in rule) {
    return pick('pair', (choice) => {
      const pair = parsePair(choice)
      return Boolean(pair) && rule.pairWhere(pair[0], pair[1])
    })
  }
  if ('roots' in rule) {
    return pick('roots', (choice) => {
      const values = numbersIn(choice)
      return values.length === rule.count && new Set(values).size === rule.count
        && values.every((value) => Math.abs(rule.roots(value)) < 1e-9)
    })
  }
  if ('point' in rule) {
    const [x, y] = rule.point
    const hits = (question.visual?.points ?? []).filter((p) => !p.fixed && p.x === x && p.y === y)
    return pick('point', (choice) => hits.some((p) => p.label === choice))
  }
  if ('line' in rule) {
    return pick('line', (choice) => {
      const fn = compile(choice.replace(/^\s*y\s*=\s*/, ''), ['x'])
      return rule.line.every(([x, y]) => close(fn(x), y))
    })
  }
  if ('inequality' in rule) {
    const probes = [-10, -3.5, -1, 0, 1.5, 2, 2.9, 3, 3.1, 4, 7.5, 12]
    return pick('inequality', (choice) => {
      const test = inequalityOf(choice)
      return Boolean(test) && probes.every((x) => test(x) === rule.inequality.holds(x))
    })
  }
  if ('notFunction' in rule) {
    return pick('notFunction', (choice) => {
      const pairs = pairsIn(choice)
      const outputs = new Map()
      return pairs.some(([x, y]) => {
        if (outputs.has(x) && outputs.get(x) !== y) return true
        outputs.set(x, y)
        return false
      })
    })
  }
  if ('proportionalTable' in rule) {
    return pick('proportional', (choice) => {
      const rows = tableIn(choice)
      if (rows.some(([x]) => x === 0)) return rows.every(([, y]) => y === 0)
      const k = rows[0][1] / rows[0][0]
      return rows.every(([x, y]) => close(y / x, k))
    })
  }
  if ('manual' in rule) return { kind: 'manual', correct: [question.answer] }
  throw new Error(`${question.id}: unknown verify rule ${Object.keys(rule)}`)
}
