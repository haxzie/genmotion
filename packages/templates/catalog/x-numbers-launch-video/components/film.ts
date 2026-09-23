/**
 * The whole film as one function of time. Timings and positions are measured
 * off the reference video (seconds, 1920×1080 px).
 */
import { H, W, clamp, ease, grey, lerp, prog, rand, track, type Assets, type G } from "./core";
import { circle, dashedArc, drawX, drawXAnimated, icon, measure, rr, text, xWidth } from "./draw";
import {
  MENU_W,
  NUMBER_INS,
  PHONE_H,
  SCREEN_H,
  SHEET_W,
  darkChat,
  drawMenu,
  drawPhone,
  drawReels,
  drawYourNumberSheet,
  lightChat,
  reelState,
  toScreen,
  type PhoneXf,
} from "./phone";

const BG = "#f2f2f2";
const DEG = Math.PI / 180;

function bg(g: G, c = BG) {
  g.fillStyle = c;
  g.fillRect(0, 0, W, H);
}

/* =================================================================== 1 === */
/* Intro: orbit rings + "Introducing" → "X Numbers"                          */

const RINGS = [
  { r: 303, w: 20, start: -0.25 },
  { r: 452, w: 11.4, start: -0.3 },
  { r: 688, w: 12.4, start: -0.35 },
  { r: 955, w: 10, start: -0.45 },
];
const RING_ITEMS: Array<{ ring: number; a0: number; kind: "sq" | "video" | "phone" | "bubble" }> = [
  { ring: 0, a0: -101.5, kind: "video" },
  { ring: 0, a0: -138, kind: "sq" },
  { ring: 0, a0: 63.7, kind: "sq" },
  { ring: 1, a0: -20.7, kind: "phone" },
  { ring: 1, a0: -51.9, kind: "sq" },
  { ring: 2, a0: 137.4, kind: "bubble" },
  { ring: 2, a0: -41, kind: "sq" },
];

function introText(T: number): { kind: "intro" | "x"; n: number } {
  if (T < 1.45) return { kind: "intro", n: clamp(Math.floor(T / 0.08) + 1, 0, 11) };
  if (T < 2.23) return { kind: "intro", n: clamp(11 - Math.floor((T - 1.45) / 0.07), 0, 11) };
  return { kind: "x", n: clamp(Math.floor((T - 2.23) / 0.0625) + 1, 0, 9) };
}

const TXT = 95; // font px at zoom 1
const TXT_W = 470;

