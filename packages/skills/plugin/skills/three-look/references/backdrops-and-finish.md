# Backdrops, glow and finish

The background is half the look. The 3D templates never leave a flat fill behind a subject: a clip-space backdrop shader gives a radial lift, a vignette and a fine grain in one draw, and additive sprites give glow without post-processing (which is not available: no addons). Add these to `components/look.ts`; they compile against `three` r185 and were captured.

Contents: 1 The backdrop · 2 Glow · 3 Fog and depth · 4 Grain, vignette, film finish · 5 Banding · 6 Textures by style family · 7 A new ground inside one shot

## 1. The backdrop

```ts
/**
 * Full-frame background drawn in clip space (ignores the camera, never moves with the shot):
 * base colour, a radial lift behind the subject, vignette, and a fine display-space grain that
 * dithers the gradient so it never bands under H.264. The grain is STATIC unless you set
 * u.uFrame per frame (see section 4 for when moving grain is worth its bitrate).
 */
export function backdrop(aspect: number, base = LOOK.bg, lift = LOOK.bgLift, height = 1080) {
  const uniforms = {
    uAspect: { value: aspect },
    uBase: { value: new THREE.Color(base) },
    uLift: { value: new THREE.Color(lift) },
    uCenter: { value: new THREE.Vector2(0.5, 0.55) },
    uRadius: { value: 0.75 },
    uVignette: { value: 0.35 },
    uGrain: { value: 0.015 },
    uFrame: { value: 0 },
    // a new ground growing inside the shot (section 7): colour, centre and radius in composition px
    uFlood: { value: new THREE.Color(base) },
    uFloodC: { value: new THREE.Vector2(0, 0) },
    uFloodR: { value: 0 },
    uFloodSoft: { value: 3 },
    uRes: { value: new THREE.Vector2(height * aspect, height) }, // composition px of the frame
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
      uniform float uAspect, uRadius, uVignette, uGrain, uFrame, uFloodR, uFloodSoft;
      uniform vec2 uCenter, uFloodC, uRes;
      uniform vec3 uBase, uLift, uFlood;
      // Integer hash (PCG) on whole pixel coordinates: exact under SwiftShader, the CLI's default GL.
      // A float fract-product hash (fract(p * 123.34)...) shows vertical stripes there.
      uint pcg(uint v) { uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
      float grain(vec2 px, float seed) { uvec2 q = uvec2(px); return float(pcg(q.x + pcg(q.y + pcg(uint(seed))))) / 4294967295.0; }
      void main() {
        vec2 p = vec2((vUv.x - uCenter.x) * uAspect, vUv.y - uCenter.y);
        float r = length(p) / uRadius;
        vec3 col = mix(uLift, uBase, smoothstep(0.0, 1.0, r));
        vec2 q = vec2((vUv.x - 0.5) * uAspect, vUv.y - 0.5);
        col *= 1.0 - uVignette * smoothstep(0.35, 1.1, length(q));
        // the new ground: composition px from the frame centre, y up, so it lines up with screenPx()
        float fd = length((vUv - 0.5) * uRes - uFloodC);
        col = mix(col, uFlood, 1.0 - smoothstep(uFloodR - uFloodSoft, uFloodR, fd));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
        // GRAIN MUST FOLLOW colorspace_fragment: there uGrain is in display units (0.015 = ±2 of 255).
        // Added before it, in linear light, the same value becomes ±10–25 levels on a dark ground: boiling noise.
        gl_FragColor.rgb += (grain(gl_FragCoord.xy, uFrame) - 0.5) * uGrain;
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  mesh.name = "backdrop";
  mesh.userData.pickable = false;
  return { mesh, u: uniforms };
}

/** One soft radial sprite texture, reused by every glow. */
export function glowTexture() {
  const c = new OffscreenCanvas(256, 256);
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.45)");
  grad.addColorStop(0.6, "rgba(255,255,255,0.1)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** An additive glow behind an object. `size` in world units. */
export function glow(tex: THREE.Texture, color: string, size: number, name = "glow") {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  );
  s.scale.setScalar(size);
  s.name = name;
  s.userData.pickable = false;
  return s;
}
```

```ts
// in a scene
const bg = backdrop(width / height, LOOK.bg, LOOK.bgLift, height);   // LOOK.bg with a lift behind the subject
scene.add(bg.mesh);
// frame
// grain stays static (uFrame 0); set bg.u.uFrame.value = frame only for moving grain (section 4)
bg.u.uCenter.value.set(SUBJECT_U + 0.02 * Math.sin(time * 0.4), SUBJECT_V);  // centred on the subject, drifting 26–46 px
```

