import { useEffect } from 'react'
import { BLOCK_TYPE_LIST } from '../../level/blockTypes.js'
import { useEditorActions } from '../../level/LevelEditorProvider.jsx'

const typing = (el) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

/**
 * Studio keyboard shortcuts (active in Build mode only; Play mode has its own controls):
 *   1–5  block type   E  erase tool   B  build tool   M  mute   P  play test
 *   Ctrl/⌘+Z undo     Ctrl/⌘+Shift+Z or Ctrl+Y redo
 */
export default function useEditorShortcuts({ enabled = true, onPlay } = {}) {
  const actions = useEditorActions()

  useEffect(() => {
    if (!enabled) return
    const byKey = Object.fromEntries(BLOCK_TYPE_LIST.map((d) => [d.hotkey, d.id]))

    const onKeyDown = (e) => {
      if (e.repeat && !(e.ctrlKey || e.metaKey)) return
      if (typing(e.target)) return
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      if (mod && key === 'z') {
        e.preventDefault()
        return e.shiftKey ? actions.redo() : actions.undo()
      }
      if (mod && key === 'y') {
        e.preventDefault()
        return actions.redo()
      }
      if (mod || e.altKey) return

      if (byKey[e.key]) return actions.selectBlockType(byKey[e.key])
      if (key === 'e') return actions.toggleMode()
      if (key === 'b') return actions.setMode('build')
      if (key === 'm') return actions.toggleMuted()
      if (key === 'p' && onPlay) return onPlay()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [actions, enabled, onPlay])
}
