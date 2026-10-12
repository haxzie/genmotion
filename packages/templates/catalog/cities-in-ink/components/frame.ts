/**
 * The reference's page grammar, locked to the camera.
 *  - "panel": a thin-ruled panel with a serif caption box beneath it, which
 *    opens out to full-bleed while the camera keeps flying (the film's opening).
 *  - "card": full-bleed from frame 0 (the scene opens out of a masked cut);
 *    the caption arrives as a ruled paper card in the lower third, then drops away.
 * Cuts between scenes are not handled here: each scene hides its cut behind
 * an object in its own world that sweeps across the lens.
 */
import * as THREE from "three";
import { interpolate, Easing } from "@genmotion/three-engine";
import { ACCENT, PAPER, RULE, TEXT } from "./brand";
import { label } from "./text";

export interface Word { t: string; accent?: boolean }

export interface FrameOptions {
  words: Word[];
  mode: "panel" | "card";
  durationInFrames: number;
  /** panel: frame the panel starts opening to full-bleed. */
  expandAt?: number;
  /** card: frame the caption card arrives, and the frame it starts leaving. */
  cardIn?: number;
  cardOut?: number;
  /** card: a closing line, large and centred in the upper third, from `at` to the end. */
  finale?: { words: Word[]; at: number };
}

const D = 10; // overlay distance in front of the camera

