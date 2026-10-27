// The 3D scene as a lazy chunk (three.js, R3F and drei download only when Math Master opens).
// Kept out of Stage.jsx so that file exports only components (Fast Refresh).
import { lazyWithPreload } from '../../../shared/lib/lazyWithPreload.js'

export const MathMasterScene = lazyWithPreload(() => import('../scene/MathMasterScene.jsx'))

/** Start downloading three.js while the player is still on the level map. */
export const preloadScene = () => MathMasterScene.preload().catch(() => {})