function drawIntro(g: G, T: number) {
  bg(g);
  const Z = track(T, [
    [0, 1.55],
    [0.25, 1.49],
    [0.5, 1.37],
    [0.75, 1.21],
    [1.0, 1.06],
    [1.5, 1.0],
    [2.0, 0.99],
    [2.5, 1.06],
    [3.0, 1.19],
    [3.5, 1.26],
    [3.9, 1.29],
    [4.1, 1.42],
    [4.3, 1.65],
  ]);

  // Current text + its width at zoom 1
  const st = introText(T);
  let tw = 0;
  let label = "";
  if (st.kind === "intro") {
    label = "Introducing".slice(0, st.n);
    tw = measure(g, label, TXT, 420, -2);
  } else {
    label = "X Numbers".slice(1, st.n);
    tw = (st.n >= 1 ? xWidth(70) : 0) + measure(g, label, TXT, 420, -2);
  }
  const halfW = Math.max(tw / 2 + 22, 30);

  g.save();
  g.translate(960, 540);
  g.scale(Z, Z);
  const lw = 1.6 / Z;

  // Dashed rings, drawing on
  RINGS.forEach((ring, k) => {
    const p = prog(T, ring.start, 0.9 + k * 0.05, ease.out);
    if (p <= 0) return;
    const rot = (ring.w * T + k * 47) * DEG;
    dashedArc(g, 0, 0, ring.r, rot, rot + Math.PI * 2 * p, 11, 8.5, "#111", lw);
  });
  // Items riding the rings
  RING_ITEMS.forEach((it, i) => {
    const ring = RINGS[it.ring]!;
    const a = (it.a0 + ring.w * T) * DEG;
    const vis = prog(T, 0.05 + i * 0.05, 0.3 + i * 0.05, ease.out);
    if (vis <= 0) return;
    const x = Math.cos(a) * ring.r;
    const y = Math.sin(a) * ring.r;
    g.save();
    g.translate(x, y);
    if (it.kind === "sq") {
      g.rotate(a + Math.PI / 4 - 0.35);
      g.scale(vis, vis);
      g.fillStyle = "#000";
      g.fillRect(-8, -8, 16, 16);
    } else {
      g.scale(vis, vis);
      g.fillStyle = "#f7f7f7";
      circle(g, 0, 0, 34);
      g.fill();
      g.strokeStyle = "#1a1a1a";
      g.lineWidth = lw;
      g.stroke();
      icon(g, it.kind, 0, 0, 37, "#000", 2.2);
    }
    g.restore();
  });

  // Hole bubble (transition into the dial dots)
  const R = track(T, [
    [3.96, 0],
    [4.05, 90],
    [4.12, 150],
    [4.2, 308],
    [4.3, 652],
    [4.4, 1300],
    [4.47, 2100],
  ]) / Z;

  // Solid circle + diameter line, both kept clear of the text
  g.save();
  g.beginPath();
  g.rect(-4000, -4000, 8000, 8000);
  g.rect(-halfW, -62, halfW * 2, 124);
  g.clip("evenodd");
  const rs = Math.max(172 * (1 - 0.3 * prog(T, 3.98, 4.15)), R);
  const hs = track(T, [
    [0, 18],
    [0.25, 35],
    [0.5, 44],
    [0.8, 72],
    [1.1, 90],
  ]) * DEG;
  g.strokeStyle = "#111";
  g.lineWidth = 1.8 / Z;
  g.beginPath();
  g.arc(0, 0, rs, -Math.PI / 2 - hs, -Math.PI / 2 + hs);
  g.stroke();
  g.beginPath();
  g.arc(0, 0, rs, Math.PI / 2 - hs, Math.PI / 2 + hs);
  g.stroke();

  const th = (-57.25 + 17.9 * T) * DEG;
  const L = track(T, [
    [0, 260],
    [0.5, 1000],
    [1.0, 1700],
  ]);
  g.lineWidth = 1.5 / Z;
  g.strokeStyle = "#111";
  for (const sgn of [1, -1]) {
    g.beginPath();
    g.moveTo(Math.cos(th) * rs * sgn, Math.sin(th) * rs * sgn);
    g.lineTo(Math.cos(th) * (rs + L) * sgn, Math.sin(th) * (rs + L) * sgn);
    g.stroke();
  }
  g.restore();

  // Text
  if (st.kind === "intro") {
    text(g, label, 0, 4, TXT, "#000", { weight: 420, align: "center", spacing: -2 });
  } else if (st.n >= 1) {
    const x0 = -tw / 2;
    drawX(g, x0 + xWidth(70) / 2, 0, 70, "#000");
    if (label) text(g, label, x0 + xWidth(70), 4, TXT, "#000", { weight: 420, spacing: -2 });
  }
  g.restore();

  if (R > 0) {
    g.save();
    circle(g, 960, 540, R * Z);
    g.clip();
    drawDotsNumber(g, T);
    g.restore();
    g.strokeStyle = "#222";
    g.lineWidth = 1.3;
    circle(g, 960, 540, R * Z);
    g.stroke();
  }
}

/* =================================================================== 2 === */
/* Dial dots → number card with rolling digits                                */

