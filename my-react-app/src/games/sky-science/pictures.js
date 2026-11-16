/**
 * Picture answers for ages 4–6 (no reading needed). Original, simple SVG drawings, one per key
 * used in the content. Plain JS (createElement) so Node tests can check every key exists.
 *
 *   <Picture name="rainbow" label="A rainbow" />
 */
import { createElement as h } from 'react'

const C = {
  sun: '#ffc93c', sunEdge: '#f39c12', sky: '#8fd0f7', skyDeep: '#3fa3ec', night: '#1b2a49', cloud: '#ffffff', cloudEdge: '#a8bdd4',
  grey: '#9aa7b8', rain: '#3fa3ec', ink: '#1b2a49', leaf: '#2e9e6b', trunk: '#8a5a2b', ground: '#c9e7b8', shadow: 'rgba(27,42,73,0.55)', snow: '#eef7ff',
}
const R = ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#3498db', '#5b4bd1', '#8e44ad']

const sun = (cx = 50, cy = 50, r = 16, rays = true) => h('g', { key: `sun${cx}${cy}` },
  rays ? Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4
    return h('line', { key: i, x1: cx + Math.cos(a) * (r + 5), y1: cy + Math.sin(a) * (r + 5), x2: cx + Math.cos(a) * (r + 13), y2: cy + Math.sin(a) * (r + 13), stroke: C.sunEdge, strokeWidth: 4, strokeLinecap: 'round' })
  }) : null,
  h('circle', { cx, cy, r, fill: C.sun, stroke: C.sunEdge, strokeWidth: 3 }))
const cloud = (x = 50, y = 50, s = 1, fill = C.cloud) => h('g', { key: `cl${x}${y}`, transform: `translate(${x} ${y}) scale(${s})` },
  h('path', { d: 'M-30 10 a14 14 0 0 1 4-26 a18 18 0 0 1 33-6 a14 14 0 0 1 23 14 a12 12 0 0 1 0 18 z', fill, stroke: C.cloudEdge, strokeWidth: 3 }))
const drops = (xs, y, color = C.rain) => xs.map((x, i) => h('path', { key: `d${y}-${i}-${x}`, d: `M${x} ${y} q-5 8 0 12 q5 -4 0 -12 z`, fill: color }))
const ground = () => h('rect', { key: 'g', x: 0, y: 78, width: 100, height: 22, fill: C.ground })
const stick = (x, y) => h('g', { key: `p${x}` },
  h('circle', { cx: x, cy: y - 22, r: 6, fill: C.ink }),
  h('line', { x1: x, y1: y - 16, x2: x, y2: y - 2, stroke: C.ink, strokeWidth: 4, strokeLinecap: 'round' }),
  h('line', { x1: x, y1: y - 2, x2: x - 5, y2: y + 8, stroke: C.ink, strokeWidth: 4, strokeLinecap: 'round' }),
  h('line', { x1: x, y1: y - 2, x2: x + 5, y2: y + 8, stroke: C.ink, strokeWidth: 4, strokeLinecap: 'round' }))
const tree = (x, y, s = 1) => h('g', { key: `t${x}`, transform: `translate(${x} ${y}) scale(${s})` },
  h('rect', { x: -4, y: -6, width: 8, height: 20, fill: C.trunk }),
  h('circle', { cx: 0, cy: -16, r: 14, fill: C.leaf }))
