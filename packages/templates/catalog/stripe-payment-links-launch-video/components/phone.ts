import * as THREE from "three";
import { SANS, MONO } from "./fonts";
import { roundRect } from "./type";

/** Phone body in px: width W, height = W * 2.06. Drawn at 2x for crisp UI type. */
export const PHONE_W = 428;
export const PHONE_H = Math.round(PHONE_W * 2.06);
const DPR = 2;

type Screen = (g: OffscreenCanvasRenderingContext2D, w: number, h: number) => void;

function font(weight: number, size: number, family = SANS, italic = false) {
  return `${italic ? "italic " : ""}${weight} ${size}px ${family}`;
}

/** Draw the device (rim, bezel, island, status bar) around a screen callback. */
function drawPhone(g: OffscreenCanvasRenderingContext2D, screen: Screen) {
  const W = PHONE_W, H = PHONE_H;
  // metal rim
  roundRect(g, 2, 2, W - 4, H - 4, 66);
  const rim = g.createLinearGradient(0, 0, W, 0);
  rim.addColorStop(0, "#9a9c9b");
  rim.addColorStop(0.5, "#e2e4e3");
  rim.addColorStop(1, "#8d8f8e");
  g.fillStyle = rim;
  g.fill();
  // bezel
  roundRect(g, 6, 6, W - 12, H - 12, 62);
  g.fillStyle = "#050505";
  g.fill();
  // screen
  const sx = 17, sy = 17, sw = W - 34, sh = H - 34;
  g.save();
  roundRect(g, sx, sy, sw, sh, 52);
  g.clip();
  g.fillStyle = "#151816";
  g.fillRect(sx, sy, sw, sh);
  g.translate(sx, sy);
  screen(g, sw, sh);
  g.restore();
  // dynamic island
  roundRect(g, W / 2 - 52, 30, 104, 30, 15);
  g.fillStyle = "#000";
  g.fill();
  // status bar
  g.fillStyle = "#f2f2f2";
  g.font = font(600, 17);
  g.textBaseline = "middle";
  g.textAlign = "center";
  g.fillText("9:41", 92, 46);
  // signal bars, wifi, battery
  for (let i = 0; i < 4; i++) g.fillRect(W - 120 + i * 6, 52 - (i + 1) * 3, 4, (i + 1) * 3);
  g.beginPath();
  g.arc(W - 82, 54, 11, -Math.PI * 0.75, -Math.PI * 0.25);
  g.lineTo(W - 82, 54);
  g.closePath();
  g.fill();
  roundRect(g, W - 66, 40, 26, 13, 4);
  g.fill();
  // home indicator
  roundRect(g, W / 2 - 62, H - 30, 124, 5, 3);
  g.fillStyle = "#e8e8e8";
  g.fill();
}

/** Account linking: a 2×3 grid of providers and a "Link later" button. */
export const accountLinking: Screen = (g, w) => {
  g.fillStyle = "#eaeaea";
  g.font = font(500, 16);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("Account linking", w / 2, 90);
  g.font = font(500, 22);
  g.fillText("‹", 34, 88);
  const providers: [string, string, string, string][] = [
    ["Belvo", "LATAM bank accounts", "#1d5cff", "b"],
    ["Teller", "US and LATAM bank accounts", "#2a2d2c", "t"],
    ["Plaid", "US bank accounts", "#f2f2f2", "p"],
    ["Stripe", "US bank accounts", "#6a4cff", "S"],
    ["Akoya", "US bank accounts", "#f2f2f2", "a"],
    ["Coinbase", "Linked accounts", "#1652f0", "C"],
  ];
  const cw = 158, ch = 136, gap = 14;
  const x0 = (w - cw * 2 - gap) / 2;
  providers.forEach(([name, sub, col, letter], i) => {
    const x = x0 + (i % 2) * (cw + gap);
    const y = 125 + Math.floor(i / 2) * (ch + gap);
    roundRect(g, x, y, cw, ch, 16);
    g.fillStyle = "#262a28";
    g.fill();
    // generic provider badge: a coloured disc with an initial (not a logo)
    g.beginPath();
    g.arc(x + cw / 2, y + 44, 26, 0, Math.PI * 2);
    g.fillStyle = col;
    g.fill();
    if (letter === "t") {
      for (const [dx, dy, c] of [[-7, 4, "#36d1c4"], [6, -5, "#ff4d6d"], [5, 6, "#7b6cff"]] as const) {
        g.beginPath(); g.arc(x + cw / 2 + dx, y + 44 + dy, 8, 0, Math.PI * 2); g.fillStyle = c; g.fill();
      }
    } else {
      g.fillStyle = col === "#f2f2f2" ? "#1b1b1b" : "#ffffff";
      g.font = font(700, 26);
      g.fillText(letter, x + cw / 2, y + 45);
    }
    g.fillStyle = "#f4f4f4";
    g.font = font(700, 16);
    g.fillText(name, x + cw / 2, y + 90);
    g.fillStyle = "#8f9491";
    g.font = font(400, 11, SANS, true);
    g.fillText(sub, x + cw / 2, y + 111);
  });
  const by = 125 + 3 * (ch + gap);
  g.font = font(400, 13);
  g.fillStyle = "#6f7471";
  g.textAlign = "center";
  g.fillText("Not seeing your source?  Let us know →", w / 2, by + 12);
  roundRect(g, x0 - 10, by + 36, cw * 2 + gap + 20, 48, 14);
  g.fillStyle = "#8b938c";
  g.fill();
  g.fillStyle = "#f5f5f5";
  g.font = font(600, 14);
  g.fillText("Link later", w / 2, by + 60);
};

