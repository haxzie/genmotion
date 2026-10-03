# Social launch looks: grounds, edge light and soft gloss

The looks of short social launch films (`launch-taste`'s title-card interleave, glossy icons and tokens, perspective UI showcase, gradient-light mood, editorial documentary; `direction`'s family K and the soft-gloss C and editorial G variants), built so they stay exact under the CLI's renderer. Everything here goes in `components/look.ts` beside `backdrop()` (`backdrops-and-finish.md`), compiles against `three` r185 with the project's strict settings, and is a pure function of the frame: positions, hues and phases come from the frame number and `hash1`, never from randomness or wall-clock time.

Contents: 1 Mesh ground with a horizon glow · 2 Glow outline (the live control) · 3 Soft gloss: icons and coins · 4 Motion ghosts for fast objects · 5 Daylight shadow on paper · 6 Choosing a ground

## 1. Mesh ground with a horizon glow

A drifting mesh of 3–4 soft colour points on a dark (or light) base, an optional glow rising from one edge, and the static display-space grain that keeps it from banding. It replaces the radial lift for films whose ground carries the brand (family K, gradient-light mood). Keep the points at low saturation against the base and put the brightest one under or behind the subject.

```ts
import * as THREE from "three";
import { hash1 } from "./ease";

export type MeshGround = ReturnType<typeof meshGround>;

/** Clip-space mesh gradient: base + up to 4 drifting colour points + an edge glow + static grain. */
export function meshGround(aspect: number, base: string, points: string[], horizon = base) {
  const cols = [0, 1, 2, 3].map((i) => new THREE.Color(points[i] ?? base));
  const uniforms = {
    uAspect: { value: aspect },
    uBase: { value: new THREE.Color(base) },
    uCol: { value: cols },
    uPos: { value: [0, 1, 2, 3].map(() => new THREE.Vector2(0.5, 0.5)) },
    uRad: { value: [0.55, 0.5, 0.45, 0.4] },
    uAmt: { value: [0, 1, 2, 3].map((i) => (points[i] ? 0.85 : 0)) },
    uHorizon: { value: new THREE.Color(horizon) },
    uHorizonAmt: { value: 0 },       // 0..1 strength of the glow rising from the bottom edge
    uHorizonH: { value: 0.32 },      // its height as a fraction of the frame
    uGrain: { value: 0.015 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    depthTest: false,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.9999, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uAspect, uHorizonAmt, uHorizonH, uGrain;
      uniform vec3 uBase, uHorizon;
      uniform vec3 uCol[4];
      uniform vec2 uPos[4];
      uniform float uRad[4], uAmt[4];
      uint pcg(uint v) { uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
      float grain(vec2 px) { uvec2 q = uvec2(px); return float(pcg(q.x + pcg(q.y))) / 4294967295.0; }
      void main() {
        vec3 col = uBase;
        for (int i = 0; i < 4; i++) {
          vec2 d = vec2((vUv.x - uPos[i].x) * uAspect, vUv.y - uPos[i].y);
          float w = exp(-dot(d, d) / (uRad[i] * uRad[i] * 0.5)) * uAmt[i];   // soft gaussian point
          col = mix(col, uCol[i], clamp(w, 0.0, 1.0));
        }
        float h = smoothstep(uHorizonH, 0.0, vUv.y) * uHorizonAmt;            // glow rising from the bottom
        col = mix(col, uHorizon, h * h);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
        gl_FragColor.rgb += (grain(gl_FragCoord.xy) - 0.5) * uGrain;          // after colour space, static
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  mesh.name = "mesh-ground";
  mesh.userData.pickable = false;
  return { mesh, u: uniforms };
}

/** Drift the points as a pure function of time: slow orbits of 3–6% of the frame, seeded per point. */
export function driftMesh(g: MeshGround, time: number, anchors: [number, number][], amp = 0.05) {
  anchors.forEach(([x, y], i) => {
    const ph = hash1(i + 11) * Math.PI * 2;
    const hz = 0.05 + 0.04 * hash1(i + 29);              // one loop every 12–20 s
    g.u.uPos.value[i]!.set(
      x + amp * Math.sin(time * Math.PI * 2 * hz + ph),
      y + amp * 0.7 * Math.cos(time * Math.PI * 2 * hz * 0.8 + ph),
    );
  });
}
```

```ts
// a dark K ground: near-black tinted violet, two violet points, a cool one, a violet horizon
const ground = meshGround(width / height, "#0c0518", ["#2a1450", "#41208a", "#1b1440"], "#6f3fb3"); // builder
scene.add(ground.mesh);
// frame
driftMesh(ground, time, [[0.25, 0.75], [0.7, 0.3], [0.85, 0.85]]);
ground.u.uHorizonAmt.value = 0.55 + 0.05 * Math.sin(time * Math.PI * 0.4);       // breathes, never pulses
// a section change: lerp the point colours over 18–24f on the cut's carrier, never in one frame
```

