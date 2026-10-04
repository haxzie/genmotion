import * as THREE from "three";
import { C, LINK_URL } from "./brand";
import { makeChars, canvasPlane, roundRect, measureText, type TextOpts } from "./type";
import { clamp01 } from "./stage";

/** Keyframes [frame, value] → value at G, eased per segment. */
export function keyed(keys: [number, number][], G: number, ease: (t: number) => number = (t) => t) {
  if (G <= keys[0][0]) return keys[0][1];
  let i = 0;
  while (i < keys.length - 2 && G > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1];
  return THREE.MathUtils.lerp(a[1], b[1], ease(clamp01((G - a[0]) / (b[0] - a[0]))));
}

/** Smooth overshoot ease (lands at 1, peaks ≈ 1.06). */
export const easeOutBack = (t: number) => {
  t = clamp01(t);
  const c1 = 1.4, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
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

export function shapeMesh(shape: THREE.Shape, color: string, name: string) {
  const m = new THREE.Mesh(
    new THREE.ShapeGeometry(shape, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, toneMapped: false }),
  );
  m.name = name;
  return m;
}

/** Soft drop shadow for a w×h rounded card (navy, low alpha, large blur). */
export function softShadow(w: number, h: number, r: number, alpha = 0.14, blur = 34, name = "shadow") {
  const pad = blur * 2.6;
  const m = canvasPlane(w + pad * 2, h + pad * 2, (g) => {
    g.filter = `blur(${blur}px)`;
    g.fillStyle = `rgba(10,37,64,${alpha})`;
    roundRect(g, pad, pad, w, h, r);
    g.fill();
  });
  m.name = name;
  m.userData.pickable = false;
  return m;
}

/** White rounded card with a soft shadow; `draw` paints its content (card-local px, origin top-left). */
export function card(w: number, h: number, draw: (g: OffscreenCanvasRenderingContext2D, w: number, h: number) => void, name: string, r = 24) {
  const group = new THREE.Group();
  group.name = name;
  const shadow = softShadow(w, h, r, 0.13, 30, `${name}-shadow`);
  shadow.position.set(0, -16, -1);
  const body = canvasPlane(w, h, (g) => {
    roundRect(g, 0.5, 0.5, w - 1, h - 1, r);
    g.fillStyle = C.surface;
    g.fill();
    g.strokeStyle = "rgba(10,37,64,0.06)";
    g.lineWidth = 1;
    g.stroke();
    g.save();
    roundRect(g, 0, 0, w, h, r);
    g.clip();
    draw(g, w, h);
    g.restore();
  });
  body.name = `${name}-body`;
  group.add(shadow, body);
  const mats = [shadow.material as THREE.MeshBasicMaterial, body.material as THREE.MeshBasicMaterial];
  return {
    group,
    body,
    shadow,
    setOpacity(o: number) {
      mats[0].opacity = o;
      mats[1].opacity = o;
      group.visible = o > 0.001;
    },
  };
}

/** Chain-link glyph, centred at (x, y), `s` px across. */
export function drawChain(g: OffscreenCanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  g.save();
  g.translate(x, y);
  g.rotate(-Math.PI / 4);
  g.strokeStyle = color;
  g.lineWidth = s * 0.13;
  g.lineCap = "round";
  const lw = s * 0.36, lh = s * 0.22, r = lh;
  roundRect(g, -lw - s * 0.02, -lh, lw * 1.25, lh * 2, r);
  g.stroke();
  roundRect(g, -lw * 0.23 + s * 0.02, -lh, lw * 1.25, lh * 2, r);
  g.stroke();
  g.restore();
}

