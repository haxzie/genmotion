import * as THREE from "three";
import { Easing, interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { beatPos, beatPulse, eighthPulse, rng, SCENE_START } from "../components/music";
import { createWorld } from "../components/world";
import { createLyrics } from "../components/lyrics";
import { createPdoomMeter } from "../components/hud";
import { burst, impactFrame, kick, rings3, stars, trail, V, warp, type Ring3 } from "../components/motion";

/**
 * 0:38–0:55 · a calm spacetime grid ("stable training run") collapses into a
 * gravity well; the camera's orbit accelerates; atoms rearrange; everything falls in.
 */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const w = createWorld(ctx, SCENE_START.singularity, { bg: "#05030f", fog: [60, 260] });
  const { root, put } = w;
  const S = SCENE_START.singularity / 30;
  const END = SCENE_START.sydney / 30;
  const SING = 42.5;
  const OPT = 45.08;
  const ATOMS = 49.62;
  const FALL = 53.04;
  const HOLE = V(0, -6, 0);

  const sky = stars(2200, V(700, 300, 700), 17, 0.8, ["#ffffff", C.cyan, "#ffd6f0", C.violet]);
  sky.points.position.y = 60;
  put(root, sky.points, 0);

  /* ---------- the fabric of spacetime ---------- */
  const fabricGeo = new THREE.PlaneGeometry(260, 260, 200, 200);
  fabricGeo.rotateX(-Math.PI / 2);
  const fabricMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    extensions: {} as never,
    uniforms: {
      uTime: { value: 0 },
      uWell: { value: 0 },
      uRipple: { value: 0.3 },
      uPulse: { value: 0 },
      uA: { value: new THREE.Color(C.violet) },
      uB: { value: new THREE.Color(C.cyan) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime, uWell, uRipple;
      varying vec2 vXZ; varying float vDepth; varying float vFog;
      void main() {
        vec3 p = position;
        float r = length(p.xz);
        float well = -uWell * 30.0 / (1.0 + r * r * 0.012);
        float rip = sin(r * 0.35 - uTime * 3.0) * uRipple * exp(-r * 0.015);
        p.y = well + rip;
        vXZ = p.xz;
        vDepth = -well / 30.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vFog = smoothstep(240.0, 90.0, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uPulse; uniform vec3 uA, uB;
      varying vec2 vXZ; varying float vDepth; varying float vFog;
      void main() {
        vec2 g = abs(fract(vXZ / 4.0 - 0.5) - 0.5) / fwidth(vXZ / 4.0);
        float line = 1.0 - min(min(g.x, g.y), 1.0);
        vec3 col = mix(uA, uB, clamp(vDepth * 1.6, 0.0, 1.0));
        col = mix(col, vec3(1.0), clamp(vDepth - 0.6, 0.0, 1.0));
        float a = line * (0.55 + uPulse * 0.45) * vFog + 0.05 * vFog;
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }`,
  });
  const fabric = new THREE.Mesh(fabricGeo, fabricMat);
  fabric.name = "spacetime-fabric";
  fabric.userData.pickable = false;
  fabric.frustumCulled = false;
  put(root, fabric, 1);
  const wellY = (r: number, amt: number) => (-amt * 30) / (1 + r * r * 0.012);

  // the stable run: a perfectly flat line of light across the fabric
  const flatPts = Array.from({ length: 40 }, (_, i) => V(-90 + i * 4.6, 0.4, 12));
  const stable = trail(flatPts, 0.18, C.cyan, "stable-loss-line", 300);
  put(root, stable.mesh, 2);
  const stableHead = w.glow(C.cyan, 5, "stable-loss-head");
  put(root, stableHead, 3);

  /* ---------- the black hole ---------- */
  const hole = new THREE.Group();
  hole.name = "singularity";
  hole.position.copy(HOLE);
  put(root, hole, 4);
  const horizon = new THREE.Mesh(new THREE.SphereGeometry(3.2, 48, 32), new THREE.MeshBasicMaterial({ color: "#000000" }));
  horizon.name = "event-horizon";
  hole.add(horizon);
  const photon = new THREE.Mesh(
    new THREE.TorusGeometry(3.45, 0.09, 12, 160),
    new THREE.MeshBasicMaterial({ color: "#fff2fb", transparent: true, blending: THREE.AdditiveBlending }),
  );
  photon.name = "photon-ring";
  hole.add(photon);
  const holeGlow = w.glow("#ff5aa9", 30, "singularity-glow");
  hole.add(holeGlow);
  const DISK = 9000;
  const dr = rng(4);
  const dPos = new Float32Array(DISK * 3);
  const dAttr = new Float32Array(DISK * 3);
  for (let i = 0; i < DISK; i++) {
    const rad = 4.2 + Math.pow(dr(), 1.8) * 16;
    dAttr.set([rad, dr() * Math.PI * 2, dr()], i * 3);
  }
  const diskGeo = new THREE.BufferGeometry();
  diskGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
  diskGeo.setAttribute("aDisk", new THREE.BufferAttribute(dAttr, 3));
  const diskMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uPhase: { value: 0 }, uAmt: { value: 0 }, uSize: { value: 0.35 }, uPulse: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute vec3 aDisk;
      uniform float uPhase, uAmt, uSize, uPulse;
      varying vec3 vCol; varying float vA;
      void main() {
        float r = aDisk.x;
        float a = aDisk.y + uPhase * 14.0 / pow(r, 1.5);
        vec3 p = vec3(cos(a) * r, (aDisk.z - 0.5) * 0.5 * (r * 0.08), sin(a) * r);
        float k = clamp((r - 4.2) / 16.0, 0.0, 1.0);
        vCol = mix(vec3(1.0, 0.95, 1.0), mix(vec3(0.24, 0.95, 1.0), vec3(1.0, 0.24, 0.6), k), smoothstep(0.0, 0.25, k));
        vA = uAmt * (1.0 - k * 0.6);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(uSize * (0.6 + aDisk.z) * (1.0 + uPulse) * 1158.0 / max(-mv.z, 0.1), 0.0, 40.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vCol; varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vCol, vA * smoothstep(0.5, 0.0, d));
        #include <colorspace_fragment>
      }`,
  });
  const disk = new THREE.Points(diskGeo, diskMat);
  disk.name = "accretion-disk";
  disk.frustumCulled = false;
  disk.rotation.set(0.28, 0, 0.12);
  hole.add(disk);
  const singRings = rings3(4, "#ffffff", 0.05, "singularity-shockwave");
  put(root, singRings.group, 6);
  const RINGS: Ring3[] = [
    { t: SING, pos: V(0, 0.3, 0), scale: 90, dur: 1.2, flat: true },
    { t: SING + 0.12, pos: V(0, 0.3, 0), scale: 60, dur: 1.0, flat: true },
    { t: 44.16, pos: V(0, 0.3, 0), scale: 70, dur: 1.0, flat: true },
  ];
  const singBurst = burst(400, 5, ["#ffffff", C.pink, C.cyan], 0.5, 40, 1.3, "singularity-burst");
  singBurst.points.position.copy(HOLE);
  put(root, singBurst.points, 7);

  // optimizers: glowing balls spiralling down the well (gradient descent, literally)
  const ORBS = 14;
  const orbs = Array.from({ length: ORBS }, (_, i) => {
    const s = w.glow(i % 2 ? C.cyan : C.pink, 2.6, `optimizer-${i}`);
    put(root, s, 5);
    return { s, a0: (i / ORBS) * Math.PI * 2, r0: 26 + (i % 4) * 8, d: (i % 5) * 0.35 };
  });

  /* ---------- atoms rearranging: one particle cloud, four shapes ---------- */
  const AT = 6000;
  const ar = rng(6);
  const shapes = [new Float32Array(AT * 3), new Float32Array(AT * 3), new Float32Array(AT * 3), new Float32Array(AT * 3)];
  const v = V();
  const knotPt = (u: number, out: THREE.Vector3) => {
    const p = 2;
    const q = 3;
    const phi = u * Math.PI * 2 * 1;
    const r = 2 + Math.cos((q * phi) / 1);
    return out.set(r * Math.cos(p * phi) * 1.4, Math.sin(q * phi) * 1.4, r * Math.sin(p * phi) * 1.4);
  };
  for (let i = 0; i < AT; i++) {
    v.set(ar() * 2 - 1, ar() * 2 - 1, ar() * 2 - 1).normalize().multiplyScalar(4.5);
    shapes[0].set([v.x, v.y, v.z], i * 3);
    const f = Math.floor(ar() * 6);
    const a = ar() * 2 - 1;
    const b = ar() * 2 - 1;
    const c = f % 2 ? 1 : -1;
    const cube = f < 2 ? [c, a, b] : f < 4 ? [a, c, b] : [a, b, c];
    shapes[1].set(cube.map((x) => x * 3.6), i * 3);
    knotPt(ar(), v);
    v.x += (ar() - 0.5) * 0.9;
    v.y += (ar() - 0.5) * 0.9;
    v.z += (ar() - 0.5) * 0.9;
    shapes[2].set([v.x, v.y, v.z], i * 3);
    const hu = ar();
    const strand = i % 3;
    const ha = hu * Math.PI * 6 + (strand === 1 ? Math.PI : 0);
    if (strand < 2) shapes[3].set([Math.cos(ha) * 2.2, (hu - 0.5) * 11, Math.sin(ha) * 2.2], i * 3);
    else {
      const k = ar() * 2 - 1;
      const hb = Math.floor(hu * 30) / 30;
      const aa = hb * Math.PI * 6;
      shapes[3].set([Math.cos(aa) * 2.2 * k, (hb - 0.5) * 11, Math.sin(aa) * 2.2 * k], i * 3);
    }
  }
  const atomGeo = new THREE.BufferGeometry();
  atomGeo.setAttribute("position", new THREE.BufferAttribute(shapes[0].slice(), 3));
  shapes.forEach((s, i) => atomGeo.setAttribute(`aS${i}`, new THREE.BufferAttribute(s, 3)));
  const seeds = new Float32Array(AT);
  for (let i = 0; i < AT; i++) seeds[i] = ar();
  atomGeo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  const atomMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uW: { value: new THREE.Vector4(1, 0, 0, 0) },
      uSuck: { value: 0 },
      uHole: { value: new THREE.Vector3() },
      uTime: { value: 0 },
      uAmt: { value: 0 },
      uPulse: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aS0, aS1, aS2, aS3; attribute float aSeed;
      uniform vec4 uW; uniform float uSuck, uTime, uAmt, uPulse; uniform vec3 uHole;
      varying float vA; varying vec3 vCol;
      void main() {
        vec3 p = aS0 * uW.x + aS1 * uW.y + aS2 * uW.z + aS3 * uW.w;
        // mid-morph, atoms swirl out of formation
        float mid = 1.0 - max(max(uW.x, uW.y), max(uW.z, uW.w));
        p += vec3(sin(aSeed * 40.0 + uTime * 3.0), cos(aSeed * 31.0 + uTime * 2.0), sin(aSeed * 17.0 - uTime * 2.5)) * mid * 3.0;
        // spaghettification: each atom falls in on its own schedule
        float s = clamp(uSuck * 1.6 - aSeed * 0.6, 0.0, 1.0);
        vec3 wp = (modelMatrix * vec4(p, 1.0)).xyz;
        wp = mix(wp, uHole, s * s);
        vA = uAmt * (1.0 - s);
        vCol = mix(vec3(0.24, 0.95, 1.0), vec3(1.0, 0.36, 0.7), aSeed);
        vec4 mv = viewMatrix * vec4(wp, 1.0);
        gl_PointSize = clamp((0.18 + uPulse * 0.12) * 1158.0 / max(-mv.z, 0.1), 0.0, 24.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA; varying vec3 vCol;
      void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vCol, vA * smoothstep(0.5, 0.1, d));
        #include <colorspace_fragment>
      }`,
  });
  const atoms = new THREE.Points(atomGeo, atomMat);
  atoms.name = "rearranging-atoms";
  atoms.frustumCulled = false;
  atoms.position.set(0, 14, 0);
  atomMat.uniforms.uHole.value.copy(HOLE);
  put(root, atoms, 8);

  const streaks = warp(600, 3, "#ffffff");
  w.cam.add(streaks.lines);
  const lyrics = createLyrics(w, S, END, "sub");
  const meter = createPdoomMeter(w);
  w.seal();

  const camPos = V();
  const look = V();
  const tmp = V();
  // atoms morph on every beat from "atoms", faster on "rearranging"
  const morphAt = (t: number) => {
    if (t < 50.36) return 0;
    const b = beatPos(t) - beatPos(50.36);
    const rate = t < 51.46 ? 1 : 2;
    const base = t < 51.46 ? b : beatPos(51.46) - beatPos(50.36) + (beatPos(t) - beatPos(51.46)) * rate;
    const step = Math.floor(base);
    const f = Easing.easeInOut(Math.min(1, (base - step) * 2.2));
    return step + f;
  };

  return ({ frame }) => {
    const t = w.T(frame);
    const bp = beatPulse(t, 6);
    const ep = eighthPulse(t, 8);
    const bpos = beatPos(t);
    sky.update(t, 1, bp * 0.3);

    // gravity switches on at "singularity's", deepens on "begun"
    const well = interpolate(t, [SING - 0.05, SING + 0.5], [0, 0.75], Easing.easeOut) + interpolate(t, [44.16, 44.6], [0, 0.25], Easing.easeOut) + interpolate(t, [FALL, END], [0, 0.5], Easing.easeIn);
    fabricMat.uniforms.uTime.value = t;
    fabricMat.uniforms.uWell.value = well;
    fabricMat.uniforms.uRipple.value = 0.25 + kick(t, [SING, 44.16], 1.5) * 3 + bp * 0.2;
    fabricMat.uniforms.uPulse.value = bp;

    // the stable run draws calmly, then snaps when the well opens
    stable.setProgress(interpolate(t, [39.32, 41.4], [0, 1], Easing.easeInOut));
    stable.mat.opacity = 1 - interpolate(t, [SING, SING + 0.2], [0, 1]);
    stable.mesh.visible = stableHead.visible = t > 39.2 && t < SING + 0.2;
    stableHead.position.copy(stable.head(interpolate(t, [39.32, 41.4], [0, 1], Easing.easeInOut)));

    // hole + disk; the spin phase is a closed-form integral of an accelerating speed
    const born = interpolate(t, [SING - 0.05, SING + 0.35], [0, 1], Easing.easeOut);
    hole.visible = born > 0.001;
    hole.scale.setScalar(born * (1 + bp * 0.04));
    const acc = Math.max(0, t - OPT);
    const AO = ATOMS - OPT;
    const phase = (t - SING) * 0.6 + 0.35 * (Math.pow(Math.min(acc, AO), 3) / 3 + AO * AO * Math.max(0, t - ATOMS));
    diskMat.uniforms.uPhase.value = phase;
    diskMat.uniforms.uAmt.value = born;
    diskMat.uniforms.uPulse.value = bp * 0.5 + ep * 0.2 * Math.min(1, acc / 2);
    photon.material.opacity = 0.7 + bp * 0.3;
    photon.rotation.set(Math.PI / 2 + 0.28, 0, 0);
    holeGlow.material.opacity = born * (0.5 + bp * 0.3);
    singRings.update(t, RINGS);
    singBurst.fire(t, [SING]);

    // gradient-descent orbs spiral in during "optimizing, accelerating"
    orbs.forEach((o) => {
      const u = THREE.MathUtils.clamp((t - OPT - o.d) / 4.2, 0, 1);
      o.s.visible = u > 0 && u < 1;
      const r = o.r0 * Math.pow(1 - u, 1.4) + 3.3;
      const a = o.a0 + 20 / Math.sqrt(r) * u * 4;
      o.s.position.set(Math.cos(a) * r, wellY(r, well) + 0.8, Math.sin(a) * r);
      o.s.material.opacity = Math.min(1, u * 8) * (1 - u * u);
    });

    // atoms
    const m = morphAt(t);
    const i0 = Math.floor(m) % 4;
    const f = m - Math.floor(m);
    const wv = atomMat.uniforms.uW.value as THREE.Vector4;
    wv.set(0, 0, 0, 0);
    wv.setComponent(i0, 1 - f);
    wv.setComponent((i0 + 1) % 4, wv.getComponent((i0 + 1) % 4) + f);
    const suck = interpolate(t, [FALL, END - 0.2], [0, 1], Easing.easeIn);
    atomMat.uniforms.uSuck.value = suck;
    atomMat.uniforms.uTime.value = t;
    atomMat.uniforms.uAmt.value = interpolate(t, [ATOMS - 0.2, ATOMS + 0.4], [0, 1]);
    atomMat.uniforms.uPulse.value = bp;
    atoms.visible = t > ATOMS - 0.2;
    atoms.rotation.set(t * 0.3, t * 0.5, 0);
    atoms.scale.setScalar(1 + bp * 0.08);

    // camera
    const k = t - S;
    const glide = V(-60 + k * 5, 5 + Math.sin(k * 0.8) * 0.6, 34);
    const glideLook = V(glide.x + 16, 0, 6);
    const orbitOn = interpolate(t, [SING - 0.1, SING + 0.8], [0, 1], Easing.easeInOut);
    const oa = -0.9 + (t - SING) * 0.25 + 0.15 * Math.pow(Math.min(acc, AO), 3) / 3 + Math.max(0, t - ATOMS) * 0.6;
    const orad = THREE.MathUtils.lerp(46, 26, interpolate(t, [OPT, ATOMS], [0, 1], Easing.easeInOut));
    const oy = THREE.MathUtils.lerp(16, 8, interpolate(t, [OPT, ATOMS], [0, 1])) + interpolate(t, [ATOMS, ATOMS + 1], [0, 8], Easing.easeInOut);
    tmp.set(Math.sin(oa) * orad, oy, Math.cos(oa) * orad);
    camPos.lerpVectors(glide, tmp, orbitOn);
    const atomLook = interpolate(t, [ATOMS - 0.2, ATOMS + 0.8], [0, 1], Easing.easeInOut) * (1 - interpolate(t, [FALL, FALL + 0.8], [0, 1], Easing.easeInOut));
    look.lerpVectors(glideLook, HOLE, orbitOn).lerp(atoms.position, atomLook);
    const dive = interpolate(t, [FALL + 0.6, END], [0, 1], Easing.easeIn);
    camPos.lerp(tmp.set(0, 6, 0.01), dive * 0.8);
    const speed = Math.min(1, (acc * acc) / 12) * (t < ATOMS ? 1 : Math.max(0, 1 - (t - ATOMS) / 1.2));
    const fov = 50 + speed * 30 - kick(t, [SING], 4) * 10 + dive * 30;
    const roll = Math.sin(t * 0.4) * 0.05 + speed * 0.25 + dive * 0.6;
    const shake = kick(t, [SING], 3) * 1.2 + speed * 0.25 + kick(t, [44.16], 5) * 0.5 + dive * 0.6 + bp * 0.04;
    streaks.update(t, Math.max(speed * 0.9, dive), 80 + speed * 180);
    w.shot(t, camPos, look, { fov, roll, shake });

    w.post({
      fade: interpolate(t, [S, S + 0.5], [1, 0]),
      flash: kick(t, [SING], 5) * 0.8 + kick(t, [44.16, 50.36, 51.46], 10) * 0.3 + interpolate(t, [END - 0.25, END], [0, 1], Easing.easeIn),
      invert: impactFrame(t, [SING], 2),
    });
    meter.update(t, 1);
    lyrics.update(t);
  };
}
