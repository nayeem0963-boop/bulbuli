import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  Gauge, 
  Compass, 
  Mountain, 
  RotateCcw, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  Sun,
  Moon
} from 'lucide-react';

const getTerrainHeight = (x, z) => {
  const scale1 = 0.015;
  const h1 = Math.sin(x * scale1) * Math.cos(z * scale1) * 12;

  const scale2 = 0.04;
  const h2 = Math.sin(x * scale2 + 1.5) * Math.sin(z * scale2 + 2.1) * 4;

  const scale3 = 0.1;
  const h3 = Math.cos(x * scale3) * Math.sin(z * scale3) * 1.2;

  return h1 + h2 + h3;
};

export default function VehicleGame() {
  const containerRef = useRef(null);

  const [speedometer, setSpeedometer] = useState(0);
  const [altitude, setAltitude] = useState(0);
  const [heading, setHeading] = useState(0);
  const [isNight, setIsNight] = useState(false);

  const touchControlsRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false
  });

  const resetTriggerRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- 1. SCENE & RENDERER SETUP ---
    const scene = new THREE.Scene();
    const skyColorDay = new THREE.Color(0xfde68a);
    const skyColorNight = new THREE.Color(0x0f172a);
    const fogColorDay = 0xfef3c7;
    const fogColorNight = 0x0f172a;

    scene.background = isNight ? skyColorNight : skyColorDay;
    scene.fog = new THREE.FogExp2(isNight ? fogColorNight : fogColorDay, 0.012);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // --- RESIZE OBSERVER (FIXES 0px CANVAS ISSUE) ---
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => updateDimensions());
    resizeObserver.observe(containerRef.current);
    updateDimensions();

    // --- 2. LIGHTING SETUP ---
    const ambientLight = new THREE.AmbientLight(0xffedd5, isNight ? 0.2 : 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, isNight ? 0.3 : 1.2);
    sunLight.position.set(120, 180, 80);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 400;
    const shadowDist = 80;
    sunLight.shadow.camera.left = -shadowDist;
    sunLight.shadow.camera.right = shadowDist;
    sunLight.shadow.camera.top = shadowDist;
    sunLight.shadow.camera.bottom = -shadowDist;
    scene.add(sunLight);

    const hemisphereLight = new THREE.HemisphereLight(0xfeb272, 0x334155, 0.4);
    scene.add(hemisphereLight);

    // --- 3. PROCEDURAL TERRAIN CREATION ---
    const terrainSize = 350;
    const segments = 150;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    const colorAttr = new Float32Array(posAttr.count * 3);

    const baseColor = new THREE.Color(0xd97706);
    const peakColor = new THREE.Color(0xfef3c7);
    const valleyColor = new THREE.Color(0xb45309);

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const h = getTerrainHeight(x, z);
      posAttr.setY(i, h);

      const t = (h + 12) / 24;
      const c = new THREE.Color();
      if (t > 0.6) {
        c.lerpColors(baseColor, peakColor, (t - 0.6) * 2.5);
      } else {
        c.lerpColors(valleyColor, baseColor, t * 1.6);
      }
      colorAttr[i * 3] = c.r;
      colorAttr[i * 3 + 1] = c.g;
      colorAttr[i * 3 + 2] = c.b;
    }

    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // Add Low-Poly Trees
    const treeGroup = new THREE.Group();
    const treeGeo = new THREE.ConeGeometry(1.2, 4, 5);
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x92400e, flatShading: true });
    
    for (let i = 0; i < 80; i++) {
      const tx = (Math.random() - 0.5) * 300;
      const tz = (Math.random() - 0.5) * 300;
      if (Math.abs(tx) < 15 && Math.abs(tz) < 15) continue;

      const ty = getTerrainHeight(tx, tz);
      const tree = new THREE.Mesh(treeGeo, treeMat);
      tree.position.set(tx, ty + 2, tz);
      tree.castShadow = true;
      treeGroup.add(tree);
    }
    scene.add(treeGroup);

    // --- 4. VEHICLE ASSEMBLY ---
    const carGroup = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(2.2, 0.8, 4.2);
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: 0xf97316,
      roughness: 0.2,
      metalness: 0.4
    });
    const chassis = new THREE.Mesh(bodyGeo, bodyMat);
    chassis.position.y = 0.7;
    chassis.castShadow = true;
    carGroup.add(chassis);

    const cabinGeo = new THREE.BoxGeometry(1.7, 0.7, 2.2);
    const cabinMat = new THREE.MeshStandardMaterial({ 
      color: 0x1e293b, 
      roughness: 0.1, 
      metalness: 0.9 
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.35, -0.3);
    cabin.castShadow = true;
    carGroup.add(cabin);

    const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 18);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const wheelMeshes = [];

    const wheelOffsets = [
      [-1.15, 0.45,  1.3],
      [ 1.15, 0.45,  1.3],
      [-1.15, 0.45, -1.3],
      [ 1.15, 0.45, -1.3]
    ];

    wheelOffsets.forEach(([wx, wy, wz]) => {
      const wMesh = new THREE.Mesh(wheelGeo, wheelMat);
      wMesh.position.set(wx, wy, wz);
      wMesh.castShadow = true;
      carGroup.add(wMesh);
      wheelMeshes.push(wMesh);
    });

    // Headlights
    const headLightGeo = new THREE.BoxGeometry(0.4, 0.2, 0.1);
    const headLightMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    
    const leftLightMesh = new THREE.Mesh(headLightGeo, headLightMat);
    leftLightMesh.position.set(-0.7, 0.75, 2.11);
    carGroup.add(leftLightMesh);

    const rightLightMesh = new THREE.Mesh(headLightGeo, headLightMat);
    rightLightMesh.position.set(0.7, 0.75, 2.11);
    carGroup.add(rightLightMesh);

    const leftSpot = new THREE.SpotLight(0xfff7ed, 3, 40, Math.PI / 6, 0.4);
    leftSpot.position.set(-0.7, 0.75, 2.1);
    leftSpot.target.position.set(-0.7, 0, 10);
    carGroup.add(leftSpot);
    carGroup.add(leftSpot.target);

    const rightSpot = new THREE.SpotLight(0xfff7ed, 3, 40, Math.PI / 6, 0.4);
    rightSpot.position.set(0.7, 0.75, 2.1);
    rightSpot.target.position.set(0.7, 0, 10);
    carGroup.add(rightSpot);
    carGroup.add(rightSpot.target);

    // Taillights
    const tailLightGeo = new THREE.BoxGeometry(0.4, 0.15, 0.1);
    const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tailMeshL = new THREE.Mesh(tailLightGeo, tailLightMat);
    tailMeshL.position.set(-0.7, 0.75, -2.11);
    carGroup.add(tailMeshL);

    const tailMeshR = new THREE.Mesh(tailLightGeo, tailLightMat);
    tailMeshR.position.set(0.7, 0.75, -2.11);
    carGroup.add(tailMeshR);

    carGroup.position.set(0, getTerrainHeight(0, 0), 0);
    scene.add(carGroup);

    // --- 5. CONTROLS & PHYSICS STATE ---
    const keys = { forward: false, backward: false, left: false, right: false };

    const handleKeyDown = (e) => {
      if (['w', 'W', 'ArrowUp'].includes(e.key)) keys.forward = true;
      if (['s', 'S', 'ArrowDown'].includes(e.key)) keys.backward = true;
      if (['a', 'A', 'ArrowLeft'].includes(e.key)) keys.left = true;
      if (['d', 'D', 'ArrowRight'].includes(e.key)) keys.right = true;
    };

    const handleKeyUp = (e) => {
      if (['w', 'W', 'ArrowUp'].includes(e.key)) keys.forward = false;
      if (['s', 'S', 'ArrowDown'].includes(e.key)) keys.backward = false;
      if (['a', 'A', 'ArrowLeft'].includes(e.key)) keys.left = false;
      if (['d', 'D', 'ArrowRight'].includes(e.key)) keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let currentSpeed = 0;
    let headingAngle = 0;
    const maxForwardSpeed = 0.75;
    const maxReverseSpeed = -0.3;
    const acceleration = 0.018;
    const brakeForce = 0.03;
    const friction = 0.96;
    const turnSensitivity = 0.032;

    const currentRotation = new THREE.Euler();
    const targetQuaternion = new THREE.Quaternion();

    // --- 6. ANIMATION & GAME LOOP ---
    let animationFrameId;

    const gameLoop = () => {
      animationFrameId = requestAnimationFrame(gameLoop);

      if (resetTriggerRef.current) {
        carGroup.position.set(0, getTerrainHeight(0, 0), 0);
        currentSpeed = 0;
        headingAngle = 0;
        resetTriggerRef.current = false;
      }

      const isFwd = keys.forward || touchControlsRef.current.forward;
      const isBwd = keys.backward || touchControlsRef.current.backward;
      const isLft = keys.left || touchControlsRef.current.left;
      const isRgt = keys.right || touchControlsRef.current.right;

      if (isFwd) {
        currentSpeed += acceleration;
      } else if (isBwd) {
        currentSpeed -= brakeForce;
      } else {
        currentSpeed *= friction;
      }

      currentSpeed = Math.max(maxReverseSpeed, Math.min(maxForwardSpeed, currentSpeed));

      if (Math.abs(currentSpeed) > 0.005) {
        const turnDir = currentSpeed > 0 ? 1 : -1;
        if (isLft) headingAngle += turnSensitivity * turnDir;
        if (isRgt) headingAngle -= turnSensitivity * turnDir;
      }

      wheelMeshes.forEach((w) => {
        w.rotation.x += currentSpeed * 1.5;
      });

      const moveX = Math.sin(headingAngle) * currentSpeed;
      const moveZ = Math.cos(headingAngle) * currentSpeed;

      carGroup.position.x += moveX;
      carGroup.position.z += moveZ;

      const maxBound = terrainSize / 2 - 10;
      carGroup.position.x = Math.max(-maxBound, Math.min(maxBound, carGroup.position.x));
      carGroup.position.z = Math.max(-maxBound, Math.min(maxBound, carGroup.position.z));

      const px = carGroup.position.x;
      const pz = carGroup.position.z;
      const groundY = getTerrainHeight(px, pz);

      const frontY = getTerrainHeight(px + Math.sin(headingAngle) * 1.5, pz + Math.cos(headingAngle) * 1.5);
      const backY  = getTerrainHeight(px - Math.sin(headingAngle) * 1.5, pz - Math.cos(headingAngle) * 1.5);
      const rightY = getTerrainHeight(px + Math.cos(headingAngle) * 1.2, pz - Math.sin(headingAngle) * 1.2);
      const leftY  = getTerrainHeight(px - Math.cos(headingAngle) * 1.2, pz + Math.sin(headingAngle) * 1.2);

      const pitch = Math.atan2(frontY - backY, 3.0);
      const roll  = Math.atan2(leftY - rightY, 2.4);

      carGroup.position.y = THREE.MathUtils.lerp(carGroup.position.y, groundY, 0.2);

      currentRotation.set(pitch, headingAngle, roll, 'YXZ');
      targetQuaternion.setFromEuler(currentRotation);
      carGroup.quaternion.slerp(targetQuaternion, 0.25);

      const cameraOffset = new THREE.Vector3(
        px - Math.sin(headingAngle) * 12,
        carGroup.position.y + 5 + Math.max(0, pitch * 2),
        pz - Math.cos(headingAngle) * 12
      );

      camera.position.lerp(cameraOffset, 0.1);
      camera.lookAt(px, carGroup.position.y + 1.2, pz);

      setSpeedometer(Math.round(Math.abs(currentSpeed) * 120));
      setAltitude(Math.round(groundY + 10));
      setHeading(Math.round((((headingAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) * (180 / Math.PI)));

      renderer.render(scene, camera);
    };

    gameLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      resizeObserver.disconnect();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [isNight]);

  const toggleDayNight = () => setIsNight((prev) => !prev);
  const handleResetPosition = () => { resetTriggerRef.current = true; };

  const handleTouchStart = (btn) => { touchControlsRef.current[btn] = true; };
  const handleTouchEnd = (btn) => { touchControlsRef.current[btn] = false; };

  return (
    <div className="relative w-full h-[600px] md:h-[750px] rounded-2xl overflow-hidden bg-slate-900 shadow-2xl border border-amber-500/20 font-sans select-none">
      
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* --- TOP HUD OVERLAY --- */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
        {/* Branding */}
        <div className="flex items-center space-x-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-amber-500/30 text-amber-400">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-bold text-lg text-slate-950 shadow-md">
            B
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-amber-100">Bulbuli Drive</h1>
            <p className="text-[10px] text-amber-400/80 uppercase font-semibold">3D Procedural Terrain</p>
          </div>
        </div>

        {/* Dashboard Gauges */}
        <div className="flex items-center space-x-2 md:space-x-4 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-amber-500/30 text-white">
          <div className="flex items-center space-x-2">
            <Gauge className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-lg font-extrabold text-amber-400">{speedometer}</span>
              <span className="text-[10px] text-slate-400 ml-1">km/h</span>
            </div>
          </div>

          <div className="w-[1px] h-6 bg-slate-700" />

          <div className="flex items-center space-x-2">
            <Mountain className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-lg font-extrabold text-amber-200">{altitude}</span>
              <span className="text-[10px] text-slate-400 ml-1">m</span>
            </div>
          </div>

          <div className="w-[1px] h-6 bg-slate-700" />

          <div className="flex items-center space-x-2">
            <Compass className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-lg font-extrabold text-amber-200">{heading}°</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pointer-events-auto flex items-center space-x-2">
          <button
            onClick={toggleDayNight}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-amber-500/30 text-amber-400 transition-all hover:scale-105 active:scale-95 shadow-lg"
            title="Toggle Environment"
          >
            {isNight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          <button
            onClick={handleResetPosition}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-amber-500/30 text-amber-400 transition-all hover:scale-105 active:scale-95 shadow-lg flex items-center space-x-1"
            title="Reset Vehicle Position"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>
 
     {/* --- DESKTOP CONTROLS OVERLAY --- */}
      <div className="hidden md:flex absolute bottom-6 left-6 pointer-events-none bg-slate-900/80 backdrop-blur-md p-3 rounded-xl border border-amber-500/20 text-slate-300 text-xs flex-col space-y-1 z-10">
        <span className="font-semibold text-amber-400 mb-1">Keyboard Driving Controls:</span>
        <div className="flex items-center space-x-2">
          <span className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-amber-300">W</span>
          <span className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-amber-300">S</span>
          <span>Accelerate / Brake</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-amber-300">A</span>
          <span className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-amber-300">D</span>
          <span>Steer Left / Right</span>
        </div>
      </div>

      {/* --- MOBILE TOUCH CONTROLS --- */}
      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between md:hidden pointer-events-auto z-10">
        <div className="flex space-x-3">
          <button
            onMouseDown={() => handleTouchStart('left')}
            onMouseUp={() => handleTouchEnd('left')}
            onTouchStart={() => handleTouchStart('left')}
            onTouchEnd={() => handleTouchEnd('left')}
            className="w-14 h-14 bg-slate-900/90 active:bg-amber-500/40 border border-amber-500/40 rounded-2xl flex items-center justify-center text-amber-400 shadow-xl backdrop-blur-md"
          >
            <ArrowLeft className="w-7 h-7" />
          </button>
          <button
            onMouseDown={() => handleTouchStart('right')}
            onMouseUp={() => handleTouchEnd('right')}
            onTouchStart={() => handleTouchStart('right')}
            onTouchEnd={() => handleTouchEnd('right')}
            className="w-14 h-14 bg-slate-900/90 active:bg-amber-500/40 border border-amber-500/40 rounded-2xl flex items-center justify-center text-amber-400 shadow-xl backdrop-blur-md"
          >
            <ArrowRight className="w-7 h-7" />
          </button>
        </div>

        <div className="flex space-x-3">
          <button
            onMouseDown={() => handleTouchStart('backward')}
            onMouseUp={() => handleTouchEnd('backward')}
            onTouchStart={() => handleTouchStart('backward')}
            onTouchEnd={() => handleTouchEnd('backward')}
            className="w-14 h-14 bg-slate-900/90 active:bg-red-500/40 border border-red-500/40 rounded-2xl flex items-center justify-center text-red-400 shadow-xl backdrop-blur-md"
          >
            <ArrowDown className="w-7 h-7" />
          </button>
          <button
            onMouseDown={() => handleTouchStart('forward')}
            onMouseUp={() => handleTouchEnd('forward')}
            onTouchStart={() => handleTouchStart('forward')}
            onTouchEnd={() => handleTouchEnd('forward')}
            className="w-14 h-14 bg-slate-900/90 active:bg-amber-500/40 border border-amber-500/40 rounded-2xl flex items-center justify-center text-amber-400 shadow-xl backdrop-blur-md"
          >
            <ArrowUp className="w-7 h-7" />
          </button>
        </div>
      </div>

    </div>
  );
}