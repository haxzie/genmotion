import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { setupStage, place, wy, enter, pop, setOpacity, canvasPlane, rr, U } from "../components/stage";
import { textPlane } from "../components/type";

type G = OffscreenCanvasRenderingContext2D;

/** Row glyphs, drawn as simple strokes inside a light circle. */
const GLYPHS: Record<string, (g: G) => void> = {
  terminal: (g) => {
    g.strokeRect(21, 23, 22, 18);
    g.beginPath(); g.moveTo(26, 28); g.lineTo(30, 32); g.lineTo(26, 36); g.moveTo(32, 37); g.lineTo(38, 37); g.stroke();
  },
  card: (g) => {
    g.strokeRect(20, 24, 24, 16);
    g.beginPath(); g.moveTo(20, 29); g.lineTo(44, 29); g.stroke();
  },
  person: (g) => {
    g.beginPath(); g.arc(30, 26, 5, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(20, 42); g.quadraticCurveTo(22, 33, 30, 33); g.quadraticCurveTo(36, 33, 38, 37); g.stroke();
    g.beginPath(); g.arc(40, 40, 3, 0, Math.PI * 2); g.stroke();
  },
};

/** Beat 2 — the wallet's "Connect an agent" consent screen; Continue is pressed. */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene } = ctx;
  setupStage(ctx, C.sheet);

  // ── 3D code tile ──────────────────────────────────────────────────────
  const S = 1.9; // 190px tile
  const shape = new THREE.Shape();
  {
    const r = 0.42, h = S / 2;
    shape.moveTo(-h + r, -h); shape.lineTo(h - r, -h); shape.quadraticCurveTo(h, -h, h, -h + r);
    shape.lineTo(h, h - r); shape.quadraticCurveTo(h, h, h - r, h); shape.lineTo(-h + r, h);
    shape.quadraticCurveTo(-h, h, -h, h - r); shape.lineTo(-h, -h + r); shape.quadraticCurveTo(-h, -h, -h + r, -h);
  }
  const tileGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.4, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.14, bevelSegments: 6, curveSegments: 16,
  });
  tileGeo.center();
  const tileMat = new THREE.MeshPhysicalMaterial({
    color: "#cfeee6", roughness: 0.28, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.2, sheen: 0.4,
  });
  const tile = new THREE.Mesh(tileGeo, tileMat);
  tile.name = "agent-icon-tile";
  const face = canvasPlane("agent-icon-code", 150, 150, (g) => {
    rr(g, 0, 0, 150, 150, 30);
    const grad = g.createLinearGradient(0, 0, 150, 150);
    grad.addColorStop(0, "#f4f6f6"); grad.addColorStop(1, "#dfe5e4");
    g.fillStyle = grad; g.fill();
    g.strokeStyle = "#2b2b2b"; g.lineWidth = 7; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath();
    g.moveTo(52, 52); g.lineTo(32, 75); g.lineTo(52, 98);
    g.moveTo(98, 52); g.lineTo(118, 75); g.lineTo(98, 98);
    g.moveTo(84, 44); g.lineTo(66, 106);
    g.stroke();
  });
  face.position.z = 0.36;
  const icon = new THREE.Group();
  icon.name = "agent-icon";
  icon.add(tile, face);
  place(icon, 540, 236, 2);
  const shadow = canvasPlane("agent-icon-shadow", 260, 60, (g) => {
    g.translate(130, 30);
    g.scale(1, 0.22);
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, 128);
    rg.addColorStop(0, "rgba(40,90,70,0.30)"); rg.addColorStop(1, "rgba(40,90,70,0)");
    g.fillStyle = rg; g.fillRect(-130, -136, 260, 272);
  });
  shadow.userData.pickable = false;
  place(shadow, 530, 352, 0);
  scene.add(icon, shadow);

  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(-3, 4, 6);
  const fill = new THREE.DirectionalLight(0xe8fff6, 1.0);
  fill.position.set(4, -2, 3);
  scene.add(key, fill, new THREE.AmbientLight(0xffffff, 1.2));

  // ── Copy ──────────────────────────────────────────────────────────────
  const title = textPlane("headline-connect-an-agent", "Connect an agent", { size: 46, weight: 500, color: C.ink, tracking: "-0.02em" });
  place(title, 540, 432, 1);
  scene.add(title);

  const rows = [
    { id: "purchases", glyph: "terminal", title: "Make agentic purchases", sub: ["Pay using your saved payment details."], y: 520 },
    { id: "private", glyph: "card", title: "Keep your payment details private", sub: ["We'll generate a virtual card", "number for each purchase."], y: 628 },
    { id: "approve", glyph: "person", title: "Approve every spend request", sub: ["Review and approve with", "biometric authentication."], y: 770 },
  ];
  const rowGroups = rows.map((r) => {
    const grp = new THREE.Group();
    grp.name = `feature-${r.id}`;
    const ic = canvasPlane(`feature-${r.id}-icon`, 60, 60, (g) => {
      g.fillStyle = "#f1f2f2"; g.beginPath(); g.arc(30, 30, 30, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#333"; g.lineWidth = 2.4; g.lineCap = "round"; g.lineJoin = "round";
      GLYPHS[r.glyph](g);
    });
    place(ic, 254, r.y + 6);
    const t = textPlane(`feature-${r.id}-title`, r.title, { size: 30, weight: 500, color: C.ink, anchor: "left" });
    t.position.set((302 - 540) / U, wy(r.y), 0);
    grp.add(ic, t);
    r.sub.forEach((line, i) => {
      const s = textPlane(`feature-${r.id}-detail-${i + 1}`, line, { size: 28, color: C.inkMuted, anchor: "left" });
      s.position.set((302 - 540) / U, wy(r.y + 40 + i * 34), 0);
      grp.add(s);
    });
    scene.add(grp);
    return grp;
  });

  // ── Continue button ───────────────────────────────────────────────────
  const drawBtn = (bg: string, fg: string) => (g: G, w: number, h: number) => {
    rr(g, 0, 0, w, h, 16);
    g.fillStyle = bg; g.fill();
    g.font = `500 30px Inter, -apple-system, Arial, sans-serif`;
    g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("Continue", w / 2, h / 2 + 1);
  };
  const button = new THREE.Group();
  button.name = "continue-button";
  const btnOn = canvasPlane("continue-button-active", 640, 78, drawBtn("#1f1f1f", "#ffffff"));
  const btnOff = canvasPlane("continue-button-pressed", 640, 78, drawBtn("#e4e4e4", "#ffffff"));
  btnOff.position.z = 0.01;
  button.add(btnOn, btnOff);
  place(button, 540, 932, 1);
  scene.add(button);

  const PRESS = 46;
  const FADE = 56;

  return ({ frame, time }) => {
    // Entrance, staggered top to bottom.
    const iIn = pop(frame, 0, 10);
    icon.scale.setScalar(0.85 + 0.15 * iIn);
    setOpacity(icon, Math.min(1, iIn));
    icon.rotation.set(0.32 + Math.sin(time * 1.4) * 0.04, -0.42 + Math.sin(time * 1.1) * 0.06, 0.04);
    icon.position.y = wy(236) + Math.sin(time * 2) * 0.04;

    const out = interpolate(frame, [FADE, FADE + 22], [0, 1], Easing.easeInOut);
    const items: THREE.Object3D[] = [title, ...rowGroups, button];
    items.forEach((o, i) => {
      const k = enter(frame, 2 + i * 3, 10);
      setOpacity(o, k * (1 - out));
    });
    setOpacity(shadow, iIn * (1 - out));
    title.position.y = wy(432) - (1 - enter(frame, 2, 10)) * 0.4;
    rowGroups.forEach((r, i) => (r.position.y = -(1 - enter(frame, 5 + i * 3, 10)) * 0.4));
    tileMat.opacity = Math.min(1, iIn) * (1 - out * 0.8);
    (face.material as THREE.MeshBasicMaterial).opacity = Math.min(1, iIn) * (1 - out * 0.8);

    // Button: press, then it goes to its disabled state as the screen clears.
    const press = interpolate(frame, [PRESS, PRESS + 3, PRESS + 8], [0, 1, 0], Easing.easeOut);
    button.scale.setScalar(1 - press * 0.03);
    const off = enter(frame, PRESS + 4, 8);
    const btnK = enter(frame, 14, 10);
    (btnOn.material as THREE.MeshBasicMaterial).opacity = btnK * (1 - off) * (1 - out);
    (btnOff.material as THREE.MeshBasicMaterial).opacity = off * (1 - out);
    btnOff.visible = off > 0.001 && out < 1;
    btnOn.visible = (1 - off) * btnK > 0.001;
    button.position.y = wy(932) - (1 - btnK) * 0.4;
  };
}
