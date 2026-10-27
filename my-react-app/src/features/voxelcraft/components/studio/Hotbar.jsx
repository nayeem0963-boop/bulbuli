import { Eraser, Palette, Redo2, Trash, Undo2, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { BLOCK, BLOCK_TYPE_LIST, BLOCK_TYPES, PAINT_PRESETS } from '../../level/blockTypes.js'
import { useEditorActions, useEditorTool, useLevel } from '../../level/LevelEditorProvider.jsx'

const HEX = /^#[0-9a-f]{6}$/i

/** Small CSS preview of each block type (no images). */
function TypeSwatch({ type, color }) {
  const base = 'block size-7 shrink-0'
  switch (type) {
    case BLOCK.BOUNCE:
      return <span className={`${base} rounded-lg bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.8)]`} />
    case BLOCK.LAVA:
      return <span className={`${base} rounded-sm bg-gradient-to-br from-orange-400 to-red-600 shadow-[0_0_12px_rgba(249,115,22,0.85)]`} />
    case BLOCK.SPAWN:
      return <span className={`${base} rounded-full bg-blue-600 ring-4 ring-inset ring-blue-300/70`} />
    case BLOCK.FINISH:
      return <span className={`${base} rounded-full border-[5px] border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.7)]`} />
    default:
      return <span className={`${base} rounded-sm ring-1 ring-inset ring-white/20`} style={{ background: color }} />
  }
}

const slotBase =
  'pointer-events-auto relative flex shrink-0 flex-col items-center gap-1 rounded-xl px-2 pb-1.5 pt-2 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400'
const slotIdle = 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
const slotActive = 'bg-indigo-500/20 text-white ring-1 ring-indigo-400/70 shadow-[0_0_16px_rgba(129,140,248,0.35)]'

function KeyCap({ children }) {
  return (
    <kbd className="absolute right-1 top-0.5 font-sans text-[9px] font-bold text-slate-500">{children}</kbd>
  )
}

function PaintButton({ color, disabled, open, panelId, onToggle }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={panelId}
      title={disabled ? 'This block keeps its signature colour' : 'Paint colour'}
      className={`${slotBase} ${open ? slotActive : slotIdle} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <span className="relative block size-7 rounded-full ring-2 ring-white/30" style={{ background: color }}>
        <Palette className="absolute -bottom-1 -right-1 size-3.5 rounded-full bg-slate-900 p-0.5 text-slate-200" aria-hidden="true" />
      </span>
      Paint
    </button>
  )
}

/** Preset swatches + native hex picker + hex text field. Rendered above the toolbar (not inside its scroll box). */
function PaintPanel({ id, color, onChange }) {
  const [draft, setDraft] = useState(color)
  useEffect(() => setDraft(color), [color])

  return (
    <div id={id} className="pointer-events-auto w-56 rounded-xl bg-slate-900 p-3 shadow-2xl ring-1 ring-slate-700">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Platform colour</p>
      <div className="grid grid-cols-6 gap-1.5">
        {PAINT_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`Colour ${c}`}
            aria-pressed={c === color}
            className={`aspect-square rounded-md ring-1 ring-white/10 transition hover:scale-110 ${c === color ? 'outline-2 outline-offset-2 outline-indigo-400' : ''}`}
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="h-8 w-10 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
          aria-label="Custom colour"
        />
        <input
          type="text"
          value={draft}
          spellCheck={false}
          maxLength={7}
          onChange={(e) => {
            const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`
            setDraft(v)
            if (HEX.test(v)) onChange(v.toLowerCase())
          }}
          aria-label="Hex colour"
          aria-invalid={!HEX.test(draft)}
          className="w-full rounded-md bg-slate-800 px-2 py-1.5 font-mono text-sm uppercase text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-400 aria-[invalid=true]:ring-rose-500"
        />
      </div>
    </div>
  )
}

