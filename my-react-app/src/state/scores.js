import { createStore } from '../core/store.js';

/* ---------------- Personal bests ---------------- */
const PREFIX = 'bulbuli:best:';
export const bestKey = (mode, category, level) => `${mode}:${category}:${level}`;

export const bests = createStore(
  { map: {} },
  {
    key: 'bulbuli:bests',
    // v1 stored one key per mode/topic/level: "bulbuli:best:<cat>:<lvl>" and "bulbuli:best:endless:<cat>:<lvl>"
    migrate(st) {
      if (typeof st.length !== 'number') return undefined;
      const map = {};
      for (let i = 0; i < st.length; i++) {
        const k = st.key(i);
        if (!k?.startsWith(PREFIX)) continue;
        const parts = k.slice(PREFIX.length).split(':');
        const id = parts.length === 2 ? `classic:${parts.join(':')}` : parts.join(':');
        const v = Number(st.getItem(k));
        if (v > 0) map[id] = v;
      }
      return Object.keys(map).length ? { map } : undefined;
    },
  },
);

export const getBest = (mode, category, level) => bests.get().map[bestKey(mode, category, level)] || 0;

/** Returns { prev, isBest } and stores the score if it beats the old best. */
export function recordBest(mode, category, level, score) {
  const prev = getBest(mode, category, level);
  const isBest = score > prev;
  if (isBest) bests.set((s) => ({ map: { ...s.map, [bestKey(mode, category, level)]: score } }));
  return { prev, isBest };
}

/* ---------------- Local leaderboard ---------------- */
export const leaderboard = createStore(
  { entries: [] },
  {
    key: 'bulbuli:leaderboard',
    migrate(st) {
      try {
        const old = JSON.parse(st.getItem('bulbuli:lb'));
        return Array.isArray(old) ? { entries: old } : undefined;
      } catch { return undefined; }
    },
  },
);

const byScore = (a, b) => b.score - a.score || a.date - b.date;
const sameBoard = (e, f) => e.mode === f.mode && e.category === f.category && e.level === f.level;

/** @returns {{ id: string, rank: number }} rank is within the same mode, topic and level */
export function addEntry(entry) {
  const full = { ...entry, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), date: Date.now() };
  const entries = [...leaderboard.get().entries, full].sort(byScore).slice(0, 500);
  leaderboard.set({ entries });
  return { id: full.id, rank: entries.filter((e) => sameBoard(e, full)).findIndex((e) => e.id === full.id) + 1 };
}

/** Top rows for a filter. `category: 'all'` and `level: 0` mean "any". */
export function topEntries({ mode, category = 'all', level = 0, limit = 10 }) {
  return leaderboard.get().entries
    .filter((e) => e.mode === mode && (category === 'all' || e.category === category) && (!level || e.level === level))
    .sort(byScore)
    .slice(0, limit);
}

/* ---------------- Result of the run that just ended (survives a refresh, not a new tab) ---------------- */
export const lastResult = createStore({ result: null }, { key: 'bulbuli:last', storage: 'session' });
