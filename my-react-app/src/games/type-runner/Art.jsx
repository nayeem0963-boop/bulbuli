import runnerBird from '../../assets/bulbul-runner.webp'

export default function TypeRunnerArt() {
  return (
    <div className="art art-typing" aria-hidden="true">
      <div className="art-typing-track">
        <img className="art-typing-bird" src={runnerBird} alt="" width="480" height="264" loading="lazy" />
        <span className="art-typing-flag">🏁</span>
      </div>
      <div className="art-typing-keys">
        <span>a</span><span className="is-next">s</span><span>d</span><span>f</span>
      </div>
    </div>
  )
}
