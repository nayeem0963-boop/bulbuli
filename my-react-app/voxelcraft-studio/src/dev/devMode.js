/**
 * Dev / Test Mode availability.
 *
 *   - `npm run dev` (Vite dev server): always available.
 *   - production builds: hidden unless opted in with `?devtools=1` (remembered on this device);
 *     `?devtools=0` turns it off again. Players never stumble into it.
 *
 * Decided once at startup; the Profile's Dev / Test panel and the live voter simulation read it.
 */
const KEY = 'voxelcraft:devtools'

function detect() {
  if (typeof window === 'undefined') return false
  try {
    const flag = new URLSearchParams(window.location.search).get('devtools')
    if (flag === '1') window.localStorage.setItem(KEY, '1')
    if (flag === '0') window.localStorage.removeItem(KEY)
  } catch {
    // storage blocked: fall through to the build flag
  }
  if (import.meta.env?.DEV) return true
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export const DEV_TOOLS = detect()
