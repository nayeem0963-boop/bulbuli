import { createStore } from '../core/store.js';

const guessLang = () => (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('bn') ? 'bn' : 'en');

/** Player preferences. Persisted, and shared by every screen. */
export const settings = createStore(
  {
    lang: guessLang(),
    muted: false,
    // what the Home screen had selected last time
    pick: { mode: 'classic', category: 'mixed', level: 1 },
  },
  {
    key: 'bulbuli:settings',
    // v1 stored language and mute in two separate keys
    migrate(st) {
      const lang = st.getItem('bulbuli:lang');
      const muted = st.getItem('bulbuli:muted');
      if (!lang && muted == null) return undefined;
      return { ...(lang === 'en' || lang === 'bn' ? { lang } : {}), muted: muted === '1' };
    },
  },
);

export const setLang = (lang) => settings.set({ lang });
export const setMuted = (muted) => settings.set({ muted });
export const setPick = (patch) => settings.set((s) => ({ pick: { ...s.pick, ...patch } }));
