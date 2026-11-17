# Jaguar model (World Explorer, Amazon)

- **Title:** "jaguar"
- **Author:** Ear.Rodriguez (https://sketchfab.com/Ear.Rodriguez)
- **Source:** https://sketchfab.com/3d-models/jaguar-91c61c329d2a4668816f81f08dfcd492
- **Licence:** Creative Commons Attribution 4.0 International (CC BY 4.0),
  http://creativecommons.org/licenses/by/4.0/ — commercial use is allowed **provided the author is
  credited, a link to the licence is given and changes are indicated.**

## Changes made for the game (CC BY 4.0 asks that these be stated)

- Baked the model's rest pose into plain static geometry (no skeleton, no animation).
- Removed the tongue and the teeth (hidden in the closed mouth), the vertex colours and the
  animation clip.
- Scaled to 1.1 x, centred and set with its feet on y = 0, facing +z.
- Reduced the coat texture from 2048 x 2048 to 1024 x 1024 (JPEG) and set a matte finish.

The original file was 8.8 MB; this one is under 1 MB.

- The Sundarbans' tiger (`tiger` in rendering/amazonFauna.js) uses this same file, re-skinned as a Bengal tiger by a shader
  (rendering/amazonTigerCoat.js): the jaguar's texture is not used there, and the eyes keep their own painting.

## Credit that must stay visible

The review page (dev-preview/phase-2a/PreviewApp.jsx, "Credits") shows the credit. Any release of
World Explorer must show the same credit somewhere a player can reach (an about or credits screen).
