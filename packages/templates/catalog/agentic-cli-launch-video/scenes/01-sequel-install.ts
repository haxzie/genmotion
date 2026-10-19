/**
 * Sequel CLI — one continuous 13.8 s shot, timed beat-for-beat to the reference.
 *
 *  0.00  halftone field, dock            0.42  terminal blooms out of a dot
 *  0.85  types `npx @sequelsh/cli install` 1.58  SEQUEL banner glitches in
 *  1.72  pull back to the whole window     1.93  detected agents list out
 *  2.80  prompt, select-all, confirm       3.25  checks ripple down (dock bumps)
 *  4.00  summary                           4.35  scroll + dim, second command
 *  5.75  cursor clicks each agent in the dock -> `install <slug>` ✓, accelerating
 *  8.95  window genies into the dock       9.32  agents leave the dock
 * 10.25  Sequel tile becomes the logo     10.50  pill + wordmark + typed command
 * 11.28  tagline                          13.80  end (audio fades from 11.7)
 *
 * All times are in seconds, so the film holds its timing at any fps.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { AGENTS, C, COMMAND, FONTS, FONT_MONO, FONT_SANS, LOGO_GRADIENT, SEQUEL_ICON, TAGLINE } from "../components/brand";
import { halftone } from "../components/halftone";
// One plan for picture and sound: assets/typing.mp3 is built from these exact key times.
import typingPlan from "../assets/typing.timing.json";
import {
  RRect, U, backOut, clamp01, drawn, easeIn, easeInOut, easeOut, expoOut, image, lin, mix, text, withFonts,
  type Text,
} from "../components/kit";

/* ----------------------------------------------------------------- layout */

const WIN = { x: 0, y: 73, w: 1200, h: 886 };
const WIN_TOP = WIN.y + WIN.h / 2; // 516
const CL = WIN.x - WIN.w / 2 + 44; // content left
const LH = 36; // line height
const FS = 26; // terminal font size
const lineY = (k: number) => WIN_TOP - 78 - k * LH;
const IND = 26; // indent inside the bracket

const DOCK_Y = -470;
const TILE = 84;
const TILE_GAP = 14;
const DOCK_PAD = 15;
const SEP = 36; // separator slot
const DOCK_W = DOCK_PAD * 2 + TILE + SEP + AGENTS.length * TILE + (AGENTS.length - 1) * TILE_GAP;
const DOCK_L = -DOCK_W / 2;
const SEQ_X = DOCK_L + DOCK_PAD + TILE / 2;
const tileX = (i: number) => DOCK_L + DOCK_PAD + TILE + SEP + TILE / 2 + i * (TILE + TILE_GAP);

/* ----------------------------------------------------------------- timing */

const T = {
  blob: 0.42,
  open: 0.52,
  opened: 0.78,
  type0: [0.8, 1.46] as const,
  banner: 1.58,
  title: 1.93,
  detected: 2.0,
  row0: 2.12,
  rowStep: 0.075,
  question: 2.8,
  choice: 2.95,
  confirm: 3.17,
  check0: 3.25,
  checkStep: 0.085,
  summary: 4.0,
  scroll: [4.35, 4.6] as const,
  dim: [4.42, 4.66] as const,
  prompt2: 4.55,
  type2: [4.58, 5.58] as const,
  clicks: [5.75, 6.45, 7.25, 7.45, 7.63, 7.8, 7.98],
  spin: [0.24, 0.26, 0.07, 0.07, 0.07, 0.07, 0.22],
  fadeContent: [8.84, 8.97] as const,
  genie: 8.95,
  leave0: 9.32,
  leaveStep: 0.1,
  handoff: 10.25,
};

/** Camera keys: centre (stage px) and zoom; each segment eases in and out. */
const CAM: [number, number, number, number][] = [
  [0.0, 40, -205, 1.55],
  [0.42, -80, -212, 1.6], // hold on the dock while the Sequel tile launches the window
  [0.85, -296, 354, 2.6],
  [1.72, -255, 318, 2.45],
  [2.1, 0, 0, 1.0],
  [2.6, 23, -113, 1.3],
  [3.0, 0, -181, 1.48],
  [4.3, -10, -190, 1.52],
  [5.3, -63, -203, 1.62],
  [5.9, -97, -208, 1.67],
  [8.8, -80, -215, 1.62],
  [9.2, 0, -215, 1.6],
  [9.6, -150, -330, 1.8],
  [10.05, -300, DOCK_Y, 2.6],
  [T.handoff, SEQ_X, DOCK_Y, 2.6],
];
const END_Z = 2.6;

function camAt(t: number) {
  if (t <= CAM[0]![0]) return { x: CAM[0]![1], y: CAM[0]![2], zoom: CAM[0]![3] };
  for (let i = 0; i < CAM.length - 1; i++) {
    const a = CAM[i]!;
    const b = CAM[i + 1]!;
    if (t <= b[0]) {
      const k = easeInOut(lin(t, a[0], b[0]));
      return { x: mix(a[1], b[1], k), y: mix(a[2], b[2], k), zoom: Math.exp(mix(Math.log(a[3]), Math.log(b[3]), k)) };
    }
  }
  const z = CAM[CAM.length - 1]!;
  return { x: z[1], y: z[2], zoom: z[3] };
}

/**
 * Film time -> story time. The choreography above is written in the reference's
 * 13.8 s "story" clock; each typing moment is given one extra music bar (1.6 s)
 * so the keys run at a natural human pace. Inside those windows story time
 * slows (the camera keeps drifting), everywhere else it runs 1:1, shifted.
 * Breakpoints are (film, story); .audio-work/build_audio.py uses the same ones.
 */
