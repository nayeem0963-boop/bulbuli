import runnerBird from '../../assets/bulbul-runner.webp'

/** Home-page tile: a tiny map with Bulbuli and the nest, plus a strip of code blocks. */
export default function CodeCritterArt() {
  return (
    <div className="art art-code" aria-hidden="true">
      <div className="art-code-map">
        <span className="art-code-cell"><img className="art-code-bird" src={runnerBird} alt="" width="240" height="236" loading="lazy" /></span>
        <span className="art-code-cell" />
        <span className="art-code-cell is-rock" />
        <span className="art-code-cell"><span className="art-code-seed" /></span>
        <span className="art-code-cell" />
        <span className="art-code-cell"><span className="art-code-nest" /></span>
      </div>
      <div className="art-code-blocks">
        <span>↑</span><span>↑</span><span className="is-turn">↻</span><span className="is-loop">🔁</span>
      </div>
    </div>
  )
}
