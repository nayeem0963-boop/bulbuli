import en from './en.js';
import bn from './bn.js';

export const DICTIONARIES = { en, bn };
export const LANGS = Object.keys(DICTIONARIES);
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/**
 * Build a translator for one language.
 *  t('quiz.score', { s: 40 })                       -> "Score 40"
 *  t('ex.oddShape', { a: { $t: 'shape.star' } })    params may be references to other keys
 *  n(42)                                            -> "৪২" in Bengali
 * Missing keys fall back to English, then to the key itself.
 */
export function createTranslator(lang) {
  const dict = DICTIONARIES[lang] ?? en;
  const localDigits = (value) => (lang === 'bn' ? String(value).replace(/[0-9]/g, (d) => BN_DIGITS[d]) : String(value));
  const raw = (key, params = {}) =>
    (dict[key] ?? en[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => {
      const v = params[name];
      if (v && typeof v === 'object' && '$t' in v) return raw(v.$t);
      return v ?? '';
    });
  return { lang, t: (key, params) => localDigits(raw(key, params)), n: localDigits };
}
