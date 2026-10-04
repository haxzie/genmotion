/**
 * 08 · "Built For Every Business" — global frames 494–534 (Stripe remix: light dashboard, "Create a payment link")
 *
 * Grey studio, dust in the top right. A desktop "Create Transfer" window slides in
 * from the right, smeared, and settles low-centre; "Built For Businesses" builds
 * word by word above it. A slow push, then a downward whip (sub-frame blur) drops
 * everything out of frame as scene 09's wheel falls in from the top.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { withFonts, SANS } from "../components/fonts";
import { makeText, measureText, roundRect, type TextOpts, type TextObj } from "../components/type";
import { orthoStage, seg, easeOutCubic, easeInOutCubic, clamp01, mulberry32 } from "../components/stage";
import { backdrop } from "../components/fx";
import { C, PRODUCT } from "../components/brand";
import { drawChain, drawMug, softShadow } from "../components/ui";

const G0 = 494;
const K = 12;

function keyed(keys: [number, number][], G: number, ease = (t: number) => t) {
  if (G <= keys[0][0]) return keys[0][1];
  let i = 0;
  while (i < keys.length - 2 && G > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1];
  return THREE.MathUtils.lerp(a[1], b[1], ease(clamp01((G - a[0]) / (b[0] - a[0]))));
}

const WIN_W = 1166, WIN_H = 720;
// window x offset (slide in), whole-stage y drop (whip), stage scale (push)
const WX: [number, number][] = [[494, 230], [496, 120], [498, 50], [500, 20], [506, 0]];
const DROP: [number, number][] = [[531, 0], [532, 20], [533, 175], [534, 520]];
const PUSH: [number, number][] = [[506, 1.0], [531, 1.07]];

function drawWindow(g: OffscreenCanvasRenderingContext2D, w: number, h: number) {
  const X = (x: number) => (x - 250) * 1.5;
  const Y = (y: number) => (y - 308) * 1.5;
  roundRect(g, 0, 0, w, h + 40, 30);
  g.fillStyle = "#FFFFFF";
  g.fill();
  g.strokeStyle = "rgba(10,37,64,0.10)";
  g.lineWidth = 2;
  g.stroke();
  // sidebar
  g.save();
  roundRect(g, 0, 0, w, h + 40, 30);
  g.clip();
  g.fillStyle = "#F6F9FC";
  g.fillRect(0, 0, X(287), h);
  g.fillStyle = "#E3E8EE";
  g.fillRect(X(287) - 1, 0, 2, h);
  g.restore();
  g.fillStyle = C.blurple;
  g.beginPath(); g.arc(X(267), Y(328), 17, 0, Math.PI * 2); g.fill();
  drawChain(g, X(267), Y(328), 20, "#ffffff");
  g.strokeStyle = "#9AA7B6";
  g.lineWidth = 2;
  for (const y of [500, 532, 563, 594, 626]) g.strokeRect(X(267) - 7, Y(y) - 7, 14, 14);

  g.textBaseline = "middle";
  const T = (txt: string, x: number, y: number, size: number, weight: number, col: string, align: CanvasTextAlign = "left") => {
    g.font = `${weight} ${size}px ${SANS}`;
    g.fillStyle = col;
    g.textAlign = align;
    g.fillText(txt, X(x), Y(y));
  };
  const box = (x0: number, y0: number, x1: number, y1: number, fill = "#FFFFFF") => {
    roundRect(g, X(x0), Y(y0), X(x1) - X(x0), Y(y1) - Y(y0), 6);
    g.fillStyle = fill;
    g.fill();
    g.strokeStyle = "#D5DBE3";
    g.lineWidth = 1.5;
    g.stroke();
  };
  const check = (x: number, y: number, on: boolean) => {
    roundRect(g, X(x), Y(y) - 9, 18, 18, 4);
    g.fillStyle = on ? C.blurple : "#FFFFFF";
    g.fill();
    g.strokeStyle = on ? C.blurple : "#B8C2D0";
    g.lineWidth = 1.5;
    g.stroke();
    if (on) {
      g.strokeStyle = "#fff"; g.lineWidth = 2.5; g.lineCap = "round";
      g.beginPath(); g.moveTo(X(x) + 4, Y(y)); g.lineTo(X(x) + 8, Y(y) + 4); g.lineTo(X(x) + 14, Y(y) - 4); g.stroke();
    }
  };
  T("Create a payment link", 387, 341, 28, 700, C.navy);
  T("Sell a product or service with a shareable link — no website needed.", 387, 370, 16, 400, C.slate);
  T("Product", 387, 396, 15, 600, C.navy);
  T("Price", 664, 396, 15, 600, C.navy);
  box(387, 409, 593, 435);
  drawMug(g, X(391), Y(411), Y(433) - Y(411), 4);
  T("Ceramic mug", 418, 422, 15, 500, C.navy);
  box(598, 409, 648, 435, "#F6F9FC"); T("Edit", 623, 422, 15, 500, C.slate, "center");
  box(664, 409, 870, 435); T(PRODUCT.price, 674, 422, 15, 500, C.navy);
  box(875, 409, 926, 435, "#F6F9FC"); T("USD", 900, 422, 15, 500, C.slate, "center");
  T("Options", 387, 453, 15, 600, C.navy);
  T("After payment", 664, 453, 15, 600, C.navy);
  check(387, 479, true); T("Collect shipping address", 410, 479, 15, 400, C.navy);
  check(664, 479, true); T("Show confirmation page", 687, 479, 15, 400, C.navy);
  T("Quantity", 387, 510, 15, 600, C.navy);
  T("Payment methods", 523, 510, 15, 600, C.navy);
  T("Tax", 664, 510, 15, 600, C.navy);
  box(387, 523, 512, 549); T("Adjustable", 397, 536, 15, 400, C.navy);
  box(523, 523, 648, 549); T("40+ methods", 532, 536, 15, 400, C.navy);
  box(664, 523, 926, 575); T("Calculate tax automatically", 674, 536, 15, 400, C.slate);
  T("Cancel", 798, 619, 15, 500, C.slate, "center");
  roundRect(g, X(837), Y(606), X(926) - X(837), Y(632) - Y(606), 6);
  g.fillStyle = C.blurple;
  g.fill();
  T("Create link", 881.5, 619, 15, 600, "#ffffff", "center");
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene } = ctx;
    scene.background = new THREE.Color(C.page);
    orthoStage(ctx);

    const rnd = mulberry32(31);
    const studio = backdrop(1920, 1080, (g, w, h) => {
      g.fillStyle = "#F6F9FC";
      g.fillRect(0, 0, w, h);
      const r = g.createRadialGradient(w * 0.95, h * 1.05, 0, w * 0.95, h * 1.05, w * 0.75);
      r.addColorStop(0, "rgba(99,91,255,0.32)");
      r.addColorStop(0.5, "rgba(169,96,238,0.14)");
      r.addColorStop(1, "rgba(169,96,238,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, w, h);
      const l = g.createRadialGradient(0, h, 0, 0, h, w * 0.4);
      l.addColorStop(0, "rgba(0,212,255,0.18)");
      l.addColorStop(1, "rgba(0,212,255,0)");
      g.fillStyle = l;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        g.fillStyle = `rgba(99,91,255,${0.1 + rnd() * 0.25})`;
        const s = rnd() < 0.2 ? 3 : 2;
        g.fillRect(w * (0.55 + rnd() * 0.45), h * rnd() * 0.45, s, s);
      }
    }, "light-studio", 0.5);
    scene.add(studio);

    const stage = new THREE.Group();
    stage.name = "business-stage";
    scene.add(stage);

    // the window, built K times for the motion blur
    const winBase = backdrop(WIN_W, WIN_H, drawWindow, "create-payment-link-window", 2);
    const wins: THREE.Mesh[] = [winBase];
    for (let k = 1; k < K; k++) {
      const c = winBase.clone();
      c.name = `create-payment-link-window-smear-${k}`;
      c.userData.pickable = false;
      wins.push(c);
    }
    const winShadow = softShadow(WIN_W, WIN_H + 40, 30, 0.2, 40, "window-shadow");
    stage.add(winShadow);
    wins.forEach((w) => stage.add(w));
    const winMat = winBase.material as THREE.MeshBasicMaterial;
    const WIN_Y = 540 - (462 + WIN_H / 2);

    // title
    const o: TextOpts = { size: 96, weight: 560, tracking: -0.015, color: C.navy, glow: { blur: 16, color: "rgba(99,91,255,0.22)", passes: 1 }, blur: 12, anchor: "left" };
    const words = ["Built", "For", "Every", "Business"];
    const total = measureText(words.join(" "), o);
    const title = new THREE.Group();
    title.name = "built-for-every-business";
    title.position.y = 175;
    const wObjs: TextObj[] = [];
    let acc = "";
    for (const w of words) {
      const t = makeText(w, o, `built-for-every-business-${w.toLowerCase()}`);
      t.group.position.x = -total / 2 + measureText(acc, o);
      acc += w + " ";
      title.add(t.group);
      wObjs.push(t);
    }
    stage.add(title);
    const AT = [497, 500, 502, 504];

    return ({ frame }) => {
      const G = frame + G0;
      const s = keyed(PUSH, G, easeInOutCubic);
      stage.scale.setScalar(s);

      const whip = G >= 531.5;
      const slide = G < 501;
      wins.forEach((w, k) => {
        const t = G - (k / (K - 1)) * 1.0;
        w.position.set(keyed(WX, t), WIN_Y - keyed(DROP, t), 0);
        w.visible = k === 0 || slide || whip;
      });
      winShadow.position.set(wins[0].position.x, wins[0].position.y - 22, -1);
      (winShadow.material as THREE.MeshBasicMaterial).opacity = slide || whip ? 0 : 1;
      winMat.opacity = slide || whip ? 0.32 : 1;
      if (G < 494.5) winMat.opacity = 0.25;

      title.position.y = 175 - keyed(DROP, G);
      wObjs.forEach((t, i) => {
        const a = easeOutCubic(seg(G, AT[i], AT[i] + 5));
        t.group.position.y = -(1 - a) * 22;
        t.group.scale.setScalar(0.9 + 0.1 * a);
        t.set(a, Math.max(1 - a, seg(G, 531, 533)));
      });
      (studio.material as THREE.MeshBasicMaterial).opacity = 1 - seg(G, 532, 534) * 0.6;
    };
  });
}
