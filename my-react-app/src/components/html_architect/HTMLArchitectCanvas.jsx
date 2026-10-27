/**
 * Bulbuli's HTML Architect 3D — 3D viewport
 *
 * A floating grassy plot where Bulbuli (a red-vented bulbul) lives. As the
 * player writes valid HTML, matching 3D objects pop into existence:
 *
 *   <html> + <body>      -> foundation grid lights up
 *   <h1>                 -> neon sign showing the heading text
 *   <p>                  -> wall plaque showing the paragraph text
 *   <img src="...">      -> picture frame on an easel (loads the image if it can)
 *   <ul> + <li>          -> shelving unit with one box per <li>
 *
 * Usage:
 *   const validation = validateHTML(code, level);
 *   <HTMLArchitectCanvas validation={validation} onObjectSpawn={(key) => playPop()} />
 *
 * Props:
 *   validation     result of validateHTML() (needs parsedTree, typedTags, brokenTags)
 *   height         CSS height of the viewport (default 480)
 *   onObjectSpawn  optional callback(key) when an object appears: 'FOUNDATION' | 'NEON_SIGN'
 *                  | 'WALL_PLAQUE' | 'PICTURE_FRAME' | 'SHELF' | 'SHELF_ITEM'
 *   className, style  passed to the wrapper div
 *
 * Only dependency: three (npm i three).
 */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/* ================================================================== */
/* Validation result -> what should be in the scene                    */
/* ================================================================== */

const findAll = (node, tag, out = []) => {
  if (!node) return out;
  if (node.tag === tag) out.push(node);
  (node.children || []).forEach((c) => findAll(c, tag, out));
  return out;
};
const fullText = (node) =>
  [node.text || '', ...(node.children || []).map(fullText)].join(' ').replace(/\s+/g, ' ').trim();

export function deriveSceneState(validation) {
  const typed = validation?.typedTags || {};
  const broken = new Set(validation?.brokenTags || []);
  const tree = validation?.parsedTree;
  const ok = (tag) => (typed[tag] || 0) > 0 && !broken.has(tag);

  const h1 = findAll(tree, 'h1')[0];
  const p = findAll(tree, 'p')[0];
  const img = findAll(tree, 'img').find((n) => (n.attributes?.src || '').trim());
  const liCount = findAll(tree, 'ul').reduce(
    (sum, ul) => sum + (ul.children || []).filter((c) => c.tag === 'li').length, 0,
  );

  return {
    foundation: ok('html') && ok('body'),
    sign: ok('h1') && h1 ? { text: fullText(h1) || 'HELLO!' } : null,
    plaque: ok('p') && p ? { text: fullText(p) || '...' } : null,
    frame: ok('img') && img ? { src: img.attributes.src.trim(), alt: img.attributes.alt || '' } : null,
    shelf: ok('ul') && ok('li') && liCount > 0 ? { count: Math.min(liCount, 12) } : null,
  };
}

/* ================================================================== */
/* Small helpers                                                        */
/* ================================================================== */

const PALETTE = {
  grass: 0x7cc957,
  grassDark: 0x5aa83f,
  dirt: 0x8b5e3c,
  rock: 0x6f6a75,
  wood: 0xa0703f,
  woodDark: 0x6e4a2a,
  stone: 0xb9b3a8,
  brass: 0xd4a84a,
  neonPink: 0xff3ea5,
  neonCyan: 0x2ef2ff,
  glow: 0x5ff5ff,
};

const BOX_COLORS = [0xff6b6b, 0xffc145, 0x4ecdc4, 0x7b6cff, 0xff8fc7, 0x6bd16b];

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const std = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, flatShading: true, ...extra });

function mesh(geometry, material, { cast = true, receive = false } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        Object.values(m).forEach((v) => v && v.isTexture && v.dispose());
        m.dispose();
      });
    }
  });
}

// Eases with a little overshoot — the "pop".
const backOut = (x, s = 2.2) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2;
const easeIn = (x) => x * x * x;
const clamp01 = (x) => Math.min(1, Math.max(0, x));

const POP_TIME = 0.7;
const SHRINK_TIME = 0.35;

/* ================================================================== */
/* Environment                                                          */
/* ================================================================== */

