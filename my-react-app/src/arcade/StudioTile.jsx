import { Link } from 'react-router-dom'
import { preloadVoxelCraftStudio } from '../features/voxelcraft/lazy.js'

/**
 * Build & Create's card for the 3D Game Studio (VoxelCraft, its own full-page route /game).
 * The studio is a creative tool, not a registry game: it has no progress record, age range or
 * category of its own, so it gets this tool card instead of a game tile (and isn't counted in
 * the "N games" numbers). Since the header's mode slider replaced the old "3D Game Studio" tab,
 * this card is the studio's way in from the home page (/game still opens it directly). It starts
 * downloading the studio on hover/focus.
 */

/** Tile art: a few stacked voxel blocks and a placement cursor. Plain SVG, nothing to download. */
function StudioArt() {
  const block = (x, y, top, side, front) => (
    <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
      <path d="M0 8 L14 0 L28 8 L14 16 Z" fill={top} stroke="#1b2a49" strokeWidth="2" strokeLinejoin="round" />
      <path d="M0 8 L14 16 L14 32 L0 24 Z" fill={side} stroke="#1b2a49" strokeWidth="2" strokeLinejoin="round" />
      <path d="M28 8 L14 16 L14 32 L28 24 Z" fill={front} stroke="#1b2a49" strokeWidth="2" strokeLinejoin="round" />
    </g>
  )
  return (
    <div className="art art-studio" aria-hidden="true">
      <svg viewBox="0 0 160 110" width="100%" height="100%" style={{ maxHeight: 140 }}>
        <ellipse cx="80" cy="96" rx="58" ry="9" fill="#1b2a49" opacity="0.15" />
        {block(52, 60, '#8fdcb2', '#4fb784', '#2e9e6b')}
        {block(80, 60, '#8fdcb2', '#4fb784', '#2e9e6b')}
        {block(66, 52, '#ffd27a', '#f2b33d', '#d8902a')}
        {block(66, 36, '#8fd0f7', '#3fa3ec', '#2a7fc0')}
        {block(94, 44, '#ff9aa3', '#e4333f', '#b9222d')}
        {/* the placement cursor: a dashed block waiting to be placed */}
        <path d="M108 30 L122 22 L136 30 L122 38 Z" fill="none" stroke="#1b2a49" strokeWidth="2" strokeDasharray="4 3" />
        <path d="M30 34 l6 -10 l6 10 l-4 0 l0 8 l-4 0 l0 -8 Z" fill="#fff" stroke="#1b2a49" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export default function StudioTile({ text, index }) {
  const copy = text.studioCard
  return (
    <li className="game-tile is-tool is-leaf" style={{ viewTransitionName: 'tool-studio', '--i': index }}>
      <Link
        className="game-tile-link"
        to="/game"
        aria-label={copy.label}
        onPointerEnter={preloadVoxelCraftStudio}
        onFocus={preloadVoxelCraftStudio}
        onTouchStart={preloadVoxelCraftStudio}
      >
        <div className="game-tile-art">
          <StudioArt />
          <span className="game-tile-badge is-tool">{copy.badge}</span>
        </div>
        <div className="game-tile-body">
          <h3>{copy.title}</h3>
          <p>{copy.tagline}</p>
          <p className="game-tile-meta">
            <span>{copy.skill}</span>
          </p>
        </div>
        <span className="game-tile-play is-create" aria-hidden="true">{copy.open}</span>
      </Link>
    </li>
  )
}
