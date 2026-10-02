# Line art: strokes that draw on and erase

The whiteboard explainer template draws every diagram line as a pen stroke and erases it back along its path before each cut. The trick is a flat ribbon whose vertices carry `aT`, their position along the stroke (0 → 1 by arc length); the fragment shader discards everything past `uReveal` and before `uErase`. Two uniforms, set per frame, are the whole animation: no geometry is rebuilt. The same ribbon draws pen underlines, gauge rings, chart lines and arrows in any family.

Contents: 1 `components/stroke.ts` · 2 Drawing on and erasing · 3 Hand-drawn wobble · 4 Board timing · 5 Width that survives a scale change

## 1. `components/stroke.ts`

Points are composition px from the frame centre, y up, for the fitted camera of `three-camera` (`PX` = 0.01). For an orthographic pixel camera, drop the `* PX`.

```ts
import * as THREE from "three";
import { PX } from "./stage";

type Pt = [number, number]; // composition px from frame centre, y up

/**
 * A pen stroke as a flat ribbon whose vertices carry `aT` (0 at the start, 1 at the end,
 * by arc length). The shader discards everything past uReveal and before uErase, so a
 * stroke draws on and erases back along its own path: pure functions of two uniforms.
 * The width is a uniform too: uWidth (px) / uScale, applied in the vertex shader, so a
 * stroke keeps its on-screen width when its group is scaled (set uScale to that scale).
 */
export function stroke(points: Pt[], widthPx: number, color: string, name: string) {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!;
    cum.push(cum[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = cum[cum.length - 1]! || 1;
  const pos: number[] = [];
  const side: number[] = []; // unit normal per vertex (+ on one edge, - on the other); the shader scales it
  const ts: number[] = [];
  const idx: number[] = [];
  points.forEach((p, i) => {
    const prev = points[Math.max(0, i - 1)]!, next = points[Math.min(points.length - 1, i + 1)]!;
    let tx = next[0] - prev[0], ty = next[1] - prev[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    pos.push(p[0] * PX, p[1] * PX, 0, p[0] * PX, p[1] * PX, 0); // both edges start on the centre line
    side.push(-ty, tx, ty, -tx);
    const t = cum[i]! / total;
    ts.push(t, t);
    if (i > 0) {
      const k = (i - 1) * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("aT", new THREE.Float32BufferAttribute(ts, 1));
  geo.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 2));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  geo.boundingSphere!.radius += (widthPx * 2 * PX); // room for a widened stroke (culling)

  const uniforms = {
    uWidth: { value: widthPx }, // px at scale 1
    uScale: { value: 1 }, // the group's scale: width is divided by it, so it stays uWidth px on screen
    uPx: { value: PX },
    uColor: { value: new THREE.Color(color) },
    uReveal: { value: 0 },
    uErase: { value: 0 },
    uOpacity: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute float aT;
      attribute vec2 aSide;
      uniform float uWidth, uScale, uPx;
      varying float vT;
      void main() {
        vT = aT;
        vec2 off = aSide * 0.5 * uWidth * uPx / max(uScale, 1e-3);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy + off, position.z, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uReveal, uErase, uOpacity;
      varying float vT;
      void main() {
        if (vT > uReveal || vT < uErase) discard;
        gl_FragColor = vec4(uColor, uOpacity);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  return { mesh, u: uniforms };
}

/** Points along a circle or arc (radians), for rings, gauges and hand-drawn circles. */
export function arcPoints(cx: number, cy: number, r: number, a0: number, a1: number, steps = 96): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}
```

## 2. Drawing on and erasing

```ts
const under = stroke([[-300, -130], [-100, -140], [100, -128], [300, -136]], 6, LOOK.accent, "underline");
scene.add(under.mesh);
// frame: draw 12f outCubic, 12f after the phrase is legible; erase 10f inOutCubic, 18f before the end
under.u.uReveal.value = prog(frame, 30, 12, outCubic);
under.u.uErase.value = prog(frame, D - 18, 10, inOutCubic);
under.mesh.visible = under.u.uReveal.value > 0 && under.u.uErase.value < 1;
```

