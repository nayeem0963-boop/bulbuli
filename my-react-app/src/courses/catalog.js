// Small, data-free summaries of each course for the home page (src/arcade/QuizTile.jsx), so the
// home bundle doesn't load every question and lesson. courses.test.js checks these numbers
// against the real course data.
export const COURSE_CATALOG = [
  {
    id: 'html',
    href: '/quiz/?course=html',
    title: { en: 'HTML Course', bn: 'HTML কোর্স' },
    questionCount: 70,
    levelCount: 10,
    skill: { en: 'Web Dev & HTML', bn: 'ওয়েব ডেভ ও HTML' },
    ages: '9–12',
    zone: 'build-create', // home-page section (see src/games/categories.js)
  },
]
