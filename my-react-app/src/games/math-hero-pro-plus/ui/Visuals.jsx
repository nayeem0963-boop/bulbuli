/**
 * The pictures on a Math Hero Pro+ question card. Each `visual.kind` from questions.js has one drawing here:
 *
 *   balance   an equation as a balance scale (Level 4)
 *   tape      a ratio as bars of equal parts (Level 3)
 *   rect      a rectangle or square with labelled sides (Level 5)
 *   triangle  a triangle with its known angles and a "?" (general, right-angled or isosceles)
 *   triArea   a triangle with its base and dashed height
 *   quad      a quadrilateral with three known angles
 *   lshape    a rectangle with a corner cut out
 *
 * They're decoration for sighted players: the question text and equation always carry everything
 * needed, so the whole picture is hidden from screen readers (aria-hidden).
 */

const SVG_CLASS = 'h-[clamp(10rem,30cqh,20rem)] w-auto max-w-full'
const LABEL = 'fill-slate-100 font-hero text-[15px] font-extrabold'
const UNKNOWN = 'fill-mf-gold-ink font-hero text-[17px] font-extrabold'
const SHAPE = 'fill-sky-400/10 stroke-sky-300'

const angleText = (value, n) => (value === null ? '?' : `${n(value)}°`)

/** A point `dist` px from vertex `p` towards point `toward`. */
function inward(p, toward, dist) {
  const dx = toward[0] - p[0]
  const dy = toward[1] - p[1]
  const len = Math.hypot(dx, dy) || 1
  return [p[0] + (dx / len) * dist, p[1] + (dy / len) * dist]
}
const centroid = (points) => [
  points.reduce((s, p) => s + p[0], 0) / points.length,
  points.reduce((s, p) => s + p[1], 0) / points.length,
]

/** The angle (in degrees) a polygon's corner `i` is drawn with. */
function drawnAngle(points, i) {
  const p = points[i]
  const [a, b] = [points[(i + points.length - 1) % points.length], points[(i + 1) % points.length]]
  const u = [a[0] - p[0], a[1] - p[1]]
  const v = [b[0] - p[0], b[1] - p[1]]
  return (Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v))) * 180) / Math.PI
}

/**
 * Angle labels inside each corner, along the corner's bisector; the unknown one gets a soft gold halo.
 * The sharper the corner, the further in the label sits, so it always clears both edges.
 */
function AngleLabels({ points, angles, n }) {
  const c = centroid(points)
  return points.map((p, i) => {
    const half = (drawnAngle(points, i) * Math.PI) / 360
    const [x, y] = inward(p, c, Math.min(90, Math.max(40, 19 / Math.sin(half))))
    const value = angles[i]
    return (
      <g key={i}>
        {value === null && <circle cx={x} cy={y} r="14" className="fill-amber-300/15 stroke-amber-300/60" strokeWidth="1.5" />}
        <text x={x} y={y + 5} textAnchor="middle" className={value === null ? UNKNOWN : LABEL}>{angleText(value, n)}</text>
      </g>
    )
  })
}

/** A short dash across the middle of side a–b: the "these sides are equal" mark. */
function tickMark(a, b) {
  const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const len = Math.hypot(b[0] - a[0], b[1] - a[1])
  const [px, py] = [(-(b[1] - a[1]) / len) * 8, ((b[0] - a[0]) / len) * 8]
  return `M${mx - px} ${my - py} L${mx + px} ${my + py}`
}

const pointsAttr = (points) => points.map((p) => p.join(',')).join(' ')

// ---------- Level 4 ----------

function Balance({ left, right, n }) {
  const pan = (cx, label) => (
    <g>
      <path d={`M${cx} 46 L${cx - 40} 92 M${cx} 46 L${cx + 40} 92`} className="stroke-slate-500" strokeWidth="2" />
      <path d={`M${cx - 54} 92 Q${cx} 120 ${cx + 54} 92 Z`} className="fill-slate-700 stroke-slate-500" strokeWidth="2" />
      <rect x={cx - 52} y="60" width="104" height="30" rx="9" className="fill-slate-900 stroke-amber-300/70" strokeWidth="2" />
      <text x={cx} y="81" textAnchor="middle" className="fill-amber-100 font-hero text-[18px] font-extrabold">{n(label)}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 300 160" className={SVG_CLASS}>
      <path d="M150 46 L132 148 H168 Z" className="fill-slate-700 stroke-slate-500" strokeWidth="2" strokeLinejoin="round" />
      <rect x="116" y="146" width="68" height="8" rx="4" className="fill-slate-600" />
      <path d="M62 46 H238" className="stroke-mf-star" strokeWidth="5" strokeLinecap="round" />
      <circle cx="150" cy="46" r="7" className="fill-mf-star" />
      {pan(62, left)}
      {pan(238, right)}
      <text x="150" y="30" textAnchor="middle" className="fill-emerald-300 font-hero text-[22px] font-extrabold">=</text>
    </svg>
  )
}

