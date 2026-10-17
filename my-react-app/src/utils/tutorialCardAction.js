export function getTutorialCardAction(tutorial, result, started, currentIndex = 0) {
  if (result) return 'Completed 🎉'
  if (!started) return 'Start Module'

  const question = tutorial.questions[currentIndex]
  const sectionIndex = tutorial.sections?.findIndex((section) => section.id === question?.sectionId) ?? -1
  const lessonNumber = sectionIndex >= 0 ? sectionIndex + 1 : currentIndex + 1
  return `Resume Lesson ${lessonNumber}`
}
