import { Link, useLocation } from 'react-router-dom'
import { CATALOG_FILTERS, CATEGORY_ICONS, CATEGORY_LABELS } from '../catalog/learningCatalog.js'
import { formatDigits } from '../utils/mathHeroText.js'
import { playPath } from './zone.js'

/**
 * The learning-category pills above the game grid: All · Maths & Numbers · Shapes & Space ·
 * Letters & Typing · Coding · Create & Design (src/catalog/learningCatalog.js). Each pill is a
 * real link to its address (/?category=math …), so it can be shared, opened in a new tab and read by search engines; switching plays a view
 * transition (cards glide to their new places) where the browser supports it.
 *
 * The row wraps on phones. `filters` lists the pills to show: the home page passes
 * only the categories the current mode has, so no pill leads to an empty grid.
 */
export default function CategoryPills({ category, counts, filters = CATALOG_FILTERS, text, language }) {
  const { search } = useLocation()
  return (
    <nav className="category-pills" aria-label={text.filterLabel}>
      <ul className="category-pills-list">
        {filters.map((id) => {
          const active = id === category
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
                  <span className="category-pill-label">{(CATEGORY_LABELS[language] ?? CATEGORY_LABELS.en)[id]}</span>
                </span>
                <span className="category-pill-count" aria-hidden="true">{formatDigits(counts[id] ?? 0, language)}</span>
                <span className="visually-hidden">, {text.entryCount(formatDigits(counts[id] ?? 0, language))}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