function makeSkyTexture() {
  return canvasTexture(16, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#6ec3ff');
    g.addColorStop(0.55, '#bfe6ff');
    g.addColorStop(1, '#ffe2c4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

function makeIsland() {
  const island = new THREE.Group();
  const rand = mulberry32(7);

  const grass = mesh(new THREE.BoxGeometry(12, 0.6, 12), std(PALETTE.grass), { cast: false, receive: true });
  island.add(grass);

  const dirt = mesh(new THREE.BoxGeometry(11.6, 1.2, 11.6), std(PALETTE.dirt), { receive: true });
  dirt.position.y = -0.9;
  island.add(dirt);

  // Rocky underside: a few downward cones
  const rockMat = std(PALETTE.rock);
  [[0, 0, 5.5, 5], [-3, 2, 2.6, 3.2], [3.2, -2.4, 2.8, 3.6], [2.5, 3, 2, 2.4], [-2.8, -3, 2.2, 2.8]]
    .forEach(([x, z, r, h]) => {
      const cone = mesh(new THREE.ConeGeometry(r, h, 6), rockMat);
      cone.rotation.x = Math.PI;
      cone.position.set(x, -1.5 - h / 2, z);
      island.add(cone);
    });

  // Grass tufts and flowers
  const tuftMat = std(PALETTE.grassDark);
  const flowerColors = [0xffffff, 0xffd84d, 0xff8fc7, 0xb48cff];
  for (let i = 0; i < 46; i += 1) {
    const x = (rand() - 0.5) * 11;
    const z = (rand() - 0.5) * 11;
    if (Math.abs(x) < 1.6 && z > 0.8 && z < 3.6) continue; // keep Bulbuli's spot clear
    if (rand() < 0.7) {
      const tuft = mesh(new THREE.ConeGeometry(0.12, 0.35 + rand() * 0.25, 4), tuftMat);
      tuft.position.set(x, 0.45, z);
      island.add(tuft);
    } else {
      const flower = mesh(new THREE.SphereGeometry(0.1, 6, 4), std(flowerColors[i % 4]));
      flower.position.set(x, 0.42, z);
      island.add(flower);
    }
  }

  // Foundation grid — faded in when <html> + <body> exist
  const gridMat = new THREE.LineBasicMaterial({ color: PALETTE.glow, transparent: true, opacity: 0, toneMapped: false });
  const gridPoints = [];
  for (let i = -6; i <= 6; i += 1) {
    gridPoints.push(-6, 0, i, 6, 0, i, i, 0, -6, i, 0, 6);
  }
  const gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3));
  const grid = new THREE.LineSegments(gridGeo, gridMat);
  grid.position.y = 0.31;
  island.add(grid);

  const edgeMat = new THREE.LineBasicMaterial({ color: PALETTE.glow, transparent: true, opacity: 0, toneMapped: false });
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(12.05, 0.62, 12.05)), edgeMat);
  island.add(edge);

  const glowLight = new THREE.PointLight(PALETTE.glow, 0, 14, 1.5);
  glowLight.position.set(0, 1.5, 0);
  island.add(glowLight);

  return { island, gridMat, edgeMat, glowLight };
}

function makeClouds(scene) {
  const rand = mulberry32(42);
  const mat = std(0xffffff, { roughness: 1 });
  const clouds = [];
  for (let i = 0; i < 6; i += 1) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(rand() * 3);
    for (let j = 0; j < puffs; j += 1) {
      const puff = mesh(new THREE.SphereGeometry(0.8 + rand() * 0.8, 7, 5), mat, { cast: false });
      puff.position.set(j * 1.1 - puffs * 0.5, rand() * 0.5, rand() * 0.8);
      cloud.add(puff);
    }
    cloud.position.set((rand() - 0.5) * 60, 5 + rand() * 9, -18 - rand() * 18);
    cloud.userData.speed = 0.3 + rand() * 0.5;
    scene.add(cloud);
    clouds.push(cloud);
  }
  return clouds;
}

function makeFireflies() {
  const count = 40;
  const rand = mulberry32(99);
  const positions = new Float32Array(count * 3);
  const seeds = [];
  for (let i = 0; i < count; i += 1) {
    seeds.push({ x: (rand() - 0.5) * 16, y: 1 + rand() * 6, z: (rand() - 0.5) * 16, p: rand() * Math.PI * 2 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xfff6b0, size: 0.12, transparent: true, opacity: 0.8, toneMapped: false,
  }));
  points.userData.tick = (t) => {
    seeds.forEach((s, i) => {
      positions[i * 3] = s.x + Math.sin(t * 0.4 + s.p) * 0.6;
      positions[i * 3 + 1] = s.y + Math.sin(t * 0.7 + s.p * 2) * 0.4;
      positions[i * 3 + 2] = s.z + Math.cos(t * 0.5 + s.p) * 0.6;
    });
    geo.attributes.position.needsUpdate = true;
  };
  return points;
}