export function createFrame(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
  o: FrameOptions,
) {
  scene.add(camera);
  const visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * D;
  const k = visH / height; // world units per composition px
  const W = width, H = height;

  const overlay = new THREE.Group();
  overlay.name = "page";
  overlay.position.z = -D;
  overlay.scale.setScalar(k);
  overlay.userData.pickable = false;
  camera.add(overlay);

  const quad = new THREE.PlaneGeometry(1, 1);
  const flat = (color: string) =>
    new THREE.MeshBasicMaterial({ color, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const mkRect = (mat: THREE.Material, order: number) => {
    const m = new THREE.Mesh(quad, mat);
    m.renderOrder = order;
    overlay.add(m);
    return m;
  };
  const place = (m: THREE.Mesh, x0: number, y0: number, x1: number, y1: number) => {
    m.visible = x1 - x0 > 0.01 && y1 - y0 > 0.01;
    m.scale.set(Math.max(x1 - x0, 0.001), Math.max(y1 - y0, 0.001), 1);
    m.position.set((x0 + x1) / 2 - W / 2, H / 2 - (y0 + y1) / 2, 0);
  };
  const box = (rules: THREE.Mesh[], x0: number, y0: number, x1: number, y1: number, draw: number) => {
    const t = 2;
    const cx = (x0 + x1) / 2, hw = ((x1 - x0) / 2) * draw;
    const cy = (y0 + y1) / 2, hh = ((y1 - y0) / 2) * draw;
    place(rules[0], cx - hw, y0 - t / 2, cx + hw, y0 + t / 2);
    place(rules[1], cx - hw, y1 - t / 2, cx + hw, y1 + t / 2);
    place(rules[2], x0 - t / 2, cy - hh, x0 + t / 2, cy + hh);
    place(rules[3], x1 - t / 2, cy - hh, x1 + t / 2, cy + hh);
  };

  const paperMat = flat(PAPER);
  const mask = [0, 1, 2, 3].map(() => mkRect(paperMat, 1000));
  const fadeMat = flat(PAPER);
  const fade = mkRect(fadeMat, 999);
  fade.name = "paper-fade";
  const ruleMat = flat(RULE);
  const capRuleMat = flat(RULE);
  const panelRules = [0, 1, 2, 3].map(() => mkRect(ruleMat, 1001));
  const capRules = [0, 1, 2, 3].map(() => mkRect(capRuleMat, 1001));
  const cardMat = flat(PAPER);
  const card = mkRect(cardMat, 1000);
  card.name = "caption-card";

  /* caption words */
  const SIZE = Math.round(H * 0.052); // 56px at 1080
  const spaceW = SIZE * 0.26;
  const words = o.words.map((w) => {
    const l = label(w.t, SIZE, w.accent ? ACCENT : TEXT);
    l.mesh.name = "caption-" + w.t.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-+$/, "");
    l.mesh.renderOrder = 1002;
    overlay.add(l.mesh);
    return l;
  });
  const total = words.reduce((s, w) => s + w.textWidth, 0) + spaceW * (words.length - 1);
  let cursor = -total / 2;
  const wordX = words.map((w) => {
    const x = cursor + w.textWidth / 2;
    cursor += w.textWidth + spaceW;
    return x;
  });
  const setWords = (frame: number, start: number, midY: number, out: number) => {
    words.forEach((w, i) => {
      const a = interpolate(frame, [start + i * 3, start + 12 + i * 3], [0, 1], Easing.easeOut);
      const mat = w.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = a * (1 - out);
      w.mesh.visible = mat.opacity > 0.001;
      w.mesh.position.set(wordX[i], midY - (1 - a) * 14 + Math.sin(frame * 0.05 + i) * 0.6, 1);
      w.mesh.scale.setScalar(0.97 + 0.03 * a);
    });
  };

  const framed = { x0: W * 0.1, x1: W * 0.9, y0: H * 0.085, y1: H * 0.655, cy0: H * 0.69, cy1: H * 0.9 };

  if (o.mode === "panel") {
    const expandAt = o.expandAt ?? 78;
    card.visible = false;
    return (frame: number) => {
      // the film opens on paper; the picture inks in inside the panel
      fadeMat.opacity = 1 - interpolate(frame, [4, 18], [0, 1], Easing.easeOut);
      fade.visible = fadeMat.opacity > 0.001;
      place(fade, framed.x0, framed.y0, framed.x1, framed.y1);

      const e = interpolate(frame, [expandAt, expandAt + 30], [0, 1], Easing.easeInOut);
      const x0 = THREE.MathUtils.lerp(framed.x0, -4, e);
      const x1 = THREE.MathUtils.lerp(framed.x1, W + 4, e);
      const y0 = THREE.MathUtils.lerp(framed.y0, -4, e);
      const y1 = THREE.MathUtils.lerp(framed.y1, H + 4, e);
      place(mask[0], -10, -10, W + 10, y0);
      place(mask[1], -10, y1, W + 10, H + 10);
      place(mask[2], -10, y0, x0, y1);
      place(mask[3], x1, y0, W + 10, y1);
      const draw = interpolate(frame, [2, 18], [0, 1], Easing.easeOut);
      box(panelRules, x0, y0, x1, y1, draw);
      ruleMat.opacity = 1 - e;

      const leave = interpolate(frame, [expandAt - 6, expandAt + 4], [0, 1], Easing.easeIn);
      const drop = leave * H * 0.08;
      const cy0 = framed.cy0 + drop, cy1 = framed.cy1 + drop;
      box(capRules, framed.x0, cy0, framed.x1, cy1, draw);
      capRuleMat.opacity = 1 - leave;
      setWords(frame, 12, H / 2 - (cy0 + cy1) / 2, leave);
    };
  }

  /* card mode: full-bleed, caption card in the lower third */
  mask.forEach((m) => (m.visible = false));
  panelRules.forEach((m) => (m.visible = false));
  fade.visible = false;
  const cardIn = o.cardIn ?? 24;
  const cardOut = o.cardOut ?? 100;
  const cw = total + SIZE * 2.6, ch = SIZE * 2.3;
  /* closing line */
  const FS = Math.round(H * 0.085); // 92px at 1080
  const fin = (o.finale?.words ?? []).map((w) => {
    const l = label(w.t, FS, w.accent ? ACCENT : TEXT);
    l.mesh.name = "closing-" + w.t.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-+$/, "");
    l.mesh.renderOrder = 1002;
    overlay.add(l.mesh);
    return l;
  });
  const fSpace = FS * 0.26;
  const fTotal = fin.reduce((s, w) => s + w.textWidth, 0) + fSpace * Math.max(fin.length - 1, 0);
  let fc = -fTotal / 2;
  const finX = fin.map((w) => { const x = fc + w.textWidth / 2; fc += w.textWidth + fSpace; return x; });

  return (frame: number) => {
    if (o.finale) {
      const at = o.finale.at;
      fin.forEach((w, i) => {
        const a = interpolate(frame, [at + i * 4, at + 14 + i * 4], [0, 1], Easing.easeOut);
        const mat = w.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = a;
        w.mesh.visible = a > 0.001;
        w.mesh.position.set(finX[i], H / 2 - H * 0.24 - (1 - a) * 18, 1);
        w.mesh.scale.setScalar(0.97 + 0.03 * a + Math.max(0, frame - at) * 0.00012);
      });
    }
    const a = interpolate(frame, [cardIn, cardIn + 12], [0, 1], Easing.easeOut);
    const out = interpolate(frame, [cardOut, cardOut + 8], [0, 1], Easing.easeIn);
    const cy = H * 0.83 + (1 - a) * 24 + out * 30;
    const x0 = W / 2 - cw / 2, x1 = W / 2 + cw / 2, y0 = cy - ch / 2, y1 = cy + ch / 2;
    place(card, x0, y0, x1, y1);
    cardMat.opacity = a * (1 - out);
    card.visible = cardMat.opacity > 0.001;
    box(capRules, x0, y0, x1, y1, a);
    capRuleMat.opacity = a * (1 - out);
    setWords(frame, cardIn + 4, H / 2 - cy, out);
  };
}
