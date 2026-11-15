import { useState } from 'react';

/**
 * Local, editable state that starts from `value` and resets whenever `value` changes from outside
 * (e.g. a colour field the user can type into, re-synced when the saved colour changes).
 * The reset happens during render (React's "adjust state when a prop changes" pattern), so there is
 * no effect, no extra render with a stale draft, and no `set-state-in-effect`.
 *
 * @template T
 * @param {T} value
 * @returns {[T, (next: T | ((previous: T) => T)) => void]}
 */
export function useDraftState(value) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  if (!Object.is(synced, value)) {
    setSynced(value);
    setDraft(value);
  }
  return [draft, setDraft];
}
