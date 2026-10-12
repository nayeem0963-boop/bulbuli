import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CertificateCard from '../components/CertificateCard.jsx'
import { htmlLevels } from '../data/htmlLevels.js'
import { useProgress } from '../hooks/useProgress.js'

function Certificate() {
  const { levelId } = useParams()
  const level = htmlLevels.find((item) => item.id === levelId)
  const { completedLevels, learnerName, setLearnerName, storageError } = useProgress()
  const [nameEntry, setNameEntry] = useState('')
  const promptShown = useRef(false)
  const completed = level && completedLevels.includes(level.id)

  useEffect(() => {
    if (!completed || learnerName || promptShown.current) return

    promptShown.current = true
    const enteredName = window.prompt('What name should appear on your certificate?')
    if (enteredName?.trim()) {
      setLearnerName(enteredName)
    }
  }, [completed, learnerName, setLearnerName])

  if (!level) {
    return (
      <main className="page">
        <h1>Level not found</h1>
        <Link to="/">Back to levels</Link>
      </main>
    )
  }

  if (!completed) {
    return (
      <main className="page">
        <h1>Certificate not unlocked yet</h1>
        <p>Complete this level to earn your certificate.</p>
        <Link className="button" to={`/level/${level.id}`}>Continue level</Link>
        <p><Link to="/">Back to levels</Link></p>
      </main>
    )
  }

  const saveName = (event) => {
    event.preventDefault()
    if (nameEntry.trim()) setLearnerName(nameEntry)
  }

  return (
    <main className="page certificate-page">
      {learnerName ? (
        <CertificateCard level={level} learnerName={learnerName} />
      ) : (
        <section className="card name-prompt">
          <h1>Add your name</h1>
          <p>Enter the name you would like printed on your certificate.</p>
          <form onSubmit={saveName}>
            <label className="answer-label" htmlFor="learner-name">Learner name</label>
            <input
              id="learner-name"
              type="text"
              value={nameEntry}
              onChange={(event) => setNameEntry(event.target.value)}
              autoComplete="name"
              required
            />
            <button className="button" type="submit">Save name</button>
          </form>
        </section>
      )}
      {storageError && <p className="notice" role="alert">{storageError}</p>}
      {learnerName && (
        <button className="button print-button" type="button" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      )}
      <p className="certificate-back no-print">
        <Link to="/">Back to levels</Link>
      </p>
    </main>
  )
}

export default Certificate