function drawDotsNumber(g: G, T: number) {
  bg(g);

  // Dashed rails with travelling nodes
  const railA = prog(T, 5.9, 6.05, ease.linear);
  if (railA > 0) {
    const topLeft = track(T, [
      [5.93, 1920],
      [5.95, 1748],
      [6.0, 1572],
      [6.05, 1400],
      [6.1, 1240],
      [6.25, 628],
      [6.5, 380],
      [6.8, 0],
    ]);
    const topNode = track(T, [
      [5.95, 1524],
      [6.0, 1500],
      [6.1, 1460],
      [6.25, 1368],
      [6.5, 1325],
      [7.0, 1152],
      [7.5, 1062],
      [7.75, 984],
      [8.0, 932],
      [8.6, 820],
    ]);
    const botRight = track(T, [
      [5.93, 0],
      [5.95, 160],
      [6.0, 340],
      [6.05, 448],
      [6.1, 680],
      [6.25, 1300],
      [6.5, 1540],
      [6.8, 1920],
    ]);
    const botNode = track(T, [
      [5.95, 588],
      [6.0, 608],
      [6.1, 640],
      [6.25, 716],
      [6.5, 754],
      [7.0, 896],
      [7.5, 972],
      [7.75, 1036],
      [8.0, 1044],
      [8.6, 1110],
    ]);
    g.save();
    g.globalAlpha = railA;
    rail(g, 280, topLeft, 1920, topNode);
    rail(g, 800, 0, botRight, botNode);
    g.restore();
  }

  // Grid of dots
  const hs = track(T, [
    [4.15, 100],
    [4.25, 112],
    [4.5, 132],
    [4.75, 144],
    [5.0, 152],
    [5.25, 156],
    [5.5, 160],
    [5.8, 163],
  ]);
  const vs = track(T, [
    [4.15, 96],
    [4.5, 116],
    [4.75, 124],
    [5.0, 132],
    [5.25, 138],
    [5.5, 154],
    [5.6, 157],
    [5.65, 170],
    [5.7, 184],
    [5.75, 202],
    [5.8, 226],
    [5.85, 258],
    [5.9, 292],
    [5.95, 350],
    [6.0, 410],
    [6.05, 480],
    [6.1, 560],
    [6.2, 760],
  ]);
  const midY = track(T, [
    [4.15, 488],
    [5.2, 481],
    [5.5, 476],
    [5.8, 482],
    [5.9, 488],
    [5.95, 504],
    [6.05, 535],
    [6.15, 540],
  ]);
  const rdot = 0.257 * hs;

  if (T < 6.35) {
    // soft glow under the centre
    const gl = prog(T, 4.6, 5.0) * (1 - prog(T, 5.6, 5.8));
    if (gl > 0) {
      const rg = g.createRadialGradient(960, midY, 0, 960, midY, 140);
      rg.addColorStop(0, `rgba(0,0,0,${0.05 * gl})`);
      rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg;
      g.fillRect(800, midY - 150, 320, 300);
    }
    g.fillStyle = "#000";
    const rowsY = [midY - vs, midY, midY + vs, midY + 2 * vs];
    for (let k = 0; k < 10; k++) {
      const row = Math.floor(k / 3);
      const col = k === 9 ? 1 : k % 3;
      if (row === 1 && T > 5.5) continue; // mid row handled below
      const sp = prog(T, 4.15 + k * 0.055, 4.4 + k * 0.055, ease.outBack);
      if (sp <= 0) continue;
      circle(g, 960 + (col - 1) * hs, rowsY[Math.min(row, 3)]!, rdot * Math.max(0, sp));
      g.fill();
    }
  }

  if (T >= 5.5) {
    // side circles
    const d = track(T, [
      [5.5, 160],
      [5.6, 168],
      [5.65, 182],
      [5.7, 200],
      [5.75, 228],
      [5.8, 268],
      [5.85, 332],
      [5.9, 424],
      [5.95, 560],
      [6.0, 688],
      [6.05, 780],
      [6.1, 816],
      [6.25, 952],
      [6.5, 990],
    ]);
    const rc = track(T, [
      [5.5, 40],
      [5.6, 42],
      [5.65, 44],
      [5.7, 48],
      [5.75, 52],
      [5.8, 60],
      [5.85, 76],
      [5.9, 96],
      [5.95, 128],
      [6.0, 152],
      [6.05, 172],
      [6.1, 184],
      [6.25, 206],
      [6.5, 215],
    ]);
    const fillV = track(T, [
      [5.7, 0],
      [5.75, 17],
      [5.8, 42],
      [5.85, 71],
      [5.9, 106],
      [5.95, 138],
      [6.0, 168],
      [6.05, 200],
      [6.1, 232],
      [6.18, 242],
    ]);
    const strokeA = prog(T, 5.98, 6.1, ease.linear) * 0.8;
    for (const sgn of [-1, 1]) {
      if (sgn === 1 && T >= 7.9) continue; // the right one becomes the reveal disk
      g.fillStyle = grey(fillV);
      circle(g, 960 + sgn * d, midY, rc);
      g.fill();
      if (strokeA > 0) {
        g.strokeStyle = `rgba(0,0,0,${strokeA})`;
        g.lineWidth = 1;
        g.stroke();
      }
    }

    // centre pill → card
    const pw = track(T, [
      [5.5, 80],
      [5.7, 92],
      [5.75, 104],
      [5.8, 136],
      [5.85, 176],
      [5.9, 232],
      [5.95, 304],
      [6.0, 408],
      [6.05, 552],
      [6.1, 720],
      [6.2, 1150],
      [6.3, 1250],
      [6.5, 1280],
    ]);
    const ph = track(T, [
      [5.5, 80],
      [5.75, 72],
      [5.8, 80],
      [5.85, 96],
      [5.9, 104],
      [5.95, 112],
      [6.0, 128],
      [6.05, 144],
      [6.1, 200],
      [6.2, 222],
      [6.5, 228],
    ]);
    const pv = track(T, [
      [5.7, 0],
      [5.75, 17],
      [5.8, 51],
      [5.85, 74],
      [5.9, 102],
      [5.95, 136],
      [6.0, 168],
      [6.05, 208],
      [6.1, 230],
      [6.25, 244],
    ]);
    const blur = track(T, [
      [6.0, 0],
      [6.08, 10],
      [6.15, 14],
      [6.3, 0],
    ]);
    const rad = lerp(ph / 2, 40, prog(T, 6.05, 6.25));
    const cardA = prog(T, 6.08, 6.3);
    g.save();
    if (blur > 0.3) g.filter = `blur(${blur}px)`;
    if (cardA > 0) {
      g.shadowColor = `rgba(0,0,0,${0.1 * cardA})`;
      g.shadowBlur = 70;
      g.shadowOffsetY = 14;
    }
    g.fillStyle = grey(pv);
    rr(g, 960 - pw / 2, midY - ph / 2, pw, ph, rad);
    g.fill();
    g.restore();

    // digits
    if (T > 6.12) {
      const k = pw / 1280;
      g.save();
      g.globalAlpha = prog(T, 6.12, 6.3);
      if (blur > 0.3) g.filter = `blur(${blur}px)`;
      const st = reelState(T, 6.28, 6.88);
      drawReels(
        g,
        960 - 71 * k,
        midY,
        108.5 * k,
        86 * k,
        st.pos,
        "#0a0a0a",
        st.jit.map((j) => j * 86 * k),
      );
      icon(g, "copy", 960 + 533 * k, midY - 4 * k, 70 * k, "#a3a3a3", 2.1);
      g.restore();
    }
  }
}

