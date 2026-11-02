import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";
import { C, SANS } from "../components/brand";
import { setupStage, place, wy, enter, leave, pop, setOpacity, canvasPlane, rr, revealLeft, U } from "../components/stage";
import { textPlane } from "../components/type";
import { backdrop } from "../components/backdrop";
import { SCREEN, SX, SY, phoneSheet, deviceFrame, glassSheen, phoneShadow } from "../components/phone";

type G = OffscreenCanvasRenderingContext2D;
const L = SX(16); // card left edge (design px)
const R = SX(SCREEN.w - 16); // card right edge
const CARD_W = R - L;

function codeGlyph(g: G, cx: number, cy: number, s: number, colour: string, lw: number) {
  g.strokeStyle = colour; g.lineWidth = lw; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath();
  g.moveTo(cx - s * 0.25, cy - s * 0.3); g.lineTo(cx - s * 0.5, cy); g.lineTo(cx - s * 0.25, cy + s * 0.3);
  g.moveTo(cx + s * 0.25, cy - s * 0.3); g.lineTo(cx + s * 0.5, cy); g.lineTo(cx + s * 0.25, cy + s * 0.3);
  g.moveTo(cx + s * 0.1, cy - s * 0.4); g.lineTo(cx - s * 0.1, cy + s * 0.4);
  g.stroke();
}

function triploMark(g: G, x: number, y: number, s: number) {
  rr(g, x, y, s, s, s * 0.22); g.fillStyle = "#000"; g.fill();
  g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `600 ${Math.round(s * 0.27)}px ${SANS}`;
  g.fillText("Triplo", x + s / 2, y + s / 2 + 1);
  g.textAlign = "left";
}

