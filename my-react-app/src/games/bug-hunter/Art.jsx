/** Home-page tile: a strip of code blocks with a bug on one of them, and a magnifying glass. */
export default function BugHunterArt() {
  return (
    <div className="art art-bug" aria-hidden="true">
      <div className="art-bug-blocks">
        <span>↑</span>
        <span className="is-buggy">↺<i>🐞</i></span>
        <span>↑</span>
      </div>
      <span className="art-bug-lens">🔍</span>
    </div>
  )
}
