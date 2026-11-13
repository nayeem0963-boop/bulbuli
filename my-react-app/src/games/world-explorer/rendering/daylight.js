/**
 * How light the sky is right now, shared between the day-night cycle (BiomeAtmosphere writes it
 * every frame) and anything that needs to follow it without owning a light of its own.
 * 1 = full daylight, 0 = night. Plain mutable state: it changes every frame and nothing renders
 * from it through React.
 */
export const SKY_STATE = { daylight: 1 }
