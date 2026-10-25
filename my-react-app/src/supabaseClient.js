import { createClient } from '@supabase/supabase-js'

// The app's single Supabase client. Import it from here everywhere.
//
// Needs, in .env (or Netlify's environment settings):
//   VITE_SUPABASE_URL=https://<project>.supabase.co
//   VITE_SUPABASE_ANON_KEY=<anon public key>
//
// Games are open to everyone, so a missing config must never break the arcade:
// the client is still created (against a placeholder), sign-in is hidden,
// and XP simply stays on the device.
const env = import.meta.env ?? {} // undefined under `node --test`
const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. '
    + 'Games still work; sign-in and cloud XP are turned off.',
  )
}

export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'public-anon-key-missing',
  {
    auth: {
      persistSession: true, // keep players signed in across visits
      autoRefreshToken: true,
      detectSessionInUrl: true, // finishes Google sign-in and email links on /auth/callback
    },
  },
)

/** Where Supabase sends players back after Google sign-in or an email link. */
export function authCallbackUrl() {
  return `${window.location.origin}/auth/callback`
}
