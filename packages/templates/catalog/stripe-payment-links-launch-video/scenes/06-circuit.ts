/**
 * 06 · "Share" → "Global" on one circuit — global frames 321–409 (Stripe remix, light mode)
 *
 * One circuit board, one slow camera. A streak runs in along the input trace
 * (violet from scene 05, cooling to electric blue) while "Global" blurs in with a
 * cyan glow. It strikes the second node; the nodes light up blue one after another
 * down the tree. The grey studio drops to black, the traces turn to yellow→red
 * dashes, the nodes to warm outlines, "Global" dissolves and "Affordable" blurs in
 * low right. The camera pulls back and drifts, and the board softens out into
 * scene 07.
 *
 * World units = composition px at camera scale 1; origin = centre of node N2, y up.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { withFonts } from "../components/fonts";
import { makeText } from "../components/type";
import { orthoStage, seg, easeOutCubic, easeInOutCubic, easeInCubic, clamp01, splineKeys } from "../components/stage";
import { backdrop, glowSprite } from "../components/fx";

const G0 = 321;

// ------------------------------------------------------------------ layout (canvas coords: y down, N2 at 0,0)
const NODE = 120;
const NODES: [string, number, number][] = [
  ["node-1", 0, -300],
  ["node-2", 0, 0],
  ["node-3", 0, 270],
  ["node-4", -310, 270],
  ["node-5", -310, 428],
];
type P = [number, number];
const ROUTES: { pts: P[]; from: string; to: string }[] = [
  { pts: [[-1400, 0], [-60, 0]], from: "#00D4FF", to: "#635BFF" }, // input
  { pts: [[60, -300], [335, -300], [335, 42], [2000, 42]], from: "#A960EE", to: "#FF5996" }, // N1 → right
  { pts: [[0, -240], [0, -60]], from: "#635BFF", to: "#635BFF" },
  { pts: [[0, 60], [0, 210]], from: "#635BFF", to: "#635BFF" },
  { pts: [[60, 270], [267, 270], [267, 630], [2000, 630]], from: "#635BFF", to: "#FFB443" }, // N3 → down-right
  { pts: [[-250, 270], [-60, 270]], from: "#00D4FF", to: "#635BFF" },
  { pts: [[-250, 428], [0, 428], [0, 330]], from: "#00D4FF", to: "#635BFF" },
];
// region the board canvas covers (canvas coords)
const BX0 = -1400, BX1 = 2000, BY0 = -560, BY1 = 1100;

function drawRoutes(g: OffscreenCanvasRenderingContext2D, style: "solid" | "warm" | "dashed") {
  g.save();
  g.translate(-BX0, -BY0);
  g.lineCap = style === "dashed" ? "butt" : "round";
  g.lineJoin = "round";
  for (const r of ROUTES) {
    const xs = r.pts.map((p) => p[0]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    let grad: string | CanvasGradient = r.from;
    if (x1 - x0 > 1) {
      grad = g.createLinearGradient(x0, 0, x1, 0);
      grad.addColorStop(0, r.from);
      grad.addColorStop(1, r.to);
    }
    const path = () => {
      g.beginPath();
      g.moveTo(r.pts[0][0], r.pts[0][1]);
      for (let i = 1; i < r.pts.length - 1; i++) g.arcTo(r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1], 34);
      const l = r.pts[r.pts.length - 1];
      g.lineTo(l[0], l[1]);
    };
    if (style === "solid") {
      g.strokeStyle = "rgba(10,37,64,0.42)";
      g.lineWidth = 7;
      g.shadowColor = "rgba(10,37,64,0)";
      g.shadowBlur = 0;
    } else {
      g.strokeStyle = grad;
      g.lineWidth = 13;
      g.shadowColor = "rgba(99,91,255,0.25)";
      g.shadowBlur = 10;
    }
    g.setLineDash(style === "dashed" ? [26, 19] : []);
    path();
    g.stroke();
  }
  g.restore();
}

function nodeTexture(kind: "dark" | "blue" | "warm" | "violet") {
  const S = 160;
  const c = new OffscreenCanvas(S, S);
  const g = c.getContext("2d")!;
  const m = (S - NODE) / 2;
  const rr = (inset: number) => {
    const x = m + inset, w = NODE - inset * 2, r = 20 - inset * 0.5;
    g.beginPath();
    g.moveTo(x + r, x);
    g.arcTo(x + w, x, x + w, x + w, r);
    g.arcTo(x + w, x + w, x, x + w, r);
    g.arcTo(x, x + w, x, x, r);
    g.arcTo(x, x, x + w, x, r);
    g.closePath();
  };
  if (kind === "blue") {
    g.shadowColor = "rgba(99,91,255,0.55)";
    g.shadowBlur = 18;
    const gr = g.createLinearGradient(m, m + NODE, m + NODE, m);
    gr.addColorStop(0, "#3F37D6");
    gr.addColorStop(0.45, "#635BFF");
    gr.addColorStop(0.75, "#B9B5FF");
    gr.addColorStop(1, "#ffffff");
    g.fillStyle = gr;
    rr(0);
    g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = "rgba(255,255,255,0.95)";
    g.lineWidth = 4;
    rr(2);
    g.stroke();
  } else {
    const border = kind === "dark" ? "#A9B2E8" : kind === "warm" ? "#FF8FB6" : "#A960EE";
    const fill = kind === "dark" ? "#FFFFFF" : kind === "warm" ? "#FFF5F9" : "#F7F1FF";
    g.fillStyle = fill;
    rr(0);
    g.fill();
    // fine dot texture
    g.fillStyle = "rgba(10,37,64,0.06)";
    for (let y = m + 8; y < m + NODE - 6; y += 6) for (let x = m + 8; x < m + NODE - 6; x += 6) g.fillRect(x, y, 1.5, 1.5);
    g.strokeStyle = border;
    g.lineWidth = 4;
    if (kind !== "dark") {
      g.shadowColor = border;
      g.shadowBlur = 8;
    }
    rr(2);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Camera: where N2 sits on screen (px from top-left) and the board scale. */
