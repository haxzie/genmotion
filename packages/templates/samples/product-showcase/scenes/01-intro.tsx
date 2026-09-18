import * as THREE from "three";
import {
  AbsoluteFill,
  ThreeScene,
  random,
  stagger,
  spring,
  springPresets,
  interpolate,
  Easing,
} from "@genmotion/motion";

// WebP keeps every icon under the bundler's 96KB inline limit, so these
// imports resolve to `data:` URLs. That matters: a `gm-asset://` URL is a
// different origin, and three's loader can't read one into a WebGL texture.
import iconFantastical from "../assets/icons/fantastical.webp";
import iconPixelmator from "../assets/icons/pixelmator.webp";
import iconTelegram from "../assets/icons/telegram.webp";
import iconFinalcut from "../assets/icons/finalcut.webp";
import iconBear from "../assets/icons/bear.webp";
import iconSlack from "../assets/icons/slack.webp";
import iconImovie from "../assets/icons/imovie.webp";
import iconLogicpro from "../assets/icons/logicpro.webp";
import iconGarageband from "../assets/icons/garageband.webp";

// Reveal order, not card order — index 0 is the first icon to appear.
const ICONS = [
  iconFantastical,
  iconPixelmator,
  iconTelegram,
  iconFinalcut,
  iconBear,
  iconSlack,
  iconImovie,
  iconLogicpro,
  iconGarageband,
];

// Decoding starts at module evaluation, well before React mounts the scene.
// The canvas is only redrawn when the frame changes, so a texture that
// arrives after mount would never be painted — it has to be ready up front.
// Guarded because the scene module is also loaded once outside a DOM.
const ICON_IMAGES: (HTMLImageElement | null)[] = ICONS.map((src) => {
  if (typeof Image === "undefined") return null;
  const img = new Image();
  img.src = src;
  return img;
});

function iconImage(index: number): HTMLImageElement {
  const cached = ICON_IMAGES[index];
  if (cached) return cached;
  const img = new Image();
  img.src = ICONS[index];
  ICON_IMAGES[index] = img;
  return img;
}

/* ---------------------------------------------------------------- config */

const COUNT = 9; // squircles around the ring
const RADIUS = 2.95; // ring radius (world units)
const CARD = 2.8; // quad size; the squircle fills 60% of it, the rest is blur headroom
const SQ_HALF = 0.3; // squircle half-extent in quad units — must match the shader
const CAM_Z = 12.3;
const CAM_Y = 3.96; // higher than before: the raised front would otherwise
const LOOK_Y = -0.1; // swallow the back arc and the circle stops reading

// Saddle: front and back of the ring ride up, the sides stay at the base
// height, so the circle undulates instead of lying dead flat.
const ELEVATION = 0.3;

// --- stepped rhythm: snap one slot, hold, snap again -----------------------
const STEP_START = 32; // ring waits for the assemble to finish
const STEP_MOVE = 12; // frames the snap itself takes
const STEP_CYCLE = 24; // snap + pause; the difference is the beat of stillness
const STEP_DIR = -1; // -1 travels leftward across the frame, +1 rightward
const LAST_STEP = 10; // stop after the final icon lands, so the scene ends settled
const SLOT = (Math.PI * 2) / COUNT;

// --- pendulum: the cards hang, so they only lean while the ring moves ------
const SWING_SUBSTEPS = 2; // integration substeps per frame

// --- icons ------------------------------------------------------------------
// Two plain snaps establish the ring first; from the third snap on, whichever
// card is travelling into centre stage fills with an icon on the way in.
const FIRST_ICON_STEP = 2;
const REVEAL_FRAMES = 12; // matches the snap, so it lands already filled

// Blues, walked around the ring so neighbours never repeat.
const BLUES = ["#2563eb", "#3b82f6", "#1e49c9", "#5b8def", "#2f6df0", "#4278f5"];
// Far cards drift toward this pale tint — aerial perspective against the white.
const HAZE = new THREE.Color("#c8d8f6");

/* ---------------------------------------------------------------- shader */

