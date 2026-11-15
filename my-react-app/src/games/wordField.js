/**
 * Sky Typewriter's live word list is a plain, mutable simulation shared through `wordsRef`:
 * WordSpawner moves / spawns / removes words every frame, useWordTyping advances a word's
 * `progressIndex` on key presses. The per-frame mutation lives here, in plain JS outside React,
 * so components only hand words over and never mutate them in place.
 */

/** Moves a live word `dz` towards the player; returns its new z. */
export function advanceWord(word, dz) {
  word.position.z -= dz
  return word.position.z
}
