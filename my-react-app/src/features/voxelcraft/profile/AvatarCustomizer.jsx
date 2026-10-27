import { Award, Check, Gem, LoaderCircle, Lock, Medal, Paintbrush, ShoppingBag } from 'lucide-react'
import { Suspense, lazy, useEffect, useId, useMemo, useState } from 'react'
import { playSfx } from '../audio/sfx.js'
import { useGameActions } from '../state/GameStateProvider.jsx'
import { COSMETICS, PALETTES, SLOTS, effectiveLook, isHex, isUnlocked, unlockLabel } from './cosmetics.js'
import { CARD, CARD_PAD, GemBadge, H2, StatusTag } from './ui.jsx'

// three/R3F only load when the profile is opened.
const AvatarPreview = lazy(() => import('./AvatarPreview.jsx'))

function PreviewLoading() {
  return (
    <div className="grid h-full place-items-center text-sm text-slate-400">
      <span className="flex items-center gap-2"><LoaderCircle className="size-4 animate-spin text-indigo-400" aria-hidden="true" /> Loading preview…</span>
    </div>
  )
}

/** Buy button with a confirm step, so one stray click never spends gems. */
function BuyButton({ item, gems, onBuy }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])
  const cost = item.unlock.cost
  const short = cost - gems
  if (short > 0) {
    return (
      <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-400" title={`You need ${short} more gems`}>
        <GemBadge amount={cost} className="opacity-70" /> need {short} more
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        if (!armed) return setArmed(true)
        setArmed(false)
        onBuy(item)
      }}
      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 ${armed ? 'bg-purple-500 text-white shadow-[0_0_16px_rgba(168,85,247,0.6)]' : 'bg-purple-500/20 text-purple-100 ring-1 ring-purple-400/60 hover:bg-purple-500/35'}`}
    >
      {armed ? <>Confirm −{cost} <Gem className="size-3.5" aria-hidden="true" /></> : <><ShoppingBag className="size-3.5" aria-hidden="true" /> Buy · {cost} <Gem className="size-3.5" aria-hidden="true" /></>}
    </button>
  )
}

/**
 * A preview of each finish, so the shop shows what you'd get, not just a name.
 * Colourable finishes use the colour currently picked for that slot.
 */
function swatchStyle(item, color) {
  switch (item.id) {
    case 'skin_chrome':
      return { background: `linear-gradient(135deg, #f8fafc 0%, ${color} 35%, #0f172a 52%, ${color} 70%, #e2e8f0 100%)` }
    case 'skin_lava':
      return { background: 'radial-gradient(circle at 35% 35%, #fde047, #f97316 35%, #7f1d1d 75%)', boxShadow: 'inset 0 0 18px rgba(0,0,0,0.5)' }
    case 'shirt_glow':
      return { background: color, boxShadow: `0 0 18px ${color}, inset 0 0 10px rgba(255,255,255,0.45)` }
    case 'shirt_holo':
      return { background: 'conic-gradient(from 45deg, #f472b6, #a78bfa, #22d3ee, #34d399, #fde047, #f472b6)' }
    case 'trail_none':
      return { background: 'repeating-linear-gradient(135deg, #1e293b 0 6px, #0f172a 6px 12px)' }
    case 'trail_streak':
      return { background: `linear-gradient(90deg, transparent, ${color})` }
    case 'trail_sparks':
      return { background: `radial-gradient(${color} 18%, transparent 20%) 0 0 / 10px 10px, #0f172a` }
    case 'trail_rainbow':
      return { background: 'linear-gradient(90deg, #f43f5e, #f59e0b, #fde047, #34d399, #22d3ee, #818cf8, #c084fc)' }
    case 'trail_creator':
      return { background: `linear-gradient(90deg, transparent, #818cf8 45%, ${color})` }
    case 'trail_comet':
      return { background: 'linear-gradient(90deg, transparent, #64748b 40%, #f8fafc)' }
    case 'trail_flame':
      return { background: 'linear-gradient(90deg, transparent, #dc2626 30%, #f97316 65%, #fde047)' }
    default:
      return { background: color }
  }
}

const REQ_ICON = { badge: Award, medal: Medal }