const VERT = /* glsl */ `
  out vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * A superellipse (squircle) drawn as a signed distance field.
 * Blurring a solid shape is mathematically the same as widening its edge
 * falloff, so `uBlur` gives real progressive defocus with zero post-processing.
 */
const FRAG = /* glsl */ `
  precision highp float;

  in vec2 vUv;
  out vec4 fragColor;

  uniform sampler2D uMap;
  uniform vec3  uColor;
  uniform vec3  uColorTop;
  uniform float uBlur;
  uniform float uOpacity;
  uniform float uShadow;
  uniform float uReveal;

  // texels across one unit of plane space: 512px icon over the 0.6-wide squircle
  const float TEXELS = 853.0;

  float squircle(vec2 p, float h, float n) {
    vec2 q = abs(p) / h;
    float f = pow(q.x, n) + pow(q.y, n) - 1.0;
    vec2  g = vec2(n * pow(q.x, n - 1.0), n * pow(q.y, n - 1.0)) / h;
    return f / max(length(g), 1e-3);
  }

  void main() {
    vec2 p = vUv - 0.5;

    float b = max(uBlur, 0.0035);           // floor keeps the sharp edge anti-aliased
    float d = squircle(p, 0.30, 4.0);
    float aCard = 1.0 - smoothstep(-b, b, d);

    // contact shadow, offset down and always softer than the card itself
    float bs = b + 0.055;
    float ds = squircle(p + vec2(0.0, 0.05), 0.30, 4.0);
    float aSh = (1.0 - smoothstep(-bs, bs, ds)) * uShadow * (1.0 - aCard);

    float a = aCard + aSh;
    if (a <= 0.002) discard;

    vec3 face = mix(uColor, uColorTop, clamp(vUv.y, 0.0, 1.0));

    if (uReveal > 0.001) {
      // Map the squircle's own bounds onto the icon, pulled in 4% so the
      // artwork's corners fall outside our mask instead of leaving a rim.
      vec2 iuv = 0.5 + (p / 0.6) * 0.96;
      // Defocus has to blur the artwork itself, not just its silhouette —
      // walking up the mip chain by the blur radius does exactly that.
      float lod = log2(1.0 + uBlur * TEXELS);
      vec4 tex = textureLod(uMap, iuv, lod);
      // tex is premultiplied, so this is a straight "over" onto the blue
      face = face * (1.0 - tex.a * uReveal) + tex.rgb * uReveal;
    }

    vec3 c = (face * aCard + vec3(0.36, 0.45, 0.68) * aSh) / a;

    fragColor = vec4(c, a * uOpacity);
  }
