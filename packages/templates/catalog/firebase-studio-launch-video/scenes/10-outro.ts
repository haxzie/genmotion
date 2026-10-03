/**
 * 10 — "Own your edge" -> "Start today / fireworks.ai/training" (film frames 980–1079, 24 fps)
 * The Fireworks mark as a giant hairline outline: its V sweeps up through the
 * frame and floods purple for a beat, then the whole mark settles behind the
 * end card. The outline's scale and position are fitted per reference frame
 * (components/outroData.ts).
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { pixelStage, sx, sy, W, H } from "../components/stage";
import { withBrandFonts, FONT_MONO } from "../components/brand";
import { label, type TypeStyle } from "../components/type";
import { inkPlacer } from "../components/place";
import { FLAME_LAYERS, flame } from "../components/firebase";
import { C } from "../components/brand";
import { OUTRO } from "../components/outroData";
import { sampled } from "../components/ease";

const START = 980;
const INK: TypeStyle = { size: 129, weight: 500, tracking: -0.025, color: "#000000", embolden: 0.8 };
const URL_T: TypeStyle = { size: 32.1, weight: 400, tracking: 0, font: FONT_MONO, color: "#3b3b3b" };

/** The mark drawn into a screen-sized canvas each frame would be a per-frame redraw, so instead the
 *  outline is a full-frame shader that tests the mark path rasterised once into a big SDF-free mask. */