- **Saturation**: points at 30–60% of the accent's chroma against the base; a full-chroma blob behind small type is the "neon gradient" failure. White or near-white type stays ≥ 4.5:1 against the brightest point it crosses (check the capture).
- **Light grounds**: base `#ffffff`, one point in the accent at 8–15% tint, and the horizon in the accent (white into mint) for the light K variant.
- **Brand end card**: fade `uAmt` and `uHorizonAmt` to 0 and the grain last over ≥ 20f, as for the backdrop.

## 2. Glow outline (the live control)

A rounded rectangle's edge lit by a band of colour that travels round it, plus a soft outer glow: the "this control is active" signal of a lifted control (a field being typed into, a pill, a button about to be pressed). One per frame at most. It is a plane slightly larger than the control, placed just behind or just in front of it; the control's own canvas draws the fill.

```ts
/** A travelling gradient outline round a rounded rect of w × h px (radius r px). Unlit, exact colours. */
export function glowOutline(w: number, h: number, r: number, colors: string[], PX: number, stroke = 3, glowPx = 28) {
  const pad = glowPx * 2;
  const stops = [0, 1, 2, 3].map((i) => new THREE.Color(colors[i % colors.length]!));
  const uniforms = {
    uSize: { value: new THREE.Vector2(w, h) },
    uPad: { value: pad },
    uR: { value: r },
    uStroke: { value: stroke },
    uGlow: { value: glowPx },
    uTurn: { value: 0 },          // 0..1 round the perimeter; drive it from the frame
    uOpacity: { value: 1 },
    uStops: { value: stops },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform vec2 uSize; uniform float uPad, uR, uStroke, uGlow, uTurn, uOpacity;
      uniform vec3 uStops[4];
      float sdRound(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
      vec3 ramp(float t) {                       // 4 stops round the loop, wrapping
        float x = fract(t) * 4.0; int i = int(floor(x)); float f = smoothstep(0.0, 1.0, fract(x));
        vec3 a = uStops[0], b = uStops[1];
        if (i == 1) { a = uStops[1]; b = uStops[2]; } else if (i == 2) { a = uStops[2]; b = uStops[3]; } else if (i == 3) { a = uStops[3]; b = uStops[0]; }
        return mix(a, b, f);
      }
      void main() {
        vec2 full = uSize + 2.0 * uPad;
        vec2 p = (vUv - 0.5) * full;                               // px from the centre
        float d = sdRound(p, uSize * 0.5, uR);
        float line = 1.0 - smoothstep(uStroke * 0.5, uStroke * 0.5 + 1.5, abs(d));
        float halo = exp(-max(d, 0.0) / uGlow) * step(0.0, d) * 0.55;
        float ang = atan(p.y, p.x) / 6.2831853 + 0.5;               // 0..1 round the shape
        vec3 c = ramp(ang - uTurn);
        gl_FragColor = vec4(c * (line + halo) * uOpacity, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry((w + 2 * pad) * PX, (h + 2 * pad) * PX), mat);
  mesh.name = "glow-outline";
  mesh.userData.pickable = false;
  return { mesh, u: uniforms };
}
```

```ts
const ring = glowOutline(980, 150, 40, ["#ff5a5f", "#ffd23f", "#3ddc84", "#4f8bff"], PX); // builder
ring.mesh.position.z = -0.01;                                     // just behind the field plane
// frame: one turn per 3.5 s; fades up with the field's entrance, out as it hands off
ring.u.uTurn.value = time / 3.5;
ring.u.uOpacity.value = prog(frame, FIELD_IN, 12, outCubic) * (1 - prog(frame, HANDOFF, 10, inCubic));
```

- Additive, so on a light ground use `THREE.NormalBlending` and multiply the halo down to 0.25; on white the outline needs a darker ramp (the accent at full chroma) to read.
- When the control morphs (field → button → pill), resize by rebuilding the geometry once per state in the builder and crossfading two outlines over 8–10f, or scale the mesh and set `uSize` per frame to the morph's current size: the stroke stays 3 px because the SDF is in px.
- One live outline at a time. An outline on every card is decoration again.

## 3. Soft gloss: icons and coins

The toy-like clearcoat plastic of glossy icon and token films: rounded, soft, saturated, with a crisp highlight. It needs `studioEnvironment()` and the product lights (`color-and-light.md`) and the `brand` pipeline so the colours hold. One material per colour, reused across the film.

