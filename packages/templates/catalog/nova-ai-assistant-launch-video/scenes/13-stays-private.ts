import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import { FONT_FAMILY } from "../components/brand";
import { screenLayer } from "../components/stage";
import { label, setLabel, measure, withFonts } from "../components/type";
import { backdrop } from "../components/fx";
import { canvasPlane, rr, text, type Panel } from "../components/ui";

/*
 * On near-black: a promise with its last word inking blue, a supporting line,
 * then three glowing rings drift together and stretch into the first pill of a
 * wall of safeguards that cascades in row by row.
 * Pacing follows the reference beat (global frames 2430-2673); all content ours.
 */
const F0 = 2430;

const ROWS: { t: string; c: string }[][] = [
  [{ t: "Never trains on your data", c: "#7fa8ff" }, { t: "Role-based access", c: "#7fa8ff" }],
  [{ t: "Encrypted end to end", c: "#7fa8ff" }, { t: "Audit trail for every action", c: "#ffc63a" }],
  [{ t: "Asks before big moves", c: "#ff5a6e" }],
  [{ t: "Data stays in your region", c: "#3fd17a" }, { t: "Policy checks on every helper", c: "#ffc63a" }],
  [{ t: "Private by default", c: "#ffc63a" }, { t: "Spend limits you set", c: "#ffc63a" }],
];

