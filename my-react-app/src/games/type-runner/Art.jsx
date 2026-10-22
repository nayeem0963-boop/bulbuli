import BrandMark from '../../arcade/BrandMark.jsx'

export default function TypeRunnerArt() {
  return (
    <div className="art art-typing" aria-hidden="true">
      <div className="art-typing-track">
        <span className="art-typing-bird"><BrandMark size={58} /></span>
        <span className="art-typing-flag">🏁</span>
      </div>
      <div className="art-typing-keys">
        <span>a</span><span className="is-next">s</span><span>d</span><span>f</span>
      </div>
    </div>
  )
}
