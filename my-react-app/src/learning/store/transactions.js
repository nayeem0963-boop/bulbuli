/**
 * Every write to learning progress, each as ONE IndexedDB readwrite transaction (design 2.2–2.3,
 * 2.11, 4.3–4.4.2).
 *
 * Rules enforced here:
 *   - Duplicate checks run inside the same transaction as the write, so concurrent tabs (which
 *     IndexedDB serialises) can never both award the same event (design 2.5).
 *   - Nothing awaited inside a transaction except IndexedDB requests (no auto-commit surprises).
 *   - A rejected action (stale visit, flight not active, …) aborts the transaction: no writes.
 *   - XP lives only in totals.learningXp and only changes together with the events that justify it.
 *   - A server reply never changes totals (markSync).
 *   - Rounds are never deleted.
 *
 * Results: { ok: true, ... } after the transaction COMMITTED (oncomplete), or
 *          { ok: false, reason } when the action was refused (transaction aborted, nothing written).
 * Unexpected failures reject the promise; nothing was written either.
 */
import { eventKeys as defaultKeys } from '../eventKeys.js'
import { serverEventId, isUuid } from '../eventId.js'
import { flightCandidates, reportCandidates, reportStars, skyStars, stationXp } from '../xpRules.js'

export const SKY_GAME_ID = 'sky-runner' // XP game id the new game takes over at release (design 0.4)
export const WORLD_GAME_ID = 'skyward-explorer'
export const SYNC_STATES = ['none', 'local-only', 'pending', 'verifying', 'done', 'conflict', 'rejected']
export const STATION_STEPS = ['observe', 'investigate']

/** A refusal: aborts the transaction and resolves { ok: false, reason }. */
export class Refusal extends Error {
  constructor(reason, detail) {
    super(reason)
    this.name = 'Refusal'
    this.reason = reason
    this.detail = detail
  }
}

export class InjectedAbort extends Error {
  constructor(point) {
    super(`injected abort at ${point}`)
    this.name = 'InjectedAbort'
  }
}

const req = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

const nowIso = () => new Date().toISOString()

/**
 * Runs `work(stores, tx)` in one readwrite transaction and resolves only after oncomplete.
 * `inject` (tests only): 'abort-before-commit' aborts after the work's writes were issued.
 */
export function runTx(db, storeNames, work, { inject } = {}) {
  return new Promise((resolve, reject) => {
    let tx
    try {
      tx = db.transaction(storeNames, 'readwrite', { durability: 'strict' })
    } catch (error) {
      reject(error)
      return
    }
    const stores = Object.fromEntries(storeNames.map((name) => [name, tx.objectStore(name)]))
    let result
    let failure = null
    tx.oncomplete = () => resolve(result)
    tx.onabort = () => {
      if (failure instanceof Refusal) resolve({ ok: false, reason: failure.reason, detail: failure.detail })
      else reject(failure ?? tx.error ?? new Error('transaction aborted'))
    }
    tx.onerror = (event) => {
      // let onabort report it; prevent the default "uncaught" noise
      event?.preventDefault?.()
    }
    Promise.resolve()
      .then(() => work(stores, tx))
      .then((value) => {
        result = value
        if (inject === 'abort-before-commit') {
          failure = new InjectedAbort('before-commit')
          tx.abort()
        }
      })
      .catch((error) => {
        failure = error
        try { tx.abort() } catch { /* already finished */ }
      })
  })
}

/* ------------------------------------------------------------------ helpers */

async function getTotals(stores, playerId) {
  return (await req(stores.totals.get(playerId))) ?? { playerId, learningXp: 0 }
}

async function addXp(stores, playerId, xp) {
  const totals = await getTotals(stores, playerId)
  const next = { ...totals, learningXp: totals.learningXp + xp, updatedAt: nowIso() }
  stores.totals.put(next)
  return next
}

/** Records the new event keys and returns those that were new. An existing row of ANY shape blocks. */
async function recordNewEvents(stores, playerId, roundKey, candidates) {
  const fresh = []
  const seen = new Set()
  for (const candidate of candidates) {
    if (seen.has(candidate.eventKey)) continue
    seen.add(candidate.eventKey)
    const existing = await req(stores.events.get([playerId, candidate.eventKey]))
    if (existing !== undefined) continue // fail closed: any existing row means "already recorded"
    stores.events.put({ playerId, eventKey: candidate.eventKey, roundKey, xp: candidate.xp, kind: candidate.kind, at: nowIso() })
    fresh.push(candidate)
  }
  return fresh
}

