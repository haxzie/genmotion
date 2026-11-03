/**
 * A Premiere Pro–style editor, rebuilt (no Adobe marks): workspace tabs, a
 * source panel, the program monitor showing a frame of the recording, the
 * project bin, the tools strip and a timeline with V1–V3 / A1–A3, violet
 * video clips, green audio with waveforms, a render bar. Drawn once into a
 * page; the parts that move — playhead, timecode, cut lines, a lifted clip,
 * the export dialog — are overlays from here.
 */
import * as THREE from "three";
import { FONT, PX, rng } from "./core";
import { makePage, type Kit, type Page } from "./page";
import { SW, SH, MENU_H, sprite, panelShape, type Sprite } from "./mac";

export const BLUE = "#2d8ceb";
const PANEL = "#232325";
const DEEP = "#19191b";
const LINE = "#0d0d0e";
const INKC = "#c4c4ca";
const DIM = "#8a8a93";

/* timeline geometry, in page px */
export const TL = {
  x0: 520,               // clip area start
  x1: 1428,              // clip area end
  ruler: [528, 548] as [number, number],
  tracks: {
    V3: [550, 580], V2: [582, 616], V1: [618, 652],
    A1: [656, 704], A2: [706, 744], A3: [746, 778],
  } as Record<string, [number, number]>,
  /** seconds of sequence shown across the clip area */
  span: 192,
};
export const VIDEO = "#8f81d6";
export const AUDIO = "#4e9a6c";

const xFor = (sec: number) => TL.x0 + (sec / TL.span) * (TL.x1 - TL.x0);

export function timecode(sec: number, fps = 30) {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const ff = Math.floor((s % 1) * fps);
  return [h, m, ss, ff].map((v) => String(v).padStart(2, "0")).join(":");
}
export const secAt = (x: number) => ((x - TL.x0) / (TL.x1 - TL.x0)) * TL.span;

function panel(k: Kit, x: number, y: number, w: number, h: number, tabs: string[]) {
  k.rect(x, y, w, h, PANEL, 6, LINE, 1);
  let tx = x + 14;
  tabs.forEach((t, i) => {
    k.text(t, tx, y + 15, { size: 12, weight: i === 0 ? 600 : 400, color: i === 0 ? "#e6e6ea" : DIM });
    if (i === 0) k.line(tx, y + 27, tx + k.measure(t, 12, 600), y + 27, BLUE, 2);
    tx += k.measure(t, 12, i === 0 ? 600 : 400) + 22;
  });
  k.line(x, y + 29, x + w, y + 29, LINE);
}

function clip(k: Kit, x: number, y0: number, y1: number, w: number, color: string, label: string, wave?: () => number) {
  const g = k.g;
  const h = y1 - y0 - 2;
  k.rect(x + 0.5, y0 + 1, w - 1, h, color, 2);
  g.save();
  g.beginPath();
  g.rect(x + 2, y0 + 1, w - 4, h);
  g.clip();
  if (wave) {
    const mid = y0 + 1 + h * 0.58;
    g.fillStyle = "rgba(10,40,24,0.55)";
    for (let px = x + 3; px < x + w - 3; px += 2) {
      const a = wave() * h * 0.36;
      g.fillRect(px, mid - a, 1.2, a * 2);
    }
  }
  k.text(label, x + 5, y0 + 9, { size: 10, weight: 500, color: "#f4f4f7" });
  g.restore();
  k.line(x + 0.5, y0 + 1, x + 0.5, y0 + 1 + h, "rgba(0,0,0,0.45)");
}

export interface EditorOpts { clock?: string; seed?: number }

