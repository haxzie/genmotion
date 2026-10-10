import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import { COLOR, FONT_FAMILY } from "../components/brand";
import { screenLayer, track } from "../components/stage";
import { label, setLabel, measure, withFonts } from "../components/type";
import { backdrop } from "../components/fx";
import { canvasPlane, rr, text, bars, drawMark, tile, type Panel } from "../components/ui";

/*
 * A promise on navy, then a slow travelling shot along a row of tilted
 * screens where Nova lives — phone, browser, laptop, terminal, docs, chat —
 * with a label above that changes as each one passes.
 * Pacing follows the reference beat (global frames 1883-2242); all content ours.
 */
const F0 = 1883;
const CUT = 1958;

const LABELS: { pre: string; key: string; from: number; to: number }[] = [
  { pre: "on your", key: "phone", from: 1962, to: 1996 },
  { pre: "in the", key: "browser", from: 1996, to: 2040 },
  { pre: "on your", key: "laptop", from: 2040, to: 2078 },
  { pre: "in the", key: "terminal", from: 2078, to: 2122 },
  { pre: "in your", key: "docs", from: 2122, to: 2166 },
  { pre: "and", key: "everywhere else", from: 2166, to: 2214 },
];
// x of the row (px): a steady travel that eases in and out of the shot
// each screen crosses frame centre while its label is up
const ROW_X = track([[1958, 420], [1979, 0], [2018, -640], [2059, -1320], [2100, -2000], [2144, -2680], [2190, -3360], [2242, -3900]]);

