"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";

/**
 * The home page's showreel: real videos made in GenMotion, playing, drifting
 * past on a curved band, seen through glass at the edges of the screen.
 *
 * This is WebGL rather than DOM. The curve on its own is something CSS can do
 * — a cylinder of `rotateY`'d divs under a `perspective` — but the glass is
 * not: refraction means reading the pixels behind a surface and bending them,
 * and a CSS filter can only ever blur or tint an element's own pixels in
 * place. So the band is drawn into a texture (one curved mesh per clip, video
 * as the map) and a second pass reads that texture through a cylindrical lens
 * at each edge: the picture stretches outward, the channels separate the
 * further it goes, and the frost comes up with the square of the distance.
 * Which is what a thick pane actually does to what is behind it.
 *
 * The geometry is the same idea the CSS version had: a cylinder with the
 * viewer inside it, so both ends bend toward the screen — a card in the middle
 * sits furthest away and flat, and the further it travels either way the more
 * it turns to face the centre and the closer it comes. Being a mesh, each card
 * now bends around that cylinder instead of being a flat plane tangent to it.
 *
 * The clips are the small local encodes `scripts/build-showreel.mjs` writes:
 * seven silent seconds each, at card size, a megabyte and a bit for the whole
 * dozen. A dozen 1080p masters streaming from the API above the fold would be
 * a loading spinner, not a showreel.
 */

type ShowreelClip = {
  /** Template id — the clip's file name and the page it links to. */
  id: string;
  title: string;
};

/**
 * The newest twelve widescreen templates, newest first. Mirrors `CLIPS` in
 * `scripts/build-showreel.mjs` — keep the two in step; that script writes the
 * files these names point at, and prunes the ones that drop off.
 */
const CLIPS: ShowreelClip[] = [
  { id: "cities-in-ink", title: "Cities in ink concept video" },
  { id: "nova-ai-assistant-launch-video", title: "Nova AI assistant launch video" },
  { id: "solara-funding-announcement", title: "Solara funding announcement video" },
  { id: "assemble-yc-launch-video", title: "Assemble YC launch video" },
  { id: "stripe-payment-links-launch-video", title: "Stripe Payment Links launch video" },
  { id: "firebase-studio-launch-video", title: "Firebase Studio launch video" },
  { id: "samsung-pay-fintech-app-launch-video", title: "Samsung Pay fintech app launch video" },
  { id: "p-doom-music-video", title: "AI doom music video" },
  { id: "crypto-launch-video", title: "Crypto launch video" },
  { id: "fintech-app-launch-video", title: "Fintech app launch video" },
  { id: "notchbrowser-app-launch-video", title: "NotchBrowser app launch video" },
  { id: "types-of-databases", title: "Types of databases explainer video" },
];

/** Gap between two cards along the arc, in px. */
const GAP = 28;
/** How fast the band travels, in px of arc per second. Slow on purpose. */
const SPEED = 34;
/**
 * Card width as a fraction of the band's width, and the bounds it sits in.
 * Four or five on screen at once: big enough to read what is playing, with
 * enough of them either side that the band still reads as a reel.
 */
const CARD_FRACTION = 0.21;
const CARD_MIN = 200;
const CARD_MAX = 430;
/**
 * The two numbers the depth comes out of. A tighter radius wraps the ends
 * round harder and brings them further forward; a shorter perspective distance
 * magnifies that travel and skews the near edge of an end card taller than its
 * far one. Floors for a phone, where the card is at its minimum and far wider
 * than its share of the screen.
 */
const RADIUS_FRACTION = 0.46;
const RADIUS_MIN = 420;
const DEPTH_FRACTION = 0.62;
const DEPTH_MIN = 800;
/**
 * How a card curls as it goes round the cylinder. `BOW` opens it out top and
 * bottom — 1 doubles its height by the time it is right round — and `WAIST`
 * swings its corners further round than the middle of the same edge, which is
 * what bends the outer edge into a curve instead of leaving it a straight
 * line. Both arrive late (they go with the cube of how far round it is), so
 * the middle of the band stays flat and the ends do the work.
 */
