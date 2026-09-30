import * as THREE from "three";
import { C, FONT, SAMSUNG_PAY_D, GENMOTION_MARK_D } from "./brand";

/**
 * A generic slab phone (original design) with a canvas-textured screen.
 * World size: 3.8 × 7.8 units (380 × 780 px at z = 0). Screen: 3.56 × 7.56.
 * Screen canvases are drawn in "screen px" (SW × SH = 356 × 756) at 2×.
 */
export const SW = 356;
export const SH = 756;
const R = 2;

function rounded(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

function shapePlane(w: number, h: number, r: number) {
  const geo = new THREE.ShapeGeometry(rounded(w, h, r), 16);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  return geo;
}

export interface Phone {
  group: THREE.Group;
  screen: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  /** Show a screen texture, scrolled down by `scrollPx` screen px. */
  show(tex: THREE.CanvasTexture, scrollPx?: number): void;
  touch: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  /** Place the touch dot at screen px (x from left, y from top). */
  touchAt(x: number, y: number, press: number, opacity: number): void;
  island: THREE.Mesh;
}

export function makePhone(name = "phone"): Phone {
  const group = new THREE.Group();
  group.name = name;

  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(rounded(3.8, 7.8, 0.62), {
      depth: 0.22, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 5, curveSegments: 24,
    }).translate(0, 0, -0.3),
    new THREE.MeshStandardMaterial({ color: "#c7b39c", metalness: 0.85, roughness: 0.3 }),
  );
  body.name = `${name}-frame`;

  const glass = new THREE.Mesh(shapePlane(3.74, 7.74, 0.58), new THREE.MeshBasicMaterial({ color: "#050505" }));
  glass.position.z = -0.018;
  glass.name = `${name}-bezel`;

  const screen = new THREE.Mesh(
    shapePlane(SW / 100, SH / 100, 0.44),
    new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
  );
  screen.position.z = -0.012;
  screen.name = `${name}-screen`;

  const island = new THREE.Mesh(
    new THREE.ShapeGeometry(rounded(1.0, 0.3, 0.15), 12),
    new THREE.MeshBasicMaterial({ color: "#000000" }),
  );
  island.position.set(0, SH / 200 - 0.3, -0.006);
  island.name = `${name}-camera-island`;

  const touch = new THREE.Mesh(
    new THREE.CircleGeometry(0.2, 40),
    new THREE.MeshBasicMaterial({ color: "#8a8a93", transparent: true, opacity: 0, depthWrite: false }),
  );
  touch.name = `${name}-touch`;
  touch.userData.pickable = false;

  // side button
  const btn = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.12), body.material);
  btn.position.set(1.93, 1.5, -0.2);
  btn.name = `${name}-side-button`;

  group.add(body, glass, screen, island, touch, btn);

  return {
    group,
    screen,
    island,
    touch,
    show(tex, scrollPx = 0) {
      const H = tex.userData.h as number;
      tex.repeat.set(1, SH / H);
      tex.offset.set(0, 1 - SH / H - scrollPx / H);
      if (screen.material.map !== tex) {
        screen.material.map = tex;
        screen.material.needsUpdate = true;
      }
    },
    touchAt(x, y, press, opacity) {
      touch.position.set((x - SW / 2) / 100, (SH / 2 - y) / 100, 0.004);
      touch.scale.setScalar(1 - press * 0.25);
      touch.material.opacity = opacity * 0.55;
      touch.visible = opacity > 0.01;
    },
  };
}

export function phoneLights(scene: THREE.Scene) {
  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(-5, 6, 8);
  const fill = new THREE.DirectionalLight(0xbfc6ff, 1.2);
  fill.position.set(6, -2, 5);
  scene.add(key, fill, new THREE.AmbientLight(0xffffff, 0.8));
}

// ---------------------------------------------------------------- screens

type G = OffscreenCanvasRenderingContext2D;