export function drawEditor(k: Kit, o: EditorOpts = {}) {
  const g = k.g;
  const r = rng(o.seed ?? 9);
  g.fillStyle = "#121214";
  g.fillRect(0, 0, SW, SH);

  // menu bar
  k.rect(0, 0, SW, MENU_H, "#1b1b1e");
  k.circle(20, 13, 6, "none", "#e6e6ea", 1.6);
  k.text("Premiere Pro", 44, 13, { size: 13, weight: 700, color: "#f2f2f5" });
  ["File", "Edit", "Clip", "Sequence", "Markers", "Graphics", "View", "Window", "Help"].reduce((x, s) => {
    k.text(s, x, 13, { size: 13, color: "#e6e6ea" });
    return x + k.measure(s, 13) + 22;
  }, 44 + k.measure("Premiere Pro", 13, 700) + 24);
  k.text(o.clock ?? "Tue Nov 4  11:47 PM", SW - 16, 13, { size: 13, color: "#f2f2f5", align: "right" });

  // workspaces
  const ws = ["Learning", "Assembly", "Editing", "Color", "Effects", "Audio", "Graphics", "Libraries"];
  const wsw = ws.reduce((a, s) => a + k.measure(s, 13) + 34, 0);
  ws.reduce((x, s) => {
    const on = s === "Editing";
    k.text(s, x, 40, { size: 13, weight: on ? 600 : 400, color: on ? BLUE : DIM });
    if (on) k.line(x, 51, x + k.measure(s, 13, 600), 51, BLUE, 2);
    return x + k.measure(s, 13) + 34;
  }, (SW - wsw) / 2);

  // source panel
  panel(k, 6, 56, 560, 404, ["Effect Controls", "Source: (no clips)", "Audio Clip Mixer", "Metadata"]);
  k.rect(12, 90, 548, 364, DEEP, 4);
  ["Motion", "Opacity", "Time Remapping", "Volume", "Channel Volume"].forEach((s, i) => {
    k.text(`›  ${s}`, 26, 112 + i * 28, { size: 12, color: INKC });
    k.text("fx", 520, 112 + i * 28, { size: 11, weight: 600, color: DIM });
  });

  // program monitor, showing a frame of the recording
  panel(k, 570, 56, 864, 404, ["Program: demo_final_v9"]);
  k.rect(576, 90, 852, 318, "#000000", 2);
  const fw = 540, fh = 304, fx = 1002 - fw / 2, fy = 97;
  const lg = g.createLinearGradient(fx, fy, fx + fw, fy + fh);
  lg.addColorStop(0, "#1c2550");
  lg.addColorStop(0.6, "#11142a");
  lg.addColorStop(1, "#2a1735");
  k.rect(fx, fy, fw, fh, lg as unknown as string, 0);
  k.rect(fx, fy, fw, 9, "rgba(10,10,16,0.6)");
  k.rect(fx + 60, fy + 70, 250, 160, "#1f2026", 5);
  for (let i = 0; i < 6; i++) k.rect(fx + 74, fy + 96 + i * 20, 150 - (i % 3) * 30, 6, "rgba(255,255,255,0.18)", 3);
  k.rect(fx + fw - 160, fy + 16, 148, 36, "rgba(60,62,70,0.95)", 7);
  k.rect(fx + fw - 153, fy + 23, 22, 22, "#ffffff", 5);
  k.rect(fx + fw - 124, fy + 26, 80, 5, "rgba(255,255,255,0.6)", 3);
  k.rect(fx + fw - 124, fy + 36, 104, 5, "rgba(255,255,255,0.35)", 3);
  k.rect(fx + fw / 2 - 90, fy + fh - 22, 180, 16, "rgba(255,255,255,0.14)", 6);
  k.text("Fit", 760, 425, { size: 12, color: INKC });
  k.text("Full", 1180, 425, { size: 12, color: INKC });
  k.text("00:03:12:08", 1420, 425, { size: 13, color: INKC, align: "right" });
  [-2, -1, 0, 1, 2].forEach((i) => k.rect(1002 + i * 30 - 8, 439, 16, 12, i === 0 ? "#e6e6ea" : "rgba(230,230,234,0.5)", 2));

  // project bin
  panel(k, 6, 464, 330, 430, ["Project: demo_final_v9", "Media Browser"]);
  const bin = [
    "Screen Recording 1.mov", "Screen Recording 2.mov", "Screen Recording 3.mov", "Screen Recording 4.mov",
    "Screen Recording 5.mov", "Screen Recording 6.mov", "VO_take3.wav", "VO_take7.wav", "music_bed.wav", "demo_final_v9",
  ];
  bin.forEach((s, i) => {
    const y = 512 + i * 34;
    const audio = s.endsWith(".wav");
    k.rect(18, y - 9, 18, 18, s === "demo_final_v9" ? "#3a7bd5" : audio ? AUDIO : VIDEO, 3);
    k.text(s, 46, y, { size: 12, color: INKC });
  });

  // tools strip
  k.rect(340, 464, 34, 430, PANEL, 6, LINE);
  for (let i = 0; i < 9; i++) {
    const y = 482 + i * 34;
    if (i === 3) k.rect(344, y - 13, 26, 26, "rgba(45,140,235,0.35)", 4);
    k.rect(350, y - 7, 14, 14, "none", 2, i === 3 ? "#ffffff" : DIM, 1.4);
  }

  // timeline
  panel(k, 378, 464, 1056, 430, ["demo_final_v9", "Rough cut", "Rough cut 2"]);
  k.rect(384, TL.ruler[0], 1044, 254, DEEP, 0);
  // ruler
  k.rect(TL.x0, TL.ruler[0], TL.x1 - TL.x0, TL.ruler[1] - TL.ruler[0], "#202023");
  for (let s = 0; s <= TL.span; s += 4) {
    const x = xFor(s);
    const major = s % 32 === 0;
    k.line(x, TL.ruler[1] - (major ? 10 : 5), x, TL.ruler[1], "#6b6b73");
    if (major) k.text(timecode(s), x + 3, TL.ruler[0] + 6, { size: 9.5, color: DIM });
  }
  // track headers and lanes
  for (const [name, [y0, y1]] of Object.entries(TL.tracks)) {
    const video = name.startsWith("V");
    k.rect(384, y0, 132, y1 - y0, "#26262a", 2);
    k.rect(388, y0 + 4, 26, y1 - y0 - 8, name === "V1" || name === "A1" ? BLUE : "#3a3a40", 3);
    k.text(name, 401, (y0 + y1) / 2, { size: 11, weight: 600, color: "#ffffff", align: "center" });
    k.rect(426, (y0 + y1) / 2 - 6, 12, 12, "none", 2, DIM, 1.2);
    k.rect(446, (y0 + y1) / 2 - 6, 12, 12, "none", 2, DIM, 1.2);
    if (!video) k.text("M  S", 470, (y0 + y1) / 2, { size: 10, weight: 600, color: DIM });
    k.line(TL.x0, y1 + 1, TL.x1, y1 + 1, "#232326");
  }
  k.line(384, 654, TL.x1, 654, "#3a3a40", 1.5);

  // clips: V1 + A1 linked, cut into many takes
  const V1 = TL.tracks.V1!;
  const A1 = TL.tracks.A1!;
  let x = TL.x0;
  let n = 1;
  while (x < TL.x1 - 20) {
    const w = Math.min(TL.x1 - x, 46 + r() * 120);
    clip(k, x, V1[0], V1[1], w, n % 2 ? VIDEO : "#8576cf", `Screen Recording ${1 + (n % 6)}.mov`);
    clip(k, x, A1[0], A1[1], w, n % 2 ? AUDIO : "#479064", `Screen Recording ${1 + (n % 6)}.mov`, () => 0.25 + r() * 0.75);
    x += w;
    n++;
  }
  // V2: titles; A2: voiceover takes; A3: the bed
  const V2 = TL.tracks.V2!;
  for (const [s, w, l] of [[14, 70, "Title"], [62, 54, "Lower third"], [118, 80, "Callout"], [170, 50, "End card"]] as const)
    clip(k, xFor(s), V2[0], V2[1], w, "#c9709f", l);
  const A2 = TL.tracks.A2!;
  for (const [s, w] of [[4, 150], [40, 120], [78, 200], [140, 170]] as const)
    clip(k, xFor(s), A2[0], A2[1], w, "#3f8f86", "VO_take7.wav", () => 0.2 + r() * 0.8);
  const A3 = TL.tracks.A3!;
  clip(k, TL.x0, A3[0], A3[1], TL.x1 - TL.x0 - 30, "#4f74b9", "music_bed.wav", () => 0.5 + r() * 0.3);

  // render bar: mostly red — nothing is rendered
  const rb = TL.ruler[1] - 3;
  k.rect(TL.x0, rb, TL.x1 - TL.x0, 3, "#d23b30");
  k.rect(xFor(20), rb, 60, 3, "#e3c443");
  k.rect(xFor(96), rb, 90, 3, "#e3c443");
}

