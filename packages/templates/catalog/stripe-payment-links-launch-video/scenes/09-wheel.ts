/**
 * 09 · The wheel: Products → Recurring → Donations — global frames 534–666 (Stripe remix, light mode)
 *
 * A chrome ∞ on a dark disc, ringed by three glassy segments, each holding a
 * glow of its own colour (blue left, yellow-green top right, magenta bottom right).
 * It falls in from the top spinning (scene 08 whipped down), settles, then each
 * product gets a beat: its segment lights, a tinted slab that wraps the ring slides
 * in from its side, and the name + one line land on the slab. At the end the wheel
 * spins away into the coin column of scene 10.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { withFonts } from "../components/fonts";
import { makeText, type TextObj } from "../components/type";
import { orthoStage, seg, easeOutCubic, easeInOutCubic, easeInCubic, mulberry32 } from "../components/stage";
import { backdrop } from "../components/fx";
import { studioEnvLight, linkGeometry } from "../components/linkmark";
import { C } from "../components/brand";
import { lightGround, softShadow } from "../components/ui";

const G0 = 534;
const R_IN = 205, R_OUT = 368, GAP = 17;
const DEG = Math.PI / 180;
const C = { x: 960, y: 528 }; // wheel centre in canvas px (y down)

/** Annular sector between two gap lines at angles g0 → g1 (canvas angles, clockwise). */
function sectorPath(g: OffscreenCanvasRenderingContext2D, cx: number, cy: number, g0: number, g1: number) {
  const ai = Math.asin(GAP / R_IN), ao = Math.asin(GAP / R_OUT);
  g.beginPath();
  g.arc(cx, cy, R_OUT, g0 + ao, g1 - ao, false);
  g.arc(cx, cy, R_IN, g1 - ai, g0 + ai, true);
  g.closePath();
}

type Seg = { name: string; g0: number; g1: number; colors: string[]; rim: string };
// gaps at 0°, 120°, 240° in maths terms → canvas angles 0, -120, -240 (clockwise = y down)
const SEGS: Seg[] = [
  { name: "segment-products", g0: -240 * DEG, g1: -120 * DEG, colors: ["#635BFF", "#00D4FF", "#8C86FF"], rim: "#635BFF" }, // left
  { name: "segment-donations", g0: -120 * DEG, g1: 0, colors: ["#FF5996", "#A960EE", "#FF7AB0"], rim: "#FF5996" }, // top right
  { name: "segment-recurring", g0: 0, g1: 120 * DEG, colors: ["#A960EE", "#635BFF", "#C77DFF"], rim: "#A960EE" }, // bottom right
];

