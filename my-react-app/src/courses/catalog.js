// Small, data-free summaries of each course for the home page (src/arcade/QuizTile.jsx), so the
// home bundle doesn't load every question and lesson. courses.test.js checks these numbers
// against the real course data.
export const COURSE_CATALOG = [
  {
    id: 'html',
    href: '/quiz/?course=html',
    // The home-page card's name. The course is now Pro Coder; its id, route (/quiz/?course=html)
    // and the course content itself keep their HTML names.
    title: { en: 'Pro Coder', bn: 'Pro Coder' },
    questionCount: 70,
    levelCount: 10,
    skill: { en: 'Web Dev & HTML', bn: 'ওয়েব ডেভ ও HTML' },
    ages: '12+',
    zone: 'build-create', // home-page section (see src/games/categories.js)
  },
]
