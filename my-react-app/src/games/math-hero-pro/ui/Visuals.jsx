/**
 * The little pictures on a question card. Each `visual.kind` from questions.js has one drawing here.
 * They're decoration for sighted players: the question text always says everything needed, so the
 * pictures are hidden from screen readers (aria-hidden) except for a short label on fractions.
 */

const Dot = ({ className = 'bg-sky-400', size = 'size-5 @xl:size-6' }) => (
  <span className={`${size} rounded-full ${className} shadow-[0_0_10px_-1px_currentColor]`} />
)

function DotGroup({ count, className }) {
  return (
    <div className="grid grid-cols-5 gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-2.5 @xl:gap-2">
      {Array.from({ length: count }, (_, i) => <Dot key={i} className={className} />)}
    </div>
  )
}

const Sign = ({ children }) => (
  <span className="font-hero text-3xl font-extrabold text-mf-gold-ink drop-shadow-[0_0_8px_rgba(252,211,77,0.6)]">{children}</span>
)

function Dots({ groups: [a, b] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <DotGroup count={a} className="bg-sky-400 text-sky-400" />
      <Sign>+</Sign>
      <DotGroup count={b} className="bg-amber-300 text-amber-300" />
    </div>
  )
}

function TakeAway({ total, remove }) {
  return (
    <div className="grid grid-cols-5 gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
      {Array.from({ length: total }, (_, i) => {
        const gone = i >= total - remove
        return (
          <span key={i} className="relative grid place-items-center">
            <Dot className={gone ? 'bg-slate-600 text-transparent' : 'bg-emerald-400 text-emerald-400'} />
            {gone && <span className="absolute h-0.5 w-7 rotate-45 rounded bg-rose-400" />}
          </span>
        )
      })}
    </div>
  )
}

function Bond({ total, part, n }) {
  const circle = (x, y, label, tone) => (
    <g>
      <circle cx={x} cy={y} r="24" className={tone} strokeWidth="3" />
      <text x={x} y={y + 8} textAnchor="middle" className="fill-white font-hero text-[22px] font-extrabold">{label}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 220 130" className="h-32 w-auto @xl:h-36">
      <path d="M110 40 L55 98 M110 40 L165 98" className="stroke-slate-500" strokeWidth="3" strokeLinecap="round" />
      {circle(110, 30, n(total), 'fill-amber-400/20 stroke-amber-300')}
      {circle(55, 100, n(part), 'fill-sky-400/20 stroke-sky-400')}
      {circle(165, 100, '?', 'fill-fuchsia-400/20 stroke-fuchsia-400')}
    </svg>
  )
}

function DotArray({ rows, cols }) {
  const big = rows * cols <= 36
  return (
    <div
      className="grid w-fit gap-1.5 rounded-2xl border border-violet-400/25 bg-violet-500/10 p-3"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: rows * cols }, (_, i) => (
        <Dot key={i} className="bg-violet-300 text-violet-400" size={big ? 'size-4 @xl:size-5' : 'size-2.5 @xl:size-3.5'} />
      ))}
    </div>
  )
}

function Share({ total, groups }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex max-w-xs flex-wrap justify-center gap-1.5">
        {Array.from({ length: total }, (_, i) => <Dot key={i} className="bg-amber-300 text-amber-300" size="size-3.5 @xl:size-4" />)}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: groups }, (_, i) => (
          <span key={i} className="grid size-11 place-items-center rounded-full border-2 border-emerald-400/60 bg-emerald-400/10 text-2xl">
            🙂
          </span>
        ))}
      </div>
    </div>
  )
}

// ---------- fractions ----------

function wedge(i, parts, r = 56, c = 60) {
  if (parts === 1) return `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c - 0.01} ${c - r} Z`
  const a0 = (i / parts) * Math.PI * 2 - Math.PI / 2
  const a1 = ((i + 1) / parts) * Math.PI * 2 - Math.PI / 2
  const large = a1 - a0 > Math.PI ? 1 : 0
  const p = (a) => `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`
  return `M ${c} ${c} L ${p(a0)} A ${r} ${r} 0 ${large} 1 ${p(a1)} Z`
}