- A shape made of several pen moves (a box, an arrow and its head) is one ribbon whose sub-paths take consecutive slices of `t` (0–0.7 for the shaft, 0.7–1 for the head), so it draws in pen order.
- Duration by length: strokes 8–20f; text written by hand `clamp(widthPx / 45, 8, 18)` frames.
- Rings and gauges: `stroke(arcPoints(cx, cy, r, a0, a1), ...)`; a gauge pointer and its arc share the same eased progress so both land on the same frame.
- Fills (hatching, a highlight swatch) fade or wipe in after their outline, never before.

## 3. Hand-drawn wobble

Straight lines read as vector art. For the whiteboard look, bow each line slightly and overshoot its ends, from a seeded hash of the stroke's index, never a random source:

```ts
function rough(a: [number, number], b: [number, number], seed: number, k = 1): [number, number][] {
  const r = (n: number) => hash1(seed * 31 + n) - 0.5;          // hash1 from components/ease.ts
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len, ux = dx / len, uy = dy / len;
  const bow = r(1) * Math.min(len * 0.025, 7) * k, o0 = (r(2) * 4 + 1) * k, o1 = (r(3) * 5 + 1.5) * k;
  const steps = Math.max(2, Math.ceil(len / 24));
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps, off = bow * Math.sin(Math.PI * u);
    pts.push([a[0] - ux * o0 + dx * u + (ux * (o0 + o1)) * u + nx * off, a[1] - uy * o0 + dy * u + (uy * (o0 + o1)) * u + ny * off]);
  }
  return pts;
}
```

Draw two passes per line (the second at 0.8× width with a different seed) for the marker look. Ink `#1e1e1e` on paper `#ffffff`, accent pen red `#e03131`, stroke width 2.6–6 px.

## 4. Board timing (the whiteboard grammar)

| Element | Starts | Duration |
| --- | --- | --- |
| Tag and number | 0–2f | 10–12f |
| Title | 6f | by length |
| Subtitle | 16f | by length |
| Diagram strokes | 24–60f | 8–20f each, in pen order |
| Examples | 76–124f, 5f apart | by length |
| Board erase | `D − 18` | 10f inOutCubic, every element reverses its own reveal |
| Blank paper | last 8f | the cut lands on identical paper |

The camera drift uses `restDrift` (`three-camera`) so it is at rest at both ends, and the VO starts 6f after every cut (`sound-design`).

## 5. Width that survives a scale change

A 3 px line drawn at scale 1 is 1.5 px when its group scales to 0.5 for an end card, and under 2 px a line aliases and flickers in the encode (measured in a judged film: 3.4 px ribbons fell to about 2 px and broke up). Width is a uniform, so keep it on screen:

```ts
// frame: the whole drawing scales into the end card; its strokes keep 3 px on screen
rig.scale.setScalar(s);
for (const st of strokes) st.u.uScale.value = s;            // width / s in local units = 3 px on screen
// or let it thin a little but never below 2 px:  st.u.uWidth.value = Math.max(2 / s, 3);  (uScale left at 1)
```

- `uScale` is the product of the scales above the stroke (`mesh.getWorldScale(v).x` once per frame if several groups scale). A perspective camera adds its own factor for strokes off the z = 0 plane: multiply by `D0 / (D0 − z)` (`three-camera`).
- **Floor: 2 px on screen for any line that must read, 1.5 px for a hairline texture.** Below that, thicken it or drop it.
- For outlines whose *size* changes per frame (a box that resizes, a rounded rectangle with a gap), the ribbon would have to be rebuilt every frame: use `three-assets`' `outline()` (`references/outline.md` there), a signed-distance shader whose stroke is in screen px.
