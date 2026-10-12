const AWARD_DATE = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(new Date())

function CertificateCard({ level, learnerName }) {
  return (
    <article className="certificate-frame">
      <div className="certificate-card">
        <div className="certificate-seal" aria-label="Bulbuli achievement seal">
          <span>✦</span>
          <span className="seal-label">BULBULI</span>
          <span>✦</span>
        </div>
        <p className="certificate-brand">BULBULI · LEARNING</p>
        <h1>Certificate of Completion</h1>
        <p className="certificate-intro">This certificate is proudly presented to</p>
        <p className="certificate-learner">{learnerName}</p>
        <p className="certificate-message">
          In recognition of completing the <strong>{level.title}</strong> level.
          Your curiosity and dedication are building a bright future in code.
        </p>
        <p className="certificate-date">Awarded on {AWARD_DATE}</p>
      </div>
    </article>
  )
}

export default CertificateCard
