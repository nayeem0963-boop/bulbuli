# Bulbuli — Phase 2A Design (revision 7, for owner review)

**Status: NOT READY FOR APPROVAL.** This document stays not ready until three things happen: the corrected Phase 2 proposal is supplied and checked, the original `guess_odds.py` is supplied and run, and the outstanding owner decisions (section 11) are resolved. Sections 6.2 and 7 remain unresolved.
**Nothing implemented.** No game code, shared application code, database file, route, configuration or production behaviour has been changed. Stage 2A-1 hasn't started. Nothing has been committed or pushed.
**Revision 7 (2 Nov 2026)** completes the owner's revision 7 brief. It was received in two parts: sections 1–2, then the continuation of section 2 about pending-claim immutability and append-only history. Revision 6 content is otherwise unchanged. **Not approved; for owner review.** Section 0.3 lists what changed.

---

## 0. Checkpoint, decisions and changes

### 0.1 Verified checkpoint

| Item | Value |
|---|---|
| Repo root | `C:/Users/nayee/Documents/bulbuli` (app in subfolder `my-react-app`) |
| Branch | `main` |
| HEAD | `ed62e66` "feat: consolidate Bulbuli educational game catalogue" = Phase 1 commit; one ahead of `origin/main` (`6da40f2`), not pushed |
| Working tree | clean except `my-react-app/docs/PHASE-2A-DESIGN.md` (this file) |
| Phase 1 backup | `_backup-before-phase-1-catalogue-2026-11-01.tar.gz`, untouched |
| Phase 2A backup | `_backup-before-phase-2a-2026-11-02.tar.gz`, 816 entries, sha256 `00d5ffc79757e19272f9d6a10d350d776cb23aae3d8a53d0ffd0ffea064d1ab2` (git-ignored, like earlier backups) |
| Baseline | tests 306/306 pass · lint 0 errors / 201 warnings · build succeeds, no warnings |

### 0.2 Owner decisions already made (final, not reopened)

1. Two-wave content plan. **Wave 1:** Sky Watcher, Weather Flyer, Sundarbans, Amazon Rainforest, Sahara Desert. **Wave 2:** Moon & Earth, Planet Parade, Planet Detectives, Star Navigator. The architecture supports all six Sky Science missions; no low-quality filler.
2. Existing Sky Runner and Skyward Explorer remain live and completely untouched during development.
3. No fabricated reviewer names, dates or approvals.
4. New games live only in the separate folders `src/games/sky-science/` and `src/games/world-explorer/`.
5. Content is published only after genuine science **and** Bangla approval.
6. Star rules are not changed because of guessing results.
7. No service-worker change and no production `public/draco/` files during development. Self-hosting and caching belong to the separately approved release migration (1.8).

### 0.3 Revision 6 → revision 7 change log

| Section | Change |
|---|---|
| 2.2 | IndexedDB schema corrected: database **version 1** now defines **six** stores. Added `claims` (guest XP claims) and `meta` (device ID). Guest claim high-water marks are defined as fields of the `totals['guest']` row. Upgrade strategy specified (2.2.1). Fixes revision 6's inconsistency of using a `claims` store that the schema didn't list. |
| 1.9 | Guest XP migration rewritten around explicit **immutable claim records**, separate submission and verification states, an integrity hash, account-ownership protection for the six owner cases (1.9.6), failure/recovery rules, and release acceptance tests G1–G7 plus C1–C15 (1.9.8). Still release-only. |
| 1.9.3, 1.9.4 (continuation) | A pending claim now also keeps its **high-water marks after the claim** as immutable fields, inside the integrity hash. Subsequent guest play can't alter or re-pool a claimed amount (new 1.9.4a). |
| 1.9.3, 1.9.7 (continuation) | The claim `history` is now **strictly append-only and hash-chained**: every submission- and verification-state change appends an entry, and no entry is ever overwritten, reordered or dropped. Revision 7's earlier "capped at 50 entries; oldest dropped" rule is **removed**, because it contradicted the brief. |
| 1.9.8 | New tests C11–C15 for re-pooling and history integrity |

### 0.3.1 Revision 5 → revision 6 change log (previous)

