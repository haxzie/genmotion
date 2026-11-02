import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";
import { C, MONO } from "../components/brand";
import { setupStage, place, wy, enter, leave, pop, setOpacity, canvasPlane, rr } from "../components/stage";
import { measure } from "../components/type";
import { backdrop } from "../components/backdrop";

const FS = 28;
const LH = 38;
const PADX = 28;
const PADY = 22;
const MONO_OPTS = { size: FS, mono: true };

function bubble(name: string, lines: string[], fill: string, edge: string | null, color = C.white) {
  const w = Math.ceil(Math.max(...lines.map((l) => measure(l, MONO_OPTS)))) + PADX * 2;
  const h = lines.length * LH + PADY * 2;
  const mesh = canvasPlane(name, w + 4, h + 4, (g) => {
    rr(g, 2, 2, w, h, 12);
    g.fillStyle = fill; g.fill();
    if (edge) { g.strokeStyle = edge; g.lineWidth = 2; g.stroke(); }
    g.font = `400 ${FS}px ${MONO}`;
    g.fillStyle = color; g.textBaseline = "middle";
    lines.forEach((l, i) => g.fillText(l, 2 + PADX, 2 + PADY + LH * i + LH / 2));
  });
  mesh.userData.w = w + 4;
  mesh.userData.h = h + 4;
  return mesh;
}

/** Beat 3 — the agent proposes a change and a charge; the user says yes. */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, durationInFrames } = ctx;
  setupStage(ctx, C.bg);
  const ambient = backdrop(scene, { frame: true });

  const chat = new THREE.Group();
  chat.name = "chat";
  scene.add(chat);

  const RIGHT = 860;
  const LEFT = 220;

  const user = bubble("message-user-request",
    ["Adjust my road trip itinerary to", "stay in New Orleans another", "night."], C.bubbleUser, null);
  const agent = bubble("message-agent-found",
    ["Found availability in your same", "room for another night and found", "a last-minute discount."], C.bubbleAgent, C.bubbleEdge);

  // Summary card with a green glow.
  const CW = 560, ROW = 64, CH = 70 + ROW * 3;
  const GLOW = 24;
  const summary = canvasPlane("summary-of-changes", CW + GLOW * 2, CH + GLOW * 2, (g) => {
    g.save();
    g.shadowColor = "rgba(59,227,127,0.55)";
    g.shadowBlur = 26;
    rr(g, GLOW, GLOW, CW, CH, 14);
    g.fillStyle = "#06200f"; g.fill(); g.fill();
    g.restore();
    rr(g, GLOW, GLOW, CW, CH, 14);
    g.strokeStyle = "#3be37f"; g.lineWidth = 2.5; g.stroke();
    const x0 = GLOW + PADX, x1 = GLOW + CW - PADX;
    g.textBaseline = "middle";
    g.font = `500 ${FS}px ${MONO}`; g.fillStyle = C.white;
    g.fillText("Summary of changes", x0, GLOW + 38);
    const rows: [string, string, boolean][] = [
      ["Extra night", "+$210", false], ["Last minute discount", "-$30", false], ["Total charge", "$180", true],
    ];
    rows.forEach(([k, v, strong], i) => {
      const y = GLOW + 70 + ROW * i;
      g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
      g.font = `${strong ? 500 : 400} ${FS}px ${MONO}`;
      g.fillStyle = strong ? "#ffffff" : C.white;
      g.textAlign = "left"; g.fillText(k, x0, y + ROW / 2);
      g.textAlign = "right"; g.fillText(v, x1, y + ROW / 2);
    });
  });

  const confirm = bubble("message-agent-confirm", ["Would you like to confirm?"], C.bubbleAgent, C.bubbleEdge);
  const yes = bubble("message-user-yes", ["Yes"], C.bubbleUser, null);

  // Layout (top y of each block), right- or left-aligned like a chat.
  type Item = { mesh: THREE.Mesh; top: number; side: "l" | "r"; at: number; pad?: number };
  const items: Item[] = [
    { mesh: user, top: 112, side: "r", at: 0 },
    { mesh: agent, top: 286, side: "l", at: 30 },
    { mesh: summary, top: 460, side: "l", at: 54, pad: GLOW },
    { mesh: confirm, top: 754, side: "l", at: 64 },
    { mesh: yes, top: 858, side: "r", at: 112 },
  ];
  const base = items.map((it) => {
    const w = (it.mesh.userData.wPx as number) - (it.pad ?? 0) * 2;
    const h = (it.mesh.geometry as THREE.PlaneGeometry).parameters.height * 100 - (it.pad ?? 0) * 2;
    const cx = it.side === "r" ? RIGHT - w / 2 : LEFT + w / 2;
    const cy = it.top + h / 2;
    place(it.mesh, cx, cy);
    chat.add(it.mesh);
    return { x: it.mesh.position.x, y: it.mesh.position.y };
  });

  const OUT = durationInFrames - 18;

  return ({ frame, time }) => {
    ambient(time);
    items.forEach((it, i) => {
      const k = enter(frame, it.at, 10);
      const s = pop(frame, it.at, 10);
      setOpacity(it.mesh, k);
      it.mesh.position.y = base[i].y - (1 - k) * 0.35;
      it.mesh.scale.setScalar(0.96 + 0.04 * s);
    });
    // The summary card's glow breathes while it waits for an answer.
    const sm = summary.material as THREE.MeshBasicMaterial;
    if (frame > 70) sm.opacity = 0.92 + Math.sin(time * 3) * 0.08;

    // Exit: a short push towards the viewer as the chat clears.
    const out = leave(frame, OUT, 10);
    const push = interpolate(frame, [OUT - 14, OUT + 10], [0, 1], Easing.easeInOut);
    chat.scale.setScalar(1 + push * 0.06);
    if (out > 0) setOpacity(chat, 1 - out);
  };
}