const MASK = 4096;
/** The Firebase flame (union of its four official layers) rasterised once, in its 600 x 600 viewBox units. */
function markMask() {
  const c = new OffscreenCanvas(MASK, MASK);
  const g = c.getContext("2d")!;
  const k = MASK / 600; // viewBox units -> mask px
  g.fillStyle = "#000";
  g.fillRect(0, 0, c.width, c.height);
  g.scale(k, k);
  g.fillStyle = "#fff";
  for (const l of FLAME_LAYERS) g.fill(new Path2D(l.d));
  const tex = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return { tex, k, ox: 0, oy: 0, w: c.width, h: c.height };
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withBrandFonts(ctx, () => {
    const { scene } = ctx;
    pixelStage(ctx, "#ffffff");

    const mm = markMask();
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uMask: { value: mm.tex },
        uScale: { value: 30 },
        uOrigin: { value: new THREE.Vector2(0, 0) },
        uLine: { value: new THREE.Vector3(0.925, 0.925, 0.925) },
        uC0: { value: new THREE.Vector3(1, 1, 1) },
        uC1: { value: new THREE.Vector3(1, 1, 1) },
        uC2: { value: new THREE.Vector3(1, 1, 1) },
        uFlash: { value: 0 },
      },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMask;
        uniform float uScale;
        uniform vec2 uOrigin;
        uniform vec3 uLine, uC0, uC1, uC2;
        uniform float uFlash;
        varying vec2 vUv;
        float inside(vec2 p) {
          vec2 m = (p - uOrigin) / uScale; // mark units
          vec2 t = vec2((${mm.ox.toFixed(2)} + m.x * ${mm.k.toFixed(4)}) / ${mm.w.toFixed(1)}, 1.0 - (${mm.oy.toFixed(2)} + m.y * ${mm.k.toFixed(4)}) / ${mm.h.toFixed(1)});
          if (t.x < 0.0 || t.x > 1.0 || t.y < 0.0 || t.y > 1.0) return 0.0;
          return texture2D(uMask, t).r;
        }
        void main() {
          vec2 p = vec2(vUv.x * ${W.toFixed(1)}, (1.0 - vUv.y) * ${H.toFixed(1)});
          float c = inside(p);
          // a 1px hairline where the inside/outside flips within a pixel
          float e = 0.0;
          e = max(e, abs(c - inside(p + vec2(1.0, 0.0))));
          e = max(e, abs(c - inside(p + vec2(0.0, 1.0))));
          e = max(e, abs(c - inside(p - vec2(1.0, 0.0))));
          e = max(e, abs(c - inside(p - vec2(0.0, 1.0))));
          vec3 col = mix(vec3(1.0), uLine, clamp(e, 0.0, 1.0));
          // the purple flash fills the shape with a vertical ramp through three measured colours
          float y = p.y / ${H.toFixed(1)};
          vec3 fill = y < 0.5 ? mix(uC0, uC1, y / 0.5) : mix(uC1, uC2, (y - 0.5) / 0.5);
          col = mix(col, fill, uFlash * c);
          gl_FragColor = vec4(col, 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
    });
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat);
    bg.name = "mark-outline";
    bg.userData.pickable = false;
    bg.renderOrder = -5;
    scene.add(bg);

    // ---- type
    const own = label("Build what’s next", INK, "left");
    own.name = "build-whats-next";
    const start = label("Start today", INK, "left");
    start.name = "start-today";
    const URL = "firebase.google.com";
    const url = label(URL, URL_T, "left");
    url.name = "firebase-google-com";
    for (const m of [own, start, url]) { m.renderOrder = 10; scene.add(m); }
    const pOwn = inkPlacer("Build what’s next", INK), pStart = inkPlacer("Start today", INK), pUrl = inkPlacer(URL, URL_T);
    const ownOldW = inkPlacer("Own your edge", INK).width; // the reference line the tracks were measured on
    const logo = flame(92, "firebase-flame");
    scene.add(logo.group);

    const ownL = sampled([[980, 548], [992, 548], [994, 549], [996, 550], [998, 551], [1000, 552], [1002, 553], [1004, 554], [1006, 556], [1008, 558], [1010, 560], [1012, 563], [1014, 566], [1015, 568]]);
    const ownR = sampled([[980, 1371], [992, 1371], [994, 1370], [996, 1369], [998, 1369], [1000, 1367], [1002, 1366], [1004, 1365], [1006, 1363], [1008, 1361], [1010, 1359], [1012, 1356], [1014, 1353], [1015, 1351]]);
    const ownT = sampled([[980, 502], [982, 494], [984, 488], [986, 485], [988, 483], [990, 482], [996, 482], [998, 483], [1006, 483], [1007, 484], [1012, 484], [1013, 485], [1015, 485]]);
    const stL = sampled([[1016, 614], [1017, 630], [1018, 640], [1019, 647], [1020, 651], [1021, 655], [1022, 657], [1023, 659], [1024, 660], [1026, 662], [1028, 664], [1030, 665], [1037, 669], [1044, 670]]);
    const stR = sampled([[1016, 1299], [1017, 1283], [1018, 1273], [1019, 1267], [1020, 1262], [1021, 1258], [1022, 1256], [1023, 1254], [1024, 1253], [1026, 1251], [1028, 1249], [1030, 1247], [1037, 1244], [1044, 1243], [1051, 1242]]);
    const stT = sampled([[1016, 472], [1017, 475], [1018, 477], [1019, 478], [1020, 478], [1021, 479], [1023, 480], [1029, 481], [1044, 481]]);
    const markY = sampled([[1016, 90], [1017, 83], [1018, 79], [1019, 75], [1020, 73], [1021, 72], [1022, 71], [1023, 70]]);
    const ownW = pOwn.width, stW = pStart.width;
    const v3 = (c: number[]) => new THREE.Vector3(c[0]! / 255, c[1]! / 255, c[2]! / 255);

    return ({ frame: local }) => {
      const F = local + START;
      const row = OUTRO[Math.min(Math.max(F - START, 0), OUTRO.length - 1)]!;
      const [, P, s, cols] = row;
      // the reference's zoom (s) and travel (P) drive a giant Firebase flame outline: its lower-middle
      // point (296.5, 330 in viewBox units) rides the reference V's apex path, at 6% of the zoom
      const k = F < 1016 ? s * 0.034 : s * 0.06;
      mat.uniforms.uScale!.value = k;
      const anchorY = F < 1016 ? P - 500 : P + 360;
      (mat.uniforms.uOrigin!.value as THREE.Vector2).set(960 - 296.5 * k, anchorY - 330 * k);
      // the flash: the reference's measured purple-flash brightness, re-coloured amber -> orange -> red
      const flash = cols && F >= 982 && F <= 989 ? 1 : 0;
      mat.uniforms.uFlash!.value = flash;
      if (cols) {
        const warm = (c: number[], hot: THREE.Vector3) => {
          const light = (c[0]! + c[1]! + c[2]!) / (3 * 255);
          return new THREE.Vector3().lerpVectors(hot, new THREE.Vector3(1, 1, 1), Math.max(0, (light - 0.45) / 0.55));
        };
        mat.uniforms.uC0!.value = warm(cols[0]!, new THREE.Vector3(1, 196 / 255, 0));
        mat.uniforms.uC1!.value = warm(cols[1]!, new THREE.Vector3(1, 145 / 255, 0));
        mat.uniforms.uC2!.value = warm(cols[2]!, new THREE.Vector3(221 / 255, 44 / 255, 0));
      }
      void v3;

      const first = F < 1016;
      own.visible = first;
      start.visible = url.visible = logo.group.visible = !first;
      if (first) {
        const k = (ownR(F) - ownL(F)) / ownOldW;
        own.scale.setScalar(k);
        const cx = (ownR(F) + ownL(F)) / 2;
        own.position.x = sx(cx - (ownW * k) / 2) - (ink0(pOwn) * k);
        own.position.y = sy(ownT(F)) - pOwn.ascent * k + INK.size * 0.04 * k;
      } else {
        const k = (stR(F) - stL(F)) / stW;
        start.scale.setScalar(k);
        start.position.x = sx(stL(F)) - ink0(pStart) * k;
        start.position.y = sy(stT(F)) - pStart.ascent * k + INK.size * 0.04 * k;
        pUrl.at(url, 960 - pUrl.width / 2, 985);
        logo.group.position.set(sx(960), sy(Math.min(markY(F), 90) + 34), 0);
        logo.ignite(Math.min(1, (F - 1016) / 10));
      }
    };
  });
}

/** Ink-left offset of a placer (px right of the label origin). */
function ink0(p: { width: number; at: (m: THREE.Object3D, l: number, t: number) => void }) {
  const o = new THREE.Object3D();
  p.at(o, 0, 0);
  return -(o.position.x - sx(0));
}
