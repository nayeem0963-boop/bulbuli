import { useId, useState } from 'react'
import { useModalDialog } from '../badges/useModalDialog.js'
import { AVATAR_GROUPS, AVATARS, DEFAULT_AVATAR_ID, getAvatar, lockReason } from './avatarCatalog.js'
import PlayerAvatar from './PlayerAvatar.jsx'

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

/**
 * "Choose your avatar" dialog. The options are real radio buttons, so arrow keys move
 * between them; locked ones are disabled and say how to unlock them.
 */
export default function AvatarPicker({ currentId, name, photoUrl, context, onSave, onClose }) {
  const dialogProps = useModalDialog(onClose)
  const titleId = useId()
  const groupName = useId()
  const [picked, setPicked] = useState(currentId ?? DEFAULT_AVATAR_ID)
  const [saving, setSaving] = useState(false)

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    await onSave(picked)
    setSaving(false)
  }

  const pickedAvatar = getAvatar(picked)

  return (
    <dialog {...dialogProps} className="av-dialog" aria-labelledby={titleId}>
      <form className="av-form" onSubmit={save}>
        <header className="av-head">
          <span className="av-preview"><PlayerAvatar avatar={pickedAvatar} name={name} photoUrl={photoUrl} /></span>
          <div>
            <h2 id={titleId} className="av-title">Choose your avatar</h2>
            <p className="av-sub">{pickedAvatar?.name}: this is how you'll look on Bulbuli.</p>
          </div>
          <button type="button" className="av-x" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </header>

        <div className="av-body">
          {AVATAR_GROUPS.map(([group, label]) => (
            <fieldset key={group} className="av-group">
              <legend className="av-legend">{label}</legend>
              <div className="av-grid">
                {AVATARS.filter((avatar) => avatar.group === group).map((avatar) => {
                  const locked = lockReason(avatar, context)
                  return (
                    <label key={avatar.id} className={`av-option${locked ? ' is-locked' : ''}`} title={locked ?? (avatar.species ? `${avatar.name} the ${avatar.species}` : avatar.name)}>
                      <input
                        className="av-radio"
                        type="radio"
                        name={groupName}
                        value={avatar.id}
                        checked={picked === avatar.id}
                        disabled={Boolean(locked)}
                        onChange={() => setPicked(avatar.id)}
                      />
                      <span className="av-ring">
                        <PlayerAvatar avatar={avatar} name={name} photoUrl={photoUrl} />
                        {locked && <span className="av-lock"><LockIcon /></span>}
                        <span className="av-check" aria-hidden="true">
                          <svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10" /></svg>
                        </span>
                      </span>
                      <span className="av-name">{avatar.name}</span>
                      {locked && <span className="av-hint">{locked}</span>}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <footer className="av-foot">
          <button type="button" className="db-btn db-btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="db-btn db-btn-primary" disabled={saving || picked === currentId}>
            {saving ? 'Saving…' : 'Save avatar'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