const CARD_BOW = 0.12;
const CARD_WAIST = 0.03;
/** Corner radius and the soft drop under each card, in px. */
const CORNER = 14;
const SHADOW_SPREAD = 34;
const SHADOW_DROP = 16;
/**
 * How far round the cylinder a card is allowed before it is dropped, in
 * radians. A card at the vanishing point is scaled by `depth / (depth - z)`,
 * which runs away as z approaches the perspective distance; this keeps the
 * worst case well short of that.
 */
const MAX_THETA = 1.1;

/** Where the glass starts, as a fraction of the way out to the screen edge. */
const GLASS_FROM = 0.74;
/**
 * The glass itself, as a vertical rod the band passes behind.
 *
 * `IOR` is how hard it bends (1 is air, window glass is about 1.5), `TRAVEL`
 * how far behind the rod the band is, which is what decides whether the bend
 * is a nudge or enough to fold the picture over and run it backwards, and
 * `DISPERSION` how differently red and blue take the same corner — the rainbow
 * along the fold is that number and nothing else.
 */
const GLASS_IOR = 1.42;
const GLASS_TRAVEL = 0.11;
const GLASS_DISPERSION = 0.055;
/**
 * How much the bend blows the picture up the way.
 *
 * This is the one that makes the shape. A card entering the glass is magnified
 * vertically, hard, about its own middle: the straight part of its outer edge
 * barely moves, but the rounded corners are drawn out into long sweeps, so the
 * card pinches to a waist and flares top and bottom. Each channel is bent by a
 * different amount, so those sweeps come out banded in rainbow.
 */
const GLASS_STRETCH = 1.75;
/** Frost radius at the edge, in texels. */
const GLASS_FROST = 14.0;

/**
 * The band, drawn as curved meshes on the cylinder.
 *
 * One draw per card, in depth order, into an offscreen texture: the middle of
 * the band is furthest away and goes down first, the ends come forward and go
 * down last, which is all the sorting a single ring of cards needs.
 */
const CARD_VERT = `#version 300 es
in vec2 aUv;
uniform float uArc;        // where this card's centre sits along the surface, px
uniform vec2  uCard;       // card size, px
uniform vec2  uGrow;       // extra size, for the shadow pass
uniform float uDrop;       // how far below the card the shadow sits, px
uniform float uRadius;
uniform float uDepth;
uniform float uBow;        // how much the ends flare, top and bottom
uniform float uWaist;      // how far the corners swing past the middle
uniform float uMaxTheta;
uniform vec2  uViewport;   // css px
out vec2 vUv;
void main() {
  vec2 size = uCard + uGrow;
  float v = 2.0 * (aUv.y - 0.5);              // -1 at the top, +1 at the bottom

  // Where along the cylinder's surface this vertex sits. Rough first, because
  // how far round the card is decides how hard the rest of this bends it.
  float s = uArc + (aUv.x - 0.5) * size.x;
  float lead = clamp(abs(s / uRadius) / uMaxTheta, 0.0, 1.0);
  // Cubed, not squared: the flare has to be nothing across the middle of the
  // band and then arrive quickly, or it reads as a card tapering from one end
  // to the other instead of a sheet curling over.
  float flare = lead * lead * lead;

  // The corners run further round than the middle of the same edge does, so
  // the outer edge of a card out there bows rather than staying a straight
  // line — and the card pinches at its waist, the way a sheet does when you
  // curl it toward you.
  s += sign(s) * uWaist * flare * v * v * size.x;

  float t = s / uRadius;
  float x = uRadius * sin(t);
  float z = uRadius * (1.0 - cos(t));
  // And it opens out top and bottom over the same travel.
  float y = -v * 0.5 * size.y * (1.0 + uBow * flare) - uDrop;

  // The same projection the browser's own CSS perspective applies, done here
  // so the lens pass downstream knows exactly where everything landed.
  float k = uDepth / max(uDepth - z, 1.0);
  gl_Position = vec4((vec2(x, y) * k) / (uViewport * 0.5), 0.0, 1.0);
  vUv = aUv;
}`;