function rail(g: G, y: number, x0: number, x1: number, node: number) {
  if (x1 <= x0) return;
  g.save();
  g.beginPath();
  g.rect(x0, y - 20, x1 - x0, 40);
  g.clip();
  g.strokeStyle = "#8f8f8f";
  g.lineWidth = 1.4;
  g.setLineDash([42, 41]);
  g.lineDashOffset = -node;
  for (const [a, b] of [
    [x0, node - 22],
    [node + 22, x1],
  ] as const) {
    if (b <= a) continue;
    g.beginPath();
    g.moveTo(a, y);
    g.lineTo(b, y);
    g.stroke();
  }
  g.setLineDash([]);
  g.beginPath();
  g.moveTo(node - 22, y);
  g.lineTo(node - 16, y);
  g.moveTo(node + 16, y);
  g.lineTo(node + 22, y);
  g.strokeStyle = "#555";
  g.lineWidth = 1;
  g.stroke();
  g.fillStyle = BG;
  circle(g, node, y, 16);
  g.fill();
  g.strokeStyle = "#555";
  g.stroke();
  g.restore();
}

/* =================================================================== 3 === */
/* Light phone: dial ring, chat list, menu, "Number", Your X Number sheet    */

function lightPhoneXf(T: number): PhoneXf {
  if (T < 12.4) {
    const s = track(T, [
      [8.2, 2.19],
      [9.6, 2.19],
      [10.0, 2.23],
      [10.4, 2.45],
      [10.75, 2.95],
    ]);
    const top = track(T, [
      [8.15, 1150],
      [8.35, 560],
      [8.45, 352],
      [8.5, 208],
      [8.75, 132],
      [9.0, 121],
      [9.6, 118],
      [10.0, 113],
      [10.4, 53],
      [10.75, -30],
    ]);
    const cx = track(T, [
      [9.6, 960],
      [10.0, 946],
      [10.4, 854],
      [10.75, 760],
    ]);
    return { cx, top, s };
  }
  const s = track(T, [
    [12.4, 1.52],
    [13.2, 1.53],
    [14.6, 1.55],
    [15.4, 1.55],
  ]);
  const bottom = track(T, [
    [12.4, 600],
    [12.5, 640],
    [12.75, 760],
    [13.0, 860],
    [13.2, 878],
    [14.6, 935],
    [15.5, 978],
  ]);
  return { cx: 960, top: bottom - PHONE_H * s, s };
}

const DIAL = "00.0.0..24444699..8763202369.....0017..4455.68..9920031..77.2" ;

