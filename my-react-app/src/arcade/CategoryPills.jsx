import { Link, useLocation } from 'react-router-dom'
import { CATEGORY_AGES, CATEGORY_FILTERS, CATEGORY_ICONS } from '../games/categories.js'
import { formatDigits } from '../utils/mathHeroText.js'
import { playPath } from './zone.js'

/**
 * The audience pills above the game grid: All Games · Young Learners · Logic & Typing ·
 * Arcade. Each pill is a real link to its address (/?category=arcade …), so it
 * can be shared, opened in a new tab and read by search engines; switching plays a view
 * transition (cards glide to their new places) where the browser supports it.
 *
 * The row wraps (a 2 × 2 grid on phones). `filters` lists the pills to show: the home page passes
 * only the audiences the current mode has, so no pill leads to an empty grid.
 */
export default function CategoryPills({ category, counts, filters = CATEGORY_FILTERS, text, language }) {
  const { search } = useLocation()
  return (
    <nav className="category-pills" aria-label={text.filterLabel}>
      <ul className="category-pills-list">
        {filters.map((id) => {
          const active = id === category
          const ages = CATEGORY_AGES[id]
          return (
            <li key={id}>
              <Link
                className={`category-pill is-${id}${active ? ' is-active' : ''}`}
                to={playPath(id, search)}
                aria-current={active ? 'page' : undefined}
                viewTransition
                preventScrollReset
              >
                <span className="category-pill-icon" aria-hidden="true">{CATEGORY_ICONS[id]}</span>
                <span className="category-pill-text">
                  <span className="category-pill-label">{text.filters[id]}</span>
                  {ages && <span className="category-pill-ages">{text.ages(formatDigits(ages, language))}</span>}
                </span>
                <span className="category-pill-count" aria-hidden="true">{formatDigits(counts[id] ?? 0, language)}</span>
                <span className="visually-hidden">, {text.gameCount(formatDigits(counts[id] ?? 0, language))}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
