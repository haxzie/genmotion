/**
 * Shot 9 — the timeline, rebuilt from the GenMotion desktop app itself
 * (apps/desktop/src/editor/components/timeline.tsx + audio-lanes.tsx +
 * preview.tsx's transport bar), at 3x its CSS pixel sizes and in its own
 * tokens. It shows THIS film: the scene cards and the music clip come from
 * project.json and the waveform from the real track. The playhead plays at
 * the film's own time, and the pointer clicks the "Frames montage" card.
 */
import * as THREE from "three";
import { Easing, interpolate } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import project from "../project.json";
import { WAVEFORM } from "../components/audio-envelope";
import { APP, FONT, MONO } from "../components/brand";
import { aim, createFilm, handheld } from "../components/film";
import { addStudioLights, createCursor, createRoom, createScreen, type G } from "../components/screen";
import { rr } from "../components/ui";

/** The app's CSS pixels -> canvas pixels. */
const K = 3;
const FPS = project.fps;
const SCENES = project.scenes;
const TOTAL = SCENES.reduce((n, s) => n + s.durationInFrames, 0);
const STARTS = SCENES.map((_, i) => SCENES.slice(0, i).reduce((n, s) => n + s.durationInFrames, 0));
/** Where this shot sits on the film's own timeline. */
const SELF = SCENES.findIndex((s) => s.file === "scenes/09-timeline.ts");
const START = STARTS[SELF] ?? 191;
/** The card the pointer clicks. */
const PICK = Math.max(0, SCENES.findIndex((s) => s.file === "scenes/10-frames-montage.ts"));
const CLICK = 9;

// timeline.tsx constants, scaled.
const PX_PER_SECOND = 60 * K;
const PX_PER_FRAME = PX_PER_SECOND / FPS;
const TRACK_PADDING = 12 * K;
const RULER_H = 18 * K;
const SCENE_H = 54 * K;
const PAD_TOP = 6 * K;
const PAD_BOTTOM = 4 * K;
const LANE_H = 36 * K;
const HEADER_W = 40 * K;
const LANES = 2; // one used + one spare, as the app shows
const TRANSPORT_H = 64 * K;

const W = HEADER_W + TRACK_PADDING * 2 + Math.ceil(TOTAL * PX_PER_FRAME) + 120;
const TL_TOP = TRANSPORT_H;
const H = TL_TOP + RULER_H + SCENE_H + LANES * LANE_H + 2 * K + 120;
const X0 = HEADER_W + TRACK_PADDING; // frame 0
const fx = (f: number) => X0 + f * PX_PER_FRAME;
const SCENE_TOP = TL_TOP + RULER_H;
const LANES_TOP = SCENE_TOP + SCENE_H;

const purple = (a: number) => `rgba(${APP.purple},${a})`;
const orange = (a: number) => `rgba(${APP.orange},${a})`;

