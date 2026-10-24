// Home-page tile picture: plain DOM + CSS, so three.js stays out of the home page bundle.
export default function ShapeHuntArt() {
  return (
    <div className="art art-shape-hunt" aria-hidden="true">
      <span className="art-sh-cube" />
      <span className="art-sh-ball" />
      <span className="art-sh-cone" />
    </div>
  )
}