function sealFields(round, account) {
  const userId = account?.userId
  const hasXp = round.xp > 0
  if (!hasXp) return { sync: 'none', eventId: undefined, userId: undefined }
  if (userId && isUuid(userId) && userId === round.playerId) {
    return {
      sync: 'pending',
      userId,
      eventId: serverEventId({ userId, gameId: round.gameId, eventType: round.kind === 'visit' ? 'visit' : 'round', roundKey: round.roundKey }),
    }
  }
  return { sync: 'local-only', eventId: undefined, userId: undefined }
}

function withSyncDetail(round) {
  return { ...round, syncDetail: round.syncDetail ?? { attempts: 0, lastAttemptAt: null, lastError: null, confirmedBy: null, history: [] } }
}

function seal(round, account) {
  const fields = sealFields(round, account)
  const sealed = withSyncDetail({ ...round, status: 'sealed', sealedAt: nowIso(), ...fields })
  if (sealed.eventId === undefined) delete sealed.eventId
  if (sealed.userId === undefined) delete sealed.userId
  return sealed
}

async function getRecord(stores, playerId, gameId) {
  return (await req(stores.records.get([playerId, gameId]))) ?? { playerId, gameId }
}

const journalEntry = (type, data) => ({ type, at: nowIso(), ...data })

async function roundsForPlayer(stores, playerId) {
  const range = IDBKeyRange.bound([playerId, ''], [playerId, '￿'])
  return req(stores.rounds.getAll(range))
}

const ALL = ['events', 'rounds', 'totals', 'records']

/* ------------------------------------------------------------------ Sky Science */

/**
 * Starts a flight (design 2.11): creates the resume state with a new flight key.
 * spec: { flightKey, missionId, band, primaryCount, quickCheckCount, plan } — `plan` (the chosen
 * item ids and option orders) is stored so a resumed flight shows exactly the same questions.
 */
export function startFlight(db, { playerId, flightKey, missionId, band, primaryCount, quickCheckCount, plan = null }, opts) {
  return runTx(db, ['records', 'rounds'], async (stores) => {
    const existingRound = await req(stores.rounds.get([playerId, flightKey]))
    if (existingRound) throw new Refusal('flight-already-committed')
    const record = await getRecord(stores, playerId, SKY_GAME_ID)
    const activeFlight = {
      flightKey, missionId, band, primaryCount, quickCheckCount, plan, startedAt: nowIso(), answers: [],
    }
    stores.records.put({ ...record, band, activeFlight })
    return { ok: true, flightKey }
  }, opts)
}

/** Saves the learner's chosen age band (design 8.1: chosen by the learner or an adult, changeable). */
export function setSkyBand(db, { playerId, band }, opts) {
  return runTx(db, ['records'], async (stores) => {
    if (!['4-6', '7-8', '9-10'].includes(band)) throw new Refusal('invalid-band')
    const record = await getRecord(stores, playerId, SKY_GAME_ID)
    stores.records.put({ ...record, band })
    return { ok: true, band }
  }, opts)
}

/**
 * Commits one answer to the active flight. Feedback must only be shown after this resolves ok.
 * answer: { slot: 'primary' | 'return' | 'quickcheck', index, objectiveId, itemId, correct }
 */