/** Beat 5 — approve the $180 spend with Face ID; the receipt lands. */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, durationInFrames } = ctx;
  setupStage(ctx, C.bg);
  const ambient = backdrop(scene, { frame: true });

  const phone = new THREE.Group();
  phone.name = "phone";
  scene.add(phone);
  const sheet = phoneSheet("phone-screen", C.sheet, { ink: "#111111" });
  const frame = deviceFrame();
  const glass = glassSheen();
  const shadow = phoneShadow();
  phone.add(sheet, frame, glass);
  scene.add(shadow);

  // ── Approval request ─────────────────────────────────────────────────
  const approval = new THREE.Group();
  approval.name = "approval-request";
  phone.add(approval);

  const agentIcon = canvasPlane("approval-agent-icon", 68, 68, (g) => {
    g.fillStyle = "#f1f2f2"; g.beginPath(); g.arc(34, 34, 34, 0, Math.PI * 2); g.fill();
    codeGlyph(g, 34, 34, 30, "#222", 3);
  });
  place(agentIcon, 540, SY(136), 0.1);
  const h1 = textPlane("approval-headline-1", "openclaw-jane wants", { size: 36, weight: 500, color: C.ink, tracking: "-0.01em" });
  const h2 = textPlane("approval-headline-2", "to spend $180", { size: 36, weight: 500, color: C.ink, tracking: "-0.01em" });
  place(h1, 540, SY(222), 0.1);
  place(h2, 540, SY(270), 0.1);

  // Rows: 116 px tall, 20 px padding, two lines 38 px apart around the row centre.
  const ROW = 116, PAD = 20, TX = 98, GAP = 19;
  const title = `500 28px ${SANS}`;
  const sub = `400 28px ${SANS}`;
  const merchant = canvasPlane("approval-merchant", CARD_W, ROW * 2, (g) => {
    rr(g, 0, 0, CARD_W, ROW * 2, 20); g.fillStyle = "#f5f5f5"; g.fill();
    g.strokeStyle = "#e6e6e6"; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(PAD, ROW); g.lineTo(CARD_W - PAD, ROW); g.stroke();
    g.textBaseline = "middle";
    // Merchant row.
    let c = ROW / 2;
    triploMark(g, PAD, c - 29, 58);
    g.font = title; g.fillStyle = C.ink; g.fillText("Triplo", TX, c - GAP);
    g.font = sub; g.fillStyle = C.inkMuted; g.fillText("triplo.com", TX, c + GAP);
    rr(g, CARD_W - PAD - 116, c - 23, 116, 46, 23); g.fillStyle = "#fff"; g.fill(); g.strokeStyle = "#dedede"; g.stroke();
    g.font = `500 28px ${SANS}`; g.fillStyle = "#444"; g.textAlign = "center"; g.fillText("Inspect", CARD_W - PAD - 58, c + 1);
    g.textAlign = "left";
    // Room row.
    c = ROW + ROW / 2;
    rr(g, PAD, c - 29, 58, 58, 13); g.fillStyle = "#e9e9e9"; g.fill();
    g.fillStyle = "#b6a48a"; g.fillRect(PAD + 16, c - 16, 26, 32); g.fillStyle = "#e9e9e9";
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) g.fillRect(PAD + 20 + j * 11, c - 11 + i * 8.5, 6, 5);
    g.font = title; g.fillStyle = C.ink; g.fillText("Queen room", TX, c - GAP);
    g.font = sub; g.fillStyle = C.inkMuted; g.fillText("New Orleans", TX, c + GAP);
    g.font = title; g.fillStyle = C.ink; g.textAlign = "right"; g.fillText("$180.00", CARD_W - PAD, c);
  });
  place(merchant, 540, SY(330) + ROW, 0.1);

  const payment = canvasPlane("approval-payment-card", CARD_W, ROW, (g) => {
    rr(g, 0, 0, CARD_W, ROW, 20); g.fillStyle = "#f5f5f5"; g.fill();
    const c = ROW / 2;
    rr(g, PAD, c - 20, 58, 40, 6); g.fillStyle = "#1a1f71"; g.fill();
    g.fillStyle = "#fff"; g.font = `italic 700 19px ${SANS}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("VISA", PAD + 29, c + 1);
    g.textAlign = "left";
    g.font = title; g.fillStyle = C.ink; g.fillText("Visa Credit", TX, c - GAP);
    g.font = sub; g.fillStyle = C.inkMuted; g.fillText("•••• 1234", TX, c + GAP);
    g.strokeStyle = "#9a9a9a"; g.lineWidth = 2.5; g.beginPath();
    g.moveTo(CARD_W - PAD - 8, c - 8); g.lineTo(CARD_W - PAD, c); g.lineTo(CARD_W - PAD - 8, c + 8); g.stroke();
  });
  place(payment, 540, SY(330 + ROW * 2 + 24) + ROW / 2, 0.1);

  const decline = textPlane("button-decline", "Decline", { size: 30, weight: 500, color: C.ink });
  place(decline, SX(105), SY(846), 0.1);
  const approveBtn = canvasPlane("button-approve", 184, 64, (g) => {
    rr(g, 0, 0, 184, 64, 14); g.fillStyle = "#151515"; g.fill();
    g.font = `500 30px ${SANS}`; g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("Approve", 92, 33);
  });
  place(approveBtn, SX(322), SY(846), 0.1);
  const approvalItems = [agentIcon, h1, h2, merchant, payment, decline, approveBtn];
  approval.add(...approvalItems);

  // ── Face ID overlay ──────────────────────────────────────────────────
  const dim = phoneSheet("approval-dim", "#0c3018");
  dim.position.z = 0.3;
  dim.userData.pickable = false;
  phone.add(dim);
  const faceId = new THREE.Group();
  faceId.name = "face-id";
  const tile = canvasPlane("face-id-tile", 184, 184, (g) => {
    rr(g, 0, 0, 184, 184, 34); g.fillStyle = "#0a2413"; g.fill();
  });
  const face = canvasPlane("face-id-scan", 120, 120, (g) => {
    g.strokeStyle = C.termGreen; g.lineWidth = 4; g.lineCap = "round";
    g.beginPath(); g.arc(60, 60, 50, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(60, 48, 15, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(32, 92); g.quadraticCurveTo(36, 70, 60, 70); g.quadraticCurveTo(84, 70, 88, 92); g.stroke();
  });
  face.position.z = 0.01;
  const ringGeo = new THREE.RingGeometry(0.47, 0.51, 96, 1);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: C.termGreen, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  ring.name = "face-id-success-ring";
  ring.rotation.z = Math.PI / 2;
  ring.scale.x = -1; // draw clockwise from 12 o'clock
  ring.position.z = 0.01;
  const tick = canvasPlane("face-id-success-check", 60, 46, (g) => {
    g.strokeStyle = C.termGreen; g.lineWidth = 5; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); g.moveTo(5, 24); g.lineTo(22, 40); g.lineTo(55, 6); g.stroke();
  }, "left");
  tick.position.set(-30 / U, 0, 0.02);
  faceId.add(tile, face, ring, tick);
  place(faceId, 540, 540, 0.4);
  phone.add(faceId);
  const RING_IDX = ringGeo.index!.count;

  // ── Receipt ──────────────────────────────────────────────────────────
  const receipt = new THREE.Group();
  receipt.name = "receipt";
  phone.add(receipt);
  const rLogo = canvasPlane("receipt-merchant-logo", 88, 88, (g) => triploMark(g, 0, 0, 88));
  place(rLogo, 540, SY(132), 0.5);
  const rName = textPlane("receipt-merchant", "Triplo", { size: 36, weight: 500, color: C.ink });
  place(rName, 540, SY(208), 0.5);
  const rDate = textPlane("receipt-date", "Mar 3, 2026, 1:34 PM", { size: 28, color: C.inkMuted });
  place(rDate, 540, SY(250), 0.5);
  const rAmt = textPlane("receipt-amount", "$180", { size: 34, weight: 500, color: C.ink });
  place(rAmt, 540, SY(292), 0.5);
  const rCard = canvasPlane("receipt-details", CARD_W, 140, (g) => {
    rr(g, 1, 1, CARD_W - 2, 138, 18); g.strokeStyle = "#ececec"; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.moveTo(22, 70); g.lineTo(CARD_W - 22, 70); g.stroke();
    g.textBaseline = "middle"; g.font = `400 28px ${SANS}`;
    g.fillStyle = C.ink; g.fillText("Status", 22, 36); g.fillText("Payment", 22, 104);
    g.textAlign = "right"; g.fillStyle = C.inkMuted;
    g.fillText("Approved", CARD_W - 22, 36); g.fillText("Visa Credit 1234", CARD_W - 22, 104);
  });
  place(rCard, 540, SY(334) + 70, 0.5);
  const rAgent = canvasPlane("receipt-agent", CARD_W, 70, (g) => {
    rr(g, 0, 0, CARD_W, 70, 16); g.fillStyle = "#f1f1f1"; g.fill();
    codeGlyph(g, 36, 35, 24, "#222", 2.6);
    g.textBaseline = "middle"; g.font = `500 28px ${SANS}`; g.fillStyle = C.ink; g.fillText("Agent", 62, 36);
    g.font = `400 28px ${SANS}`; g.fillStyle = C.inkMuted; g.textAlign = "right";
    g.fillText("openclaw-jane", CARD_W - 46, 36);
    g.strokeStyle = "#9a9a9a"; g.lineWidth = 2.5; g.beginPath();
    g.moveTo(CARD_W - 30, 28); g.lineTo(CARD_W - 22, 36); g.lineTo(CARD_W - 30, 44); g.stroke();
  });
  place(rAgent, 540, SY(494) + 35, 0.5);
  const receiptItems = [rLogo, rName, rDate, rAmt, rCard, rAgent];
  receipt.add(...receiptItems);

  // ── Timing ───────────────────────────────────────────────────────────
  const PRESS = 46;
  const DIM = 70;
  const SUCCESS = 122;
  const CLEAR = 152;
  const RECEIPT = 160;
  const OUT = durationInFrames - 18;
  const baseY = new Map<THREE.Object3D, number>();
  [...approvalItems, ...receiptItems].forEach((o) => baseY.set(o, o.position.y));

  return ({ frame, time }) => {
    ambient(time);

    // Approval content settles in (the cut lands on the screen already lit).
    const clear = leave(frame, CLEAR, 8);
    approvalItems.forEach((o, i) => {
      const k = enter(frame, i * 1.5, 9);
      setOpacity(o, k * (1 - clear));
      o.position.y = baseY.get(o)! - (1 - k) * 0.2;
    });
    const press = interpolate(frame, [PRESS, PRESS + 3, PRESS + 9], [0, 1, 0], Easing.easeOut);
    approveBtn.scale.setScalar(1 - press * 0.05);

    // Dim + Face ID.
    const d = enter(frame, DIM, 8) * (1 - clear);
    setOpacity(dim, d * 0.62);
    const t = pop(frame, DIM + 2, 10);
    setOpacity(faceId, Math.min(1, enter(frame, DIM + 2, 8)) * (1 - clear));
    faceId.scale.setScalar(0.85 + 0.15 * t);
    const scanning = frame < SUCCESS;
    const faceA = scanning ? 0.75 + 0.25 * Math.sin((frame - DIM) * 0.35) : 1 - enter(frame, SUCCESS, 5);
    (face.material as THREE.MeshBasicMaterial).opacity *= faceA;
    face.visible = faceA > 0.01 && d > 0;
    const ringK = interpolate(frame, [SUCCESS, SUCCESS + 14], [0, 1], Easing.easeInOut);
    ringGeo.setDrawRange(0, Math.floor((RING_IDX / 6) * ringK) * 6);
    ring.visible = ringK > 0 && d > 0;
    revealLeft(tick, interpolate(frame, [SUCCESS + 8, SUCCESS + 18], [0, 1], Easing.easeOut));
    tick.visible = frame >= SUCCESS + 8 && d > 0;

    // Receipt.
    receiptItems.forEach((o, i) => {
      const k = enter(frame, RECEIPT + i * 3, 10);
      setOpacity(o, k);
      o.position.y = baseY.get(o)! - (1 - k) * 0.25;
    });

    // Phone exits before the cut to the logo.
    const out = leave(frame, OUT, 10);
    phone.scale.setScalar(1 - out * 0.06);
    if (out > 0) {
      [sheet, frame, glass].forEach((o) => setOpacity(o, 1 - out));
      setOpacity(shadow, 1 - out);
      receiptItems.forEach((o) => setOpacity(o, 1 - out));
    }
    phone.position.y = Math.sin(time * 1.6) * 0.02;
  };
}
