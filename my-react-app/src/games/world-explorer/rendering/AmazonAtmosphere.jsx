import { useLayoutEffect, useMemo, useRef } from 'react'
import { ConeGeometry, MeshBasicMaterial, Object3D } from 'three'

const SHAFT_POSITIONS = [
  [-7, 5.2, 4], [-2.5, 6.4, 8], [3.8, 5.6, 10], [8, 6.2, 1], [4, 5, -4],
]

export default function AmazonAtmosphere() {
  const mesh = useRef()
  const geometry = useMemo(() => new ConeGeometry(0.72, 10, 7, 1, true), [])
  const material = useMemo(() => new MeshBasicMaterial({
    color: '#dcebb0',
    transparent: true,
    opacity: 0.035,
    depthWrite: false,
    fog: true,
  }), [])
  useLayoutEffect(() => {
    const shaft = new Object3D()
    for (let index = 0; index < SHAFT_POSITIONS.length; index += 1) {
      const [x, y, z] = SHAFT_POSITIONS[index]
      shaft.position.set(x, y, z)
      shaft.rotation.z = index % 2 ? -0.07 : 0.06
      shaft.scale.setScalar(1)
      shaft.updateMatrix()
      mesh.current.setMatrixAt(index, shaft.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
    mesh.current.computeBoundingSphere()
  }, [])
  useLayoutEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])
  return (
    <instancedMesh ref={mesh} args={[geometry, material, SHAFT_POSITIONS.length]} />
  )
}