const CARD_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 frag;
uniform sampler2D uTex;
uniform vec2  uSize;     // the drawn size in px, for the rounded-rect edge
uniform float uCorner;
uniform float uShadow;   // 1 → this pass is the drop shadow, not the card

float sdRound(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 p = (vUv - 0.5) * uSize;
  float d = sdRound(p, uSize * 0.5, uCorner);

  if (uShadow > 0.5) {
    // Soft all the way in from the grown edge: a blur would cost a second
    // pass, and the falloff of the distance field is the same shape.
    frag = vec4(0.0, 0.0, 0.0, smoothstep(0.0, ${(-SHADOW_SPREAD).toFixed(1)}, d) * 0.5);
    return;
  }

  // The video is uploaded flipped, so it is read back the same way.
  vec3 c = texture(uTex, vec2(vUv.x, 1.0 - vUv.y)).rgb;
  // A hairline lighter edge, the same thing the card's border used to be.
  c = mix(c, vec3(1.0), smoothstep(-2.0, -0.3, d) * 0.12);
  float a = smoothstep(0.75, -0.75, d);
  frag = vec4(c * a, a);   // premultiplied, to blend and to blur cleanly
}`;

/** A full-screen triangle; no buffer, the vertex id is enough. */
const POST_VERT = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/**
 * The glass. Everything here is screen-space, because that is what a pane is:
 * it does not travel with a card, the cards travel behind it.
 *
 * The model is a vertical rod of glass lying along each edge of the screen,
 * and the band running along behind it. For a fragment at some distance across
 * that rod, the ray that reached the eye came in through the front face, bent,
 * crossed, bent again on the way out, and only then met the band — so what you
 * see at that point is not what is behind it but what is somewhere further
 * in. Snell's law twice gives the deviation; past the middle of the rod the
 * deviation outruns the distance and the picture folds over and runs
 * backwards, which is the thing a glass rod does that nothing in CSS can fake.
 * Red and blue take the corner differently, so the fold comes with a rainbow.
 */
const POST_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 frag;
uniform sampler2D uScene;
uniform vec2  uTexel;
uniform float uFrom;
uniform float uIor;
uniform float uTravel;
uniform float uDispersion;
uniform float uStretch;
uniform float uFrost;

// The pane is not polished, so what is behind it loses detail with the depth
// of glass it is seen through. One ring of taps at the radius, plus the centre.
vec4 frost(vec2 uv, float r) {
  if (r < 0.4) return texture(uScene, uv);
  vec2 s = uTexel * r;
  vec4 sum = texture(uScene, uv) * 0.28;
  float w = 0.28;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853981;
    vec2 d = vec2(cos(a), sin(a));
    sum += texture(uScene, uv + d * s) * 0.09;
    w += 0.09;
  }
  return sum / w;
}

/**
 * How far in this fragment's ray was carried, and how much the same bend blows
 * the picture up the way. p is the distance across the rod, 0 at its inner lip
 * and 1 at the screen edge; n the index of refraction for one channel.
 */
vec2 bend(float p, float n) {
  float enter = asin(min(p, 0.9995));
  float inside = asin(min(p / n, 0.9995));
  // Twice, because the ray leaves through the far face as well. Clamped short
  // of grazing, where the tangent runs away to nothing useful.
  float deviation = clamp(2.0 * (enter - inside), 0.0, 0.95);
  return vec2(uTravel * tan(deviation), 1.0 + uStretch * deviation);
}

vec4 channel(vec2 uv, float dir, float p, float n, float r) {
  vec2 b = bend(p, n);
  vec2 at = vec2(uv.x - dir * b.x, 0.5 + (uv.y - 0.5) / b.y);
  // Past the end of the band there is nothing to refract. Without this the
  // texture clamps and the last column of pixels is smeared out into bars.
  float inside = smoothstep(0.0, 0.02, at.x) * smoothstep(1.0, 0.98, at.x);
  return frost(at, r) * inside;
}

void main() {
  float cx = (vUv.x - 0.5) * 2.0;
  // Eased in, not a straight ramp from the lip. A linear start is continuous
  // but its slope is not: the bend arrives all at once and every edge crossing
  // the lip creases there, in a dead straight vertical line down the band.
  // Smoothstep leaves the slope at zero on both ends, so the curve grows out
  // of nothing.
  float p = smoothstep(uFrom, 1.0, abs(cx));
  float dir = sign(cx);
  float r = uFrost * p * p;

  vec4 cr = channel(vUv, dir, p, uIor - uDispersion, r);
  vec4 cg = channel(vUv, dir, p, uIor, r);
  vec4 cb = channel(vUv, dir, p, uIor + uDispersion, r);
  vec4 c = vec4(cr.r, cg.g, cb.b, max(cg.a, max(cr.a, cb.a)));

  // The lip, where the rod turns over and catches the light.
  c.rgb += c.a * exp(-pow((p - 0.08) / 0.09, 2.0)) * 0.06;
  // And the last of it going into the page, so nothing stops dead against the
  // edge of the screen. On the screen position rather than on p: p barely
  // moves over the last few pixels, which would squeeze this whole fade into
  // about four of them and put a hard line back.
  c *= 1.0 - smoothstep(0.86, 1.0, abs(cx));
  frag = c;
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // Dev-time only: a shader that fails to compile shows up as the fallback
    // row, and the reason should not be silent.
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function link(gl: WebGL2RenderingContext, vert: string, frag: string) {
  const vs = compile(gl, gl.VERTEX_SHADER, vert);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, "aUv");
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

/** A card's mesh: fine across, because that is the direction it bends in. */
function buildGrid(gl: WebGL2RenderingContext, cols: number, rows: number) {
  const verts: number[] = [];
  for (let y = 0; y <= rows; y++) {
    for (let x = 0; x <= cols; x++) verts.push(x / cols, y / rows);
  }
  const index: number[] = [];
  const stride = cols + 1;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const a = y * stride + x;
      index.push(a, a + 1, a + stride, a + 1, a + stride + 1, a + stride);
    }
  }
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, vbo, ibo, count: index.length };
}

export function Showreel({
  clips = CLIPS,
  className,
}: {
  clips?: ShowreelClip[];
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videosRef = useRef<(HTMLVideoElement | null)[]>([]);
  // No WebGL2 (or a driver that refuses the context) falls back to the posters
  // the encode already writes: a still reel rather than no reel.
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const videos = videosRef.current.filter(
      (v): v is HTMLVideoElement => v !== null,
    );
    if (videos.length === 0) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    });
    if (!gl) {
      setFallback(true);
      return;
    }

    const cardProgram = link(gl, CARD_VERT, CARD_FRAG);
    const postProgram = link(gl, POST_VERT, POST_FRAG);
    if (!cardProgram || !postProgram) {
      setFallback(true);
      return;
    }

    const u = (p: WebGLProgram, name: string) => gl.getUniformLocation(p, name);
    const card = {
      arc: u(cardProgram, "uArc"),
      size: u(cardProgram, "uCard"),
      grow: u(cardProgram, "uGrow"),
      drop: u(cardProgram, "uDrop"),
      radius: u(cardProgram, "uRadius"),
      depth: u(cardProgram, "uDepth"),
      bow: u(cardProgram, "uBow"),
      waist: u(cardProgram, "uWaist"),
      maxTheta: u(cardProgram, "uMaxTheta"),
      viewport: u(cardProgram, "uViewport"),
      px: u(cardProgram, "uSize"),
      corner: u(cardProgram, "uCorner"),
      shadow: u(cardProgram, "uShadow"),
      tex: u(cardProgram, "uTex"),
    };
    const post = {
      scene: u(postProgram, "uScene"),
      texel: u(postProgram, "uTexel"),
      from: u(postProgram, "uFrom"),
      ior: u(postProgram, "uIor"),
      travel: u(postProgram, "uTravel"),
      dispersion: u(postProgram, "uDispersion"),
      stretch: u(postProgram, "uStretch"),
      frost: u(postProgram, "uFrost"),
    };

    const grid = buildGrid(gl, 44, 2);
    const emptyVao = gl.createVertexArray();

    // One texture per clip, filled from its <video> whenever that video has a
    // new frame to give — not every rAF tick, which would re-upload the same
    // picture two or three times over at 30fps source on a 120Hz screen.
    const textures = videos.map(() => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([10, 10, 12, 255]),
      );
      return tex;
    });
    const dirty = videos.map(() => true);
    const cancelFrameWatch: Array<() => void> = [];
    videos.forEach((video, i) => {
      type WithRvfc = HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: () => void) => number;
        cancelVideoFrameCallback?: (handle: number) => void;
      };
      const v = video as WithRvfc;
      if (typeof v.requestVideoFrameCallback !== "function") {
        // Older Safari: no per-frame signal, so upload on every tick instead.
        const mark = () => {
          dirty[i] = true;
        };
        video.addEventListener("timeupdate", mark);
        cancelFrameWatch.push(() => video.removeEventListener("timeupdate", mark));
        return;
      }
      let handle = 0;
      const tick = () => {
        dirty[i] = true;
        handle = v.requestVideoFrameCallback!(tick);
      };
      handle = v.requestVideoFrameCallback(tick);
      cancelFrameWatch.push(() => v.cancelVideoFrameCallback?.(handle));
    });

    // The band goes into this first, and the glass pass reads it back.
    const sceneTex = gl.createTexture();
    const fbo = gl.createFramebuffer();
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    let width = 0;
    let height = 0;
    let pixelWidth = 0;
    let pixelHeight = 0;
    let cardWidth = 0;
    let cardHeight = 0;
    let pitch = 0;
    let span = 0;
    let radius = 0;
    let depth = 0;

    const measure = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || 1;
      pixelWidth = Math.max(1, Math.round(width * dpr));
      pixelHeight = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        gl.bindTexture(gl.TEXTURE_2D, sceneTex);
        gl.texImage2D(
          gl.TEXTURE_2D, 0, gl.RGBA, pixelWidth, pixelHeight, 0,
          gl.RGBA, gl.UNSIGNED_BYTE, null,
        );
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTex, 0,
        );
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      cardWidth = Math.round(
        Math.max(CARD_MIN, Math.min(width * CARD_FRACTION, CARD_MAX)),
      );
      cardHeight = Math.round((cardWidth * 9) / 16);
      pitch = cardWidth + GAP;
      span = pitch * videos.length;
      radius = Math.max(width * RADIUS_FRACTION, RADIUS_MIN);
      depth = Math.max(width * DEPTH_FRACTION, DEPTH_MIN);
    };

    const visible: { i: number; arc: number; z: number }[] = [];

    const draw = (offset: number) => {
      visible.length = 0;
      for (let i = 0; i < videos.length; i++) {
        let arc = (((i * pitch - offset) % span) + span) % span;
        if (arc > span / 2) arc -= span;
        const theta = arc / radius;
        const x = radius * Math.sin(theta);
        const z = radius * (1 - Math.cos(theta));
        const k = depth / Math.max(depth - z, 1);
        // Culled on where it actually lands, not on the flat arc: at this
        // depth a card at the side is drawn half again as wide as one in the
        // middle, and the two answers are a long way apart.
        const off =
          Math.abs(theta) > MAX_THETA ||
          (Math.abs(x) - cardWidth / 2) * k > width / 2 + SHADOW_SPREAD;
        const video = videos[i];
        if (off) {
          // A card waiting its turn off the side is still a video being
          // decoded, and half the reel is off the side at any moment.
          video?.pause();
          continue;
        }
        if (video?.paused) void video.play().catch(() => {});
        visible.push({ i, arc, z });
      }
      // Furthest first: one ring of cards needs no depth buffer, only order.
      visible.sort((a, b) => a.z - b.z);

      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, pixelWidth, pixelHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      gl.useProgram(cardProgram);
      gl.bindVertexArray(grid.vao);
      gl.uniform1f(card.radius, radius);
      gl.uniform1f(card.depth, depth);
      gl.uniform1f(card.bow, CARD_BOW);
      gl.uniform1f(card.waist, CARD_WAIST);
      gl.uniform1f(card.maxTheta, MAX_THETA);
      gl.uniform2f(card.viewport, width, height);
      gl.uniform2f(card.size, cardWidth, cardHeight);
      gl.uniform1i(card.tex, 0);
      gl.activeTexture(gl.TEXTURE0);

      // Shadows for the whole band first, so no card is lit by its neighbour's.
      gl.uniform1f(card.shadow, 1);
      gl.uniform2f(card.grow, SHADOW_SPREAD, SHADOW_SPREAD);
      gl.uniform1f(card.drop, SHADOW_DROP);
      gl.uniform2f(card.px, cardWidth + SHADOW_SPREAD, cardHeight + SHADOW_SPREAD);
      gl.uniform1f(card.corner, CORNER + SHADOW_SPREAD * 0.4);
      for (const entry of visible) {
        gl.uniform1f(card.arc, entry.arc);
        gl.drawElements(gl.TRIANGLES, grid.count, gl.UNSIGNED_SHORT, 0);
      }

      gl.uniform1f(card.shadow, 0);
      gl.uniform2f(card.grow, 0, 0);
      gl.uniform1f(card.drop, 0);
      gl.uniform2f(card.px, cardWidth, cardHeight);
      gl.uniform1f(card.corner, CORNER);
      for (const entry of visible) {
        const video = videos[entry.i];
        const tex = textures[entry.i];
        if (!video || !tex) continue;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        if (dirty[entry.i] && video.readyState >= 2) {
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
          dirty[entry.i] = false;
        }
        gl.uniform1f(card.arc, entry.arc);
        gl.drawElements(gl.TRIANGLES, grid.count, gl.UNSIGNED_SHORT, 0);
      }

      // And out through the glass.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, pixelWidth, pixelHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.BLEND);
      gl.useProgram(postProgram);
      gl.bindVertexArray(emptyVao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sceneTex);
      gl.uniform1i(post.scene, 0);
      gl.uniform2f(post.texel, 1 / pixelWidth, 1 / pixelHeight);
      gl.uniform1f(post.from, GLASS_FROM);
      gl.uniform1f(post.ior, GLASS_IOR);
      gl.uniform1f(post.travel, GLASS_TRAVEL);
      gl.uniform1f(post.dispersion, GLASS_DISPERSION);
      gl.uniform1f(post.stretch, GLASS_STRETCH);
      gl.uniform1f(post.frost, GLASS_FROST);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
    };

    measure();

    // A band that drifts on its own is exactly the motion someone asking for
    // less of it means. The curve and the glass stay — they are how the thing
    // is drawn, not an animation — and the videos keep playing; only the
    // travel stops.
    const still = Boolean(
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    );

    // Centred on the middle card rather than the first, so the band opens as a
    // row across the screen instead of everything piled to one side.
    let offset = ((videos.length - 1) / 2) * pitch;
    let last = 0;
    let frame = 0;
    const tick = (time: number) => {
      // The first frame only establishes the clock; drifting by `time` itself
      // would jump the band by however long the tab had been open.
      if (!still && last) offset = (offset + ((time - last) / 1000) * SPEED) % span;
      last = time;
      draw(offset);
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!frame) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const onResize = () => {
      measure();
      if (!frame) draw(offset);
    };
    window.addEventListener("resize", onResize);

    // Nothing runs while the band is scrolled past: no rAF, no uploads, and
    // nothing decoding for a screen that is somewhere else.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          start();
        } else {
          stop();
          videos.forEach((v) => v.pause());
        }
      },
      { rootMargin: "100px" },
    );
    observer.observe(canvas);

    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      cancelFrameWatch.forEach((cancel) => cancel());
      textures.forEach((tex) => gl.deleteTexture(tex));
      gl.deleteTexture(sceneTex);
      gl.deleteFramebuffer(fbo);
      gl.deleteBuffer(grid.vbo);
      gl.deleteBuffer(grid.ibo);
      gl.deleteVertexArray(grid.vao);
      gl.deleteVertexArray(emptyVao);
      gl.deleteProgram(cardProgram);
      gl.deleteProgram(postProgram);
    };
  }, [clips.length]);

  return (
    <section
      // Butted up under the hero rather than pulled into it: this is a WebGL
      // canvas and so is the hero's background, and Chrome will not composite
      // one over the other without blacking the lower one out.
      className={cx("relative z-10 overflow-hidden", className)}
      aria-label="Videos made with GenMotion"
    >
      {/* The hero's light, carried on under the reel, and masked top and
          bottom: the section clips, so a gradient with any colour left in it
          at the edge would be cut off there and read as a seam across the
          page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(85%_110%_at_50%_55%,rgba(22,245,189,0.12)_0%,rgba(198,249,30,0.06)_40%,transparent_72%)]"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 40%, black 72%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 40%, black 72%, transparent 100%)",
        }}
      />

      {fallback ? (
        <FallbackReel clips={clips} />
      ) : (
        <canvas
          ref={canvasRef}
          aria-hidden
          className="relative block w-full"
          // Tall enough for the ends, which is what decides this: a card out
          // there is flared top and bottom and magnified by the perspective
          // besides, so the band needs about twice a card's own height or the
          // section clips the flare off.
          style={{
            height: `clamp(${Math.round(CARD_MIN * 1.35 + 24)}px, ${(CARD_FRACTION * 135).toFixed(1)}vw + 24px, ${Math.round(CARD_MAX * 1.35 + 24)}px)`,
          }}
        />
      )}

      {/* The texture sources. They have to be in the document and playing for
          the GPU to have anything to upload, but they are never what anyone
          looks at — the canvas is. Clipped to a pixel rather than
          `display: none`, which would stop them decoding. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 size-px overflow-hidden opacity-0"
      >
        {clips.map((clip, i) => (
          <video
            key={clip.id}
            ref={(el) => {
              videosRef.current[i] = el;
            }}
            src={`/home/showreel/${clip.id}.mp4`}
            // No `poster`: nobody sees these elements, and a poster on each
            // one is another twelve images fetched for a frame that is never
            // drawn. The stills are still written — the fallback row is what
            // they are for.
            muted
            loop
            playsInline
            autoPlay
            crossOrigin="anonymous"
            preload={i < 4 ? "auto" : "metadata"}
          />
        ))}
      </div>

      {/* What the canvas is showing, for anything that cannot see a canvas:
          a screen reader, a crawler, or the keyboard. */}
      <ul className="sr-only">
        {clips.map((clip) => (
          <li key={clip.id}>
            <Link href={`/templates/${clip.id}`}>{clip.title}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * No WebGL2: the posters, in a row, with the ends fading out. Still the work,
 * still the shape of the reel, just not moving and not behind glass.
 */
function FallbackReel({ clips }: { clips: ShowreelClip[] }) {
  return (
    <div className="relative overflow-hidden py-10">
      <div className="flex justify-center gap-7">
        {clips.slice(0, 5).map((clip) => (
          <Link
            key={clip.id}
            href={`/templates/${clip.id}`}
            aria-label={clip.title}
            className="w-[17vw] min-w-[190px] max-w-[340px] shrink-0 overflow-hidden rounded-xl border border-border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/home/showreel/${clip.id}.jpg`}
              alt=""
              loading="lazy"
              decoding="async"
              className="block aspect-video w-full object-cover"
            />
          </Link>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[22vw] bg-gradient-to-r from-background via-background/80 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[22vw] bg-gradient-to-l from-background via-background/80 to-transparent" />
    </div>
  );
}