function drawDial(g: G, T: number, cx: number, cy: number, ro: number, ri: number, alpha: number) {
  g.save();
  g.strokeStyle = `rgba(0,0,0,${0.85 * alpha})`;
  g.lineWidth = 1;
  circle(g, cx, cy, ro);
  g.stroke();
  const inner = prog(T, 8.05, 8.35, ease.linear);
  if (inner > 0) {
    g.strokeStyle = `rgba(0,0,0,${0.85 * inner * alpha})`;
    circle(g, cx, cy, ri);
    g.stroke();
  }
  const rm = (ro + ri) / 2;
  const n = DIAL.length;
  const size = (ro - ri) * 0.33;
  const base = (10 * T) * DEG;
  for (let i = 0; i < n; i++) {
    const ch = DIAL[i]!;
    const a = base + (i / n) * Math.PI * 2;
    const appear = prog(T, 8.1 + rand(i) * 0.4, 8.3 + rand(i) * 0.4, ease.out);
    if (appear <= 0) continue;
    g.save();
    g.globalAlpha = alpha * appear;
    g.translate(cx + Math.cos(a) * rm, cy + Math.sin(a) * rm);
    g.rotate(a - Math.PI / 2);
    text(g, ch, 0, 0, size, "#000", { weight: 500, align: "center" });
    g.restore();
  }
  g.restore();
}

function menuScreenXf(T: number, p: PhoneXf) {
  if (T < 10.0) {
    const tl = toScreen(p, 179, 66);
    return { left: tl.x, top: tl.y, s: p.s };
  }
  const s = track(T, [
    [10.0, 2.23],
    [10.4, 2.5],
    [10.75, 3.3],
    [11.0, 3.67],
    [11.25, 4.08],
    [11.5, 4.16],
    [11.75, 4.22],
    [12.0, 4.27],
    [12.75, 4.27],
  ]);
  const cx = track(T, [
    [10.0, 1125.5],
    [10.4, 1065],
    [10.75, 963],
    [11.0, 955],
    [12.0, 965],
  ]);
  const top = track(T, [
    [10.0, 290],
    [10.4, 250],
    [10.75, -59],
    [11.0, -192],
    [11.25, -516],
    [11.5, -581],
    [11.75, -609],
    [12.0, -625],
    [12.25, -648],
    [12.5, -736],
    [12.65, -800],
    [12.75, -960],
    [12.85, -1400],
    [12.95, -2300],
  ]);
  return { left: cx - (MENU_W * s) / 2, top, s };
}

function drawLight(g: G, T: number, a: Assets) {
  // Underneath: the number card until the reveal disk has covered it
  if (T < 8.5) drawDotsNumber(g, T);
  else bg(g);

  const p = lightPhoneXf(T);

  // Reveal disk → dial ring
  if (T < 10.72) {
    const rp = prog(T, 7.9, 8.45, ease.inOut);
    let dcx = lerp(1950, 960, rp);
    let dcy = lerp(540, 1060, rp);
    let ro = lerp(215, 860, rp);
    if (T > 8.8) {
      const k = prog(T, 8.8, 9.6);
      const att = { x: p.cx, y: p.top + 424 * p.s, r: 393 * p.s };
      dcx = lerp(dcx, att.x, k);
      dcy = lerp(dcy, att.y, k);
      ro = lerp(ro, att.r, k);
    }
    const ri = ro * (735 / 860);
    g.fillStyle = BG;
    circle(g, dcx, dcy, ro);
    g.fill();
    drawDial(g, T, dcx, dcy, ro, ri, 1);
  }

  if (T < 10.72 && T > 8.15) {
    const allPress = prog(T, 9.15, 9.3) * (1 - prog(T, 9.3, 9.4));
    drawPhone(g, p, false, (sg) => lightChat(sg, a, { hideAll: T > 9.36, allPress }));
  }

  // Menu (in the phone, then lifted out)
  const menuOpen = prog(T, 9.33, 9.9, (t) => 1 - (1 - t) * (1 - t));
  const lens = track(T, [
    [10.15, 0],
    [10.25, 250],
    [10.4, 515],
    [10.55, 900],
    [10.72, 1500],
  ]);
  const m = menuScreenXf(T, p);
  if (lens > 0 && T < 10.72) {
    g.fillStyle = "#f0f0f0";
    circle(g, m.left + (MENU_W * m.s) / 2 + 50, 540, lens);
    g.fill();
    g.strokeStyle = "rgba(0,0,0,0.3)";
    g.lineWidth = 1;
    g.stroke();
  }

  if (T >= 12.4) {
    // zoomed-out phone with the Your X Number sheet
    drawSheetPhone(g, T, a, p);
  }

  if (menuOpen > 0 && T < 13.0) {
    const ins = NUMBER_INS * prog(T, 10.95, 11.25);
    g.save();
    // Inside the phone the menu is clipped to the screen
    if (T < 10.0) {
      const tl = toScreen(p, 0, 0);
      rr(g, tl.x, tl.y, 393 * p.s, SCREEN_H * p.s, 55 * p.s);
      g.clip();
    }
    g.translate(m.left, m.top);
    g.scale(m.s, m.s);
    drawMenu(g, {
      open: menuOpen,
      T,
      openStart: 9.36,
      ins,
      numberIcon: prog(T, 11.02, 11.18),
      numberChars: T < 11.2 ? 0 : clamp(Math.floor((T - 11.2) / 0.055) + 1, 0, 6),
      sweep: T > 11.85 && T < 12.5 ? lerp(-80, MENU_W + 80, prog(T, 11.85, 12.45, ease.inOutQuad)) : NaN,
    });
    g.restore();
  }

  if (T >= 15.33) tapDot(g, T);
}

