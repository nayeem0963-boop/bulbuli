/**
 * Night-time readability for Bulbuli, without a light: a soft pool of pale "moonlight" on the
 * ground under the bird. Dark brown feathers on dark mud have almost no contrast at night; a
 * slightly lighter patch of ground behind the silhouette gives it back, from every camera
 * direction, and lights nothing else.
 *
 * A map opts in with `playerGlow: { radius, color, opacity }`. Pure numbers here; PlayerGlow.jsx
 * draws it.
 */

/**
 * How strong the pool is, 0..1 of the map's own opacity.
 * @param daylight  0 = night, 1 = day (rendering/daylight.js)
 * @param grounded  true while Bulbuli stands on something; in the air the pool is faint, since
 *                  it would otherwise hang under a flying bird
 */
export function glowStrength(daylight, grounded) {
  const night = Math.max(0, Math.min(1, 1 - daylight))
  // nothing by day, a little at dusk, full only once it is properly dark
  return night ** 1.6 * (grounded ? 1 : 0.25)
}

/** Opacity across the pool: full in the middle, fading smoothly to nothing at the rim (t = 0..1). */
export function glowFalloff(t) {
  const u = Math.max(0, Math.min(1, 1 - t))
  // smoothstep, squared: most of the light sits close under the bird and the rim has no edge to see
  return (u * u * (3 - 2 * u)) ** 2
}