// ---------- Level 3 ----------

const TONES = {
  sky: { box: 'border-sky-300 bg-sky-400/25', text: 'text-sky-200' },
  amber: { box: 'border-amber-300 bg-amber-300/25', text: 'text-amber-200' },
  rose: { box: 'border-rose-300 bg-rose-400/25', text: 'text-rose-200' },
}

function Tape({ parts, labels, tones = ['sky', 'amber'], language, n }) {
  return (
    <div className="grid w-full max-w-md grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2.5">
      {parts.map((count, row) => {
        const tone = TONES[tones[row]] ?? TONES.sky
        return [
          <span key={`l${row}`} className={`text-right text-sm font-extrabold tracking-wide uppercase ${tone.text}`}>
            {labels[row][language] ?? labels[row].en} <span className="text-slate-400">({n(count)})</span>
          </span>,
          <span key={`b${row}`} className="flex flex-wrap gap-1.5">
            {Array.from({ length: count }, (_, i) => (
              <span key={i} className={`grid size-9 place-items-center rounded-lg border-2 font-hero text-base font-extrabold text-white xl:size-11 ${tone.box}`}>?</span>
            ))}
          </span>,
        ]
      })}
    </div>
  )
}

// ---------- Level 5 ----------

function Rect({ w, h, unit, area, perimeter, square, n }) {
  const [x, y, W, H] = square ? [80, 18, 116, 116] : [44, 22, 190, 106]
  const label = (value) => (value === '?' ? '?' : `${n(value)} ${unit}`)
  const centre = area ?? perimeter
  return (
    <svg viewBox="0 0 290 170" className={SVG_CLASS}>
      <rect x={x} y={y} width={W} height={H} className={SHAPE} strokeWidth="3" />
      {/* little right-angle marks in two corners */}
      <path d={`M${x} ${y + 14} h14 v-14`} className="fill-none stroke-sky-300/70" strokeWidth="1.5" />
      <path d={`M${x + W - 14} ${y + H} v-14 h14`} className="fill-none stroke-sky-300/70" strokeWidth="1.5" />
      <text x={x + W / 2} y={y + H + 24} textAnchor="middle" className={w === '?' ? UNKNOWN : LABEL}>{label(w)}</text>
      <text x={x + W + 10} y={y + H / 2 + 5} textAnchor="start" className={h === '?' ? UNKNOWN : LABEL}>{label(h)}</text>
      {centre && <text x={x + W / 2} y={y + H / 2 + 6} textAnchor="middle" className="fill-sky-200 font-hero text-[16px] font-extrabold">{n(centre)}</text>}
    </svg>
  )
}

function Triangle({ angles: given, right = false, isosceles = false, n }) {
  let points
  let angles = given
  if (right) points = [[48, 146], [250, 146], [48, 22]]
  else if (isosceles) {
    // drawn with the real apex angle (kept within 60°–110° so the labels still fit): a wide apex
    // looks wide, a sharp one looks sharp
    const half = (Math.min(110, Math.max(60, given[0])) * Math.PI) / 360
    const [halfBase, height] = Math.tan(half) * 128 > 106 ? [106, 106 / Math.tan(half)] : [128 * Math.tan(half), 128]
    points = [[150, 146 - height], [150 - halfBase, 146], [150 + halfBase, 146]]
  }
  else {
    // An obtuse triangle gets an obtuse picture, with the wide angle (known or not) drawn at the wide corner.
    const known = given.filter((a) => a !== null)
    const actual = given.map((a) => a ?? 180 - known.reduce((sum, k) => sum + k, 0))
    const wide = actual.findIndex((a) => a > 90)
    if (wide === -1) points = [[36, 146], [252, 146], [176, 22]]
    else {
      points = [[20, 150], [176, 150], [270, 34]]
      const rest = given.filter((_, i) => i !== wide)
      angles = [rest[0], given[wide], rest[1]]
    }
  }
  return (
    <svg viewBox="0 0 290 166" className={SVG_CLASS}>
      <polygon points={pointsAttr(points)} className={SHAPE} strokeWidth="3" strokeLinejoin="round" />
      {right && <path d="M48 128 h18 v18" className="fill-none stroke-mf-star" strokeWidth="2.5" />}
      {isosceles && (
        <g className="stroke-mf-star" strokeWidth="3" strokeLinecap="round">
          {[1, 2].map((i) => <path key={i} d={tickMark(points[0], points[i])} />)}
        </g>
      )}
      <AngleLabels points={points} angles={angles} n={n} />
    </svg>
  )
}

