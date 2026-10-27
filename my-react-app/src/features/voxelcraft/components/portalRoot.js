import { createContext, useContext } from 'react'

/**
 * Where VoxelCraft's full-screen overlays are portalled to. VoxelCraftStudio provides its own
 * root element, so overlays stay inside `#voxelcraft-root`: the scoped styles still apply to
 * them, and nothing is left behind in the host page's <body>.
 */
export const PortalRootContext = createContext(null)

/** The element to portal into (document.body only if rendered outside VoxelCraftStudio). */
export function usePortalRoot() {
  return useContext(PortalRootContext) ?? (typeof document === 'undefined' ? null : document.body)
}