function screenBlue(g: OffscreenCanvasRenderingContext2D, w: number, h: number) {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, "#ffffff");
  gr.addColorStop(1, "#dce8fc");
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: FONT_FAMILY, url: interUrl }], () => {
    const { scene, camera } = ctx;
    const layer = screenLayer(scene, camera);

    const bg = backdrop();
    bg.grad("#0b1020", "#070a14", [0, 1]);
    bg.glow(0, { x: 0.5, y: -0.05, rx: 0.6, ry: 0.4, color: "#1b3a7a", amount: 0.6 });
    scene.add(bg);

    /* headline */
    const h1 = label("Help that follows you,", { size: 80, weight: 450, pad: 40 }, "#eef1f8");
    const h2 = label("wherever you work", { size: 80, weight: 450, pad: 40 }, "#7fa8ff");
    h1.position.y = 50;
    h2.position.y = -50;
    layer.add(h1, h2);

    /* the row of screens */
    const row = new THREE.Group();
    row.name = "device-row";
    layer.add(row);
    const frameBezel = (inner: (g: OffscreenCanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number, r: number, bezel = 14, tone = "#3a4a6e") =>
      canvasPlane(w, h, (g) => {
        const gr = g.createLinearGradient(0, 0, w, h);
        gr.addColorStop(0, tone);
        gr.addColorStop(1, "#1c2438");
        g.fillStyle = gr;
        rr(g, 0, 0, w, h, r);
        g.fill();
        g.save();
        rr(g, bezel, bezel, w - bezel * 2, h - bezel * 2, Math.max(4, r - bezel));
        g.clip();
        g.translate(bezel, bezel);
        inner(g, w - bezel * 2, h - bezel * 2);
        g.restore();
      }, 1.5);

    const panels: { p: Panel; x: number }[] = [];
    const add = (p: Panel, x: number, name: string) => {
      p.name = name;
      p.position.set(x, -40, 0);
      p.rotation.y = -0.5;
      row.add(p);
      panels.push({ p, x });
    };
    // phone
    add(frameBezel((g, w, h) => {
      screenBlue(g, w, h);
      drawMark(g, w / 2, 90, 22);
      text(g, "Hi Sam", w / 2, 146, 30, "#1d2230", 500, "center");
      g.fillStyle = "#ffffff";
      rr(g, 20, h - 80, w - 40, 54, 27);
      g.fill();
    }, 300, 560, 46, 12), 0, "phone");
    // browser
    add(frameBezel((g, w, h) => {
      g.fillStyle = "#f3f5f9";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#e3e7ee";
      g.fillRect(0, 0, w, 34);
      ["#ff6a5a", "#ffc63a", "#3fd17a"].forEach((c, i) => {
        g.fillStyle = c;
        g.beginPath();
        g.arc(18 + i * 18, 17, 5, 0, Math.PI * 2);
        g.fill();
      });
      g.fillStyle = "#ffffff";
      rr(g, 90, 9, w - 180, 16, 8);
      g.fill();
      g.fillStyle = "#ffffff";
      rr(g, 60, h / 2 - 20, w - 120, 70, 18);
      g.fill();
      bars(g, 80, h / 2 + 2, [w - 220], 8, 0, "#dfe4ec");
    }, 600, 400, 18, 10, "#56688f"), 640, "browser");
    // laptop (screen + base)
    const laptop = frameBezel((g, w, h) => {
      screenBlue(g, w, h);
      bars(g, 20, 24, [120, 90, 110, 80], 8, 14, "#c9d3e4");
      g.fillStyle = "#ffffff";
      rr(g, w * 0.3, h * 0.45, w * 0.55, 60, 16);
      g.fill();
    }, 620, 400, 20, 14, "#2c3550");
    add(laptop, 1320, "laptop");
    const base = canvasPlane(720, 30, (g, w, h) => {
      g.fillStyle = "#3b4560";
      rr(g, 0, 0, w, h, 12);
      g.fill();
    }, 1);
    base.name = "laptop-base";
    base.position.set(0, -215, 0);
    laptop.add(base);
    // terminal
    add(frameBezel((g, w, h) => {
      g.fillStyle = "#11141f";
      g.fillRect(0, 0, w, h);
      const cols = ["#7fa8ff", "#3fd17a", "#c9d0de", "#ffc63a", "#c9d0de", "#ff8fb1", "#c9d0de", "#7fa8ff"];
      cols.forEach((c, i) => {
        g.fillStyle = c;
        rr(g, 22, 26 + i * 34, 60 + ((i * 97) % 300), 9, 4);
        g.fill();
      });
      g.fillStyle = "#3fd17a";
      g.fillRect(22, 26 + 8 * 34, 14, 18);
    }, 600, 400, 18, 10, "#3d2f5e"), 2000, "terminal");
    // docs grid of tiles
    add(frameBezel((g, w, h) => {
      g.fillStyle = "#24203a";
      g.fillRect(0, 0, w, h);
    }, 600, 400, 18, 10, "#45386e"), 2680, "docs");
    const grid = new THREE.Group();
    grid.name = "docs-tiles";
    for (let i = 0; i < 8; i++) {
      const t = tile(i, 70);
      t.name = `docs-tile-${i + 1}`;
      t.position.set(-180 + (i % 4) * 120, 60 - Math.floor(i / 4) * 120, 1);
      t.renderOrder = 61;
      grid.add(t);
    }
    panels[4]!.p.add(grid);
    // chat
    add(frameBezel((g, w, h) => {
      g.fillStyle = "#f6f4fb";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#3b2a5a";
      g.fillRect(0, 0, 120, h);
      [60, 150, 240].forEach((y, i) => {
        g.fillStyle = i === 1 ? "#dfe9ff" : "#ffffff";
        rr(g, 150 + (i === 1 ? 120 : 0), y, 280, 60, 16);
        g.fill();
      });
    }, 600, 400, 18, 10, "#4a3a72"), 3360, "chat");

    /* the label above */
    const labels = LABELS.map((l) => {
      const st = { size: 40, weight: 450, pad: 24 };
      const a = label(l.pre, st, "#e8ecf5");
      const b = label(l.key, st, "#7fa8ff");
      const wa = measure(l.pre, st);
      const wb = measure(l.key, st);
      const gap = st.size * 0.27;
      const grp = new THREE.Group();
      grp.name = `${l.pre} ${l.key}`.replace(/ /g, "-");
      a.position.x = -(wa + gap + wb) / 2 + wa / 2;
      b.position.x = (wa + gap + wb) / 2 - wb / 2;
      grp.add(a, b);
      grp.position.y = 330;
      layer.add(grp);
      return { l, grp, a, b };
    });

    // a bar of light along the bottom as the shot ends
    const bar = canvasPlane(1600, 120, (g, w, h) => {
      g.filter = "blur(20px)";
      g.fillStyle = "rgba(140,180,255,0.9)";
      rr(g, 200, h / 2 - 12, w - 400, 24, 12);
      g.fill();
    }, 1);
    bar.name = "floor-light";
    bar.userData.pickable = false;
    bar.position.y = -520;
    layer.add(bar);

    return ({ frame, time }) => {
      const f = frame + F0;
      const first = f < CUT;

      /* headline: words blur up, hold, blur away */
      [h1, h2].forEach((l, i) => {
        const k = interpolate(f, [1883 + i * 6, 1897 + i * 6], [0, 1], Easing.easeOut);
        const out = interpolate(f, [1946, 1957], [0, 1], Easing.easeIn);
        setLabel(l, { opacity: k * (1 - out), blur: (1 - k) * 14 + out * 16 });
        l.position.y = (i === 0 ? 50 : -50) - (1 - k) * 18;
        l.visible = first;
      });

      /* the travelling shot */
      row.visible = !first;
      row.position.x = ROW_X(f);
      row.position.y = Math.sin(time * 0.6) * 4;
      panels.forEach(({ p }, i) => {
        // screens near frame centre turn a touch more toward camera
        const sx = row.position.x + p.position.x;
        p.rotation.y = -0.5 + THREE.MathUtils.clamp(-sx / 2400, -0.12, 0.12);
        const k = interpolate(f, [CUT, CUT + 10], [0, 1], Easing.easeOut);
        p.material.opacity = k;
        p.scale.setScalar(0.95 + 0.05 * k);
        void i;
      });

      labels.forEach(({ l, grp, a, b }) => {
        const k = interpolate(f, [l.from, l.from + 8], [0, 1], Easing.easeOut);
        const o = interpolate(f, [l.to - 6, l.to], [0, 1], Easing.easeIn);
        const on = f >= l.from && f <= l.to;
        grp.visible = on;
        setLabel(a, { opacity: k * (1 - o), blur: (1 - k) * 10 + o * 10 });
        setLabel(b, { opacity: k * (1 - o), blur: (1 - k) * 10 + o * 10, color: "#7fa8ff" });
      });

      bar.material.opacity = interpolate(f, [2220, 2236, 2242], [0, 0.9, 1]);
      void COLOR;
    };
  });
}
