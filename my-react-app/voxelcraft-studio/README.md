# VoxelCraft Studio

Front-end for a teen-focused UGC voxel game: header with XP / UGC Gems / tabs, and a Three.js
Build Studio (React Three Fiber + drei) where players place blocks to make obstacle levels,
then play-test them as a third-person platformer.
All state is mock data in React reducers, so there's no backend yet.

## Run it

```bash
cd voxelcraft-studio
npm install        # first time: installs Tailwind v4 + the rest locally
npm run dev
npm run build      # production build in dist/
npm test           # level, physics, community and profile unit tests (node:test, no install needed)
npm run check:levels  # proves every built-in level is beatable with the real physics (~4 min)
```

**Before `npm install`:** `npm run dev` already works by borrowing React, three, R3F, drei,
lucide and Vite from the parent folder's `node_modules`. Tailwind isn't there, so
`vite.config.js` swaps in Tailwind's browser CDN build and prints a warning. After `npm install`
the compiled Tailwind build takes over automatically. Use that for anything you ship.

## Building levels

| Input | Action |
| --- | --- |
| Click floor / a block face | place the selected block there |
| Shift+click, right-click (no drag), or Erase tool + click | delete a block |
| 1–5 | Platform · Bounce · Lava · Spawn · Finish |
| E / B | erase tool / build tool |
| Ctrl+Z, Ctrl+Shift+Z (or Ctrl+Y) | undo / redo (100 steps) |
| M | mute sound effects |

A translucent preview cube shows where the next block goes: red means the spot is blocked or
a delete. Clear all asks for a second click, and undo works after it. Only Platforms take the
paint colour; Bounce, Lava, Spawn and Finish keep their signature colours so players can always
tell a hazard from a floor. Spawn and Finish are one per level: placing another moves it.
Publishing is enabled once both are placed (see **Publishing** below).

### Level data (`LevelState`, `src/level/levelSchema.js`)

```js
{
  schemaVersion: 1,
  id: 'lvl_…', title: 'Neon Leap', author: 'NeonBuilder',
  blocks: [{ id: 'b_…', type: 'PLATFORM' | 'BOUNCE' | 'LAVA' | 'SPAWN' | 'FINISH', x, y, z, color: '#rrggbb' }],
  spawnPoint: { x, y, z } | null,   // derived from the SPAWN block, never set by hand
  finishGate: { x, y, z } | null,   // derived from the FINISH block
  updatedAt: '2026-10-27T…Z',
}
```

Cells are integers: x/z −10…9 (the 20×20 plot), y 0…15, with a 4,096-block cap.
`parseLevel()` turns any untrusted JSON into a valid level, dropping bad blocks, and
`validateLevel()` lists what blocks publishing. Gameplay properties for each type (bounce
restitution / launch velocity, lava `hazard: 'respawn'`, finish trigger) live in
`src/level/blockTypes.js` and drive Play mode. "Copy level JSON" in the side panel
exports the current level.

### Performance

- Platform, Bounce and Lava each render as one `InstancedMesh`: 3 draw calls for any number of
  blocks. An edit rewrites only the instance buffer of the type that changed, in a layout
  effect, so the change shows on the next frame. No meshes are created on click.
- Hovering doesn't re-render React: the preview cube is moved directly from the pointer event,
  and the HUD readout subscribes to a tiny external store.
- Editor state lives in its own provider, split into level / tool / actions contexts, so
  placing a block doesn't re-render the header or the hotbar's unrelated parts.
- Measured with a ~3,840-block level: one edit (reducer, occupancy index, regroup, rewriting
  2,120 platform instances) costs a median of 1.4 ms and at most 9 ms of JS. The frame budget
  is 16.7 ms.

### Sound

`src/audio/sfx.js` synthesizes every effect with the Web Audio API (oscillators plus filtered
noise through a compressor), with no audio files. Each block type has its own placement sound,
and there are delete, clear, undo/redo, select and "can't place" sounds. The AudioContext
starts on the first click, which satisfies autoplay rules, and the mute setting is remembered
per browser.

