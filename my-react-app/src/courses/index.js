// Every Pro Coder course the quiz engine (quiz/engine.js) can play, by id: /quiz/?course=<id>.
// To add a course (e.g. CSS), make src/courses/css/index.js in the same shape as html/index.js,
// register it here and in catalog.js. See src/courses/README.md.
import htmlCourse from './html/index.js'

export const COURSES = {
  [htmlCourse.id]: htmlCourse,
}

export const DEFAULT_COURSE_ID = htmlCourse.id

/** The course for an id, or the default course if the id is unknown or missing. */
export function getCourse(id) {
  return COURSES[id] ?? COURSES[DEFAULT_COURSE_ID]
}
