# Dolphin model (World Explorer, Amazon dolphin pool)

- **Title:** "Game-Ready dolphin (Swimming)"
- **Author:** Allie2k (https://sketchfab.com/Allie2k)
- **Source:** https://sketchfab.com/3d-models/game-ready-dolphin-swimming-b621ec8894734bc79c04338edff3cd0d
- **Licence:** Creative Commons Attribution 4.0 International (CC BY 4.0),
  http://creativecommons.org/licenses/by/4.0/ — commercial use and modification are allowed
  **provided the author is credited, a link to the licence is given and changes are indicated.**
  (Checked against the licence recorded inside the file as downloaded: `asset.extras.license`
  "CC-BY-4.0", author, source and title as above.)

## Changes made for the game (CC BY 4.0 asks that these be stated)

- The rigged, animated model (a 1,416-triangle mesh with a 14-bone skeleton and a looping swimming
  animation) was baked at the start of its animation into plain static geometry: the skeleton and the
  animation were removed.
- Levelled (the swimming pose was nose-up by a few degrees), scaled to a 1.3 m dolphin (about 22.8 units in the original), re-centred on its place with its
  lowest point at y = 0, and turned to face +z like every other animal.
- The colour texture was reduced from a 1024 px PNG to a 512 px JPEG; the normal map, the tangents and
  the extra material settings were dropped.
- In the game it is moved only by code: it circles in its pool, leaps now and then, and its tail
  beats in the vertex shader (rendering/amazonMotion.js `IDLE_MOTION.dolphin`).

## Credit that must stay visible

The review page (dev-preview/phase-2a/PreviewApp.jsx, "Credits") shows the credit, and so does the
Wildlife Gallery. Any release of World Explorer must show the same credit somewhere a player can
reach (an about or credits screen).
