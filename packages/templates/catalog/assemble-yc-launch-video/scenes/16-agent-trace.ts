import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX, rx, ry } from "../components/stage";
import { glide, prog, outCubic, inCubic, clamp01 } from "../components/ease";
import { withInter } from "../components/type";
import { panel, rrect, text } from "../components/ui";
import { bottomGlow } from "../components/glow";

/**
 * Global f1247–f1335 (scene frame = global - 1247).
 * The agent trace: a Gantt of Query / Agent / Tools / Filesystem / Browser lanes. A playhead
 * near the right edge draws the bars in as the timeline scrolls left, the label column scrolls
 * away, the teal glow rises, and the chart dissolves into the glow.
 */
const G0 = 1247;
const PANEL_X = 203, TOP = 230, HEAD = 100, ROW = 108, LABEL_W = 378;
const T0 = 658, TICK = 577; // base x of 0:00 and px per 40.5 s tick
const ROWS = [
  { name: "Query", c: "#aecde1" },
  { name: "Agent", c: "#2a4058" },
  { name: "Tools", c: "#4b8a8c" },
  { name: "Filesystem", c: "#8a64b3" },
  { name: "Browser", c: "#c3d4dd" },
];
// [row, x0, x1, label, duration]
const BARS: [number, number, number, string?, string?][] = [
  [1, 981, 1021], [1, 1033, 1072], [1, 1074, 1111], [1, 1410, 1450], [1, 1452, 1495], [1, 1508, 1548], [1, 1550, 1587],
  [1, 1997, 2037], [1, 2839, 2879], [1, 4074, 4114], [1, 4195, 4235], [1, 5785, 5825], [1, 7236, 7276],
  [2, 700, 974, "bash", "0:23"], [2, 983, 1027], [2, 1036, 1398, "bash", "0:23"], [2, 1408, 1600, "bash", "0:24"],
  [2, 1616, 1933, "bash", "0:24"], [2, 1979, 2840, "bash", "0:58"], [2, 2851, 3878, "salesforce_create_record", "1:15"],
  [2, 3888, 4044], [2, 4054, 4190], [2, 4207, 5713, "salesforce_update_records", "1:53"], [2, 5722, 5900],
  [3, 5989, 6200, "write au", "0:16"], [3, 6212, 6380], [3, 6392, 6420], [3, 6432, 7300, "write warm-account-architect-notes.md", "0:57"],
];
const TICKS = ["0:00", "0:40", "1:21", "2:02", "2:43", "3:24", "4:05", "4:46", "5:27", "6:08", "6:49", "7:30", "8:11", "8:52"];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withInter(ctx, () => {
    const { scene, camera, height } = ctx;
    scene.background = new THREE.Color("#f2f6f9");
    fitCamera(camera, height, 50);

    const glow = bottomGlow();
    scene.add(glow.group);

    const chart = new THREE.Group();
    chart.name = "agent-trace";
    scene.add(chart);
    const tl = new THREE.Group(); // scrolling timeline, base px
    tl.name = "trace-timeline";
    chart.add(tl);
    const quad = new THREE.PlaneGeometry(1, 1);
    quad.translate(0.5, -0.5, 0);
    const at = (m: THREE.Object3D, x: number, y: number, z = 0) => m.position.set(x * PX, -y * PX, z);

    // lanes (alternate tint) and grid
    const laneMats = [new THREE.MeshBasicMaterial({ color: "#fafbfd", transparent: true }), new THREE.MeshBasicMaterial({ color: "#f1f6f9", transparent: true })];
    const gridMat = new THREE.MeshBasicMaterial({ color: "#dbe4ea", transparent: true });
    const allMats: THREE.MeshBasicMaterial[] = [...laneMats, gridMat];
    const head = new THREE.Mesh(quad, laneMats[0]!);
    head.scale.set(12000 * PX, HEAD * PX, 1);
    at(head, -1000, 0);
    tl.add(head);
    ROWS.forEach((_, i) => {
      const m = new THREE.Mesh(quad, laneMats[i % 2 === 1 ? 1 : 0]!);
      m.scale.set(12000 * PX, ROW * PX, 1);
      at(m, -1000, HEAD + i * ROW);
      const line = new THREE.Mesh(quad, gridMat);
      line.scale.set(12000 * PX, 2 * PX, 1);
      at(line, -1000, HEAD + i * ROW, 0.001);
      tl.add(m, line);
    });
    TICKS.forEach((t, i) => {
      const x = T0 + i * TICK;
      const v = new THREE.Mesh(quad, gridMat);
      v.scale.set(2.5 * PX, ROW * 5 * PX, 1);
      at(v, x, HEAD, 0.001);
      const lab = panel(120, 50, (g) => text(g, t, 60, 25, 30, "#8c979e", 400, undefined, "center"), 2, `tick-${t.replace(":", "-")}`);
      at(lab, x, 40, 0.002);
      allMats.push(lab.material as THREE.MeshBasicMaterial);
      tl.add(v, lab);
    });

    // bars
    const bars = BARS.map(([r, x0, x1, label, dur], i) => {
      const w = x1 - x0;
      const colour = ROWS[r]!.c;
      const m = panel(w, 54, (g) => {
        rrect(g, 0, 0, w, 54, 5, colour);
        if (label && w > 120) text(g, label, 20, 28, 30, "#ffffff", 500);
        if (dur && w > 200) text(g, dur, w - 20, 28, 28, "rgba(255,255,255,0.85)", 400, undefined, "right");
      }, 2, `trace-bar-${i + 1}`);
      m.geometry.translate((w / 2) * PX, -27 * PX, 0);
      at(m, x0, HEAD + r * ROW + 27, 0.003);
      tl.add(m);
      return { m, x0, w };
    });

    // label column (pinned, then scrolls away)
    const labels = new THREE.Group();
    labels.name = "trace-labels";
    const col = panel(LABEL_W, HEAD + ROW * 5, (g) => {
      g.fillStyle = "#fdfdfe";
      g.fillRect(0, 0, LABEL_W, HEAD + ROW * 5);
      g.fillStyle = "#e1e8ed";
      for (let i = 0; i <= 5; i++) g.fillRect(0, HEAD + i * ROW - 1, LABEL_W, 2);
      g.fillRect(LABEL_W - 2, 0, 2, HEAD + ROW * 5);
      text(g, "Agent trace", 38, 52, 46, "#1c2740", 500);
      ROWS.forEach((r, i) => {
        rrect(g, 42, HEAD + i * ROW + 37, 34, 34, 7, r.c);
        text(g, r.name, 97, HEAD + i * ROW + 55, 38, i === 4 ? "#8ea0ab" : "#4a5a68", 400);
      });
    }, 2, "trace-label-column");
    col.geometry.translate((LABEL_W / 2) * PX, -((HEAD + ROW * 5) / 2) * PX, 0);
    labels.add(col);
    chart.add(labels);
    allMats.push(col.material as THREE.MeshBasicMaterial);

    const off = glide([[1247, 0], [1253, 60], [1259, 125], [1265, 479], [1271, 1267], [1277, 1870], [1283, 2897], [1289, 3849], [1295, 4460], [1301, 4801], [1307, 5101], [1313, 5303], [1319, 5453], [1325, 5557], [1331, 5614], [1336, 5640]]);
    const PLAYHEAD = 1520;

    return ({ frame: local }) => {
      const f = local + G0;
      const o = off(f);
      chart.position.set(rx(0), ry(TOP), 0);
      tl.position.x = -o * PX;
      labels.position.x = (PANEL_X - Math.max(0, o - 479)) * PX;
      const fade = 1 - prog(f, 1323, 12, inCubic);
      const enter = prog(f, 1246, 4, outCubic);
      for (const m of allMats) m.opacity = fade * enter;
      for (const b of bars) {
        const sx = b.x0 - o; // screen x of bar start
        const shown = clamp01((PLAYHEAD - sx) / b.w);
        b.m.visible = shown > 0;
        b.m.scale.x = Math.max(0.0001, shown);
        const settled = clamp01((PLAYHEAD - 700 - sx) / 300);
        (b.m.material as THREE.MeshBasicMaterial).opacity = (0.45 + 0.55 * settled) * fade * enter;
      }
      const gp = prog(f, 1262, 25, outCubic);
      glow.set(gp, (1 - gp) * -200, 0);
    };
  });
}
