import { useEffect } from 'react'

/**
 * Sets the tab title and description for a grammar page. App's RouteTitle sets a general
 * grammar title first; this runs after it (and again when the language changes), so it wins.
 */
export function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  }, [title, description])
}
