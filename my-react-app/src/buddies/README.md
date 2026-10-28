# Bulbuli Buddies

Bulbuli Buddies lets players invite a friend. Sharing is always optional. Every game works without it, and nothing is promised for sharing.

## What's here

| File | What it does |
| --- | --- |
| `shareMessages.js` | Every invitation message (General, Play & Learn, Build & Create, Game) in English and Bangla. Edit the wording only here. |
| `shareLinks.js` | Builds the shared links. They always point to the public site (`SHARE_URL` = `https://bulbuli.org`, in `src/promo/shareData.js`), never to the running address (localhost, a preview deploy), and only to same-site paths. |
| `shareActions.js` | `navigator.share` where the browser has it (closing the sheet counts as *cancelled*), and the clipboard with an `execCommand` fallback. Results report only what really happened. |
| `BuddyInviteCard.jsx` | The home page card "Play better together!". It replaced the old Math Hero share strip and still links to `/share/math-hero`. |
| `BuddyShareDialog.jsx` | The accessible share dialog: a native `<dialog>` with options, a message preview, a read-only link field, Share / Copy message / Copy link / Close, and a live status line. |
| `ShareGameButton.jsx` | "Share this game". Used in the game bar (`ArcadeHeader.jsx`) and on Ball Dash's results card. |
| `text.js` | The card and dialog words (en/bn). |
| `buddies.test.js` | Tests for the messages, the links, `?mode=` deep links, share-sheet results and clipboard fallbacks. |

Pro Coder (`quiz/index.html`, a standalone page) has its own Share button in the brand bar (see `Share` in `quiz/engine.js`). It reuses these modules.

## Links

| Invitation | Link |
| --- | --- |
| General | `https://bulbuli.org` |
| Play & Learn | `https://bulbuli.org/?mode=play-learn` |
| Build & Create | `https://bulbuli.org/?mode=build-create` |
| A game | `https://bulbuli.org` + `gamePath(game)`, for example `/games/ball-dash` or `/play/html-architect` |
| Pro Coder | `https://bulbuli.org/quiz/?course=html` |

The home page applies `?mode=` only when it names a real mode (`requestedHomeMode` in `src/games/categories.js`), then removes it from the address. A link never carries a player's name, id, score, record or a referral code. Netlify's `/* → /index.html` rewrite serves every one of these paths.

## Buddy Stars (referral rewards): not built yet, on purpose

Bulbuli has no way to verify that an invitation brought a real new player. There is no referral table, no referral code and no server check. Anything the browser could count (opening the dialog, copying a link, visiting a URL again) is easy to fake. So **no Buddy Stars or referral XP are given, and the app never says a referral succeeded.**

To add them honestly, the server has to do the checking. One possible design, for Supabase (it already has `profiles`, `award_xp`, `xp_events` and `game_events`):

1. **Codes.** A table `referral_codes (code text primary key, owner uuid references profiles, created_at)`. The code is random, opaque and unguessable (not the user id or name). Only a signed-in owner can create it, through a `security definer` RPC.
2. **Links.** Signed-in players get `https://bulbuli.org/?buddy=<code>` (guests get the plain links). The app keeps the code for the visitor's first sign-up only.
3. **Claims.** A table `referrals (code, referred uuid unique references profiles, status pending|verified|rejected, created_at, verified_at)`. A `claim_referral(code)` RPC links the *new* account once. It refuses self-referrals, accounts that already existed, and second claims.
4. **Verification.** A server job or RPC marks a claim `verified` only after the referred account finishes real play. For example, the first `game_completed` row in `game_events` plus some XP in `xp_events`, recorded by the server, not taken from the client.
5. **Reward.** On verification, `award_xp` runs once for the inviter with a unique key (such as `referral:<referred id>`), plus a daily or monthly cap. Only then does the app show "Your buddy joined, you earned Buddy Stars!"
6. **Privacy.** Inviters see a count, never who joined. There are no public lists and no contact import. A parent or guardian consent step for under-13 accounts should come first, as for any account feature.

Until all of that exists, keep the Buddies feature share-only.