`;

/* ----------------------------------------------------------------- scene */

export default function Scene() {
  return (
    <AbsoluteFill
      id="stage"
      style={{
        background:
          "radial-gradient(1500px 900px at 50% 42%, #ffffff 0%, #f6f8fd 60%, #eef2fb 100%)",
      }}
    >
      <ThreeScene
        id="squircle-ring"
        build={({ scene, camera }) => {
          const cam = camera as THREE.PerspectiveCamera;
          cam.fov = 32;
          cam.position.set(0, CAM_Y, CAM_Z);
          cam.lookAt(0, LOOK_Y, 0);
          cam.updateProjectionMatrix();

          const geometry = new THREE.PlaneGeometry(CARD, CARD);

          const loadIcon = (img: HTMLImageElement) => {
            const tex = new THREE.Texture(img);
            tex.colorSpace = THREE.NoColorSpace; // raw shader, no output convert
            tex.premultiplyAlpha = true; // no dark fringe when we drop mip levels
            tex.generateMipmaps = true;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            if (img.complete && img.naturalWidth > 0) tex.needsUpdate = true;
            return tex;
          };

          const cards = Array.from({ length: COUNT }, (_, i) => {
            const base = new THREE.Color(BLUES[(i * 5) % BLUES.length]);

            // Card i *arrives* at centre at the END of step (i-1 mod COUNT).
            // Revealing from the start of that step means the icon fills
            // while the card travels in, so it lands already an icon.
            const arrival = (i - 1 + COUNT) % COUNT;
            const step = arrival >= FIRST_ICON_STEP ? arrival : arrival + COUNT;
            const revealAt = STEP_START + step * STEP_CYCLE;

            const image = iconImage(step - FIRST_ICON_STEP);
            const texture = loadIcon(image);

            const material = new THREE.ShaderMaterial({
              glslVersion: THREE.GLSL3,
              vertexShader: VERT,
              fragmentShader: FRAG,
              transparent: true,
              depthWrite: false,
              depthTest: false,
              uniforms: {
                uMap: { value: texture },
                uColor: { value: base.clone() },
                uColorTop: { value: base.clone() },
                uBlur: { value: 0 },
                uOpacity: { value: 0 },
                uShadow: { value: 0.2 },
                uReveal: { value: 0 },
              },
            });

            // The mesh hangs BELOW the pivot, so it swings from its top edge
            // like something on a hook rather than spinning about its middle.
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.y = -SQ_HALF * CARD;

            const pivot = new THREE.Group();
            pivot.add(mesh);
            scene.add(pivot);

            return {
              mesh,
              pivot,
              material,
              // a shaded foot and a lighter top edge, as if lit from above
              base: base.clone().lerp(new THREE.Color("#0f2b8a"), 0.12),
              top: base.clone().lerp(new THREE.Color("#ffffff"), 0.2),
              angle: (i / COUNT) * Math.PI * 2,
              order: i,
              revealAt,
              image,
              texture,
              uploaded: image.complete && image.naturalWidth > 0,
              size: 0.96 + random("s" + i) * 0.08,
              phase: random("p" + i) * Math.PI * 2,
              // every card hangs a little differently, so the row never
              // swings in robotic lockstep
              omega: Math.PI * 2 * (2.0 + random("f" + i) * 0.7),
              zeta: 0.2 + random("d" + i) * 0.06,
              gain: 0.032 + random("g" + i) * 0.014,
              kick: (random("k" + i) - 0.5) * 1.8, // sway as it lands
            };
          });

          // Assemble order: farthest card first, so the ring builds out of the
          // blur and the sharp front of frame is the last thing to land.
          [...cards]
            .sort((a, b) => Math.cos(a.angle) - Math.cos(b.angle))
            .forEach((c, order) => {
              c.order = order;
            });

          /* ---- ring rotation, cached per frame ---------------------------
           * The ring advances exactly one slot per cycle on a stiff spring,
           * then sits still. At every whole slot one card is dead centre.  */
          const rotCache = new Map<number, number>();
          const rotAt = (f: number, fps: number): number => {
            const hit = rotCache.get(f);
            if (hit !== undefined) return hit;

            const t = f - STEP_START;
            const raw = t < 0 ? 0 : Math.floor(t / STEP_CYCLE);
            // Past the last step the ring holds, fully seated — nothing should
            // still be in motion when the scene cuts.
            const step = Math.min(raw, LAST_STEP);
            const local =
              raw > LAST_STEP ? STEP_MOVE : t < 0 ? 0 : t - step * STEP_CYCLE;
            const snap =
              local >= STEP_MOVE
                ? 1
                : spring({
                    frame: local,
                    fps,
                    config: springPresets.stiff,
                    durationInFrames: STEP_MOVE,
                  });

            const value = (step + snap) * SLOT * STEP_DIR;
            rotCache.set(f, value);
            return value;
          };

          const camDist = Math.hypot(CAM_Z, CAM_Y);
          const dNear = camDist - RADIUS;
          const dFar = camDist + RADIUS;
          const spin = new THREE.Quaternion();
          const axis = new THREE.Vector3(0, 0, 1);
          const centre = new THREE.Vector3();

          return ({ frame, time, fps, progress }) => {
            const ringRot = rotAt(frame, fps);

            // slow push in, plus a touch of camera drift
            cam.position.z = CAM_Z - progress * 0.7;
            cam.position.y = CAM_Y + Math.sin(time * 0.35) * 0.06;
            cam.lookAt(0, LOOK_Y, 0);

            const dt = 1 / (fps * SWING_SUBSTEPS);

            for (let i = 0; i < cards.length; i++) {
              const c = cards[i];

              // staggered assemble, back of the ring first
              const p = stagger({
                frame,
                index: c.order,
                each: 1.5,
                duration: 16,
                easing: Easing.outSmooth,
              });

              /* ---- swing --------------------------------------------------
               * A damped pendulum driven by the ring's velocity. The rest
               * target is always plumb, so the card leans ONLY while the ring
               * is actually moving, lags behind the snap, overshoots, and
               * wobbles itself back to vertical during the pause.
               * Integrated from frame 0 every frame — no stored state, so
               * scrubbing to any frame gives the identical result.          */
              const kickAt = Math.round(c.order * 1.5) + 1;
              let th = 0;
              let w = 0;
              const w2 = c.omega * c.omega;
              const damp = 2 * c.zeta * c.omega;

              for (let f = 1; f <= frame; f++) {
                if (f === kickAt) w += c.kick; // it swings as it drops in

                const vel = (rotAt(f, fps) - rotAt(f - 1, fps)) * fps;
                // cos() projects the card's travel onto the screen's x axis:
                // cards on the far arc are moving the other way, and cards at
                // the sides are moving through depth, so they barely lean.
                const target = -c.gain * vel * Math.cos(c.angle + rotAt(f, fps));

                for (let k = 0; k < SWING_SUBSTEPS; k++) {
                  w += (w2 * (target - th) - damp * w) * dt;
                  th += w * dt;
                }
              }

              const theta = c.angle + ringRot;
              const r = RADIUS * (0.86 + 0.14 * p);
              const bob = Math.sin(time * 0.55 + c.phase) * 0.05;
              const a = Math.atan2(Math.sin(theta), Math.cos(theta));

              // the card holding centre stage is a touch larger
              const focus = Math.max(0, Math.cos(a));
              const s = c.size * (0.72 + 0.28 * p) * (1 + 0.06 * focus * focus);

              // cos(2θ) peaks at the front AND the back and falls to zero at
              // the sides — and because it reads the live angle, each card
              // rides up and down the saddle as the ring steps around.
              const lift = ELEVATION * (0.5 + 0.5 * Math.cos(2 * theta));

              centre.set(
                Math.sin(theta) * r,
                lift * p + bob + (1 - p) * -0.55,
                Math.cos(theta) * r,
              );

              // hang the pivot above the card's resting centre
              c.pivot.position.set(
                centre.x,
                centre.y + SQ_HALF * CARD * s,
                centre.z,
              );
              c.pivot.scale.set(s, s, 1);

              // face the lens, then swing
              c.pivot.quaternion.copy(cam.quaternion);
              spin.setFromAxisAngle(axis, th);
              c.pivot.quaternion.multiply(spin);

              // --- depth of field: focus sits on the near arc -------------
              const dist = centre.distanceTo(cam.position);
              const dt01 = THREE.MathUtils.clamp(
                (dist - dNear) / (dFar - dNear),
                0,
                1,
              );
              const defocus = Math.pow(dt01, 1.4);

              // catch any icon that decoded after mount
              if (!c.uploaded && c.image.complete && c.image.naturalWidth > 0) {
                c.texture.needsUpdate = true;
                c.uploaded = true;
              }

              // the icon fills the card during the snap that carries it in
              c.material.uniforms.uReveal.value = interpolate(
                frame,
                [c.revealAt, c.revealAt + REVEAL_FRAMES],
                [0, 1],
                {
                  easing: Easing.outSmooth,
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                },
              );

              c.material.uniforms.uBlur.value = defocus * 0.082;
              c.material.uniforms.uShadow.value = 0.22 * (1 - defocus * 0.85);
              c.material.uniforms.uOpacity.value = p * (1 - defocus * 0.42);

              // far cards wash toward the background
              (c.material.uniforms.uColor.value as THREE.Color)
                .copy(c.base)
                .lerp(HAZE, defocus * 0.55);
              (c.material.uniforms.uColorTop.value as THREE.Color)
                .copy(c.top)
                .lerp(HAZE, defocus * 0.55);

              // three sorts transparent meshes back-to-front for us, but pin
              // the order explicitly so the stack can never flicker
              c.mesh.renderOrder = Math.round(-dist * 100);
            }
          };
        }}
      />

      {/* faint floor wash so the ring feels seated rather than floating */}
      <div
        id="floor-wash"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 320,
          background:
            "linear-gradient(180deg, rgba(238,243,253,0) 0%, rgba(226,235,251,0.55) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
}