/* ================================================================== */
/* Bulbuli the mascot                                                   */
/* ================================================================== */

function makeBulbuli() {
  const root = new THREE.Group();   // position / hop
  const body = new THREE.Group();   // breathing / turning
  root.add(body);

  const brown = std(0x6b5a4c);
  const belly = std(0xa8988a);
  const black = std(0x1d1c22);
  const red = std(0xe0283f);
  const white = std(0xffffff, { roughness: 0.4 });
  const legMat = std(0x3b2f2a);

  const torso = mesh(new THREE.SphereGeometry(0.6, 12, 10), brown);
  torso.scale.set(1, 1.05, 1.25);
  torso.position.y = 1.05;
  body.add(torso);

  const chest = mesh(new THREE.SphereGeometry(0.5, 12, 10), belly);
  chest.scale.set(0.95, 1, 0.9);
  chest.position.set(0, 0.98, 0.3);
  body.add(chest);

  const vent = mesh(new THREE.SphereGeometry(0.24, 10, 8), red);
  vent.position.set(0, 0.68, -0.5);
  body.add(vent);

  // Tail
  const tail = mesh(new THREE.BoxGeometry(0.42, 0.08, 0.95), brown);
  tail.position.set(0, 0.85, -1.05);
  tail.rotation.x = -0.45;
  body.add(tail);
  const tailTip = mesh(new THREE.BoxGeometry(0.44, 0.09, 0.15), white);
  tailTip.position.set(0, 0.62, -1.48);
  tailTip.rotation.x = -0.45;
  body.add(tailTip);

  // Wings (pivot at shoulder so they can flap)
  const wings = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.55, 1.3, -0.05);
    const wing = mesh(new THREE.SphereGeometry(0.45, 10, 8), std(0x564739));
    wing.scale.set(0.25, 0.7, 1.15);
    wing.position.set(side * 0.05, -0.25, -0.15);
    pivot.add(wing);
    body.add(pivot);
    pivot.userData.side = side;
    return pivot;
  });

  // Head
  const head = new THREE.Group();
  head.position.set(0, 1.75, 0.3);
  body.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.42, 12, 10), black));

  const crest = mesh(new THREE.ConeGeometry(0.2, 0.55, 6), black);
  crest.position.set(0, 0.42, -0.12);
  crest.rotation.x = -0.5;
  head.add(crest);

  const beak = mesh(new THREE.ConeGeometry(0.08, 0.3, 6), std(0x2b2b2b));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, -0.05, 0.5);
  head.add(beak);

  const eyes = [-1, 1].map((side) => {
    const eye = new THREE.Group();
    eye.position.set(side * 0.2, 0.08, 0.32);
    eye.add(mesh(new THREE.SphereGeometry(0.1, 10, 8), white, { cast: false }));
    const pupil = mesh(new THREE.SphereGeometry(0.055, 8, 6), black, { cast: false });
    pupil.position.set(side * 0.01, 0, 0.06);
    eye.add(pupil);
    const shine = mesh(new THREE.SphereGeometry(0.018, 6, 4), white, { cast: false });
    shine.position.set(0.02, 0.03, 0.11);
    eye.add(shine);
    head.add(eye);
    return eye;
  });

  // Rosy cheeks for extra cuteness
  [-1, 1].forEach((side) => {
    const cheek = mesh(new THREE.SphereGeometry(0.07, 8, 6), std(0xff7a8a), { cast: false });
    cheek.scale.set(1, 0.6, 0.4);
    cheek.position.set(side * 0.3, -0.1, 0.27);
    head.add(cheek);
  });

  // Legs
  [-1, 1].forEach((side) => {
    const leg = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 5), legMat);
    leg.position.set(side * 0.22, 0.3, 0.05);
    body.add(leg);
    const foot = mesh(new THREE.BoxGeometry(0.16, 0.05, 0.3), legMat);
    foot.position.set(side * 0.22, 0.06, 0.15);
    body.add(foot);
  });

  root.position.set(0, 0.3, 2.2);

  const state = { celebrateStart: -10, lookAt: null, nextBlink: 2 };

  return {
    root,
    celebrate(t, target) {
      state.celebrateStart = t;
      state.lookAt = target ? target.clone() : null;
    },
    tick(t) {
      const since = t - state.celebrateStart;
      const celebrating = since < 1.6;

      // Breathing
      const breathe = 1 + Math.sin(t * 2.2) * 0.02;
      body.scale.set(1, breathe, 1);

      // Hops while celebrating
      root.position.y = 0.3 + (celebrating ? Math.abs(Math.sin(since * 9)) * 0.5 * (1 - since / 1.6) : 0);

      // Wings: gentle idle, fast flap when celebrating
      wings.forEach((w) => {
        const flap = celebrating ? Math.sin(since * 30) * 0.9 : Math.sin(t * 1.6) * 0.05;
        w.rotation.z = w.userData.side * (0.1 + Math.abs(flap));
      });

      // Bulbuli faces the camera (+z). When something new appears, turn partway
      // toward it (staying mostly visible); otherwise glance around.
      const bodyYaw = celebrating && state.lookAt
        ? Math.atan2(state.lookAt.x - root.position.x, state.lookAt.z - root.position.z) * 0.5
        : 0;
      const headYaw = celebrating ? 0 : Math.sin(t * 0.5) * 0.45;
      body.rotation.y += (bodyYaw - body.rotation.y) * 0.08;
      head.rotation.y += (headYaw - head.rotation.y) * 0.06;
      head.rotation.z = Math.sin(t * 0.9) * 0.08;

      // Blink
      if (t > state.nextBlink) {
        const b = (t - state.nextBlink) / 0.15;
        const s = b < 1 ? Math.abs(1 - 2 * b) : 1;
        eyes.forEach((e) => { e.scale.y = Math.max(0.1, s); });
        if (b >= 1) state.nextBlink = t + 2 + Math.random() * 3;
      }
    },
  };
}

