// Logic Gate Builder rules, kept free of React so they can be tested on their own.
//
// A level is a board: input switches on the left, gate sockets in the middle,
// one output device on the right. The player puts gates in sockets and wires
// each input pin to a source (a switch or a gate's output). A pin may only take
// a signal from further left, so a circuit can never loop back on itself.
//
// Signals are 1, 0 or null (unknown: something on the way is not connected).

export const GATES = {
  AND: { inputs: 2, fn: (a, b) => a & b },
  OR: { inputs: 2, fn: (a, b) => a | b },
  NOT: { inputs: 1, fn: (a) => 1 - a },
  XOR: { inputs: 2, fn: (a, b) => a ^ b },
  NAND: { inputs: 2, fn: (a, b) => 1 - (a & b) },
}

export const GATE_TYPES = Object.keys(GATES)
export const OUTPUT = 'out'

/** Runs one gate. Any unknown input makes the output unknown. */
export function evalGate(type, inputs) {
  const gate = GATES[type]
  if (!gate) return null
  const used = inputs.slice(0, gate.inputs)
  if (used.length < gate.inputs || used.some((value) => value !== 0 && value !== 1)) return null
  return gate.fn(...used)
}

/**
 * Board coordinates are in a 640 × 360 SVG viewBox.
 *   inputs   switches: { id, y }
 *   sockets  { id, x, y, col }: a pin may connect to switches and to sockets with a smaller col
 *   device   'bulb' | 'door' | 'alarm', drawn at the right
 *   palette  the gates offered on this level
 *   target   the goal: given { [inputId]: 0 | 1 }, should the device be on (1) or off (0)?
 */
export const LEVELS = [
  {
    id: 1,
    inputs: [{ id: 'A', y: 120 }, { id: 'B', y: 240 }],
    sockets: [{ id: 'g1', x: 320, y: 180, col: 1 }],
    device: 'bulb',
    palette: ['AND', 'OR'],
    target: ({ A, B }) => A & B,
  },
  {
    id: 2,
    inputs: [{ id: 'A', y: 180 }],
    sockets: [{ id: 'g1', x: 320, y: 180, col: 1 }],
    device: 'door',
    palette: ['NOT', 'AND', 'OR'],
    target: ({ A }) => 1 - A,
  },
  {
    id: 3,
    inputs: [{ id: 'A', y: 120 }, { id: 'B', y: 240 }],
    sockets: [{ id: 'g1', x: 320, y: 180, col: 1 }],
    device: 'bulb',
    palette: ['AND', 'OR', 'NOT'],
    target: ({ A, B }) => A | B,
  },
  {
    id: 4,
    inputs: [{ id: 'A', y: 120 }, { id: 'B', y: 240 }],
    sockets: [{ id: 'g1', x: 320, y: 180, col: 1 }],
    device: 'bulb',
    palette: ['AND', 'OR', 'XOR', 'NAND'],
    target: ({ A, B }) => A ^ B,
  },
  {
    id: 5,
    inputs: [{ id: 'M', y: 70 }, { id: 'D', y: 180 }, { id: 'H', y: 290 }],
    sockets: [
      { id: 'g1', x: 270, y: 110, col: 1 },
      { id: 'g2', x: 270, y: 270, col: 1 },
      { id: 'g3', x: 440, y: 190, col: 2 },
    ],
    device: 'alarm',
    palette: GATE_TYPES,
    // the alarm rings when motion OR the door is triggered, AND Bulbuli is NOT home
    target: ({ M, D, H }) => (M | D) & (1 - H),
  },
]

export const getLevel = (id) => LEVELS.find((level) => level.id === id) ?? LEVELS[0]

/** Pin names: `${socketId}.${index}` for gate inputs, and `out.0` for the device. */
export const pinKey = (node, index) => `${node}.${index}`
export const OUTPUT_PIN = pinKey(OUTPUT, 0)

/** An empty board: no gates, no wires. */
export const emptyCircuit = (level) => ({
  gates: Object.fromEntries(level.sockets.map((socket) => [socket.id, null])),
  wires: {},
})

