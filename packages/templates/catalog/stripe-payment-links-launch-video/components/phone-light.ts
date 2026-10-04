import * as THREE from "three";
import { SANS } from "./fonts";
import { roundRect, canvasPlane } from "./type";
import { C, LINK_URL, PRODUCT } from "./brand";
import { drawMug, drawChain, softShadow } from "./ui";

/** Phone in px at scale 1. Screen is inset 17 px with a 52 px corner. */
export const PW = 428, PH = 882;
export const SW = PW - 34, SH = PH - 34;

const f = (w: number, s: number) => `${w} ${s}px ${SANS}`;
type Draw = (g: OffscreenCanvasRenderingContext2D, w: number, h: number) => void;

function statusBar(g: OffscreenCanvasRenderingContext2D, w: number) {
  g.fillStyle = C.navy;
  g.font = f(600, 20);
  g.textBaseline = "middle";
  g.textAlign = "center";
  g.fillText("9:41", 70, 34);
  for (let i = 0; i < 4; i++) g.fillRect(w - 104 + i * 6, 40 - (i + 1) * 3.2, 4, (i + 1) * 3.2);
  roundRect(g, w - 66, 27, 30, 14, 4);
  g.fill();
  g.textAlign = "left";
}

/** Chat with a friend: question, reply, and the link preview card. */
export const chatScreen: Draw = (g, w, h) => {
  g.fillStyle = "#FFFFFF";
  g.fillRect(0, 0, w, h);
  statusBar(g, w);
  g.textBaseline = "middle";
  g.fillStyle = "#F0E2FF";
  g.beginPath(); g.arc(w / 2, 104, 30, 0, Math.PI * 2); g.fill();
  g.fillStyle = C.violet;
  g.font = f(600, 26);
  g.textAlign = "center";
  g.fillText("M", w / 2, 105);
  g.fillStyle = C.navy;
  g.font = f(500, 22);
  g.fillText("Mia", w / 2, 156);
  g.fillStyle = C.line;
  g.fillRect(0, 186, w, 1.5);
  g.textAlign = "left";
  // incoming
  roundRect(g, 18, 214, 300, 64, 24);
  g.fillStyle = "#EDF0F4";
  g.fill();
  g.fillStyle = C.navy;
  g.font = f(400, 22);
  g.fillText("Is the mug still available?", 36, 247);
  // outgoing
  roundRect(g, w - 18 - 236, 300, 236, 60, 24);
  g.fillStyle = C.blurple;
  g.fill();
  g.fillStyle = "#fff";
  g.fillText("Yes! Grab it here", w - 18 - 214, 331);
  // link preview card
  const cx = w - 18 - 300, cy = 376, cw = 300;
  g.save();
  roundRect(g, cx, cy, cw, 300, 24);
  g.fillStyle = "#fff";
  g.fill();
  g.strokeStyle = C.line;
  g.lineWidth = 2;
  g.stroke();
  g.clip();
  drawMug(g, cx, cy, cw, 0);
  g.restore();
  g.fillStyle = "#F6F8FB";
  g.fillRect(cx + 1, cy + 196, cw - 2, 103);
  g.fillStyle = C.navy;
  g.font = f(600, 22);
  g.fillText(`${PRODUCT.name} · ${PRODUCT.price}`, cx + 18, cy + 232);
  g.fillStyle = C.blurple;
  g.font = f(500, 19);
  g.fillText(LINK_URL, cx + 18, cy + 268);
  // composer
  roundRect(g, 18, h - 96, w - 36, 54, 27);
  g.strokeStyle = "#D5DBE3";
  g.lineWidth = 2;
  g.stroke();
  g.fillStyle = "#9AA7B6";
  g.font = f(400, 21);
  g.fillText("Message", 40, h - 69);
};
/** Where the link preview sits on the chat screen (screen px, centre). */
export const CHAT_LINK = { x: SW - 18 - 150, y: 376 + 150 };

/** Stripe-hosted checkout for the mug. */
export const checkoutScreen: Draw = (g, w, h) => {
  g.fillStyle = "#FFFFFF";
  g.fillRect(0, 0, w, h);
  statusBar(g, w);
  g.textBaseline = "middle";
  g.fillStyle = "#F3D3C0";
  g.beginPath(); g.arc(40, 92, 14, 0, Math.PI * 2); g.fill();
  g.fillStyle = C.slate;
  g.font = f(500, 21);
  g.fillText(PRODUCT.shop, 64, 93);
  drawMug(g, 28, 124, w - 56, 22);
  g.fillStyle = C.slate;
  g.font = f(500, 22);
  g.fillText(PRODUCT.name, 28, 494);
  g.fillStyle = C.navy;
  g.font = f(600, 50);
  g.fillText(PRODUCT.price, 28, 540);
  const field = (y: number, label: string, ph: string) => {
    g.fillStyle = C.slate;
    g.font = f(500, 18);
    g.fillText(label, 28, y);
    roundRect(g, 28, y + 16, w - 56, 50, 10);
    g.strokeStyle = "#D5DBE3";
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = "#9AA7B6";
    g.font = f(400, 19);
    g.fillText(ph, 44, y + 42);
  };
  field(594, "Email", "mia@example.com");
  field(680, "Card information", "1234 1234 1234 1234");
  roundRect(g, 28, h - 100, w - 56, 64, 14);
  g.fillStyle = C.blurple;
  g.fill();
  g.fillStyle = "#fff";
  g.font = f(600, 24);
  g.textAlign = "center";
  g.fillText(`Pay ${PRODUCT.price}`, w / 2, h - 67);
  g.textAlign = "left";
};
export const PAY_BTN = { x: SW / 2, y: SH - 68, w: SW - 56, h: 64 };

