/** Shared numbers for the Studio scene, so floor, shadows, camera and controls stay in step. */
export const GRID_SIZE = 20 // 20 x 20 cells, one world unit each
export const HALF_GRID = GRID_SIZE / 2

export const COLORS = {
  background: '#0f172a', // slate-900
  tileA: '#1e293b', // slate-800
  tileB: '#172033', // between slate-800 and slate-900
  gridLine: '#334155', // slate-700
  gridAxis: '#6366f1', // indigo-500
  hover: '#34d399', // emerald-400
}

export const CAMERA = { position: [14, 12, 14], fov: 45, near: 0.1, far: 200 }

export const CONTROLS = {
  minDistance: 6,
  maxDistance: 45,
  // Stop just above the horizon so the camera never slips under the floor.
  maxPolarAngle: Math.PI / 2 - 0.08,
  dampingFactor: 0.08,
}

/** Converts a cell index (-10..9) to the world-space centre of that cell. */
export const cellCenter = (i) => i + 0.5