| Section | Change |
|---|---|
| 2.3 | New transactions `recordAnswer`, `saveStationProgress`, `recordExplainAttempt`, `joinVisit`. `completeStation` and `fileReport` now **verify the visit is still `open`** and abort with no writes if not. |
| 2.7 | Rewritten as **server sync states and diagnostics**: `local-only`, `pending`, `verifying` (ownership check temporarily unavailable), `done` (`inserted` or `duplicate-owned`), `conflict`, `rejected`, with learner messages, a support view, and retained, recoverable conflicts. Tests O1–O8. |
| 2.11 (new) | **Persistence points:** when each Sky Science answer, flight resume state, station step, visit key, Record and seal becomes durable; committed vs interrupted; what the learner sees; failure-injection tests P1–P10. Feedback is shown only after the answer's transaction commits. |
| 1.6 | Test levels L1–L3 distinguished; new **real-browser smoke tests B1–B6** on the actual preview page, with and without a simulated signed-in session, plus a positive control. In-memory and fake-client tests are explicitly not claimed to prove real-browser isolation. |
| 1.9 (new) | **Guest XP release migration:** combining IndexedDB learning XP with legacy guest XP under the existing 500-XP carry-over; an IndexedDB claim record and deterministic claim event ID; release acceptance tests G1–G7. Release-only. |
| 4.4.2 (new) | **Stale-tab protection** for World Explorer, the learner-facing response, and tests S1–S4 (S1 is the owner's exact scenario). |
| 11 | Complete decision checklist with a **status** for every D-number. D1 (`content:report` script) is separated from D12 (test-only IndexedDB dependency). D13 and D14 included; new D15 (browser-test tooling) and D16 (guest carry-over policy at release). |
| 9, 10 | Risks and sequence updated. |

### 0.3.2 Revision 5 change log (older)

| Section | Change |
|---|---|
| 1.2, 1.3 | Local learning storage moved to **IndexedDB**. Shared-file wiring (`xp.js`, `useGameProgress.js`) moved to the **release step**, so development changes **no** existing application file. Preview adapter files added. |
| 1.6 | Preview isolation built on an explicit **preview adapter** with no default fallback; tests I1–I9, including **I9 with a simulated signed-in session**. |
| 1.8 | Draco: development uses the decoder bundled inside `three`; **no** `public/draco/` files and **no** service-worker change during development; self-hosting and caching deferred to release. |
| 2.2–2.3 | One **IndexedDB `readwrite` transaction** records events, rounds, the learning XP total and the game record together. The `localStorage` read-modify-write design is removed. |
| 2.5 (new) | **Cross-tab rule, fail-closed:** IndexedDB transaction serialisation is the cross-tab lock and doesn't depend on Web Locks. With no reliable mechanism, no XP is committed. Two-tab tests with and without Web Locks. A warning alone is never treated as protection. |
| 2.6 (new) | **Authoritative record and protective copies:** recovery rules for every derived copy, including the four mirror cases from the owner's review, with tests. |
| 2.7 (new) | **Server duplicate ownership:** `awarded = 0` isn't treated as success until ownership is confirmed by reading the learner's own `xp_events` row; otherwise the event is held as `conflict`. |
| 4.4 | World Explorer interrupted-visit learner experience and tests W1–W7. |
| 5 | **RLS check:** the `xp_events` SELECT policy and grants verified in the migration files; deployed policies not verifiable from here (D10). |
| 9, 10, 11 | Risks, sequence and decisions updated (D1 revised; new D12, D13, D14). |

### 0.4 Naming glossary

| Written as | Means | Changes during Phase 2A development? |
|---|---|---|
| `src/games/sky-runner/` (folder) | Existing Sky Runner code | **No, never touched** |
| `src/games/skyward-explorer/` (folder) | Existing Skyward Explorer code | **No, never touched** |
| `src/games/sky-science/` (folder) | New Sky Science Explorer code | New |
| `src/games/world-explorer/` (folder) | New World Explorer 3D code | New |
| `'sky-runner'`, `'skyward-explorer'` (quoted id strings) | Registry id / XP `game_id` / record key of the existing game slots | Used by the new games **only after release approval** (1.7) |
| live adapter / preview adapter | The two implementations of the learning adapter (1.6) | New |

### 0.5 Conflicts between the two owner briefs, and how they're resolved

| Topic | "Revision 3.1" brief | Later review of revision 4 | Followed in this revision |
|---|---|---|---|
| Draco in development | Self-host in `public/draco/` | Use the decoder bundled with `three`; **no** `public/draco/` files during development | **Later brief.** No `public/draco/` during development (1.8) |
| Local storage design | IndexedDB transaction preferred; no unsafe fallback | Main progress record authoritative + ledger mirror with recovery rules (written against the revision 4 `localStorage` design) | **IndexedDB kept** (stronger guarantee, explicitly preferred, not rejected by the later brief). The later brief's mirror recovery rules are applied to every derived copy in the IndexedDB design (2.6), with tests. **Owner to confirm (D13).** |

---

## 1. Architecture

### 1.1 Four release states

| State | Location | Reachable by |
|---|---|---|
| **Existing playable games** | folders `src/games/sky-runner/`, `src/games/skyward-explorer/`, unchanged | Everyone, as today |
| **New games under development** | folders `src/games/sky-science/`, `src/games/world-explorer/` | Only the dev-only preview page, under `npm run dev`, through the preview adapter |
| **Content items awaiting review** | `src/learning/content/…` without both valid approvals | Preview only, labelled "Unreviewed" |
| **Approved content available for release** | Same files, both approvals valid for the exact current hash | Normal play only after a **separate release approval** (1.7) |

### 1.2 New files (development)

```
src/learning/
  xpRules.js            amounts + policies; unresolved policies are PENDING constants (6.2)
  eventKeys.js          local event keys, round/visit keys (pure)
  eventId.js            deterministic UUID v5 for server events (section 3)
  contentGate.js        hashing, isShippable(), release report (pure)
  reviewers.js          EMPTY until the owner names real reviewers
  store/
    schema.js           IndexedDB schema (section 2.2)
    transactions.js     startVisit, commitFlight, completeStation, sealVisit, fileReport, markSync (section 2.3)
    learningStore.js    in-memory snapshot + useSyncExternalStore binding + cross-tab refresh (2.8)
  adapters/
    AdapterContext.jsx  React context with NO default value; useLearningAdapter() throws without a provider
    preview.js          preview adapter: own IndexedDB database, server sink = in-memory recorder only
    live.js             live adapter: production database name, server sink = callback supplied at release (1.7)
  content/sky-science/{sky-watcher,weather-flyer,moon-earth,planet-parade,planet-detectives,star-navigator}.js
  content/world-explorer/{sundarbans,amazon,sahara}.js
  *.test.js
src/games/sky-science/      SkyScienceGame.jsx, SkyScienceCanvas.jsx, flight.js, ExplorerBird.jsx, text.js, css, tests
src/games/world-explorer/   WorldExplorerGame.jsx, ExpeditionCanvas.jsx, ExplorerController.jsx,
                            biomes/{sundarbans,amazon,sahara}.js, stations/, report.js, journal.js, text.js, css, tests
dev-preview/phase-2a/index.html, main.jsx   dev-only entry; mounts the preview adapter only
scripts/content-report.mjs
```

### 1.3 Existing files during development

**No existing application file is modified during development.** Revision 4's additive changes to `src/lib/xp.js` and `src/hooks/useGameProgress.js` are **moved to the release step** (1.7). They're only needed to connect the live adapter to the real XP queue and the displayed XP total, and nothing in development uses that connection.

The only existing file proposed to change during development is **`package.json`**: a `content:report` script and a **test-only** devDependency for an in-memory IndexedDB in Node tests (D12). That's configuration, so it needs your approval (D1/D12).

**Untouched (checksum manifest):** folders `src/games/sky-runner/` and `src/games/skyward-explorer/`; `src/lib/xp.js`; `src/hooks/useGameProgress.js`; `src/hooks/useScoreSync.js`; `src/supabaseClient.js`; `src/games/registry.js`; `src/catalog/learningCatalog.js`; `src/App.jsx`; `vite.config.js`; `index.html`; `public/sw.js` and all other existing `public/` files; `src/components/game/BulbuliModel.jsx`; `supabase/**`; badges, achievements, certificates, auth.

### 1.4 Reuse of existing code (import-only)

| Existing export | Used by | How |
|---|---|---|
| folder `skyward-explorer/`: `physics.js` (`PHYS`, `createPlayer`, `stepPlayer`, `cameraRelative`) | `world-explorer/ExplorerController.jsx` | Imported unchanged; each biome supplies its own cylinder colliders |
| folder `skyward-explorer/`: `input.js`, `BulbuliAvatar.jsx`, `sfx.js` | `world-explorer/` | Imported unchanged |
| folder `skyward-explorer/`: `PlayerController.jsx`, `buildColliders`, `spawnPoint` | Not used | Tied to the procedural island world |
| folder `sky-runner/`: `RunnerCanvas.jsx` | Not used | Internals not exported; `sky-science/SkyScienceCanvas.jsx` is new (duplication accepted) |
| `BulbuliModel.jsx` | Not used | `sky-science/ExplorerBird.jsx` loads the same `/models/bulbuli.glb` with the decoder path supplied by the adapter configuration (1.8) |
| `GameViewport`, `GameLoadingSpinner`, `SceneReady`, `GameFullscreen`, `useReducedMotion`, `utils/sound.js`, `formatDigits` | both new folders | Imported unchanged. Checked 2 Nov: none of them import Supabase, `xp.js`, `useGameProgress`, `useScoreSync`, badges or achievements |
| `useGameProgress`, `useScoreSync`, `xp.js`, `supabaseClient.js` | **Forbidden in the new game folders** | Enforced by test I4 |

### 1.5 One-way dependencies

- The old folders never import from `sky-science/`, `world-explorer/` or `src/learning/`.
- The new game folders reach storage and XP **only** through `useLearningAdapter()`.
- `adapters/live.js` is never imported by the preview entry or by the new game folders.

### 1.6 Development-preview XP isolation

**Mechanism: an explicit adapter, not just a player ID.**

1. Games never import a storage or XP module. They call `useLearningAdapter()`, which reads `AdapterContext`.
2. `AdapterContext` is created with **no default value**. `useLearningAdapter()` throws `"No learning adapter provided"` when there's no provider. **There is no accidental fallback to the live adapter.**
3. `dev-preview/phase-2a/main.jsx` renders `<AdapterProvider adapter={createPreviewAdapter()}>` around the games and nothing else from the app. No `AuthProvider`, `BadgesProvider`, `CertificatesProvider`, `FavoritesProvider`, router or catalogue.
4. The **preview adapter**:
   - opens its own IndexedDB database `bulbuli-learning-preview-v1`, separate from the live name `bulbuli-learning-v1` and from every existing `localStorage` key
   - uses a fixed player id `phase2a-preview`
   - has a server sink that records `{eventId, gameId, amount}` into an in-memory array shown in a "Preview: XP that *would* be sent" panel, and does nothing else. It has no import path to `xp.js` or `supabaseClient.js`.
   - throws if constructed when `import.meta.env.PROD` is true
   - offers "Reset preview data", which deletes only its own database
5. The **live adapter** exists in development but is wired to nothing until release (1.7). It refuses any round containing a non-shippable content item.

**Why this holds even when a real user is signed in:** isolation doesn't depend on the player ID. The preview page's module graph contains no Supabase client, no XP queue, no progress hook and no auth, badge or achievement code (tests I3, I4). A real Supabase session stored in the browser (`sb-…-auth-token`) is therefore never read by the preview, and there's no code path that could use it. The player ID only separates preview data inside the preview's own database.

**What this guarantees during development:**
- no Supabase RPC of any kind, including `award_xp`
- no entries in the account XP queue (`bulbuli.xp-queue.v1`)
- no change to real account or guest progress (`bulbuli.tutorial-progress.v1.*`), real account XP, the guest carry-over marker, badges, achievements or certificates
- preview storage is separate (`bulbuli-learning-preview-v1`)

**Automated tests (all must pass at every stage):**

| # | Test |
|---|---|
| I1 | **Build exclusion:** run `vite build`; the `dist/` file list must **equal the baseline list exactly** (no `draco/` files, no preview files); no `dist/` file may contain `dev-preview`, `phase2a-preview`, `bulbuli-learning-preview`, `createPreviewAdapter`, `sky-science` or `world-explorer` |
| I2 | **Build configuration:** assert `vite.config.js` `rolldownOptions.input` still lists exactly the three existing pages (the preview page and `dev-preview/phase-2a/main.jsx` aren't inputs), and nothing under `dev-preview/` is inside `public/` |
| I3 | **Preview import graph:** a static walker follows every import from `dev-preview/phase-2a/main.jsx`. It fails if it reaches `supabaseClient.js`, `lib/xp.js`, `useGameProgress.js`, `useScoreSync.js`, `adapters/live.js`, `src/badges/**`, `src/achievements/**`, `src/auth/**`, `registry.js` or `learningCatalog.js` |
| I4 | **Game-folder import rule:** no file in `sky-science/` or `world-explorer/` imports the modules listed in I3 (other than through the adapter context) |
| I5 | **No fallback:** rendering a new game without a provider throws, and the error names the missing adapter; there's no default export of a live adapter |
| I6 | **Runtime, no backend:** simulate a full Sky Science flight (every band) and a full World Explorer visit (stations, report, retry, abandonment, resume) through the preview adapter. A spy on `globalThis.fetch`, `XMLHttpRequest` and `WebSocket` must record **zero** calls. The preview sink must hold the expected would-be awards. |
| I7 | **Runtime, no real storage:** during I6, a `localStorage` spy must record **zero** writes, and IndexedDB must contain no database other than `bulbuli-learning-preview-v1`; no `bulbuli:xp-awarded`, `bulbuli:game-progress` or `bulbuli:round-complete` window event is dispatched |
| I8 | **Production guard:** with `import.meta.env.PROD` mocked true, `createPreviewAdapter()` throws |
| I9 | **Simulated signed-in session.** Before the run, seed the browser state of a signed-in learner: a Supabase auth token under the project's `sb-<ref>-auth-token` key for a test UUID; that UUID's progress key `bulbuli.tutorial-progress.v1.<uuid>` with known XP and records; and `bulbuli.xp-queue.v1` with two existing items. Also install a fake Supabase client on `globalThis` that counts every `rpc`, `from` and `auth` call. Run the I6 playthroughs in the preview. Assert: **zero** Supabase RPC calls (fake counter and network spy); the XP queue is **byte-identical** (no new account XP entries); the account progress key and guest key are **byte-identical** (no change to normal progress); no badge, certificate or `bulbuli:xp-awarded` activity. |

Also continuing: registry, catalogue and `App.jsx` checksum unchanged; no production route, catalogue entry or query parameter exists for the new games.

**Test levels (what each one can and can't prove):**

| Level | Runs in | Proves | Does **not** prove |
|---|---|---|---|
| L1 Unit / static | Node (`node --test`) | Pure logic, import graph (I3, I4), build output and config (I1, I2), production guard (I8) | Anything about a real browser |
| L2 In-memory IndexedDB + fake Supabase client | Node | Transaction logic, cross-tab serialisation between simulated connections (X tests), sync states (O tests), no calls through the faked network and storage APIs (I6, I7, I9) | **Real-browser isolation.** A real browser can have other storage, service workers, extensions and network paths the fakes don't model |
| L3 Real browser | Chromium (and Firefox/WebKit where installed) driving the **actual** `dev-preview/phase-2a/` page served by `vite` | That the real page, in a real browser, makes no backend calls and leaves normal storage untouched (B1–B6) | Behaviour of browsers not tested; production (the preview isn't in production, I1) |

**Real-browser smoke tests (L3)**, each in a fresh browser profile against `npm run dev`:

| # | Test |
|---|---|
| B1 | **Setup snapshot:** before the preview page loads, an init script seeds `localStorage` with a guest progress record, an account progress record for a test UUID, and two items in `bulbuli.xp-queue.v1`. The test records a full `localStorage` dump and the list and contents of every IndexedDB database (`indexedDB.databases()`). |
| B2 | **Short flight, signed out:** open the preview, choose a band and Sky Watcher (or a fixture mission, if no wave 1 content exists yet), complete a short flight through the preview's dev-only test controls, and finish. Every network request is recorded. **Pass** only if every request goes to the local dev server origin; there's no request to `*.supabase.co`, to any `/rest/v1/`, `/auth/v1/` or `/rpc/` path, to `www.gstatic.com`, or to any other origin. |
| B3 | **One station, signed out:** in the preview, enter Sundarbans, complete one station through Record, then leave (seal). Same network rule as B2. |
| B4 | **Storage unchanged:** after B2 and B3, the `localStorage` dump is **byte-identical** to B1. IndexedDB contains the B1 databases unchanged plus only `bulbuli-learning-preview-v1`. In particular, no `bulbuli-learning-v1` (live) database exists. |
| B5 | **Simulated signed-in session:** repeat B1–B4 with a Supabase session seeded under the project's `sb-<ref>-auth-token` key for the test UUID. Additionally, all requests to `*.supabase.co` are intercepted and **aborted** (so no real backend is contacted) and counted. **Pass** only if the count is zero and storage is byte-identical. |
| B6 | **Positive control:** with the same seeded session and interception, load the normal app page `/` in a separate context. The interceptor must record and abort at least one Supabase request. This proves the network monitor can detect backend calls, so B2–B5's zeros are meaningful. |

Tooling: see D15. The preview's dev-only test controls exist only inside the preview page, so they're excluded from production by I1/I2.

**What the build configuration actually supports:** `vite.config.js` lists exactly three build inputs; Rolldown bundles only what they import; `public/` is copied verbatim; Netlify publishes `dist/` only. So a page outside `public/` that isn't an input isn't built. I1 and I2 check this against the real output and config rather than relying on it.

### 1.7 Release migration (separate owner approval; not part of Stages 2A-1 to 2A-4)

1. Point registry ids `'sky-runner'` / `'skyward-explorer'` at the new folders (old folders kept as fallback), wrapping them in `<AdapterProvider adapter={createLiveAdapter(…)}>`. Copy the Draco decoder to `public/draco/` and switch the live adapter's decoder path to `/draco/`.
2. **Shared-file wiring** (additive, reviewed at that point):
   - `xp.js` gains `awardXpEvent(playerId, gameId, amount, eventId)` (queues with a given stable ID) and `eventId` in the `bulbuli:xp-awarded` detail; the live adapter's server sink calls it
   - `useGameProgress` exposes total XP as legacy `localStorage` total + live IndexedDB learning total
   - `claimGuestXp` includes guest learning XP
3. Catalogue text patch.
4. Draco service-worker caching and switching `BulbuliModel.jsx` to `/draco/` (1.8).
5. Decision on the SQL event-ID limitation and ownership confirmation (sections 2.7 and 5).

### 1.8 Draco decoder and service-worker scope (recorded deliberately)

- **Development decoder:** the preview uses the decoder already bundled inside the installed `three` package (`node_modules/three/examples/jsm/libs/draco/gltf/`), which the Vite dev server serves at `/node_modules/three/examples/jsm/libs/draco/gltf/`. The path isn't hard-coded in game code: the preview adapter supplies it as `decoderPath`, and the new games call `useGLTF('/models/bulbuli.glb', adapter.decoderPath)`.
- **Reliability check:** the 2A-2 browser smoke test must load the bird in the preview with this path. If it doesn't work reliably, that's reported to you; nothing is copied into `public/` without approval.
- **No production `public/draco/` files are added during Phase 2A development** (I1 checks the `dist/` list is identical to baseline).
- **No service-worker changes during development:** `public/sw.js` is untouched (checksum manifest).
- **Deferred, deliberately:** self-hosting under `public/draco/` and caching the decoder and model in the service worker both belong to the separately approved release migration (1.7 steps 1 and 4). This is a recorded deferral, not an omission.
- **Tests don't depend on Google's CDN:**
  - Node tests don't load the model.
  - A unit test asserts the new games always pass an explicit `decoderPath`.
  - The preview smoke test fails if any request goes to `www.gstatic.com` while a new game loads.
- **Old games unchanged:** `BulbuliModel.jsx` keeps drei's default gstatic decoder until release.

### 1.9 Guest XP release migration (release only; not part of Phase 2A development)

#### 1.9.1 Existing behaviour (verified in `src/lib/xp.js` and `src/auth/AuthContext.jsx`)

- `AuthContext` calls `claimGuestXp(userId)` when a user is signed in.
- `claimGuestXp` reads the legacy guest total `gamification.totalXp` from `bulbuli.tutorial-progress.v1.guest` and the device marker `bulbuli.guest-xp-claimed.v1`. It sets the marker to the whole guest total **before** awarding, and awards `min(total − marker, 500)` as `game_id 'guest-play'` through `awardXp`, which uses a random event ID.
- So the 500 cap is **per claim**, excess above it is **forfeited**, and the marker is **per device**, not per account: the first account to sign in after guest play receives it.
- The existing XP queue stores `userId` on every item, and `flushXp` only sends items whose `userId` equals the **current session's** user (`readQueue().find((queued) => queued.userId === userId)`). That's the second layer of account protection used below.

#### 1.9.2 Claim identity

- `claimId = uuidv5(BULBULI_NAMESPACE, "bulbuli/v1|<userId>|guest-play|claim|<deviceId>|<L>|<G>")`.
  - `deviceId` comes from `meta`, so two browsers with coincidentally equal totals get different IDs.
  - `L` and `G` are the totals at creation. The high-water marks always advance, so the same `(userId, deviceId, L, G)` can't produce two separate claims.
- `claimId` is also the server `event_id`. Every retry, refresh or re-sign-in re-uses it, and the server counts it at most once (and increments the activity counters at most once).

#### 1.9.3 Claim record (`claims` store)

**Immutable recovery fields:** written once when the claim is created; never updated.

| Field | Meaning |
|---|---|
| `claimId` | Deterministic ID (key; also the server event ID) |
| `userId` | **Original account user ID** the claim belongs to |
| `deviceId` | From `meta` |
| `legacyTotalL` | **Original legacy guest XP total (L)** read at creation |
| `learningTotalG` | **Original IndexedDB guest learning XP total (G)** at creation |
| `legacyClaimedBefore`, `learningClaimedBefore` | High-water marks before this claim |
| `unclaimed` | `(L − legacyClaimedBefore) + (G − learningClaimedBefore)` |
| `amount` | **Exact claim amount** = `min(unclaimed, 500)` |
| `forfeited` | `unclaimed − amount` |
| `gameId` | `'guest-play'` |
| `createdAt` | **Claim creation time** (ISO) |
| `schemaVersion` | Database schema version at creation |
| `legacyClaimedAfter`, `learningClaimedAfter` | **High-water marks after this claim** (= `L` and `G`): the exact boundary of the guest XP this claim covers |
| `immutableHash` | SHA-256 over all fields above. It's checked before every submission and every state change; a mismatch fails closed (1.9.6). |

**Mutable state fields:** changed only through the transitions below, each in its own transaction.

| Field | Values / content |
|---|---|
| `submitStatus` (**submission status**) | `prepared` (created, not yet handed to the queue) → `queued` (in the existing XP queue) → `replied` (a server reply was received) |
| `verifyStatus` (**verification status**) | `unverified` → `verifying` → `done-inserted` \| `done-duplicate-owned` \| `conflict` \| `rejected`. Also `blocked-corrupt` (immutable hash mismatch) |
| `attempts` | Number of submissions and ownership checks (a counter; it only increases) |
| `lastAttemptAt` | ISO time of the latest attempt |
| `lastError` | **Last error / diagnostic:** `{code, message, at, stage: 'queue' \| 'send' \| 'verify'}` or `null`. A convenience copy of the most recent problem; every error that changes state is **also** appended to `history`, so overwriting `lastError` never loses a recorded state change. |
| `history` | **Strictly append-only, hash-chained** log of state changes (1.9.7). Entries are never edited, reordered or removed. |

Claim records are **never deleted automatically**, including `done` ones (they're tiny), so support can always see the full history.

#### 1.9.4 Claim creation (one IndexedDB `readwrite` transaction over `claims`, `totals`, `meta`)

1. Precondition: a signed-in account `userId` (a valid account UUID). Guests never create claims.
2. If any claim for **this `userId`** has `verifyStatus` in `unverified` / `verifying`, **don't create a new claim**; resume that one (1.9.5).
3. Read `L` from `localStorage`. Read `G` and the high-water marks from `totals['guest']`. Read the legacy marker and use `legacyClaimedBeforeEff = max(legacyMarker, totals.guest.legacyClaimedHW)`.
4. Compute `unclaimed` and `amount`. If `amount = 0`, stop.
5. In the same transaction: write the claim record (`submitStatus 'prepared'`, `verifyStatus 'unverified'`); set `totals.guest.legacyClaimedHW = L` and `learningClaimedHW = G` (whole totals: excess forfeited, as today).
6. After commit: set the legacy marker `bulbuli.guest-xp-claimed.v1 = max(current, L)` (idempotent; repaired later if it fails).

`L` comes from `localStorage`, outside the transaction. Two tabs could read `L` at different moments, but the high-water marks are read and advanced **inside** the serialised transaction. So the second tab sees the advanced marks and computes `unclaimed` only from XP earned since. No point can be claimed twice.

#### 1.9.4a A pending claim is fixed; later guest play is never re-pooled into it

- A claim covers exactly the guest XP between `legacyClaimedBefore → legacyClaimedAfter` and `learningClaimedBefore → learningClaimedAfter`, and its `amount` is fixed at creation. All of these are immutable fields covered by `immutableHash`.
- Guest XP earned **after** the claim was created (the legacy total or `G` rising above the marks) is **never added to an existing claim**, whatever its state. Submission always sends the stored `amount`, never a recomputed one. It belongs only to a **later, separate** claim with its own ID, its own `Before` values (equal to this claim's `After` values) and its own record.
- A later claim for the **same account** isn't created while that account has an unfinished claim (1.9.4 step 2). So an account's claims run strictly one after another, with contiguous, non-overlapping ranges.
- A later claim for a **different account** (1.9.6, case 2) can only cover XP above the current marks, so it never overlaps A's pending range.
- The high-water marks in `totals['guest']` only move forward: a transaction that would lower them is refused. They're never rolled back by any outcome: rejected, conflict, corrupt, or abandoned.

#### 1.9.5 Submission and verification (account-bound)

A claim may be handed to the queue **only if** all of these hold, checked immediately before the hand-off:
1. The current Supabase session's user ID **equals** the claim's `userId`.
2. `immutableHash` verifies.
3. `verifyStatus` is `unverified` or `verifying`.

Then `awardXpEvent(claim.userId, 'guest-play', claim.amount, claim.claimId)` is called. Note that it takes the user ID **from the claim**, never from "whoever is signed in". That sets `submitStatus = 'queued'`.

The existing `flushXp` then only sends it while that same user is signed in (1.9.1). The server reply is classified exactly as in 2.7 and written to `verifyStatus`: `done-inserted`; `verifying` → ownership query → `done-duplicate-owned` or `conflict`; `rejected`. Every state change also appends a `history` entry in the **same transaction** (1.9.7).

**Two independent layers** stop a claim for Account A from being sent under Account B: the adapter's user check, and `flushXp`'s session filter. A test removes each layer in turn (C9) to prove the other still holds.

#### 1.9.6 The six owner cases

| # | Case | Exact behaviour |
|---|---|---|
| 1 | **Account A starts a claim and closes the browser before submission** | The claim record (`userId = A`, `prepared`, `unverified`) and the advanced high-water marks are already committed together. Nothing was queued. The guest XP is now **reserved for A**: no one else can claim it. |
| 2 | **Account B then signs in on the same browser** | B's claim flow looks up unfinished claims only with `byUser = B`, so A's claim is **not read for submission, not modified, not submitted, not re-assigned**. B's new claim is computed from the advanced high-water marks, so B can claim only guest XP earned **after** A's claim (usually 0). B's support view shows "1 pending claim belongs to another account on this device" with only a support code, never A's user ID. |
| 3 | **Account A signs in again** | A's flow finds its `prepared` claim via `byUser = A`, verifies the hash and the session match, and submits it with the **same** `claimId`. It creates no new claim while this one is unfinished (1.9.4 step 2). |
| 4 | **Submitted, but the response was lost** | `submitStatus 'queued'`, `verifyStatus 'unverified'`. The existing queue keeps the item (`flushXp` removes items only on a reply), so it's resent with the same ID next time A is signed in. If the queue item is gone (storage cleared), the claim record still says `queued`/`unverified`, so it's re-queued with the same ID. Either way the server counts it at most once. If the first send had succeeded, the resend returns `awarded = 0`, which goes to case 5. |
| 5 | **Server reports a duplicate** (`awarded = 0`) | `verifyStatus = 'verifying'` → ownership query as A: own row → `done-duplicate-owned` (synchronised); no row → `conflict`; query unavailable → stays `verifying` and is retried on A's next session. Never marked done without ownership confirmation. |
| 6 | **Server reports rejected or conflicting** | `rejected` (code `22023`) or `conflict` (case 5, no row). The claim is **retained**, shown in A's support view with its support code, amount, `L`, `G`, timestamps and `lastError`. It's **not retried automatically, not re-issued under a new ID, and the high-water marks aren't rolled back**. Rolling back could let the same guest XP be claimed again (fail closed). Any correction is a support action outside the app. |

**Other failure and recovery behaviour:**

| Situation | Behaviour |
|---|---|
| Creation transaction fails or aborts | Nothing changes (no record, marks unchanged); retried on the next sign-in |
| Legacy marker write fails after commit | The claim is still valid; the marker is repaired on next open from `totals.guest.legacyClaimedHW` |
| `immutableHash` mismatch (corruption) | `verifyStatus = 'blocked-corrupt'`; never submitted; visible to support; no new claim covers the same XP (marks already advanced) |
| Session user differs from the claim's `userId` | Hand-off refused (no write except `lastError` = `{code: 'session-mismatch'}` on that claim); the claim stays pending for its own account |
| Signed out | No submission; claims stay as they are |
| IndexedDB unavailable at release | No learning-XP claim is possible (G can't be read). The existing legacy-only `claimGuestXp` behaviour is kept unchanged for legacy XP (D16) |
| Claim never completed (A never returns) | Stays reserved for A indefinitely and visible to support; never re-assigned (D16) |

#### 1.9.7 Append-only claim history

- **When an entry is appended:** on **every** change of `submitStatus` or `verifyStatus`, including `blocked-corrupt`, and on a refused hand-off (`session-mismatch`). The entry is appended in the **same transaction** as the state change, so the state and its history can't disagree.
- **Entry format:** `{seq, at, field: 'submitStatus' | 'verifyStatus' | 'handoff', from, to, reason, errorCode?, prevHash, entryHash}`.
  - `seq` starts at 1 and increases by 1.
  - `prevHash` is the previous entry's `entryHash`, or `immutableHash` for the first entry.
  - `entryHash` = SHA-256 over the entry's other fields.
- **Append-only:** the store API offers only `appendHistory(claimId, entry)`. No function edits, removes, reorders or truncates entries, and there's no size cap. Growth is naturally small: one entry per real state change. Repeated retries that don't change state only update `attempts`, `lastAttemptAt` and `lastError`, and append nothing.
- **Verification:** before every hand-off and state change, the chain is checked: `seq` contiguous, every `prevHash` matching, the last entry's `to` equal to the current status field. Any mismatch → `verifyStatus = 'blocked-corrupt'`, with that change itself appended. The claim is never submitted again and stays visible to support (fail closed).
- **Support view:** shows the full history of the selected claim, oldest first.

#### 1.9.8 Release acceptance tests

| # | Test |
|---|---|
| G1 | **First claim:** L = 120, G = 80 → one claim record with `amount` 200, `legacyClaimedBefore/After` = 0/120, `learningClaimedBefore/After` = 0/80; one award of 200 with `claimId`; `totals['guest']` marks = 120 / 80; legacy marker = 120; history = one `prepared` entry then `queued` |
| G2 | **Repeated claim:** after G1, sign out and in, refresh, and open a second tab → no new claim record, no new award; queue unchanged |
| G3 | **Interrupted after prepare** (before marker or queue) → next sign-in as the same account re-submits the same `claimId` once; marker repaired; one award |
| G4 | **Interrupted after queue, before `queued` was recorded** → re-submission finds the ID already queued; server counts once; history gains exactly one `queued` entry |
| G5 | **Two tabs claim concurrently** → one claim record; one award |
| G6 | **Above the cap:** L = 400, G = 300 → `amount` 500, `forfeited` 200 (matching today's behaviour); marks = 400 / 300; later guest play of +50 → a **separate** later claim of 50 with `Before` = 400 / 300 |
| G7 | **Legacy only / learning only:** G = 0 gives exactly today's `claimGuestXp` amount; L = 0 claims learning XP only |
| C1 | Case 1: A creates a claim, all connections dropped → record persisted with A's `userId`, L, G, amount, `claimId`, `createdAt`, `prepared`/`unverified`; marks advanced; queue untouched |
| C2 | Case 2: B signs in → zero queue items with A's claim ID; A's record byte-identical; B's claim (if any) covers only XP after the marks; B's support view shows no A user ID |
| C3 | Case 3: A signs in → exactly one queue item with A's `claimId` and A's `userId`; no second claim created |
| C4 | Case 4: the reply is lost after send → resend uses the same ID; with the queue cleared, re-queue from the record uses the same ID; the fake server counts once |
| C5 | Case 5: `awarded = 0` + own row → `done-duplicate-owned`; + no row → `conflict`; + query fails → `verifying` |
| C6 | Case 6: `22023` → `rejected`; retained; no retry; no new ID; marks not rolled back |
| C7 | An attempt to change any immutable field through the store API is refused; `immutableHash` tamper → `blocked-corrupt`, never submitted |
| C8 | Session switches from A to B between the check and the hand-off → hand-off refused (`session-mismatch`) |
| C9 | **Layer independence:** with the adapter's user check disabled, `flushXp` still refuses to send A's item while B is signed in. With `flushXp`'s filter stubbed out, the adapter check still refuses the hand-off. |
| C10 | Two tabs signed in as A concurrently → one claim record, one queue item |
| C11 | **No re-pooling:** A creates a claim for L = 120, G = 80 (amount 200), then guest play raises L to 150 and G to 100 before A signs in again → A's submission sends exactly 200 with the original `claimId`; the record's immutable fields are byte-identical; the extra 50 is claimable only by a later, separate claim with `Before` = 120 / 80 |
| C12 | **Marks only move forward:** an attempt to lower `legacyClaimedHW` or `learningClaimedHW` is refused; no outcome (rejected, conflict, corrupt) rolls them back |
| C13 | **History append-only:** drive a claim through `prepared → queued → replied` and `unverified → verifying → done-duplicate-owned` → exactly one entry per state change, `seq` 1…n contiguous, a valid hash chain, the last entries matching the current fields; no store function can edit or delete an entry |
| C14 | **Tamper detection:** altering, removing or reordering any earlier history entry → chain check fails → `blocked-corrupt` appended; never submitted |
| C15 | **Retries don't rewrite history:** five failed ownership checks in `verifying` → `attempts` = 5, `lastError` updated, **no** new history entries, and earlier entries unchanged |

The first-time-reward gap from carrying guest XP into an account (T3) is unchanged.

---

## 2. Local reward storage: atomic design

### 2.1 Why not `localStorage`

`localStorage` has no transactions and no compare-and-set. A read-modify-write by two tabs can interleave, so **it is not atomic** and isn't used for the new learning ledger or XP. Revision 4's localStorage design, its mirror key and its no-lock fallback are **withdrawn**.

### 2.2 Selected mechanism: one IndexedDB `readwrite` transaction

**What the platform guarantees** (IndexedDB specification, all current browsers):
- A transaction's changes are applied **all or none**: if any request fails or the transaction aborts, nothing is written.
- `readwrite` transactions whose store scopes overlap **run one at a time**, across every tab and connection of the same origin. Reads inside the transaction therefore see a state no other writer can change before it commits. This is what makes "check the ledger, then record" safe across tabs **without** any lock.

**Database** (live `bulbuli-learning-v1`; preview `bulbuli-learning-preview-v1`), **schema version 1, six object stores**:

| Store | Key | Value |
|---|---|---|
| `events` | `[playerId, eventKey]` | `{roundKey, xp, at}`: one row per rewardable event ever recorded |
| `rounds` | `[playerId, roundKey]` | `{gameId, xp, status: 'open' \| 'sealed', eventId, sync: 'none' \| 'local-only' \| 'pending' \| 'verifying' \| 'done' \| 'conflict' \| 'rejected', syncDetail, at}` (also the server outbox; rows are never deleted automatically) |
| `totals` | `playerId` | `{learningXp}`. The **`'guest'` row** also carries the guest-claim high-water marks `{legacyClaimedHW, learningClaimedHW}` (1.9), updated only inside a claim-creating transaction. |
| `records` | `[playerId, gameId]` | game record: band, stars, completed stations, journal, resume state |
| `claims` | `claimId` (deterministic UUID, 1.9.2) | one guest-XP claim record (structure in 1.9.3). **Indexes:** `byUser` on `userId` (find an account's unfinished claims); `bySubmit` on `submitStatus`; `byVerify` on `verifyStatus`; `byCreated` on `createdAt`. Created empty in version 1; used only after the release migration. |
| `meta` | `name` | `{name: 'deviceId', value: <random UUID v4>}`, created once when the database is first created; never changed. Used to make claim IDs unique per browser profile (1.9.2). |

#### 2.2.1 Schema version and upgrade strategy

- **Version 1** creates all six stores and indexes in one `onupgradeneeded` (from `oldVersion 0`). `claims` and `meta` are defined from the start, even though `claims` is unused until release. That avoids a schema upgrade at release, while other tabs may be open.
- **Future versions** are **additive only**: a `switch (oldVersion)` falls through each step (`case 1: …; case 2: …`), adding stores or indexes and never deleting or rewriting existing records in place. A step that must transform data copies to a new store first and is covered by its own migration test.
- **Open tabs:** every connection handles `onversionchange` by closing itself and showing "Bulbuli was updated in another tab; please reload". An upgrade that receives `onblocked` waits and tells the learner to close other Bulbuli tabs. During an upgrade no commit happens anywhere (fail-closed).
- **Downgrade** (an older app opening a newer database): the open fails with `VersionError`, so the game uses Practice mode (2.5) and commits nothing.
- **Tests:** U-DB1 a fresh open creates exactly six stores with the listed key paths and indexes; U-DB2 the `meta.deviceId` row is created once and never changes on reopen; U-DB3 a simulated future v2 upgrade with an open v1 connection triggers `onversionchange` on the old connection and no commit during the upgrade; U-DB4 a `VersionError` leads to Practice mode.

**Every commit is one transaction over `events`, `rounds`, `totals` and `records`:**
1. Read the round / station / report state and every candidate event key.
2. If already recorded, write nothing that adds XP (journal attempts still recorded, see 4.4).
3. Otherwise compute XP **synchronously** with the pure `xpRules`; replay-dependent rules are PENDING (6.2).
4. Put the new `events`, update `rounds`, add to `totals.learningXp`, update `records`.
5. Commit.

Implementation constraint: no `await` on anything except IndexedDB requests inside the transaction, or the browser auto-commits it early. That's why `xpRules` and `eventId` are synchronous and pure (`eventId` uses a bundled synchronous SHA-1, not `crypto.subtle`).

**Durability:** transactions are opened with `{durability: 'strict'}`. Where the browser doesn't support the hint, it uses its default. If a crash happens before the browser persists a transaction, the whole transaction is lost: never partially applied, never doubled.

**Web Locks:** optional extra coordination only, used around "copy sealed rounds to the server queue" (2.4) to avoid redundant enqueues. Correctness never depends on it (2.5).

### 2.3 Transactions

| Transaction | Effect, all in one transaction |
|---|---|
| `startFlight(mission, band)` | Creates the flight resume state with a new `flightKey` in `records`. The flight isn't playable until this commits. |
| `recordAnswer(flightKey, gateOrCheck, answer)` | Appends the answer (first attempt, return question or Quick Check) to the flight resume state, including the return-question schedule. **Feedback (right/wrong) is shown only after this commits.** No XP, no `events`, no `totals`. Aborts if the flight is no longer active. |
| `commitFlight(flight)` | If `rounds[flightKey]` exists → no-op. Else record new event keys, `rounds[flightKey] = {xp, status: 'sealed', sync}`, `totals += xp`, record (stars, band progress), clear the flight's resume state |
| `startVisit(expedition)` | Seals **every** `open` visit of this player for this expedition (as in `sealVisit`) **and** creates the new `open` visit with a new `visitKey`, in one transaction. The visit key doesn't exist, and no station action is possible, until this commits. A new visit can't exist while an older one is still open, so pending XP is finalised exactly once before the new visit begins. |
| `joinVisit(expedition)` | Attaches this tab to the newest `open` visit for the expedition without sealing it. Used by the stale-tab response (4.4.2). Fails if none is open. |
| `saveStationProgress(visitKey, station, step)` | Stores Observe/Investigate progress per station (in `records`, kept across visits). **Verifies the visit is `open`.** No XP. |
| `recordExplainAttempt(visitKey, station, choice)` | Stores the Explain attempt number and result per station (kept across visits, so refreshing can't reset hints). **Feedback is shown only after this commits.** **Verifies the visit is `open`.** No XP. |
| `completeStation(visitKey, station)` | Record pressed. **First verifies `rounds[visitKey].status === 'open'`; if not, the transaction is aborted and nothing is written** (no XP, no journal completion, no change to any round). Otherwise: if the station's event key exists → journal attempt only; else record the event, `totals += xp` (from the committed Explain attempts: 4 / 2 / 0), mark the station complete, write the journal entry, and add `xp` to `rounds[visitKey]` |
| `fileReport(visitKey, report)` | **Verifies the visit is `open`** (aborts with no writes otherwise). Then report events (first filing only), completion, ★★★, `totals`, journal, add to `rounds[visitKey]`, and **seal** it |
| `sealVisit(visitKey)` | `open` → `sealed`; `sync = 'pending'` if signed in and `xp > 0`, `'local-only'` for guests or preview, `'none'` if `xp = 0` |
| `markSync(eventId, state, detail)` | Moves `sync` between the 2.7 states and records diagnostics (attempts, last error, timestamps); **never touches `totals`** and never deletes a round |

### 2.4 Server submission (release; preview uses the recorder sink)

After a transaction that seals a round with `sync = 'pending'` completes, the adapter hands `{eventId, gameId, xp}` to the server sink. At release that's `awardXpEvent`, which pushes into the existing persisted queue with that exact ID, skipping it if already queued. The existing `flushXp` retries with backoff; the ID never changes; `award_xp` ignores repeats. The reply is classified by 2.7 before anything is marked synchronised. Local XP never changes because of a server reply. On app open, sealed rounds still `pending` or `verifying` are handed to the sink again (same ID; harmless if already queued or counted).

### 2.5 Cross-tab concurrency: fail-closed rule

**Requirement:** two tabs must never both commit the same reward, and no user-facing warning is counted as protection.

| Layer | Role | Required for correctness? |
|---|---|---|
| IndexedDB `readwrite` transaction serialisation | **The cross-tab lock.** Overlapping readwrite transactions run one at a time across all tabs and connections of the origin, and the duplicate check runs inside the transaction. Implemented natively by the browser's IndexedDB engine, independently of Web Locks. | **Yes**, sufficient on its own |
| Web Locks | Extra coordination for non-transactional steps (handing sealed rounds to the server sink) | No |
| "Open in another tab" notice | Courtesy only | **No.** Never relied on |

**Fail-closed behaviour:**
- If Web Locks is unavailable, commits proceed **only** through the IndexedDB transaction. The duplicate guarantee is unchanged, because it never depended on Web Locks.
- If IndexedDB can't be opened, times out, or a transaction fails with an unexpected error (2.10), the game enters **Practice mode**. A clear message ("Your progress can't be saved in this browser right now. You can keep playing, but no XP will be earned.") is shown and **no XP is committed**. There's no fallback to `localStorage`.
- No other cross-tab mechanism (e.g. `localStorage` "leader" flags) is used, because none is atomic.

**Tests** (in-memory IndexedDB with two independent connections standing in for two tabs; Web Locks stubbed present or deleted from `navigator`):

| # | Test |
|---|---|
| X1 | Locks available: two connections commit the same flight concurrently → exactly one `rounds` row, one set of `events`, `totals` increased once, one sink hand-off |
| X2 | Locks **unavailable**: same as X1, same result |
| X3 | Locks unavailable: two connections complete the same station in different visits → one station event, XP once, the second visit gets 0 for it |
| X4 | Locks unavailable: two connections seal the same open visit → one seal, one sink hand-off |
| X5 | IndexedDB open fails or times out → Practice mode, zero writes anywhere, zero sink calls |
| X6 | A transaction aborted mid-way (injected request error) → nothing changed; retry succeeds once |

### 2.6 Authoritative record and protective copies (recovery rules)

**Authoritative:** the IndexedDB transaction result (`events`, `rounds`, `totals`, `records`), written together. XP exists locally **only** in `totals.learningXp`, and only because a committed transaction put it there.

**Derived copies (never a source of XP):**
1. the in-memory React snapshot (2.8)
2. at release, the item in the existing `localStorage` XP queue (`bulbuli.xp-queue.v1`), which is a copy of a sealed round's server submission
3. at release, the combined displayed total in `useGameProgress` (legacy total + learning total)

With IndexedDB there is **no separate ledger mirror**: the ledger and the XP total are committed in the same transaction, so they can't disagree. The owner's four mirror cases, written for the revision 4 `localStorage` design, map as follows:

| Owner's case | In this design | Rule | Test |
|---|---|---|---|
| Main record present, mirror missing | Round sealed and `pending` in IndexedDB, but its queue item missing (crash before hand-off, or queue cleared) | **Rebuild** the queue item from the authoritative round with the **same** `eventId`. Local XP unchanged. | R1 |
| Main record present, mirror write failed | Hand-off to the queue threw (storage full) | Round stays `pending`; **retry** the hand-off on next app open and on `online`; local XP unchanged | R2 |
| Mirror contains an event absent from the main record | A queue item or snapshot exists for a round that isn't in IndexedDB (e.g. IndexedDB evicted or cleared while `localStorage` survived) | **Never restore or add local XP from the copy.** The queue item may still be sent (same ID; the server counts it at most once, and 2.7 checks ownership). The learner's local learning total isn't rebuilt from it. | R3 |
| Any ambiguous state | Unreadable or corrupt rows, a version mismatch, a round in an unknown `sync` state, a snapshot disagreeing with the database | **Fail closed:** authoritative rows win; anything unreadable is treated as "already recorded" for duplicate checks (no XP) and logged; the game shows Practice mode if the database itself can't be read | R4 |

Additional tests: **R5** the snapshot is always re-read from IndexedDB after commit and never written back; **R6** a corrupt `events` row for an event key blocks re-awarding that key.

**If you prefer the revision 4 `localStorage` design instead (D13)**, the same four rules apply literally: the main progress value is authoritative for XP; the mirror is consulted only to *block* awards, never to add them; a missing mirror is rebuilt from the main value; failed mirror writes are retried; ambiguous states award nothing. That design still lacks cross-tab atomicity, so it would also need the fail-closed commit gate from 2.5.

### 2.7 Server sync states, ownership and diagnostics

`award_xp` returns `awarded = 0` whenever the event ID already exists, **whoever owns it** (the conflict target is `id` only, section 5). So `awarded = 0` alone never proves the event belongs to this learner.

**States** (stored per sealed round in `rounds.sync`, with `syncDetail = {attempts, lastAttemptAt, lastError, confirmedBy}`):

| State | Entered when | Meaning | Learner sees | Next step |
|---|---|---|---|---|
| `local-only` | Guest or preview round sealed | Never sent | "Saved on this device" | None (guest carry-over at release, 1.9) |
| `pending` | Signed-in round sealed with XP > 0; or a network error during sending | Waiting to send | "Saved on this device · will sync" | Existing queue retry with the same ID |
| `verifying` | Server replied `awarded = 0`, and the ownership query hasn't yet succeeded (**ownership check temporarily unavailable**: offline, timeout, server error) | Unknown whether this learner owns the existing event | "Saved on this device · checking sync" | Re-run the ownership query on next open, `online`, or "Retry check" |
| `done` with `confirmedBy: 'inserted'` | `awarded > 0` | Counted for this learner | "Synced" | None |
| `done` with `confirmedBy: 'duplicate-owned'` | `awarded = 0` **and** the ownership query returned the learner's own row | **Verified duplicate owned by the learner** (an earlier send was already counted) | "Synced" | None |
| `conflict` | `awarded = 0` **and** the ownership query succeeded but returned **no row** | **Event ID already exists under another account**; not counted for this learner | "Some progress couldn't sync to your account. It's still saved on this device. Support code: XXXX-XXXX" | Kept for support; never auto-resolved |
| `rejected` | Server error `22023` (invalid input) | The server refused the award | Same message as `conflict`, with its own support code | Kept for support; not retried automatically |

**Rules:**
- Only `done` counts as synchronised, and `done` after `awarded = 0` requires the ownership query to have returned the learner's own row.
- A server reply never changes local XP.
- `conflict` and `rejected` rounds are **never deleted, never silently discarded, and never marked `done`** without ownership confirmation.
- No client-side workaround: a re-issued ID could be pre-claimed in exactly the same way.

**Ownership query** (live adapter, release): `supabase.from('xp_events').select('id').eq('id', eventId).maybeSingle()` as the signed-in learner. Under the RLS policy verified in the migration files (5.1), it returns only rows where `user_id = auth.uid()`. If the deployed policy were missing or broken, the result would be `conflict` (no row), never a false `done` (D10).

**Diagnostics:**
- **Learner:** a small sync indicator in the journal/results screen showing one of the messages above. Nothing technical.
- **Support view** ("Sync details", reachable from the journal's settings menu): one row per sealed round showing game, round key, amount, `eventId`, state, `confirmedBy`, attempts, last error code, and when it was sealed and last tried. Buttons: **Retry check** (re-runs the ownership query for `verifying`, `conflict` and `rejected`; can only move a round to `done` through the confirmation rule) and **Copy diagnostics** (JSON of the selected rows, no personal data beyond the user ID already in the session).
- **Support code:** the first 8 hex characters of `eventId`, so support can find the row in `xp_events` or confirm it's missing.
- **Recoverable for support:** a `conflict` or `rejected` round keeps everything needed to investigate (event ID, amount, round key, timestamps). Any manual correction of account XP would be done by an administrator outside the app, and isn't designed here.

**Possible future SQL change, deferred (D14); not designed or implemented:** let `award_xp` report whether an existing event belongs to the caller, or make the duplicate check per learner. Either requires a migration and your separate approval.

**Tests** (L2: fake Supabase client emulating `award_xp` and RLS-filtered `select`):

| # | Test |
|---|---|
| O1 | First submission → `awarded > 0` → `done` / `inserted`; local XP unchanged by the reply |
| O2 | Resubmission of the learner's own event → `awarded = 0` → own row returned → `done` / `duplicate-owned` |
| O3 | Event ID pre-inserted under **another** user → `awarded = 0` → no row → `conflict`, never `done`; local XP unchanged; no re-issue |
| O4 | Ownership query fails (offline) → `verifying`; retried later; never `done` without the row |
| O5 | `22023` → `rejected`; round retained; not retried automatically |
| O6 | Support **Retry check** on a `conflict` after the fake server's row ownership is corrected → `done` / `duplicate-owned`; with ownership unchanged → stays `conflict` |
| O7 | No state transition ever deletes a round; `conflict` and `rejected` rows survive reloads |
| O8 | Learner messages and support codes match each state; support view lists every non-`done` round |

### 2.8 Refreshing React state after a transaction

- `learningStore.js` keeps an in-memory snapshot per adapter (`totals`, `records` for the current player), exposed through `useSyncExternalStore`.
- The snapshot is updated **only in the transaction's `oncomplete` handler**, by re-reading the affected rows in a short `readonly` transaction. Nothing is updated optimistically, so the UI never shows XP that wasn't committed. On `onerror`/`onabort`, the snapshot is unchanged and the game shows "Couldn't save. Try again."
- **Other tabs:** after `oncomplete`, the adapter posts `{type: 'committed', playerId}` on a `BroadcastChannel` (live: `bulbuli-learning`; preview: `bulbuli-learning-preview`), and receiving tabs re-read. Where `BroadcastChannel` is missing, tabs re-read on `focus` and `visibilitychange`. Stale snapshots can only show *less*, never cause a double award, because every commit re-checks inside its own transaction.
- **Release only:** the live store also notifies `useGameProgress` so the displayed total (legacy + learning) updates (1.7).

### 2.9 Required scenarios

| Scenario | Outcome |
|---|---|
| Refresh on the result screen | Commit already completed and resume state cleared in the same transaction; results rebuilt from `rounds`; no recommit |
| Double-click | Button disabled; a racing second call finds the round/event in its own transaction → no-op |
| Network retry / offline queue | Same `eventId`; server inserts once; local `totals` untouched by any reply; `awarded = 0` goes through the ownership check (2.7) |
| Browser crash during save | Transaction either persisted whole or not at all; if not, the round/station is still resumable or re-doable |
| Two tabs completing the same event | Transactions serialise; the second sees the first's `events` row → no XP |
| Two tabs updating the same learner | Serialised; each reads committed state inside its own transaction |
| Server success, then local refresh | Local commit precedes server submission, so server success implies a completed local transaction. If local storage was lost anyway (eviction), local XP isn't rebuilt from the server or the queue (2.6, R3). The learner's server XP is intact. |
| Existing games writing `localStorage` at the same time | Unaffected: the new ledger and learning XP aren't in `localStorage` |

### 2.10 Browser support and limitations

| Item | Limitation | Handling |
|---|---|---|
| IndexedDB availability | Supported in all current browsers. Can be unavailable or fail to open in some private-browsing modes (e.g. Firefox before 115) or when blocked by settings | **No fallback store.** Practice mode with a clear message (2.5); nothing committed. It never falls back to `localStorage`. |
| Web Locks availability | Missing in some older browsers (e.g. Safari before 15.4) | No effect on correctness (2.5, X2–X4) |
| Old Safari IndexedDB bugs | Some Safari 14.x versions could hang on first open | Open with a timeout; on timeout, Practice mode |
| Storage eviction | Browsers may evict IndexedDB under storage pressure unless persistence is granted; ledger and learning XP disappear **together** (consistent, but lost locally) | Request `navigator.storage.persist()`; accounts keep server XP; documented (T6) |
| `durability: 'strict'` | Honoured only where supported | Otherwise browser default; crash loses whole transaction only |
| Upgrade while another tab is open | A future schema upgrade is blocked by open connections | Handle `onversionchange` by closing and asking to reload |
| Separate from the existing `localStorage` total | Until release wiring, learning XP isn't part of the displayed total | Intended; release step 1.7 |

### 2.11 Persistence points and interrupted transactions

**Rule:** an action is durable only when its IndexedDB transaction has fired `oncomplete`. Until then, it didn't happen. **No XP is ever awarded for an action whose required transaction didn't commit.** For answers, feedback is shown only **after** the commit. So a learner can't see "wrong", close the tab before the save, and retry as if it were a first attempt.

| Item | Becomes durable when | If interrupted **before** commit | If interrupted **after** commit | What the learner sees / can do |
|---|---|---|---|---|
| Flight start / flight key | `startFlight` commits | No flight exists; the menu shows the mission as not started | Flight resume state exists | "Continue flight" (within the D6 window) or start over |
| Sky Science answer (gate, return, Quick Check) | `recordAnswer` commits; feedback appears only then | The answer didn't count, and no feedback was shown. On resume, the **same** gate/item is shown again as unanswered. | Counted as answered with its result; return-question schedule saved | Resume continues at the next unanswered gate. Committed answers can't be changed. |
| Flight completion (XP) | `commitFlight` commits | No XP; the flight is still resumable at its results step. Finishing again computes the same result from the same committed answers. | XP applied once; resume state cleared | Results screen rebuilt from `rounds` after refresh |
| Visit key | `startVisit` commits (seals older visits in the same transaction) | No new visit; older open visits unchanged; the "Unfinished visit" banner is still shown | New visit open; older ones sealed | Station actions are enabled only after commit |
| Station Observe / Investigate progress | `saveStationProgress` commits | That step must be redone; nothing else lost | Step restored on resume | Continues at the next incomplete step |
| Explain attempt | `recordExplainAttempt` commits; feedback appears only then | The attempt didn't count, and no feedback was shown; the same question is offered again with the same attempt number | Attempt number and result saved, so the hint/explanation state survives refresh | Can't reset hints by refreshing |
| Record (station completion + XP) | `completeStation` commits | Station **not** complete, no XP, no journal completion; Explain attempts already committed are kept | Station complete, XP in the local total, journal entry, amount added to the open visit | "Record" offered again if not committed; never twice if committed |
| Visit seal | `sealVisit` / `fileReport` / `startVisit` commits | Visit still `open`; its stations and XP are already safe locally; sealing happens on next leave or `startVisit` | Visit sealed; award handed to the sink (signed in, XP > 0) | "Saved on this device · will sync" until synced |
| Server hand-off | After the seal commits (2.4) | Round stays `pending`; re-handed-off on next open | Queue item exists | No learner action needed |

**Failure-injection tests** (L2: abort the transaction at the named point, or drop all connections to simulate a closed tab, then reopen):

| # | Interruption | Expected |
|---|---|---|
| P1 | During `recordAnswer` (abort before complete) | No answer stored; no feedback was emitted; on resume the same gate is shown as unanswered; no XP |
| P2 | Right after `recordAnswer` committed, tab closed | Answer present on resume; same result; next gate shown; no XP yet |
| P3 | During `commitFlight` | No `events`, `rounds` or `totals` change; flight resumable at results; second attempt commits once |
| P4 | During `saveStationProgress` | Step not saved; earlier steps intact; no XP |
| P5 | During `recordExplainAttempt` | Attempt not counted, no feedback emitted; retry uses the same attempt number |
| P6 | During `completeStation` (Record) | Station not complete; no XP; no journal completion; visit round unchanged |
| P7 | Right after `completeStation` committed, tab closed | Station complete and XP present once on reopen; the "Unfinished visit" banner shows it |
| P8 | During `sealVisit` | Visit still `open`, sum unchanged; no sink hand-off; the next `startVisit` seals it once |
| P9 | During `startVisit` (which seals the old visit) | Old visit still `open`; no new visit; retry seals once and opens one visit |
| P10 | After the seal committed, before the sink hand-off | Round `pending`; next open hands it off once with the same `eventId` |

---

## 3. Deterministic event IDs

- **Server event ID** = UUID v5 (RFC 4122, SHA-1) under a fixed Bulbuli namespace UUID, over the name `bulbuli/v1|<userId>|<gameId>|<eventType>|<roundKey>`. `eventType` is `round` (Sky Science flight) or `visit` (World Explorer visit); `roundKey` is `sky:flight:<id>` or `we:visit:<id>`.
- **Local event keys** (`events` store) are namespaced by player (key part), game, band/expedition and objective/station. They never leave the device.
- `v1` and the namespace are fixed permanently.

| # | Test |
|---|---|
| E1 | Same learner + same game + same round/visit → identical ID, across reloads |
| E2 | Same learner + different round, game or event type → different ID |
| E3 | Different learners + same round key → different IDs |
| E4 | Output is a valid v5 UUID accepted by the existing `UUID_RE` in `xp.js` |
| E5 | Repeated submission → one queue item; against a fake client emulating `ON CONFLICT (id) DO NOTHING` + `ROW_COUNT`, one XP award and one counter increment. Real-database proof needs a test project (D9). |

---

## 4. Activity counters and reward lifecycle

### 4.1 Definitions

| Term | Definition |
|---|---|
| Completed learning activity: Sky Science | One flight in which every primary gate is resolved (answered, or asked as a calm question after hearts ran out) and all Quick Checks are answered |
| Completed learning activity: World Explorer | One expedition **visit** that is sealed with at least one newly earned reward (a station completed after Record, or a report filed) |
| Counter-incrementing award event | One successful first-time `award_xp` call. The existing function adds `activities_completed + 1` and `stats[gameId].plays + 1` only when it inserts a new event row (section 5) |

### 4.2 Aggregation rule

**One completed learning activity → at most one award event → at most one increment of each counter.**
- Flight: gate + Quick Check + newly reached star tiers → one award with the flight's ID. 1 increment if the sum > 0, else 0.
- Visit: all station, report, completion and ★★★ XP earned during the visit → one award with the visit's ID. 1 increment if the sum > 0, else 0. **Stations never send their own award.**
- Sums stay far below the 500 per-call cap, so `splitAward` never splits an activity.
- Zero-XP replay → no award → no increment, as in existing games.

### 4.3 Sky Science flight lifecycle

| Moment | Local | Server | Counters |
|---|---|---|---|
| During the flight | Each answer committed to the flight's resume state by `recordAnswer` before its feedback is shown (2.11); nothing in `events` or `totals` | — | — |
| Flight completed | `commitFlight`: events, round (sealed), `totals += xp`, one transaction | Award queued with the flight ID if signed in and `xp > 0` | +1 each if `xp > 0` |
| Interrupted, resumed and finished | As above, at the finish | As above | +1 max |
| Abandoned (subject to D6: new flight started or resume window expired) | Resume state discarded; nothing recorded; objectives remain earnable | — | 0 |

### 4.4 World Explorer station-reward lifecycle

| Stage | What happens | When local XP changes | When the server sees it | Counters |
|---|---|---|---|---|
| **Observe / Investigate / Explain in progress** | Partial progress in the resume state (`records`); **no reward yet**, because a station isn't complete before Record | — | — | — |
| **Record pressed (station completed)** | `completeStation` transaction: station event recorded, station marked complete, journal entry, `totals.learningXp += stationXp` (4 / 2 / 0), and `stationXp` added to the open visit round | **Immediately, durably**, in that transaction | Not yet; held in the open visit round | — |
| **More stations / report filed in the same visit** | Same, each in its own transaction; filing the report also seals the visit in the same transaction (`fileReport`) | Immediately per transaction | On seal | — |
| **Visit sealed** (leave expedition, report filed, or recovered on next open) | `sealVisit`: `open` → `sealed`, `sync` set | No change (already counted) | **One** award: `{eventId: uuid(visit), amount: visit sum}` if signed in and sum > 0 | **+1 each** if sum > 0, else 0 |
| **Browser closed / refreshed / expedition abandoned mid-visit** | Every station already completed stays recorded in `events`, `totals` and the journal: **it doesn't disappear**. The visit round stays `open`. | Already applied | When the learner next starts a visit, `startVisit` seals the old one in the same transaction, and it's submitted as that visit's single award | +1 each if its sum > 0 |
| **Interrupted inside a station before Record** | Station not complete; resume state restores Observe/Investigate progress; no XP | — | — | — |
| **Resuming the expedition** | A new visit with a new key; completed stations stay completed; learner continues with the remaining stations | — | New visit's award at its seal | +1 max for the new visit |
| **Replaying a completed station** | Allowed for learning; journal records the attempt; its event key already exists. Whether replay pays XP is **UNRESOLVED (U3)**; until resolved it's a `PENDING` policy | Only if U3 allows | Inside the current visit's single award | No extra increment |
| **Report retry** | Journal records everything; first-filing-only rules mean 0 report XP; completion XP only if first reached now (D3, subject to the proposal) | Per D3 | Inside the current visit's single award | +1 only if that visit's sum > 0 |

### 4.4.1 Interrupted visit: what the learner sees

1. **Completed stations stay saved.** Closing or refreshing the browser never loses a station that reached Record; its XP is already in the learner's local total.
2. **On reopening World Explorer**, the expedition card shows an **"Unfinished visit"** banner. Example: "Sundarbans: you completed 3 of 5 stations last time (10 XP saved)." Its buttons are **Continue expedition** and **View journal**. The banner reads only committed data.
3. **Continue expedition** runs `startVisit`. In one transaction the previous visit is **sealed** (its pending server award finalised **exactly once**) and a new visit opens. The learner continues at the first incomplete station; for a station interrupted before Record, they continue from its saved Observe/Investigate progress.
4. **Completed stations don't need repeating** to receive their XP. Their XP was applied locally at Record, and the server award is carried by the sealed visit.
5. If the server can't be reached when the old visit is sealed, the sealing still happens locally. The award stays `pending` in the outbox and is sent later with the same ID. The learner sees "Saved on this device; will sync when online", never a request to replay.
6. Opening the expedition in two tabs at once: `startVisit` transactions serialise, so the old visit is sealed once and each tab gets its own new visit.

**Tests:**

| # | Scenario | Expected |
|---|---|---|
| W1 | Complete 2 stations, **refresh** | Both stations still complete; local total includes their XP once; banner shown; no award submitted yet |
| W2 | W1, then **Continue** | Old visit sealed once (one sink hand-off with the old visit's ID and sum); new visit open; stations 1–2 not offered for XP again |
| W3 | Complete 3 stations, **close the browser** (drop all connections), reopen, Continue | Same as W2; local total unchanged by reopening |
| W4 | **Network interruption** during submission of the sealed visit | Round stays `pending`; retried with the same ID; on reconnect one award; local total unchanged throughout |
| W5 | Refresh **inside** a station before Record | Station not complete, no XP; Observe/Investigate progress restored |
| W6 | Two connections both run `startVisit` for the same expedition | Old visit sealed exactly once; two distinct new visits |
| W7 | Reopen, seal, then refresh again before doing anything | No second seal, no second award; banner gone (the new visit is empty and earns nothing until a station is completed) |

### 4.4.2 Stale-tab protection

A tab is **stale** when its visit was sealed by another tab or window, through `startVisit` there or a report filed there.
- Every visit-scoped transaction (`saveStationProgress`, `recordExplainAttempt`, `completeStation`, `fileReport`, `sealVisit`) first checks `rounds[visitKey].status === 'open'` **inside the same transaction**. If not, it aborts **before any write**. A stale tab therefore can't add XP, mark a station complete, write a journal completion, change a sealed visit's sum or status, or alter its server award.
- **Learner-facing response:** the stale action stops and a dialog explains: "This expedition continued in another tab or window. Everything saved there is safe." The choices are:
  - **Continue here**: runs `joinVisit` to attach to the current open visit, re-reads committed state, and returns to the same station showing its committed progress
  - **Refresh**: reloads committed state and shows the expedition screen with the banner if applicable

  The learner's uncommitted input in the stale tab (e.g. an Explain choice that didn't commit) isn't kept; it was never counted.

**Tests** (L2, two connections; and as part of L3 where practical):

| # | Test |
|---|---|
| S1 | **Owner's scenario:** Tab A `startVisit` → visit VA open. Tab B `startVisit` for the same expedition → VA sealed, VB open. Tab A attempts `completeStation(VA, s1)`. **Expected:** transaction aborted; `events` has no s1 event; `totals` unchanged; s1 not marked complete and no journal completion; `rounds[VA]` byte-identical to its sealed state (status, sum, `sync`, `eventId`); no sink hand-off; Tab A receives the `visit-sealed` result and shows the dialog. |
| S2 | Same as S1 for `recordExplainAttempt`, `saveStationProgress` and `fileReport` from Tab A → no writes |
| S3 | Tab A chooses **Continue here** → `joinVisit` attaches to VB; completing s1 then adds XP once, to VB |
| S4 | Tabs A and B both joined to VB complete the same station concurrently → one event, XP once, VB sum increased once |

**Guests and preview:** identical local lifecycle; sealed rounds get `sync = 'local-only'` and are never submitted. At release, a guest's learning XP joins the existing one-time 500-XP carry-over (1.7).

### 4.5 What the current database function cannot do

`award_xp` can't add XP without incrementing both counters, can't increment them without XP, and dedupes only on the event ID. Consequences:
- A zero-XP activity can't count as an activity.
- Once-ever rewards (mission tiers, expedition completion, report ★★★) can't have their own permanent server IDs without extra counter increments. Under aggregation they're protected by the local ledger only; another device or cleared storage could earn them again.
- Separate deterministic events per reward type would each add 1 to both counters.

**Alternatives (D2; no database solution is designed or proposed here):** **A, aggregate per activity** (this design; exact counters; once-ever protection local only) · B, separate events per reward type (server-side protection; counters inflated by up to 24 per learner lifetime) · C, a future database change (not designed; only if you ask).

### 4.6 Existing behaviour (recorded, not changed)

Counters already mean "number of successful `award_xp` calls"; `awardXp` merges only within 1.2 s, so a game awarding per answer with longer gaps (Math Hero) already counts several plays per run.

---

## 5. Verified SQL behaviour of `award_xp` and `xp_events` RLS

**Source inspected:** `supabase/migrations/20261025000000_profiles_and_xp.sql`; no later migration redefines it.

| Question | Finding |
|---|---|
| Counters only on a new `xp_events` row? | **Yes**: the counter `UPDATE` runs only inside `IF v_inserted = 1` (`GET DIAGNOSTICS … ROW_COUNT` after `INSERT … ON CONFLICT (id) DO NOTHING`) |
| On a duplicate | No-op inserts only; returns current totals with `awarded = 0` |
| Atomic? | Single PostgREST request transaction, no `EXCEPTION` block; any error rolls back everything |
| Same ID concurrently | Second insert waits on the first; conflicts or inserts; exactly once |
| Different IDs concurrently | Row lock serialises `xp = xp + …`; no lost update |
| Is `ON CONFLICT` alone the idempotency? | No: conflict + `ROW_COUNT` gate + one transaction together |
| Limits | Amount 1–500; game id `^[a-z0-9-]{1,40}$`; signed in |
| **Acknowledged limitation** | Conflict target is the event ID only, not (user, ID). Someone who knew a learner's user ID and the public namespace could pre-submit that learner's round ID under their own account. They'd get the XP, and the learner's award would return `awarded = 0`. Low risk (user IDs aren't shown). **No SQL change or migration is proposed.** Client handling: 2.7; possible future change: D14. |
| Deployed function | Only the migration file was verified; confirm with `select pg_get_functiondef('public.award_xp(text,integer,uuid)'::regprocedure);` (D10) |

### 5.1 RLS check: can a learner read their own `xp_events` row by event ID?

**Checked in all six migration files** (2 Nov 2026), not inferred from the function:

| Item | Finding in `20261025000000_profiles_and_xp.sql` |
|---|---|
| RLS enabled | `alter table public.xp_events enable row level security;` |
| SELECT policy | `create policy "Players read their own xp events" on public.xp_events for select to authenticated using ((select auth.uid()) = user_id);` |
| Table grants | `grant select on public.xp_events to authenticated;` `revoke select on public.xp_events from anon;` `revoke insert, update, delete … from anon, authenticated;` |
| Later migrations | No other migration mentions `xp_events` policies or grants, or disables RLS on it. The `drop policy` statements in later files apply only to `favorite_games`, `game_feedback`, `game_events`, `leaderboards` and `certificates`. |

**Conclusion, for the migration files:** a signed-in learner can `select` `xp_events` rows where `user_id` is their own ID, including by `id = <eventId>`. A row owned by another account is filtered out (returns no row, not an error). Anonymous users can't read the table. This is what 2.7's ownership check relies on.

**Limitation:** the **deployed** database hasn't been inspected; this session has no database access. Policies could have been changed in the Supabase dashboard. Until you run the queries below (D10), the ownership check is designed to fail closed: no row → `conflict`, never `done`. That's why a missing or broken policy can only cause false `conflict` results, never false success.

```sql
select policyname, cmd, roles, qual from pg_policies where schemaname = 'public' and tablename = 'xp_events';
select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'xp_events';
select relrowsecurity from pg_class where oid = 'public.xp_events'::regclass;
```

---

## 6. XP and replay rules

### 6.1 Amounts quoted in the Phase 2A brief (not yet checked against the proposal)

| Game | Event | XP |
|---|---|---|
| Sky Science | Primary gate correct first attempt / wrong first / return question | 1 / 0 / 0 |
| Sky Science | Quick Check correct | 2 |
| Sky Science | First ★ / ★★ / ★★★ per mission | 3 / 7 / 5. Incremental, once per mission across bands: **kept only if the proposal confirms it** |
| World Explorer | Station: first try / after hint / after explanation | 4 / 2 / 0 |
| World Explorer | Correct report answer, first filing only | 3 |
| World Explorer | First expedition completion | 20 |
| World Explorer | First ★★★ report | 5 |

Also from the brief: tiers never repeat on replay or band change; report retries and replays of completed expeditions pay no report XP; the journal records every attempt.

### 6.2 UNRESOLVED: assumptions only, not final rules, not implementable requirements

| # | Item |
|---|---|
| U1 | Gate XP replay limits |
| U2 | Quick Check XP replay limits |
| U3 | Station XP replay limits |
| U4 | Cross-band reward rules (re-earning gate / Quick Check XP in another band) |
| U5 | Daily or lifetime earning caps |
| U6 | Confirmation of the 3 / 7 / 5 incremental tier structure |
| U7 | Report ★★★ only on first filing; completion XP on first completion even via retry (D3) |

**Precondition:** U1–U7 must be resolved from the corrected proposal, or by your explicit decision, **before Stage 2A-1 is approved**. In code they're `PENDING` values, and a test fails while any remains `PENDING`.

---

## 7. Guessing-odds analysis: PENDING

The original `guess_odds.py` hasn't been received. **No guessing results are part of this design**, earlier independently calculated figures are withdrawn, and no star-rule change is recommended. When supplied, the script will be run exactly as provided, and this section will record verbatim:
- file name, size and sha256
- exact probabilities
- simulated probabilities (with its trial count and seed)
- ★, ★★ and ★★★ probabilities
- the script's own assumptions
- limitations
- any differences from this design's mechanics (reported, not "fixed")

Random-guessing results stay separate from real learner performance.

---

## 8. Game design (unchanged)

### 8.1 Sky Science Explorer (folder `src/games/sky-science/`)

| | Ages 4–6 | Ages 7–8 | Ages 9–10 |
|---|---|---|---|
| Prompt | Picture + spoken, no reading | ≤ ~10 words + spoken | ≤ ~18 words + optional speech |
| Primary gates | 6 | 8 | 8 |
| Response window | 5 s | 4 s | 3 s or thinking pause |
| Quick Checks | 2 | 3 | 4 (≥ 1 application) |
| Clouds cost hearts | No | Yes | Yes |
| Wrong answer costs a heart | Never | Never | Never |

- Skill ladder: identify/classify → compare → cause & effect → predict → apply.
- One return question per wrong first answer (different item ID and wording, same objective).
- Stars: ★ ≥ 75 % objectives secured; ★★ ≥ 75 % primary first-try; ★★★ all primary first-try + all Quick Checks.
- Six missions in the architecture; wave 2 missions show "Coming soon" until their content is approved.

### 8.2 World Explorer 3D (folder `src/games/world-explorer/`)

- Sundarbans, Amazon and Sahara playable in preview; Himalaya, Arctic and Great Barrier Reef shown as "Coming soon".
- Five distinct stations each: Observe → Investigate → Explain (hint, then explanation) → Record.
- Journal; 5-question report (set A) with one retry (set B); ★ 3/5, ★★ 4/5, ★★★ 5/5.

### 8.3 Content release gate

- Each item has: stable ID, version, objective, role, band, skill, en/bn prompt/answer/explanation, distractors with misconceptions, source `{url, publisher, supports, verifiedOn}`, `review.accuracy` and `review.bangla` each `{reviewer, date, status, hash}`.
- A hash covers the reviewable fields, so any edit invalidates both approvals.
- `reviewers.js` starts empty; no auto-approval.
- `npm run content:report` shows the totals; tests fail on invalid approvals.
- About 225 wave 1 items is an estimate, not a target.

---

## 9. Technical risks

| # | Risk | Status |
|---|---|---|
| T1 | Proposal and `guess_odds.py` missing | 6.2 and 7 unresolved; blocks approval |
| T2 | Cross-device re-earning of once-ever rewards (4.5) | D2 / D8 |
| T3 | Guest → account re-earning (existing 500-XP carry-over) | D8 |
| T4 | IndexedDB unavailable (some private modes, blocked storage) | Practice mode, no saving, never a non-atomic fallback |
| T5 | IndexedDB eviction under storage pressure | `storage.persist()` request; server XP for accounts |
| T6 | Crash before a transaction is persisted | Whole transaction lost, never partial; activity re-doable |
| T7 | Event-ID pre-claiming / another account owning a learner's event ID (sections 2.7, 5) | Detected as `conflict` (never treated as success); that round's XP can't reach the account under the current function; D14 |
| T8 | Deployed `award_xp` or `xp_events` RLS policies may differ from the migration files | D10; ownership check fails closed (`conflict`), never false success |
| T9 | No real-database test without a test project | D9 |
| T10 | Flat cylinder colliders limit terrain | Stepped design + reachability tests |
| T11 | Duplicated flight logic in `sky-science/` | Accepted |
| T12 | Browser Bangla voice often missing for ages 4–6 | D7 |
| T13 | Bangla drafted by me | Always awaiting Bangla review until approved |
| T14 | Old games still fetch Draco from gstatic; no offline caching for anyone until release | Deliberate deferral (1.8) |
| T16 | Serving the decoder from `/node_modules/…` relies on the Vite dev server | Verified in the 2A-2 preview smoke test; if unreliable, reported to you rather than copied into `public/` |
| T17 | Storage design choice (IndexedDB vs. revision 4's `localStorage` + mirror) differs between the two owner briefs | D13 |
| T18 | Stale tabs after another tab seals a visit | Visit-open check inside every visit-scoped transaction (4.4.2, S1–S4) |
| T19 | Real-browser isolation is proven only for the browsers the L3 tests actually run in | B1–B6 in Chromium at minimum; tooling D15 |
| T20 | Conflicts can't be resolved inside the app under the current SQL | Retained and visible for support (2.7); D14 deferred |
| T21 | Guest claim mixes two stores (legacy `localStorage` total and IndexedDB learning total) | IndexedDB claim record and high-water marks authoritative; deterministic claim ID; account-bound submission with two layers (1.9); release only |
| T22 | A pending claim whose account never signs in again keeps that guest XP reserved indefinitely | Intended (fail closed); visible to support; D16 |
| T15 | Two local XP stores until release (legacy `localStorage` total + IndexedDB learning total) | Combined at release (1.7); no double-counting because each XP point lives in exactly one store |

---

## 10. Implementation sequence (only after approval)

0. **Preconditions:** proposal received and 6.2 resolved; `guess_odds.py` run unmodified and section 7 filled in; your approval of this document.
1. **Pre-flight:**
   - sha256 manifest of folders `src/games/sky-runner/` and `src/games/skyward-explorer/` and every file listed as untouched in 1.3
   - baseline `dist/` file list
2. **2A-1 Foundation** (`src/learning/`):
   - pure modules, IndexedDB store and transactions, adapters (preview + live, live unwired), content gate, report script
   - L1/L2 tests: Part 7 XP cases, the 2.9 scenarios against an in-memory IndexedDB, cross-tab X1–X6, recovery R1–R6, sync states O1–O8, persistence P1–P10, stale tab S1–S4, E1–E5, counter rules 4.2–4.4, interrupted visits W1–W7, isolation I1–I9, content gate
   - then the full test suite, lint (no new warnings beyond 201), build, `dist` comparison, manifest check
3. **2A-2 Sky Science Explorer** in folder `src/games/sky-science/`:
   - flight logic, canvas (bird loaded with the bundled `three` decoder via the preview adapter), band picker, six-mission menu, gates, return questions, Quick Checks, stars, resume, audio, reduced motion
   - wave 1 content (verified sources, awaiting review)
   - preview screenshots; real-browser tests B1, B2, B4–B6 (flight) including the no-gstatic check
4. **2A-3 World Explorer 3D** in folder `src/games/world-explorer/`:
   - controller, three biomes with reachability tests, stations with the 4.4 lifecycle, journal, reports A/B, Coming-soon cards
   - wave 1 content (verified sources, awaiting review)
   - real-browser tests B3–B6 (station), and S1 in a real browser with two tabs where practical
5. **2A-4 Catalogue (prepared only):** text patch for the `'sky-runner'` / `'skyward-explorer'` entries plus the release wiring patch (1.7) and the guest-claim migration (1.9, with tests G1–G7), delivered for review, **not applied**.
6. **Wave 2 content** after wave 1 review.
7. **QA:** full suite, lint, build, I1–I9, real-browser B1–B6, browser smoke tests (new games in preview; regression list: Math Hero, Math Master, Shape Lab 3D, Adventure Run 3D, Pro Coder, 3D Game Studio, achievements, certificates, login/guest, existing routes) against baseline 0.1.
8. Nothing committed or pushed without explicit approval.

---

## 11. Owner decision checklist (revision 7; statuses unchanged from revision 6)

Status key: **Awaiting**: owner decision or input still needed. **Deferred**: intentionally postponed to the release migration by owner instruction; not decided now. **Approved**: explicitly approved by the owner. *No item is Approved.*

| # | Decision | Status | Proposed option (not approved) | Referenced in |
|---|---|---|---|---|
| **D1** | Architecture (section 1): new folders `src/games/sky-science/` and `src/games/world-explorer/`; `src/learning/` with IndexedDB + adapters; dev-only preview page; bundled `three` decoder in development (no `public/draco/`); no existing application file changed during development; shared-file wiring deferred to release. **Plus one package script, `content:report`, in `package.json`** (this D1 item covers only that script, not any dependency) | Awaiting. The revision 6 brief asks to preserve this architecture; that isn't recorded as approval | As written | 1.2, 1.3 |
| **D2** | Activity-counter alternative (4.5): A aggregate per activity; B separate events; C future database change | Awaiting | A | 4.5, 9 |
| **D3** | Report ★★★ only on first filing; completion XP on first completion even via retry (U7) | Awaiting; **subject to the corrected proposal** | As stated | 4.4, 6.2 |
| **D4** | Supply the corrected Phase 2 proposal (resolves U1–U7) | **Awaiting owner input. Hard precondition for Stage 2A-1 approval** | — | 6.2, 10 |
| **D5** | Supply the original `guess_odds.py` (section 7) | **Awaiting owner input. Hard precondition for Stage 2A-1 approval** | — | 7, 10 |
| **D6** | Sky Science: hearts at zero → remaining gates as calm questions; XP committed at flight end; abandoned flights discarded; resume window 24 h | Awaiting; **subject to the corrected proposal** | As stated | 4.3, 4.4.1 |
| **D7** | Ages 4–6 Bangla audio: picture + chime + icon fallback now; recorded clips later | Awaiting | As stated | 9 |
| **D8** | Accept known gaps T2 (cross-device re-earning) and T3 (guest → account re-earning) for Phase 2A | Awaiting | Accept | 9 |
| **D9** | Real-database testing: fake client only, or a test account / staging Supabase project | Awaiting | Staging project if available | 3, 1.9, 9 |
| **D10** | Run the `pg_get_functiondef` query (5) and the three RLS queries (5.1); share the output | Awaiting owner action | Please run | 2.7, 5, 5.1, 9 |
| **D11** | Release-time items (1.7: registry takeover, shared-file wiring, `public/draco/` self-hosting, service-worker caching) | **Deferred** to the separately approved release migration (owner instruction) | — | 1.7, 1.8 |
| **D12** | **Test-only devDependency** providing an in-memory IndexedDB for Node tests (e.g. `fake-indexeddb`), not shipped to users. Separate from the D1 `content:report` script. Alternative: a hand-written in-memory test double (weaker fidelity) | Awaiting | Test-only dependency | 2.5, 10 |
| **D13** | Storage design: keep **IndexedDB** (revisions 5–6) or return to revision 4's `localStorage` main record + mirror with the 2.6 rules and a fail-closed commit gate | Awaiting. Revision 6 keeps IndexedDB pending this decision | IndexedDB | 0.5, 2.6, 9 |
| **D14** | Future SQL improvement for event-ID ownership (owner-aware duplicate result, or per-learner duplicate check) | **Deferred**: no SQL or migration in Phase 2A; only as a separately approved future decision (owner instruction) | — | 2.7, 5, 9 |
| **D15** | Real-browser test tooling (L3, B1–B6): (a) run with a Playwright installation **outside** the project, against a copy of the project served by `vite`, with the test script kept under `docs/qa/` and **no `package.json` change**; or (b) add `@playwright/test` as a devDependency | Awaiting | (a) for Phase 2A | 1.6, 9, 10 |
| **D16** | Guest carry-over policy at release (1.9): combined legacy + learning XP under the existing 500-per-claim cap, with excess forfeited as today; claim reserved for the first account that signs in after guest play; rejected/conflicting claims not rolled back | **Deferred** to the release migration | Keep today's semantics | 1.9 |

**Not decisions (resolved owner instructions, recorded in 0.2):** the two-wave plan; existing games untouched and live; no fabricated reviewers or approvals; separate new folders; genuine science + Bangla approval before publication; star rules unchanged.

**Unresolved rules (not decisions; need the proposal):** U1–U7 (6.2).

---

## 12. Implementation record: Stages 2A-2 and 2A-3 (3 Nov 2026)

Owner approval to implement Part 2 was given on 3 Nov 2026. Both games are built **for the dev-only preview** (`npm run dev` → `/dev-preview/phase-2a/`). Release (registry takeover, live adapter wiring, `public/draco/`, service worker, catalogue text) still needs its own approval (1.7, D11).

| Item | State |
|---|---|
| Sky Science Explorer | `src/games/sky-science/`: band picker (4–6 / 7–8 / 9–10, changeable), six-mission menu (wave 2 "Coming soon"), 3D three-lane gates, return questions, Quick Checks, stars with band-appropriate explanations, 24 h resume (D6), spoken prompts, thinking pause for 9–10, reduced motion, no hearts for 4–6, wrong answers never cost hearts |
| World Explorer 3D | `src/games/world-explorer/`: Sundarbans, Amazon, Sahara playable in 3D (Skyward physics/input reused by import); Himalaya, Arctic, Great Barrier Reef shown as "Coming soon"; five stations each with Observe → hands-on Investigate → Explain (hint → explanation) → Record; journal; report set A + one retry set B; stale-tab dialog; unfinished-visit banner |
| Investigate activities (3 Nov revision) | Investigate was a read-and-click step. It is now a hands-on activity per station (`content/world-explorer/interactions.js`): 9 predict-and-compare, 6 put-in-order. Part of the hashed, reviewable station content. |
| Content | 151 bilingual items (106 Sky Science for Sky Watcher + Weather Flyer, 45 World Explorer), all **awaiting** science and Bangla review; 0 shippable; `reviewers.js` empty |
| Sources | 17 pages. Every recorded quote re-fetched and found on its live page at ≈22:00 UTC 2 Nov 2026; `content/build.js` refuses any citation that is not one of these quotes |
| Bird model decoder | Preview loads the decoder bundled with `three` (1.8); real-browser test confirms zero `gstatic.com` requests |
| Known gaps | ~12 objectives per mission per band not reached (6 / 8 / 8 = one flight's worth, so each band's flight uses every objective); wave 2 content not written; real-database tests (D9) not run |