/* ================================================================== */
/* Spawnable objects                                                    */
/* ================================================================== */

function drawNeon(ctx, w, h, text) {
  ctx.clearRect(0, 0, w, h);
  const label = text.length > 28 ? `${text.slice(0, 27)}…` : text;
  let size = 150;
  ctx.font = `bold ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
  while (ctx.measureText(label).width > w * 0.88 && size > 40) {
    size -= 6;
    ctx.font = `bold ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff3ea5';
  for (const blur of [40, 20, 8]) {
    ctx.shadowBlur = blur;
    ctx.fillStyle = '#ff7cc4';
    ctx.fillText(label, w / 2, h / 2);
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff3fa';
  ctx.fillText(label, w / 2, h / 2);
}

function makeNeonSign(data) {
  const group = new THREE.Group();
  const postMat = std(0x3a3a46, { metalness: 0.4, roughness: 0.5 });
  [-2.3, 2.3].forEach((x) => {
    const post = mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.4, 8), postMat);
    post.position.set(x, 1.7, 0);
    group.add(post);
  });

  const board = mesh(new THREE.BoxGeometry(5.2, 1.7, 0.2), std(0x1b1530, { roughness: 0.4 }));
  board.position.y = 2.6;
  group.add(board);

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  drawNeon(ctx, canvas.width, canvas.height, data.text);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const faceMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.56), faceMat);
  face.position.set(0, 2.6, 0.11);
  group.add(face);

  // Neon tube border
  const tubeMat = new THREE.MeshBasicMaterial({ color: PALETTE.neonCyan, toneMapped: false });
  [[0, 3.42, 5.2, 0.07], [0, 1.78, 5.2, 0.07], [-2.58, 2.6, 0.07, 1.7], [2.58, 2.6, 0.07, 1.7]]
    .forEach(([x, y, w, hgt]) => {
      const tube = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, 0.07), tubeMat);
      tube.position.set(x, y, 0.14);
      group.add(tube);
    });

  const light = new THREE.PointLight(PALETTE.neonPink, 6, 9, 1.8);
  light.position.set(0, 2.6, 1);
  group.add(light);

  let currentText = data.text;
  return {
    group,
    anchor: new THREE.Vector3(0, 2.6, 0),
    update(next) {
      if (next.text !== currentText) {
        currentText = next.text;
        drawNeon(ctx, canvas.width, canvas.height, currentText);
        tex.needsUpdate = true;
      }
    },
    tick(t, age) {
      // Flicker on while warming up, then a gentle hum
      const warming = age < 1.1;
      const on = warming ? (Math.sin(age * 55) + Math.sin(age * 23) > -0.2 ? 1 : 0.15) : 1;
      const hum = 0.92 + Math.sin(t * 7) * 0.04 + Math.sin(t * 13.3) * 0.04;
      faceMat.opacity = on * hum;
      tubeMat.color.setHex(PALETTE.neonCyan).multiplyScalar(on * hum);
      light.intensity = 6 * on * hum;
    },
  };
}