## Publishing

**Publish…** in the Studio side panel opens the Publish Level modal:

- **Level title** and **Description** (up to 200 characters).
- **Difficulty:** Easy, Medium or Hard.
- **Contest toggle**, Yes/No, off by default. It's disabled once the week's contest has ended.
  Switching it off on a re-publish withdraws the entry.
- **Thumbnail:** a snapshot of your current 3D camera view, taken when the modal opens.
  **Retake** shoots again; **Frame shot** hides the modal so you can orbit and zoom inside the
  exact 4:3 guide, then **Use this view**. Editing is off while framing. The snapshot is a
  480×360 WebP of roughly 15 KB, and the placement cursor is hidden from it.
- **Checklist:** at least 1 Spawn point and 1 Finish gate, in different spots, plus a title.
  The Publish button stays locked until every item passes, and the reducer refuses an invalid
  level too.

After publishing, the success screen links to **View in Community**. The gallery opens on
Newest with your level on top, marked "Just published". Your first publish unlocks the
**First Creator** badge with a one-time **+500 XP** bonus, plus the usual +250 XP / +40 gems
the first time each level is published. Both come with a toast.

Published levels and their thumbnails are part of the local save (see **Saving** below), so
they're still in the gallery after a reload.

## Profile & Creator Shop (the "My Profile" tab)

- **Stats:** user level with XP progress, total upvotes received, levels published and contest
  medals (gold, silver and bronze counts). All are computed from live state.
- **Avatar customizer:** a 3D preview of your avatar jogging a loop so its trail shows. Drag to
  turn it. There are three slots: **Skin**, **Shirt** and **Glow trail**. Each item is a
  *finish* (matte, chrome, lava, glow, holo, or a trail effect), and you pick its colour from
  presets, a hex field or the custom picker. Fixed-colour styles (rainbow, comet, flame) lock
  the picker. Your look is also what you wear in Play mode, and the header avatar uses its
  colours.
- **Shop and unlocks** (`src/profile/cosmetics.js`):

  | Item | Unlocked by |
  | --- | --- |
  | Classic skin, Basic Tee, No trail, Neon Streak | free |
  | Neon Glow shirt · Pixel Sparks · Chrome skin · Rainbow Ribbon | 250 · 300 · 400 · 800 gems |
  | Creator Aura trail | First Creator badge |
  | Holo Shift shirt | Master Builder badge |
  | Lava Core skin | Parkour King badge |
  | Silver Comet trail | a silver contest medal or better |
  | Champion Flame trail | Contest Winner badge |

  Buying takes a confirm click. When you're short, the button says how many gems you still need.
- **Badges** (`src/profile/achievements.js`), each with a progress bar, a reward and a perk:
  **First Creator** (publish 1 level), **Master Builder** (3+ published levels), **Parkour
  King** (beat 5 different levels in Play mode) and **Contest Winner** (a gold medal). Badges are
  awarded automatically after any action that meets the goal.
- **Contests:** when the weekly countdown hits zero with the page open, the contest settles.
  Entries are ranked by votes and the podium is archived. If you placed you get a medal: gold
  pays the gem prize and earns Contest Winner, silver and bronze pay XP and gems. Then the next
  week's contest opens. Contest ids are per week, so old entries never count toward a new
  contest.
- **My levels:** your published levels with upvotes, plays and your best time, plus **Edit in
  Studio**. The Studio's **New level** starts a fresh one, so you can publish several.
- **Beating a level** (Studio play-test or community) records your best time and pays +50 XP on
  the first clear.

## Dev / Test Mode (contest simulation)

Offline there's nobody else to upvote your entry, so a gold medal (and the Contest Winner badge)
could never be tested. Dev / Test Mode stands in for the crowd. It's a panel at the bottom of
**My Profile**:

- **Where it appears:** always under `npm run dev`. In a production build it's hidden unless
  you open the app with `?devtools=1` (remembered on that device). `?devtools=0` turns it off.
- **Simulated voters (live):** a switch. While it's on, every 5 real seconds the crowd casts one
  hour of upvotes and plays (seeded Poisson, contest entries get more attention). The contest
  banner shows a "Simulated voting" chip.
- **Your entries' appeal:** Low, Normal or Viral, so QA can reach every outcome. Viral wins gold,
  and Normal finishes off the podium.
- **Fast-forward contest** (two clicks): simulates the remaining hours of voting, then settles
  with the *same* `settleContest` the real countdown calls. Rank #1 gets the gold medal and the
  500-gem prize, which unlocks Contest Winner and the Champion Flame trail. Each contest pays
  once, and the next week's contest opens.
- Live standings highlight your entries, and the last result shows your rank and the podium.

Simulated votes only change vote and play counts. They never pay gems or touch your own upvote
flags. The real countdown is unchanged: with the toggle off, nothing is simulated.

## Guardrails (tested)

- **Upvote gems:** +10 is paid once per level. The `voteRewarded` flag is saved in the votes
  map and restored on load, so vote, un-vote, reload and vote again pays nothing.
- **Trail on respawn/teleport:** `PlaySession` calls the trail's `clear()` on every respawn, so
  no old particles are left behind. The sim also refuses to emit across any single-frame jump
  over 3 blocks, so no streak can cross the map.
- **Reset Progress:** two-step confirm. It wipes the save but stays on the My Profile tab
  (`state/replace` keeps `activeTab`).
- **Save migration:** legacy keys migrate; every loaded field (including the `sim` settings) is
  sanitized.

## Saving

Everything is saved on the device in `localStorage` (`src/state/saveGame.js`):

- `voxelcraft:save:v2` holds level, XP, gems, badges, medals, best times, unlocked and equipped
  cosmetics, the votes you've cast (so vote gems can't be re-farmed after a reload), your
  published levels and settled contests.
- `voxelcraft:studio:v1` holds the level open in the Build Studio. It's saved as you edit and
  flushed when the page hides, so a reload reopens it. The leave-page warning only appears if
  saving failed.
- The previous build's `voxelcraft:creator:v1` is migrated automatically.

Saves are treated as untrusted on load. Numbers are clamped (gems ≤ 10M, level ≤ 999),
badges and items are checked against the catalogues, a "bought" badge item is rejected,
equipped-but-locked items fall back to defaults, and levels go through
`parseLevel`/`validateLevel`. A corrupt save means a fresh start, not a crash. If storage is
full, levels are saved without thumbnails. **Reset progress** in the profile wipes this
device's save. Note that a local save can be edited by the player: once there's a server, it
must own gems and unlocks.

## Play mode

Switch with the **Build / Play** toggle at the top of the viewport, the **Play test** button,
or **P**. Play needs a Spawn block; without a Finish it runs as a free-roam test.

| Input | Action |
| --- | --- |
| WASD / arrow keys | run, relative to the camera |
| Space | jump: hold for full height, tap for a short hop |
| Drag · scroll | orbit the camera · zoom |
| R | restart the run |
| Esc / "Exit to Studio" | back to Build mode |

- **Bounce** launches you about 3 blocks up, higher if you land hard or hold Space.
- **Lava** sends you straight back to spawn with a red flash.
- **Falling** below y = −10 does the same with a violet flash. The build floor isn't solid in
  play, so missing a jump drops you into the void; a faint grid marks the death height.
- **Finish** freezes the timer and shows a victory card (time, respawns, best time) with 3D
  and on-screen confetti and a synthesized fanfare.
- The `00:00.00` stopwatch starts on your first move, speedrun style. Best times last for the
  browser session, separately for each version of a level.