function ClearButton({ disabled, onConfirm }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!armed) return setArmed(true)
        setArmed(false)
        onConfirm()
      }}
      title="Remove every block (undo with Ctrl+Z)"
      className={`${slotBase} ${armed ? 'bg-rose-500/25 text-rose-100 ring-1 ring-rose-400/70' : slotIdle} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <Trash className={`size-7 p-1 ${armed ? 'text-rose-300' : ''}`} aria-hidden="true" />
      {armed ? 'Sure?' : 'Clear all'}
    </button>
  )
}

/** The Studio's bottom toolbar, overlaid on the viewport. */
export default function Hotbar() {
  const tool = useEditorTool()
  const { level, canUndo, canRedo } = useLevel()
  const actions = useEditorActions()
  const activeDef = BLOCK_TYPES[tool.blockType]
  const building = tool.mode === 'build'
  const paintDisabled = !activeDef.paintable || !building

  const [paintOpen, setPaintOpen] = useState(false)
  const root = useRef(null)
  const panelId = useId()
  useEffect(() => {
    if (!paintOpen) return
    const onDown = (e) => !root.current?.contains(e.target) && setPaintOpen(false)
    const onKey = (e) => e.key === 'Escape' && setPaintOpen(false)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [paintOpen])

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
      <div ref={root} className="flex max-w-full flex-col items-center gap-2">
        {paintOpen && !paintDisabled && (
          <PaintPanel id={panelId} color={tool.paintColor} onChange={actions.setPaintColor} />
        )}
        <div
          role="toolbar"
          aria-label="Build tools"
          className="pointer-events-auto flex max-w-full items-stretch gap-1 overflow-x-auto rounded-2xl bg-slate-950/80 p-1.5 ring-1 ring-slate-700/80 backdrop-blur-md"
        >
          {BLOCK_TYPE_LIST.map((def) => {
            const active = building && tool.blockType === def.id
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => actions.selectBlockType(def.id)}
                aria-pressed={active}
                title={`${def.label}: ${def.hint} (${def.hotkey})`}
                className={`${slotBase} w-16 ${active ? slotActive : slotIdle}`}
              >
                <KeyCap>{def.hotkey}</KeyCap>
                <TypeSwatch type={def.id} color={def.paintable ? tool.paintColor : def.defaultColor} />
                {def.label}
              </button>
            )
          })}

          <span className="mx-1 w-px shrink-0 self-stretch bg-slate-700/80" aria-hidden="true" />

          <button
            type="button"
            onClick={actions.toggleMode}
            aria-pressed={!building}
            title="Erase tool (E). Or Shift+click / right-click a block in any tool"
            className={`${slotBase} w-16 ${!building ? 'bg-rose-500/20 text-white ring-1 ring-rose-400/70' : slotIdle}`}
          >
            <KeyCap>E</KeyCap>
            <Eraser className={`size-7 p-1 ${!building ? 'text-rose-300' : ''}`} aria-hidden="true" />
            Erase
          </button>

          <PaintButton
            color={tool.paintColor}
            disabled={paintDisabled}
            open={paintOpen && !paintDisabled}
            panelId={panelId}
            onToggle={() => setPaintOpen((o) => !o)}
          />

          <span className="mx-1 w-px shrink-0 self-stretch bg-slate-700/80" aria-hidden="true" />

          <button type="button" onClick={actions.undo} disabled={!canUndo} title="Undo (Ctrl+Z)" className={`${slotBase} ${slotIdle} disabled:opacity-35`}>
            <Undo2 className="size-7 p-1" aria-hidden="true" />
            Undo
          </button>
          <button type="button" onClick={actions.redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" className={`${slotBase} ${slotIdle} disabled:opacity-35`}>
            <Redo2 className="size-7 p-1" aria-hidden="true" />
            Redo
          </button>
          <ClearButton disabled={!level.blocks.length} onConfirm={actions.clearAll} />
          <button
            type="button"
            onClick={actions.toggleMuted}
            aria-pressed={tool.muted}
            title="Sound effects (M)"
            className={`${slotBase} ${slotIdle}`}
          >
            {tool.muted ? <VolumeX className="size-7 p-1" aria-hidden="true" /> : <Volume2 className="size-7 p-1" aria-hidden="true" />}
            {tool.muted ? 'Muted' : 'Sound'}
          </button>
        </div>
      </div>
    </div>
  )
}