const CAM: [number, number, number, number][] = [
  [321, 1114, 473, 0.93],
  [336, 1029, 473, 0.92],
  [345, 1038, 465, 1.0],
  [349, 1048, 465, 1.05],
  [352, 1048, 461, 1.02],
  [361, 948, 453, 0.97],
  [363, 864, 442, 0.91],
  [367, 741, 423, 0.85],
  [380, 578, 408, 0.8],
  [395, 580, 404, 0.81],
  [404, 634, 419, 0.74],
  [409, 637, 300, 0.72],
];
// streak head x along the input trace (canvas x)
const HEAD: [number, number][] = [[321, -765], [323, -641], [326, -500], [330, -333], [336, -159], [342, -76], [345, -48], [346, -33], [348, -10]];

function keyed<T extends number[]>(keys: T[], G: number, idx: number, ease = (t: number) => t) {
  if (G <= keys[0][0]) return keys[0][idx];
  let i = 0;
  while (i < keys.length - 2 && G > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1];
  return THREE.MathUtils.lerp(a[idx], b[idx], ease(clamp01((G - a[0]) / (b[0] - a[0]))));
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene } = ctx;
    scene.background = new THREE.Color("#F6F9FC");
    orthoStage(ctx);

    // grey studio: black left edge, lifting to grey toward the lower right
    const studio = backdrop(1920, 1080, (g, w, h) => {
      const lin = g.createLinearGradient(0, 0, w, h * 0.6);
      lin.addColorStop(0, "#F6F9FC");
      lin.addColorStop(0.55, "#EEF1F8");
      lin.addColorStop(1, "#E4E2FF");
      g.fillStyle = lin;
      g.fillRect(0, 0, w, h);
      const r = g.createRadialGradient(w * 0.85, h * 0.95, 0, w * 0.85, h * 0.95, w * 0.6);
      r.addColorStop(0, "rgba(169,96,238,0.22)");
      r.addColorStop(1, "rgba(169,96,238,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, w, h);
    }, "studio", 0.5);
    studio.renderOrder = -20;
    scene.add(studio);

    // ---------------------------------------------------------------- the board (world group)
    const world = new THREE.Group();
    world.name = "circuit-board";
    scene.add(world);
    const BW = BX1 - BX0, BH = BY1 - BY0;
    const mkBoard = (style: "solid" | "warm" | "dashed", name: string) => {
      const m = backdrop(BW, BH, (g) => drawRoutes(g, style), name, 1);
      m.position.set(BX0 + BW / 2, -(BY0 + BH / 2), 0);
      m.userData.pickable = true;
      world.add(m);
      return m;
    };
    const solid = mkBoard("solid", "traces-white");
    const warm = mkBoard("warm", "traces-warm");
    const dashed = mkBoard("dashed", "traces-dashed");

    const texDark = nodeTexture("dark"), texBlue = nodeTexture("blue"), texWarm = nodeTexture("warm"), texViolet = nodeTexture("violet");
    const nodeGeo = new THREE.PlaneGeometry(160, 160);
    const nodes = NODES.map(([name, x, y], i) => {
      const grp = new THREE.Group();
      grp.name = name;
      grp.position.set(x, -y, 1);
      const layer = (map: THREE.Texture, suffix: string) => {
        const m = new THREE.Mesh(nodeGeo, new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false }));
        m.name = `${name}-${suffix}`;
        grp.add(m);
        return m;
      };
      const glow = glowSprite("#635BFF", 280, 0, `${name}-glow`);
      (glow.material as THREE.MeshBasicMaterial).blending = THREE.NormalBlending;
      grp.add(glow);
      const dark = layer(texDark, "dark");
      const blue = layer(texBlue, "lit");
      const late = layer(i < 2 ? texViolet : texWarm, "outline");
      world.add(grp);
      return { grp, dark, blue, late, glow };
    });
    // when each node lights (pulse runs N2 → N1 & N3 → N4 → N5)
    const LIT = [351, 348, 352, 355, 358];

    // streak on the input trace
    const streakTex = (() => {
      const c = new OffscreenCanvas(1024, 128);
      const g = c.getContext("2d")!;
      const gr = g.createLinearGradient(0, 0, 1024, 0);
      gr.addColorStop(0, "rgba(255,255,255,0)");
      gr.addColorStop(0.55, "rgba(255,255,255,0.55)");
      gr.addColorStop(0.92, "rgba(255,255,255,1)");
      gr.addColorStop(1, "rgba(255,255,255,1)");
      g.fillStyle = gr;
      g.filter = "blur(5px)";
      g.beginPath();
      g.moveTo(0, 61); g.lineTo(960, 40); g.arc(975, 64, 24, -Math.PI / 2, Math.PI / 2); g.lineTo(0, 67); g.closePath();
      g.fill();
      const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const streakMat = new THREE.MeshBasicMaterial({ map: streakTex, color: "#A960EE", transparent: true, depthWrite: false, toneMapped: false });
    const streak = new THREE.Mesh(new THREE.PlaneGeometry(620, 120), streakMat);
    streak.name = "pulse-streak";
    const headDot = new THREE.Mesh(new THREE.CircleGeometry(27, 32), new THREE.MeshBasicMaterial({ color: "#635BFF", transparent: true, toneMapped: false }));
    headDot.name = "pulse-head";
    const headGlow = glowSprite("#635BFF", 240, 0.5, "pulse-glow");
    (headGlow.material as THREE.MeshBasicMaterial).blending = THREE.NormalBlending;
    world.add(streak, headGlow, headDot);
    streak.position.z = headDot.position.z = headGlow.position.z = 2;
    const violet = new THREE.Color("#A960EE"), blueC = new THREE.Color("#635BFF");

    // ---------------------------------------------------------------- type (in the world)
    const global = makeText("Share", { size: 196, weight: 600, tracking: -0.02, color: "#0A2540", glow: { blur: 22, color: "rgba(99,91,255,0.3)", passes: 1 }, blur: 18 }, "share");
    global.group.scale.setScalar(Math.min(1, 563 / global.width));
    global.group.position.set(-464, 155, 3);
    const afford = makeText("Global", { size: 196, weight: 600, tracking: -0.02, color: "#0A2540", glow: { blur: 22, color: "rgba(255,89,150,0.25)", passes: 1 }, blur: 18 }, "global");
    afford.group.position.set(829, -475, 3);
    world.add(global.group, afford.group);

    const camv = [0, 0, 0];
    return ({ frame }) => {
      const G = frame + G0;

      // camera
      splineKeys(CAM as unknown as number[][], G, camv);
      const nx = camv[0], ny = camv[1], sc = camv[2];
      world.position.set(nx - 960, 540 - ny, 0);
      world.scale.setScalar(sc);

      // studio drops to black
      const toBlack = easeInOutCubic(seg(G, 360, 364));
      (studio.material as THREE.MeshBasicMaterial).opacity = 1 - toBlack;

      // traces: white → warm solid → dashed
      const warmIn = easeInOutCubic(seg(G, 362, 365));
      const dashIn = seg(G, 365, 366.5);
      const fadeEnd = 1 - easeInCubic(seg(G, 405, 409.5));
      (solid.material as THREE.MeshBasicMaterial).opacity = (1 - warmIn) * fadeEnd;
      (warm.material as THREE.MeshBasicMaterial).opacity = warmIn * (1 - dashIn) * fadeEnd;
      (dashed.material as THREE.MeshBasicMaterial).opacity = dashIn * fadeEnd;

      // nodes
      nodes.forEach((n, i) => {
        const on = easeOutCubic(seg(G, LIT[i] - 1, LIT[i] + 1));
        const flash = seg(G, LIT[i] - 1, LIT[i]) * (1 - seg(G, LIT[i], LIT[i] + 6));
        const blueA = on * (1 - warmIn);
        (n.blue.material as THREE.MeshBasicMaterial).opacity = blueA * fadeEnd;
        (n.dark.material as THREE.MeshBasicMaterial).opacity = (1 - on) * (1 - warmIn) * fadeEnd;
        (n.late.material as THREE.MeshBasicMaterial).opacity = warmIn * fadeEnd;
        (n.glow.material as THREE.MeshBasicMaterial).opacity = flash * 0.9 + blueA * 0.12;
      });

      // streak: violet → blue, runs in and is absorbed by N2
      const hx = keyed(HEAD, G, 1);
      const sOn = G < 348.5 ? 1 : 0;
      streak.visible = headDot.visible = headGlow.visible = sOn > 0;
      streak.position.set(hx - 300, 0, 2);
      headDot.position.set(hx - 12, 0, 2.1);
      headGlow.position.set(hx - 12, 0, 2.05);
      streakMat.color.copy(violet).lerp(blueC, easeInOutCubic(seg(G, 325, 333)));
      (headGlow.material as THREE.MeshBasicMaterial).color.copy(streakMat.color);

      // "Global": blur in, hold, dissolve
      const gIn = easeOutCubic(seg(G, 323, 336));
      const gOut = easeInOutCubic(seg(G, 362, 367));
      global.set(gIn * (1 - gOut * 0.7) * (1 - seg(G, 368, 374)), Math.max(1 - gIn, gOut));

      // "Affordable": blur in, hold, soften out at the end
      const aIn = easeOutCubic(seg(G, 362, 373));
      const aOut = seg(G, 404, 409.5);
      afford.set(aIn * (1 - easeInCubic(aOut)), Math.max(1 - aIn, aOut));
    };
  });
}
