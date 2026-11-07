import { useState } from 'react'
import { Link } from 'react-router-dom'
import { gamePath, getGame } from '../games/registry.js'
import { COURSE_CATALOG } from '../courses/catalog.js'
import { QuizArt } from '../arcade/QuizTile.jsx'
import { StudioArt } from '../arcade/StudioTile.jsx'
import { preloadVoxelCraftStudio } from '../features/voxelcraft/lazy.js'
import { useFavorites } from '../favorites/FavoritesContext.jsx'
import { FEEDBACK_TEXT } from '../feedback/text.js'
import '../favorites/favorite-button.css'
import './catalog.css'
import { formatDigits } from '../utils/mathHeroText.js'
import { launchPath, learnPath } from '../arcade/zone.js'
import { CATEGORY_ICONS, CATEGORY_LABELS, hasModePicker, playableModes } from './learningCatalog.js'

/**
 * One home-page card for a learning-catalogue entry (src/catalog/learningCatalog.js).
 *
 * It looks like the arcade's game tiles (same .game-tile classes in arcade.css) and tells a
 * grown-up at a glance: what the learner will learn, the ages, the learning category and the level.
 *
 * Where the card goes:
 *   several modes      → the mode picker over the grid (/?learn=<entry>, ModePicker.jsx)
 *   one game mode      → the game's own page, or its launcher dialog (?play=<id>) as before
 *   the course         → its standalone page (full page load)
 *   the studio         → /game (starts downloading on hover/focus)
 */

const HTML_COURSE = COURSE_CATALOG.find((course) => course.id === 'html')

/** The card's picture: a registry game's tile art, or the course / studio art. */
export function CatalogArt({ entry }) {
  if (entry.art === 'quiz') return <QuizArt />
  if (entry.art === 'studio') return <StudioArt />
  const Art = getGame(entry.art?.game)?.Art
  return Art ? <Art /> : null
}

/** The course card counts its questions and levels from the course data (kept in step by courses.test.js). */
function taglineFor(entry, language) {
  if (entry.kind !== 'course' || !HTML_COURSE) return entry.tagline[language]
  return language === 'bn'
    ? `<html> থেকে ফর্ম, সেমান্টিক HTML আর অ্যাক্সেসিবিলিটি পর্যন্ত ${formatDigits(String(HTML_COURSE.levelCount), 'bn')}টি লেভেলে ${formatDigits(String(HTML_COURSE.questionCount), 'bn')}টি প্রশ্ন, প্রতিটির সাথে ছোট্ট পাঠ (ইংরেজিতে)।`
    : `${HTML_COURSE.questionCount} questions in ${HTML_COURSE.levelCount} levels, from <html> to forms, semantic HTML and accessibility. Each has a mini-lesson.`
}

/**
 * The ❤️ on a card. Favourites stay saved per registry game, as before (device or account), so
 * nothing is migrated: a card shows ❤️ when any of its games is a favourite. Tapping a red heart
 * removes them all; tapping an empty one saves the card's first game.
 */
function CatalogFavoriteButton({ entry, title, language }) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const [pop, setPop] = useState(false)
  const ids = entry.favoriteIds ?? []
  if (ids.length === 0) return null
  const on = ids.some((id) => isFavorite(id))
  const text = FEEDBACK_TEXT[language] ?? FEEDBACK_TEXT.en
  const label = on ? text.favRemove(title) : text.favAdd(title)

  const onClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (on) {
      ids.filter((id) => isFavorite(id)).forEach((id) => toggleFavorite(id, { source: 'game_tile' }))
    } else {
      setPop(true)
      toggleFavorite(ids[0], { source: 'game_tile' })
    }
  }

  return (
    <button
      type="button"
      className={`fav-button is-on-tile${on ? ' is-on' : ''}${pop ? ' is-pop' : ''}`}
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={onClick}
      onAnimationEnd={() => setPop(false)}
    >
      <span aria-hidden="true">{on ? '❤️' : '🤍'}</span>
    </button>
  )
}

/** Where a card's link goes, and how. */
function cardTarget(entry, category, search) {
  if (hasModePicker(entry)) {
    return { to: learnPath(category, entry.id, search), state: { fromTile: true }, dialog: true }
  }
  const [mode] = playableModes(entry)
  if (mode?.href) return { href: mode.href }
  if (mode?.to) return { to: mode.to }
  const game = getGame(mode?.gameId)
  if (game?.launch === 'modal') {
    return { to: launchPath(category, game.id, search), state: { fromTile: true }, dialog: true }
  }
  return { to: `${gamePath(game)}${mode?.search ?? ''}` }
}

export default function CatalogTile({ entry, language, text, category, search, index }) {
  const title = entry.title[language]
  const target = cardTarget(entry, category, search)
  const tool = entry.kind === 'tool'
  const multi = hasModePicker(entry)
  const ready = playableModes(entry).length
  const label = tool ? text.studioCard.label : multi ? text.chooseModeFor(title) : text.playGame(title)
  const categoryName = (CATEGORY_LABELS[language] ?? CATEGORY_LABELS.en)[entry.category]

  const inner = (
    <>
      <div className="game-tile-art">
        <CatalogArt entry={entry} />
        {multi && <span className="game-tile-badge is-modes">{text.modesBadge(formatDigits(ready, language))}</span>}
        {tool && <span className="game-tile-badge is-tool">{text.studioCard.badge}</span>}
      </div>
      <div className="game-tile-body">
        <h3>{title}</h3>
        <p>{taglineFor(entry, language)}</p>
        <p className="catalog-learn">
          <span className="catalog-learn-label">🎓 {text.learnLabel}:</span> {entry.learn[language]}
        </p>
        <p className="game-tile-meta catalog-meta">
          <span className={`catalog-chip is-${entry.category}`}>
            <i className="catalog-chip-icon" aria-hidden="true">{CATEGORY_ICONS[entry.category]} </i>{categoryName}
          </span>
          <span className="catalog-chip is-level">{text.levelLabel(entry.level[language])}</span>
          <span>{text.ages(formatDigits(entry.ages, language))}</span>
        </p>
      </div>
      <span className={`game-tile-play${tool ? ' is-create' : ''}`} aria-hidden="true">
        {tool ? text.studioCard.open : text.play}
      </span>
    </>
  )

  const preload = tool
    ? { onPointerEnter: preloadVoxelCraftStudio, onFocus: preloadVoxelCraftStudio, onTouchStart: preloadVoxelCraftStudio }
    : {}

  return (
    <li
      className={`game-tile is-${entry.color}${entry.series ? ' is-series' : ''}${tool ? ' is-tool' : ''} is-catalog`}
      // a stable name per card lets a view transition glide each card to its new place when the
      // filter changes; --i staggers the fallback entrance animation
      style={{ viewTransitionName: `catalog-${entry.id}`, '--i': index }}
      data-entry={entry.id}
    >
      {target.href ? (
        // the course is its own page (quiz/index.html), so a plain link and a full page load
        <a className="game-tile-link" href={target.href} aria-label={label}>{inner}</a>
      ) : (
        <Link
          className="game-tile-link"
          to={target.to}
          state={target.state}
          aria-label={label}
          aria-haspopup={target.dialog ? 'dialog' : undefined}
          {...preload}
        >
          {inner}
        </Link>
      )}
      {/* beside the link, not inside it: a button can't live in a link, and tapping it must not open the game */}
      <CatalogFavoriteButton entry={entry} title={title} language={language} />
    </li>
  )
}
