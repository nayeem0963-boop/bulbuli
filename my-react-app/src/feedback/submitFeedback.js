import { isSupabaseConfigured, supabase } from '../supabaseClient.js'
import { trackFeedbackSubmitted } from '../analytics/trackers.js'

export const REACTIONS = ['fun', 'okay', 'dislike']
export const FEEDBACK_TAGS = ['too_hard', 'boring', 'glitchy', 'confusing']

/**
 * Logs the analytics event and keeps the answer in `game_feedback`, where it can be read
 * per game. Fire and forget: a child never waits on this and never sees an error.
 */
export function submitFeedback({ gameId, reaction, tags, trigger, language }) {
  if (!REACTIONS.includes(reaction)) return
  const cleanTags = reaction === 'fun' ? [] : tags.filter((tag) => FEEDBACK_TAGS.includes(tag))
  trackFeedbackSubmitted({ gameId, reaction, tags: cleanTags, trigger })
  if (!isSupabaseConfigured) return

  supabase
    .from('game_feedback')
    .insert({ game_id: gameId, reaction, tags: cleanTags, trigger, language })
    .then(({ error }) => { if (error) console.warn('Bulbuli feedback was not saved.', error) })
}
