import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import { FONT_FAMILY } from "../components/brand";
import { screenLayer, track } from "../components/stage";
import { label, setLabel, haloOf, measure, withFonts } from "../components/type";
import { backdrop, glowDot, flood } from "../components/fx";

/*
 * Finale. A spiralling vortex of dots carries two lines; the second line's last
 * word scrambles into place. The camera dives into the vortex, and on deep blue
 * an orb streaks in on a trail, circling the closing promise, then rushes the
 * lens and floods the frame toward the white end card.
 * Pacing follows the reference beat (global frames 2673-2956); all content ours.
 */
const F0 = 2673;
const DIVE = 2794;

const LINES = [
  { a: "Everything you do,", b: "linked", from: 2678, to: 2738 },
  { a: "Every task,", b: "lighter", from: 2740, to: 2788 },
];

// orb path (layer px) after the dive
const OX = track([[2794, -980], [2806, -520], [2818, 120], [2832, 520], [2850, 560], [2870, 380], [2890, 470], [2912, 260], [2930, -120], [2944, -60], [2956, 0]]);
const OY = track([[2794, -560], [2806, -240], [2818, 40], [2832, 150], [2850, 60], [2870, 190], [2890, -40], [2912, -150], [2930, -260], [2944, -160], [2956, -40]]);
const OS = track([[2794, 2.4], [2810, 1.3], [2830, 0.7], [2920, 0.7], [2940, 1.6], [2956, 9]]);

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: FONT_FAMILY, url: interUrl }], () => {
    const { scene, camera, renderer, width, height } = ctx;
    const layer = screenLayer(scene, camera);

    const bg = backdrop();
    scene.add(bg);

    /* the vortex: rings of dots on a log spiral, each tinted by angle */
    const RINGS = 46;
    const PER = 72;
    const pos: number[] = [];
    const col: number[] = [];
    const size: number[] = [];
    const tint = new THREE.Color();
    for (let r = 0; r < RINGS; r++) {
      const rad = 40 * Math.pow(1.085, r);
      for (let k = 0; k < PER; k++) {
        const a = (k / PER) * Math.PI * 2 + r * 0.11;
        pos.push(Math.cos(a) * rad, Math.sin(a) * rad * 0.9, 0);
        const hue = (a / (Math.PI * 2) + 0.55) % 1;
        tint.setHSL(hue, 0.65, 0.68).lerp(new THREE.Color("#c9d2e6"), 0.45);
        col.push(tint.r, tint.g, tint.b);
        size.push(1.2 + rad * 0.006);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute("aSize", new THREE.Float32BufferAttribute(size, 1));
    const vortexMat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: { uPx: { value: 1 }, uOpacity: { value: 1 }, uScale: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aSize; uniform float uPx; uniform float uScale;
        varying vec3 vColor; varying float vEdge;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float r = length(position.xy);
          vEdge = smoothstep(30.0, 140.0, r) * (1.0 - smoothstep(1500.0, 2400.0, r));
          gl_PointSize = aSize * uScale * uPx * 2.0;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uOpacity; varying vec3 vColor; varying float vEdge;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = (1.0 - smoothstep(0.55, 1.0, d)) * vEdge * uOpacity;
          gl_FragColor = vec4(vColor * a, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const vortex = new THREE.Points(geo, vortexMat);
    vortex.name = "dot-vortex";
    vortex.userData.pickable = false;
    vortex.frustumCulled = false;
    layer.add(vortex);

    /* the two lines over the vortex */
    const lines = LINES.map((ln) => {
      const a = label(ln.a, { size: 74, weight: 450, pad: 40 }, "#f2f4f8");
      const b = label(ln.b, { size: 74, weight: 500, pad: 40 }, "#ffffff");
      const glow = haloOf(b, 30, 0.7);
      a.position.y = 46;
      b.position.y = glow.position.y = -46;
      layer.add(a, glow, b);
      // scramble frames for the punch word: random glyphs settling into the word
      const scr = [...Array(8).keys()].map((i) => {
        const chars = [...ln.b].map((ch, j) => (j < i ? ch : "abcdefghknoprstuvxz"[(j * 7 + i * 5) % 19]!)).join("");
        const l = label(chars, { size: 74, weight: 500, pad: 40 }, "#ffffff");
        l.position.y = -46;
        l.name = `${ln.b}-scramble-${i}`;
        l.userData.pickable = false;
        layer.add(l);
        return l;
      });
      return { ln, a, b, glow, scr };
    });

    /* after the dive: the orb and the closing promise */
    const orb = glowDot(16, 120, "#ffffff", "#7fb0ff");
    orb.material.uniforms.uHalo!.value = 1.1;
    orb.name = "nova-orb";
    layer.add(orb);
    const trail = [...Array(14).keys()].map((i) => {
      const d = glowDot(10 - i * 0.5, 60 - i * 3, "#cfe0ff", "#5b8cff");
      d.name = `orb-trail-${i}`;
      d.userData.pickable = false;
      layer.add(d);
      return d;
    });
    const st = { size: 78, weight: 450, pad: 36 };
    const one = label("One assistant", st, "#f2f4f8");
    const no = label("No busywork", st, "#7fa8ff");
    one.position.y = 48;
    no.position.y = -48;
    layer.add(one, no);
    void measure;

    const wash = flood("#ffffff", "#ffe9a8");
    wash.name = "end-flood";
    wash.material.uniforms.uAspect!.value = width / height;
    scene.add(wash);

    return ({ frame, time }) => {
      const f = frame + F0;
      const before = f < DIVE;
      const bufH = renderer.getDrawingBufferSize(new THREE.Vector2()).y;
      vortexMat.uniforms.uPx!.value = bufH / 1080;

      /* backdrop: near-black for the vortex, deep blue after the dive */
      const blue = interpolate(f, [2786, 2800], [0, 1], Easing.easeInOut);
      bg.grad(new THREE.Color("#06070d").lerp(new THREE.Color("#0b1640"), blue), new THREE.Color("#05060a").lerp(new THREE.Color("#070d2a"), blue), [0, 1]);
      bg.glow(0, { x: 0.5, y: 0.5, rx: 0.5, ry: 0.45, color: "#1b2a6a", amount: 0.5 * blue + 0.15 });

      /* vortex: slow spin, breathing, then a dive into the centre */
      const dive = interpolate(f, [2776, 2800], [0, 1], Easing.easeIn);
      vortex.rotation.z = -time * 0.18 - dive * 1.4;
      vortex.scale.setScalar(1 + Math.sin(time * 0.7) * 0.02 + dive * dive * 5);
      vortexMat.uniforms.uScale!.value = 1 + dive * 4;
      vortexMat.uniforms.uOpacity!.value = interpolate(f, [2673, 2686], [0, 1]) * (1 - interpolate(f, [2792, 2802], [0, 1]));
      vortex.visible = f < 2803;

      lines.forEach(({ ln, a, b, glow, scr }) => {
        const k1 = interpolate(f, [ln.from, ln.from + 12], [0, 1], Easing.easeOut);
        const k2 = interpolate(f, [ln.from + 8, ln.from + 20], [0, 1], Easing.easeOut);
        const out = interpolate(f, [ln.to - 8, ln.to], [0, 1], Easing.easeIn);
        const on = f >= ln.from && f <= ln.to;
        a.visible = b.visible = glow.visible = on;
        setLabel(a, { opacity: k1 * (1 - out), blur: (1 - k1) * 12 + out * 14 });
        // punch word: scrambles for 8 frames, then holds with a colour glow
        const step = Math.floor(interpolate(f, [ln.from + 8, ln.from + 24], [0, 8]));
        scr.forEach((s, i) => {
          s.visible = on && step < 8 && i === step;
          setLabel(s, { opacity: k2 * (1 - out), blur: (1 - k2) * 6 });
        });
        b.visible = on && step >= 8;
        setLabel(b, { opacity: 1 - out, blur: out * 14 });
        const hue = new THREE.Color().setHSL((time * 0.15) % 1, 0.7, 0.62);
        setLabel(glow, { opacity: (step >= 8 ? 0.8 : 0) * (1 - out), color: hue });
        glow.visible = b.visible;
        const s = interpolate(f, [ln.from, ln.to], [0.98, 1.04]);
        a.scale.setScalar(s);
        b.scale.setScalar(s);
        glow.scale.setScalar(s);
      });

      /* orb + trail */
      const after = f >= DIVE;
      orb.visible = after;
      const ox = OX(f);
      const oy = OY(f);
      const os = OS(f);
      orb.position.set(ox, oy, 1);
      orb.scale.setScalar(os);
      orb.material.uniforms.uOpacity!.value = interpolate(f, [DIVE, DIVE + 4], [0, 1]);
      trail.forEach((d, i) => {
        const lag = (i + 1) * 1.4;
        d.visible = after && f - lag >= DIVE;
        d.position.set(OX(f - lag), OY(f - lag), 0);
        d.scale.setScalar(OS(f - lag) * 0.9);
        d.material.uniforms.uOpacity!.value = (1 - i / trail.length) * 0.55 * interpolate(f, [2940, 2952], [1, 0]);
      });

      const kOne = interpolate(f, [2828, 2842], [0, 1], Easing.easeOut);
      const kNo = interpolate(f, [2872, 2886], [0, 1], Easing.easeOut);
      const outT = interpolate(f, [2926, 2938], [0, 1], Easing.easeIn);
      one.visible = no.visible = after;
      setLabel(one, { opacity: kOne * (1 - outT), blur: (1 - kOne) * 12 + outT * 16 });
      setLabel(no, { opacity: kNo * (1 - outT), blur: (1 - kNo) * 12 + outT * 16 });
      // the first line rises to make room for the second
      one.position.y = THREE.MathUtils.lerp(0, 48, interpolate(f, [2868, 2882], [0, 1], Easing.easeInOut));

      /* the orb rushes the lens and floods to warm white */
      const w = interpolate(f, [2938, 2956], [0, 1], Easing.easeIn);
      wash.visible = f >= 2938;
      wash.set({ x: 0.5 + ox / (1080 * (width / height)), y: 0.5 - oy / 1080, radius: 0.1 + w * 2.4, soft: 0.5, core: 0, amount: Math.min(1, w * 1.6) });
    };
  });
}
