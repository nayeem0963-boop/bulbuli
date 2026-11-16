/**
 * The only way a Phase 2A game reaches storage or XP (design 1.6).
 *
 * The context is created with NO default adapter: useLearningAdapter() throws when no provider
 * is mounted, so a game can never fall back to a live (or any) adapter by accident.
 *
 * Plain JS (React.createElement, no JSX) so Node tests can import it; AdapterContext.jsx
 * re-exports it for app code.
 */
import { createContext, createElement, useContext } from 'react'

const NO_ADAPTER = Symbol('no-learning-adapter')
export const LearningAdapterContext = createContext(NO_ADAPTER)
LearningAdapterContext.displayName = 'LearningAdapterContext'

export class MissingAdapterError extends Error {
  constructor() {
    super('No learning adapter provided. Wrap the game in <AdapterProvider adapter={…}> (preview, review or live).')
    this.name = 'MissingAdapterError'
  }
}

/** The three adapters (design 1.6): dev preview, the controlled review build, and live (release). */
const ADAPTER_KINDS = new Set(['preview', 'review', 'live'])

export function AdapterProvider({ adapter, children }) {
  if (!adapter || !ADAPTER_KINDS.has(adapter.kind)) throw new MissingAdapterError()
  return createElement(LearningAdapterContext.Provider, { value: adapter }, children)
}

export function useLearningAdapter() {
  const adapter = useContext(LearningAdapterContext)
  if (adapter === NO_ADAPTER || !adapter) throw new MissingAdapterError()
  return adapter
}