function TriArea({ base, height, unit, n }) {
  const points = [[34, 140], [250, 140], [150, 20]]
  return (
    <svg viewBox="0 0 300 172" className={SVG_CLASS}>
      <polygon points={pointsAttr(points)} className={SHAPE} strokeWidth="3" strokeLinejoin="round" />
      <path d="M150 20 V140" className="stroke-mf-star" strokeWidth="2.5" strokeDasharray="6 5" />
      <path d="M150 126 h14 v14" className="fill-none stroke-mf-star" strokeWidth="2" />
      <text x="142" y="88" textAnchor="end" className="fill-amber-200 font-hero text-[15px] font-extrabold">{`${n(height)} ${unit}`}</text>
      <text x="142" y="164" textAnchor="middle" className={LABEL}>{`${n(base)} ${unit}`}</text>
    </svg>
  )
}

function Quad({ angles, n }) {
  const points = [[34, 140], [252, 150], [228, 30], [82, 18]]
  return (
    <svg viewBox="0 0 290 168" className={SVG_CLASS}>
      <polygon points={pointsAttr(points)} className={SHAPE} strokeWidth="3" strokeLinejoin="round" />
      <AngleLabels points={points} angles={angles} n={n} />
    </svg>
  )
}

function LShape({ W, H, w, h, unit, n }) {
  // stretched to fill the box (the picture is marked "not drawn to scale"), so a long, flat shape
  // still has room for every label
  const [x0, y0] = [62, 28]
  const [sx, sy] = [176 / W, 124 / H]
  const [right, bottom] = [x0 + W * sx, y0 + H * sy]
  const notchX = x0 + (W - w) * sx
  const notchY = y0 + h * sy
  const path = `M${x0} ${y0} H${notchX} V${notchY} H${right} V${bottom} H${x0} Z`
  const label = (v) => `${n(v)} ${unit}`
  return (
    <svg viewBox="0 0 300 186" className={SVG_CLASS}>
      <rect x={notchX} y={y0} width={w * sx} height={h * sy} className="fill-none stroke-slate-500" strokeWidth="2" strokeDasharray="5 5" />
      <path d={path} className={SHAPE} strokeWidth="3" strokeLinejoin="round" />
      <text x={(x0 + right) / 2} y={bottom + 22} textAnchor="middle" className={LABEL}>{label(W)}</text>
      <text x={x0 - 8} y={(y0 + bottom) / 2 + 5} textAnchor="end" className={LABEL}>{label(H)}</text>
      <text x={notchX + (w * sx) / 2} y={y0 - 8} textAnchor="middle" className="fill-slate-300 font-hero text-[14px] font-bold">{label(w)}</text>
      <text x={right + 6} y={y0 + (h * sy) / 2 + 5} textAnchor="start" className="fill-slate-300 font-hero text-[14px] font-bold">{label(h)}</text>
    </svg>
  )
}

const GEOMETRY = new Set(['rect', 'triangle', 'triArea', 'quad', 'lshape'])

export default function Visual({ visual, n, language, text }) {
  if (!visual) return null
  const body = {
    balance: () => <Balance {...visual} n={n} />,
    tape: () => <Tape {...visual} language={language} n={n} />,
    rect: () => <Rect {...visual} n={n} />,
    triangle: () => <Triangle {...visual} n={n} />,
    triArea: () => <TriArea {...visual} n={n} />,
    quad: () => <Quad {...visual} n={n} />,
    lshape: () => <LShape {...visual} n={n} />,
  }[visual.kind]
  if (!body) return null
  return (
    <div className="flex w-full flex-col items-center gap-1 py-2" aria-hidden="true">
      {body()}
      {GEOMETRY.has(visual.kind) && <span className="text-xs text-slate-500">{text.notToScale}</span>}
    </div>
  )
}
