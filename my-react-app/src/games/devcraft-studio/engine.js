// DevCraft Studio rules, kept free of React so they can be tested on their own.
//
// Each level has one or more elements (a CSS selector each). Every element has
// some fixed declarations, some the player controls, a starting value for each
// control and a target. The player's values become a real inline style for the
// live preview and real CSS text for the code view, and check() compares them
// with the target property by property.

/** The CSS properties the game teaches, with how each control looks. */
export const PROPERTIES = {
  display: { css: 'display', control: 'chips', options: ['block', 'flex', 'grid'] },
  justifyContent: {
    css: 'justify-content',
    control: 'chips',
    options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'],
  },
  alignItems: { css: 'align-items', control: 'chips', options: ['stretch', 'flex-start', 'center', 'flex-end'] },
  columns: { css: 'grid-template-columns', control: 'chips', options: [1, 2, 3] },
  gap: { css: 'gap', control: 'slider', min: 0, max: 32, step: 4, unit: 'px' },
  padding: { css: 'padding', control: 'slider', min: 0, max: 40, step: 4, unit: 'px' },
  borderRadius: { css: 'border-radius', control: 'slider', min: 0, max: 32, step: 4, unit: 'px' },
  backgroundColor: {
    css: 'background-color',
    control: 'swatches',
    options: ['#ffffff', '#fff1c2', '#d7efff', '#d5f3e3', '#ffe1e3'],
  },
}

/**
 * Levels. `scene` picks the little web page drawn in the preview.
 * Element fields: key, selector, fixed (declarations the player cannot change),
 * controls (properties the player changes), start, target.
 */
export const LEVELS = [
  {
    id: 1,
    scene: 'avatar',
    elements: [
      {
        key: 'row',
        selector: '.profile-row',
        fixed: { display: 'flex' },
        controls: ['justifyContent'],
        start: { justifyContent: 'flex-start' },
        target: { justifyContent: 'center' },
      },
    ],
  },
  {
    id: 2,
    scene: 'badge',
    elements: [
      {
        key: 'card',
        selector: '.badge-card',
        fixed: { display: 'flex' },
        controls: ['justifyContent', 'alignItems'],
        start: { justifyContent: 'flex-start', alignItems: 'flex-start' },
        target: { justifyContent: 'center', alignItems: 'center' },
      },
    ],
  },
  {
    id: 3,
    scene: 'toolbar',
    elements: [
      {
        key: 'toolbar',
        selector: '.toolbar',
        fixed: { display: 'flex', alignItems: 'center' },
        controls: ['justifyContent'],
        start: { justifyContent: 'flex-start' },
        target: { justifyContent: 'space-between' },
      },
      {
        key: 'actions',
        selector: '.toolbar .actions',
        fixed: { display: 'flex' },
        controls: ['gap'],
        start: { gap: 0 },
        target: { gap: 12 },
      },
    ],
  },
  {
    id: 4,
    scene: 'grid',
    elements: [
      {
        key: 'cards',
        selector: '.card-grid',
        fixed: {},
        controls: ['display', 'columns', 'gap'],
        start: { display: 'block', columns: 1, gap: 0 },
        target: { display: 'grid', columns: 2, gap: 16 },
      },
    ],
  },
  {
    id: 5,
    scene: 'card',
    elements: [
      {
        key: 'card',
        selector: '.profile-card',
        fixed: {},
        controls: ['borderRadius', 'padding', 'backgroundColor'],
        start: { borderRadius: 0, padding: 0, backgroundColor: '#ffffff' },
        target: { borderRadius: 16, padding: 24, backgroundColor: '#fff1c2' },
      },
    ],
  },
]

export const getLevel = (id) => LEVELS.find((level) => level.id === id) ?? LEVELS[0]

/** Every element's values at the start of a level: { [key]: { ...fixed, ...start } }. */
export const startValues = (level) => Object.fromEntries(level.elements.map((el) => [el.key, { ...el.fixed, ...el.start }]))

/** Every element's values in the finished design. */
export const targetValues = (level) => Object.fromEntries(level.elements.map((el) => [el.key, { ...el.fixed, ...el.target }]))

/** Changes one property; ignores properties the element does not let the player change. */
export function setValue(level, values, key, prop, value) {
  const element = level.elements.find((el) => el.key === key)
  if (!element?.controls.includes(prop)) return values
  return { ...values, [key]: { ...values[key], [prop]: value } }
}

/** Turns one element's values into a React inline style. */
export function toStyle(element) {
  const style = {}
  for (const [prop, value] of Object.entries(element)) {
    if (prop === 'columns') {
      if (element.display === 'grid') style.gridTemplateColumns = `repeat(${value}, minmax(0, 1fr))`
    } else if (PROPERTIES[prop]?.unit) {
      style[prop] = `${value}${PROPERTIES[prop].unit}`
    } else {
      style[prop] = value
    }
  }
  return style
}

/** CSS text value for one property, as a developer would write it. */
export function cssValue(prop, value) {
  if (prop === 'columns') return value === 1 ? '1fr' : `repeat(${value}, 1fr)`
  return PROPERTIES[prop]?.unit ? `${value}${PROPERTIES[prop].unit}` : String(value)
}

/**
 * The CSS rule for one element: { selector, lines: [{ prop, css, value, fixed, inactive }] }.
 * `inactive` marks a declaration that does nothing yet (grid columns on a block, gap on a block).
 */
export function cssRule(element, values) {
  const own = values[element.key]
  const props = [...Object.keys(element.fixed), ...element.controls]
  const lines = props.map((prop) => {
    const value = own[prop]
    const layout = own.display === 'flex' || own.display === 'grid'
    const inactive = (prop === 'columns' && own.display !== 'grid') || (prop === 'gap' && !layout)
      || (['justifyContent', 'alignItems'].includes(prop) && !layout)
    return { prop, css: PROPERTIES[prop].css, value: cssValue(prop, value), fixed: prop in element.fixed, inactive }
  })
  return { selector: element.selector, lines }
}

/**
 * Compares the player's values with the target, property by property.
 * Returns { solved, results: [{ key, prop, value, target, ok, hint }] } where hint is
 * 'more' or 'less' for a number that is off, and null otherwise.
 */
export function check(level, values) {
  const results = level.elements.flatMap((el) => el.controls.map((prop) => {
    const value = values[el.key][prop]
    const target = el.target[prop]
    const ok = value === target
    const hint = ok || typeof target !== 'number' || prop === 'columns' ? null : value < target ? 'more' : 'less'
    return { key: el.key, prop, value, target, ok, hint }
  }))
  return { solved: results.every((result) => result.ok), results }
}

/** 3 stars on the first check, 2 within three checks, otherwise 1. Every solved level is a win. */
export function starsFor(checks) {
  if (checks <= 1) return 3
  if (checks <= 3) return 2
  return 1
}

/** XP for a solved level: 5 plus 3 per star (same scale as the other arcade games). */
export const xpFor = (stars) => 5 + stars * 3

export const isUnlocked = (levelId, bestStars = {}) => levelId === 1 || (bestStars[levelId - 1] ?? 0) > 0