function canvas(h: number, bg: string) {
  const cv = new OffscreenCanvas(SW * R, h * R);
  const g = cv.getContext("2d")!;
  g.scale(R, R);
  g.fillStyle = bg;
  g.fillRect(0, 0, SW, h);
  return { cv, g };
}
function done(cv: OffscreenCanvas, h: number) {
  const t = new THREE.CanvasTexture(cv as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData.h = h;
  return t;
}
function type(g: G, s: string, x: number, y: number, size: number, colour: string, weight = 500, align: CanvasTextAlign = "left") {
  g.font = `${weight} ${size}px ${FONT}`;
  g.fillStyle = colour;
  g.textAlign = align;
  g.textBaseline = "middle";
  g.fillText(s, x, y);
}
function rr(g: G, x: number, y: number, w: number, h: number, r: number, fill: string) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fillStyle = fill;
  g.fill();
}
function bar(g: G, x: number, y: number, w: number, colour = "#e6e8ee") {
  rr(g, x, y - 4, w, 8, 4, colour);
}
function statusBar(g: G, dark = false) {
  const c = dark ? "#ffffff" : "#111";
  type(g, "9:41", 34, 26, 15, c, 600);
  rr(g, SW - 58, 20, 26, 12, 3, c);
}
function samsungPay(g: G, x: number, y: number, w: number, colour: string) {
  const s = w / 24;
  g.save();
  g.translate(x, y - 6.6 * s);
  g.scale(s, s);
  g.fillStyle = colour;
  g.fill(new Path2D(SAMSUNG_PAY_D));
  g.restore();
}
function genmotionFooter(g: G, y: number, colour: string) {
  type(g, "Secured by", SW / 2 - 14, y, 13, colour, 400, "right");
  g.save();
  g.translate(SW / 2 - 6, y - 8);
  g.scale(16 / 512, 16 / 512);
  g.fillStyle = C.teal;
  g.fill(new Path2D(GENMOTION_MARK_D));
  g.restore();
  type(g, "GenMotion", SW / 2 + 14, y, 13, colour, 600);
}

/** Original product illustration: a ceramic table lamp. */
function lamp(g: G, cx: number, cy: number, s: number) {
  g.save();
  g.translate(cx, cy);
  g.scale(s, s);
  const shadow = g.createRadialGradient(0, 118, 4, 0, 118, 90);
  shadow.addColorStop(0, "rgba(0,0,0,0.18)");
  shadow.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = shadow;
  g.fillRect(-100, 100, 200, 40);
  // base
  const base = g.createLinearGradient(-50, 0, 50, 0);
  base.addColorStop(0, "#c95f36");
  base.addColorStop(0.45, "#f0a27c");
  base.addColorStop(1, "#a9472a");
  g.fillStyle = base;
  g.beginPath();
  g.moveTo(-18, 0);
  g.bezierCurveTo(-70, 20, -62, 110, -30, 120);
  g.lineTo(30, 120);
  g.bezierCurveTo(62, 110, 70, 20, 18, 0);
  g.closePath();
  g.fill();
  // stem
  g.fillStyle = "#3a3a3f";
  g.fillRect(-3, -30, 6, 32);
  // shade
  const shade = g.createLinearGradient(-80, 0, 80, 0);
  shade.addColorStop(0, "#efe7da");
  shade.addColorStop(0.5, "#fffaf1");
  shade.addColorStop(1, "#ddd2c1");
  g.fillStyle = shade;
  g.beginPath();
  g.moveTo(-44, -110);
  g.lineTo(44, -110);
  g.lineTo(78, -28);
  g.lineTo(-78, -28);
  g.closePath();
  g.fill();
  g.restore();
}

/** 1 — product page. */
export function screenProduct() {
  const H = SH;
  const { cv, g } = canvas(H, "#ffffff");
  statusBar(g);
  rr(g, 18, 50, 34, 34, 17, "#f1f2f5");
  type(g, "LUMA", SW / 2, 67, 20, "#111", 600, "center");
  rr(g, 0, 100, SW, 380, 0, "#f6f3ee");
  lamp(g, SW / 2, 290, 1.35);
  type(g, "Ceramic table lamp", 24, 520, 24, "#111", 600);
  type(g, "Terracotta · 42 cm", 24, 556, 17, "#6b6f7a", 400);
  type(g, "₹4,800", 24, 600, 28, "#111", 600);
  rr(g, 20, 660, SW - 40, 56, 14, "#111111");
  type(g, "Add to bag", SW / 2, 688, 19, "#ffffff", 600, "center");
  return done(cv, H);
}

/** 2 — bag / checkout summary. */
export function screenCheckout() {
  const H = SH;
  const { cv, g } = canvas(H, "#ffffff");
  statusBar(g);
  type(g, "Your bag", 24, 80, 26, "#111", 600);
  rr(g, 20, 110, SW - 40, 120, 16, "#f6f3ee");
  lamp(g, 78, 170, 0.42);
  type(g, "Ceramic table lamp", 136, 150, 17, "#111", 600);
  type(g, "₹4,800", 136, 184, 17, "#6b6f7a", 500);
  bar(g, 24, 280, 140);
  bar(g, 24, 310, 220);
  bar(g, 24, 340, 180);
  g.fillStyle = "#eceef2";
  g.fillRect(20, 590, SW - 40, 1);
  type(g, "Total", 24, 630, 18, "#6b6f7a", 400);
  type(g, "₹4,800", 24, 662, 24, "#111", 600);
  rr(g, 170, 628, SW - 190, 56, 14, "#111111");
  type(g, "Continue", 170 + (SW - 190) / 2, 656, 19, "#ffffff", 600, "center");
  return done(cv, H);
}