function drawSheetPhone(g: G, T: number, a: Assets, p: PhoneXf) {
  const scroll = track(T, [
    [12.4, 0],
    [13.0, 15],
    [15.6, 110],
  ]);
  drawPhone(g, p, false, (sg) => {
    lightChat(sg, a, { scroll });
    sg.fillStyle = "rgba(0,0,0,0.2)";
    sg.fillRect(0, 0, 393, SCREEN_H);
  });

  // sheet transform: attached to the phone, then lifted toward the camera
  const att = toScreen(p, 8, 476);
  const lift = prog(T, 13.2, 14.05, ease.inOut);
  const top = lift <= 0 ? att.y : track(T, [
    [13.2, att.y],
    [13.5, 245],
    [14.0, 192],
    [14.6, 177],
    [15.0, 172],
    [15.4, 215],
    [15.6, 225],
  ]);
  const ss = track(T, [
    [13.2, p.s],
    [13.5, 1.7],
    [14.0, 1.94],
    [14.6, 1.96],
    [15.4, 1.97],
  ]);
  const s = T < 13.2 ? p.s : ss;
  const left = T < 13.2 ? att.x : 960 - (SHEET_W * s) / 2;
  const bottomPts = 845 - 476; // sheet height
  g.save();
  if (T < 13.2) {
    const tl = toScreen(p, 0, 0);
    rr(g, tl.x, tl.y, 393 * p.s, SCREEN_H * p.s, 55 * p.s);
    g.clip();
  }
  g.translate(left, top);
  g.scale(s, s);
  void bottomPts;
  drawYourNumberSheet(
    g,
    {
      T,
      rollStart: 13.3,
      rollLand: 13.95,
      placeholder: 1 - prog(T, 13.22, 13.35, ease.linear),
      toggleOn: prog(T, 14.62, 14.78),
      togglePress: prog(T, 14.42, 14.52) * (1 - prog(T, 14.7, 14.82)),
    },
    lift,
  );
  g.restore();
}

function tapDot(g: G, T: number) {
  const r = track(T, [
    [15.33, 0],
    [15.4, 26],
    [15.47, 30],
  ]);
  if (T > 15.5) return;
  g.save();
  g.shadowColor = "rgba(0,0,0,0.15)";
  g.shadowBlur = 10;
  g.fillStyle = "#fbfbfb";
  circle(g, 960, 540, r);
  g.fill();
  g.restore();
}

/* =================================================================== 4 === */
/* White/black circle burst → dark DM with keypad → white disk                */

function darkPhoneXf(T: number): PhoneXf {
  const s = track(T, [
    [16.1, 2.15],
    [16.5, 2.14],
    [17.0, 2.16],
    [18.0, 2.14],
    [18.25, 2.0],
    [18.5, 1.75],
    [18.75, 1.57],
    [19.0, 1.56],
    [19.5, 1.55],
    [22.5, 1.55],
    [22.75, 1.55],
    [23.0, 1.66],
    [23.25, 1.93],
    [23.5, 2.17],
    [23.75, 2.26],
    [24.0, 2.29],
    [25.5, 2.29],
    [25.75, 2.14],
    [26.0, 1.94],
    [26.25, 1.77],
    [26.5, 1.71],
    [26.75, 1.68],
    [27.1, 1.65],
  ]);
  const top = track(T, [
    [16.05, 1080],
    [16.25, 555],
    [16.5, 285],
    [16.75, 174],
    [17.0, 95],
    [17.25, -368],
    [17.5, -797],
    [17.75, -953],
    [18.0, -973],
    [18.25, -826],
    [18.5, -586],
    [18.75, -412],
    [19.0, -404],
    [19.5, -393],
    [22.5, -393],
    [22.75, -401],
    [23.0, -512],
    [23.25, -804],
    [23.5, -1059],
    [23.75, -1156],
    [24.0, -1141],
    [24.25, -961],
    [24.5, -485],
    [24.75, -105],
    [25.0, 21],
    [25.25, 39],
    [25.5, 36],
    [25.75, 39],
    [26.0, 42],
    [26.25, 48],
    [26.5, 48],
    [26.75, 51],
    [27.1, 55],
  ]);
  return { cx: 960, top, s };
}

