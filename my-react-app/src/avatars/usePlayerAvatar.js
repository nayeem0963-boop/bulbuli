import { useCallback, useSyncExternalStore } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { levelForXp } from '../lib/levels.js'
import { isAvatarId, resolveAvatar } from './avatarCatalog.js'
import { parseLocalAvatar, pickNewest, readLocalAvatarRaw, saveLocalAvatar, subscribeLocalAvatar } from './avatarStore.js'

/**
 * The signed-in player's avatar, the same everywhere (dashboard header, arcade header).
 *
 *   const { avatar, selectedId, photoUrl, context, chooseAvatar } = usePlayerAvatar()
 *
 * avatar        the catalog entry to draw (their choice if still available, else the mascot)
 * selectedId    what they picked, or null if they never have
 * context       { level, hasPhoto }: what's unlocked
 * chooseAvatar  saves a choice: on this device at once, then to their account.
 *               Resolves { synced: false } if only the device copy could be saved.
 */
export function usePlayerAvatar() {
  const { user, profile, updateAvatar } = useAuth()
  const userId = user?.id ?? null
  const localRaw = useSyncExternalStore(subscribeLocalAvatar, () => readLocalAvatarRaw(userId), () => null)

  const meta = user?.user_metadata ?? {}
  const remote = isAvatarId(meta.avatar_id) ? { id: meta.avatar_id, at: String(meta.avatar_updated_at ?? '') } : null
  const selectedId = pickNewest(remote, parseLocalAvatar(localRaw))?.id ?? null

  // the profile photo the account already has (Google sign-in), never overwritten by avatars
  const photoUrl = profile?.avatar_url || meta.avatar_url || meta.picture || ''
  const context = { level: levelForXp(profile?.xp ?? 0), hasPhoto: Boolean(photoUrl) }

  const chooseAvatar = useCallback(async (id) => {
    if (!userId || !isAvatarId(id)) return { synced: false }
    const at = new Date().toISOString()
    saveLocalAvatar(userId, id, at)
    try {
      await updateAvatar(id, at)
      return { synced: true }
    } catch (error) {
      console.warn('[avatar] saved on this device; could not save to the account yet', error)
      return { synced: false }
    }
  }, [userId, updateAvatar])

  return { avatar: resolveAvatar(selectedId, context), selectedId, photoUrl, context, chooseAvatar }
}
