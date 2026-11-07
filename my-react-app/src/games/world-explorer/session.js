/**
 * World Explorer 3D: pure expedition logic (design 8.2, 4.4). No React, no storage.
 *
 * Station flow: Observe → Investigate → Explain → Record.
 *   - Explain: after 1 wrong attempt a HINT is shown; after 2 wrong attempts the EXPLANATION is
 *     shown; the learner still picks the right answer before Record. XP is decided by the
 *     committed attempt number (xpRules.stationXp: 4 / 2 / 0), never here.
 * Report: 5 questions; set A on the first filing, set B on the one retry; ★ 3/5, ★★ 4/5, ★★★ 5/5.
 */

export const STATION_COUNT = 5
export const REPORT_LENGTH = 5
export const MAX_FILINGS = 2 // first filing (set A) + one retry (set B)

/** Splits an expedition's items into its five stations and the two report sets. */
export function expeditionContent(items, expedition) {
  const mine = items.filter((i) => i.mission === expedition)
  const stations = mine.filter((i) => i.role === 'station').sort((a, b) => a.station.n - b.station.n)
  const reportA = mine.filter((i) => i.role === 'report-a').sort((a, b) => (a.id < b.id ? -1 : 1))
  const reportB = mine.filter((i) => i.role === 'report-b').sort((a, b) => (a.id < b.id ? -1 : 1))
  return { stations, reportA, reportB }
}

/** True when the expedition has all its stations and both full report sets. */
export function expeditionPlayable(content) {
  return content.stations.length === STATION_COUNT
    && content.stations.every((s, i) => s.station.n === i + 1)
    && content.reportA.length === REPORT_LENGTH
    && content.reportB.length === REPORT_LENGTH
}

const emptyStation = () => ({ steps: {}, attempts: [], complete: false, replayAttempts: [] })

export function stationRecord(record, expedition, n) {
  return record?.expeditions?.[expedition]?.stations?.[n] ?? emptyStation()
}

/**
 * Where a station stands, from committed data only:
 *   'observe' | 'investigate' | 'explain' | 'record' | 'complete'
 */
export function stationPhase(s) {
  if (s.complete) return 'complete'
  if (!s.steps?.observe) return 'observe'
  if (!s.steps?.investigate) return 'investigate'
  if (!s.correctOnAttempt) return 'explain'
  return 'record'
}

/** What extra help the Explain step shows after `wrongSoFar` wrong attempts. */
export function explainHelp(wrongSoFar) {
  if (wrongSoFar >= 2) return 'explanation'
  if (wrongSoFar === 1) return 'hint'
  return 'none'
}

export const wrongAttempts = (s) => (s.attempts ?? []).filter((a) => !a.correct).length

export function completedCount(record, expedition) {
  let n = 0
  for (let i = 1; i <= STATION_COUNT; i += 1) if (stationRecord(record, expedition, i).complete) n += 1
  return n
}

/** The first station not yet complete (1–5), or null when all are complete. */
export function firstIncomplete(record, expedition) {
  for (let i = 1; i <= STATION_COUNT; i += 1) if (!stationRecord(record, expedition, i).complete) return i
  return null
}

/** Report status: how many filings so far, whether filing is possible, and which set comes next. */
export function reportStatus(record, expedition) {
  const exp = record?.expeditions?.[expedition]
  const filings = exp?.reportFilings ?? 0
  const allComplete = completedCount(record, expedition) === STATION_COUNT
  return {
    filings,
    bestStars: exp?.bestReportStars ?? 0,
    canFile: allComplete && filings < MAX_FILINGS,
    nextSet: filings === 0 ? 'A' : filings === 1 ? 'B' : null,
    allComplete,
  }
}

/** ★ 3/5, ★★ 4/5, ★★★ 5/5 (same rule as xpRules.reportStars; repeated here for display only). */
export const starsForScore = (correct) => (correct >= 5 ? 3 : correct === 4 ? 2 : correct === 3 ? 1 : 0)

/* ------------------------------------------------------------------ answer order */