function pill(t: string, c: string, icon = false): Panel {
  const st = { size: 30 };
  const w = Math.ceil(measure(t, { size: 30, weight: 450 })) + 64 + (icon ? 52 : 0);
  void st;
  return canvasPlane(w + 24, 84, (g, W, H) => {
    g.shadowColor = c;
    g.shadowBlur = 16;
    g.fillStyle = "rgba(16,18,28,0.95)";
    rr(g, 12, 12, W - 24, H - 24, (H - 24) / 2);
    g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = c;
    g.lineWidth = 2;
    g.stroke();
    let x = 44;
    if (icon) {
      g.fillStyle = c;
      g.beginPath();
      g.arc(x + 8, H / 2, 10, 0, Math.PI * 2);
      g.fill();
      x += 40;
    }
    text(g, t, x, H / 2 + 1, 30, "#f2f4f8", 450);
  }, 3);
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: FONT_FAMILY, url: interUrl }], () => {
    const { scene, camera } = ctx;
    const layer = screenLayer(scene, camera);

    const bg = backdrop();
    bg.grad("#0b0c14", "#0d0e17", [0, 1]);
    scene.add(bg);

    /* promise */
    const st = { size: 76, weight: 450, pad: 30 };
    const a = label("Your work stays", st, "#eef1f8");
    const b = label("private", st, "#eef1f8");
    const wa = measure("Your work stays", st);
    const wb = measure("private", st);
    const gap = st.size * 0.3;
    a.position.x = -(wa + gap + wb) / 2 + wa / 2;
    b.position.x = (wa + gap + wb) / 2 - wb / 2;
    layer.add(a, b);
    const s1 = label("with controls your", st, "#eef1f8");
    const s2 = label("security team trusts", st, "#7fa8ff");
    s1.position.y = 48;
    s2.position.y = -48;
    layer.add(s1, s2);

    /* three rings that become the first pill */
    const ring = (c: string) =>
      canvasPlane(160, 160, (g, w) => {
        g.shadowColor = c;
        g.shadowBlur = 18;
        g.strokeStyle = c;
        g.lineWidth = 4;
        g.beginPath();
        g.arc(w / 2, w / 2, 52, 0, Math.PI * 2);
        g.stroke();
      }, 2);
    const rings = [0, 1, 2].map((i) => {
      const r = ring("#ff5a6e");
      r.name = `ring-${i + 1}`;
      layer.add(r);
      return r;
    });

    /* wall of safeguards */
    const wall = new THREE.Group();
    wall.name = "safeguards";
    layer.add(wall);
    const pills: { p: Panel; row: number; side: number; x: number; y: number }[] = [];
    ROWS.forEach((row, ri) => {
      const made = row.map((r) => pill(r.t, r.c, ri === 2));
      const widths = made.map((m) => m.geometry.parameters.width - 24);
      const total = widths.reduce((s, w) => s + w, 0) + 20 * (made.length - 1);
      let x = -total / 2;
      made.forEach((m, i) => {
        m.name = row[i]!.t.toLowerCase().replace(/[^a-z]+/g, "-");
        const cx = x + widths[i]! / 2;
        x += widths[i]! + 20;
        const y = 2 * 88 - ri * 88;
        m.position.set(cx, y, 0);
        wall.add(m);
        pills.push({ p: m, row: ri, side: i === 0 ? -1 : 1, x: cx, y });
      });
    });

    return ({ frame, time }) => {
      const f = frame + F0;

      bg.glow(0, { x: 0.5, y: 0.5, rx: 0.5, ry: 0.4, color: "#1a1830", amount: 0.6 + Math.sin(time * 0.8) * 0.05 });

      /* promise: write on, "private" inks blue, out */
      const k1 = interpolate(f, [2430, 2442], [0, 1], Easing.easeOut);
      const k2 = interpolate(f, [2436, 2448], [0, 1], Easing.easeOut);
      const ink = interpolate(f, [2452, 2466], [0, 1]);
      const o1 = interpolate(f, [2476, 2486], [0, 1], Easing.easeIn);
      setLabel(a, { opacity: k1 * (1 - o1), blur: (1 - k1) * 12 + o1 * 14 });
      setLabel(b, { opacity: k2 * (1 - o1), blur: (1 - k2) * 12 + o1 * 14, color: new THREE.Color("#eef1f8").lerp(new THREE.Color("#7fa8ff"), ink) });
      a.visible = b.visible = f < 2487;
      const sc = interpolate(f, [2430, 2486], [1, 1.04]);
      a.scale.setScalar(sc);
      b.scale.setScalar(sc);

      const m1 = interpolate(f, [2488, 2500], [0, 1], Easing.easeOut);
      const m2 = interpolate(f, [2494, 2506], [0, 1], Easing.easeOut);
      const o2 = interpolate(f, [2532, 2542], [0, 1], Easing.easeIn);
      setLabel(s1, { opacity: m1 * (1 - o2), blur: (1 - m1) * 12 + o2 * 14 });
      setLabel(s2, { opacity: m2 * (1 - o2), blur: (1 - m2) * 12 + o2 * 14 });
      s1.visible = s2.visible = f >= 2488 && f < 2543;

      /* rings drift in, line up, merge and stretch into the centre pill */
      const rin = interpolate(f, [2544, 2558], [0, 1], Easing.easeOut);
      const merge = interpolate(f, [2566, 2580], [0, 1], Easing.easeInOut);
      rings.forEach((r, i) => {
        const startX = [-260, 120, -40][i]!;
        const startY = [160, 40, 260][i]!;
        const lineX = (i - 1) * 110;
        r.position.set(THREE.MathUtils.lerp(startX, lineX, rin) * (1 - merge), THREE.MathUtils.lerp(startY, 0, rin) * (1 - merge) + 2 * 88 - 2 * 88, 0);
        r.scale.set(0.6 + rin * 0.4 + merge * 2.2, 1 - merge * 0.35, 1);
        r.material.opacity = rin * (1 - interpolate(f, [2576, 2584], [0, 1]));
        r.visible = f >= 2544 && f < 2585;
      });

      /* the wall: the centre pill first, then rows cascade outward */
      pills.forEach(({ p, row, side, x, y }) => {
        const centre = row === 2;
        const at = centre ? 2578 : 2588 + Math.abs(row - 2) * 6 + (side > 0 ? 3 : 0);
        const k = interpolate(f, [at, at + 12], [0, 1], Easing.easeOut);
        p.position.set(x + (1 - k) * side * 140 * (centre ? 0 : 1), y + Math.sin(time * 1.1 + row) * 2, 0);
        p.scale.setScalar(centre ? 0.85 + 0.15 * k : 1);
        const out = interpolate(f, [2656, 2672], [0, 1], Easing.easeIn);
        p.material.opacity = k * (1 - out);
      });
      wall.scale.setScalar(interpolate(f, [2580, 2672], [0.97, 1.05]));
    };
  });
}
