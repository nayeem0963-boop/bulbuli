import { Link, useParams } from 'react-router-dom'
import { htmlLevels } from '../data/htmlLevels.js'

function PublicLevelPreview() {
  const { levelId } = useParams()
  const level = htmlLevels.find((item) => item.id === levelId)

  if (!level) {
    return (
      <main className="page">
        <h1>Lesson not found</h1>
        <Link to="/">Browse HTML lessons</Link>
      </main>
    )
  }

  return (
    <main className="page">
      <Link className="back-link" to="/">Back to lessons</Link>
      <header className="page-header">
        <p className="eyebrow">HTML · {level.section}</p>
        <h1>{level.title}</h1>
        <p>{level.description}</p>
      </header>
      <section className="card" aria-labelledby="lesson-preview-heading">
        <h2 id="lesson-preview-heading">Lesson preview</h2>
        <p>{level.intro}</p>
        <pre><code>{level.codeExample}</code></pre>
      </section>
      <aside className="card" aria-label="Member features">
        <h2>Ready to practice?</h2>
        <p>
          Sign up or log in to take this lesson’s questions and quiz, save your
          progress, and earn certificates.
        </p>
        <Link className="button" to="/login" state={{ from: `/level/${level.id}` }}>
          Sign up or log in to continue
        </Link>
      </aside>
    </main>
  )
}

export default PublicLevelPreview
