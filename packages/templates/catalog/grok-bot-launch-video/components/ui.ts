import * as THREE from "three";
import { REF_W, REF_H, canvasMesh, fillRR, layer, text } from "./stage";
import { drawBot } from "./bots";
import handSvgUrl from "../assets/icons/hand-pointing.svg";
import { C } from "./brand";

type G = OffscreenCanvasRenderingContext2D;

// ------------------------------------------------------------ rounded panel

/**
 * A rounded rectangle with a soft drop shadow, resizable per frame without
 * redrawing anything (an SDF in a shader). Coordinates are ref px, top-left.
 */
export function panel(
  name: string,
  opts: { color?: string; radius?: number; shadow?: number; shadowY?: number; shadowA?: number; border?: string; borderA?: number } = {},
) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uRect: { value: new THREE.Vector4(0, 0, 100, 100) },
      uRadius: { value: opts.radius ?? 40 },
      uColor: { value: new THREE.Color(opts.color ?? "#ffffff") },
      uBorder: { value: new THREE.Color(opts.border ?? "#000000") },
      uBorderA: { value: opts.borderA ?? 0 },
      uShadow: { value: new THREE.Vector3(opts.shadow ?? 40, opts.shadowY ?? 14, opts.shadowA ?? 0.1) },
      uOpacity: { value: 1 },
      uPx: { value: 1.5 },
    },
    vertexShader: `varying vec2 vRef;
      void main(){ vec4 w = modelMatrix * vec4(position,1.0);
      vRef = vec2(w.x + ${REF_W / 2}.0, ${REF_H / 2}.0 - w.y);
      gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform vec4 uRect; uniform float uRadius; uniform vec3 uColor; uniform vec3 uBorder; uniform float uBorderA;
      uniform vec3 uShadow; uniform float uOpacity; uniform float uPx;
      varying vec2 vRef;
      float sdBox(vec2 p, vec2 c, vec2 h, float r){ vec2 q = abs(p - c) - h + r; return length(max(q,0.0)) + min(max(q.x,q.y),0.0) - r; }
      void main(){
        vec2 c = uRect.xy + uRect.zw * 0.5; vec2 h = uRect.zw * 0.5;
        float r = min(uRadius, min(h.x, h.y));
        float d = sdBox(vRef, c, h, r);
        float fill = clamp(0.5 - d * uPx, 0.0, 1.0);
        float ds = sdBox(vRef, c + vec2(0.0, uShadow.y), h, r);
        float sh = uShadow.z * (1.0 - smoothstep(-uShadow.x * 0.35, uShadow.x, ds));
        float bd = clamp(1.0 - abs(d + 0.5) * uPx, 0.0, 1.0) * uBorderA;
        vec3 col = mix(uColor, uBorder, bd);
        float a = fill + (1.0 - fill) * sh;
        if (a <= 0.001) discard;
        gl_FragColor = vec4(col * fill / a, a * uOpacity);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), mat);
  mesh.name = name;
  layer(mesh);
  const u = mat.uniforms;
  return {
    mesh,
    u,
    rect(x: number, y: number, w: number, h: number) {
      u.uRect.value.set(x, y, w, h);
      mesh.userData.pickBounds = new THREE.Box3(
        new THREE.Vector3(x - REF_W / 2, REF_H / 2 - y - h, 0),
        new THREE.Vector3(x + w - REF_W / 2, REF_H / 2 - y, 0),
      );
    },
    opacity(a: number) {
      u.uOpacity.value = a;
      mesh.visible = a > 0.001;
    },
  };
}

/** Clip every material under `o` to the rect (ref px, top-left). */
export function clipTo(o: THREE.Object3D, planes: THREE.Plane[]) {
  o.traverse((c) => {
    const m = (c as THREE.Mesh).material as THREE.Material | undefined;
    if (m) m.clippingPlanes = planes;
  });
}
export function clipPlanes() {
  return [new THREE.Plane(), new THREE.Plane(), new THREE.Plane(), new THREE.Plane()];
}
export function setClip(planes: THREE.Plane[], x: number, y: number, w: number, h: number) {
  const L = x - REF_W / 2, R = x + w - REF_W / 2, T = REF_H / 2 - y, B = REF_H / 2 - y - h;
  planes[0].set(new THREE.Vector3(1, 0, 0), -L);
  planes[1].set(new THREE.Vector3(-1, 0, 0), R);
  planes[2].set(new THREE.Vector3(0, -1, 0), T);
  planes[3].set(new THREE.Vector3(0, 1, 0), -B);
}

// ------------------------------------------------------------------- icons

export function drawGear(g: G, cx: number, cy: number, s: number, color = "#3d3d40") {
  g.save();
  g.translate(cx, cy);
  g.strokeStyle = color;
  g.lineWidth = s * 0.085;
  g.lineJoin = "round";
  g.beginPath();
  const teeth = 8;
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * Math.PI * 2;
    const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? s * 0.5 : s * 0.38;
    g.arc(0, 0, r, a0 + 0.06, a1 - 0.06);
  }
  g.closePath();
  g.stroke();
  g.beginPath();
  g.arc(0, 0, s * 0.16, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

export function drawChat(g: G, cx: number, cy: number, s: number, color = "#3d3d40") {
  g.save();
  g.translate(cx, cy);
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = s * 0.08;
  g.lineJoin = "round";
  g.beginPath();
  g.arc(0, -s * 0.02, s * 0.44, Math.PI * 0.72, Math.PI * 0.62 + Math.PI * 2 - 0.0001, false);
  g.lineTo(-s * 0.42, s * 0.46);
  g.closePath();
  g.stroke();
  for (const dx of [-0.18, 0, 0.18]) {
    g.beginPath();
    g.arc(dx * s, -s * 0.02, s * 0.05, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

export function drawMic(g: G, cx: number, cy: number, s: number, color = "#3d3d40") {
  g.save();
  g.translate(cx, cy);
  g.strokeStyle = color;
  g.lineWidth = s * 0.085;
  g.lineCap = "round";
  g.beginPath();
  g.roundRect(-s * 0.15, -s * 0.5, s * 0.3, s * 0.62, s * 0.15);
  g.stroke();
  g.beginPath();
  g.arc(0, -s * 0.05, s * 0.3, 0.1, Math.PI - 0.1);
  g.stroke();
  g.beginPath();
  g.moveTo(0, s * 0.27);
  g.lineTo(0, s * 0.5);
  g.stroke();
  g.restore();
}

export function drawX(g: G, cx: number, cy: number, s: number, color = "#ffffff") {
  g.save();
  g.translate(cx, cy);
  g.strokeStyle = color;
  g.lineWidth = s * 0.1;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(-s / 2, -s / 2);
  g.lineTo(s / 2, s / 2);
  g.moveTo(s / 2, -s / 2);
  g.lineTo(-s / 2, s / 2);
  g.stroke();
  g.restore();
}

/**
 * The pointing-hand cursor: Phosphor Icons' "hand-pointing" (MIT), its fill
 * version in white under its regular outline in black. `s` is the hand's
 * height in ref px; the mesh origin is the index fingertip (the hotspot).
 */
export function handCursor(manager: THREE.LoadingManager, name = "hand-cursor", s = 170) {
  const tex = new THREE.TextureLoader(manager).load(handSvgUrl);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const size = (s * 256) / 224; // the glyph fills 224 of its 256-unit box
  const k = size / 256;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
  );
  m.geometry.translate(12 * k, -112 * k, 0); // fingertip at (116, 16) of 256
  m.name = name;
  return m;
}

// ------------------------------------------------------- call controls

/** The call control row: bot + dots, then gear / chat / mic / end buttons. */
export const CALL = {
  btnD: 96,
  btnGap: 117,
};

export function callButton(kind: "gear" | "chat" | "mic" | "end", d: number, name: string) {
  return canvasMesh(name, d, d, (g) => {
    g.beginPath();
    g.arc(d / 2, d / 2, d / 2, 0, Math.PI * 2);
    g.fillStyle = kind === "end" ? C.redX : "#efefef";
    g.fill();
    const s = d * 0.38;
    if (kind === "gear") drawGear(g, d / 2, d / 2, s);
    if (kind === "chat") drawChat(g, d / 2, d / 2, s);
    if (kind === "mic") drawMic(g, d / 2, d / 2, s);
    if (kind === "end") drawX(g, d / 2, d / 2, d * 0.28);
  }, { res: 3 });
}

/** A dot of the voice waveform (a capsule; its height is animated by scale.y). */
export function waveDot(color: string, name: string, w = 7) {
  return canvasMesh(name, w, w * 6, (g) => {
    // drawn as a tall capsule; scale.y shrinks it to a dot
    fillRR(g, 0, 0, w, w * 6, w / 2, color);
  }, { res: 4 });
}

export function speechBubble(str: string, opts: { size: number; fg: string; bg: string; padX: number; h: number; name?: string }) {
  const tmp = new OffscreenCanvas(8, 8).getContext("2d")!;
  tmp.font = `400 ${opts.size}px "Inter"`;
  (tmp as unknown as { letterSpacing: string }).letterSpacing = "-0.4px";
  const w = Math.ceil(tmp.measureText(str).width) + opts.padX * 2;
  const m = canvasMesh(opts.name ?? `bubble-${str.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`, w, opts.h, (g) => {
    fillRR(g, 0, 0, w, opts.h, opts.h / 2, opts.bg);
    text(g, str, opts.padX, opts.h / 2 + 1, { size: opts.size, color: opts.fg, tracking: -0.4 });
  });
  m.userData.width = w;
  return m;
}

export { drawBot };