function drawDark(g: G, T: number, a: Assets) {
  bg(g, "#000");
  const p = darkPhoneXf(T);
  const sheetTop = track(T, [
    [18.35, 860],
    [18.55, 650],
    [18.75, 420],
    [19.0, 330],
    [19.25, 285],
    [19.4, 281],
    [22.5, 281],
    [22.75, 363],
    [23.0, 653],
    [23.15, 860],
  ]);
  drawPhone(g, p, true, (sg) =>
    darkChat(sg, a, {
      T,
      gate: T < 23.05 ? 1 : 0,
      enterPress: prog(T, 18.15, 18.25) * (1 - prog(T, 18.3, 18.45)),
      sheetTop,
      usedBottom: prog(T, 23.15, 23.35) * (1 - prog(T, 23.85, 23.95)),
      usedTop: T > 23.9 ? 1 : 0,
      love: {
        y: track(T, [
          [24.85, 445],
          [25.0, 427],
          [25.25, 379],
          [25.5, 372],
          [25.75, 370],
        ]),
        a: prog(T, 24.85, 25.0, ease.linear),
      },
      yo: {
        y: track(T, [
          [25.85, 510],
          [26.0, 485],
          [26.25, 440],
          [26.5, 433],
          [26.7, 432],
        ]),
        a: prog(T, 25.85, 26.0, ease.linear),
      },
    }),
  );
}

function drawBurst(g: G, T: number, a: Assets) {
  // Under: the light sheet scene until white covers it
  if (T < 15.8) drawLight(g, T, a);
  const whiteR = track(T, [
    [15.42, 0],
    [15.5, 144],
    [15.6, 400],
    [15.7, 1150],
    [15.8, 1400],
  ]);
  if (T >= 15.8) bg(g, "#fdfdfd");
  else if (whiteR > 0) {
    g.fillStyle = "#fdfdfd";
    circle(g, 960, 540, whiteR);
    g.fill();
  }
  const ring = track(T, [
    [15.55, 0],
    [15.6, 220],
    [15.7, 288],
    [15.8, 320],
    [15.9, 340],
    [16.0, 370],
    [16.1, 392],
    [16.25, 620],
    [16.4, 880],
    [16.55, 1350],
  ]);
  const dash = track(T, [
    [15.62, 0],
    [15.7, 420],
    [15.8, 660],
    [15.9, 840],
    [16.0, 860],
    [16.25, 930],
    [16.5, 1150],
  ]);
  if (dash > 0) dashedArc(g, 960, 540, dash, 0, Math.PI * 2, 14, 12, "#c4c4c4", 1.2, T * 20);
  if (ring > 0) {
    g.strokeStyle = "#bdbdbd";
    g.lineWidth = 1.2;
    circle(g, 960, 540, ring);
    g.stroke();
  }
  const blackR = track(T, [
    [15.44, 0],
    [15.5, 96],
    [15.6, 168],
    [15.7, 196],
    [15.8, 212],
    [15.9, 224],
    [16.0, 240],
    [16.1, 264],
    [16.25, 600],
    [16.4, 850],
    [16.55, 1300],
  ]);
  if (blackR > 0) {
    g.save();
    circle(g, 960, 540, blackR);
    g.clip();
    drawDark(g, T, a);
    g.restore();
  }
}

function drawWhiteDisk(g: G, T: number) {
  const R = track(T, [
    [26.6, 0],
    [26.75, 411],
    [26.9, 800],
    [27.05, 1200],
    [27.15, 1300],
  ]);
  if (R <= 0) return;
  g.fillStyle = "#fcfcfc";
  circle(g, 960, 540, R);
  g.fill();
}

/* =================================================================== 5 === */
/* Outro: X in a planet with orbits, then the X alone, then a diagonal wipe  */

