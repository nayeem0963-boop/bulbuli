import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { playPlaceSfx, playSfx, setSfxMuted } from '../audio/sfx.js'
import { BLOCK, BLOCK_TYPES } from './blockTypes.js'
import { createEditorState, editorReducer } from './editorReducer.js'
import { saveStudioLevel } from '../state/saveGame.js'
import { STORAGE_KEYS, getStorage } from '../state/storageKeys.js'
import { blockAt, canPlace } from './levelOps.js'
import { createEmptyLevel } from './levelSchema.js'

/**
 * Level editor state, kept apart from the global game state on purpose: it changes on every
 * click, and only the Studio should re-render for that, not the header or other tabs.
 *
 * Three contexts so each consumer re-renders only for what it reads:
 *   LevelContext   level + undo/redo availability  → 3D meshes, side panel
 *   ToolContext    tool, block type, paint colour, mute → hotbar
 *   ActionsContext stable functions (never change)  → everything, with zero re-renders
 */
const LevelContext = createContext(null)
const ToolContext = createContext(null)
const ActionsContext = createContext(null)

const MUTE_KEY = STORAGE_KEYS.sfxMuted
const readMuted = () => {
  try {
    return getStorage()?.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function LevelEditorProvider({ initialLevel, children }) {
  const [editor, dispatch] = useReducer(editorReducer, initialLevel, createEditorState)
  const [tool, setTool] = useState(() => {
    const muted = readMuted()
    setSfxMuted(muted)
    return { mode: 'build', blockType: BLOCK.PLATFORM, paintColor: BLOCK_TYPES.PLATFORM.defaultColor, muted }
  })

  // Actions read the latest state through refs, so they can stay referentially stable.
  const editorRef = useRef(editor)
  const toolRef = useRef(tool)
  useLayoutEffect(() => {
    editorRef.current = editor
    toolRef.current = tool
  })

  // The level in progress is saved on this device (debounced, and flushed when the page hides),
  // so a reload picks up where you left off. Only if saving fails do we warn before leaving.
  const [saveFailed, setSaveFailed] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSaveFailed(!saveStudioLevel(editor.level)), 300)
    return () => clearTimeout(t)
  }, [editor.level])
  useEffect(() => {
    const flush = () => saveStudioLevel(editorRef.current.level)
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush() // leaving the game inside the host app (a route change) unmounts without a pagehide
    }
  }, [])

  const hasEdits = editor.past.length > 0
  useEffect(() => {
    if (!hasEdits || !saveFailed) return
    const warn = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasEdits, saveFailed])

  const actions = useMemo(() => {
    const patchTool = (patch) => setTool((t) => ({ ...t, ...patch }))

    return {
      /** Places the selected block type at `cell`. Returns true if it was placed. */
      placeAt(cell) {
        const { blockType, paintColor } = toolRef.current
        const level = editorRef.current.level
        const check = canPlace(level, cell, blockType)
        if (!check.ok) {
          playSfx('error')
          return false
        }
        dispatch({ type: 'block/add', block: { type: blockType, ...cell, color: paintColor } })
        playPlaceSfx(blockType, cell)
        return true
      },
      /** Deletes whatever block occupies `cell`. Returns true if something was removed. */
      removeAt(cell) {
        if (!blockAt(editorRef.current.level, cell)) return false
        dispatch({ type: 'block/remove', cell })
        playSfx('remove')
        return true
      },
      clearAll() {
        if (!editorRef.current.level.blocks.length) return
        dispatch({ type: 'level/clear' })
        playSfx('clear')
      },
      undo() {
        if (!editorRef.current.past.length) return playSfx('error')
        dispatch({ type: 'history/undo' })
        playSfx('undo')
      },
      redo() {
        if (!editorRef.current.future.length) return playSfx('error')
        dispatch({ type: 'history/redo' })
        playSfx('redo')
      },
      rename: (title) => dispatch({ type: 'level/rename', title }),
      loadLevel: (level) => dispatch({ type: 'level/load', level }),
      /** Starts a blank level with a fresh id (the old one stays in the gallery if published). */
      newLevel: (author) => {
        dispatch({ type: 'level/load', level: createEmptyLevel({ title: 'Untitled Level', author }) })
        playSfx('clear')
      },

      selectBlockType(blockType) {
        if (!BLOCK_TYPES[blockType]) return
        patchTool({ blockType, mode: 'build' })
        playSfx('select')
      },
      setMode(mode) {
        patchTool({ mode })
        playSfx('select')
      },
      toggleMode() {
        patchTool({ mode: toolRef.current.mode === 'erase' ? 'build' : 'erase' })
        playSfx('select')
      },
      setPaintColor: (paintColor) => patchTool({ paintColor }),
      toggleMuted() {
        const muted = !toolRef.current.muted
        setSfxMuted(muted)
        try {
          getStorage()?.setItem(MUTE_KEY, muted ? '1' : '0')
        } catch {
          // storage unavailable: mute still works for this session
        }
        patchTool({ muted })
        if (!muted) playSfx('select')
      },
      /** Snapshot getters for event handlers that must not subscribe (e.g. 3D pointer events). */
      getTool: () => toolRef.current,
      getLevel: () => editorRef.current.level,
    }
  }, [])

  const levelValue = useMemo(
    () => ({ level: editor.level, canUndo: editor.past.length > 0, canRedo: editor.future.length > 0 }),
    [editor],
  )

  return (
    <ActionsContext.Provider value={actions}>
      <LevelContext.Provider value={levelValue}>
        <ToolContext.Provider value={tool}>{children}</ToolContext.Provider>
      </LevelContext.Provider>
    </ActionsContext.Provider>
  )
}

const useRequired = (ctx, name) => {
  const value = useContext(ctx)
  if (!value) throw new Error(`${name} must be used inside <LevelEditorProvider>`)
  return value
}

export const useLevel = () => useRequired(LevelContext, 'useLevel')
export const useEditorTool = () => useRequired(ToolContext, 'useEditorTool')
export const useEditorActions = () => useRequired(ActionsContext, 'useEditorActions')
