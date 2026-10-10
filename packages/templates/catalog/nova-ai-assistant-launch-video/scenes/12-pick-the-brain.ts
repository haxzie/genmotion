import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import { COLOR, FONT_FAMILY } from "../components/brand";
import { screenLayer, track } from "../components/stage";
import { label, setLabel, measure, withFonts } from "../components/type";
import { backdrop } from "../components/fx";
import { canvasPlane, rr, text, drawMark, cursor } from "../components/ui";

/*
 * A promise builds word by word, then we drop into the composer: a cursor
 * opens the model chip and the list of Nova models unfolds; the camera eases
 * out to show the whole menu as the cursor drifts down it.
 * Pacing follows the reference beat (global frames 2242-2430); all content ours.
 */
const F0 = 2242;
const CUT = 2316;
const L1 = ["Pick", "the", "brain"];
const L2 = ["that", "suits", "the", "job"];

const Z = track([[2316, 2.4], [2340, 2.5], [2352, 2.4], [2368, 1.25], [2430, 1.18]]);
const FX = track([[2316, 250], [2352, 250], [2368, 150], [2430, 150]]);
const FY = track([[2316, 0], [2352, -20], [2368, -150], [2430, -160]]);

const MODELS = [
  { name: "Smart", sub: "Nova picks for you", check: true },
  { name: "Nova Swift", sub: "Quick answers", tag: "New" },
  { name: "Nova Deep", sub: "Long, careful work" },
  { name: "Nova Lite", sub: "Light and fast" },
];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: FONT_FAMILY, url: interUrl }], () => {
    const { scene, camera } = ctx;
    const layer = screenLayer(scene, camera);

    const bg = backdrop();
    bg.grad("#eef3fb", "#f6f8fc", [0, 1]);
    bg.glow(0, { x: 0.5, y: 0.5, rx: 0.6, ry: 0.5, color: "#ffffff", amount: 0.4 });
    scene.add(bg);

    /* the promise: line 1 big and alone, then both lines settle smaller */
    const big = { size: 120, weight: 450, pad: 30 };
    const words: { l: ReturnType<typeof label>; at: number; line: number; x1: number; x2: number }[] = [];
    const sp = big.size * 0.27;
    const lay = (ws: string[], line: number, start: number) => {
      const widths = ws.map((w) => measure(w, big));
      const total = widths.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
      let x = -total / 2;
      ws.forEach((w, i) => {
        const l = label(w, big, COLOR.ink);
        layer.add(l);
        words.push({ l, at: start + i * 9, line, x1: x + widths[i]! / 2, x2: 0 });
        x += widths[i]! + sp;
      });
    };
    lay(L1, 0, 2242);
    lay(L2, 1, 2272);

    /* composer close-up + menu */
    const ui = new THREE.Group();
    ui.name = "model-picker";
    layer.add(ui);
    const composer = canvasPlane(900, 130, (g, w, h) => {
      g.fillStyle = "#ffffff";
      g.shadowColor = "rgba(40,80,160,0.16)";
      g.shadowBlur = 20;
      rr(g, 4, 4, w - 8, h - 8, 28);
      g.fill();
      g.shadowColor = "transparent";
      g.strokeStyle = "#e3e7ee";
      g.lineWidth = 1.5;
      g.stroke();
      text(g, "Ask Nova", 30, 36, 18, "#8a92a3", 450);
      text(g, "+", 30, h - 32, 26, "#4a5163", 400);
      g.fillStyle = "#f1f4f9";
      rr(g, 58, h - 48, 150, 32, 16);
      g.fill();
      text(g, "Check with me", 74, h - 32, 15, "#4a5163", 450);
    }, 3);
    composer.name = "composer";
    ui.add(composer);
    const chip = canvasPlane(120, 44, (g, w, h) => {
      g.fillStyle = "#eef2f8";
      rr(g, 0, 0, w, h, 22);
      g.fill();
      text(g, "Smart", 18, h / 2, 18, "#1d2230", 500);
      text(g, "⌄", 86, h / 2 - 4, 18, "#1d2230", 500);
    }, 4);
    chip.name = "model-chip";
    chip.position.set(250, -33, 0);
    chip.renderOrder = 63;
    ui.add(chip);

    const menu = canvasPlane(440, 380, (g, w) => {
      g.fillStyle = "#ffffff";
      g.shadowColor = "rgba(30,60,140,0.2)";
      g.shadowBlur = 28;
      g.shadowOffsetY = 8;
      rr(g, 10, 10, w - 20, 360, 22);
      g.fill();
      g.shadowColor = "transparent";
      MODELS.forEach((m, i) => {
        const y = 44 + i * 82;
        if (i === 0) {
          text(g, m.name, 40, y, 22, "#1d2230", 500);
          text(g, m.sub, 40, y + 28, 16, "#6b7385", 450);
          g.strokeStyle = "#1d2230";
          g.lineWidth = 2.6;
          g.beginPath();
          g.moveTo(w - 62, y + 2);
          g.lineTo(w - 54, y + 10);
          g.lineTo(w - 40, y - 6);
          g.stroke();
          g.fillStyle = "#edf0f5";
          g.fillRect(30, y + 52, w - 60, 1.5);
        } else {
          drawMark(g, 50, y + 12, 11);
          text(g, m.name, 72, y + 4, 21, "#1d2230", 450);
          text(g, m.sub, 72, y + 30, 15, "#6b7385", 450);
          if (m.tag) {
            g.fillStyle = "#eef2f8";
            rr(g, w - 90, y - 10, 56, 28, 14);
            g.fill();
            text(g, m.tag, w - 62, y + 4, 14, "#4a5163", 500, "center");
          }
        }
      });
    }, 3);
    menu.name = "model-menu";
    menu.renderOrder = 64;
    ui.add(menu);
    // hover highlight that follows the cursor down the list
    const hover = canvasPlane(400, 70, (g, w, h) => {
      g.fillStyle = "rgba(60,123,232,0.08)";
      rr(g, 0, 0, w, h, 14);
      g.fill();
    }, 1);
    hover.name = "menu-hover";
    hover.userData.pickable = false;
    hover.renderOrder = 65;
    ui.add(hover);

    const ptr = cursor(84);
    layer.add(ptr);

    return ({ frame, time }) => {
      const f = frame + F0;
      const first = f < CUT;

      /* words: line one alone and large, then both lines settle smaller and centred */
      const settle = interpolate(f, [2266, 2280], [0, 1], Easing.easeInOut);
      const out = interpolate(f, [2302, 2316], [0, 1], Easing.easeIn);
      const lineScale = THREE.MathUtils.lerp(1, 0.62, settle);
      // re-centre each line for the smaller size
      const l1 = words.filter((w) => w.line === 0);
      const l2 = words.filter((w) => w.line === 1);
      [l1, l2].forEach((ln, li) => {
        ln.forEach((w) => {
          const k = interpolate(f, [w.at, w.at + 10], [0, 1], Easing.easeOut);
          const y = li === 0 ? THREE.MathUtils.lerp(0, 46, settle) : -46;
          w.l.position.set(w.x1 * lineScale, y + out * 40, 0);
          w.l.scale.setScalar(lineScale * (1 + (1 - k) * 0.04));
          const accent = li === 0 && w === ln[ln.length - 1];
          const ink = interpolate(f, [w.at + 4, w.at + 14], [0, 1]);
          setLabel(w.l, { opacity: k * (1 - out), blur: (1 - k) * 12 + out * 14, color: accent ? new THREE.Color(COLOR.ink).lerp(new THREE.Color(COLOR.accent), ink) : COLOR.ink });
          w.l.visible = first;
        });
      });

      /* picker */
      ui.visible = !first;
      const z = Z(f);
      ui.scale.setScalar(z);
      ui.position.set(-FX(f) * z, -FY(f) * z, 0);
      composer.material.opacity = interpolate(f, [CUT, CUT + 6], [0, 1]);
      const open = interpolate(f, [2342, 2352], [0, 1], Easing.easeOut);
      menu.position.set(160, -60 - 190 - (1 - open) * 20, 0);
      menu.scale.set(1, Math.max(0.001, 0.85 + open * 0.15), 1);
      menu.material.opacity = open;

      // cursor: in to the chip, click, then down the list
      const tIn = interpolate(f, [2322, 2336], [0, 1], Easing.easeOut);
      const press = interpolate(f, [2338, 2340, 2344], [0, 1, 0]);
      const down = interpolate(f, [2372, 2420], [0, 1], Easing.easeInOut);
      const target = new THREE.Vector2(THREE.MathUtils.lerp(270, 330, down), THREE.MathUtils.lerp(-40, -290, down));
      const sx = (target.x - FX(f)) * z;
      const sy = (target.y - FY(f)) * z;
      ptr.visible = f >= 2322;
      ptr.position.set(THREE.MathUtils.lerp(sx + 260, sx, tIn), THREE.MathUtils.lerp(sy - 240, sy, tIn) + Math.sin(time * 3) * 1.5, 0);
      ptr.scale.setScalar((z > 2 ? 1.5 : 1.15) * (1 - press * 0.12));
      chip.scale.setScalar(1 - press * 0.08);

      const rowIdx = THREE.MathUtils.clamp(Math.round(down * 3), 0, 3);
      hover.position.set(160, -60 - 190 + 190 - 44 - rowIdx * 82 - 4, 0);
      hover.material.opacity = open * interpolate(f, [2370, 2378], [0, 1]);

      bg.material.uniforms.uFade!.value = interpolate(f, [2420, 2430], [1, 0.0], Easing.easeIn);
      (bg.material.uniforms.uFadeTo!.value as THREE.Color).set("#0b0c14");
      ui.children.forEach((c) => ((c as THREE.Mesh).material as THREE.Material & { opacity: number }).opacity *= interpolate(f, [2420, 2430], [1, 0]));
    };
  });
}
