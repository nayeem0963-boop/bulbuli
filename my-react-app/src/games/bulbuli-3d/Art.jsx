// Home-page tile picture. Plain DOM + CSS only, so three.js is NOT pulled
// into the home page bundle — it loads only when the game is opened.
export default function Bulbuli3DArt() {
  return (
    <div className="art art-bulbuli-3d" aria-hidden="true">
      <span className="art-b3d-orbit" />
      <span className="art-b3d-bird">🐦</span>
      <span className="art-b3d-star">⭐</span>
    </div>
  )
}