/** Activity: tabs, balance, four quick actions, four transactions. */
export const activity: Screen = (g, w) => {
  g.textBaseline = "middle";
  // browser-ish top line
  g.fillStyle = "#cfcfcf";
  g.font = font(500, 13);
  g.textAlign = "center";
  g.fillText("☰", 30, 128);
  g.fillText("ms.infinite.id", w / 2, 128);
  g.textAlign = "left";
  const tabs = ["Activity", "Send", "Recieve", "Swap"];
  let tx = 20;
  tabs.forEach((t, i) => {
    g.font = font(500, 22);
    g.fillStyle = i === 0 ? "#f2f2f2" : "#6c716e";
    g.fillText(t, tx, 188);
    tx += g.measureText(t).width + 13;
  });
  g.fillStyle = "#3a3f3c";
  g.fillRect(20, 222, 4, 60);
  g.font = font(500, 18);
  g.fillStyle = "#e6e6e6";
  g.fillText("$12,032", 32, 237);
  g.fillText("$5000", 32, 268);
  g.textAlign = "right";
  g.fillStyle = "#7d827f";
  g.fillText("Balance", w - 20, 237);
  g.fillText("Pending", w - 20, 268);
  g.textAlign = "center";
  const acts = ["Link Bank", "Link Wallet", "Address", "Support"];
  acts.forEach((a, i) => {
    const cx = 52 + i * ((w - 104) / 3);
    g.strokeStyle = "#7a7f7c";
    g.lineWidth = 1.5;
    g.strokeRect(cx - 8, 316, 16, 16);
    g.fillStyle = "#d9d9d9";
    g.font = font(500, 13.5);
    g.fillText(a, cx, 353);
  });
  const rows: [string, string, string, string][] = [
    ["Manual", "+", "1250", "from Agency"],
    ["Reccuring", "+", "10k", "from ChannelMeter"],
    ["INV-101", "+", "5,434", "from CreatorPay"],
    ["Recurring", "-", "2k", "from 0xAbCd....1234"],
  ];
  rows.forEach(([label, sign, amt, from], i) => {
    const y = 412 + i * 99;
    roundRect(g, 12, y, w - 24, 86, 12);
    g.fillStyle = "#2a2e2c";
    g.fill();
    g.textAlign = "left";
    g.fillStyle = "#e4e4e4";
    g.font = font(500, 13.5, MONO);
    g.fillText(label, 32, y + 30);
    g.fillStyle = "#8e9390";
    g.font = font(400, 14.5);
    g.fillText("3d ago", 32, y + 58);
    g.textAlign = "right";
    g.fillStyle = "#8e9390";
    g.font = font(500, 12);
    g.fillText("USD", w - 30, y + 32);
    g.fillStyle = "#f2f2f2";
    g.font = font(500, 22);
    const aw = g.measureText(amt).width;
    g.fillText(amt, w - 64, y + 30);
    g.fillStyle = sign === "+" ? "#7fd39b" : "#e58a8a";
    g.fillText(sign, w - 72 - aw, y + 30);
    g.fillStyle = "#9a9f9c";
    g.font = font(400, 14.5);
    g.fillText(from, w - 30, y + 58);
  });
};

/** A phone mesh (PHONE_W × PHONE_H px plane) showing the given screen. */
export function phoneMesh(screen: Screen, name: string) {
  const c = new OffscreenCanvas(PHONE_W * DPR, PHONE_H * DPR);
  const g = c.getContext("2d")!;
  g.scale(DPR, DPR);
  drawPhone(g, screen);
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(PHONE_W, PHONE_H),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }),
  );
  m.name = name;
  return m;
}