```ts
/** Soft clearcoat plastic: saturated body, gentle sheen, crisp clearcoat highlight. */
export function softGloss(color: string) {
  return new THREE.MeshPhysicalMaterial({
    color, metalness: 0.05, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.12,
    sheen: 0.4, sheenRoughness: 0.5, sheenColor: new THREE.Color("#ffffff"),
  });
}

/** An app-icon squircle w px wide, depth 18% of w, bevel 8% of w, with a flat glyph face in front. */
export function squircleIcon(w: number, body: THREE.Material, glyph: THREE.Texture | null, PX: number, name = "icon") {
  const s = (w * PX) / 2, r = s * 0.45;                     // corner radius ~45% of the half-width
  const shape = new THREE.Shape();
  shape.moveTo(-s + r, -s);
  shape.lineTo(s - r, -s); shape.quadraticCurveTo(s, -s, s, -s + r);
  shape.lineTo(s, s - r);  shape.quadraticCurveTo(s, s, s - r, s);
  shape.lineTo(-s + r, s); shape.quadraticCurveTo(-s, s, -s, s - r);
  shape.lineTo(-s, -s + r); shape.quadraticCurveTo(-s, -s, -s + r, -s);
  const bevel = w * PX * 0.08;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: w * PX * 0.18 - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9,
    bevelSegments: 6, curveSegments: 24,
  });
  geo.center();
  const g = new THREE.Group();
  g.name = name;
  g.add(new THREE.Mesh(geo, body));
  if (glyph) {
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(w * PX * 0.62, w * PX * 0.62),
      new THREE.MeshBasicMaterial({ map: glyph, transparent: true, toneMapped: false }),
    );
    face.position.z = w * PX * 0.09 + 0.002;               // just proud of the front face
    g.add(face);
  }
  return g;
}

/** A thick-rimmed coin d px across: a lathe profile with a raised rim, the face decal in front. */
export function coin(d: number, body: THREE.Material, face: THREE.Texture | null, PX: number, name = "coin") {
  const R = (d * PX) / 2, t = R * 0.22;                     // thickness 11% of the diameter
  const prof = [
    [0, -t], [R * 0.82, -t], [R * 0.86, -t * 1.25], [R, -t * 1.1], [R * 1.02, 0],
    [R, t * 1.1], [R * 0.86, t * 1.25], [R * 0.82, t], [0, t],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(prof, 64);
  geo.rotateX(Math.PI / 2);                                 // face toward +z
  const g = new THREE.Group();
  g.name = name;
  g.add(new THREE.Mesh(geo, body));
  if (face) {
    for (const side of [1, -1]) {
      const m = new THREE.Mesh(
        new THREE.CircleGeometry(R * 0.78, 48),
        new THREE.MeshBasicMaterial({ map: face, transparent: true, toneMapped: false }),
      );
      m.position.z = side * (t + 0.002);
      if (side < 0) m.rotation.y = Math.PI;
      g.add(m);
    }
  }
  return g;
}
```

