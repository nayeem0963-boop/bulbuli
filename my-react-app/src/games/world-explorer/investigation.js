/** Pure helpers for the Investigate activities (Investigation.jsx). */

/** Deterministic shuffle that never leaves the items already in the right order. */
export function shuffledOrder(items, seed) {
  const ids = items.map((i) => i.id)
  if (ids.length < 2) return ids
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  const out = ids.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    const j = Math.abs(h) % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  if (out.every((id, i) => id === ids[i])) out.push(out.shift())
  return out
}

/** Which positions of an attempted order are right. */
export const orderMarks = (correctIds, attempt) => attempt.map((id, i) => id === correctIds[i])

/** A compare activity is complete when every condition has been tested. */
export const compareComplete = (conditions, tested) => conditions.every((c) => tested.includes(c.id))