function drawPlaque(ctx, w, h, text) {
  ctx.fillStyle = '#f6ecd2';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#c9b48a';
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, w - 36, h - 36);
  ctx.fillStyle = '#3a2a1a';
  ctx.font = '600 38px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = wrapLines(ctx, text, w - 90, 6);
  const lh = 48;
  const startY = h / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((line, i) => ctx.fillText(line, w / 2, startY + i * lh));
}

function makeWallPlaque(data) {
  const group = new THREE.Group();

  // A short stone wall to hang the plaque on
  const wall = mesh(new THREE.BoxGeometry(3, 2.4, 0.45), std(PALETTE.stone), { receive: true });
  wall.position.y = 1.2;
  group.add(wall);
  const cap = mesh(new THREE.BoxGeometry(3.2, 0.2, 0.6), std(0x9c968c));
  cap.position.y = 2.5;
  group.add(cap);

  const backing = mesh(new THREE.BoxGeometry(2.3, 1.55, 0.08), std(PALETTE.brass, { metalness: 0.7, roughness: 0.35 }));
  backing.position.set(0, 1.3, 0.27);
  group.add(backing);

  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  drawPlaque(ctx, canvas.width, canvas.height, data.text);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.38), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  face.position.set(0, 1.3, 0.315);
  group.add(face);

  const screwMat = std(0x8a6a2a, { metalness: 0.8, roughness: 0.3 });
  [[-1.05, 1.98], [1.05, 1.98], [-1.05, 0.62], [1.05, 0.62]].forEach(([x, y]) => {
    const screw = mesh(new THREE.SphereGeometry(0.05, 6, 4), screwMat, { cast: false });
    screw.position.set(x, y, 0.33);
    group.add(screw);
  });

  let currentText = data.text;
  return {
    group,
    anchor: new THREE.Vector3(0, 1.3, 0),
    update(next) {
      if (next.text !== currentText) {
        currentText = next.text;
        drawPlaque(ctx, canvas.width, canvas.height, currentText);
        tex.needsUpdate = true;
      }
    },
  };
}

