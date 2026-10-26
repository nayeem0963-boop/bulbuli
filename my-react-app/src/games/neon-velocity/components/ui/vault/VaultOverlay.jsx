import { useEffect, useState } from 'react'
import { ITEMS_BY_SLOT, RARITY, Slot, getItem, swatchFor } from '../../../config/catalog'
import { useProfileStore } from '../../../stores/useProfileStore'
import { useUiStore } from '../../../stores/useUiStore'

/**
 * Customization Vault — spend banked energy crystals on skins, trails and wing
 * accessories. Selecting a card previews it live on the menu bird (the 3D scene
 * stays visible beside/above the panel); Buy/Equip commits it.
 * Desktop: right-hand panel. < 768 px: bottom sheet.
 */
const TABS = [
  [Slot.SKIN, 'Skins'],
  [Slot.TRAIL, 'Trails'],
  [Slot.WINGS, 'Wings'],
]

export function VaultOverlay() {
  const open = useUiStore((s) => s.vaultOpen)
  const tab = useUiStore((s) => s.vaultTab)
  const setTab = useUiStore((s) => s.setVaultTab)
  const closeVault = useUiStore((s) => s.closeVault)
  const wallet = useProfileStore((s) => s.wallet)
  const owned = useProfileStore((s) => s.owned)
  const equipped = useProfileStore((s) => s.equipped)
  const preview = useProfileStore((s) => s.preview)
  const setPreview = useProfileStore((s) => s.setPreview)
  const purchase = useProfileStore((s) => s.purchase)
  const equip = useProfileStore((s) => s.equip)
  const [flash, setFlash] = useState(null)

  const close = () => { setPreview(null); closeVault() }

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close() } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const selectedId = preview?.slot === tab ? preview.id : equipped[tab]
  const selected = getItem(selectedId)
  const isOwned = owned.includes(selectedId)
  const isEquipped = equipped[tab] === selectedId
  const shortfall = selected.price - wallet

  const buy = () => {
    const result = purchase(selectedId)
    setFlash(result.ok ? { type: 'ok', text: `${selected.name} unlocked` } : { type: 'err', text: 'Not enough crystals' })
    setTimeout(() => setFlash(null), 1800)
  }

  return (
    <aside className="nv-vault" role="dialog" aria-label="Customization Vault">
      <header className="nv-vault__header">
        <div>
          <h2 className="nv-vault__title">Vault</h2>
          <p className="nv-vault__sub">Spend energy crystals on new looks</p>
        </div>
        <span className="nv-wallet" aria-label={`${wallet} crystals`}>◆ {wallet.toLocaleString()}</span>
        <button className="nv-icon-btn" aria-label="Close vault" onClick={close}>✕</button>
      </header>

      <div className="nv-tabs" role="tablist">
        {TABS.map(([slot, label]) => (
          <button
            key={slot}
            role="tab"
            aria-selected={tab === slot}
            className={`nv-tabs__tab ${tab === slot ? 'is-active' : ''}`}
            onClick={() => { setPreview(null); setTab(slot) }}
          >{label}</button>
        ))}
      </div>

      <ul className="nv-vault__grid">
        {ITEMS_BY_SLOT[tab].map((item) => {
          const own = owned.includes(item.id)
          const eq = equipped[tab] === item.id
          const rarity = RARITY[item.rarity]
          return (
            <li key={item.id}>
              <button
                className={`nv-item-card ${item.id === selectedId ? 'is-selected' : ''} ${own ? '' : 'is-locked'}`}
                style={{ '--rarity': rarity.color }}
                onClick={() => setPreview(item.id === equipped[tab] ? null : item.id)}
                aria-pressed={item.id === selectedId}
              >
                <span className="nv-item-card__swatch" style={{ background: swatchFor(item) }}>
                  {item.slot === Slot.WINGS && <WingGlyph style={item.style} />}
                </span>
                <span className="nv-item-card__name">{item.name}</span>
                <span className="nv-item-card__rarity">{rarity.label}</span>
                <span className="nv-item-card__price">
                  {eq ? 'Equipped' : own ? 'Owned' : `◆ ${item.price}`}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <footer className="nv-vault__footer">
        <div className="nv-vault__detail">
          <strong>{selected.name}</strong>
          <span>{selected.blurb}</span>
        </div>
        {isEquipped ? (
          <button className="nv-btn" disabled>Equipped</button>
        ) : isOwned ? (
          <button className="nv-btn nv-btn--primary" onClick={() => equip(selectedId)}>Equip</button>
        ) : shortfall > 0 ? (
          <button className="nv-btn" disabled>Need ◆ {shortfall} more</button>
        ) : (
          <button className="nv-btn nv-btn--primary" onClick={buy}>Buy · ◆ {selected.price}</button>
        )}
        {flash && <p className={`nv-vault__flash ${flash.type === 'err' ? 'is-error' : ''}`} role="status">{flash.text}</p>}
      </footer>
    </aside>
  )
}

/** Tiny SVG icon per wing style for the card swatch. */
function WingGlyph({ style }) {
  const stroke = { stroke: '#22f3ff', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' }
  return (
    <svg viewBox="0 0 64 40" className="nv-wing-glyph" aria-hidden="true">
      {style === 'standard' && <path d="M32 22 L10 16 M32 22 L54 16" {...stroke} />}
      {style === 'blade' && <path d="M32 22 L6 10 L14 22 M32 22 L58 10 L50 22" {...stroke} stroke="#ff2bd6" />}
      {style === 'halo' && <ellipse cx="32" cy="14" rx="16" ry="5" {...stroke} stroke="#ffd23f" />}
      {style === 'jet' && <path d="M14 22 h12 M38 22 h12 M14 22 l-6 8 M50 22 l6 8" {...stroke} stroke="#ffd23f" />}
      {style === 'plume' && <path d="M32 24 L8 8 M32 24 L12 18 M32 24 L56 8 M32 24 L52 18" {...stroke} stroke="#ff2bd6" />}
    </svg>
  )
}