function ItemCard({ item, state, equipped, color, onEquip, onBuy }) {
  const unlocked = isUnlocked(item, state)
  const buyable = !unlocked && item.unlock.type === 'gems'
  const earnOnly = !unlocked && !buyable
  return (
    <li>
      <div
        data-state={equipped ? 'equipped' : unlocked ? 'owned' : 'locked'}
        className={`relative flex h-full flex-col gap-2.5 overflow-hidden rounded-xl border p-3 transition ${
          equipped
            ? 'border-emerald-400/70 bg-emerald-400/[0.07] shadow-[0_0_20px_rgba(52,211,153,0.15)]'
            : unlocked
              ? 'border-slate-700 bg-slate-900/70 hover:border-slate-500'
              : 'border-slate-700/60 bg-slate-950/60'
        }`}
      >
        <div className="relative h-12 overflow-hidden rounded-lg ring-1 ring-white/10" aria-hidden="true">
          <div className={`absolute inset-0 ${unlocked ? '' : 'opacity-40 saturate-50'}`} style={swatchStyle(item, color)} />
          {!unlocked && (
            <div className="absolute inset-0 grid place-items-center bg-slate-950/55 backdrop-blur-[1px]">
              <span className="grid size-7 place-items-center rounded-full bg-slate-900/90 ring-1 ring-slate-500">
                <Lock className="size-3.5 text-slate-200" />
              </span>
            </div>
          )}
          {equipped && (
            <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-emerald-400 text-emerald-950 shadow">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
            <p className={`font-display font-bold leading-tight ${unlocked ? 'text-white' : 'text-slate-300'}`}>{item.name}</p>
            {equipped ? (
              <StatusTag tone="equipped">Equipped</StatusTag>
            ) : unlocked ? (
              item.unlock.type !== 'free' && <StatusTag tone="owned">Owned</StatusTag>
            ) : (
              <StatusTag tone="locked" icon={Lock}>Locked</StatusTag>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{item.blurb}</p>
        </div>

        <div className="mt-auto">
          {equipped ? null : unlocked ? (
            <button type="button" onClick={() => onEquip(item)} className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
              Equip<span className="sr-only"> {item.name}</span>
            </button>
          ) : buyable ? (
            <BuyButton item={item} gems={state.player.gems} onBuy={onBuy} />
          ) : (
            earnOnly && (
              <p className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Unlock with
                <StatusTag tone="badge" icon={REQ_ICON[item.unlock.type]} className="max-w-full self-start whitespace-normal! text-left leading-tight">{unlockLabel(item)}</StatusTag>
              </p>
            )
          )}
        </div>
      </div>
    </li>
  )
}

function ColorPicker({ slot, color, disabled, onPick }) {
  const id = useId()
  const [draft, setDraft] = useState(color)
  useEffect(() => setDraft(color), [color])
  return (
    <fieldset disabled={disabled} className="disabled:opacity-40">
      <legend className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <Paintbrush className="size-3.5" aria-hidden="true" /> {SLOTS.find((s) => s.id === slot).label} colour
        {disabled && <span className="normal-case tracking-normal text-slate-500"> (this style has its own colours)</span>}
      </legend>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {PALETTES[slot].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c)}
            aria-label={`Colour ${c}`}
            aria-pressed={c === color}
            className={`size-8 rounded-lg ring-1 ring-white/15 transition hover:scale-110 ${c === color ? 'outline-2 outline-offset-2 outline-indigo-400' : ''}`}
            style={{ background: c }}
          />
        ))}
        <label htmlFor={id} className="sr-only">Custom colour</label>
        <input id={id} type="color" value={color} onChange={(e) => onPick(e.target.value)} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
        <input
          type="text"
          value={draft}
          maxLength={7}
          spellCheck={false}
          aria-label="Hex colour"
          aria-invalid={!isHex(draft)}
          onChange={(e) => {
            const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`
            setDraft(v)
            if (isHex(v)) onPick(v)
          }}
          className="w-24 rounded-md bg-slate-800 px-2 py-1.5 font-mono text-sm uppercase text-white ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-400 aria-[invalid=true]:ring-rose-500"
        />
      </div>
    </fieldset>
  )
}

/** Avatar Customizer + Creator Shop: 3D preview, slot tabs, items (equip / buy / locked), colours. */
export default function AvatarCustomizer({ state }) {
  const { buyCosmetic, equipCosmetic, setCosmeticColor } = useGameActions()
  const [slot, setSlot] = useState('skin')
  const look = useMemo(() => effectiveLook(state), [state])
  const items = COSMETICS.filter((c) => c.slot === slot)
  const current = look[slot]
  const currentItem = COSMETICS.find((c) => c.id === current.item)

  const onTabKey = (e) => {
    const i = SLOTS.findIndex((s) => s.id === slot)
    const moves = { ArrowRight: i + 1, ArrowLeft: i - 1 }
    if (!(e.key in moves)) return
    e.preventDefault()
    const next = SLOTS[(moves[e.key] + SLOTS.length) % SLOTS.length]
    setSlot(next.id)
    document.getElementById(`slot-${next.id}`)?.focus()
  }

  return (
    <section aria-labelledby="customizer-title" className={`${CARD} ${CARD_PAD}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="customizer-title" className={H2}>Avatar &amp; Creator Shop</h2>
        <p className="flex items-center gap-2 text-sm text-slate-400" data-testid="shop-gems">
          <GemBadge amount={state.player.gems} size="lg" /> to spend
        </p>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-700 bg-[radial-gradient(circle_at_50%_35%,#312e81,#0b1222_70%)] sm:aspect-[4/3] lg:aspect-auto lg:min-h-[420px]">
          <Suspense fallback={<PreviewLoading />}>
            <AvatarPreview look={look} className="absolute inset-0" />
          </Suspense>
          <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] text-slate-400">Drag to turn · this is how you look in Play mode</p>
        </div>

        <div className="space-y-4">
          <div role="tablist" aria-label="Cosmetic slot" onKeyDown={onTabKey} className="flex gap-1 rounded-xl border border-slate-700 bg-slate-900/80 p-1">
            {SLOTS.map((s) => (
              <button
                key={s.id}
                id={`slot-${s.id}`}
                type="button"
                role="tab"
                aria-selected={slot === s.id}
                aria-controls="slot-panel"
                tabIndex={slot === s.id ? 0 : -1}
                onClick={() => setSlot(s.id)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${slot === s.id ? 'bg-indigo-500/25 text-white ring-1 ring-indigo-400/60' : 'text-slate-400 hover:text-slate-100'}`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div id="slot-panel" role="tabpanel" aria-labelledby={`slot-${slot}`} className="space-y-4">
            <ul className="grid grid-cols-2 gap-2 sm:gap-2.5 xl:grid-cols-3">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  state={state}
                  equipped={current.item === item.id}
                  color={current.color}
                  onEquip={(it) => {
                    equipCosmetic(it.id)
                    playSfx('select')
                  }}
                  onBuy={(it) => {
                    buyCosmetic(it.id)
                    playSfx('coin')
                  }}
                />
              ))}
            </ul>
            <ColorPicker slot={slot} color={current.color} disabled={Boolean(currentItem?.fixedColor)} onPick={(c) => setCosmeticColor(slot, c.toLowerCase())} />
          </div>
        </div>
      </div>
    </section>
  )
}
