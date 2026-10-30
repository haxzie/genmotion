import * as THREE from "three";

/** Canvas-drawn glyphs and UI art, each turned into a texture once. */

export type G = OffscreenCanvasRenderingContext2D;

export function canvasPlane(w: number, h: number, res: number, draw: (g: G) => void): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const c = new OffscreenCanvas(Math.ceil(w * res), Math.ceil(h * res));
  const g = c.getContext("2d")!;
  g.scale(res, res);
  draw(g);
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }),
  );
}

/** A classic telephone handset, centred on (cx, cy), `s` = overall size. */
export function handset(g: G, cx: number, cy: number, s: number, color: string, rot = 0): void {
  g.save();
  g.translate(cx, cy);
  g.rotate(rot);
  g.scale(s / 24, s / 24);
  g.translate(-12, -12);
  g.fillStyle = color;
  // Material-style phone glyph path (24x24 box).
  const p = new Path2D(
    "M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24 11.36 11.36 0 0 0 3.58.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z",
  );
  g.fill(p);
  g.restore();
}

/** Four-point sparkle. */
export function sparkle(g: G, cx: number, cy: number, r: number, color: string): void {
  g.save();
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(cx, cy - r);
  g.quadraticCurveTo(cx + r * 0.15, cy - r * 0.15, cx + r, cy);
  g.quadraticCurveTo(cx + r * 0.15, cy + r * 0.15, cx, cy + r);
  g.quadraticCurveTo(cx - r * 0.15, cy + r * 0.15, cx - r, cy);
  g.quadraticCurveTo(cx - r * 0.15, cy - r * 0.15, cx, cy - r);
  g.fill();
  g.restore();
}