/** Payment confirmed. */
export const successScreen: Draw = (g, w, h) => {
  g.fillStyle = "#FFFFFF";
  g.fillRect(0, 0, w, h);
  statusBar(g, w);
  g.textBaseline = "middle";
  g.textAlign = "center";
  g.fillStyle = C.navy;
  g.font = f(600, 32);
  g.fillText("Payment successful", w / 2, 470);
  g.fillStyle = C.slate;
  g.font = f(400, 21);
  g.fillText(`${PRODUCT.price} paid to ${PRODUCT.shop}`, w / 2, 512);
  g.textAlign = "left";
  roundRect(g, 28, 572, w - 56, 150, 16);
  g.fillStyle = "#F6F8FB";
  g.fill();
  const row = (y: number, a: string, b: string) => {
    g.fillStyle = C.slate; g.font = f(400, 19); g.fillText(a, 48, y);
    g.fillStyle = C.navy; g.font = f(500, 19); g.textAlign = "right"; g.fillText(b, w - 48, y); g.textAlign = "left";
  };
  row(612, PRODUCT.name, PRODUCT.price);
  row(650, "Shipping", "Free");
  row(688, "Total", PRODUCT.price);
};
export const SUCCESS_CHECK = { x: SW / 2, y: 340 };

function screenPlane(draw: Draw, name: string) {
  const m = canvasPlane(SW, SH, (g, w, h) => {
    g.save();
    roundRect(g, 0, 0, w, h, 52);
    g.clip();
    draw(g, w, h);
    g.restore();
  });
  m.name = name;
  return m;
}

/** A light phone: device body + a stack of screens to crossfade + the island on top. */
export function phone(name = "phone", screens: Record<string, Draw>) {
  const group = new THREE.Group();
  group.name = name;
  const shadow = softShadow(PW - 40, PH - 60, 60, 0.18, 40, `${name}-shadow`);
  shadow.position.set(0, -26, -2);
  const body = canvasPlane(PW, PH, (g) => {
    roundRect(g, 1, 1, PW - 2, PH - 2, 68);
    const rim = g.createLinearGradient(0, 0, PW, 0);
    rim.addColorStop(0, "#C9CED6");
    rim.addColorStop(0.5, "#F4F6F9");
    rim.addColorStop(1, "#BFC5CE");
    g.fillStyle = rim;
    g.fill();
    roundRect(g, 6, 6, PW - 12, PH - 12, 63);
    g.fillStyle = "#0B0D10";
    g.fill();
  });
  body.name = `${name}-body`;
  group.add(shadow, body);
  const planes: Record<string, THREE.Mesh> = {};
  let z = 1;
  for (const [k, d] of Object.entries(screens)) {
    const p = screenPlane(d, `${name}-screen-${k}`);
    p.position.z = z;
    z += 0.5;
    planes[k] = p;
    group.add(p);
  }
  const island = canvasPlane(130, 40, (g) => {
    roundRect(g, 4, 4, 122, 32, 16);
    g.fillStyle = "#000";
    g.fill();
  });
  island.name = `${name}-island`;
  island.position.set(0, PH / 2 - 17 - 34, z + 1);
  group.add(island);
  const mats = [shadow, body, island].map((m) => m.material as THREE.MeshBasicMaterial);
  return {
    group,
    planes,
    /** screen-local px (origin top-left of the screen) → group-local position */
    local(x: number, y: number) {
      return new THREE.Vector3(x - SW / 2, SH / 2 - y, 0);
    },
    show(k: string, o: number, dy = 0) {
      const p = planes[k];
      (p.material as THREE.MeshBasicMaterial).opacity = o;
      p.visible = o > 0.001;
      p.position.y = dy;
    },
    setOpacity(o: number) {
      for (const m of mats) m.opacity = o;
    },
  };
}

/** A blurple link glyph badge (for cards that receive the link). */
export function linkBadge(g: OffscreenCanvasRenderingContext2D, x: number, y: number, r: number) {
  g.fillStyle = "#EEF0FF";
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  drawChain(g, x, y, r * 1.1, C.blurple);
}

/** The success screen with its blurple check painted in (for single-texture phones). */
export const successScreenCheck: Draw = (g, w, h) => {
  successScreen(g, w, h);
  const { x, y } = SUCCESS_CHECK;
  g.fillStyle = C.blurple;
  g.beginPath(); g.arc(x, y, 75, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#fff"; g.lineWidth = 12; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); g.moveTo(x - 29, y + 3); g.lineTo(x - 9, y + 23); g.lineTo(x + 31, y - 21); g.stroke();
};
