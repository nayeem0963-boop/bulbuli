/**
 * The look of the Amazon's animals up close (rendering/AmazonFauna.jsx): the vertex colours of the
 * models, plus, worked out per pixel from where on the body the pixel is, so no image file is used:
 *   - a fine grain of fur (a bump on the surface that catches the light in tiny strokes, and a
 *     faint variation in the colour along the same strokes),
 *   - a soft rim of light round the edge of the body, as a coat of hair gives,
 *   - a contact shadow (contactShadowTexture) under each animal so it sits on the ground.
 * One material is shared by every animal.
 */
import { CanvasTexture, MeshStandardMaterial, SRGBColorSpace } from 'three'

const NOISE = /* glsl */ `
varying vec3 vFurPos;
float furHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float furNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(furHash(i), furHash(i + vec3(1, 0, 0)), f.x), mix(furHash(i + vec3(0, 1, 0)), furHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(furHash(i + vec3(0, 0, 1)), furHash(i + vec3(1, 0, 1)), f.x), mix(furHash(i + vec3(0, 1, 1)), furHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
#ifdef WX_SKIN
// scales: a field of cells (Voronoi): raised in the middle, dark in the seams between them
vec2 skinCells(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p); float d1 = 8.0; float d2 = 8.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 o = vec3(furHash(i + g), furHash(i + g + 17.3), furHash(i + g + 41.7));
    vec3 r = g + o - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
  }
  return vec2(sqrt(d1), sqrt(d2));
}
float furStrokes(vec3 p) { vec2 c = skinCells(p * 95.0); return (1.0 - smoothstep(0.05, 0.6, c.x)) * smoothstep(0.0, 0.2, c.y - c.x); }
#else
// strokes of fur: a fine layer over a coarser one, only a little stretched along the body
float furStrokes(vec3 p) { return 0.6 * furNoise(p * vec3(150.0, 150.0, 110.0)) + 0.4 * furNoise(p * vec3(340.0, 340.0, 250.0)); }
#endif
`

/** `kind`: 'fur' (mammals, birds) or 'skin' (reptiles, the tortoise, the frog: a field of scales). */
export function createFurMaterial(kind = 'fur') {
  const skin = kind === 'skin'
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, side: 2, emissive: '#3a3226', emissiveIntensity: 0.4 })
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying vec3 vFurPos;\nvoid main() {')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vFurPos = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${skin ? '#define WX_SKIN\n' : ''}${NOISE}\nvoid main() {`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float furTone = furStrokes(vFurPos);
        diffuseColor.rgb *= ${skin ? '0.84 + 0.24 * furTone' : '0.93 + 0.14 * furTone'};`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          // a bump from the strokes: the surface tilts a little towards where the fur is higher
          float h0 = furStrokes(vFurPos);
          float hx = furStrokes(vFurPos + dFdx(vFurPos));
          float hy = furStrokes(vFurPos + dFdy(vFurPos));
          vec3 sx = dFdx(-vViewPosition);
          vec3 sy = dFdy(-vViewPosition);
          vec3 r1 = cross(sy, normal);
          vec3 r2 = cross(normal, sx);
          float det = dot(sx, r1);
          vec3 grad = sign(det) * ((hx - h0) * r1 + (hy - h0) * r2);
          normal = normalize(abs(det) * normal - ${skin ? '0.02' : '0.009'} * grad);
        }`)
      .replace('#include <opaque_fragment>', `
        // a rim of light along the silhouette, as hair gives
        float furRim = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 3.0);
        outgoingLight += furRim * ${skin ? '0.08' : '0.16'} * diffuseColor.rgb;
        #include <opaque_fragment>`)
  }
  material.customProgramCacheKey = () => `wx-amazon-${kind}-v4`
  return material
}

/** A soft dark oval, fading to nothing at its edge: the shadow an animal casts on the ground right under it. */
export function contactShadowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(0,0,0,0.55)')
  gradient.addColorStop(0.55, 'rgba(0,0,0,0.3)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}
