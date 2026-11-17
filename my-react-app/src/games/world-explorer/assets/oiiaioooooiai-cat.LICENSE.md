# Cat model (World Explorer, Sundarbans)

- **Title:** "Oiiaioooooiai Cat"
- **Author:** Zhuier (https://sketchfab.com/Zhuier)
- **Source:** https://sketchfab.com/3d-models/oiiaioooooiai-cat-30d27bf7fb224849b76e208a6eccdb36
- **Licence:** Creative Commons Attribution 4.0 International (CC BY 4.0),
  http://creativecommons.org/licenses/by/4.0/ — commercial use and modification are allowed
  **provided the author is credited, a link to the licence is given and changes are indicated.**
  (Checked against the licence recorded inside the file as downloaded: `asset.extras.license`
  "CC-BY-4.0", with the author, source and title above. The model is a fan work in the style of
  an internet meme; the licence is the model author's own, for their model, and does not cover
  anything else the meme refers to.)

## Changes made for the game (CC BY 4.0 asks that these be stated)

- The model's neutral pose was baked into plain static geometry: its node animation (a spin with a
  bob) and its one mouth-shape morph target were removed. 15,774 triangles are kept as they were.
- Re-centred on its place with its paws at y = 0 and facing +z, like every other model (it was
  already life size: 0.24 m wide, 0.39 m tall, 0.72 m long with its tail).
- The colour texture was reduced from a 4096 px PNG (7.6 MB) to a 1024 px JPEG; nothing else in the
  material was kept but the colour map.
- In the game it is moved only by code: it walks straight up and down a line on the island, turning round at each end, with its legs swung and its tail swished in the vertex shader
  (rendering/SundarbansCat.jsx; the original animation was a spin with a bob, which the game no longer uses).

## Credit that must stay visible

The review page (dev-preview/phase-2a/PreviewApp.jsx, "Credits") shows the credit
(rendering/sundarbansCredits.js). Any release of World Explorer must show the same credit somewhere a
player can reach (an about or credits screen).