export function recordAnswer(db, { playerId, flightKey, answer }, opts) {
  return runTx(db, ['records'], async (stores) => {
    const record = await getRecord(stores, playerId, SKY_GAME_ID)
    const flight = record.activeFlight
    if (!flight || flight.flightKey !== flightKey) throw new Refusal('flight-not-active')
    if (!['primary', 'return', 'quickcheck'].includes(answer.slot)) throw new Refusal('invalid-slot')
    if (typeof answer.correct !== 'boolean') throw new Refusal('invalid-answer')
    const sameSlot = (a) => a.slot === answer.slot && (answer.slot === 'return' ? a.objectiveId === answer.objectiveId : a.index === answer.index)
    const existing = flight.answers.find(sameSlot)
    if (existing) throw new Refusal('already-answered', existing)
    if (answer.slot === 'primary' && !(answer.index >= 0 && answer.index < flight.primaryCount)) throw new Refusal('invalid-index')
    if (answer.slot === 'quickcheck' && !(answer.index >= 0 && answer.index < flight.quickCheckCount)) throw new Refusal('invalid-index')
    if (answer.slot === 'return') {
      const first = flight.answers.find((a) => a.slot === 'primary' && a.objectiveId === answer.objectiveId)
      if (!first || first.correct) throw new Refusal('return-not-scheduled')
      if (answer.itemId === first.itemId) throw new Refusal('return-must-differ')
    }
    const stored = { ...answer, at: nowIso() }
    stores.records.put({ ...record, activeFlight: { ...flight, answers: [...flight.answers, stored] } })
    return { ok: true, answer: stored }
  }, opts)
}

/**
 * Completes the active flight: computes stars and XP from the COMMITTED answers, records new
 * events, the sealed round, the XP total and the record, and clears the resume state, all at once.
 * Calling it again for the same flight returns the stored result and adds nothing.
 */
export function commitFlight(db, { playerId, flightKey, policy, account, keys = defaultKeys }, opts) {
  return runTx(db, ALL, async (stores) => {
    const existingRound = await req(stores.rounds.get([playerId, flightKey]))
    if (existingRound) return { ok: true, alreadyCommitted: true, round: existingRound }
    const record = await getRecord(stores, playerId, SKY_GAME_ID)
    const flight = record.activeFlight
    if (!flight || flight.flightKey !== flightKey) throw new Refusal('flight-not-active')

    const primaries = flight.answers.filter((a) => a.slot === 'primary')
    const checks = flight.answers.filter((a) => a.slot === 'quickcheck')
    if (primaries.length !== flight.primaryCount || checks.length !== flight.quickCheckCount) {
      throw new Refusal('flight-incomplete')
    }
    const primary = primaries
      .sort((a, b) => a.index - b.index)
      .map((p) => {
        const ret = flight.answers.find((a) => a.slot === 'return' && a.objectiveId === p.objectiveId)
        return { objectiveId: p.objectiveId, firstTryCorrect: p.correct, secured: p.correct || Boolean(ret?.correct) }
      })
    const quickChecks = checks.sort((a, b) => a.index - b.index).map((q) => ({ itemId: q.itemId, correct: q.correct }))
    const stars = skyStars({ primary, quickChecks })
    const candidates = flightCandidates(policy, keys, { missionId: flight.missionId, band: flight.band, primary, quickChecks, stars })
    const fresh = await recordNewEvents(stores, playerId, flightKey, candidates)
    const xp = fresh.reduce((sum, c) => sum + c.xp, 0)

    const round = seal({
      playerId, roundKey: flightKey, gameId: SKY_GAME_ID, kind: 'flight',
      missionId: flight.missionId, band: flight.band, stars, xp,
      rewards: fresh.map(({ eventKey, xp: amount, kind }) => ({ eventKey, xp: amount, kind })),
      createdAt: flight.startedAt,
    }, account)
    stores.rounds.put(round)
    const totals = await addXp(stores, playerId, xp)

    const missions = { ...record.missions }
    const mission = missions[flight.missionId] ?? { bestStars: 0, bestStarsByBand: {} }
    missions[flight.missionId] = {
      bestStars: Math.max(mission.bestStars, stars),
      bestStarsByBand: { ...mission.bestStarsByBand, [flight.band]: Math.max(mission.bestStarsByBand?.[flight.band] ?? 0, stars) },
    }
    stores.records.put({ ...record, missions, activeFlight: null, lastFlight: { flightKey, stars, xp } })
    return { ok: true, round, totals, stars, xp }
  }, opts)
}

/** Discards an unfinished flight's resume state (D6, subject to the proposal). No XP. */
export function discardFlight(db, { playerId, flightKey }, opts) {
  return runTx(db, ['records'], async (stores) => {
    const record = await getRecord(stores, playerId, SKY_GAME_ID)
    if (!record.activeFlight || record.activeFlight.flightKey !== flightKey) throw new Refusal('flight-not-active')
    stores.records.put({ ...record, activeFlight: null })
    return { ok: true }
  }, opts)
}

