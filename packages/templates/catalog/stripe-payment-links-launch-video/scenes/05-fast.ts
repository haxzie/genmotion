/**
 * 05 · "No code" — global frames 303–321 (Stripe remix of the "Fast" streak, light mode)
 *
 * Picks up the whip streak scene 04 left behind (same height, head at +154px).
 * The streak cools from white to violet as it accelerates right with a ⚡ in its
 * head; italic "Fast" decelerates in from the right with a motion blur, and a
 * violet glow swells on the right edge as the streak leaves frame. Scene 06 opens
 * with the same violet head running in along a circuit trace.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { withFonts } from "../components/fonts";
import { makeText } from "../components/type";
import { orthoStage, seg, easeOutCubic, easeInOutCubic, clamp01 } from "../components/stage";
import { backdrop } from "../components/fx";
import { C } from "../components/brand";

const G0 = 303;

function keyed(keys: [number, number][], G: number, ease = (t: number) => t) {
  if (G <= keys[0][0]) return keys[0][1];
  let i = 0;
  while (i < keys.length - 2 && G > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1];
  return THREE.MathUtils.lerp(a[1], b[1], ease(clamp01((G - a[0]) / (b[0] - a[0]))));
}

// streak head x (px from centre)
const HEAD: [number, number][] = [[303, 154], [305, 211], [307, 346], [309, 538], [310, 634], [312, 806], [315, 1136], [318, 1466], [321, 1800]];
// "Fast" centre x
const FAST: [number, number][] = [[304, 1100], [305, 845], [307, 480], [309, 307], [310, 243], [312, 144], [315, 38], [318, -19], [321, -45]];

/** A streak drawn as a canvas: tail colour → mid → white body, round head with glow. */
function streakCanvas(tail: string, mid: string, body: string, bolt: boolean, name: string) {
  const L = 2500;
  const H = 420;
  return backdrop(L, H, (g, w, h) => {
    const cy = h / 2;
    const core = 92;
    const headR = 64;
    const hx = w - 170;
    const gr = g.createLinearGradient(0, 0, hx, 0);
    gr.addColorStop(0, tail);
    gr.addColorStop(0.42, tail);
    gr.addColorStop(0.74, mid);
    gr.addColorStop(0.93, body);
    gr.addColorStop(1, body);
    const shape = () => {
      g.beginPath();
      g.moveTo(0, cy - 12);
      g.lineTo(w * 0.45, cy - 22);
      g.lineTo(hx, cy - core / 2);
      g.lineTo(hx, cy + core / 2);
      g.lineTo(w * 0.45, cy + 22);
      g.lineTo(0, cy + 12);
      g.closePath();
      g.fill();
      g.beginPath(); g.arc(hx, cy, headR, 0, Math.PI * 2); g.fill();
    };
    // glow pass, then the body
    g.save();
    g.filter = "blur(30px)";
    g.globalAlpha = 0.8;
    g.fillStyle = gr;
    shape();
    g.restore();
    g.filter = "blur(4px)";
    g.fillStyle = gr;
    shape();
    g.filter = "none";
    if (bolt) {
      const k = 1.7;
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.moveTo(hx + 6 * k, cy - 22 * k); g.lineTo(hx - 12 * k, cy + 3 * k); g.lineTo(hx - 1 * k, cy + 3 * k);
      g.lineTo(hx - 6 * k, cy + 22 * k); g.lineTo(hx + 12 * k, cy - 3 * k); g.lineTo(hx + 1 * k, cy - 3 * k);
      g.closePath();
      g.fill();
    }
  }, name, 0.5);
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene } = ctx;
    scene.background = new THREE.Color(C.page);
    orthoStage(ctx);

    // faint horizontal rules with a few "+" marks, and the violet glow on the right
    const rules = backdrop(1920, 1080, (g, w, h) => {
      g.strokeStyle = "rgba(10,37,64,0.07)";
      g.lineWidth = 1.5;
      g.beginPath();
      for (let y = 78; y < h; y += 113) { g.moveTo(0, y); g.lineTo(w, y); }
      g.stroke();
      g.strokeStyle = "rgba(10,37,64,0.035)";
      g.beginPath();
      for (let x = 60; x < w; x += 113) { g.moveTo(x, 0); g.lineTo(x, h); }
      g.stroke();
      g.strokeStyle = "rgba(99,91,255,0.45)";
      for (const [x, y] of [[1470, 304], [1470, 756], [540, 756], [1860, 304]]) {
        g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x + 14, y); g.moveTo(x, y - 14); g.lineTo(x, y + 14); g.stroke();
      }
    }, "speed-rules", 1);
    const violet = backdrop(1920, 1080, (g, w, h) => {
      const gr = g.createLinearGradient(w, 0, w * 0.55, 0);
      gr.addColorStop(0, "rgba(169,96,238,0.55)");
      gr.addColorStop(0.4, "rgba(99,91,255,0.22)");
      gr.addColorStop(1, "rgba(99,91,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    }, "violet-glow", 0.5);
        scene.add(rules, violet);

    const white = streakCanvas("rgba(99,91,255,0.0)", "rgba(99,91,255,0.95)", "#635BFF", true, "streak-blurple");
    const purple = streakCanvas("rgba(0,212,255,0.0)", "#635BFF", "#A960EE", true, "streak-gradient");
    for (const s of [white, purple]) {
      s.position.y = 0;
      scene.add(s);
    }

    const fast = makeText("No code", { size: 190, weight: 600, skew: 0.2, color: C.navy, glow: { blur: 18, color: "rgba(99,91,255,0.28)", passes: 1 }, blur: 16 }, "no-code");
    fast.group.position.y = 251;
    scene.add(fast.group);

    return ({ frame }) => {
      const G = frame + G0;

      // the streak: plane spans [head-2020, head+80]
      const hx = keyed(HEAD, G);
      for (const s of [white, purple]) s.position.x = hx - 2500 / 2 + 170;
      const cool = easeInOutCubic(seg(G, 303, 308));
      (white.material as THREE.MeshBasicMaterial).opacity = 1 - cool;
      (purple.material as THREE.MeshBasicMaterial).opacity = cool;

      // "Fast": decelerates in, blur clears as it slows
      const fx = keyed(FAST, G);
      fast.group.position.x = fx;
      const fIn = seg(G, 304, 306);
      fast.set(fIn, 1 - easeOutCubic(seg(G, 305, 311)));

      // violet edge glow swells as the streak leaves
      (violet.material as THREE.MeshBasicMaterial).opacity = easeOutCubic(seg(G, 311, 321));
      (rules.material as THREE.MeshBasicMaterial).opacity = 0.6 + 0.4 * seg(G, 309, 316);
    };
  });
}
