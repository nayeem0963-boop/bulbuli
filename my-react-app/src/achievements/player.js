/**
 * The name and avatar that go on certificates and share images, from the same sources the
 * dashboard uses. The email address is never used as a name here.
 */
export function certificateName(user, profile) {
  const meta = user?.user_metadata ?? {}
  const name = [profile?.username, meta.full_name, meta.name].find((value) => typeof value === 'string' && value.trim())
  return name ? name.trim().slice(0, 40) : 'Bulbuli Learner'
}