export function person(g: G, cx: number, cy: number, r: number): void {
  g.save();
  const grad = g.createLinearGradient(0, cy - r, 0, cy + r);
  grad.addColorStop(0, "#a5a5aa");
  grad.addColorStop(1, "#86868b");
  g.fillStyle = grad;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  g.clip();
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.arc(cx, cy - r * 0.2, r * 0.32, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(cx, cy + r * 0.72, r * 0.62, r * 0.48, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

/** iOS-style app icons, drawn simply but recognisably. (x, y) = top-left. */
export function appIcon(g: G, kind: string, x: number, y: number, s: number): void {
  const r = s * 0.23;
  g.save();
  // soft shadow
  g.shadowColor = "rgba(0,0,0,0.18)";
  g.shadowBlur = s * 0.06;
  g.shadowOffsetY = s * 0.02;
  const fill = (a: string, b: string) => {
    const grad = g.createLinearGradient(0, y, 0, y + s);
    grad.addColorStop(0, a);
    grad.addColorStop(1, b);
    g.fillStyle = grad;
    rr(g, x, y, s, s, r);
    g.fill();
  };
  const cx = x + s / 2;
  const cy = y + s / 2;
  switch (kind) {
    case "facetime":
      fill("#6bf27a", "#25c43f");
      break;
    case "calendar":
    case "notes":
    case "reminders":
    case "clock":
    case "photos":
      fill("#ffffff", "#f1f1f3");
      break;
    case "camera":
      fill("#e3e3e6", "#a9a9ae");
      break;
    case "mail":
      fill("#4fb6ff", "#1a6ff0");
      break;
    case "maps":
      fill("#d9f0d3", "#9bd28e");
      break;
    case "weather":
      fill("#4aa8f5", "#1d64c9");
      break;
    case "settings":
      fill("#c9c9cd", "#8e8e93");
      break;
    case "messages":
      fill("#6bf27a", "#25c43f");
      break;
  }
  g.shadowColor = "transparent";
  switch (kind) {
    case "facetime": {
      g.fillStyle = "#ffffff";
      rr(g, x + s * 0.17, y + s * 0.33, s * 0.42, s * 0.34, s * 0.08);
      g.fill();
      g.beginPath();
      g.moveTo(x + s * 0.62, y + s * 0.47);
      g.lineTo(x + s * 0.82, y + s * 0.34);
      g.lineTo(x + s * 0.82, y + s * 0.66);
      g.lineTo(x + s * 0.62, y + s * 0.53);
      g.fill();
      break;
    }
    case "calendar": {
      g.textAlign = "center";
      g.fillStyle = "#e5383b";
      g.font = `600 ${s * 0.17}px -apple-system, Inter, sans-serif`;
      g.fillText("Tue", cx, y + s * 0.3);
      g.fillStyle = "#111";
      g.font = `300 ${s * 0.52}px -apple-system, Inter, sans-serif`;
      g.fillText("1", cx, y + s * 0.82);
      break;
    }
    case "photos": {
      const cols = ["#f9b023", "#f46a2b", "#e9334f", "#b34fd3", "#5562e8", "#2ea2ee", "#3fc552", "#a6d433"];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        g.save();
        g.translate(cx + Math.cos(a) * s * 0.17, cy + Math.sin(a) * s * 0.17);
        g.rotate(a + Math.PI / 2);
        g.globalAlpha = 0.85;
        g.fillStyle = cols[i]!;
        g.beginPath();
        g.ellipse(0, 0, s * 0.1, s * 0.17, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
      break;
    }
    case "camera": {
      g.fillStyle = "#2b2b30";
      g.beginPath();
      g.arc(cx, cy, s * 0.33, 0, Math.PI * 2);
      g.fill();
      const lg = g.createRadialGradient(cx - s * 0.06, cy - s * 0.06, s * 0.02, cx, cy, s * 0.24);
      lg.addColorStop(0, "#9fb4ff");
      lg.addColorStop(0.35, "#2a3a8a");
      lg.addColorStop(1, "#05060c");
      g.fillStyle = lg;
      g.beginPath();
      g.arc(cx, cy, s * 0.24, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case "mail": {
      g.fillStyle = "#ffffff";
      rr(g, x + s * 0.18, y + s * 0.3, s * 0.64, s * 0.42, s * 0.05);
      g.fill();
      g.strokeStyle = "#5aa8f7";
      g.lineWidth = s * 0.03;
      g.beginPath();
      g.moveTo(x + s * 0.2, y + s * 0.33);
      g.lineTo(cx, y + s * 0.53);
      g.lineTo(x + s * 0.8, y + s * 0.33);
      g.stroke();
      break;
    }
    case "notes": {
      g.save();
      rr(g, x, y, s, s, r);
      g.clip();
      g.fillStyle = "#fcd73a";
      g.fillRect(x, y, s, s * 0.26);
      g.restore();
      g.strokeStyle = "#d4d4d8";
      g.lineWidth = s * 0.015;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(x + s * 0.1, y + s * (0.48 + i * 0.16));
        g.lineTo(x + s * 0.9, y + s * (0.48 + i * 0.16));
        g.stroke();
      }
      break;
    }
    case "reminders": {
      const cols = ["#2f7bf6", "#ef3b3b", "#f59f0b"];
      for (let i = 0; i < 3; i++) {
        const yy = y + s * (0.27 + i * 0.23);
        g.fillStyle = cols[i]!;
        g.beginPath();
        g.arc(x + s * 0.22, yy, s * 0.065, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "#d4d4d8";
        g.lineWidth = s * 0.015;
        g.beginPath();
        g.moveTo(x + s * 0.36, yy);
        g.lineTo(x + s * 0.86, yy);
        g.stroke();
      }
      break;
    }
    case "clock": {
      g.fillStyle = "#111";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = `500 ${s * 0.12}px -apple-system, Inter, sans-serif`;
      for (const [n, a] of [["12", -90], ["3", 0], ["6", 90], ["9", 180]] as const) {
        const rad = (a * Math.PI) / 180;
        g.fillText(n, cx + Math.cos(rad) * s * 0.33, cy + Math.sin(rad) * s * 0.33);
      }
      g.strokeStyle = "#ccc";
      g.lineWidth = s * 0.01;
      for (let i = 0; i < 60; i++) {
        if (i % 15 === 0) continue;
        const a = (i / 60) * Math.PI * 2;
        const r0 = i % 5 === 0 ? 0.36 : 0.4;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * s * r0, cy + Math.sin(a) * s * r0);
        g.lineTo(cx + Math.cos(a) * s * 0.43, cy + Math.sin(a) * s * 0.43);
        g.stroke();
      }
      g.strokeStyle = "#111";
      g.lineCap = "round";
      g.lineWidth = s * 0.035;
      const hand = (deg: number, len: number) => {
        const a = ((deg - 90) * Math.PI) / 180;
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(a) * s * len, cy + Math.sin(a) * s * len);
        g.stroke();
      };
      hand(305, 0.2);
      hand(50, 0.3);
      g.strokeStyle = "#f59f0b";
      g.lineWidth = s * 0.012;
      hand(180, 0.34);
      break;
    }
    case "settings": {
      g.strokeStyle = "#4a4a4f";
      g.lineWidth = s * 0.08;
      g.beginPath();
      g.arc(cx, cy, s * 0.24, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = "#4a4a4f";
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.beginPath();
        g.arc(cx + Math.cos(a) * s * 0.3, cy + Math.sin(a) * s * 0.3, s * 0.04, 0, Math.PI * 2);
        g.fill();
      }
      break;
    }
    case "weather": {
      g.fillStyle = "#ffd43b";
      g.beginPath();
      g.arc(x + s * 0.4, y + s * 0.4, s * 0.15, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.ellipse(x + s * 0.55, y + s * 0.6, s * 0.25, s * 0.12, 0, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case "maps": {
      g.strokeStyle = "#ffffff";
      g.lineWidth = s * 0.08;
      g.beginPath();
      g.moveTo(x + s * 0.1, y + s * 0.8);
      g.lineTo(x + s * 0.9, y + s * 0.25);
      g.stroke();
      g.fillStyle = "#2f7bf6";
      g.beginPath();
      g.arc(x + s * 0.6, y + s * 0.45, s * 0.08, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case "messages": {
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.ellipse(cx, cy - s * 0.02, s * 0.3, s * 0.24, 0, 0, Math.PI * 2);
      g.fill();
      break;
    }
  }
  g.restore();
}

/** Status-bar signal, wifi and battery, white, starting at (x, cy). */
export function statusIcons(g: G, x: number, cy: number, s: number): void {
  g.save();
  g.fillStyle = "#ffffff";
  for (let i = 0; i < 4; i++) {
    const h = s * (0.35 + i * 0.2);
    rr(g, x + i * s * 0.32, cy + s * 0.5 - h, s * 0.22, h, s * 0.05);
    g.fill();
  }
  const wx = x + s * 1.85;
  g.strokeStyle = "#ffffff";
  g.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    g.lineWidth = s * 0.17;
    g.beginPath();
    g.arc(wx, cy + s * 0.5, s * (0.25 + i * 0.32), Math.PI * 1.25, Math.PI * 1.75);
    g.stroke();
  }
  const bx = x + s * 2.6;
  g.strokeStyle = "rgba(255,255,255,0.45)";
  g.lineWidth = s * 0.07;
  rr(g, bx, cy - s * 0.42, s * 1.45, s * 0.84, s * 0.22);
  g.stroke();
  rr(g, bx + s * 0.1, cy - s * 0.32, s * 1.25, s * 0.64, s * 0.14);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.45)";
  rr(g, bx + s * 1.52, cy - s * 0.15, s * 0.08, s * 0.3, s * 0.04);
  g.fill();
  g.restore();
}