**Engine (`src/play/physics.js`):** pure-JS AABB vs. voxel collision, resolved one axis at a
time, at a fixed 120 Hz step with interpolated rendering. That makes it deterministic, with
no tunnelling, and it plays the same at any frame rate. It has coyote time (0.1 s), jump
buffering (0.12 s) and variable jump height. Tuning constants live in `PHYSICS`, and per-block
values (bounce launch, restitution) come from `blockTypes.js`. The camera follows smoothly and
pulls in when a block gets between it and the player. Nothing in the game loop sets React
state: the HUD timer writes its text directly each frame, and the HUD reads death and win
events from a tiny external store.

## Play & Vote: contest and community hub

- **Contest banner:** the weekly theme ("Neon Speedrun Challenge"), the 500-gem prize, a live
  countdown to Sunday 23:59 local time, and **Submit your level**. Submitting takes the level
  open in your Studio; it must pass the same checks as publishing (Spawn + Finish). Submitting
  again updates your entry.
- **Gallery:** 9 real community levels (`src/data/communityLevels.js`). Each card shows its
  title, creator, category badges, upvotes and plays, plus a **live rotating 3D preview** you
  can drag to spin. Studio **Publish** adds your level to the gallery with its snapshot,
  difficulty and description.
- **Search** matches title or creator, ignoring case and accents. The **sort tabs** are
  Trending (votes and plays weighted by age), Newest, Top Voted and Contest Entries.
- **Upvotes:** +1 vote with a synthesized coin sound. The first upvote on each level pays
  **+10 UGC Gems**; un-voting and voting again never pays twice, and you can't vote on your own
  levels.
- **Play** opens the level full screen in Play Mode, using the same engine and HUD. It never
  touches your Studio level, counts a play, and lets you upvote without leaving the game.

**How the previews scale:** browsers allow only about 8–16 WebGL contexts, so the gallery
uses **one shared canvas** behind the page. Each card is a drei `<View>`, a tracked hole the
canvas draws into, so off-screen cards cost nothing. The 3D code is lazy-loaded: until it
arrives, or on devices without WebGL, each card shows an isometric SVG thumbnail drawn from its
block data. The gallery canvas pauses while a level is being played.

## Structure