- Glyphs and coin faces are canvas textures drawn once at 2× (an illustrative glyph in the film's palette; real third-party marks only when the user supplies the files and the right to use them).
- Bevel and corner radius are what make it read as "soft gloss"; a sharp extrusion reads as a logo slab. Keep the rim light on: it is what separates a dark coin from a dark ground.

## 4. Motion ghosts for fast objects

There is no motion-blur pass. Because every pose is a function of the frame, a fast object can carry 3 ghost copies posed a fraction of a frame earlier, transparent and fading: the near, fast objects of a swarm look blurred and the slow ones stay sharp.

```ts
/** Ghost copies of `obj` (same geometry, transparent clones of its materials). Pose them with `poseAt`. */
export function ghosts(obj: THREE.Object3D, n = 3, opacities = [0.35, 0.18, 0.08]) {
  return Array.from({ length: n }, (_, k) => {
    const c = obj.clone(true);
    c.traverse((m) => {
      const mesh = m as THREE.Mesh;
      if (!mesh.isMesh) return;
      const src = mesh.material as THREE.Material;
      const mat = src.clone();
      mat.transparent = true;
      mat.opacity = opacities[k] ?? 0.05;
      mat.depthWrite = false;
      mesh.material = mat;
    });
    c.name = `${obj.name}-ghost-${k}`;
    c.userData.pickable = false;
    return c;
  });
}

/** Pose the object at `frame` and each ghost `step` frames earlier; hide ghosts when it moves < 6 px a frame. */
export function poseWithGhosts(
  obj: THREE.Object3D, gs: THREE.Object3D[], frame: number,
  poseAt: (o: THREE.Object3D, f: number) => void, PX: number, step = 0.33,
) {
  poseAt(obj, frame);
  const a = obj.position.clone();
  poseAt(gs[0] ?? obj, frame - step);
  const fast = gs.length > 0 && a.distanceTo(gs[0]!.position) > 6 * PX * step;
  gs.forEach((g, k) => { poseAt(g, frame - step * (k + 1)); g.visible = fast; });
  poseAt(obj, frame);                                       // in case gs was empty and obj was re-posed
}
```

```ts
// a coin stream thrown out of a toggle at TAP: each coin on its own arc, seeded
const coins = Array.from({ length: 14 }, (_, i) => coin(150 + 90 * hash1(i), blueGloss, coinFace, PX, `coin-${i}`)); // builder
const trails = coins.map((c) => ghosts(c));
coins.forEach((c, i) => scene.add(c, ...trails[i]!));
const poseAt = (i: number) => (o: THREE.Object3D, f: number) => {
  const t = prog(f, TAP + i * 2, 40, outCubic);             // 2f stagger, 40f flight
  const side = hash1(i + 3) < 0.5 ? -1 : 1;
  o.position.set(side * (200 + 900 * t) * PX, (80 + 380 * Math.sin(t * Math.PI * 0.8)) * PX, (2.4 - 4.2 * hash1(i + 7)) * t);
  o.rotation.set(0.6 * t, (3 + 4 * hash1(i + 9)) * t, 0);
  o.visible = f >= TAP + i * 2;
};
// frame
coins.forEach((c, i) => poseWithGhosts(c, trails[i]!, frame, poseAt(i), PX));
```

## 5. Daylight shadow on paper

The warm editorial ground: off-white paper with a soft window-and-leaf shadow falling across it. The shadow is drawn once into a canvas (soft shapes via canvas shadow blur, which is exact and needs no filter support) and laid over the ground as an unlit plane on the camera overlay; it may drift 10–20 px over the shot, never flicker.

```ts
/** A soft daylight shadow texture: window bars + a few leaf blobs, alpha = shadow density. */
export function windowShadowTexture(w = 1920, h = 1080, seed = 1) {
  const c = new OffscreenCanvas(w, h);
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, w, h);
  g.translate(-w * 2, 0);                                   // draw shapes off-canvas; only their shadows land
  g.shadowOffsetX = w * 2;
  g.shadowColor = "rgba(60, 52, 44, 1)";
  g.shadowBlur = 38;
  g.fillStyle = "#000";
  g.save();
  g.transform(1, 0.18, -0.42, 1, w * 0.25, -h * 0.1);       // the window falls in at an angle
  for (let i = 0; i < 3; i++) g.fillRect(w * (0.08 + i * 0.27), -h * 0.2, w * 0.035, h * 1.5);   // mullions
  g.fillRect(-w * 0.1, h * 0.42, w * 1.0, h * 0.035);                                              // transom
  g.restore();
  g.shadowBlur = 64;
  for (let i = 0; i < 9; i++) {                             // leaves near the top corner, seeded
    const x = w * (0.62 + 0.36 * hash1(seed * 97 + i)), y = h * (0.02 + 0.3 * hash1(seed * 53 + i));
    g.beginPath();
    g.ellipse(x, y, 60 + 90 * hash1(seed + i * 7), 22 + 30 * hash1(seed + i * 13), hash1(i + 5) * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
```

```ts
// paper ground: backdrop() with base #f2f3ee and lift #f7f8f3, then the shadow over everything but type
const shade = new THREE.Mesh(
  new THREE.PlaneGeometry(width * PX * 1.04, height * PX * 1.04),
  new THREE.MeshBasicMaterial({ map: windowShadowTexture(), transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false }),
);                                                          // builder; 0.10–0.18 reads as daylight
shade.renderOrder = 50;                                     // over photos and paper, under type (onTop 100)
scene.add(shade);
// frame
shade.position.x = 14 * PX * Math.sin(time * Math.PI * 0.05);  // 14 px drift over the shot
```

- The shadow sits over photos and paper but under type (type in `onTop()` stays crisp and full contrast).
- Keep the grain on the backdrop: a smooth shadow on flat paper bands like any gradient.

## 6. Choosing a ground

| Taste family (`launch-taste`) | Ground | Light |
| --- | --- | --- |
| Title-card interleave, dark | `meshGround` on a near-black tinted to the accent, horizon 0.4–0.6 | Edge light only: rims behind panels, the horizon, one glow outline |
| Title-card interleave, light | `backdrop` white + horizon in the accent (or `meshGround` with one tint point) | Soft shadow under objects |
| Perspective UI showcase | `meshGround`, the brightest point behind the tilted panel | A coloured rim behind each panel (an additive glow strip along its back edge) |
| Glossy icons and tokens | One flat colour or one gradient; never a flood between beats | `studioEnvironment()` + product lights, `brand` pipeline |
| Gradient-light mood | `meshGround` with 4 points, slower drift, larger radii (defocused, photographic) | Bloom on type via a soft glow copy (`three-type` §13) |
| Editorial documentary (paper) | `backdrop` paper + `windowShadowTexture` | None |
| Editorial documentary (newsprint) | `backdrop` grey paper, a halftone dot overlay (the dither of `backdrops-and-finish.md` §6) | None; one warm accent on the product's button |