/** 3 — payment options (taller: scrolls). Recommended Samsung Pay button at y≈330. */
export const PAY_BUTTON_Y = 330;
export function screenPaymentOptions() {
  const H = 1100;
  const { cv, g } = canvas(H, "#ffffff");
  statusBar(g);
  genmotionFooter(g, 70, "#6b6f7a");
  type(g, "Payment options", 24, 140, 26, "#111", 600);
  rr(g, 24, 180, 150, 40, 20, "#eef0ff");
  type(g, "Offers", 99, 200, 16, "#3b3fd6", 600, "center");
  rr(g, 184, 180, 120, 40, 20, "#f1f2f5");
  type(g, "View all", 244, 200, 16, "#333", 500, "center");
  type(g, "Recommended", 24, 270, 16, "#6b6f7a", 500);
  rr(g, 20, PAY_BUTTON_Y - 32, SW - 40, 64, 16, "#000000");
  samsungPay(g, SW / 2 - 50, PAY_BUTTON_Y - 22, 100, "#ffffff");
  const rows = ["Cards", "Netbanking", "UPI", "EMI", "Pay later"];
  rows.forEach((r, i) => {
    const y = 420 + i * 86;
    rr(g, 20, y - 32, SW - 40, 64, 14, "#f6f7f9");
    rr(g, 38, y - 12, 24, 24, 6, "#dfe3ff");
    type(g, r, 76, y, 19, "#111", 500);
    type(g, "›", SW - 44, y, 24, "#9aa0ad", 400);
  });
  return done(cv, H);
}

/** 4 — the Samsung Pay sheet over a dimmed page. */
export function screenPaySheet() {
  const H = SH;
  const { cv, g } = canvas(H, "#5a5c63");
  statusBar(g, true);
  rr(g, 18, 50, 34, 34, 17, "#6d6f76");
  type(g, "LUMA", SW / 2, 67, 20, "#d9d9de", 600, "center");
  rr(g, 8, 150, SW - 16, H - 160, 34, "#ffffff");
  rr(g, 26, 172, 30, 30, 15, "#f1f2f5");
  type(g, "×", 41, 187, 20, "#555", 500, "center");
  samsungPay(g, SW / 2 - 48, 172, 96, "#000000");
  type(g, "Pay LUMA", SW / 2, 250, 17, "#6b6f7a", 500, "center");
  type(g, "₹4,800", SW / 2, 292, 38, "#111", 600, "center");
  // card
  const cg = g.createLinearGradient(80, 340, 280, 470);
  cg.addColorStop(0, "#1c1d24");
  cg.addColorStop(0.55, "#3a3c48");
  cg.addColorStop(1, "#15161b");
  rr(g, 70, 335, SW - 140, 136, 14, "#000");
  g.fillStyle = cg;
  g.beginPath();
  g.roundRect(70, 335, SW - 140, 136, 14);
  g.fill();
  type(g, "•••• 4821", 88, 450, 15, "#cfd2dc", 500);
  rr(g, 88, 358, 32, 24, 5, "#d9b653");
  type(g, "Change card", SW / 2, 510, 16, "#3b3fd6", 500, "center");
  g.fillStyle = "#eceef2";
  g.fillRect(28, 548, SW - 56, 1);
  // fingerprint prompt
  g.strokeStyle = "#3b3fd6";
  g.lineWidth = 2.5;
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.arc(SW / 2, 640, 8 + i * 7, Math.PI * 1.1, Math.PI * 1.9 + i * 0.05);
    g.stroke();
  }
  type(g, "Touch to pay", SW / 2, 700, 17, "#111", 500, "center");
  return done(cv, H);
}

/** 5 — confirming (coin is a 3D object laid over this). */
export function screenConfirming(successText = false) {
  const H = SH;
  const { cv, g } = canvas(H, "#ffffff");
  statusBar(g);
  type(g, successText ? "Payment successful" : "Confirming payment", SW / 2, 170, 24, "#111", 600, "center");
  type(g, successText ? "Redirecting to LUMA" : "This takes a few seconds", SW / 2, 206, 16, "#6b6f7a", 400, "center");
  genmotionFooter(g, 710, "#6b6f7a");
  return done(cv, H);
}

/** 6 — success: full green with a receipt card. */
export function screenSuccess() {
  const H = SH;
  const { cv, g } = canvas(H, "#12a150");
  statusBar(g, true);
  rr(g, 20, 330, SW - 40, 250, 18, "#ffffff");
  type(g, "LUMA", 44, 372, 20, "#111", 600);
  type(g, "₹4,800 paid", 44, 410, 22, "#111", 600);
  type(g, "via Samsung Pay", 44, 444, 16, "#6b6f7a", 400);
  bar(g, 44, 492, 200);
  bar(g, 44, 522, 150);
  bar(g, 44, 552, 230);
  genmotionFooter(g, 710, "#e8fff1");
  return done(cv, H);
}
