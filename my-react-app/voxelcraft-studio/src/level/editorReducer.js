import { addBlock, clearBlocks, removeBlockAt } from './levelOps.js'
import { TITLE_MAX } from './levelSchema.js'

export const HISTORY_LIMIT = 100

/**
 * Level editor state with undo/redo. History holds whole LevelState snapshots; they share
 * every untouched block object, so 100 steps of a big level cost little memory.
 *
 * @typedef {{ level: import('./levelSchema.js').LevelState, past: any[], future: any[] }} EditorState
 */
export const createEditorState = (level) => ({ level, past: [], future: [] })

/** Records `next` as a new history step (no-op if the operation changed nothing). */
function commit(state, next) {
  if (next === state.level) return state
  const past = state.past.length >= HISTORY_LIMIT ? state.past.slice(1) : state.past.slice()
  past.push(state.level)
  return { level: next, past, future: [] }
}

export function editorReducer(state, action) {
  switch (action.type) {
    case 'block/add':
      return commit(state, addBlock(state.level, action.block))

    case 'block/remove':
      return commit(state, removeBlockAt(state.level, action.cell))

    case 'level/clear':
      return commit(state, clearBlocks(state.level))

    case 'level/rename': {
      // Typing a title shouldn't create one undo step per keystroke, so rename skips history.
      const title = String(action.title).slice(0, TITLE_MAX)
      return title === state.level.title ? state : { ...state, level: { ...state.level, title } }
    }

    case 'level/load':
      return createEditorState(action.level)

    // Undo/redo restore blocks only; the title stays as typed (renames aren't history steps).
    case 'history/undo': {
      if (!state.past.length) return state
      const past = state.past.slice(0, -1)
      const level = { ...state.past[state.past.length - 1], title: state.level.title }
      return { level, past, future: [state.level, ...state.future] }
    }

    case 'history/redo': {
      if (!state.future.length) return state
      const [next, ...future] = state.future
      return { level: { ...next, title: state.level.title }, past: [...state.past, state.level], future }
    }

    default:
      return state
  }
}
