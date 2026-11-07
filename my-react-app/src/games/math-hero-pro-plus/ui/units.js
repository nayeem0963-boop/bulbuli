/** A question's unit in the player's language ('%', '°' and 'cm²' are the same in both). */
export const unitOf = (question, language) => {
  const unit = question.unit
  if (!unit) return ''
  return typeof unit === 'string' ? unit : unit[language] ?? unit.en
}
/** % and ° sit right against the number; words get a space. */
export const tight = (unit) => unit === '%' || unit === '°'
export const withUnit = (value, unit) => (unit ? `${value}${tight(unit) ? '' : ' '}${unit}` : value)
