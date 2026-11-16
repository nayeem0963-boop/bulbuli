import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { RAINFOREST_BIRD, createRainforestBirdParts } from './rainforestBird.js'

const box = (geometry) => { geometry.computeBoundingBox(); return geometry.boundingBox }
const at = ([x, y, z]) => ({ x, y, z })

test('rainforest bird: built in code, no model file and no third-party licence left', () => {
  assert.ok(!existsSync(new URL('../assets/bird_orange.glb', import.meta.url)))
  assert.ok(!existsSync(new URL('../assets/bird_orange.LICENSE.md', import.meta.url)))
  const avatar = readFileSync(new URL('../AmazonBirdAvatar.jsx', import.meta.url), 'utf8')
  assert.ok(!/useGLTF|GLTFLoader|\.glb|AnimationMixer|CC BY/.test(avatar.replace(/^\/\*\*[\s\S]*?\*\//, '')), 'the avatar loads nothing')
  const preview = readFileSync(new URL('../../../../dev-preview/phase-2a/PreviewApp.jsx', import.meta.url), 'utf8')
  // (the review page does credit the Amazon jaguar, a CC BY 4.0 model that is used: see amazonFauna.test.js)
  assert.ok(!/Bird Orange|CC BY-NC/i.test(preview), 'no credit for a model that is not used')
})

test('rainforest bird: Bulbuli\'s size, feet on the ground, facing +z, in four movable parts', () => {
  const parts = createRainforestBirdParts()
  assert.deepEqual(Object.keys(parts).sort(), ['body', 'head', 'legs', 'tail'])
  const { neck, tailRoot, length, height } = RAINFOREST_BIRD
  const body = box(parts.body)
  const legs = box(parts.legs)
  const head = box(parts.head)
  const tail = box(parts.tail)
  assert.ok(Math.abs(legs.min.y) < 0.01 && legs.max.y > 0.06, 'standing on its feet')
  assert.ok(body.min.y > 0.03, 'the body rides above the legs')
  // head and tail are built round their hinges
  const headTop = neck[1] + head.max.y
  const beakTip = neck[2] + head.max.z
  const tailTip = tailRoot[2] + tail.min.z
  assert.ok(Math.abs(headTop - height) < 0.02, `head top ${headTop.toFixed(3)} m`)
  assert.ok(beakTip > 0.2 && beakTip > body.max.z + 0.08, 'the beak points forward (+z)')
  assert.ok(tailTip < body.min.z - 0.05, 'the tail trails behind')
  const total = beakTip - tailTip
  assert.ok(Math.abs(total - length) < 0.03, `${total.toFixed(3)} m beak to tail`)
  // narrow: a songbird, not wider than half its length with wings folded
  assert.ok(Math.max(body.max.x, head.max.x, tail.max.x) * 2 < length * 0.4)
  assert.ok(Math.abs(at(RAINFOREST_BIRD.shoulder).y - 0.185) < 1e-9 && RAINFOREST_BIRD.shoulder[0] < body.max.x + 0.01, 'wings start at the body')
})

test('rainforest bird: coloured by vertex, finite, light, and always the same bird', () => {
  const a = createRainforestBirdParts()
  const b = createRainforestBirdParts()
  let triangles = 0
  for (const [name, geometry] of Object.entries(a)) {
    const p = geometry.attributes.position
    assert.ok(geometry.attributes.color && geometry.attributes.normal, `${name} has colours and normals`)
    for (const n of p.array) assert.ok(Number.isFinite(n))
    assert.deepEqual([...p.array], [...b[name].attributes.position.array])
    triangles += (geometry.index ? geometry.index.count : p.count) / 3
  }
  assert.ok(triangles < 3000, `${triangles} triangles`)
  // an orange-red head over an olive back: the head's colours are red-dominant, the body's top green-dominant
  const mean = (geometry, pick) => {
    const c = geometry.attributes.color
    const p = geometry.attributes.position
    let r = 0, g = 0, n = 0
    for (let i = 0; i < c.count; i += 1) if (pick(p.getY(i))) { r += c.getX(i); g += c.getY(i); n += 1 }
    return { r: r / n, g: g / n }
  }
  const crown = mean(a.head, (y) => y > 0.02)
  assert.ok(crown.r > crown.g * 1.5, 'red head')
  // the back is olive (less red than green) and the breast under it orange (far more red than green)
  const back = mean(a.body, (y) => y > 0.19)
  const breast = mean(a.body, (y) => y > 0.1 && y < 0.14)
  assert.ok(back.r / back.g < 1.3, 'olive back')
  assert.ok(breast.r / breast.g > 2, 'orange breast')
})