function hashString(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * The item's options in a stable shuffled order (same order after a refresh), each
 * { key, text: {en,bn}, correct, misconception? }. key is 'answer' or 'd0', 'd1', ….
 */
export function optionsFor(item) {
  const options = [
    { key: 'answer', text: item.answer, correct: true },
    ...item.distractors.map((d, i) => ({ key: `d${i}`, text: d.text, correct: false, misconception: d.misconception })),
  ]
  let seed = hashString(item.id)
  for (let i = options.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0
    const j = seed % (i + 1)
    ;[options[i], options[j]] = [options[j], options[i]]
  }
  return options
}

/* ------------------------------------------------------------------ journal */

/**
 * Journal lines for one expedition, newest first, from the committed journal:
 * { kind: 'station', n, at, xp, attempt } | { kind: 'report', set, correct, stars, at, xp }
 */
export function journalFor(record, expedition) {
  return (record?.journal ?? [])
    .filter((e) => e.expedition === expedition && (e.type === 'station-complete' || e.type === 'report-filed' || e.type === 'station-replay'))
    .map((e) => (e.type === 'report-filed'
      ? { kind: 'report', set: e.set, correct: e.correct, stars: e.stars, xp: e.xp, at: e.at }
      : { kind: e.type === 'station-replay' ? 'replay' : 'station', n: Number(e.station), xp: e.xp ?? 0, attempt: e.correctOnAttempt, at: e.at }))
    .reverse()
}

/* ------------------------------------------------------------------ practice mode */

/**
 * In-memory stand-in for the adapter's world.* transactions, used ONLY when IndexedDB is
 * unavailable (Practice mode, design T4): same rules and answers, nothing saved, no XP.
 * Refusals mirror the real transactions' reasons.
 */
export function createPracticeWorld() {
  let record = { expeditions: {}, journal: [] }
  let visit = null
  let counter = 0
  const listeners = new Set()
  const emit = () => listeners.forEach((fn) => fn())
  const station = (exp, n) => stationRecord(record, exp, n)
  const put = (exp, n, s) => {
    const e = record.expeditions[exp] ?? { stations: {}, reportFilings: 0, bestReportStars: 0 }
    record = { ...record, expeditions: { ...record.expeditions, [exp]: { ...e, stations: { ...e.stations, [n]: s } } } }
  }
  const openCheck = (visitKey, exp) => (visit && visit.roundKey === visitKey && visit.expedition === exp ? null : { ok: false, reason: 'visit-sealed' })
  const journal = (type, fields) => { record = { ...record, journal: [...record.journal, { type, at: new Date().toISOString(), ...fields }] } }

  return {
    practice: true,
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn) },
    getRecord: () => record,
    unfinishedVisits: () => [],
    async startVisit(expedition) {
      counter += 1
      visit = { roundKey: `practice-visit-${counter}`, expedition, xp: 0, status: 'open' }
      emit()
      return { ok: true, visit }
    },
    async joinVisit(expedition) {
      return visit && visit.expedition === expedition ? { ok: true, visit } : { ok: false, reason: 'no-open-visit' }
    },
    async saveStationProgress(visitKey, exp, n, step) {
      const refused = openCheck(visitKey, exp)
      if (refused) return refused
      const s = station(exp, n)
      if (step === 'investigate' && !s.steps.observe) return { ok: false, reason: 'observe-first' }
      put(exp, n, { ...s, steps: { ...s.steps, [step]: true } })
      emit()
      return { ok: true }
    },
    async recordExplainAttempt(visitKey, exp, n, choice, correct) {
      const refused = openCheck(visitKey, exp)
      if (refused) return refused
      const s = station(exp, n)
      const attempt = { choice, correct, at: new Date().toISOString() }
      if (s.complete) put(exp, n, { ...s, replayAttempts: [...(s.replayAttempts ?? []), attempt] })
      else {
        const attempts = [...s.attempts, attempt]
        put(exp, n, { ...s, attempts, correctOnAttempt: correct ? attempts.length : undefined })
      }
      emit()
      return { ok: true }
    },
    async completeStation(visitKey, exp, n) {
      const refused = openCheck(visitKey, exp)
      if (refused) return refused
      const s = station(exp, n)
      if (s.complete) { put(exp, n, { ...s, replayAttempts: [] }); journal('station-replay', { expedition: exp, station: n }); emit(); return { ok: true, xp: 0, replay: true } }
      if (!s.correctOnAttempt) return { ok: false, reason: 'explain-not-correct' }
      put(exp, n, { ...s, complete: true })
      journal('station-complete', { expedition: exp, station: n, xp: 0, correctOnAttempt: s.correctOnAttempt })
      emit()
      return { ok: true, xp: 0 }
    },
    async fileReport(visitKey, exp, set, answers) {
      const refused = openCheck(visitKey, exp)
      if (refused) return refused
      const e = record.expeditions[exp] ?? { stations: {}, reportFilings: 0, bestReportStars: 0 }
      const correct = answers.filter((a) => a.correct).length
      const stars = starsForScore(correct)
      record = { ...record, expeditions: { ...record.expeditions, [exp]: { ...e, reportFilings: (e.reportFilings ?? 0) + 1, bestReportStars: Math.max(e.bestReportStars ?? 0, stars) } } }
      journal('report-filed', { expedition: exp, set, correct, stars, xp: 0 })
      visit = null
      emit()
      return { ok: true, xp: 0, stars }
    },
    async sealVisit() {
      visit = null
      emit()
      return { ok: true }
    },
  }
}