```
src/
  main.jsx, App.jsx            app shell: header + active tab panel + reward toasts
  data/mockData.js             tabs, player, builds, leaderboard, rewards, XP curve, starter level
  level/
    blockTypes.js              PLATFORM / BOUNCE / LAVA / SPAWN / FINISH definitions
    levelSchema.js             LevelState schema, bounds, parseLevel, validateLevel
    levelOps.js                pure add / remove / clear + occupancy index
    placement.js               raycast hit → target cell (pure, unit-tested)
    editorReducer.js           undo/redo history
    LevelEditorProvider.jsx    editor state + actions (plays sounds)
    level.test.js              unit tests
  play/
    physics.js                 platformer physics (pure, unit-tested in physics.test.js)
    PlaySession.jsx            game loop, fixed-step physics, follow camera, event → sfx/fx
    PlayerAvatar.jsx           capsule hero: skin + shirt finishes, visor, squash & stretch
    AvatarTrail.jsx            glowing particle trails (one instanced draw call, clear() on respawn)
    trailSim.js                trail particle simulation (pure, tested in trailSim.test.js)
    ConfettiBurst.jsx          instanced 3D confetti
    PlayHud.jsx                stopwatch, respawns, exit, death flash, victory modal
    playStore.js               per-run state (timer, respawns, best time)
    useKeyboardInput.js        WASD / arrows / Space (physical key codes)
  profile/
    cosmetics.js               shop catalogue, unlock rules, effective look
    achievements.js            badge catalogue, progress + award rules, derived stats
    AvatarCustomizer.jsx       slots, items (equip / buy / locked), colour picker
    AvatarPreview.jsx          3D preview stage (lazy)
    StatsOverview.jsx, BadgeGallery.jsx
    ui.jsx                     shared card / inset surfaces, StatusTag, GemBadge
  dev/
    devMode.js                 is Dev / Test Mode available (dev server or ?devtools=1)
    DevPanel.jsx               Profile panel: simulated voters, appeal, standings, fast-forward
    SimulationDriver.jsx       live simulated voting tick (5 s = 1 simulated hour)
  community/
    gallery.js                 search, sort tabs, trending score, countdown (pure, tested)
    simulation.js              seeded simulated voters + contest standings (pure, tested)
    creatorStorage.js          validation of saved gallery entries
    ContestBanner.jsx          theme, prize, countdown, submit-your-level panel
    LevelCard.jsx              card: preview, badges, upvote (+10 gems pop), plays, Play
    LevelThumbnail.jsx         isometric SVG thumbnail from block data
    Gallery3D.jsx              shared canvas + per-card drei <View> rotating previews (lazy)
    CommunityPlayer.jsx        full-screen Play Mode for a community level (lazy)
  data/communityLevels.js      9 playable community levels + weekly contest (mock)
  play/solver.js               brute-force "is it beatable?" search (scripts/check-levels.js)
  audio/sfx.js                 Web Audio synthesized sound effects (editor, gameplay, coin)
  state/
    gameReducer.js             pure reducer (rewards, publish, votes, shop, badges, contests…)
    saveGame.js                localStorage save / load / migrate / validate
    GameStateProvider.jsx      context + useGameState / useGameActions hooks
  components/
    header/                    Header, XpMeter, GemCounter, NavTabs (ARIA tabs, arrow keys)
    viewport/
      Viewport3D.jsx           <Canvas>, OrbitControls, HUD target readout, reset view
      PlacementController.jsx  pointer events → place / delete, preview cursor
      GhostCursor.jsx          translucent placement / delete preview
      blocks/BlockLayer.jsx    per-type instanced meshes, shared materials, lava/bounce glow
      blocks/SpecialBlocks.jsx spawn pedestal + spinning finish ring
      VoxelInstances.jsx       one InstancedMesh per block type
      SnapshotBridge.jsx       thumbnail capture from the Studio camera
      hoverStore.js            hover state outside React
      SceneLighting.jsx        ambient + hemisphere + shadow-casting directional + rim light
      CheckerFloor.jsx         20x20 checker texture plane, grid lines, frame
      ResponsiveRenderer.jsx   window resize / DPR listener (rAF-coalesced)
      sceneConfig.js           grid size, colours, camera + control limits
    studio/                    PublishModal + FramingOverlay (publish flow), ModeToggle (Build / Play),
                               Hotbar (types, erase, paint, undo/redo, clear, mute),
                               LevelPanel (title, counts, publish checks, JSON), useEditorShortcuts
    ErrorBoundary.jsx, RewardToasts.jsx
  views/                       BuildStudioView (lazy 3D), PlayVoteView (community hub), Leaderboards,
                               ProfileView (Profile & Creator Shop)
```

## Viewport notes

- **Controls:** left-drag rotates, wheel zooms (toward the cursor), right-drag pans; on touch,
  one finger rotates and two fingers pinch / pan. Zoom is clamped to 6–45 units, and the camera
  can't go below the floor.
- **Shadows:** PCF shadow map, 2048² resolution, with the sun's shadow camera fitted to the plot.
- **Resizing:** the Canvas tracks its container with a zero-debounce ResizeObserver, so it
  follows layout changes (sidebar, tab bar, window) without stretching. `ResponsiveRenderer` also
  listens to window `resize` to pick up device-pixel-ratio changes, such as moving to another
  monitor or zooming the page. DPR is capped at 2.
- **Bundle:** three/R3F/drei load as a separate chunk only when Build Studio opens.

## Going live later

Replace the fixtures in `mockData.js` with API responses when hydrating `GameStateProvider`,
load saved levels through `parseLevel()` into `<App initialLevel={…}>`, and send reducer
actions (`studio/publish`, `builds/toggleVote`) to the server. Until levels are saved, the page
warns before a reload or close discards edits. Award XP and
gems on the server too: the client-side rewards here are for the mock only.