function segmentTexture(s: Seg, lit: boolean) {
  const S = 820;
  const cx = S / 2, cy = S / 2;
  const c = new OffscreenCanvas(S, S);
  const g = c.getContext("2d")!;
  const rnd = mulberry32(s.name.length * 17 + (lit ? 1 : 0));
  // outer coloured halo
  g.save();
  g.filter = "blur(16px)";
  g.globalAlpha = lit ? 0.55 : 0.25;
  sectorPath(g, cx, cy, s.g0, s.g1);
  g.strokeStyle = s.rim;
  g.lineWidth = 10;
  g.stroke();
  g.restore();
  // body
  g.save();
  sectorPath(g, cx, cy, s.g0, s.g1);
  g.clip();
  g.fillStyle = "#EEF0FF";
  g.fillRect(0, 0, S, S);
  // glows inside, hugging the outer edge
  g.filter = "blur(38px)";
  for (let i = 0; i < 12; i++) {
    const t = 0.1 + rnd() * 0.8;
    const a = s.g0 + (s.g1 - s.g0) * t;
    const r = R_OUT - 30 - rnd() * 90;
    g.globalAlpha = (lit ? 0.95 : 0.3) * (0.5 + rnd() * 0.5);
    g.fillStyle = s.colors[i % s.colors.length];
    g.beginPath();
    g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 34 + rnd() * 40, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  // edge
  sectorPath(g, cx, cy, s.g0, s.g1);
  g.strokeStyle = lit ? s.rim : "#D6D9F5";
  g.lineWidth = lit ? 3 : 2;
  g.stroke();
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Full-frame slab, path given in 1920×1080 canvas px. */
function slab(name: string, path: (g: OffscreenCanvasRenderingContext2D) => void, fill: (g: OffscreenCanvasRenderingContext2D) => CanvasGradient, edge: string, glow?: [number, number, number, string]) {
  return backdrop(1920, 1080, (g) => {
    path(g);
    g.fillStyle = fill(g);
    g.fill();
    g.save();
    path(g);
    g.clip();
    g.globalCompositeOperation = "destination-out";
    const fadeTop = g.createLinearGradient(0, 0, 0, 1080);
    fadeTop.addColorStop(0, "rgba(0,0,0,0.55)");
    fadeTop.addColorStop(0.35, "rgba(0,0,0,0)");
    fadeTop.addColorStop(0.65, "rgba(0,0,0,0)");
    fadeTop.addColorStop(1, "rgba(0,0,0,0.55)");
    g.fillStyle = fadeTop;
    g.fillRect(0, 0, 1920, 1080);
    g.restore();
    if (glow) {
      g.save();
      path(g);
      g.clip();
      const r = g.createRadialGradient(glow[0], glow[1], 0, glow[0], glow[1], glow[2]);
      r.addColorStop(0, glow[3]);
      r.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, 1920, 1080);
      g.restore();
    }
    g.save();
    g.filter = "blur(2px)";
    path(g);
    g.strokeStyle = edge;
    g.lineWidth = 2;
    g.globalAlpha = 0.7;
    g.stroke();
    g.restore();
  }, name, 0.5);
}

const ARC_R = 412;
const P = (a: number): [number, number] => [C.x + Math.cos(a * DEG) * ARC_R, C.y + Math.sin(a * DEG) * ARC_R];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene, renderer } = ctx;
    scene.background = new THREE.Color(C.page);
    orthoStage(ctx);
    const env = studioEnvLight(renderer as THREE.WebGLRenderer);
    scene.add(lightGround("page-ground"));

    // ---------------------------------------------------------------- slabs
    const dashSlab = slab("slab-products", (g) => {
      g.beginPath();
      g.moveTo(0, 0); g.lineTo(592, 0);
      const s = P(-125);
      g.lineTo(s[0] - 6, s[1] - 18);
      g.arc(C.x, C.y, ARC_R, -125 * DEG, 125 * DEG, true);
      g.lineTo(620, 1080); g.lineTo(0, 1080); g.closePath();
    }, (g) => {
      const gr = g.createLinearGradient(0, 0, 760, 0);
      gr.addColorStop(0, "#3F37D6"); gr.addColorStop(0.5, "#4B44E0"); gr.addColorStop(0.85, "#635BFF"); gr.addColorStop(1, "#8C86FF");
      return gr;
    }, "rgba(170,165,255,0.9)", [640, 540, 420, "rgba(70,60,230,0.28)"]);

    const apiSlab = slab("slab-recurring", (g) => {
      g.beginPath();
      g.moveTo(1920, 562); g.lineTo(1420, 562);
      g.quadraticCurveTo(1385, 562, P(7)[0], P(7)[1]);
      g.arc(C.x, C.y, ARC_R, 7 * DEG, 103 * DEG, false);
      g.quadraticCurveTo(780, 950, 755, 975);
      g.lineTo(700, 1080); g.lineTo(1920, 1080); g.closePath();
    }, (g) => {
      const gr = g.createLinearGradient(760, 1080, 1920, 560);
      gr.addColorStop(0, "#C77DFF"); gr.addColorStop(0.35, "#9B4FE0"); gr.addColorStop(0.75, "#7A3BD6"); gr.addColorStop(1, "#6A2FC9");
      return gr;
    }, "rgba(255,150,220,0.9)");

    const sdkSlab = slab("slab-donations", (g) => {
      g.beginPath();
      g.moveTo(1920, 465); g.lineTo(1420, 465);
      g.quadraticCurveTo(1385, 465, P(-7)[0], P(-7)[1]);
      g.arc(C.x, C.y, ARC_R, -7 * DEG, -100 * DEG, true);
      g.quadraticCurveTo(800, 118, 765, 95);
      g.lineTo(712, 0); g.lineTo(1920, 0); g.closePath();
    }, (g) => {
      const gr = g.createLinearGradient(900, 460, 1920, 0);
      gr.addColorStop(0, "#FF5996"); gr.addColorStop(0.5, "#C451C9"); gr.addColorStop(1, "#7A3BD6");
      return gr;
    }, "rgba(200,160,255,0.85)");
    for (const s of [dashSlab, apiSlab, sdkSlab]) scene.add(s);

    // ---------------------------------------------------------------- wheel
    const wheel = new THREE.Group();
    wheel.name = "wheel";
    wheel.position.set(C.x - 960, 540 - C.y, 0);
    scene.add(wheel);
    const segGeo = new THREE.PlaneGeometry(820, 820);
    const segs = SEGS.map((s) => {
      const grp = new THREE.Group();
      grp.name = s.name;
      const mk = (lit: boolean) => {
        const m = new THREE.Mesh(segGeo, new THREE.MeshBasicMaterial({ map: segmentTexture(s, lit), transparent: true, depthWrite: false, toneMapped: false }));
        m.name = `${s.name}-${lit ? "lit" : "dim"}`;
        grp.add(m);
        return m;
      };
      const dim = mk(false);
      const lit = mk(true);
      wheel.add(grp);
      return { grp, dim, lit };
    });
    const hub = backdrop(300, 300, (g, w, h) => {
      const r = g.createRadialGradient(w * 0.45, h * 0.4, 0, w / 2, h / 2, 130);
      r.addColorStop(0, "#FFFFFF"); r.addColorStop(0.7, "#F2F4F8"); r.addColorStop(1, "#E3E8EE");
      g.fillStyle = r;
      g.beginPath(); g.arc(w / 2, h / 2, 128, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(255,255,255,0.12)";
      g.lineWidth = 2;
      g.stroke();
    }, "wheel-hub", 1);
    const wheelShadow = softShadow(R_OUT * 2, R_OUT * 2, R_OUT, 0.1, 40, "wheel-shadow");
    wheelShadow.position.set(0, -22, -2);
    wheel.add(wheelShadow);
    hub.position.z = 2;
    wheel.add(hub);
    const markGeo = linkGeometry();
    markGeo.computeBoundingBox();
    const bw = markGeo.boundingBox!.max.x - markGeo.boundingBox!.min.x;
    const chrome = new THREE.MeshPhysicalMaterial({ color: "#5148F0", metalness: 0.15, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05, envMap: env, envMapIntensity: 0.7 });
    const mark = new THREE.Mesh(markGeo, chrome);
    mark.name = "link-mark";
    mark.scale.setScalar(150 / bw);
    mark.position.z = 60;
    wheel.add(mark);
    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(-200, 400, 800);
    scene.add(key, new THREE.AmbientLight(0xffffff, 0.6));

    // ---------------------------------------------------------------- copy
    const head = (t: string, align: "left" | "right") => makeText(t, { size: 104, weight: 600, tracking: -0.01, color: "#ffffff", anchor: align, blur: 12 }, t.toLowerCase());
    const sub = (t: string, align: "left" | "right", col: string, name: string) => makeText(t, { size: 48, weight: 400, tracking: -0.01, color: col, anchor: align, blur: 10 }, name);
    const copy = (x: number, ys: number[], align: "left" | "right", parts: TextObj[]) => {
      const g = new THREE.Group();
      parts.forEach((p, i) => { p.group.position.set(x, ys[i], 5); g.add(p.group); });
      scene.add(g);
      return { g, parts };
    };
    const dashCopy = copy(96 - 960, [55, -36, -92], "left", [head("Products", "left"), sub("Sell anything,", "left", "#EEEDFF", "products-line-1"), sub("one link each", "left", "#EEEDFF", "products-line-2")]);
    const apiCopy = copy(1748 - 960, [-270, -357, -417], "right", [head("Recurring", "right"), sub("Subscriptions,", "right", "#F4ECFF", "recurring-line-1"), sub("billed for you", "right", "#F4ECFF", "recurring-line-2")]);
    const sdkCopy = copy(1755 - 960, [390, 297, 240], "right", [head("Donations", "right"), sub("Let supporters", "right", "#FFF0F5", "donations-line-1"), sub("pick the amount", "right", "#FFF0F5", "donations-line-2")]);
    dashCopy.g.name = "products-copy"; apiCopy.g.name = "recurring-copy"; sdkCopy.g.name = "donations-copy";

    // beat windows: [slab in start, slab out start]
    const BEATS = [
      { slab: dashSlab, copy: dashCopy, seg: 0, inn: 545, out: 582, from: [-420, 0] },
      { slab: apiSlab, copy: apiCopy, seg: 2, inn: 585, out: 621, from: [260, -260] },
      { slab: sdkSlab, copy: sdkCopy, seg: 1, inn: 623, out: 655, from: [260, 260] },
    ];

    return ({ frame, time }) => {
      const G = frame + G0;

      // wheel falls in spinning, settles, breathes; spins away at the end
      const fall = easeOutCubic(seg(G, 533, 545));
      const leave = easeInCubic(seg(G, 659, 666));
      wheel.position.y = 540 - C.y + (1 - fall) * 620;
      wheel.rotation.z = (1 - fall) * 2.6 + leave * -1.6;
      wheel.rotation.x = (1 - fall) * 0.7;
      wheel.rotation.y = (1 - fall) * -0.9;
      wheel.scale.setScalar((0.86 + 0.14 * fall) * (1 + leave * 0.25) * (1 + Math.sin(time * 1.6) * 0.006));
      mark.rotation.y = (1 - fall) * 1.2 + Math.sin(time * 1.1) * 0.12;
      const wheelA = 1 - seg(G, 662, 666);
      [hub.material, chrome].forEach((m) => { (m as THREE.Material).transparent = true; (m as THREE.Material).opacity = wheelA; });

      // all segments glow during the fall, then rest dim unless their beat is on
      const intro = 0.55 * (1 - seg(G, 543, 548));
      segs.forEach((s, i) => {
        let on = intro;
        for (const b of BEATS) if (b.seg === i) on = Math.max(on, easeOutCubic(seg(G, b.inn, b.inn + 6)) * (1 - easeInCubic(seg(G, b.out, b.out + 5))));
        (s.lit.material as THREE.MeshBasicMaterial).opacity = on * wheelA;
        (s.dim.material as THREE.MeshBasicMaterial).opacity = (1 - on * 0.7) * wheelA;
      });

      for (const b of BEATS) {
        const i = easeOutCubic(seg(G, b.inn, b.inn + 9));
        const o = easeInCubic(seg(G, b.out, b.out + 6));
        const m = b.slab.material as THREE.MeshBasicMaterial;
        m.opacity = i * (1 - o);
        b.slab.visible = m.opacity > 0.001;
        b.slab.position.set(b.from[0] * ((1 - i) + o), b.from[1] * ((1 - i) + o), -5);
        b.copy.parts.forEach((p, k) => {
          const a = easeOutCubic(seg(G, b.inn + 9 + k * 2, b.inn + 17 + k * 2));
          p.set(a * (1 - o), Math.max(1 - a, o));
        });
      }
    };
  });
}