function drawPlaceholderPainting(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#7ec8ff');
  sky.addColorStop(1, '#ffe0b8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath();
  ctx.arc(w * 0.72, h * 0.3, h * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5fa85a';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.quadraticCurveTo(w * 0.25, h * 0.45, w * 0.55, h * 0.8);
  ctx.quadraticCurveTo(w * 0.8, h * 0.5, w, h * 0.7);
  ctx.lineTo(w, h);
  ctx.fill();
  ctx.fillStyle = '#3f8a45';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.quadraticCurveTo(w * 0.5, h * 0.7, w, h);
  ctx.fill();
}

function makePictureFrame(data) {
  const group = new THREE.Group();
  const woodMat = std(PALETTE.woodDark);

  // Easel
  const legGeo = new THREE.BoxGeometry(0.12, 3.4, 0.12);
  [-0.9, 0.9].forEach((x) => {
    const leg = mesh(legGeo, woodMat);
    leg.position.set(x * 0.85, 1.6, 0);
    leg.rotation.z = x > 0 ? -0.12 : 0.12;
    leg.rotation.x = -0.12;
    group.add(leg);
  });
  const backLeg = mesh(legGeo, woodMat);
  backLeg.position.set(0, 1.5, -0.6);
  backLeg.rotation.x = 0.35;
  group.add(backLeg);
  const ledge = mesh(new THREE.BoxGeometry(2.2, 0.1, 0.3), woodMat);
  ledge.position.set(0, 1.05, 0.12);
  group.add(ledge);

  // Frame
  const frame = new THREE.Group();
  frame.position.set(0, 2.05, 0.16);
  frame.rotation.x = -0.12;
  group.add(frame);

  const W = 2.2;
  const H = 1.7;
  const gold = std(PALETTE.brass, { metalness: 0.75, roughness: 0.3 });
  [[0, H / 2, W + 0.24, 0.16], [0, -H / 2, W + 0.24, 0.16], [-W / 2, 0, 0.16, H], [W / 2, 0, 0.16, H]]
    .forEach(([x, y, w, h]) => {
      const bar = mesh(new THREE.BoxGeometry(w, h, 0.14), gold);
      bar.position.set(x, y, 0);
      frame.add(bar);
    });

  const placeholder = canvasTexture(512, 400, drawPlaceholderPainting);
  const pictureMat = new THREE.MeshStandardMaterial({ map: placeholder, roughness: 0.6 });
  const picture = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.04, H - 0.04), pictureMat);
  picture.position.z = 0.02;
  frame.add(picture);

  let currentSrc = null;
  let loadToken = 0;
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');

  const load = (src) => {
    currentSrc = src;
    const token = ++loadToken;
    loader.load(
      src,
      (tex) => {
        if (token !== loadToken) { tex.dispose(); return; }
        tex.colorSpace = THREE.SRGBColorSpace;
        // "cover" crop so any aspect ratio fills the frame
        const imgAspect = tex.image.width / tex.image.height;
        const frameAspect = W / H;
        if (imgAspect > frameAspect) {
          tex.repeat.set(frameAspect / imgAspect, 1);
          tex.offset.set((1 - tex.repeat.x) / 2, 0);
        } else {
          tex.repeat.set(1, imgAspect / frameAspect);
          tex.offset.set(0, (1 - tex.repeat.y) / 2);
        }
        if (pictureMat.map !== placeholder) pictureMat.map.dispose();
        pictureMat.map = tex;
        pictureMat.needsUpdate = true;
      },
      undefined,
      () => {
        // Image couldn't load (bad path, CORS…): keep the painted placeholder
        if (token !== loadToken) return;
        if (pictureMat.map !== placeholder) pictureMat.map.dispose();
        pictureMat.map = placeholder;
        pictureMat.needsUpdate = true;
      },
    );
  };
  load(data.src);

  return {
    group,
    anchor: new THREE.Vector3(0, 2, 0),
    update(next) {
      if (next.src !== currentSrc) load(next.src);
    },
    dispose() {
      loadToken += 1;
      placeholder.dispose();
    },
  };
}

function makeShelf(data, onBoxSpawn) {
  const group = new THREE.Group();
  const wood = std(PALETTE.wood);
  const woodDark = std(PALETTE.woodDark);

  const W = 3;
  const D = 0.8;
  const SHELF_Y = [0.35, 1.25, 2.15];

  [-W / 2, W / 2].forEach((x) => {
    const side = mesh(new THREE.BoxGeometry(0.12, 2.9, D), woodDark);
    side.position.set(x, 1.45, 0);
    group.add(side);
  });
  const back = mesh(new THREE.BoxGeometry(W, 2.9, 0.06), wood, { receive: true });
  back.position.set(0, 1.45, -D / 2 + 0.03);
  group.add(back);
  [...SHELF_Y.map((y) => y - 0.05), 2.9].forEach((y) => {
    const board = mesh(new THREE.BoxGeometry(W + 0.12, 0.1, D), woodDark, { receive: true });
    board.position.set(0, y, 0);
    group.add(board);
  });

  const SLOTS_PER_SHELF = 4;
  const slotX = (i) => -W / 2 + 0.42 + (i % SLOTS_PER_SHELF) * ((W - 0.84) / (SLOTS_PER_SHELF - 1));
  const rand = mulberry32(3);
  const slotSize = Array.from({ length: 12 }, () => 0.45 + rand() * 0.2);

  const boxes = []; // { mesh, born, dying, diedAt }

  const addBox = (i, born) => {
    const s = slotSize[i];
    const box = mesh(new THREE.BoxGeometry(s, s, s), std(BOX_COLORS[i % BOX_COLORS.length], { roughness: 0.55 }));
    // Little ribbon so they read as "items"
    const ribbon = mesh(new THREE.BoxGeometry(s * 1.02, s * 0.15, s * 1.02), std(0xffffff), { cast: false });
    box.add(ribbon);
    box.position.set(slotX(i), SHELF_Y[Math.floor(i / SLOTS_PER_SHELF)] + s / 2, 0.05);
    box.rotation.y = (rand() - 0.5) * 0.3;
    box.scale.setScalar(0.001);
    group.add(box);
    boxes.push({ mesh: box, born, dying: false });
  };

  let count = 0;
  let pendingCount = data.count;

  const setCount = (next, t) => {
    const alive = boxes.filter((b) => !b.dying);
    if (next > alive.length) {
      for (let i = alive.length; i < next; i += 1) {
        addBox(i, t + (i - alive.length) * 0.12); // stagger each new box
        onBoxSpawn?.();
      }
    } else if (next < alive.length) {
      alive.slice(next).forEach((b) => { b.dying = true; b.diedAt = t; });
    }
    count = next;
  };

  return {
    group,
    anchor: new THREE.Vector3(0, 1.4, 0),
    update(next) { pendingCount = next.count; },
    tick(t) {
      if (pendingCount !== count) setCount(pendingCount, t);
      for (let i = boxes.length - 1; i >= 0; i -= 1) {
        const b = boxes[i];
        if (b.dying) {
          const k = clamp01((t - b.diedAt) / SHRINK_TIME);
          b.mesh.scale.setScalar(Math.max(0.001, 1 - easeIn(k)));
          if (k >= 1) {
            group.remove(b.mesh);
            disposeObject(b.mesh);
            boxes.splice(i, 1);
          }
        } else {
          const k = clamp01((t - b.born) / 0.55);
          b.mesh.scale.setScalar(Math.max(0.001, backOut(k, 2.6)));
        }
      }
    },
    // First boxes wait until the shelf itself has popped in
    init(t) { setCount(pendingCount, t + 0.35); },
  };
}