/** A capsule built from two discs and a bar, so it can morph dot → pill → flood crisply. */
export function capsule(color: string, name: string) {
  const group = new THREE.Group();
  group.name = name;
  // depthWrite + LessDepth: where the discs overlap the bar, only one fragment draws,
  // so the capsule fades as one shape with no darker seams.
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: true, depthFunc: THREE.LessDepth, toneMapped: false });
  const disc = new THREE.CircleGeometry(1, 64);
  const l = new THREE.Mesh(disc, mat), r = new THREE.Mesh(disc, mat);
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  l.name = `${name}-l`; r.name = `${name}-r`; bar.name = `${name}-bar`;
  group.add(l, r, bar);
  return {
    group, mat,
    /** outer width w ≥ h, height h */
    setSize(w: number, h: number) {
      const rad = h / 2;
      const span = Math.max(0, w - h);
      l.scale.setScalar(rad); r.scale.setScalar(rad);
      l.position.x = -span / 2; r.position.x = span / 2;
      bar.scale.set(Math.max(span, 0.001), h, 1);
      bar.visible = span > 0.01;
    },
  };
}

/** The link pill: blurple capsule, chain badge, URL typed per character. */
export function linkPill(name = "link-pill", url = LINK_URL) {
  const H = 112;
  const T: TextOpts = { size: 44, weight: 500, tracking: -0.005, color: "#ffffff" };
  const tw = measureText(url, T);
  const W = Math.round(112 + tw + 56);
  const group = new THREE.Group();
  group.name = name;
  const glowPlane = canvasPlane(W + 240, H + 240, (g) => {
    g.filter = "blur(34px)";
    g.fillStyle = "rgba(99,91,255,0.38)";
    roundRect(g, 120, 140, W, H, H / 2);
    g.fill();
  });
  glowPlane.name = `${name}-glow`;
  glowPlane.userData.pickable = false;
  glowPlane.position.z = -1;
  const body = capsule(C.blurple, `${name}-body`);
  body.setSize(W, H);
  const badge = canvasPlane(84, 84, (g) => {
    g.fillStyle = "#ffffff";
    g.beginPath(); g.arc(42, 42, 40, 0, Math.PI * 2); g.fill();
    drawChain(g, 42, 42, 46, C.blurple);
  });
  badge.name = `${name}-badge`;
  badge.position.set(-W / 2 + 56, 0, 1);
  const chars = makeChars(url, T, `${name}-url`);
  chars.group.position.set(-W / 2 + 112 + chars.width / 2, 0, 1);
  group.add(glowPlane, body.group, badge, chars.group);
  // the link always draws over cards and UI it emerges from
  group.traverse((o) => { o.renderOrder = 20; });
  glowPlane.renderOrder = 19;
  return {
    group, body, badge, glow: glowPlane, chars, W, H,
    /** 0..1 of the URL typed */
    type(p: number, opacity = 1) {
      const n = Math.floor(p * url.length + 1e-6);
      let k = 0;
      for (let i = 0; i < url.length; i++) {
        if (url[i] === " ") continue;
        chars.chars[k++].set(i < n ? opacity : 0);
      }
    },
    setOpacity(o: number) {
      body.mat.opacity = o;
      (badge.material as THREE.MeshBasicMaterial).opacity = o;
      (glowPlane.material as THREE.MeshBasicMaterial).opacity = o;
    },
  };
}

/** Classic arrow cursor (white with navy outline), tip at the group origin. */
export function cursor(name = "cursor") {
  const m = canvasPlane(64, 64, (g) => {
    g.translate(8, 6);
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(0, 40); g.lineTo(10, 31); g.lineTo(17, 47); g.lineTo(24, 44); g.lineTo(17, 28); g.lineTo(30, 28);
    g.closePath();
    g.shadowColor = "rgba(10,37,64,0.3)";
    g.shadowBlur = 8;
    g.shadowOffsetY = 3;
    g.fillStyle = "#ffffff";
    g.fill();
    g.shadowColor = "transparent";
    g.strokeStyle = C.navy;
    g.lineWidth = 2.5;
    g.lineJoin = "round";
    g.stroke();
  });
  m.position.set(32 - 8, -(32 - 6), 0);
  const group = new THREE.Group();
  group.name = name;
  group.add(m);
  return { group, mat: m.material as THREE.MeshBasicMaterial };
}