const SHADED = 'fill-rose-400 stroke-mf-panel'
const EMPTY = 'fill-slate-700/70 stroke-mf-panel'

export function FractionShape({ shape, parts, shaded, small = false }) {
  if (shape === 'pie') {
    return (
      <svg viewBox="0 0 120 120" className={small ? 'size-16' : 'size-36 @xl:size-40 drop-shadow-[0_0_18px_rgba(251,113,133,0.35)]'}>
        {Array.from({ length: parts }, (_, i) => (
          <path key={i} d={wedge(i, parts)} className={i < shaded ? SHADED : EMPTY} strokeWidth="3" strokeLinejoin="round" />
        ))}
      </svg>
    )
  }
  const cols = shape === 'grid' ? ({ 4: 2, 6: 3, 8: 4 }[parts] ?? parts) : parts
  const rows = parts / cols
  const w = shape === 'grid' ? cols * 44 : 280
  const h = shape === 'grid' ? rows * 44 : 64
  const cw = w / cols
  const ch = h / rows
  return (
    <svg
      viewBox={`-3 -3 ${w + 6} ${h + 6}`}
      className={small ? 'h-6 w-full' : shape === 'grid' ? 'h-32 w-auto @xl:h-36' : 'h-16 w-full max-w-sm @xl:h-20'}
      preserveAspectRatio={small ? 'none' : 'xMidYMid meet'}
    >
      {Array.from({ length: parts }, (_, i) => (
        <rect
          key={i}
          x={(i % cols) * cw}
          y={Math.floor(i / cols) * ch}
          width={cw}
          height={ch}
          rx={shape === 'grid' ? 6 : 4}
          className={i < shaded ? SHADED : EMPTY}
          strokeWidth="3"
        />
      ))}
    </svg>
  )
}

/** A fraction written the school way: top number over a line over the bottom number. */
export function FractionText({ value, n, className = '' }) {
  const [top, bottom] = value.split('/')
  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`}>
      <span>{n(top)}</span>
      <span className="my-1 h-[3px] w-[1.4em] rounded-full bg-current" />
      <span>{n(bottom)}</span>
    </span>
  )
}

function Compare({ fractions, n }) {
  return (
    <div className="grid w-full max-w-md gap-2.5">
      {fractions.map(([top, d]) => (
        <div key={d} className="grid grid-cols-[3.25rem_1fr] items-center gap-3">
          <FractionText value={`${top}/${d}`} n={n} className="font-hero text-lg font-extrabold text-rose-200" />
          <FractionShape shape="bar" parts={d} shaded={top} small />
        </div>
      ))}
    </div>
  )
}

function Pattern({ items, n }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {[...items, '?'].map((item, i) => (
        <span
          key={i}
          className={`grid min-w-14 place-items-center rounded-2xl border-2 px-3 py-2 font-hero text-2xl font-extrabold @xl:text-3xl ${
            item === '?'
              ? 'border-amber-300 bg-amber-300/15 text-amber-200'
              : 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100'
          }`}
        >
          {item === '?' ? '?' : n(item)}
        </span>
      ))}
    </div>
  )
}

export default function Visual({ visual, n }) {
  if (!visual) return null
  const body = {
    dots: () => <Dots {...visual} />,
    takeaway: () => <TakeAway {...visual} />,
    bond: () => <Bond {...visual} n={n} />,
    array: () => <DotArray {...visual} />,
    share: () => <Share {...visual} />,
    fraction: () => <FractionShape {...visual} />,
    compare: () => <Compare {...visual} n={n} />,
    pattern: () => <Pattern {...visual} n={n} />,
  }[visual.kind]
  if (!body) return null
  return (
    <div className="flex justify-center py-2" aria-hidden="true">
      {body()}
    </div>
  )
}
