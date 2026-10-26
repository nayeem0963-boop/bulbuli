import { COLORS } from '../../config/constants'

export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.35} color={COLORS.violet} />
      <hemisphereLight args={[COLORS.magenta, COLORS.background, 0.5]} />
      {/* Key light from front-left, cool cyan to contrast the magenta fill */}
      <directionalLight position={[-6, 10, -4]} intensity={1.6} color={COLORS.cyan} />
    </>
  )
}