function makeSparkleBurst(position, color) {
  const count = 36;
  const positions = new Float32Array(count * 3);
  const velocities = [];
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5)
      .normalize().multiplyScalar(2 + Math.random() * 3);
    velocities.push(dir);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color, size: 0.18, transparent: true, toneMapped: false, depthWrite: false });
  const points = new THREE.Points(geo, mat);
  points.userData.age = 0;
  points.userData.tick = (dt) => {
    points.userData.age += dt;
    for (let i = 0; i < count; i += 1) {
      velocities[i].y -= 6 * dt;
      positions[i * 3] += velocities[i].x * dt;
      positions[i * 3 + 1] += velocities[i].y * dt;
      positions[i * 3 + 2] += velocities[i].z * dt;
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = Math.max(0, 1 - points.userData.age / 1.1);
    return points.userData.age < 1.1;
  };
  return points;
}

// Where each object lives on the plot and how it's built.
const SPAWNABLES = {
  sign: { key: 'NEON_SIGN', make: makeNeonSign, position: [0, 0.3, -4.2], rotationY: 0, color: PALETTE.neonPink },
  plaque: { key: 'WALL_PLAQUE', make: makeWallPlaque, position: [-4.1, 0.3, -1.4], rotationY: 0.55, color: 0xffe08a },
  frame: { key: 'PICTURE_FRAME', make: makePictureFrame, position: [4.1, 0.3, -1.4], rotationY: -0.55, color: 0xfff1a8 },
  shelf: { key: 'SHELF', make: makeShelf, position: [4.0, 0.3, 3.0], rotationY: -1.05, color: 0x8ef0c8 },
};

/* ================================================================== */
/* The component                                                        */
/* ================================================================== */