function timecode(frame: number): string {
  const s = frame / FPS;
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}.${String(Math.floor(frame % FPS)).padStart(2, "0")}`;
}

function font(g: G, px: number, weight = 400, mono = false) {
  g.font = `${weight} ${px * K}px ${mono ? MONO : FONT}`;
}

/** CSS `truncate`: one line, ellipsis when it does not fit. */
function truncate(g: G, s: string, max: number): string {
  if (g.measureText(s).width <= max) return s;
  let t = s;
  while (t.length > 1 && g.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return t.length > 1 ? `${t}…` : "";
}

const SCENE_ICON_D =
  "m6 17.6l6 2.4V6.4L6 4zm-.75 1.85q-.575-.225-.913-.725T4 17.6V4q0-.825.588-1.412T6 2l6.7 2.525q.575.225.938.738T14 6.4V20q0 1.075-.875 1.663t-1.875.187zM12 19v-2h6V4H6V2h12q.825 0 1.413.588T20 4v13q0 .825-.587 1.413T18 19zm-6-1.4V4z";
function sceneIcon(g: G, x: number, y: number, size: number, color: string) {
  g.save();
  g.translate(x, y);
  g.scale(size / 24, size / 24);
  g.fillStyle = color;
  g.fill(new Path2D(SCENE_ICON_D));
  g.restore();
}
function musicIcon(g: G, x: number, y: number, size: number, color: string) {
  g.save();
  g.translate(x, y);
  g.scale(size / 24, size / 24);
  g.strokeStyle = color;
  g.lineWidth = 1.7;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.stroke(new Path2D("M9 18V5l12-2v13"));
  g.beginPath();
  g.arc(6, 18, 3, 0, Math.PI * 2);
  g.moveTo(21, 16);
  g.arc(18, 16, 3, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

/** waveform.tsx: a smoothed, single-sided envelope planted on the strip's floor. */
function envelope(g: G, x: number, y: number, w: number, h: number, color: string) {
  const cols = Math.max(8, Math.min(400, Math.floor(w / (2 * K))));
  const lv: number[] = [];
  for (let i = 0; i < cols; i++) {
    const a = Math.floor((i / cols) * WAVEFORM.length);
    const b = Math.max(a + 1, Math.floor(((i + 1) / cols) * WAVEFORM.length));
    let m = 0;
    for (let k = a; k < b; k++) m = Math.max(m, WAVEFORM[k] ?? 0);
    lv.push(m);
  }
  const sm = lv.map((_, i) => ((lv[i - 1] ?? lv[i]!) + lv[i]! + (lv[i + 1] ?? lv[i]!)) / 3);
  g.beginPath();
  g.moveTo(x, y + h);
  sm.forEach((v, i) => g.lineTo(x + ((i + 0.5) / cols) * w, y + h - Math.max(0.025, v) * h));
  g.lineTo(x + w, y + h);
  g.closePath();
  g.fillStyle = color;
  g.fill();
}

function paintTimeline(g: G, selected: boolean, band: number) {
  // Shell
  g.fillStyle = APP.surface;
  g.fillRect(0, 0, W, H);

  // ---- Transport bar (preview.tsx), above the timeline.
  const cx = W / 2;
  const cy = TRANSPORT_H / 2 - 4 * K;
  const btn = (x: number, size: number, round: boolean, fill: string | null) => {
    if (!fill) return;
    rr(g, x - size / 2, cy - size / 2, size, size, round ? size / 2 : 6 * K);
    g.fillStyle = fill;
    g.fill();
  };
  // Skip to start
  btn(cx - 64 * K, 36 * K, false, null);
  g.fillStyle = APP.textPrimary;
  g.fillRect(cx - 71 * K, cy - 6 * K, 2 * K, 12 * K);
  g.beginPath();
  g.moveTo(cx - 58 * K, cy - 6 * K);
  g.lineTo(cx - 58 * K, cy + 6 * K);
  g.lineTo(cx - 68 * K, cy);
  g.closePath();
  g.fill();
  // Play/Pause, primary + active while playing: accent-muted fill, accent glyph.
  btn(cx, 44 * K, true, "rgba(59,110,246,0.16)");
  g.fillStyle = APP.accent;
  g.fillRect(cx - 6 * K, cy - 7 * K, 4 * K, 14 * K);
  g.fillRect(cx + 2 * K, cy - 7 * K, 4 * K, 14 * K);
  // Skip to end
  g.fillStyle = APP.textPrimary;
  g.beginPath();
  g.moveTo(cx + 58 * K, cy - 6 * K);
  g.lineTo(cx + 58 * K, cy + 6 * K);
  g.lineTo(cx + 68 * K, cy);
  g.closePath();
  g.fill();
  g.fillRect(cx + 69 * K, cy - 6 * K, 2 * K, 12 * K);

  // ---- Timeline (border-t border)
  g.fillStyle = APP.border;
  g.fillRect(0, TL_TOP, W, K);

  // Selected-scene band across every track, behind the rows.
  if (band > 0) {
    g.fillStyle = purple(0.1 * band);
    g.fillRect(fx(STARTS[PICK]!), TL_TOP + K, SCENES[PICK]!.durationInFrames * PX_PER_FRAME, RULER_H + SCENE_H + LANES * LANE_H);
  }

  // Track headers
  g.fillStyle = APP.surface;
  g.fillRect(0, TL_TOP + K, HEADER_W, H);
  g.fillStyle = APP.border;
  g.fillRect(HEADER_W - K, TL_TOP + K, K, H);
  sceneIcon(g, HEADER_W / 2 - 8 * K, SCENE_TOP + SCENE_H / 2 - 8 * K, 16 * K, APP.textTertiary);
  g.fillStyle = "rgba(255,255,255,0.048)";
  g.fillRect(0, LANES_TOP, HEADER_W - K, K);
  musicIcon(g, HEADER_W / 2 - 8 * K, LANES_TOP + (LANES * LANE_H) / 2 - 8 * K, 16 * K, APP.textTertiary);

  // Ruler: second ticks with mm:ss labels, half-second minor ticks.
  const seconds = Math.ceil(TOTAL / FPS);
  for (let s = 0; s <= seconds; s++) {
    const x = X0 + s * PX_PER_SECOND;
    g.fillStyle = APP.borderStrong;
    g.fillRect(x, TL_TOP + K, K, 6 * K);
    font(g, 9, 400, true);
    g.fillStyle = APP.textTertiary;
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.fillText(timecode(s * FPS).slice(0, 5), x + 4 * K, TL_TOP + K + 7 * K);
    if (s < seconds) {
      g.fillStyle = APP.border;
      g.fillRect(x + PX_PER_SECOND / 2, TL_TOP + K, K, 4 * K);
    }
  }

  // Scene cards
  SCENES.forEach((s, i) => {
    const x = fx(STARTS[i]!) + K;
    const w = s.durationInFrames * PX_PER_FRAME - 2 * K;
    const y = SCENE_TOP + PAD_TOP;
    const h = SCENE_H - PAD_TOP - PAD_BOTTOM;
    const sel = selected && i === PICK;
    rr(g, x, y, w, h, 6 * K);
    g.fillStyle = sel ? purple(0.16) : purple(0.06);
    g.fill();
    g.lineWidth = K;
    g.strokeStyle = sel ? `rgb(${APP.purple})` : purple(0.25);
    g.stroke();
    // Title (left) + duration (right), one row, px-2 pt-1. The card is
    // overflow-hidden and both the icon and the duration are shrink-0, so on a
    // short card the duration is pushed off the right edge and clipped.
    g.save();
    rr(g, x, y, w, h, 6 * K);
    g.clip();
    const ty = y + 4 * K + 8 * K;
    font(g, 10, 400, true);
    const dur = `${(s.durationInFrames / FPS).toFixed(1)}s`;
    const dw = g.measureText(dur).width;
    g.fillStyle = APP.textTertiary;
    g.textAlign = "left";
    g.textBaseline = "middle";
    const minX = x + 8 * K + 14 * K + 8 * K; // after the icon + gap-2
    g.fillText(dur, Math.max(x + w - 8 * K - dw, minX), ty);
    const tc = sel ? `rgb(${APP.purple})` : purple(0.8);
    sceneIcon(g, x + 8 * K, ty - 7 * K, 14 * K, tc);
    font(g, 12, 500);
    g.textAlign = "left";
    g.fillStyle = tc;
    const room = w - 8 * K - 14 * K - 4 * K - 8 * K - dw - 8 * K;
    g.fillText(truncate(g, s.name ?? "", room), x + 8 * K + 14 * K + 4 * K, ty);
    g.restore();
  });

  // Audio lanes: border-t border/60, each row border-b border/40.
  g.fillStyle = "rgba(255,255,255,0.048)";
  g.fillRect(HEADER_W, LANES_TOP, W, K);
  for (let l = 0; l < LANES; l++) {
    g.fillStyle = "rgba(255,255,255,0.032)";
    g.fillRect(HEADER_W, LANES_TOP + (l + 1) * LANE_H - K, W, K);
  }
  // The music clip, lane 1, in lane 1's orange.
  for (const clip of project.audio) {
    const x = fx(clip.startFrame);
    const w = clip.durationInFrames * PX_PER_FRAME;
    const y = LANES_TOP + clip.track * LANE_H + 2 * K;
    const h = LANE_H - 4 * K;
    g.save();
    rr(g, x, y, w, h, 6 * K);
    g.fillStyle = orange(0.06);
    g.fill();
    g.clip();
    // Header: music icon + name.
    musicIcon(g, x + 6 * K, y + 2 * K + 1 * K, 12 * K, orange(0.8));
    font(g, 10, 500);
    g.fillStyle = orange(0.8);
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.fillText(clip.file.split("/").pop() ?? "", x + 6 * K + 12 * K + 4 * K, y + 2 * K + 7 * K);
    // Waveform strip under the header, flush to the floor.
    envelope(g, x, y + 16 * K, w, h - 16 * K, orange(0.55));
    // Fade-out ramp.
    const fo = (clip.fadeOutFrames ?? 0) * PX_PER_FRAME;
    if (fo > 0) {
      g.beginPath();
      g.moveTo(x + w, y + h);
      g.lineTo(x + w - fo, y + h);
      g.lineTo(x + w - fo, y);
      g.closePath();
      g.fillStyle = orange(0.45 * 0.25);
      g.fill();
    }
    g.restore();
    rr(g, x, y, w, h, 6 * K);
    g.lineWidth = K;
    g.strokeStyle = orange(0.25);
    g.stroke();
  }
  // "＋ Audio" chip, pinned top-left of the lanes.
  const ax = HEADER_W + 4 * K;
  const ay = LANES_TOP + 4 * K;
  font(g, 9.8, 500);
  const aw = g.measureText("＋ Audio").width + 12 * K;
  rr(g, ax, ay, aw, 18 * K, 6 * K);
  g.fillStyle = "rgba(23,23,27,0.95)";
  g.fill();
  g.lineWidth = K;
  g.strokeStyle = APP.border;
  g.stroke();
  g.fillStyle = APP.textSecondary;
  g.textAlign = "left";
  g.textBaseline = "middle";
  g.fillText("＋ Audio", ax + 6 * K, ay + 9 * K);
}

/** A small canvas-backed plane we can redraw (timecodes, the hover badge). */
function overlay(ctx: ThreeSceneContext, wPx: number, hPx: number, name: string) {
  const c = new OffscreenCanvas(wPx, hPx);
  const g = c.getContext("2d")!;
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ctx.renderer.capabilities.getMaxAnisotropy();
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wPx / 1000, hPx / 1000), mat);
  m.name = name;
  let last = "";
  return {
    mesh: m,
    mat,
    draw(key: string, paint: (g: G) => void) {
      if (key === last) return;
      last = key;
      g.clearRect(0, 0, wPx, hPx);
      paint(g);
      t.needsUpdate = true;
    },
  };
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera } = ctx;
  const film = createFilm(ctx, "#0b0b0d");
  addStudioLights(scene);
  createRoom(scene, [
    { x: 2.3, y: 1.0, z: -1.6, r: 1.2, b: 0.6 },
    { x: -2.2, y: 1.2, z: -2.6, r: 1.0, b: 0.35 },
  ]);
  const screen = createScreen(ctx, { name: "timeline", W, H, surround: APP.surface });
  scene.add(screen.group);

  // Transport timecodes (left) and frame readout (right), redrawn per frame.
  const tcL = overlay(ctx, 900, 90, "transport-timecode");
  screen.local(48 * K + 450, TRANSPORT_H / 2 - 4 * K, 0.001, tcL.mesh.position);
  const tcR = overlay(ctx, 700, 90, "transport-frame");
  screen.local(W - 48 * K - 350, TRANSPORT_H / 2 - 4 * K, 0.001, tcR.mesh.position);
  screen.group.add(tcL.mesh, tcR.mesh);

  // Playhead: accent line + head, with the light trail it shows while playing.
  const trail = Math.round(PX_PER_FRAME * FPS * 0.36);
  const phH = H - TL_TOP - 120;
  const phC = new OffscreenCanvas(trail + 60, phH);
  const pg = phC.getContext("2d")!;
  const ox = trail + 30; // the line's x inside the overlay
  const tg = pg.createLinearGradient(ox - trail, 0, ox, 0);
  tg.addColorStop(0, "rgba(59,110,246,0)");
  tg.addColorStop(1, "rgba(59,110,246,0.2)");
  pg.fillStyle = tg;
  pg.fillRect(ox - trail, 0, trail, phH);
  pg.shadowColor = "rgba(59,110,246,0.55)";
  pg.shadowBlur = 10 * K;
  pg.fillStyle = APP.accent;
  pg.fillRect(ox - K / 2, 0, K, phH);
  pg.shadowBlur = 0;
  pg.beginPath();
  pg.moveTo(ox - 5 * K, 0);
  pg.lineTo(ox + 5 * K, 0);
  pg.lineTo(ox, 6 * K);
  pg.closePath();
  pg.fill();
  const phT = new THREE.CanvasTexture(phC as unknown as HTMLCanvasElement);
  phT.colorSpace = THREE.SRGBColorSpace;
  phT.anisotropy = 8;
  const playhead = new THREE.Mesh(
    new THREE.PlaneGeometry(phC.width / 1000, phH / 1000),
    new THREE.MeshBasicMaterial({ map: phT, transparent: true, depthWrite: false, toneMapped: false }),
  );
  playhead.name = "playhead";
  playhead.renderOrder = 4;
  screen.group.add(playhead);

  // Ghost playhead under the pointer: scrub-red line + timecode badge.
  const hov = overlay(ctx, 200, phH, "hover-indicator");
  hov.mesh.renderOrder = 3;
  screen.group.add(hov.mesh);

  const cursor = createCursor(ctx, 20 * K, 1000);
  screen.group.add(cursor);

  const pickX = fx(STARTS[PICK]!) + SCENES[PICK]!.durationInFrames * PX_PER_FRAME * 0.42;
  const pickY = SCENE_TOP + SCENE_H / 2 + 6 * K;
  const target = new THREE.Vector3();
  const focus = new THREE.Vector3();

  return ({ frame, time }) => {
    const now = START + frame;
    const selected = frame >= CLICK;
    const band = interpolate(frame, [CLICK, CLICK + 9], [0, 1], Easing.easeOut);
    screen.draw(`${selected}|${band.toFixed(2)}`, (g) => paintTimeline(g, selected, band));

    tcL.draw(String(now), (g) => {
      g.font = `400 ${12 * K}px ${MONO}`;
      g.textBaseline = "middle";
      g.textAlign = "left";
      g.fillStyle = APP.textSecondary;
      const a = `${timecode(now)} `;
      g.fillText(a, 0, 45);
      g.fillStyle = APP.textTertiary;
      g.fillText(`/ ${timecode(TOTAL)}`, g.measureText(a).width, 45);
    });
    tcR.draw(String(now), (g) => {
      g.font = `400 ${11 * K}px ${MONO}`;
      g.textBaseline = "middle";
      g.textAlign = "right";
      g.fillStyle = APP.textTertiary;
      g.fillText(`frame ${now} · ${FPS}fps`, 700, 45);
    });

    screen.local(fx(now) - ox + phC.width / 2, TL_TOP + K + phH / 2, 0.003, playhead.position);

    // Pointer: in from below-right, onto the montage card, click.
    const cx = interpolate(frame, [0, 8], [pickX + 520, pickX], Easing.easeOut);
    const cy = interpolate(frame, [0, 8], [LANES_TOP + 260, pickY], Easing.easeOut);
    const press = frame >= CLICK && frame < CLICK + 2 ? 0.9 : 1;
    cursor.scale.setScalar(press);
    screen.local(cx, cy, 0.006, cursor.position);

    const inTrack = cy < LANES_TOP + LANES * LANE_H && cy > TL_TOP;
    hov.mat.opacity = inTrack ? 1 : 0;
    const hf = Math.max(0, Math.min(TOTAL - 1, Math.round((cx - X0) / PX_PER_FRAME)));
    hov.draw(String(hf), (g) => {
      g.fillStyle = APP.scrub;
      g.fillRect(0, 0, K, phH);
      g.beginPath();
      g.moveTo(-4 * K + K / 2, 0);
      g.lineTo(4 * K + K / 2, 0);
      g.lineTo(K / 2, 5 * K);
      g.closePath();
      g.fill();
      g.font = `400 ${9 * K}px ${MONO}`;
      const label = timecode(hf).slice(0, 5);
      const bw = g.measureText(label).width + 8 * K;
      rr(g, 4 * K, 0, bw, 14 * K, 2 * K);
      g.fill();
      g.fillStyle = APP.background;
      g.textBaseline = "middle";
      g.textAlign = "left";
      g.fillText(label, 8 * K, 7 * K + 1);
    });
    screen.local(X0 + hf * PX_PER_FRAME + 100, TL_TOP + K + phH / 2, 0.0025, hov.mesh.position);

    // Low, rolled, tracking right along the scene cards toward the pick.
    const tx = interpolate(frame, [0, 21], [fx(START) - 260, fx(START) + 120], Easing.easeInOut);
    screen.world(tx, SCENE_TOP + 40 * K, 0, target);
    aim(camera, target, 0.95, -16, -14, -7);
    handheld(camera, time, 1.2, 9);
    // Focus racks from the playhead to the card being picked.
    const ffx = interpolate(frame, [3, CLICK], [fx(now), pickX], Easing.easeInOut);
    screen.world(ffx, SCENE_TOP + 20 * K, 0, focus);
    film.render(frame, focus, 50);
  };
}
