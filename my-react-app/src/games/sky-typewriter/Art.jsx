// Home-page tile picture. Plain DOM + CSS only, so three.js is NOT pulled
// into the home page bundle — it loads only when the game is opened.
export default function SkyTypewriterArt() {
  return (
    <div className="art art-sky-typewriter" aria-hidden="true">
      <span className="art-stw-word">sky</span>
      <span className="art-stw-bird">🐦</span>
      <span className="art-stw-key">⌨️</span>
    </div>
  )
}
