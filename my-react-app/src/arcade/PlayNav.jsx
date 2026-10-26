import { Link } from 'react-router-dom'

/** The "Play" tab: the site's one section. Always current; links home to the games. */
export default function PlayTab({ text }) {
  return (
    <Link className="play-tab" to="/" aria-current="page">
      <span aria-hidden="true">🎮</span> {text.navPlay}
    </Link>
  )
}
