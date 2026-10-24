/** Home-page tile: a tiny browser window with a centred flex row, and a line of CSS. */
export default function DevCraftArt() {
  return (
    <div className="art art-dev" aria-hidden="true">
      <div className="art-dev-window">
        <span className="art-dev-bar"><i /><i /><i /></span>
        <span className="art-dev-row"><b /><b className="is-accent" /><b /></span>
      </div>
      <code className="art-dev-code">{'{ display: flex }'}</code>
    </div>
  )
}
