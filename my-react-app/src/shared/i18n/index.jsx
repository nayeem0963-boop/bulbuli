import { createContext, useContext, useEffect, useMemo } from 'react';
import { settings, setLang } from '../../state/settings.js';
import { useStore } from '../hooks/useStore.js';
import { createTranslator } from './translator.js';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const lang = useStore(settings, (s) => s.lang);
  const value = useMemo(() => ({ ...createTranslator(lang), setLang }), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