/** iOS-style toggle; set(t) 0 = off, 1 = on. */
export function toggle(name: string) {
  const group = new THREE.Group();
  group.name = name;
  const track = shapeMesh(roundedRectShape(84, 48, 24), "#D5DBE3", `${name}-track`);
  const knob = shapeMesh(roundedRectShape(40, 40, 20), "#ffffff", `${name}-knob`);
  knob.position.z = 1;
  group.add(track, knob);
  const off = new THREE.Color("#D5DBE3"), on = new THREE.Color(C.blurple);
  const tm = track.material as THREE.MeshBasicMaterial;
  return {
    group,
    set(t: number) {
      tm.color.copy(off).lerp(on, t);
      knob.position.x = THREE.MathUtils.lerp(-18, 18, t);
    },
  };
}

/** The product illustration: a clay mug on a warm tile. Draws into (x, y, s×s). */
export function drawMug(g: OffscreenCanvasRenderingContext2D, x: number, y: number, s: number, radius = 18) {
  g.save();
  roundRect(g, x, y, s, s, radius);
  const bg = g.createLinearGradient(x, y, x + s, y + s);
  bg.addColorStop(0, "#FBE9DD");
  bg.addColorStop(1, "#F3D3C0");
  g.fillStyle = bg;
  g.fill();
  const k = s / 200;
  g.translate(x, y);
  g.scale(k, k);
  // shadow
  g.fillStyle = "rgba(120,60,30,0.12)";
  g.beginPath(); g.ellipse(100, 160, 62, 12, 0, 0, Math.PI * 2); g.fill();
  // handle
  g.strokeStyle = "#C9734B";
  g.lineWidth = 13;
  g.beginPath(); g.arc(142, 100, 24, -Math.PI / 2.2, Math.PI / 2.2); g.stroke();
  // body
  const mg = g.createLinearGradient(52, 0, 148, 0);
  mg.addColorStop(0, "#D9855A");
  mg.addColorStop(0.55, "#E79B70");
  mg.addColorStop(1, "#C36D45");
  g.fillStyle = mg;
  g.beginPath();
  g.moveTo(52, 58); g.lineTo(148, 58); g.lineTo(142, 150);
  g.quadraticCurveTo(140, 162, 128, 162); g.lineTo(72, 162);
  g.quadraticCurveTo(60, 162, 58, 150); g.closePath();
  g.fill();
  g.fillStyle = "#F1C4A8";
  g.beginPath(); g.ellipse(100, 58, 48, 10, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#8E4A2C";
  g.beginPath(); g.ellipse(100, 59, 42, 7, 0, 0, Math.PI * 2); g.fill();
  g.restore();
}

/** Light page ground: #F6F9FC, a faint dot grid, a soft white lift in the centre. */
export function lightGround(name = "ground", opts: { glow?: boolean } = {}) {
  const m = canvasPlane(1920, 1080, (g, w, h) => {
    g.fillStyle = C.page;
    g.fillRect(0, 0, w, h);
    const r = g.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, w * 0.55);
    r.addColorStop(0, "rgba(255,255,255,0.55)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(10,37,64,0.075)";
    for (let y = 24; y < h; y += 48) for (let x = 24; x < w; x += 48) {
      g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill();
    }
    if (opts.glow) {
      g.filter = "blur(120px)";
      for (const [x, y, c] of [[w * 0.18, h * 0.92, "rgba(169,96,238,0.22)"], [w * 0.82, h * 0.1, "rgba(0,212,255,0.18)"], [w * 0.9, h * 0.95, "rgba(255,203,87,0.16)"]] as const) {
        g.fillStyle = c;
        g.beginPath(); g.arc(x, y, 300, 0, Math.PI * 2); g.fill();
      }
      g.filter = "none";
    }
  }, { transparent: false });
  m.name = name;
  m.userData.pickable = false;
  m.renderOrder = -100;
  (m.material as THREE.MeshBasicMaterial).depthTest = false;
  return m;
}