const star = (x, y, r = 4) => h('path', { key: `s${x}${y}`, d: `M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} z`, fill: '#fff6c9' })
const bg = (fill) => h('rect', { key: 'bg', x: 0, y: 0, width: 100, height: 100, rx: 14, fill })
const rainbowArcs = (cx = 50, cy = 82, r0 = 40) => R.map((c, i) => h('path', { key: `r${i}`, d: `M${cx - (r0 - i * 4)} ${cy} A${r0 - i * 4} ${r0 - i * 4} 0 0 1 ${cx + (r0 - i * 4)} ${cy}`, fill: 'none', stroke: c, strokeWidth: 4.5 }))
const bolt = (x = 50, y = 30, s = 1, fill = '#ffd23f') => h('path', { key: `b${x}`, transform: `translate(${x} ${y}) scale(${s})`, d: 'M-4 -18 L10 -18 L2 -2 L12 -2 L-8 26 L-2 6 L-12 6 z', fill, stroke: '#c48a00', strokeWidth: 2 })
const snowflakeShape = (x = 50, y = 50, r = 26) => h('g', { key: `sf${x}`, stroke: '#3fa3ec', strokeWidth: 4, strokeLinecap: 'round' },
  [0, 60, 120].map((deg) => {
    const a = (deg * Math.PI) / 180
    return h('line', { key: deg, x1: x - Math.cos(a) * r, y1: y - Math.sin(a) * r, x2: x + Math.cos(a) * r, y2: y + Math.sin(a) * r })
  }),
  [0, 60, 120, 180, 240, 300].map((deg) => {
    const a = (deg * Math.PI) / 180
    const mx = x + Math.cos(a) * r * 0.62
    const my = y + Math.sin(a) * r * 0.62
    return h('g', { key: `k${deg}` },
      h('line', { x1: mx, y1: my, x2: mx + Math.cos(a + 0.7) * 8, y2: my + Math.sin(a + 0.7) * 8 }),
      h('line', { x1: mx, y1: my, x2: mx + Math.cos(a - 0.7) * 8, y2: my + Math.sin(a - 0.7) * 8 }))
  }))
const shadowScene = (shadowDx, inSky = false) => [bg(C.sky), sun(shadowDx > 0 ? 18 : 82, 20, 9), ground(),
  inSky
    ? h('ellipse', { key: 'sh', cx: 50, cy: 30, rx: 16, ry: 5, fill: C.shadow })
    : h('ellipse', { key: 'sh', cx: 50 + shadowDx, cy: 85, rx: 18, ry: 4, fill: C.shadow }),
  stick(50, 74)]
const treeShadowScene = (dir) => [bg(C.sky), sun(16, 20, 9), ground(),
  dir === 'sky' ? h('ellipse', { key: 'sh', cx: 60, cy: 24, rx: 18, ry: 5, fill: C.shadow }) : h('ellipse', { key: 'sh', cx: dir === 'away' ? 72 : 28, cy: 84, rx: 20, ry: 4, fill: C.shadow }),
  tree(50, 70, 1.2)]

