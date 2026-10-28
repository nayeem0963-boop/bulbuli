# Bulbuli: Neon Velocity

High-speed 3D parkour runner (React Three Fiber + Rapier + Zustand). Registered in
`src/games/registry.js` as `neon-velocity`; opens in the launcher (`launch: 'modal'`) and at
`/games/neon-velocity`.

- `index.jsx`: arcade entry point (embedded/autoStart, saves runs via `useGameProgress`,
  follows the arcade's sound switch, stops audio on close)
- `Art.jsx`: home-page tile picture (plain SVG, no three.js)
- `NeonVelocityApp.jsx`: the game itself
- `neon-velocity.css`: every style is under `.nv-root` with `nv-` prefixed classes, and the
  breakpoints are container queries on the game box, so nothing leaks into the arcade
- `systems/collisionWorld.js`: the game's own physics (no physics engine). Track pieces,
  hazards and pickups register axis-aligned boxes through `hooks/useCollision.js`;
  `PlayerPhysics` moves Bulbuli in `useFrame` and resolves against them in sub-steps
- `components/canvas/PostFX.jsx`: bloom and effects on three.js's own `EffectComposer`
  (`three/examples/jsm`), with the custom passes in `postfx/neonPasses.js`
- `stores/`, `components/`, `systems/`, `audio/`, `clip/`, `services/`: see the comments in
  each file
- Local saves use `neonVelocity.*` localStorage keys (separate from the arcade's `bulbuli:*`)
- Optional global leaderboards: Supabase, table `public.leaderboards` (see `services/supabaseLeaderboard.js`
  and `supabase/migrations/`); without it the game keeps on-device leaderboards

Dependencies: only what the arcade already has (`three`, `@react-three/fiber`,
`@react-three/drei`) plus `zustand`, which drei already installs.
