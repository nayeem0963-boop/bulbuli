# Ocelot model (World Explorer, Amazon)

- **Title:** "Cat"
- **Author:** photon (that one larry) (https://sketchfab.com/Professor_E12)
- **Source:** https://sketchfab.com/3d-models/cat-74321b8d6b6b4c168db849ee6c8b3d6a
- **Licence:** Creative Commons Attribution 4.0 International (CC BY 4.0),
  http://creativecommons.org/licenses/by/4.0/ — commercial use and modification are allowed
  **provided the author is credited, a link to the licence is given and changes are indicated.**

## Changes made for the game (CC BY 4.0 asks that these be stated)

- The original is a calico domestic house cat, which does not belong in the Amazon rainforest.
  It is **re-skinned as an ocelot** (a small wild cat of the rainforest) by a shader
  (rendering/amazonOcelotCoat.js): the cat's white underside is kept as cream, the calico patches
  become a tawny coat with black-ringed, chain-like blotches, spots on the legs and head, stripes on
  the neck and cheeks, and black rings and a black tip on the tail. The eyes, nose and the inside of the
  ears keep the model's own painting. It is a domestic-cat shape wearing an ocelot coat, so it is an
  approximation of an ocelot, not an exact model of one.
- Baked the rest pose into plain static geometry (no skeleton).
- Scaled to 1.25 x, centred and set with its feet on y = 0, facing +z.
- Converted the three colour textures to JPEG; dropped the specular texture and its extension.

The original file was 524 KB; this one is 160 KB.

## Credit that must stay visible

The review page (dev-preview/phase-2a/PreviewApp.jsx, "Credits") shows the credit. Any release of
World Explorer must show the same credit somewhere a player can reach (an about or credits screen).
