export function getCurrentStreak(gamification) {
  const formatDate = (date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  return [formatDate(today), formatDate(yesterday)].includes(gamification.lastActivityDate)
    ? gamification.currentStreak
    : 0
}