export function makeEditor(name = "premiere-editor", o: EditorOpts = {}): Page {
  const p = makePage(name, SW, SH, 2, (k) => drawEditor(k, o));
  p.u.bgLum.value = 0.07;
  p.u.tint.setRGB(0.88, 0.92, 1.0);
  return p;
}

/* -------------------------------------------------------------- overlays */

/** The blue playhead: a handle in the ruler and a line through every track. */
export function playhead(): Sprite {
  const H = TL.tracks.A3![1] - TL.ruler[0];
  return sprite("playhead", 16, H, (k) => {
    const g = k.g;
    g.beginPath();
    g.moveTo(1, 0);
    g.lineTo(15, 0);
    g.lineTo(15, 12);
    g.lineTo(8, 19);
    g.lineTo(1, 12);
    g.closePath();
    g.fillStyle = BLUE;
    g.fill();
    k.rect(7.25, 18, 1.5, H - 18, BLUE);
  }, 4, 5);
}

/** A razor cut through V1 and A1. */
export function cutLine(i: number): Sprite {
  const H = TL.tracks.A1![1] - TL.tracks.V1![0];
  return sprite(`razor-cut-${i}`, 6, H, (k) => {
    k.rect(1.5, 0, 3, H, "rgba(0,0,0,0.55)");
    k.rect(2.4, 0, 1.2, H, "#ffffff");
  }, 4, 4);
}

