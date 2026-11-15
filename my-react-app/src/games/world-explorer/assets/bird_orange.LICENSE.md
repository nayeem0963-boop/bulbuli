# bird_orange.glb — attribution and licence

| | |
|---|---|
| Title | Bird Orange |
| Creator | Wen Yeh — https://sketchfab.com/wenyeh1110 |
| Source | https://sketchfab.com/3d-models/bird-orange-0d31748606c2499fb652c0c1052b7cfa |
| Licence | **CC BY-NC-SA 4.0** — https://creativecommons.org/licenses/by-nc-sa/4.0/ |
| Read from | the file's own glTF metadata (`asset.extras`), generator Sketchfab-15.17.0 |
| Used as | the player bird in World Explorer 3D's Amazon Rainforest biome (`AmazonBirdAvatar.jsx`) |

The file is used unmodified. At runtime the game: replaces its self-lit (emissive) material with
an ordinary lit one using the same texture; scales it to about 0.44 m; plays parts of its one
animation clip (`anim`) with the armature's forward travel removed; and adds code-drawn wings
for flight (the model has no wing bones). Those runtime adaptations are covered by the same
licence (ShareAlike) wherever the game is distributed.

## ⚠ Non-commercial

**This asset is NOT cleared for commercial use.** CC BY-NC-SA 4.0 forbids commercial use and
requires attribution and ShareAlike. Before any commercial release of Bulbuli (including one
with paid features, ads or sponsorship), either obtain written permission from the creator for
that use or replace the model with an asset whose licence allows it.

Wherever the game is published, credit it visibly, e.g.:
"Bird Orange" by Wen Yeh (Sketchfab), licensed under CC BY-NC-SA 4.0.
The Phase 2A dev preview and review site show this credit, with links, under the Gate chip →
"Credits". A public release needs a credit players can find from the game itself.

It is deliberately kept out of `public/` so that the main Bulbuli site's build never contains it;
only builds that import the Amazon bird (the Phase 2A dev preview and review site) do.