/* ------------------------------------------------------------------ World Explorer */

function stationState(record, expedition, n) {
  return record.expeditions?.[expedition]?.stations?.[n] ?? { steps: {}, attempts: [], complete: false, replayAttempts: [] }
}

function putStation(record, expedition, n, station) {
  const expeditions = { ...record.expeditions }
  const exp = expeditions[expedition] ?? { stations: {}, reportFilings: 0, bestReportStars: 0 }
  expeditions[expedition] = { ...exp, stations: { ...exp.stations, [n]: station } }
  return { ...record, expeditions }
}

/** Loads the visit and refuses unless it exists, belongs to this expedition and is still OPEN. */
async function openVisitOrRefuse(stores, playerId, visitKey, expedition) {
  const visit = await req(stores.rounds.get([playerId, visitKey]))
  if (!visit || visit.kind !== 'visit') throw new Refusal('visit-not-found')
  if (visit.expedition !== expedition) throw new Refusal('visit-wrong-expedition')
  if (visit.status !== 'open') throw new Refusal('visit-sealed')
  return visit
}

/**
 * Starts a visit: seals every open visit of this player for this expedition AND creates the new
 * open visit, in one transaction (design 2.3, 4.4.1).
 */
export function startVisit(db, { playerId, expedition, visitKey, account }, opts) {
  return runTx(db, ['rounds'], async (stores) => {
    const all = await roundsForPlayer(stores, playerId)
    if (all.some((r) => r.roundKey === visitKey)) throw new Refusal('visit-key-in-use')
    const sealed = []
    for (const r of all) {
      if (r.kind === 'visit' && r.expedition === expedition && r.status === 'open') {
        const s = seal(r, account)
        stores.rounds.put(s)
        sealed.push(s)
      }
    }
    const visit = {
      playerId, roundKey: visitKey, gameId: WORLD_GAME_ID, kind: 'visit', expedition,
      status: 'open', xp: 0, rewards: [], createdAt: nowIso(),
    }
    stores.rounds.put(visit)
    return { ok: true, visit, sealed }
  }, opts)
}

/** Attaches a (stale) tab to the newest open visit without sealing anything (design 4.4.2). */
export function joinVisit(db, { playerId, expedition }, opts) {
  return runTx(db, ['rounds'], async (stores) => {
    const open = (await roundsForPlayer(stores, playerId))
      .filter((r) => r.kind === 'visit' && r.expedition === expedition && r.status === 'open')
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    if (!open.length) throw new Refusal('no-open-visit')
    return { ok: true, visit: open[0] }
  }, opts)
}

export function saveStationProgress(db, { playerId, visitKey, expedition, station, step }, opts) {
  return runTx(db, ['rounds', 'records'], async (stores) => {
    await openVisitOrRefuse(stores, playerId, visitKey, expedition)
    if (!STATION_STEPS.includes(step)) throw new Refusal('invalid-step')
    const record = await getRecord(stores, playerId, WORLD_GAME_ID)
    const s = stationState(record, expedition, station)
    if (step === 'investigate' && !s.steps.observe) throw new Refusal('observe-first')
    stores.records.put(putStation(record, expedition, station, { ...s, steps: { ...s.steps, [step]: true } }))
    return { ok: true }
  }, opts)
}

/**
 * Commits one Explain attempt (kept across visits, so a refresh can't reset hints).
 * Feedback must only be shown after this resolves ok.
 */
export function recordExplainAttempt(db, { playerId, visitKey, expedition, station, choice, correct }, opts) {
  return runTx(db, ['rounds', 'records'], async (stores) => {
    await openVisitOrRefuse(stores, playerId, visitKey, expedition)
    if (typeof correct !== 'boolean') throw new Refusal('invalid-answer')
    const record = await getRecord(stores, playerId, WORLD_GAME_ID)
    const s = stationState(record, expedition, station)
    if (!s.steps.observe || !s.steps.investigate) throw new Refusal('investigate-first')
    const attempt = { choice, correct, at: nowIso() }
    let next
    if (s.complete) {
      next = { ...s, replayAttempts: [...(s.replayAttempts ?? []), attempt] }
    } else {
      if (s.correctOnAttempt) throw new Refusal('already-answered')
      const attempts = [...s.attempts, attempt]
      next = { ...s, attempts, correctOnAttempt: correct ? attempts.length : undefined }
    }
    stores.records.put(putStation(record, expedition, station, next))
    return { ok: true, attemptNumber: s.complete ? next.replayAttempts.length : next.attempts.length }
  }, opts)
}

