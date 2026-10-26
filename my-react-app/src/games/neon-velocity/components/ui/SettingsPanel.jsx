import { useResponsive } from '../../hooks/useResponsive'
import { useGameStore } from '../../stores/useGameStore'
import { useProfileStore } from '../../stores/useProfileStore'

/** Accessible single-choice button group (radiogroup). */
export function Segmented({ label, value, options, onChange, small = false }) {
  return (
    <div className={`nv-segmented ${small ? 'nv-segmented--small' : ''}`} role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button
          key={String(v)}
          role="radio"
          aria-checked={value === v}
          className={`nv-segmented__opt ${value === v ? 'is-active' : ''}`}
          onClick={() => onChange(v)}
        >{text}</button>
      ))}
    </div>
  )
}

function Seg({ label, ...rest }) {
  return (
    <div className="nv-settings__row">
      <span className="nv-settings__label">{label}</span>
      <Segmented label={label} small {...rest} />
    </div>
  )
}

/** Audio, graphics and (on phones/tablets) touch-control settings. All persist. */
export function SettingsPanel() {
  const musicVolume = useGameStore((s) => s.musicVolume)
  const sfxVolume = useGameStore((s) => s.sfxVolume)
  const setMusicVolume = useGameStore((s) => s.setMusicVolume)
  const setSfxVolume = useGameStore((s) => s.setSfxVolume)
  const quality = useGameStore((s) => s.vfxQuality)
  const setQuality = useGameStore((s) => s.setVfxQuality)
  const controls = useProfileStore((s) => s.controls)
  const setControls = useProfileStore((s) => s.setControls)
  const { showVirtualPad } = useResponsive()

  return (
    <div className="nv-settings">
      <label className="nv-slider">
        <span>Music</span>
        <input type="range" min="0" max="1" step="0.05" value={musicVolume} onChange={(e) => setMusicVolume(Number(e.target.value))} />
      </label>
      <label className="nv-slider">
        <span>Effects</span>
        <input type="range" min="0" max="1" step="0.05" value={sfxVolume} onChange={(e) => setSfxVolume(Number(e.target.value))} />
      </label>
      <Seg label="Visuals" value={quality} onChange={setQuality} options={[['high', 'High FX'], ['low', 'Low FX']]} />
      {showVirtualPad && (
        <>
          <Seg
            label="Controls"
            value={controls.layout}
            onChange={(layout) => setControls({ layout })}
            options={[['both', 'Swipe + buttons'], ['swipe', 'Swipe'], ['buttons', 'Buttons']]}
          />
          <Seg
            label="Hand"
            value={controls.handed}
            onChange={(handed) => setControls({ handed })}
            options={[['right', 'Right'], ['left', 'Left']]}
          />
          <Seg
            label="Vibration"
            value={controls.haptics}
            onChange={(haptics) => setControls({ haptics })}
            options={[[true, 'On'], [false, 'Off']]}
          />
        </>
      )}
    </div>
  )
}