export default function HTMLArchitectCanvas({ validation, height = 480, onObjectSpawn, className, style }) {
  const containerRef = useRef(null);
  const worldRef = useRef(null);
  const onSpawnRef = useRef(onObjectSpawn);
  onSpawnRef.current = onObjectSpawn;

  const sceneState = deriveSceneState(validation);
  const stateKey = JSON.stringify(sceneState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableState = useMemo(() => sceneState, [stateKey]);

  /* ---------- build the world once ---------- */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = makeSkyTexture();
    scene.fog = new THREE.Fog(0xcfe9ff, 30, 70);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    camera.position.set(10, 9, 15);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.2, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 9;
    controls.maxDistance = 32;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    const stopAutoRotate = () => { controls.autoRotate = false; };
    controls.addEventListener('start', stopAutoRotate);

    // Lights
    scene.add(new THREE.HemisphereLight(0xdff2ff, 0x6a8f4a, 0.9));
    const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
    sun.position.set(8, 14, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    // Floating island: everything on the plot is a child, so it all bobs together
    const { island, gridMat, edgeMat, glowLight } = makeIsland();
    scene.add(island);

    const clouds = makeClouds(scene);
    const fireflies = makeFireflies();
    scene.add(fireflies);

    const bulbuli = makeBulbuli();
    island.add(bulbuli.root);

    const world = {
      items: {},           // name -> { obj, born, dying, diedAt, def }
      bursts: [],
      foundation: false,
      foundationLevel: 0,
      time: 0,
      island,
    };
    worldRef.current = world;

    const burst = (localPos, color) => {
      const p = makeSparkleBurst(island.localToWorld(localPos.clone()), color);
      scene.add(p);
      world.bursts.push(p);
    };

    world.sync = (state) => {
      const t = world.time;

      if (state.foundation && !world.foundation) {
        burst(new THREE.Vector3(0, 0.5, 0), PALETTE.glow);
        bulbuli.celebrate(t, null);
        onSpawnRef.current?.('FOUNDATION');
      }
      world.foundation = state.foundation;

      Object.entries(SPAWNABLES).forEach(([name, def]) => {
        const data = state[name];
        const existing = world.items[name];

        if (data && (!existing || existing.dying)) {
          if (existing) { island.remove(existing.obj.group); disposeObject(existing.obj.group); existing.obj.dispose?.(); }
          const obj = def.make(data, () => onSpawnRef.current?.('SHELF_ITEM'));
          obj.group.position.set(...def.position);
          obj.group.rotation.y = def.rotationY;
          obj.group.scale.setScalar(0.001);
          island.add(obj.group);
          obj.init?.(t);
          world.items[name] = { obj, born: t, dying: false, def };

          const center = obj.group.position.clone().add(obj.anchor.clone().applyAxisAngle(THREE.Object3D.DEFAULT_UP, def.rotationY));
          burst(center, def.color);
          bulbuli.celebrate(t, obj.group.position);
          onSpawnRef.current?.(def.key);
        } else if (data && existing) {
          existing.obj.update?.(data);
        } else if (!data && existing && !existing.dying) {
          existing.dying = true;
          existing.diedAt = t;
        }
      });
    };

    // Resize
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.position.setLength(w / h < 0.9 ? 26 : 20); // pull back on narrow screens
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    // Loop
    const clock = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      world.time += dt;
      const t = world.time;

      island.position.y = Math.sin(t * 0.6) * 0.18;
      island.rotation.z = Math.sin(t * 0.35) * 0.008;

      // Foundation glow fades in/out and pulses
      const target = world.foundation ? 1 : 0;
      world.foundationLevel += (target - world.foundationLevel) * Math.min(1, dt * 3);
      const pulse = 0.75 + Math.sin(t * 2.4) * 0.25;
      gridMat.opacity = world.foundationLevel * 0.55 * pulse;
      edgeMat.opacity = world.foundationLevel * pulse;
      glowLight.intensity = world.foundationLevel * 3 * pulse;

      // Spawned objects: pop in / shrink out
      Object.entries(world.items).forEach(([name, item]) => {
        const age = t - item.born;
        if (item.dying) {
          const k = clamp01((t - item.diedAt) / SHRINK_TIME);
          item.obj.group.scale.setScalar(Math.max(0.001, 1 - easeIn(k)));
          if (k >= 1) {
            island.remove(item.obj.group);
            disposeObject(item.obj.group);
            item.obj.dispose?.();
            delete world.items[name];
          }
        } else {
          const k = clamp01(age / POP_TIME);
          item.obj.group.scale.setScalar(Math.max(0.001, backOut(k)));
          item.obj.group.position.y = item.def.position[1] + (1 - Math.min(1, k * 1.4)) * 1.2;
        }
        item.obj.tick?.(t, age);
      });

      world.bursts = world.bursts.filter((p) => {
        if (p.userData.tick(dt)) return true;
        scene.remove(p);
        disposeObject(p);
        return false;
      });

      clouds.forEach((c) => {
        c.position.x += c.userData.speed * dt;
        if (c.position.x > 35) c.position.x = -35;
      });
      fireflies.userData.tick(t);
      bulbuli.tick(t);

      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.removeEventListener('start', stopAutoRotate);
      controls.dispose();
      Object.values(world.items).forEach((item) => item.obj.dispose?.());
      disposeObject(scene);
      scene.background?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      worldRef.current = null;
    };
  }, []);

  /* ---------- react to new validation results ---------- */
  useEffect(() => {
    worldRef.current?.sync(stableState);
  }, [stableState]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: 16,
        overflow: 'hidden',
        background: 'linear-gradient(#6ec3ff, #ffe2c4)',
        ...style,
      }}
      role="img"
      aria-label="3D view of Bulbuli's building plot"
    />
  );
}