/**
 * Record pressed. Verifies the visit is still OPEN first; a stale tab gets { ok:false,
 * reason:'visit-sealed' } and nothing is written. Otherwise records the station event (once ever),
 * adds its XP to the local total and the open visit, and writes the journal, in one transaction.
 */
export function completeStation(db, { playerId, visitKey, expedition, station, policy, keys = defaultKeys }, opts) {
  return runTx(db, ALL, async (stores) => {
    const visit = await openVisitOrRefuse(stores, playerId, visitKey, expedition)
    const record = await getRecord(stores, playerId, WORLD_GAME_ID)
    const s = stationState(record, expedition, station)
    const eventKey = keys.station(expedition, station)

    if (s.complete) {
      // replay of a completed station: journal only; replay XP policy is U3 (fixture: never)
      const lastReplay = s.replayAttempts?.at(-1)
      if (!lastReplay?.correct) throw new Refusal('explain-not-correct')
      if (policy.station.replay !== 'never') throw new Refusal('unsupported-station-replay-policy')
      const updated = putStation(record, expedition, station, { ...s, replayAttempts: [] })
      updated.journal = [...(record.journal ?? []), journalEntry('station-replay', { expedition, station, visitKey })]
      stores.records.put(updated)
      return { ok: true, xp: 0, replay: true }
    }
    if (!s.steps.observe || !s.steps.investigate) throw new Refusal('investigate-first')
    if (!s.correctOnAttempt) throw new Refusal('explain-not-correct')

    const candidate = { eventKey, xp: stationXp(s.correctOnAttempt), kind: 'station' }
    const fresh = await recordNewEvents(stores, playerId, visitKey, [candidate])
    const xp = fresh.reduce((sum, c) => sum + c.xp, 0)
    const totals = await addXp(stores, playerId, xp)
    stores.rounds.put({
      ...visit,
      xp: visit.xp + xp,
      rewards: [...visit.rewards, ...fresh.map(({ eventKey: k, xp: amount, kind }) => ({ eventKey: k, xp: amount, kind }))],
    })
    const updated = putStation(record, expedition, station, { ...s, complete: true, completedInVisit: visitKey, completedAt: nowIso() })
    updated.journal = [...(record.journal ?? []), journalEntry('station-complete', { expedition, station, visitKey, xp, correctOnAttempt: s.correctOnAttempt })]
    stores.records.put(updated)
    return { ok: true, xp, totals }
  }, opts)
}

/**
 * Files the expedition report and SEALS the visit, in one transaction (verifies the visit is open).
 * answers: five { itemId, correct }. set: 'A' on the first filing, 'B' on the retry.
 */
