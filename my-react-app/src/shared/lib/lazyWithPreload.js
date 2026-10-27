// @ts-check
import { lazy } from 'react'

/**
 * React.lazy() with two extras for heavy 3D chunks:
 *
 *   • `.preload()` starts the download early (while a child is still on a level picker or a
 *     launcher), so the scene is often ready by the time it mounts. It's safe to call many times.
 *   • One quiet retry when the chunk fails to load (a dropped connection on a phone, or a fresh
 *     deploy that replaced the old hashed file). If the retry fails too, the error reaches the
 *     nearest error boundary as usual, and the next `.preload()` / mount tries again from scratch.
 *
 * Vite needs a literal path inside import() to split and pre-bundle the chunk, so always pass an
 * arrow with a static string:  lazyWithPreload(() => import('./ShapeScene.jsx'))
 *
 * Fast Refresh: create these at module level (never inside a component), and keep this helper in a
 * plain .js file. A .jsx file that exports only components keeps HMR working; this file exports none.
 *
 * @template {import('react').ComponentType<any>} T
 * @param {() => Promise<{ default: T }>} factory  () => import('./Scene.jsx')
 * @param {{ retryDelayMs?: number }} [options]
 * @returns {import('react').LazyExoticComponent<T> & { preload: () => Promise<{ default: T }> }}
 */
export function lazyWithPreload(factory, { retryDelayMs = 800 } = {}) {
  /** @type {Promise<{ default: T }> | null} */
  let pending = null

  const load = () => {
    pending ??= factory()
      .catch(() => new Promise((resolve) => setTimeout(resolve, retryDelayMs)).then(factory))
      .catch((error) => {
        pending = null // let a later attempt start fresh
        throw error
      })
    return pending
  }

  return Object.assign(lazy(load), { preload: load })
}

/**
 * Turns a module's named export into the `{ default }` shape React.lazy expects.
 *   lazyWithPreload(() => import('./GameCanvas.jsx').then(named('GameCanvas')))
 *
 * @template {string} K
 * @param {K} name
 * @returns {<M extends Record<K, any>>(module: M) => { default: M[K] }}
 */
export const named = (name) => (module) => ({ default: module[name] })