function ellipsePath(g: G, cx: number, cy: number, rx: number, ry: number, rot: number, a0 = 0, a1 = Math.PI * 2) {
  g.beginPath();
  g.ellipse(cx, cy, Math.max(0, rx), Math.max(0, ry), rot, a0, a1);
}

function drawOutro(g: G, T: number) {
  bg(g);
  const orbA = prog(T, 27.36, 27.5, ease.linear) * (1 - prog(T, 29.05, 29.2, ease.linear));
  const orbS = track(T, [
    [27.2, 1.4],
    [27.5, 1.05],
    [28.0, 1.0],
    [29.0, 1.0],
    [29.2, 1.25],
  ]);
  if (orbA > 0) {
    g.save();
    g.globalAlpha = orbA;
    g.lineWidth = 1.2;
    g.strokeStyle = "#cfcfcf";
    ellipsePath(g, 960, 600, 870 * orbS, 560 * orbS, (-35 + 2 * T) * DEG);
    g.stroke();
    g.strokeStyle = "#9d9d9d";
    g.setLineDash([10, 8]);
    ellipsePath(g, 960, 580, 620 * orbS, 380 * orbS, (-28 + 2 * T) * DEG);
    g.stroke();
    g.setLineDash([]);
    g.restore();
  }

  const R = track(T, [
    [27.1, 1150],
    [27.25, 870],
    [27.4, 450],
    [27.5, 309],
    [27.75, 250],
    [28.0, 228],
    [28.25, 219],
    [28.5, 216],
    [28.75, 214],
    [29.0, 232],
    [29.1, 180],
    [29.2, 0],
  ]);
  if (R > 0) {
    const k = prog(T, 27.2, 27.5, ease.linear);
    g.fillStyle = grey(lerp(252, 248, k));
    circle(g, 960, 540, R);
    g.fill();
    g.strokeStyle = grey(lerp(60, 185, k));
    g.lineWidth = 1.1;
    g.stroke();
  }

  // Small orbit + dot
  if (orbA > 0) {
    const ks = track(T, [
      [27.4, 1.5],
      [27.5, 1.4],
      [27.75, 1.14],
      [28.0, 1.0],
    ]);
    const phi = track(T, [
      [27.45, 100],
      [27.75, 86],
      [28.0, 81],
      [28.5, 75],
      [29.0, 69],
      [29.2, 66],
    ]) * DEG;
    const cx = 975;
    const cy = 565;
    const rot = 5 * DEG;
    const rx = 360 * ks;
    const ry = 117 * ks;
    const grow = prog(T, 27.45, 28.0, ease.out);
    const shrink = prog(T, 28.55, 29.15, ease.inOut);
    g.save();
    g.globalAlpha = orbA;
    g.strokeStyle = "#9a9a9a";
    g.lineWidth = 1.2;
    if (shrink <= 0) ellipsePath(g, cx, cy, rx, ry, rot, phi - Math.PI * 2 * grow, phi);
    else ellipsePath(g, cx, cy, rx, ry, rot, phi, phi + Math.PI * 2 * (1 - shrink));
    g.stroke();
    const dx = Math.cos(phi) * rx;
    const dy = Math.sin(phi) * ry;
    g.fillStyle = "#000";
    circle(g, cx + dx * Math.cos(rot) - dy * Math.sin(rot), cy + dx * Math.sin(rot) + dy * Math.cos(rot), 7);
    g.fill();
    g.restore();
  }

  // The X
  const xh = track(T, [
    [27.2, 140],
    [27.5, 108],
    [28.0, 108],
    [28.5, 100],
    [29.0, 115],
    [29.2, 190],
    [29.5, 203],
    [30.0, 209],
    [30.7, 214],
  ]);
  const heavy = prog(T, 27.13, 27.22, ease.linear);
  const light = prog(T, 27.27, 27.45, ease.out);
  const wipe = prog(T, 29.85, 30.5, ease.inOut);
  if (heavy > 0 && wipe < 1) drawXAnimated(g, 960, 540, xh, heavy, light, wipe);
}

/* ================================================================= film === */

export function drawFilm(g: G, T: number, a: Assets) {
  if (T < 4.47) drawIntro(g, T);
  else if (T < 7.9) drawDotsNumber(g, T);
  else if (T < 15.42) drawLight(g, T, a);
  else if (T < 16.55) drawBurst(g, T, a);
  else if (T < 27.12) {
    drawDark(g, T, a);
    drawWhiteDisk(g, T);
  } else drawOutro(g, T);
}