/** A lifted slice of V1. */
export function clipPiece(w: number): Sprite {
  const [y0, y1] = TL.tracks.V1!;
  const h = y1 - y0;
  return sprite("lifted-clip", w, h, (k) => {
    k.rect(0.5, 1, w - 1, h - 2, VIDEO, 2, "#ffffff", 1.5);
    k.text("Screen Recording 4.mov", 5, 10, { size: 10, weight: 500, color: "#f4f4f7" });
  }, 4, 5);
}

/** The hole a lifted clip leaves behind. */
export function gapPatch(w: number): Sprite {
  const [y0, y1] = TL.tracks.V1!;
  return sprite("v1-gap", w, y1 - y0, (k) => k.rect(0, 0, w, y1 - y0, DEEP), 2, 3);
}

/** The export dialog, one per state: percent and a time remaining that only grows. */
export function exportDialog(pct: number, remaining: string): Sprite {
  const W = 520;
  const H = 210;
  return sprite(`export-progress-${pct}-${remaining.replace(/:/g, "")}`, W, H, (k) => {
    panelShape(k.g, W, H, 12, "#2a2a2e");
    k.text("Encoding demo_final_v9.mp4", 26, 36, { size: 17, weight: 600, color: "#f2f2f5" });
    k.text("H.264  ·  1920 × 1080  ·  Match Source – High bitrate", 26, 64, { size: 12, color: DIM });
    k.rect(26, 96, W - 52, 12, "#3a3a40", 6);
    k.rect(26, 96, (W - 52) * (pct / 100), 12, BLUE, 6);
    k.text(`${pct}%`, 26, 134, { size: 16, weight: 600, color: "#f2f2f5" });
    k.text(`Time remaining: ${remaining}`, W - 26, 134, { size: 16, color: "#f2f2f5", align: "right" });
    k.button("cancel", "Cancel", W - 26 - 110, 160, { h: 32, w: 110, size: 13, weight: 500, fill: "rgba(255,255,255,0.14)", ink: "#f2f2f5", r: 7 });
  }, 3, 6);
}

/**
 * Timecode as fixed cells: one texture per glyph, the meshes only swap maps,
 * so the digits tick without redrawing anything and never jitter sideways.
 */
export function makeTimecode(name: string, size: number, color: string) {
  const font = `500 ${size}px ${FONT}`;
  const m = new OffscreenCanvas(8, 8).getContext("2d")!;
  m.font = font;
  const cell = Math.ceil(Math.max(...[..."0123456789"].map((c) => m.measureText(c).width))) + 1;
  const colon = Math.ceil(m.measureText(":").width) + 3;
  const H = Math.ceil(size * 1.4);
  const S = 4;
  const glyph = new Map<string, THREE.CanvasTexture>();
  for (const ch of "0123456789:") {
    const w = ch === ":" ? colon : cell;
    const c = new OffscreenCanvas(w * S, H * S);
    const g = c.getContext("2d")!;
    g.scale(S, S);
    g.font = font;
    g.fillStyle = color;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(ch, w / 2, H / 2);
    const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    glyph.set(ch, t);
  }
  const group = new THREE.Group();
  group.name = name;
  const meshes: THREE.Mesh[] = [];
  let x = 0;
  for (const ch of "00:00:00:00") {
    const w = ch === ":" ? colon : cell;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w * PX, H * PX),
      new THREE.MeshBasicMaterial({ map: glyph.get(ch)!, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
    );
    mesh.position.x = (x + w / 2) * PX;
    mesh.renderOrder = 5;
    mesh.userData.pickable = false;
    group.add(mesh);
    meshes.push(mesh);
    x += w;
  }
  return {
    group,
    width: x,
    height: H,
    set(tc: string) {
      [...tc].forEach((ch, i) => {
        const mat = meshes[i]?.material as THREE.MeshBasicMaterial | undefined;
        const t = glyph.get(ch);
        if (mat && t && mat.map !== t) mat.map = t;
      });
    },
  };
}
