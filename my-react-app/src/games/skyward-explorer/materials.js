// Shared low-poly materials, created once for the whole world (fewer shader switches).
import { MeshStandardMaterial } from 'three'

const lowPoly = (color, extra = {}) => new MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, metalness: 0, ...extra })

export const MATERIALS = {
  grass: lowPoly('#79c85a'),
  dirt: lowPoly('#9a6a43'),
  rock: lowPoly('#7b7888'),
  stone: lowPoly('#ddd2b8', { roughness: 0.8 }),     // ancient pillars and floor
  stoneDark: lowPoly('#b9ad92', { roughness: 0.85 }),
  // trees and boulders take their real colour per instance, so their base is white
  instanced: lowPoly('#ffffff'),
}

export const PALETTE = {
  trunk: ['#7a4d2c', '#6b4226'],
  leaves: ['#3f9e4a', '#57b45a', '#2f8a52', '#6cc06a'],
  leavesTop: ['#62bf5e', '#7fd16f', '#4fb07a', '#8ad975'],
  boulder: ['#8a8797', '#7a7686', '#9a96a6'],
}
