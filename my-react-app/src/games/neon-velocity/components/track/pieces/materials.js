import {
  BoxGeometry, ConeGeometry, CylinderGeometry, EdgesGeometry, LineBasicMaterial,
  MeshStandardMaterial, PlaneGeometry,
} from 'three'
import { COLORS } from '../../../config/constants'

/*
 * Shared GPU resources for all track pieces. Pieces scale unit geometry
 * instead of allocating their own, so spawning/despawning segments creates
 * no new geometries or materials (no GC spikes, nothing to dispose).
 */

const glowLine = (color, boost = 3) => {
  const m = new LineBasicMaterial({ color, toneMapped: false })
  m.color.multiplyScalar(boost) // > 1.0 → picked up by bloom
  return m
}

export const geo = {
  box: new BoxGeometry(1, 1, 1),
  boxEdges: new EdgesGeometry(new BoxGeometry(1, 1, 1)),
  plane: new PlaneGeometry(1, 1),
  // inverted 4-sided pyramid under platforms → "floating island" silhouette
  underside: new ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).rotateX(Math.PI),
  rail: new CylinderGeometry(0.09, 0.09, 1, 8).rotateX(Math.PI / 2),
  post: new CylinderGeometry(0.06, 0.06, 1, 6),
}
geo.undersideEdges = new EdgesGeometry(geo.underside)

export const mat = {
  platform: new MeshStandardMaterial({ color: '#150830', roughness: 0.35, metalness: 0.7, flatShading: true }),
  underside: new MeshStandardMaterial({ color: '#0b0420', roughness: 0.8, flatShading: true }),
  platformEdge: glowLine(COLORS.cyan, 2.5),
  undersideEdge: glowLine(COLORS.violet, 2),
  laneStripe: new MeshStandardMaterial({
    color: COLORS.magenta, emissive: COLORS.magenta, emissiveIntensity: 2.5, toneMapped: false,
  }),
  rampEdge: glowLine(COLORS.yellow, 3),
  chevron: new MeshStandardMaterial({
    color: COLORS.yellow, emissive: COLORS.yellow, emissiveIntensity: 3, toneMapped: false,
  }),
  wall: new MeshStandardMaterial({
    color: '#1a0838', roughness: 0.2, metalness: 0.8, transparent: true, opacity: 0.85,
  }),
  wallEdge: glowLine(COLORS.magenta, 3),
  wallStripe: new MeshStandardMaterial({
    color: COLORS.cyan, emissive: COLORS.cyan, emissiveIntensity: 3, toneMapped: false,
  }),
  rail: new MeshStandardMaterial({
    color: COLORS.yellow, emissive: COLORS.yellow, emissiveIntensity: 4, toneMapped: false,
  }),
  post: new MeshStandardMaterial({ color: '#2a1550', roughness: 0.6, metalness: 0.5 }),
}
