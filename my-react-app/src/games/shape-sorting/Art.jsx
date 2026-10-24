// Home-page tile picture: plain DOM + CSS (styles in src/arcade/arcade.css),
// so three.js stays out of the home page bundle.
export default function ShapeSortingArt() {
  return (
    <div className="art art-shape-sorting" aria-hidden="true">
      <span className="art-ss-belt">
        <span className="art-ss-cube" />
        <span className="art-ss-ball" />
      </span>
      <span className="art-ss-bin" />
    </div>
  )
}
