/**
 * Contexts and hooks for the level editor. <LevelEditorProvider> (LevelEditorProvider.jsx) fills
 * them; keeping them here lets that file export only a component (Fast Refresh boundary).
 *   LevelContext   level + undo/redo availability  → 3D meshes, side panel
 *   ToolContext    tool, block type, paint colour, mute → hotbar
 *   ActionsContext stable functions (never change)  → everything, with zero re-renders
 */
import { createContext, useContext } from 'react'

export const LevelContext = createContext(null)
export const ToolContext = createContext(null)
export const ActionsContext = createContext(null)

const useRequired = (ctx, name) => {
  const value = useContext(ctx)
  if (!value) throw new Error(`${name} must be used inside <LevelEditorProvider>`)
  return value
}

export const useLevel = () => useRequired(LevelContext, 'useLevel')
export const useEditorTool = () => useRequired(ToolContext, 'useEditorTool')
export const useEditorActions = () => useRequired(ActionsContext, 'useEditorActions')