export function fileReport(db, { playerId, visitKey, expedition, set, answers, policy, account, keys = defaultKeys }, opts) {
  return runTx(db, ALL, async (stores) => {
    const visit = await openVisitOrRefuse(stores, playerId, visitKey, expedition)
    if (!Array.isArray(answers) || answers.length !== 5 || answers.some((a) => typeof a.correct !== 'boolean')) {
      throw new Refusal('report-needs-five-answers')
    }
    const record = await getRecord(stores, playerId, WORLD_GAME_ID)
    const exp = record.expeditions?.[expedition] ?? { stations: {}, reportFilings: 0, bestReportStars: 0 }
    const allStationsComplete = [1, 2, 3, 4, 5].every((n) => exp.stations?.[n]?.complete)
    if (!allStationsComplete) throw new Refusal('stations-incomplete')
    const filingNumber = (exp.reportFilings ?? 0) + 1
    if (filingNumber === 1 && set !== 'A') throw new Refusal('first-filing-uses-set-a')
    if (filingNumber === 2 && set !== 'B') throw new Refusal('retry-uses-set-b')
    if (policy.reportTiming !== 'three-stars-first-filing-completion-any-filing') throw new Refusal('unsupported-report-policy')

    const correct = answers.filter((a) => a.correct).length
    const candidates = reportCandidates(keys, { expedition, isFirstFiling: filingNumber === 1, correct, allStationsComplete })
    const fresh = await recordNewEvents(stores, playerId, visitKey, candidates)
    const xp = fresh.reduce((sum, c) => sum + c.xp, 0)
    const totals = await addXp(stores, playerId, xp)

    const sealed = seal({
      ...visit,
      xp: visit.xp + xp,
      rewards: [...visit.rewards, ...fresh.map(({ eventKey, xp: amount, kind }) => ({ eventKey, xp: amount, kind }))],
    }, account)
    stores.rounds.put(sealed)
    const stars = reportStars(correct)
    const expeditions = {
      ...record.expeditions,
      [expedition]: { ...exp, reportFilings: filingNumber, bestReportStars: Math.max(exp.bestReportStars ?? 0, stars) },
    }
    const journal = [...(record.journal ?? []), journalEntry('report-filed', { expedition, set, filingNumber, correct, stars, xp, answers })]
    stores.records.put({ ...record, expeditions, journal })
    return { ok: true, xp, stars, filingNumber, round: sealed, totals }
  }, opts)
}

/** Seals a visit (leave expedition). Idempotent; a sealed visit is never modified. */
export function sealVisit(db, { playerId, visitKey, account }, opts) {
  return runTx(db, ['rounds'], async (stores) => {
    const visit = await req(stores.rounds.get([playerId, visitKey]))
    if (!visit || visit.kind !== 'visit') throw new Refusal('visit-not-found')
    if (visit.status !== 'open') return { ok: true, alreadySealed: true, round: visit }
    const sealed = seal(visit, account)
    stores.rounds.put(sealed)
    return { ok: true, round: sealed }
  }, opts)
}

/* ------------------------------------------------------------------ server sync state */

/** Allowed transitions (design 2.7). Moving to 'done' needs confirmedBy. */
const TRANSITIONS = {
  pending: ['pending', 'done', 'verifying', 'rejected'],
  verifying: ['verifying', 'done', 'conflict'],
  conflict: ['conflict', 'done'],
  rejected: ['rejected', 'done'],
}

/**
 * Updates a sealed round's sync state and diagnostics. Never touches totals; never deletes.
 * { eventId, to, confirmedBy?: 'inserted' | 'duplicate-owned', error?: {code, message, stage} }
 */
export function markSync(db, { eventId, to, confirmedBy, error, attempt = true }, opts) {
  return runTx(db, ['rounds'], async (stores) => {
    const round = await req(stores.rounds.index('byEventId').get(eventId))
    if (!round) throw new Refusal('unknown-event')
    if (!SYNC_STATES.includes(round.sync)) throw new Refusal('unknown-sync-state') // fail closed
    const allowed = TRANSITIONS[round.sync] ?? []
    if (!allowed.includes(to)) throw new Refusal('transition-not-allowed', { from: round.sync, to })
    if (to === 'done' && !['inserted', 'duplicate-owned'].includes(confirmedBy)) throw new Refusal('done-needs-confirmation')
    if (to === 'done' && confirmedBy === 'inserted' && round.sync !== 'pending') throw new Refusal('transition-not-allowed')
    const detail = round.syncDetail ?? { attempts: 0, lastAttemptAt: null, lastError: null, confirmedBy: null, history: [] }
    const at = nowIso()
    const next = {
      ...round,
      sync: to,
      syncDetail: {
        ...detail,
        attempts: detail.attempts + (attempt ? 1 : 0),
        lastAttemptAt: attempt ? at : detail.lastAttemptAt,
        lastError: error ? { ...error, at } : detail.lastError,
        confirmedBy: to === 'done' ? confirmedBy : detail.confirmedBy,
        history: to !== round.sync ? [...detail.history, { at, from: round.sync, to, note: confirmedBy ?? error?.code ?? null }] : detail.history,
      },
    }
    stores.rounds.put(next)
    return { ok: true, round: next }
  }, opts)
}
