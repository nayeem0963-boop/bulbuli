# Phase 2A — controlled review build

A separate, production-built website for **reviewing** World Explorer 3D and Sky Science Explorer
before their educational content is approved. It is **not** a release: no game enters the Bulbuli
catalogue, no content is approved by it, and nothing it does reaches real player progress.

The banner on every page says so: **REVIEW BUILD — EDUCATIONAL CONTENT PENDING APPROVAL — NO REAL XP**.

## What it is

| | Main Bulbuli site | Review site |
|---|---|---|
| Build | `npm run build` (`vite.config.js` → `dist/`) | `npm run build:review` (`vite.review.config.js` → `dist-review/`) |
| Pages | the existing app, Math Hero share page, HTML quiz | one page (`review/index.html`), every path serves it |
| Phase 2A code | **none** (test I1 checks every built file) | World Explorer 3D + Sky Science Explorer |
| Storage | the app's normal storage | its own IndexedDB database `bulbuli-learning-review-v1`, on its own origin |
| Account / Supabase | yes | **none**: no Supabase client, URL or key is in the bundle (test R2) |
| XP, badges, certificates | real | **none**: "XP a live game would send" is listed on the page and never sent |
| Search engines | indexed | `noindex` (meta tag, `X-Robots-Tag` header) and `robots.txt: Disallow: /` |

## Safeguards (all automated)

- **I1** (`src/learning/tests/isolation-build.test.js`): the main production build's file list equals
  `docs/qa/dist-baseline.txt` (content hashes masked) and no built file contains preview or
  review markers (`createReviewAdapter`, `phase2a-review`, `PENDING APPROVAL`, …).
- **R1–R5** (`src/learning/tests/review-build.test.js`):
  - R1: the review build contains exactly the page, its bundles, the Draco decoder, the five
    public assets it uses and the Amazon bird model (`bird_orange.glb`, CC BY-NC-SA 4.0: see
    `src/games/world-explorer/assets/bird_orange.LICENSE.md`); not the main site's service worker, manifest, sitemap or offline page.
  - R2: no Supabase URL/key (values read from `.env` are checked), no `award_xp`, XP-queue or
    progress keys, no live or preview adapter; banner present; noindex everywhere.
  - R3: the review entry's import graph reaches no Supabase, XP, progress, auth, badge,
    achievement, registry or live-adapter code; the main config never mentions the review build.
  - R4: the review adapter refuses to exist outside the review build or the dev server.
  - R5: a full playthrough with a simulated signed-in session makes zero network/Supabase calls,
    zero `localStorage` writes, and creates only the review database; "Reset review data" deletes
    only that database.
- The content release gate is computed from the real, empty `src/learning/reviewers.js`: every
  item shows as awaiting science **and** Bangla review, nothing as approved. The review build
  cannot change that.

## Access: an unlisted URL, not a secure one

Bulbuli has no reviewer role, and Netlify site passwords need a paid plan, so the agreed access
model is an **unlisted URL**. Anyone who knows or guesses the address can open it. It shows
unapproved educational content (clearly labelled) but holds no secrets, no account data and no
way to award XP. Treat the URL as semi-public. If that stops being acceptable, either enable
Netlify password protection for the review site, or take the deploy down (below).

## Deploy (Netlify branch deploy)

`netlify.toml` has a `[context.phase2a-review]` block: deploys of the branch **`phase2a-review`**
run `npm run build:review` and publish `dist-review/`. Production deploys of `main` are unchanged.

1. Review and commit the changes on `main` (your decision; nothing is pushed for you).
2. Create the review branch from that commit and push it:
   `git branch phase2a-review` → `git push -u origin phase2a-review`
3. In Netlify → Site configuration → Build & deploy → Branches and deploy contexts, set
   **Branch deploys** to "Let me add individual branches" and add `phase2a-review`.
4. Netlify builds it at `https://phase2a-review--<your-site-name>.netlify.app/`.
   That is the review URL (a different origin from the main site).
5. Open it and check: the banner, the gate numbers, both games, a page refresh on `#world`.

To update the review site later: merge or fast-forward `phase2a-review` to the commit you want and push.
To take it down: remove the branch from Netlify's branch-deploy list (and delete the branch).

No environment variables are needed, and none should be added: the review build deliberately
ignores `.env` (`envDir: review/`). No database migration is needed.

## Local checks

```
npm test                    # includes I1 and R1–R5
npm run build               # main site, unchanged
npm run build:review        # review site → dist-review/
npm run preview:review      # serves dist-review/ at http://localhost:4174/
```

Direct links: `/#world` opens World Explorer 3D, `/#sky` opens Sky Science Explorer.
`?qa=1` exposes `window.__phase2aQA` for the automated browser tests only.