const DRAW = {
  sun: () => [bg(C.sky), sun(50, 50, 18)],
  cloud: () => [bg(C.sky), cloud(46, 56, 1.2)],
  rain: () => [bg('#cfd8e3'), cloud(48, 40, 1.1, '#e3e9f0'), ...drops([28, 44, 60, 76], 62), ...drops([36, 52, 68], 78)],
  umbrella: () => [bg(C.sky), h('path', { key: 'u', d: 'M14 52 A36 36 0 0 1 86 52 Q77 46 68 52 Q59 46 50 52 Q41 46 32 52 Q23 46 14 52 z', fill: '#d42a37', stroke: C.ink, strokeWidth: 3 }), h('path', { key: 'h', d: 'M50 52 L50 82 Q50 90 42 88', fill: 'none', stroke: C.ink, strokeWidth: 4, strokeLinecap: 'round' })],
  kite: () => [bg(C.sky), h('path', { key: 'k', d: 'M60 14 L80 36 L60 66 L40 36 z', fill: '#8a4fd3', stroke: C.ink, strokeWidth: 3 }), h('path', { key: 's', d: 'M60 66 Q50 76 56 84 Q62 90 52 96', fill: 'none', stroke: C.ink, strokeWidth: 2.5 }), h('path', { key: 'w1', d: 'M8 30 Q20 24 30 30', fill: 'none', stroke: '#fff', strokeWidth: 4, strokeLinecap: 'round' }), h('path', { key: 'w2', d: 'M6 46 Q18 40 28 46', fill: 'none', stroke: '#fff', strokeWidth: 4, strokeLinecap: 'round' })],
  wind: () => [bg(C.sky), ...[28, 48, 68].map((y, i) => h('path', { key: i, d: `M10 ${y} Q40 ${y - 10} 64 ${y} Q80 ${y + 6} 86 ${y - 6}`, fill: 'none', stroke: '#fff', strokeWidth: 6, strokeLinecap: 'round' })), tree(84, 88, 0.7)],
  snowman: () => [bg('#dceefc'), h('circle', { key: 'b', cx: 50, cy: 70, r: 20, fill: C.snow, stroke: C.cloudEdge, strokeWidth: 3 }), h('circle', { key: 'h', cx: 50, cy: 38, r: 14, fill: C.snow, stroke: C.cloudEdge, strokeWidth: 3 }), h('circle', { key: 'e1', cx: 45, cy: 35, r: 2, fill: C.ink }), h('circle', { key: 'e2', cx: 55, cy: 35, r: 2, fill: C.ink }), h('path', { key: 'n', d: 'M50 40 L62 43 L50 45 z', fill: '#f39c12' })],
  ice: () => [bg('#dceefc'), h('path', { key: 'c1', d: 'M24 40 L52 30 L76 42 L76 70 L48 80 L24 68 z', fill: '#bfe6ff', stroke: '#3fa3ec', strokeWidth: 3 }), h('path', { key: 'c2', d: 'M24 40 L48 52 L76 42 M48 52 L48 80', fill: 'none', stroke: '#3fa3ec', strokeWidth: 3 })],
  'sky-blue': () => [bg(C.skyDeep), sun(74, 26, 11), cloud(36, 64, 0.6)],
  'sky-green': () => [bg('#5fbf6a'), sun(74, 26, 11)],
  'sky-night': () => [bg(C.night), star(20, 22), star(44, 14, 3), star(70, 30), star(30, 56, 3), star(80, 64, 4), h('circle', { key: 'm', cx: 66, cy: 70, r: 10, fill: '#fff3c4' })],
  'sky-rain': () => [bg('#8f9aa8'), cloud(36, 36, 0.8, '#d1d8e0'), cloud(68, 46, 0.8, '#c4ccd6'), ...drops([24, 40, 56, 72], 66, '#e8f2ff')],
  day: () => [bg(C.sky), sun(72, 28, 12), ground(), tree(28, 74, 0.9)],
  night: () => [bg(C.night), star(16, 18), star(40, 30, 3), star(84, 20), star(60, 12, 3), h('circle', { key: 'm', cx: 72, cy: 44, r: 10, fill: '#fff3c4' }), h('rect', { key: 'g', x: 0, y: 78, width: 100, height: 22, fill: '#22324f' })],
  sleep: () => [bg('#ece0fb'), h('rect', { key: 'bed', x: 12, y: 58, width: 76, height: 22, rx: 6, fill: '#8a4fd3' }), h('circle', { key: 'head', cx: 28, cy: 52, r: 9, fill: '#f5c9a0' }), h('rect', { key: 'blanket', x: 36, y: 46, width: 50, height: 16, rx: 6, fill: '#3fa3ec' }), h('text', { key: 'z', x: 44, y: 34, fontSize: 18, fontWeight: 800, fill: C.ink }, 'Z z')],
  rainbow: () => [bg(C.sky), ...rainbowArcs(), cloud(18, 84, 0.45), cloud(82, 84, 0.45)],
  'shadow-away': () => shadowScene(22),
  'shadow-toward': () => shadowScene(-22),
  'no-shadow': () => [bg(C.sky), sun(18, 20, 9), ground(), stick(50, 74)],
  'tree-shadow-away': () => treeShadowScene('away'),
  'tree-shadow-toward': () => treeShadowScene('toward'),
  'tree-shadow-sky': () => treeShadowScene('sky'),
  stars: () => [bg(C.night), star(20, 30, 6), star(50, 18, 5), star(78, 36, 6), star(34, 64, 5), star(70, 74, 6)],
  'sun-rain': () => [bg(C.sky), sun(28, 28, 12), cloud(66, 40, 0.8), ...drops([56, 70, 84], 60), ...drops([62, 76], 76)],
  snowflake: () => [bg('#dceefc'), snowflakeShape()],
  moon: () => [bg(C.night), h('path', { key: 'm', d: 'M60 20 A30 30 0 1 0 60 80 A22 22 0 1 1 60 20 z', fill: '#fff3c4' })],
  lightning: () => [bg('#5d6b80'), cloud(50, 32, 1, '#b8c2cf'), bolt(50, 62, 1)],
  thunder: () => [bg('#5d6b80'), cloud(40, 34, 0.9, '#b8c2cf'), bolt(36, 64, 0.8), ...[0, 1, 2].map((i) => h('path', { key: `w${i}`, d: `M${64 + i * 8} ${46} Q${72 + i * 8} ${60} ${64 + i * 8} ${74}`, fill: 'none', stroke: '#fff', strokeWidth: 4, strokeLinecap: 'round' }))],
  tree: () => [bg(C.sky), ground(), tree(50, 70, 1.6)],
  drops: () => [bg(C.sky), ...drops([30, 50, 70], 30), ...drops([40, 60], 52), ...drops([30, 50, 70], 72)],
  cotton: () => [bg('#f2f8fd'), ...[[38, 50], [56, 44], [62, 60], [44, 64]].map(([x, y], i) => h('circle', { key: i, cx: x, cy: y, r: 14, fill: '#fff', stroke: C.cloudEdge, strokeWidth: 2 })), h('line', { key: 'st', x1: 50, y1: 70, x2: 50, y2: 92, stroke: C.trunk, strokeWidth: 4 })],
  smoke: () => [bg('#e9e3da'), h('rect', { key: 'ch', x: 40, y: 64, width: 20, height: 28, fill: '#a0522d' }), ...[[50, 52, 9], [56, 38, 11], [48, 22, 12]].map(([x, y, r], i) => h('circle', { key: i, cx: x, cy: y, r, fill: '#7f8590', opacity: 0.85 }))],
  leaf: () => [bg('#fff1c2'), h('path', { key: 'l', d: 'M24 76 Q24 30 76 24 Q74 74 24 76 z', fill: '#e67e22', stroke: '#a04000', strokeWidth: 3 }), h('path', { key: 'v', d: 'M24 76 L70 30', stroke: '#a04000', strokeWidth: 3 })],
  sand: () => [bg('#fff1c2'), h('path', { key: 's', d: 'M0 70 Q25 50 50 66 Q75 82 100 62 L100 100 L0 100 z', fill: '#e8c27a' }), ...[[20, 80], [40, 88], [60, 84], [80, 90], [30, 94]].map(([x, y], i) => h('circle', { key: i, cx: x, cy: y, r: 2, fill: '#b8893d' }))],
  bird: () => [bg(C.sky), h('ellipse', { key: 'b', cx: 50, cy: 54, rx: 22, ry: 16, fill: '#d42a37' }), h('circle', { key: 'h', cx: 68, cy: 42, r: 10, fill: '#d42a37' }), h('path', { key: 'beak', d: 'M77 42 L88 45 L77 48 z', fill: '#f39c12' }), h('circle', { key: 'e', cx: 70, cy: 40, r: 2, fill: C.ink }), h('path', { key: 'n1', d: 'M20 24 q4 -8 8 0', fill: 'none', stroke: C.ink, strokeWidth: 3 }), h('path', { key: 'n2', d: 'M30 16 q4 -8 8 0', fill: 'none', stroke: C.ink, strokeWidth: 3 })],
  'no-sound': () => [bg('#f2f8fd'), h('path', { key: 'sp', d: 'M22 40 L38 40 L56 24 L56 76 L38 60 L22 60 z', fill: C.ink }), h('line', { key: 'x1', x1: 66, y1: 38, x2: 86, y2: 62, stroke: '#d42a37', strokeWidth: 6, strokeLinecap: 'round' }), h('line', { key: 'x2', x1: 86, y1: 38, x2: 66, y2: 62, stroke: '#d42a37', strokeWidth: 6, strokeLinecap: 'round' })],
  fog: () => [bg('#cfd6de'), tree(30, 76, 0.9), tree(70, 78, 0.8), ...[40, 56, 70].map((y, i) => h('rect', { key: `f${i}`, x: 0, y, width: 100, height: 10, rx: 5, fill: '#ffffff', opacity: 0.75 }))],
}

export const PICTURE_KEYS = Object.freeze(Object.keys(DRAW))

/** One picture. `label` is the spoken/accessible name (the option text). */
export function Picture({ name, label, size = 96 }) {
  const draw = DRAW[name]
  return h('svg', { viewBox: '0 0 100 100', width: size, height: size, role: 'img', 'aria-label': label, className: 'ssx-pic' },
    h('title', null, label),
    ...(draw ? draw() : [bg('#f2f8fd'), h('text', { key: 't', x: 50, y: 56, textAnchor: 'middle', fontSize: 12 }, '?')]))
}
