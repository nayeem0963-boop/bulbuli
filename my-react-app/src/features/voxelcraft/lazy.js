import { lazyWithPreload } from '../../shared/lib/lazyWithPreload.js'

/**
 * VoxelCraftStudio as a lazy component, for the host app's router: three.js, the game and its
 * scoped styles download only when /game is first opened (or preloaded), and a chunk that fails
 * to load (flaky connection, fresh deploy) is retried once.
 */
export const VoxelCraftStudioLazy = lazyWithPreload(() => import('./VoxelCraftStudio.jsx'))

/** Starts the download early, e.g. when the player points at the "3D Game Studio" tab. */
export const preloadVoxelCraftStudio = () => {
  VoxelCraftStudioLazy.preload().catch(() => {})
}