const WARP: [number, number][] = [
  [0, 0],
  [0.8, 0.8], [3.06, 1.46], // first command
  [6.18, 4.58], [8.78, 5.58], // second command
  [13.96, 10.76], [16.14, 11.34], // end-card command
  [18.6, 13.8],
];
function storyTime(tf: number): number {
  for (let i = 0; i < WARP.length - 1; i++) {
    const [f0, s0] = WARP[i]!;
    const [f1, s1] = WARP[i + 1]!;
    if (tf <= f1) return s0 + ((tf - f0) / (f1 - f0)) * (s1 - s0);
  }
  return tf - 4.8;
}

const typed = (times: number[], t: number) => {
  let n = 0;
  while (n < times.length && times[n]! <= t) n++;
  return n;
};

/** A quick lift-and-settle, used for dock icons reacting. */
function bump(t: number, at: number, dur = 0.34) {
  const x = (t - at) / dur;
  if (x <= 0 || x >= 1) return 0;
  return Math.sin(Math.PI * Math.pow(x, 0.7)) * (1 - x * 0.3);
}

/* -------------------------------------------------------------- the scene */

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, FONTS, () => build(ctx));
}

function build(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, width, height } = ctx;
  scene.background = new THREE.Color(C.field);
  const aspect = width / height;
  const fit = Math.min(1, aspect / (16 / 9)); // keep the shot in narrower frames
  const D0 = 5.4 / Math.tan(THREE.MathUtils.degToRad(25));

  const mono = (size = FS) => ({ size, family: FONT_MONO, fallback: "Menlo, Monaco, monospace" });
  const sans = (size: number, weight = 500, tracking = -0.02) => ({
    size, family: FONT_SANS, weight, tracking, fallback: "-apple-system, Helvetica Neue, Arial, sans-serif",
  });
  const at = (o: THREE.Object3D, x: number, y: number, order: number) => {
    o.position.set(x * U, y * U, 0);
    o.renderOrder = order;
    return o;
  };

  const bg = halftone({ width, height });
  scene.add(bg.mesh);

  const stage = new THREE.Group();
  stage.name = "stage";
  scene.add(stage);

  /* ---------------- terminal window */
  const win = new THREE.Group();
  win.name = "terminal-window";
  stage.add(win);
  const winShadow = new RRect(WIN.w, WIN.h, 18, C.shadow, { soft: 40, opacity: 0.45 });
  const winBody = new RRect(WIN.w, WIN.h, 16, C.termTop, { colour2: C.term, border: C.termRim, borderW: 1.5, borderA: 0.7 });
  winShadow.mesh.renderOrder = 1;
  winBody.mesh.renderOrder = 2;
  winShadow.mesh.userData.pickable = false;
  winBody.mesh.name = "terminal-glass";
  win.add(winShadow.mesh, winBody.mesh);

  const chrome = new THREE.Group();
  chrome.name = "terminal-titlebar";
  win.add(chrome);
  const lights = ["#ff5f57", "#febc2e", "#28c840"].map((c, i) => {
    const r = new RRect(14, 14, 7, c);
    at(r.mesh, WIN.x - WIN.w / 2 + 24 + i * 22, WIN_TOP - 22, 3);
    r.mesh.name = ["close-light", "minimise-light", "zoom-light"][i]!;
    chrome.add(r.mesh);
    return r;
  });
  const zsh = text("zsh", { ...mono(20), anchor: "center" }, C.dim);
  zsh.mesh.name = "terminal-title";
  at(zsh.mesh, WIN.x + WIN.w / 2 - 70, WIN_TOP - 22, 3);
  chrome.add(zsh.mesh);

  /* ---------------- terminal content (scrolls) */
  const content = new THREE.Group();
  content.name = "terminal-output";
  win.add(content);
  const phase1: { t: Text | { mat: Text["mat"] }; at: number }[] = [];
  const line = (runs: Parameters<typeof text>[0], k: number, appear: number, name: string, x = CL, size = FS) => {
    const tx = text(runs, mono(size), C.text);
    tx.mesh.name = name;
    at(tx.mesh, x, lineY(k), 5);
    content.add(tx.mesh);
    phase1.push({ t: tx, at: appear });
    return tx;
  };

  // 1 — the first command
  const prompt0 = line([{ text: "~ % ", color: C.dim }, { text: COMMAND, color: C.text }], 0, T.opened - 0.06, "command-npx-sequelsh-cli-install");
  const type0: number[] = typingPlan.runs.cmd1;
  const caret = new RRect(FS * 0.6, FS * 1.15, 2, "#cdd2e4");
  caret.mesh.name = "caret";
  caret.mesh.renderOrder = 6;
  content.add(caret.mesh);

  // 2 — the SEQUEL banner (pixel letters, cyan-to-blue, scanlined)
  const GLYPHS: Record<string, string[]> = {
    S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
    E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
    Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
    U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  };
  const CELL = 25;
  const WORD = "SEQUEL";
  const bannerW = WORD.length * 5 * CELL + (WORD.length - 1) * CELL;
  const bannerH = 7 * CELL + 14;
  const drawBanner = (g: OffscreenCanvasRenderingContext2D, s: number, shadow: boolean) => {
    // the logo's gradient, laid diagonally across the whole word: pink top-left -> blue bottom-right
    const grad = g.createLinearGradient(0, 0, bannerW * s, 7 * CELL * s);
    grad.addColorStop(0, LOGO_GRADIENT.from);
    grad.addColorStop(1, LOGO_GRADIENT.to);
    g.fillStyle = shadow ? "#4a0e2e" : grad;
    [...WORD].forEach((ch, li) => {
      GLYPHS[ch]!.forEach((row, ry) => {
        [...row].forEach((c, rx) => {
          if (c !== "#") return;
          const x = (li * 6 * CELL + rx * CELL) * s;
          const y = (ry * CELL + (shadow ? 12 : 0)) * s;
          g.fillRect(x + (shadow ? 9 * s : 0), y, CELL * s, (CELL - 4) * s); // the 4px gap is the scanline
        });
      });
    });
  };
  const banner = new THREE.Group();
  banner.name = "sequel-banner";
  const bannerShadow = drawn(bannerW + 12, bannerH, (g, s) => drawBanner(g, s, true));
  const bannerFace = drawn(bannerW + 12, bannerH, (g, s) => drawBanner(g, s, false));
  const ghostA = drawn(bannerW + 12, bannerH, (g, s) => drawBanner(g, s, false));
  const ghostB = drawn(bannerW + 12, bannerH, (g, s) => drawBanner(g, s, false));
  ghostA.mat.uniforms.uTint.value.set("#ffffff");
  ghostB.mat.uniforms.uTint.value.set("#ffb38a");
  [bannerShadow, ghostA, ghostB, bannerFace].forEach((b, i) => {
    b.mesh.renderOrder = 5;
    b.mesh.position.x = ((bannerW + 12) / 2) * U;
    banner.add(b.mesh);
    b.mesh.name = ["banner-shadow", "banner-ghost-pink", "banner-ghost-cyan", "banner-letters"][i]!;
  });
  at(banner, CL, lineY(0) - 30 - bannerH / 2, 5);
  content.add(banner);
  const installTag = text(">  INSTALL", mono(22), C.accent);
  installTag.mesh.name = "banner-install-tag";
  at(installTag.mesh, CL + bannerW - installTag.width, lineY(0) - 30 - bannerH - 20, 5);
  content.add(installTag.mesh);
  phase1.push({ t: installTag, at: T.banner + 0.12 });

  // 3 — what the CLI found
  const bracket = new RRect(2, (16.1 - 7.1) * LH, 1, C.accent);
  bracket.mesh.name = "output-bracket";
  at(bracket.mesh, CL + 5, lineY(7.1) - ((16.1 - 7.1) * LH) / 2, 5);
  const bracketTick = new RRect(10, 2, 1, C.accent);
  bracketTick.mesh.name = "output-bracket-corner";
  at(bracketTick.mesh, CL + 9, lineY(7.1), 5);
  content.add(bracket.mesh, bracketTick.mesh);
  line("Install the Sequel MCP server and skill", 7.4, T.title, "line-install-sequel-mcp", CL + IND);
  line("Detected agents", 8.4, T.detected, "line-detected-agents", CL + IND);

  const ICON_COL = CL + IND + 20 + 15.6 * 21;
  const rows = AGENTS.map((a, i) => {
    const k = 9.4 + i;
    const r = line([{ text: "[ready] ", color: C.ready }, { text: a.name, color: C.text }], k, T.row0 + i * T.rowStep, `row-${a.slug}`, CL + IND + 24);
    const mini = miniTile(a.bg, a.icon, a.inset, 26);
    mini.group.name = `row-${a.slug}-icon`;
    at(mini.group, ICON_COL, lineY(k), 6);
    content.add(mini.group);
    const check = checkMark(22);
    check.mesh.name = `row-${a.slug}-check`;
    at(check.mesh, ICON_COL + 40, lineY(k), 6);
    content.add(check.mesh);
    return { r, mini, check };
  });

  // 4 — the select prompt
  const qY = 17.2;
  const diamond = text("◆", mono(), C.accent);
  const diamondHollow = text("◇", mono(), C.accent);
  [diamond, diamondHollow].forEach((d) => {
    at(d.mesh, CL - 2, lineY(qY), 5);
    content.add(d.mesh);
  });
  diamond.mesh.name = "prompt-diamond";
  diamondHollow.mesh.name = "prompt-diamond-done";
  const question = text("Which agents should Sequel install into?", mono(), C.text);
  question.mesh.name = "prompt-which-agents";
  at(question.mesh, CL + IND, lineY(qY), 5);
  content.add(question.mesh);
  const qBar = new RRect(2, LH * 0.9, 1, C.accent);
  qBar.mesh.name = "prompt-bar";
  at(qBar.mesh, CL + 6, lineY(qY + 1), 5);
  content.add(qBar.mesh);
  const dot = text("●", mono(20), C.accent);
  dot.mesh.name = "choice-dot";
  at(dot.mesh, CL + IND, lineY(qY + 1), 5);
  content.add(dot.mesh);
  const choice = text("Install into all ready agents", mono(), "#ffffff");
  choice.mesh.name = "choice-install-all";
  const choiceX = CL + IND + 26;
  at(choice.mesh, choiceX, lineY(qY + 1), 6);
  content.add(choice.mesh);
  const choiceHi = new RRect(choice.width + 12, LH - 4, 4, C.select);
  choiceHi.mesh.name = "choice-highlight";
  at(choiceHi.mesh, choiceX + choice.width / 2, lineY(qY + 1), 5);
  content.add(choiceHi.mesh);
  const count = text(`${AGENTS.length} ready`, mono(), C.dim);
  count.mesh.name = "choice-count";
  at(count.mesh, choiceX + choice.width + 26, lineY(qY + 1), 5);
  content.add(count.mesh);
  const summary = line("Sequel install summary", 19.7, T.summary, "line-install-summary");

  // 5 — the second command, one agent at a time
  const p2k = 21.7;
  const prompt2 = text([{ text: "~ % ", color: C.dim }, { text: COMMAND + " ", color: C.text }], mono(), C.text);
  prompt2.mesh.name = "command-install-agent";
  at(prompt2.mesh, CL, lineY(p2k), 5);
  content.add(prompt2.mesh);
  const type2: number[] = typingPlan.runs.cmd2;
  const chipX = CL + prompt2.xAt(4 + COMMAND.length + 1) + 2;
  const chip = new RRect(10, LH - 4, 5, C.chip);
  chip.mesh.name = "agent-chip";
  chip.mesh.renderOrder = 5;
  content.add(chip.mesh);
  const slugs = AGENTS.map((a) => {
    const s = text(a.slug, mono(), "#ffffff");
    s.mesh.name = `chip-${a.slug}`;
    at(s.mesh, chipX + 8, lineY(p2k), 6);
    content.add(s.mesh);
    return s;
  });
  const spinner = new RRect(22, 22, 11, "#ffd2c2");
  spinner.mesh.name = "install-spinner";
  spinner.mesh.renderOrder = 6;
  content.add(spinner.mesh);
  const doneIcons = AGENTS.map((a) => {
    const m = miniTile(a.bg, a.icon, a.inset, 26);
    m.group.name = `installed-${a.slug}-icon`;
    m.group.renderOrder = 6;
    content.add(m.group);
    return m;
  });
  const doneCheck = checkMark(22);
  doneCheck.mesh.name = "installed-check";
  doneCheck.mesh.renderOrder = 6;
  content.add(doneCheck.mesh);

  /* ---------------- dock */
  const dock = new THREE.Group();
  dock.name = "dock";
  stage.add(dock);
  const dockShadow = new RRect(DOCK_W, 114, 32, C.shadow, { soft: 26, opacity: 0.35 });
  dockShadow.mesh.userData.pickable = false;
  const dockBody = new RRect(DOCK_W, 114, 30, C.dock, { colour2: C.dock2, border: C.dockRim, borderW: 2.5, borderA: 0.85, opacity: 0.6 });
  dockBody.mesh.name = "dock-shelf";
  at(dockShadow.mesh, 0, DOCK_Y - 10, 9);
  at(dockBody.mesh, 0, DOCK_Y, 10);
  dock.add(dockShadow.mesh, dockBody.mesh);
  const sep = new RRect(2, 66, 1, "#ffffff", { opacity: 0.45 });
  sep.mesh.name = "dock-separator";
  at(sep.mesh, DOCK_L + DOCK_PAD + TILE + SEP / 2, DOCK_Y, 11);
  dock.add(sep.mesh);

  const seqTile = sequelTile(TILE);
  seqTile.group.name = "dock-sequel";
  at(seqTile.group, SEQ_X, DOCK_Y, 13); // drawn above the agents so they drop into it
  dock.add(seqTile.group);
  const seqPip = new RRect(5, 5, 2.5, "#ffffff", { opacity: 0 });
  seqPip.mesh.name = "dock-sequel-running";
  at(seqPip.mesh, SEQ_X, DOCK_Y - 50, 12);
  dock.add(seqPip.mesh);
  const tiles = AGENTS.map((a, i) => {
    const tl = miniTile(a.bg, a.icon, a.inset, TILE, 20);
    tl.group.name = `dock-${a.slug}`;
    at(tl.group, tileX(i), DOCK_Y, 11);
    dock.add(tl.group);
    const pip = new RRect(5, 5, 2.5, "#ffffff", { opacity: 0.85 });
    pip.mesh.name = `dock-${a.slug}-running`;
    at(pip.mesh, tileX(i), DOCK_Y - 50, 12);
    dock.add(pip.mesh);
    return { tl, pip };
  });

  /* ---------------- pointer */
  const pointer = drawn(44, 50, (g, s) => {
    g.scale(s * 1.75, s * 1.75);
    g.translate(2, 2);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, 17.5);
    g.lineTo(4.4, 13.6);
    g.lineTo(7.4, 20.4);
    g.lineTo(10.2, 19.2);
    g.lineTo(7.3, 12.6);
    g.lineTo(13, 12.6);
    g.closePath();
    g.fillStyle = "#0b0b0f";
    g.strokeStyle = "#ffffff";
    g.lineWidth = 1.4;
    g.lineJoin = "round";
    g.fill();
    g.stroke();
  });
  pointer.mesh.geometry.translate((22 - 3.5) * U, (-25 + 3.5) * U, 0); // tip at the origin
  pointer.mesh.name = "mouse-pointer";
  pointer.mesh.renderOrder = 20;
  const pointerLayer = new THREE.Group();
  pointerLayer.name = "pointer-layer";
  pointerLayer.renderOrder = 100; // group order beats the dock tiles' group order (11)
  pointerLayer.add(pointer.mesh);
  stage.add(pointerLayer);

  /* ---------------- end card (screen px, locked to the camera) */
  const card = new THREE.Group();
  card.name = "end-card";
  card.visible = false;
  scene.add(card);
  const cardTile = sequelTile(TILE * END_Z, true);
  cardTile.group.name = "end-sequel-tile";
  cardTile.group.renderOrder = 30;
  card.add(cardTile.group);

  const word = text("sequel", sans(132, 600, -0.035), "#ffffff");
  word.mesh.name = "wordmark-sequel";
  const MARK = 98;
  const GAP = 30;
  const lockW = MARK + GAP + word.width;
  const markEndX = -lockW / 2 + MARK / 2;
  const LOCK_Y = 46;
  at(word.mesh, -lockW / 2 + MARK + GAP, LOCK_Y - 4, 32);
  card.add(word.mesh);

  const PILL_Y = -128;
  const pillText = text([{ text: "› ", color: C.field }, { text: COMMAND, color: C.pillText }], mono(56), C.pillText);
  const PILL_W = pillText.width + 120;
  const PILL_H = 128;
  const pillShadow = new RRect(PILL_W, PILL_H, 64, "#8a1236", { soft: 22, opacity: 0.35 });
  pillShadow.mesh.userData.pickable = false;
  const pill = new RRect(PILL_W, PILL_H, 64, C.pill, { colour2: C.pill2, border: "#ffffff", borderW: 4, borderA: 0.95 });
  pill.mesh.name = "command-pill";
  at(pillShadow.mesh, 0, PILL_Y - 10, 30);
  at(pill.mesh, 0, PILL_Y, 31);
  pillText.mesh.name = "pill-npx-sequelsh-cli-install";
  at(pillText.mesh, -pillText.width / 2, PILL_Y, 32);
  card.add(pillShadow.mesh, pill.mesh, pillText.mesh);
  const typeEnd: number[] = typingPlan.runs.end;

  const tagline = text(TAGLINE, { ...sans(60, 450, -0.01), anchor: "center" }, "#ffffff"); // 60px: white clears 3:1 on the warm field
  tagline.mesh.name = "tagline-give-your-agents-live-data";
  at(tagline.mesh, 0, 196, 32);
  card.add(tagline.mesh);

  const TERM = new THREE.Color(C.term);
  const LAV = new THREE.Color("#ffc0a8");
  const WHITE = new THREE.Color("#ffffff");
  const lav = new THREE.Color();
  const lavTop = new THREE.Color();

  /* ---------------- per-frame */
  return ({ time: tf }) => {
    const t = storyTime(tf); // choreography clock; typing reads film time `tf`
    /* camera */
    const cam = camAt(t);
    const z = cam.zoom * fit;
    camera.position.set(cam.x * U, cam.y * U, D0 / z);
    camera.lookAt(cam.x * U, cam.y * U, 0);
    bg.set({ x: cam.x, y: cam.y, zoom: z }, tf, easeInOut(lin(t, 8.97, 9.08)), easeInOut(lin(t, 9.72, 10.1)));

    /* window: dot -> window -> genie into the dock */
    let wx = WIN.x;
    let wy = WIN.y;
    let ww = WIN.w;
    let wh = WIN.h;
    let wr = 16;
    let wOpacity = 1;
    lav.copy(TERM);
    if (t < T.opened) {
      // launched from the Sequel app in the dock: a tile-sized dark panel
      // lifts off the icon, then opens out into the window
      const lift = easeOut(lin(t, T.blob, T.blob + 0.04));
      const grow = easeInOut(lin(t, T.blob + 0.02, T.opened));
      const move = easeInOut(lin(t, T.blob + 0.01, T.opened));
      ww = mix(TILE, WIN.w, grow);
      wh = mix(TILE, WIN.h, grow);
      wx = mix(SEQ_X, WIN.x, move);
      wy = mix(DOCK_Y, WIN.y, move);
      wr = mix(20, 16, grow);
      wOpacity = t < T.blob ? 0 : lift;
    } else if (t >= T.genie) {
      const a = easeIn(lin(t, T.genie, 9.07));
      const b = easeInOut(lin(t, 9.07, 9.18));
      const c = easeIn(lin(t, 9.18, 9.3));
      ww = mix(mix(WIN.w, 170, a), 40, b);
      wh = mix(mix(WIN.h, 320, a), 300, b) * (1 - c);
      wx = mix(WIN.x, -150, a);
      wy = mix(mix(WIN.y, -240, a), -230, b) - c * 160;
      wr = mix(16, 20, a);
      lav.lerp(LAV, b);
      wOpacity = 1 - c;
    }
    win.renderOrder = t < T.opened ? 15 : 0;
    winBody.setSize(ww, wh);
    winBody.mat.uniforms.uRadius.value = wr;
    winBody.colour(lavTop.copy(lav).lerp(WHITE, 0.02), lav);
    winBody.opacity = wOpacity * 0.97;
    winShadow.setSize(ww, wh);
    winShadow.opacity = wOpacity * 0.45;
    winBody.mesh.position.set(wx * U, wy * U, 0);
    winShadow.mesh.position.set(wx * U, (wy - 24) * U, 0);

    const chromeA = lin(t, T.opened - 0.1, T.opened) * (1 - lin(t, 8.86, 8.95));
    lights.forEach((l) => (l.opacity = chromeA));
    zsh.mat.uniforms.uOpacity.value = chromeA;

    /* content */
    const scroll = easeInOut(lin(t, T.scroll[0], T.scroll[1])) * 108;
    content.position.y = scroll * U;
    const fade = 1 - lin(t, T.fadeContent[0], T.fadeContent[1]);
    const dim = mix(1, 0.2, easeInOut(lin(t, T.dim[0], T.dim[1])));
    const show = (start: number) => lin(t, start, start + 0.035);
    for (const p of phase1) p.t.mat.uniforms.uOpacity.value = show(p.at) * dim * fade;

    // typing the first command
    prompt0.showChars(4 + typed(type0, tf));
    const typingDone0 = t >= T.banner - 0.02;
    const blink = (from: number) => (Math.floor((t - from) / 0.5) % 2 === 0 ? 1 : 0.0);
    if (t < T.type0[0]) {
      caret.opacity = (t > T.opened ? blink(T.opened) : 0) * fade;
    } else caret.opacity = typingDone0 ? 0 : 1;
    let caretX = CL + prompt0.xAt(4 + typed(type0, tf));
    let caretK = 0;
    // second command's caret
    if (t >= T.prompt2) {
      const n = typed(type2, tf);
      prompt2.showChars(4 + n);
      caretX = CL + prompt2.xAt(4 + n);
      caretK = p2k;
      const typing = t >= T.type2[0] && t < T.type2[1] + 0.05;
      caret.opacity = (t < T.clicks[0]! ? (typing ? 1 : blink(T.prompt2)) : 0) * fade;
    }
    caret.mesh.position.set((caretX + FS * 0.3) * U, lineY(caretK) * U, 0);
    prompt2.mat.uniforms.uOpacity.value = (t >= T.prompt2 ? 1 : 0) * fade;

    // banner glitch-in
    const bIn = lin(t, T.banner, T.banner + 0.17);
    const glitch = t >= T.banner && t < T.banner + 0.32 ? 1 - lin(t, T.banner + 0.12, T.banner + 0.32) : 0;
    const fq = Math.floor(t * 30);
    const jit = (s: number) => (Math.sin(fq * 12.9898 + s * 78.233) * 43758.5453) % 1;
    const bA = (t >= T.banner ? 1 : 0) * dim * fade;
    bannerFace.mat.uniforms.uReveal.value = easeOut(bIn);
    bannerFace.mat.uniforms.uBlur.value = glitch * 0.03;
    bannerFace.mat.uniforms.uOpacity.value = bA;
    bannerShadow.mat.uniforms.uReveal.value = easeOut(lin(t, T.banner + 0.03, T.banner + 0.2));
    bannerShadow.mat.uniforms.uOpacity.value = bA;
    ghostA.mat.uniforms.uReveal.value = easeOut(bIn) + 0.06;
    ghostB.mat.uniforms.uReveal.value = easeOut(bIn) + 0.1;
    ghostA.mat.uniforms.uOpacity.value = bA * glitch * 0.55;
    ghostB.mat.uniforms.uOpacity.value = bA * glitch * 0.55;
    ghostA.mesh.position.x = ((bannerW + 12) / 2 + jit(1) * 40) * U;
    ghostB.mesh.position.x = ((bannerW + 12) / 2 - jit(2) * 46) * U;
    bannerFace.mesh.position.x = ((bannerW + 12) / 2 + glitch * jit(3) * 14) * U;

    // bracket + rows + checks
    const bracketA = show(T.title) * dim * fade;
    bracket.opacity = bracketA;
    bracketTick.opacity = bracketA;
    bracket.setSize(2, Math.max(2, (16.1 - 7.1) * LH * clamp01((t - T.title) / (T.row0 + 6 * T.rowStep + 0.1 - T.title))));
    bracket.mesh.position.y = (lineY(7.1) - bracket.h / 2) * U;
    rows.forEach((row, i) => {
      const a = show(T.row0 + i * T.rowStep) * dim * fade;
      row.mini.setOpacity(a);
      const ct = T.check0 + i * T.checkStep;
      const ck = lin(t, ct, ct + 0.1);
      row.check.mat.uniforms.uOpacity.value = ck * dim * fade;
      row.check.mat.uniforms.uReveal.value = easeOut(ck) * 1.02;
    });

    // the select prompt
    const qA = show(T.question) * fade;
    const confirmed = t >= T.confirm;
    diamond.mat.uniforms.uOpacity.value = qA * (confirmed ? 0 : 1) * dim;
    diamondHollow.mat.uniforms.uOpacity.value = qA * (confirmed ? 1 : 0) * dim;
    question.mat.uniforms.uOpacity.value = qA * dim * (confirmed ? 0.62 : 1);
    qBar.opacity = show(T.choice) * fade * dim;
    const cA = show(T.choice) * fade;
    dot.mat.uniforms.uOpacity.value = cA * (confirmed ? 0 : 1);
    choiceHi.opacity = cA * (confirmed ? 0 : 1);
    count.mat.uniforms.uOpacity.value = cA * (confirmed ? 0 : 1);
    choice.mat.uniforms.uOpacity.value = cA * dim * (confirmed ? 0.8 : 1);
    choice.mesh.position.x = (choiceX - (confirmed ? 0 : 0)) * U;
    summary.mat.uniforms.uOpacity.value = show(T.summary) * dim * fade;

    // chips: which agent is current, its type-on, spinner, icon, check
    let cur = -1;
    for (let i = 0; i < T.clicks.length; i++) if (t >= T.clicks[i]!) cur = i;
    slugs.forEach((s, i) => (s.mat.uniforms.uOpacity.value = i === cur ? fade : 0));
    doneIcons.forEach((d) => d.setOpacity(0));
    if (cur >= 0) {
      const c0 = T.clicks[cur]!;
      const s = slugs[cur]!;
      const len = AGENTS[cur]!.slug.length;
      const n = Math.min(len, Math.floor(((t - c0) / 0.012) + 1));
      s.showChars(n);
      const prevW = cur > 0 ? slugs[cur - 1]!.width : 0;
      const cw = mix(prevW, s.width, expoOut(lin(t, c0, c0 + 0.08))) + 16;
      chip.setSize(cw, LH - 4);
      chip.mesh.position.set((chipX + cw / 2) * U, lineY(p2k) * U, 0);
      chip.opacity = fade;
      const statusX = chipX + cw + 22;
      const spinOn = t < c0 + T.spin[cur]!;
      spinner.opacity = spinOn ? fade * (0.75 + 0.25 * Math.sin((t - c0) * 40)) : 0;
      spinner.mesh.position.set(statusX * U, lineY(p2k) * U, 0);
      const done = !spinOn;
      const di = doneIcons[cur]!;
      di.setOpacity(done ? fade : 0);
      di.group.position.set(statusX * U, lineY(p2k) * U, 0);
      const ckT = c0 + T.spin[cur]! + 0.04;
      const ck = lin(t, ckT, ckT + 0.08);
      doneCheck.mat.uniforms.uOpacity.value = ck * fade;
      doneCheck.mat.uniforms.uReveal.value = easeOut(ck) * 1.02;
      doneCheck.mesh.position.set((statusX + 38) * U, lineY(p2k) * U, 0);
    } else {
      chip.opacity = 0;
      spinner.opacity = 0;
      doneCheck.mat.uniforms.uOpacity.value = 0;
    }

    /* dock: bumps, then agents leave one by one */
    const shelfHide = 1 - lin(t, 10.08, 10.25);
    // exit: right to left, each agent hops in an arc and drops into the Sequel icon
    const JUMP = 0.26;
    const leaveAt = (i: number) => T.leave0 + (tiles.length - 1 - i) * T.leaveStep;
    let departed = 0;
    let gulp = 0;
    tiles.forEach((tile, i) => {
      const lt = leaveAt(i);
      departed += easeInOut(lin(t, lt + 0.04, lt + 0.2));
      gulp = Math.max(gulp, bump(t, lt + JUMP - 0.02, 0.2));
    });
    tiles.forEach((tile, i) => {
      const lt = leaveAt(i);
      const u = lin(t, lt, lt + JUMP);
      const travel = easeInOut(u);
      const dist = tileX(i) - SEQ_X;
      const arc = (70 + 0.14 * dist) * 4 * u * (1 - u);
      const b = Math.max(bump(t, T.check0 + i * T.checkStep, 0.3) * 0.7, bump(t, T.clicks[i]!, 0.36));
      const press = t >= T.clicks[i]! - 0.05 && t < T.clicks[i]! ? 0.93 : 1;
      const crouch = t >= lt - 0.05 && t < lt ? 0.94 : 1; // a little squat before the hop
      const s = (1 + 0.12 * b) * press * crouch * mix(1, 0.32, easeIn(u));
      tile.tl.group.scale.setScalar(s);
      tile.tl.group.rotation.z = 0.35 * Math.sin(Math.PI * u);
      tile.tl.group.position.set(mix(tileX(i), SEQ_X, travel) * U, (DOCK_Y + 16 * b + arc) * U, 0);
      tile.tl.setOpacity(1 - lin(u, 0.72, 1));
      tile.pip.opacity = 0.85 * (1 - lin(t, lt, lt + 0.08));
    });
    const launch = bump(t, 0.2, 0.3);
    const seqPress = t >= 0.14 && t < 0.2 ? 0.93 : 1;
    if (t < T.handoff) {
      // the Sequel icon swallows each agent with a small squash
      seqTile.group.scale.setScalar((1 + 0.1 * launch + 0.09 * gulp) * seqPress);
      seqTile.group.position.y = (DOCK_Y + 18 * launch - 6 * gulp) * U;
    }
    seqPip.opacity = 0.85 * lin(t, 0.3, 0.36) * shelfHide;
    const dw = DOCK_W - departed * (TILE + TILE_GAP) - lin(t, 9.9, 10.05) * SEP;
    const shellW = mix(dw, TILE + 2 * DOCK_PAD, easeInOut(lin(t, 10.05, 10.2)));
    dockBody.setSize(shellW, 114);
    dockShadow.setSize(shellW, 114);
    dockBody.mesh.position.x = (DOCK_L + shellW / 2) * U;
    dockShadow.mesh.position.x = (DOCK_L + shellW / 2) * U;
    dockBody.opacity = 0.6 * shelfHide;
    dockShadow.opacity = 0.35 * shelfHide;
    sep.opacity = 0.45 * (1 - lin(t, 9.9, 10.0));
    dock.visible = t < T.handoff;
    stage.visible = t < T.handoff + 0.01;

    /* pointer */
    const P = (i: number) => ({ x: tileX(i) + 10, y: DOCK_Y - 14 });
    let px = tileX(3) + 120;
    let py = DOCK_Y - 300;
    let pA = 0;
    if (t >= 5.2 && t < 9.0) {
      pA = lin(t, 5.2, 5.3) * (1 - lin(t, 8.85, 8.98));
      if (t < T.clicks[0]! - 0.04) {
        const k = easeInOut(lin(t, 5.2, T.clicks[0]! - 0.04));
        px = mix(tileX(2) + 160, P(0).x, k);
        py = mix(DOCK_Y - 260, P(0).y, k);
      } else {
        let i = 0;
        while (i < T.clicks.length - 1 && t >= T.clicks[i + 1]! - 0.03) i++;
        const from = P(i);
        const to = P(Math.min(i + 1, T.clicks.length - 1));
        const k = i < T.clicks.length - 1 ? easeInOut(lin(t, T.clicks[i]! + 0.05, T.clicks[i + 1]! - 0.03)) : 0;
        px = mix(from.x, to.x, k);
        py = mix(from.y, to.y, k) + 8 * Math.sin(Math.PI * k);
      }
    }
    pointer.mat.uniforms.uOpacity.value = pA;
    pointer.mesh.position.set(px * U, py * U, 0);

    /* end card */
    const showCard = t >= T.handoff;
    card.visible = showCard;
    if (showCard) {
      const ez = END_Z * fit;
      card.position.set(cam.x * U, cam.y * U, 0);
      card.scale.setScalar(1 / ez);

      // tile: shrink and float up, then dissolve into the mark
      const shrink = backOut(lin(t, T.handoff, 10.48), 1.2);
      const tileSize = mix(TILE * END_Z, 124, shrink);
      const toMark = easeInOut(lin(t, 10.46, 10.6));
      const slide = expoOut(lin(t, 10.6, 10.86));
      const tY = mix(0, LOCK_Y - 4, shrink); // ring spans ascender-to-baseline of "sequel"
      cardTile.group.scale.setScalar(tileSize / (TILE * END_Z));
      cardTile.group.position.set(mix(0, markEndX, slide) * U, tY * U, 0);
      cardTile.setBg(1 - toMark);
      cardTile.setGlyphScale(mix(0.56, MARK / tileSize, toMark));

      // wordmark wipes in with a blur that settles
      const wIn = lin(t, 10.62, 10.9);
      word.mat.uniforms.uReveal.value = easeOut(wIn) * 1.02;
      word.mat.uniforms.uBlur.value = (1 - easeOut(wIn)) * 0.02;
      word.mat.uniforms.uOpacity.value = wIn > 0 ? 1 : 0;

      // pill grows, then types the command
      const pg = expoOut(lin(t, 10.5, 10.8));
      const pw = mix(260, PILL_W, pg);
      const ph = mix(52, PILL_H, easeOut(lin(t, 10.5, 10.66)));
      const pAlpha = lin(t, 10.48, 10.54);
      pill.setSize(pw, ph);
      pillShadow.setSize(pw, ph);
      pill.opacity = pAlpha;
      pillShadow.opacity = 0.35 * pAlpha;
      const chev = t >= 10.72 ? 2 : 0;
      pillText.showChars(chev + typed(typeEnd, tf));
      pillText.mat.uniforms.uOpacity.value = t >= 10.72 ? 1 : 0;

      // tagline
      const tg = lin(t, 11.28, 11.62);
      tagline.mat.uniforms.uReveal.value = easeOut(tg) * 1.05;
      tagline.mat.uniforms.uBlur.value = (1 - easeOut(tg)) * 0.012;
      tagline.mat.uniforms.uOpacity.value = tg > 0 ? 1 : 0;
      tagline.mesh.position.y = (196 - 14 * (1 - easeOut(tg))) * U;

      // the hold breathes very slightly
      const breathe = 1 + 0.008 * easeInOut(lin(t, 11.6, 13.8));
      card.scale.multiplyScalar(breathe);
    }
  };

  /* ---------------- local factories */
  function miniTile(bgCol: string, url: string, inset: number, size: number, radius = size * 0.24) {
    const group = new THREE.Group();
    const back = new RRect(size, size, radius, bgCol, { border: "#ffffff", borderW: size > 40 ? 1.5 : 0, borderA: 0.12 });
    back.mesh.renderOrder = 11;
    const ic = image(ctx, url, size * (1 - inset * 2), size * (1 - inset * 2));
    ic.mesh.renderOrder = 12;
    back.mesh.name = "tile-back";
    ic.mesh.name = "tile-glyph";
    group.add(back.mesh, ic.mesh);
    return {
      group,
      setOpacity(a: number) {
        back.opacity = a;
        ic.mat.uniforms.uOpacity.value = a;
      },
    };
  }

  function sequelTile(size: number, endCard = false) {
    const group = new THREE.Group();
    const back = new RRect(size, size, size * 0.24, LOGO_GRADIENT.to, {
      colour2: LOGO_GRADIENT.from,
      gradDir: LOGO_GRADIENT.dir,
      border: "#ffffff",
      borderW: size * 0.025,
      borderA: 0.35,
    });
    const ring = image(ctx, SEQUEL_ICON, size, size);
    ring.mesh.scale.setScalar(0.56);
    const o = endCard ? 30 : 11;
    back.mesh.renderOrder = o;
    ring.mesh.renderOrder = o + 1;
    back.mesh.name = "sequel-tile";
    ring.mesh.name = "sequel-logo";
    group.add(back.mesh, ring.mesh);
    return {
      group,
      setBg(a: number) {
        back.opacity = a;
      },
      setGlyphScale(s: number) {
        ring.mesh.scale.setScalar(s);
      },
    };
  }

  function checkMark(size: number) {
    const c = drawn(size, size, (g, s) => {
      g.scale(s * (size / 24), s * (size / 24));
      g.strokeStyle = C.check;
      g.lineWidth = 2.6;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.beginPath();
      g.moveTo(4, 12.5);
      g.lineTo(9.5, 18);
      g.lineTo(20, 6.5);
      g.stroke();
    });
    c.mat.uniforms.uOpacity.value = 0;
    return c;
  }
}
