/**
 * Learner messages and support diagnostics for server sync states (design 2.7). Pure.
 *
 * UI text: the Bangla strings are drafts and go through Bangla review with the Stage 2A-2 UI.
 */

const MESSAGES = {
  'local-only': { en: 'Saved on this device', bn: 'এই ডিভাইসে সংরক্ষিত' },
  none: { en: 'Saved on this device', bn: 'এই ডিভাইসে সংরক্ষিত' },
  pending: { en: 'Saved on this device · will sync', bn: 'এই ডিভাইসে সংরক্ষিত · পরে সিঙ্ক হবে' },
  verifying: { en: 'Saved on this device · checking sync', bn: 'এই ডিভাইসে সংরক্ষিত · সিঙ্ক যাচাই চলছে' },
  done: { en: 'Synced', bn: 'সিঙ্ক হয়েছে' },
  problem: {
    en: "Some progress couldn't sync to your account. It's still saved on this device.",
    bn: 'কিছু অগ্রগতি তোমার অ্যাকাউন্টে সিঙ্ক হয়নি। এটি এখনও এই ডিভাইসে সংরক্ষিত আছে।',
  },
}

/** First 8 hex characters of the event id, shown as XXXX-XXXX. */
export function supportCode(eventId) {
  if (typeof eventId !== 'string') return null
  const hex = eventId.replace(/-/g, '').slice(0, 8).toUpperCase()
  return hex.length === 8 ? `${hex.slice(0, 4)}-${hex.slice(4)}` : null
}

/** What the learner sees for one sealed round. */
export function learnerSyncMessage(round, language = 'en') {
  const lang = language === 'bn' ? 'bn' : 'en'
  if (round.sync === 'conflict' || round.sync === 'rejected') {
    return { text: MESSAGES.problem[lang], supportCode: supportCode(round.eventId), problem: true }
  }
  const message = MESSAGES[round.sync] ?? MESSAGES.pending
  return { text: message[lang], supportCode: null, problem: false }
}

/** Rows for the support "Sync details" view: every sealed round, problems first. */
export function supportRows(rounds) {
  const order = { conflict: 0, rejected: 1, verifying: 2, pending: 3, done: 4, 'local-only': 5, none: 6 }
  return rounds
    .filter((r) => r.status === 'sealed')
    .map((r) => ({
      game: r.gameId,
      roundKey: r.roundKey,
      amount: r.xp,
      eventId: r.eventId ?? null,
      supportCode: supportCode(r.eventId),
      state: r.sync,
      confirmedBy: r.syncDetail?.confirmedBy ?? null,
      attempts: r.syncDetail?.attempts ?? 0,
      lastError: r.syncDetail?.lastError?.code ?? null,
      sealedAt: r.sealedAt ?? null,
      lastAttemptAt: r.syncDetail?.lastAttemptAt ?? null,
      history: r.syncDetail?.history ?? [],
    }))
    .sort((a, b) => (order[a.state] ?? 9) - (order[b.state] ?? 9))
}