- **Centre the lift (and any glow) on the subject**, not the canvas: `uCenter` is in 0–1 screen units, so set it to the subject's screen point (project its world position, or `0.5 + x_px / width`, `0.5 + y_px / height`) and move it when the layout moves. A radial glow fixed at the canvas centre while the content sits in a left column is a template tell.
- **Into a brand end card**: the card is the flat brand hex, so the film's lift, vignette and grain leave over the hand-off, ≥ 20f, never on one frame (a pop the eye catches on the calmest frame of the film). Fade lift and vignette together and keep the grain until the lift is gone, because a lift without dither bands after the encode:

```ts
// CARD = the end card's first frame; the finish is gone by CARD, grain last
const k = 1 - prog(frame, CARD - 24, 24, inOutSine);                 // 1 = the film's finish, 0 = the flat card
bg.u.uLift.value.lerpColors(BRAND_BG, LIFT, k);  // BRAND_BG, LIFT: THREE.Color, built once (uBase is the brand hex; if not, lerp it too)
bg.u.uVignette.value = 0.3 * k;
bg.u.uGrain.value = 0.015 * Math.min(1, k * 3);                      // dither holds until the lift is ~gone
```

  If the card must keep a lift (a brand whose card is a gradient), keep a static 1–2% grain on it for the whole hold; a smooth lift with no dither shows stepped rings at web bitrates.

- It draws in clip space (`gl_Position = vec4(position.xy * 2.0, 0.9999, 1.0)`), so it fills the frame whatever the camera does, sits behind everything (`renderOrder −1000`, `depthTest: false`) and is never picked.
- `uLift` is the background hue a few steps lighter, never a second hue: on `#07070c`, `#151826`; on white, a 3–5% grey or the accent at 6–10% for a tinted stage.
- The Samsung Pay template extends the same shader with a drifting diagonal light shaft, a coloured glow rising from the bottom edge, a `uWhite` mix to a white-out and a `uWipe` that reveals white from the bottom up. Add uniforms in the same pattern; everything stays a function of uniforms set per frame.

## 2. Glow

```ts
const glowTex = glowTexture();                                  // once per scene
const halo = glow(glowTex, LOOK.accent, 6, "hero-glow");        // 6 world units = 600 px at z = 0
halo.position.set(0, 0, -0.5);                                  // just behind the subject
// frame: breathe 1.2–2.2% at 0.2 Hz, or kick on a hit
halo.material.opacity = 0.55 + 0.1 * Math.sin(time * 2 * Math.PI * 0.2);
```

Additive, `depthWrite: false`, `toneMapped: false`. One glow per subject; a glow on everything is a fog.

## 3. Fog and depth

- `scene.fog = new THREE.Fog(LOOK.bg, near, far)` in the background colour, so floors, grids and far objects fade instead of ending in a line. Near ≈ the subject's distance, far ≈ 3–5× it.
- Fog does not touch the clip-space backdrop; set fog colour = `uBase` so they meet.
- Overlay layers (captions, flashes) set `fog: false` on their materials, or they grey out with distance.
- Three depths per frame: background, subject, one foreground element. A line-up at one depth reads as a slide.

## 4. Grain, vignette, film finish

