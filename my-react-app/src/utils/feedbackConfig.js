export const FEEDBACK_TIMING = Object.freeze({
  fast: 280,
  banner: 1100,
  answerTransition: 280,
})

export const FEEDBACK_THEME = Object.freeze({
  light: {
    success: '#16805b',
    successSoft: '#e2f8ec',
    error: '#d94855',
    errorSoft: '#ffe6e8',
    bonus: '#f0a51b',
  },
  dark: {
    success: '#69d5a6',
    successSoft: '#1c382f',
    error: '#ff9298',
    errorSoft: '#40262e',
    bonus: '#f0c66e',
  },
})

export function getFeedbackStyle() {
  const isDark = typeof document !== 'undefined'
    && document.querySelector('.app-shell')?.getAttribute('data-theme') === 'dark'
  const theme = isDark ? FEEDBACK_THEME.dark : FEEDBACK_THEME.light

  return {
    '--feedback-fast': `${FEEDBACK_TIMING.fast}ms`,
    '--feedback-banner': `${FEEDBACK_TIMING.banner}ms`,
    '--feedback-success': theme.success,
    '--feedback-success-soft': theme.successSoft,
    '--feedback-error': theme.error,
    '--feedback-error-soft': theme.errorSoft,
    '--feedback-bonus': theme.bonus,
  }
}
