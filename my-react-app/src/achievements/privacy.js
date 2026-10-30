/**
 * How much of a child's name leaves their own screen. Pure helpers, mirrored by
 * verify_certificate() in supabase/migrations/20261030000000_certificates.sql.
 *
 *   'full'        Nayeem Hasan
 *   'first_name'  Nayeem            (the default)
 *   'initials'    N. H.
 *   'hidden'      (no name)
 *
 * The printed certificate is the child's own copy and always shows their full name. This
 * setting decides what the public verification page and the share image show.
 */
export const NAME_DISPLAY_OPTIONS = [
  { id: 'first_name', label: 'First name only', example: (n) => publicName(n, 'first_name') },
  { id: 'initials', label: 'Initials only', example: (n) => publicName(n, 'initials') },
  { id: 'full', label: 'Full name', example: (n) => publicName(n, 'full') },
  { id: 'hidden', label: 'No name', example: () => 'A Bulbuli learner' },
]

export const DEFAULT_NAME_DISPLAY = 'first_name'

export const isNameDisplay = (value) => NAME_DISPLAY_OPTIONS.some((option) => option.id === value)

/** The name as the public sees it, or '' when it should be hidden. */
export function publicName(name, mode = DEFAULT_NAME_DISPLAY) {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  switch (isNameDisplay(mode) ? mode : DEFAULT_NAME_DISPLAY) {
    case 'full': return words.join(' ')
    case 'initials': return words.map((word) => `${[...word][0].toUpperCase()}.`).join(' ')
    case 'hidden': return ''
    default: return words[0]
  }
}

/**
 * Whether the avatar may go on a share image. Animal and bird avatars are cartoons, so they
 * may; a real photo only when the full name is shown too, and never when the name is hidden.
 */
export function mayShareAvatar(avatar, mode = DEFAULT_NAME_DISPLAY) {
  if (!avatar || mode === 'hidden') return false
  return avatar.kind !== 'photo' || mode === 'full'
}
