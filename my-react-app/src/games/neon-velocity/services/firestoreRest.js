/*
 * Minimal Firebase client over REST — no SDK, no extra npm dependency.
 *
 *   Auth:      anonymous sign-in (Identity Toolkit), token refresh (Secure Token),
 *              refresh token persisted in localStorage → stable uid per device.
 *   Firestore: get / set (PATCH) a document, runQuery, count aggregation.
 *
 * Configure with Vite env vars (see .env.example):
 *   VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID
 * Enable "Anonymous" sign-in in Firebase Console → Authentication.
 */

const AUTH_KEY = 'neonVelocity.firebaseAuth'

export function firebaseConfig() {
  // Direct property access so Vite can statically inline the values
  const apiKey = import.meta.env?.VITE_FIREBASE_API_KEY
  const projectId = import.meta.env?.VITE_FIREBASE_PROJECT_ID
  return apiKey && projectId ? { apiKey, projectId } : null
}

// ── Value encoding (Firestore typed JSON ↔ plain JS) ──

export function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (typeof v === 'string') return { stringValue: v }
  if (v instanceof Date) return { timestampValue: v.toISOString() }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } }
  if (typeof v === 'object') return { mapValue: { fields: toFields(v) } }
  throw new Error(`Unsupported Firestore value: ${typeof v}`)
}
export const toFields = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toValue(v)]))

export function fromValue(v) {
  if ('nullValue' in v) return null
  if ('booleanValue' in v) return v.booleanValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('stringValue' in v) return v.stringValue
  if ('timestampValue' in v) return new Date(v.timestampValue)
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(fromValue)
  if ('mapValue' in v) return fromFields(v.mapValue.fields ?? {})
  return undefined
}
export const fromFields = (fields = {}) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromValue(v)]))

// ── Client ──

export class FirebaseRestClient {
  constructor({ apiKey, projectId }, { fetchImpl = globalThis.fetch?.bind(globalThis), storage = globalThis.localStorage } = {}) {
    this.apiKey = apiKey
    this.projectId = projectId
    this.fetch = fetchImpl
    this.storage = storage
    this.base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
    this.session = this.loadSession()
    this.pending = null
  }

  loadSession() {
    try { return JSON.parse(this.storage?.getItem(AUTH_KEY) ?? 'null') } catch { return null }
  }
  saveSession(s) {
    this.session = s
    try { this.storage?.setItem(AUTH_KEY, JSON.stringify(s)) } catch { /* ignore */ }
  }

  get uid() { return this.session?.uid ?? null }

  /** Returns a valid ID token, signing in anonymously or refreshing as needed. */
  async token() {
    const s = this.session
    if (s?.idToken && s.expiresAt - 60_000 > Date.now()) return s.idToken
    if (this.pending) return this.pending
    this.pending = (s?.refreshToken ? this.refresh(s.refreshToken) : this.signInAnonymously())
      .finally(() => { this.pending = null })
    return this.pending
  }

  async signInAnonymously() {
    const res = await this.fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }),
    })
    const body = await jsonOrThrow(res, 'Anonymous sign-in failed')
    this.saveSession({
      uid: body.localId,
      idToken: body.idToken,
      refreshToken: body.refreshToken,
      expiresAt: Date.now() + Number(body.expiresIn) * 1000,
    })
    return body.idToken
  }

  async refresh(refreshToken) {
    const res = await this.fetch(`https://securetoken.googleapis.com/v1/token?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    })
    if (!res.ok) return this.signInAnonymously() // revoked/expired → new anonymous user
    const body = await res.json()
    this.saveSession({
      uid: body.user_id,
      idToken: body.id_token,
      refreshToken: body.refresh_token,
      expiresAt: Date.now() + Number(body.expires_in) * 1000,
    })
    return body.id_token
  }

  async request(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' }
    if (auth) headers.Authorization = `Bearer ${await this.token()}`
    const res = await this.fetch(`${this.base}${path}`, { method, headers, body: body && JSON.stringify(body) })
    if (res.status === 404 && method === 'GET') return null
    return jsonOrThrow(res, `Firestore ${method} ${path} failed`)
  }

  async getDoc(path) {
    const doc = await this.request(`/${path}`, { auth: false })
    return doc ? { id: doc.name.split('/').pop(), ...fromFields(doc.fields) } : null
  }

  /** Create or overwrite a document (PATCH = upsert). */
  async setDoc(path, data) {
    return this.request(`/${path}`, { method: 'PATCH', body: { fields: toFields(data) } })
  }

  /** Top-N query on a sub-collection, ordered by a field. */
  async query(parentPath, collectionId, { orderBy, direction = 'DESCENDING', limit = 50 }) {
    const rows = await this.request(`/${parentPath}:runQuery`, {
      method: 'POST',
      auth: false,
      body: {
        structuredQuery: {
          from: [{ collectionId }],
          orderBy: [{ field: { fieldPath: orderBy }, direction }],
          limit,
        },
      },
    })
    return (rows ?? []).filter((r) => r.document).map((r) => ({
      id: r.document.name.split('/').pop(),
      ...fromFields(r.document.fields),
    }))
  }

  /** COUNT(*) WHERE field > value — used to compute a rank without downloading the board. */
  async countGreater(parentPath, collectionId, field, value) {
    const rows = await this.request(`/${parentPath}:runAggregationQuery`, {
      method: 'POST',
      auth: false,
      body: {
        structuredAggregationQuery: {
          structuredQuery: {
            from: [{ collectionId }],
            where: { fieldFilter: { field: { fieldPath: field }, op: 'GREATER_THAN', value: toValue(value) } },
          },
          aggregations: [{ alias: 'n', count: {} }],
        },
      },
    })
    return Number(rows?.[0]?.result?.aggregateFields?.n?.integerValue ?? 0)
  }
}

async function jsonOrThrow(res, message) {
  if (res.ok) return res.json()
  let detail = ''
  try { detail = (await res.json())?.error?.message ?? '' } catch { /* ignore */ }
  const err = new Error(`${message} (${res.status}${detail ? `: ${detail}` : ''})`)
  err.status = res.status
  throw err
}