/** Every switch on (1) or off (0), all off to start. */
export const startInputs = (level) => Object.fromEntries(level.inputs.map((input) => [input.id, 0]))

/** The input pins on the board right now (depends on which gates are placed). */
export function pinsOf(level, circuit) {
  const pins = level.sockets.flatMap((socket) => {
    const type = circuit.gates[socket.id]
    if (!type) return []
    return Array.from({ length: GATES[type].inputs }, (_, index) => ({ key: pinKey(socket.id, index), node: socket.id, index }))
  })
  return [...pins, { key: OUTPUT_PIN, node: OUTPUT, index: 0 }]
}

/** The sources a pin may take its signal from: switches, plus gates further left. */
export function sourcesFor(level, pin) {
  const [node] = pin.split('.')
  const col = node === OUTPUT ? Infinity : level.sockets.find((socket) => socket.id === node)?.col
  if (col === undefined) return []
  return [
    ...level.inputs.map((input) => input.id),
    ...level.sockets.filter((socket) => socket.col < col).map((socket) => socket.id),
  ]
}

/** Puts a gate in a socket (or empties it with null). Wires on pins the new gate lacks are cut. */
export function placeGate(level, circuit, socketId, type) {
  if (!(socketId in circuit.gates) || (type !== null && !GATES[type])) return circuit
  const keep = type ? GATES[type].inputs : 0
  const wires = Object.fromEntries(Object.entries(circuit.wires).filter(([pin]) => {
    const [node, index] = pin.split('.')
    return node !== socketId || Number(index) < keep
  }))
  return { gates: { ...circuit.gates, [socketId]: type }, wires }
}

/** Wires a pin to a source. Returns the same circuit when that wire is not allowed. */
export function connect(level, circuit, pin, source) {
  if (!pinsOf(level, circuit).some((candidate) => candidate.key === pin)) return circuit
  if (!sourcesFor(level, pin).includes(source)) return circuit
  return { ...circuit, wires: { ...circuit.wires, [pin]: source } }
}

export function disconnect(circuit, pin) {
  if (!(pin in circuit.wires)) return circuit
  const wires = { ...circuit.wires }
  delete wires[pin]
  return { ...circuit, wires }
}

/** Every signal on the board for one setting of the switches: { [switchId | socketId | 'out']: 1 | 0 | null }. */
export function simulate(level, circuit, inputs) {
  const signals = { ...inputs }
  const read = (pin) => (pin in circuit.wires ? signals[circuit.wires[pin]] ?? null : null)
  const sockets = [...level.sockets].sort((a, b) => a.col - b.col)
  for (const socket of sockets) {
    const type = circuit.gates[socket.id]
    signals[socket.id] = type
      ? evalGate(type, Array.from({ length: GATES[type].inputs }, (_, index) => read(pinKey(socket.id, index))))
      : null
  }
  signals[OUTPUT] = read(OUTPUT_PIN)
  return signals
}

/** Every combination of the switches, in counting order (00, 01, 10, 11 …). */
export function inputRows(level) {
  const count = level.inputs.length
  return Array.from({ length: 2 ** count }, (_, row) => Object.fromEntries(
    level.inputs.map((input, index) => [input.id, (row >> (count - 1 - index)) & 1]),
  ))
}

/** The truth table: [{ inputs, goal, actual, ok }] for every row. */
export function truthTable(level, circuit) {
  return inputRows(level).map((inputs) => {
    const goal = level.target(inputs)
    const actual = simulate(level, circuit, inputs)[OUTPUT]
    return { inputs, goal, actual, ok: actual === goal }
  })
}

export const isSolved = (level, circuit) => truthTable(level, circuit).every((row) => row.ok)

/** 3 stars when the first power test passes, 2 within three tests, otherwise 1. */
export function starsFor(tests) {
  if (tests <= 1) return 3
  if (tests <= 3) return 2
  return 1
}

/** XP for a solved level: 5 plus 3 per star (same scale as the other arcade games). */
export const xpFor = (stars) => 5 + stars * 3

export const isUnlocked = (levelId, bestStars = {}) => levelId === 1 || (bestStars[levelId - 1] ?? 0) > 0
