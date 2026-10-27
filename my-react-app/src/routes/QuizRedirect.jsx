import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * /quiz inside the React app. The quiz is its own page (quiz/index.html), which the server
 * serves at /quiz/ (vite.config.js in dev, dist/quiz/ when built). If the app itself ever loads
 * at /quiz (an old dev server, a cached tab), reload once at /quiz/ so the server can serve the
 * quiz. At /quiz/ a second reload could loop forever, so show a way out instead.
 */
export default function QuizRedirect() {
  const { pathname } = useLocation()
  const hasSlash = pathname.endsWith('/')

  useEffect(() => {
    if (!hasSlash) window.location.replace('/quiz/')
  }, [hasSlash])

  if (!hasSlash) return null
  return (
    <main style={{ padding: '3rem 1.5rem', textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
      <h1>Pro Coder HTML Course</h1>
      <p>
        The course page didn&apos;t load. If you&apos;re running the dev server, stop it and
        run <code>npm run dev</code> again, then reload this page.
      </p>
      <p>
        <a href="/quiz/index.html">Open the HTML course</a> · <a href="/">Back to the games</a>
      </p>
    </main>
  )
}
