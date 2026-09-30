import * as THREE from "three";
import { Easing, interpolate } from "@genmotion/three-engine";
import { C, FONT_EN, FONT_JP } from "./brand";
import { label } from "./text";
import type { HudHost as Stage } from "./world";

/**
 * The p(doom) keyframes: the number the song keeps "upping". Each chorus
 * bumps it on the word "p(doom)". [songTime, value 0..100]
 */
export const PDOOM: [number, number][] = [
  [0, 3],
  [23.68, 23],
  [42.5, 38],
  [60.04, 57],
  [96.36, 76],
  [111.2, 88],
  [125.7, 99.9],
];
export function pdoomAt(t: number): number {
  let v = PDOOM[0][1];
  for (let i = 1; i < PDOOM.length; i++) {
    const [kt, kv] = PDOOM[i];
    const prev = PDOOM[i - 1][1];
    if (t >= kt) v = interpolate(t, [kt, kt + 0.45], [prev, kv], Easing.easeOut);
  }
  return v;
}

const GLYPHS = "0123456789.%";

/** A glyph atlas so a number can change every frame without redrawing a canvas. */
function glyphSet(size: number, color: string) {
  const ss = 2;
  const font = `500 ${size * ss}px ${FONT_EN}`;
  const m = new OffscreenCanvas(8, 8).getContext("2d")!;
  m.font = font;
  let cw = 0;
  for (const ch of GLYPHS) cw = Math.max(cw, m.measureText(ch).width);
  cw = Math.ceil(cw * 1.02);
  const ch = Math.ceil(size * ss * 1.25);
  const tex = new Map<string, THREE.CanvasTexture>();
  for (const g of GLYPHS) {
    const c = new OffscreenCanvas(cw, ch);
    const x = c.getContext("2d")!;
    x.font = font;
    x.fillStyle = color;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(g, cw / 2, ch / 2);
    const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
    t.colorSpace = THREE.SRGBColorSpace;
    tex.set(g, t);
  }
  return { tex, w: cw / ss, h: ch / ss };
}

/** Right-aligned number made of swappable glyph slots. */
export function numberDisplay(size: number, slots: number, color = "#ffffff", name = "number") {
  const set = glyphSet(size, color);
  const group = new THREE.Group();
  group.name = name;
  const geo = new THREE.PlaneGeometry(set.w, set.h);
  const cells: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  const narrow = set.w * 0.55;
  for (let i = 0; i < slots; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: set.tex.get("0")!, transparent: true, depthTest: false, depthWrite: false }));
    m.name = `${name}-digit-${i}`;
    group.add(m);
    cells.push(m);
  }
  let opacity = 1;
  const setText = (s: string) => {
    const chars = s.slice(-slots).split("");
    // lay out right-aligned; '.' is narrow
    let x = 0;
    for (let i = slots - 1; i >= 0; i--) {
      const ch = chars[i - (slots - chars.length)];
      const cell = cells[i];
      if (ch === undefined) {
        cell.visible = false;
        continue;
      }
      cell.visible = true;
      cell.material.map = set.tex.get(ch) ?? set.tex.get("0")!;
      cell.material.opacity = opacity;
      const w = ch === "." ? narrow * 0.7 : ch === "%" ? set.w * 1.05 : narrow * 1.08;
      x -= w / 2;
      cell.position.x = x;
      x -= w / 2;
    }
  };
  const setColor = (c: THREE.Color) => cells.forEach((m) => m.material.color.copy(c));
  return { group, setText, setColor, setOpacity: (o: number) => (opacity = o), h: set.h };
}

/** Top-left p(doom) gauge — the recurring motif. */
export function createPdoomMeter(st: Stage) {
  const g = new THREE.Group();
  g.name = "pdoom-meter";
  const x0 = -st.W / 2 + 72;
  const y0 = st.H / 2 - 70;
  g.position.set(x0, y0, 0);

  const title = label("p(doom)", { size: 32, weight: 500, color: C.text, align: "left", tracking: 0.02 });
  title.name = "pdoom-label";
  title.position.set(-8, 0, 0);
  const jp = label("破滅確率", { size: 28, weight: 600, color: C.cyan, font: FONT_JP, align: "left", tracking: 0.1 });
  jp.name = "pdoom-label-jp";
  jp.position.set(title.w - 4, 0, 0);
  const num = numberDisplay(88, 5, "#ffffff", "pdoom-value");
  num.group.position.set(330, -78, 0);

  const trackW = 340;
  const track = new THREE.Mesh(
    new THREE.PlaneGeometry(trackW, 8),
    new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.18, depthTest: false, depthWrite: false }),
  );
  track.name = "pdoom-track";
  track.position.set(trackW / 2, -142, 0);
  const fillGeo = new THREE.PlaneGeometry(trackW, 8);
  fillGeo.translate(trackW / 2, 0, 0);
  const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: C.pink, transparent: true, depthTest: false, depthWrite: false }));
  fill.name = "pdoom-fill";
  fill.position.set(0, -142, 0);
  g.add(title, jp, num.group, track, fill);
  st.put(st.hud, g, 800);

  const white = new THREE.Color("#ffffff");
  const red = new THREE.Color("#ff4d6d");
  const pink = new THREE.Color(C.pink);
  const tmp = new THREE.Color();

  const update = (t: number, opacity: number) => {
    g.visible = opacity > 0.001;
    const v = pdoomAt(t);
    const txt = v >= 99.5 ? v.toFixed(1) + "%" : Math.round(v) + "%";
    num.setOpacity(opacity);
    num.setText(txt);
    const danger = THREE.MathUtils.smoothstep(v, 60, 95);
    num.setColor(tmp.copy(white).lerp(red, danger * 0.85));
    fill.scale.x = Math.max(0.001, v / 100);
    fill.material.color.copy(pink).lerp(red, danger);
    fill.material.opacity = opacity;
    track.material.opacity = 0.18 * opacity;
    title.material.opacity = opacity;
    jp.material.opacity = opacity;
    // a kick on each bump
    let kick = 0;
    for (const [kt] of PDOOM) if (t >= kt && t < kt + 0.6) kick = Math.exp(-(t - kt) * 7);
    num.group.scale.setScalar(1 + 0.25 * kick);
    g.position.x = x0 + (Math.sin(t * 60) * 4 * kick);
  };
  return { group: g, update };
}
