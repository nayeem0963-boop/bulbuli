/**
 * The Wildlife Gallery: every 3D animal model file of the World Explorer Amazon in one place, on a
 * grid of plinths you can orbit (drag), zoom (scroll) and pick from a list. Each shows its author,
 * source, licence and the changes made (CC BY 4.0), and where it stands in the Amazon. The models
 * are the same files the map uses (AmazonModel.jsx); the gallery adds nothing to the game.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import AmazonModel from '../../src/games/world-explorer/rendering/AmazonModel.jsx'
import { AMAZON_FAUNA_MODELS, AMAZON_MODEL_CREDITS } from '../../src/games/world-explorer/rendering/amazonFauna.js'
import { AMAZON_MAP } from '../../src/games/world-explorer/biomes/amazon.js'

const GAP = 3.1
const FLYERS = new Set(['macaw', 'blueMacaw', 'scarletMacaw', 'toucan', 'morpho'])
/** The plinths stand four to a row, so the whole gallery fits in one view. */
const COLS = 4
const ROWS = Math.ceil(AMAZON_FAUNA_MODELS.length / COLS)
const spot = (index) => [((index % COLS) - (COLS - 1) / 2) * GAP, (Math.floor(index / COLS) - (ROWS - 1) / 2) * GAP]

/** Where each kind stands in the Amazon, in words. */
const placed = (kind) => {
  const all = AMAZON_MAP.fauna.filter((a) => a.type === kind)
  const pools = AMAZON_MAP.pools.filter((pool) => pool.kind === kind)
  if (!all.length && pools.length) return `${pools[0].swimmers.length} swim in a forest pool on the map${kind === 'dolphin' ? ' (on the open ground to the east)' : ' (at the foot of the giant tree)'}.`
  if (!all.length) return 'Not on the map: this one lives only here.'
  if (all[0].fly) return `${all.length} fly round over the clearing${kind === 'morpho' ? ', low among the trees' : ''}.`
  if (all[0].y > 0) return `${all.length} perched on the branch and canopy platforms.`
  return `${all.length} on the forest floor.`
}

function Plinth({ kind, index, selected, shown }) {
  const turn = useRef(null)
  useFrame((_, dt) => { if (turn.current && selected) turn.current.rotation.y += dt * 0.5 })
  return (
    <group position={[spot(index)[0], 0, spot(index)[1]]} visible={shown}>
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <cylinderGeometry args={[1.35, 1.45, 0.12, 40]} />
        <meshStandardMaterial color={selected ? '#7a6a48' : '#4b4636'} roughness={0.9} />
      </mesh>
      <group ref={turn} position={[0, FLYERS.has(kind) ? 0.5 : 0, 0]}>
        <Suspense fallback={null}><AmazonModel kind={kind} /></Suspense>
      </group>
    </group>
  )
}

/** Moves the camera to look at the picked animal, or at the whole grid. */
function Rig({ selected }) {
  const { camera } = useThree()
  const controls = useRef(null)
  useEffect(() => {
    const index = AMAZON_FAUNA_MODELS.indexOf(selected)
    const all = index < 0
    const [x, z] = all ? [0, 0] : spot(index)
    if (all) camera.position.set(0, 12.5, 14)
    else camera.position.set(x, 1.1, z + (selected === 'anaconda' ? 4.2 : 2.7))
    if (controls.current) { controls.current.target.set(x, all ? 0.2 : 0.45, z); controls.current.update() }
  }, [selected, camera])
  return <OrbitControls ref={controls} makeDefault enablePan={false} minDistance={1.6} maxDistance={24} maxPolarAngle={Math.PI * 0.49} />
}

export default function WildlifeGallery() {
  const [selected, setSelected] = useState('all')
  const credit = AMAZON_MODEL_CREDITS[selected]
  const list = useMemo(() => AMAZON_FAUNA_MODELS.map((kind) => [kind, AMAZON_MODEL_CREDITS[kind]]), [])
  return (
    <section className="pv-gallery" data-testid="wildlife-gallery" aria-label="Wildlife Gallery: every Amazon 3D animal model">
      <div className="pv-gallery-view">
        <Canvas shadows camera={{ fov: 42, near: 0.05, far: 80 }} dpr={[1, 2]}>
          <color attach="background" args={['#1f3d2b']} />
          <fog attach="fog" args={['#1f3d2b', 22, 48]} />
          <hemisphereLight args={['#dff5e3', '#3a2f20', 1.1]} />
          <directionalLight position={[4, 8, 6]} intensity={2.2} castShadow />
          <mesh rotation-x={-Math.PI / 2} position={[0, -0.13, 0]} receiveShadow><planeGeometry args={[90, 90]} /><meshStandardMaterial color="#2a2a1f" roughness={1} /></mesh>
          {AMAZON_FAUNA_MODELS.map((kind, index) => <Plinth key={kind} kind={kind} index={index} selected={selected === kind} shown={selected === 'all' || selected === kind} />)}
          <Rig selected={selected} />
        </Canvas>
      </div>
      <div className="pv-gallery-side">
        <ul className="pv-gallery-list" aria-label="Animals">
          <li><button type="button" aria-pressed={selected === 'all'} onClick={() => setSelected('all')} data-kind="all">All {AMAZON_FAUNA_MODELS.length} models</button></li>
          {list.map(([kind, c]) => (
            <li key={kind}><button type="button" aria-pressed={selected === kind} onClick={() => setSelected(kind)} data-kind={kind}>{c.name}</button></li>
          ))}
        </ul>
        <div className="pv-gallery-info" data-testid="gallery-info">
          {credit ? (
            <>
              <h2>{credit.name}</h2>
              <p>{placed(selected)}</p>
              <p className="pv-note">
                <a href={credit.source} target="_blank" rel="noreferrer">&ldquo;{credit.title}&rdquo;</a> by <a href={credit.authorUrl} target="_blank" rel="noreferrer">{credit.author}</a>, licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">{credit.license}</a>. Changes: {credit.changes}.
              </p>
            </>
          ) : (
            <p className="pv-note">Drag to turn, scroll to zoom. Pick an animal to see it alone and close up, with its author and licence. All models are CC BY 4.0 and credited under &ldquo;Credits&rdquo; in the top bar.</p>
          )}
        </div>
      </div>
    </section>
  )
}
