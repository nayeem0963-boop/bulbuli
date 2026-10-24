/**
 * BulbuliGame.jsx — page that wires the 3D bird to the score hook.
 *
 * Only this component re-renders when the score changes; GameCanvas is
 * memoised and `addPoints` is stable, so the 3D scene is untouched.
 *
 * Props follow the arcade convention in src/games/registry.js:
 *   playerId — signed-in Supabase user id, or 'guest'. If omitted, the
 *              current session is looked up once.
 */
import { useEffect, useState } from 'react'
import GameCanvas from './GameCanvas'
import { useScoreSync } from '../../hooks/useScoreSync'
import { supabase } from '../../supabaseClient.js'

const STATUS_TEXT = {
  saving: 'saving…',
  error: 'offline – will retry',
  guest: 'sign in to keep your stars',
}

export default function BulbuliGame({ playerId }) {
  const [sessionUserId, setSessionUserId] = useState(null)

  useEffect(() => {
    if (playerId) return // parent already knows who is playing
    let cancelled = false
    // getSession reads local storage — no network round-trip like getUser().
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSessionUserId(data.session?.user?.id ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [playerId])

  const { score, addPoints, status } = useScoreSync({ userId: playerId ?? sessionUserId })

  return (
    <section style={{ padding: 16, textAlign: 'center' }}>
      <div
        aria-live="polite"
        style={{ fontSize: 28, fontWeight: 800, color: '#8a4b12', marginBottom: 12 }}
      >
        ⭐ {score} XP
        <span style={{ fontSize: 14, fontWeight: 600, marginLeft: 8, opacity: 0.6 }}>
          {STATUS_TEXT[status] ?? ''}
        </span>
      </div>

      <GameCanvas onTap={addPoints} pointsPerTap={1} />

      <p style={{ color: '#8a4b12', opacity: 0.8 }}>Tap Bulbuli to earn stars! Drag to spin.</p>
    </section>
  )
}
