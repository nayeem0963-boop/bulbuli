export const formatInt = (n) => Math.round(n ?? 0).toLocaleString()

/** 83456 ms → "1:23.4" */
export function formatTime(ms = 0) {
  const total = Math.max(0, ms) / 1000
  const m = Math.floor(total / 60)
  const s = total - m * 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}

export const formatSeconds = (s = 0) => `${s.toFixed(1)} s`
