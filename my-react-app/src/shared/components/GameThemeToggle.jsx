import { Moon, Sun } from 'lucide-react'

/**
 * A game's own light/dark button (the sun/moon in the top-right of its header), the same control
 * Math Master has. It shows what you'll switch to: a moon in light mode, a sun in dark mode.
 * Pair it with useStoredTheme(key) so each game remembers its own choice on this device.
 *
 *   <GameThemeToggle theme={theme} onToggle={toggleTheme} labels={{ toLight, toDark }} className="…" />
 */
export default function GameThemeToggle({ theme, onToggle, labels, className = '', iconSize = 20 }) {
  const toDark = theme === 'light'
  const label = toDark ? labels.toDark : labels.toLight
  const Icon = toDark ? Moon : Sun
  return (
    <button
      type="button"
      className={className}
      onClick={onToggle}
      // a mouse click shouldn't leave focus here, or Space/Enter would toggle again mid-game
      onMouseUp={(event) => event.currentTarget.blur()}
      aria-label={label}
      title={label}
    >
      <Icon aria-hidden="true" focusable="false" size={iconSize} strokeWidth={2.5} />
    </button>
  )
}