- **Grain** is in display units (`uGrain` 0.01–0.015, added after `colorspace_fragment`) and **static by default**: `uFrame` stays 0, a fixed seed. Static grain dithers gradients just as well, survives the encode (measured at the CLI's default quality: about ±1 level left after x264, where moving grain of the same strength is mostly smeared away) and costs about half the bitrate. Moving grain (`uFrame = frame`) is for film-look families (one-shot, music video) and only at ≤0.8% when the file goes to the web.
- **Check it**: two consecutive frames of a held shot should be nearly identical: PSNR above 45 dB for static grain, above 40 dB for moving grain (`ffmpeg -i a.png -i b.png -lavfi psnr -f null -`). Lower is visible boil that the platform's re-encode turns into crawling blocks.
- **Bitrate**: grain is the costliest thing in the frame for the encoder. Measured: grain added in linear light (the bug above) on a dark ground made a 30 s 1080p film **69 Mb/s, 258 MB**, still 17 Mb/s after re-encoding at crf 23. Display-space static grain at 1.5% on the same ground: about 1.4 Mb/s for a held background. Check the export with `ffprobe -v error -show_entries format=bit_rate -of csv=p=0 out.mp4` against the destination (`direction`'s critique: a landing-page hero is ≤5 Mb/s at 1080p).
- **Brand identity** (stings, logo end cards, brand guides on a brand hex): no grain, no vignette, the hex exact at centre and corners (±2 levels). If a brand gradient bands, a static grain ≤0.5% is the most it gets.
- **Over the whole frame** (including the subject) use an overlay plane on the camera layer with the same `grain()` function at 3–8.5% opacity, as the music video and one-shot templates do; it is moving film grain, so it is for those families only.
- **Vignette** 0.25–0.35 at the corners. More reads as a filter.
- **Scanlines, halftone, dither** belong to the textured families (retro-tech, editorial). Build them as a full-frame `ShaderMaterial` on the camera layer, cell size 4–26 px, from `gl_FragCoord` and the frame number: never from a random source.

## 5. Banding

H.264 at web bitrates bands smooth dark gradients into visible steps. Prefer radial lifts over full-frame linear gradients on dark grounds, keep a dark gradient's range small (≤ 10–12 levels of 255 per 1000 px), and run a static 1–1.5% grain over it: the grain dithers the steps away. Brand identity is the exception (flat hex, no gradient to band).

## 6. Textures by style family

| Family (`direction`) | Background | Finish |
| --- | --- | --- |
| Soft-light SaaS | White or creme, radial lift 3–5% grey | None, or static grain 1% |
| 3D product hero | White or near-black + studio env reflections | Static grain 1%, glows in the brand colour |
| Brand identity (sting, end card) | The brand hex, flat | None: no grain, no vignette |
| One-shot film | The world itself (desktop, canvas) | Grain 8% overlay, vignette 0.28, real motion blur on fast moves |
| Textured tactile | Dark `#070605`, HUD panels | Pixel-block wipes, dither, ember particles from a seeded hash |
| Music video | Night `#0b0620` → deep `#150a33`, fog | Film overlay: moving grain 3%, vignette 0.75, scanlines |
| Whiteboard | Paper `#ffffff` | None: the strokes are the texture (`references/line-art.md`) |

## 7. A new ground inside one shot

A colour change behind the subject while the shot keeps running (night to morning, the moment a product "turns on", the brand colour arriving behind the object at the peak). It is not a cut, so `three-transitions`' cover layer (which sits on the camera, *above* everything) is the wrong tool: the new ground must grow **behind** the subject, in the backdrop, while the subject stays in front and lit. The backdrop above carries it: `uFlood` (the new ground's colour), `uFloodC` (its centre, composition px from the frame centre, y up: `screenPx()` from `three-transitions` gives the subject's point), `uFloodR` (radius, px) and `uFloodSoft` (edge feather, px).

```ts
// builder: the new ground's colour, and the backdrop told the frame height so px are exact
const bg = backdrop(width / height, LOOK.bg, LOOK.bgLift, height);
bg.u.uFlood.value.set(LOOK.day);
// frame: grows out of the subject over 24f; the light follows over the same frames (color-and-light.md §7)
const g = prog(frame, PEAK, 24, inOutCubic);
const c = screenPx(ring, cam, width, height);                  // where the subject is now
bg.u.uFloodC.value.set(c.x, c.y);
bg.u.uFloodR.value = g * coverRadius(c.x, c.y, width / 2, height / 2);
env.set(prog(frame, PEAK, 30, inOutSine));                     // reflections follow the ground
```

- **Re-light in the same frames, always.** A lit object keeps reflecting the old room after its ground changes: titanium on a new warm-white ground rendered dark bronze in a judged film, because its reflections still came from the grey night room. Pair every ground change with `followingEnvironment()` and a key-light change (`color-and-light.md` §7), started on the same frame and finished within 6f of the ground.
- **Pick one edge.** A hard edge (`uFloodSoft` 2–4 px) reads as a graphic flood out of the object; a very wide feather (≥ 30% of the frame's short side) reads as light filling the room. A 40–80 px soft edge reads as a flat 2D iris wipe crossing the frame, the in-between to avoid.
- **Give it a scale change too.** On the same framing a colour change alone reads as a wipe; push in on the subject (`three-camera` push, 1.1–1.3×) or let the subject move while the ground grows, so the peak is the picture changing, not the wallpaper.
- **Everything flat on the ground changes ink with it.** Type, strokes and lines that sit on the old ground cross into the new one: tint them per frame from whether the disc covers them (`dist(screenPx(label), uFloodC) < uFloodR` → the new ground's ink), or do it per pixel by giving their shader the same disc. Contrast is re-checked on the new ground (`three-look` check 4).
- `scene.background` stays the old colour (the backdrop covers it); when the shot ends on the new ground, set it to `uFlood` on the frame the disc passes the far corner, so the next scene opens on the same hex.

Tested with a polished metal ring on a graphite ground turning warm white over 24f: with the environment and key following, the ring stays bright titanium on the new ground; without, it renders near-black against it. The re-render costs about 2 s per changing frame under SwiftShader (held frames are free).
