/**
 * The whole chat, as one pure function of the global (60fps) frame.
 *
 * Every scene builds the same chat and drives it with `frame + offset`, so the
 * cuts between scenes are invisible: the frame either side of a cut is the same
 * picture. Timings below are reference frames (60fps), measured off the source.
 */
import * as THREE from "three";
import { interpolate, Easing } from "@genmotion/three-engine";
import type { ThreeSceneContext } from "@genmotion/three-engine";
import { COLORS, FONT_FAMILY, LAYOUT, SCROLL_SPRING, SOURCE_FPS } from "./brand";
import avatarBenjiUrl from "../assets/avatar-benji.jpg";
import avatarAlexUrl from "../assets/avatar-alex.jpg";
import avatarMeUrl from "../assets/avatar-me.jpg";

type Who = "benji" | "alex" | "me" | "grok";

interface ItemSpec {
  id: string;
  kind: "typing" | "message";
  who: Who;
  /** Insert frame: the item lands at the bottom here and its scroll event fires. */
  at: number;
  /** How far this insert pushes everything already on screen up. */
  push: number;
  /** Typing only: the frame the message that replaces it lands. */
  until?: number;
  label?: string;
  lines?: string[];
  width?: number;
  height?: number;
}

/* -------------------------------------------------------------------------- */
/* The script, measured from the reference                                    */
/* -------------------------------------------------------------------------- */

const H1 = LAYOUT.singleH;

const SCRIPT: ItemSpec[] = [
  { id: "typing-benji-1", kind: "typing", who: "benji", at: 6, push: 0, until: 32 },
  {
    id: "message-sfo", kind: "message", who: "benji", at: 32, push: 0, label: "Benji Taylor",
    lines: ["what time do we need to leave for", "SFO? flight boards at 7"], width: 670, height: 144,
  },
  { id: "typing-alex-1", kind: "typing", who: "alex", at: 72, push: 145, until: 103 },
  { id: "message-idk", kind: "message", who: "alex", at: 103, push: 42, label: "Alex Abraham", lines: ["idk like 6?"], width: 244, height: H1 },
  { id: "typing-benji-2", kind: "typing", who: "benji", at: 141, push: 141, until: 172 },
  {
    id: "message-security", kind: "message", who: "benji", at: 172, push: 44, label: "Benji Taylor",
    lines: ["no 5, security will be a mess"], width: 562, height: H1,
  },
  { id: "message-ask-grok", kind: "message", who: "me", at: 221, push: 139, lines: ["grok, what time should we leave"], width: 629, height: H1 },
  { id: "typing-grok", kind: "typing", who: "grok", at: 270, push: 140, until: 332 },
  {
    id: "message-grok-answer", kind: "message", who: "grok", at: 332, push: 192, label: "Grok",
    lines: [
      "5:20. 101 is only about 25 min that",
      "early, but Terminal 2 security has",
      "been 15 to 20 min this week. You'd",
      "be at the gate by 6:30 ✈️",
    ],
    width: 689, height: 244,
  },
  { id: "typing-alex-2", kind: "typing", who: "alex", at: 412, push: 145, until: 443 },
  { id: "message-ok", kind: "message", who: "alex", at: 443, push: 42, label: "Alex Abraham", lines: ["ok 520"], width: 192, height: H1 },
  { id: "message-thanks", kind: "message", who: "me", at: 506, push: 138, lines: ["thanks grok"], width: 275, height: H1 },
];

/** The thumbs-up reaction on "thanks grok": its own scroll event. */
const REACTION = { at: 568, push: 50 };
/** Everything fades to black at the very end. */
const OUTRO: [number, number] = [666, 680];

const EVENTS = [...SCRIPT.map((s) => ({ at: s.at, push: s.push })), REACTION].filter((e) => e.push > 0);

/* -------------------------------------------------------------------------- */
/* Maths                                                                      */
/* -------------------------------------------------------------------------- */

/** Step response of a damped spring, 0 → 1, `t` in seconds. */
function spring(t: number): number {
  if (t <= 0) return 0;
  const { omega: w, zeta: z } = SCROLL_SPRING;
  if (z >= 1) return 1 - (1 + w * t) * Math.exp(-w * t);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}

/** Bottom edge (px from top) of something inserted at `insertedAt`, at frame `f`. */
function bottomAt(insertedAt: number, f: number): number {
  let lift = 0;
  for (const e of EVENTS) {
    if (e.at > insertedAt && f > e.at) lift += e.push * spring((f - e.at) / SOURCE_FPS);
  }
  return LAYOUT.bottom - lift;
}

/** Fit to the reference's measured fade-ins: between linear and a quadratic ease-out. */
const softOut = (t: number) => t * (1.5 - 0.5 * t);

/** Top edge fade: black → clear between these two screen rows. */
/** Measured off the reference's text brightness: ~linear, 4% visible at y=0, full by y≈480. */
const FADE_TOP_ALPHA = 0.96;
const FADE_BOTTOM = 480;

/* -------------------------------------------------------------------------- */
/* Canvas drawing (once, in the builder)                                      */
/* -------------------------------------------------------------------------- */

const S = 2; // draw everything at 2x for crisp edges

function makeCanvas(w: number, h: number) {
  const canvas = new OffscreenCanvas(Math.ceil(w * S), Math.ceil(h * S));
  const g = canvas.getContext("2d")!;
  g.scale(S, S);
  return { canvas, g };
}

function texture(canvas: OffscreenCanvas) {
  const t = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  return t;
}

/** A plane whose LOCAL origin is its top-left corner, sized in px. */
function plane(canvas: OffscreenCanvas, w: number, h: number, name: string) {
  const geo = new THREE.PlaneGeometry(w, h);
  geo.translate(w / 2, -h / 2, 0);
  const mat = new THREE.MeshBasicMaterial({
    map: texture(canvas), transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  return mesh;
}

function fontSizeFor(sample: string, targetWidth: number, weight: number) {
  const g = new OffscreenCanvas(8, 8).getContext("2d")!;
  g.font = `${weight} 100px ${FONT_FAMILY}`;
  return (100 * targetWidth) / g.measureText(sample).width;
}

/* -------------------------------------------------------------------------- */
/* Builder                                                                    */
/* -------------------------------------------------------------------------- */

interface Built {
  spec: ItemSpec;
  group: THREE.Group; // positioned so y=0 is the bubble's bottom edge
  materials: THREE.MeshBasicMaterial[];
  dots?: THREE.MeshBasicMaterial[];
  /** Avatars are shared by a typing indicator and the message that replaces it. */
  avatar?: { group: THREE.Group; material: THREE.MeshBasicMaterial; from: number };
}

export function buildChat(ctx: ThreeSceneContext) {
  const { scene, width, height, setCamera } = ctx;

  // Pixel stage: x right, y DOWN in reference px (we negate y when placing).
  const aspect = width / height;
  const camera = new THREE.OrthographicCamera(540 - 540 * aspect, 540 + 540 * aspect, 0, -1080, -100, 100);
  camera.position.z = 10;
  setCamera(camera);
  scene.background = new THREE.Color(COLORS.background);

  const root = new THREE.Group();
  root.name = "chat";
  scene.add(root);

  // Type sizes calibrated so line lengths match the reference's measured widths.
  const msgSize = fontSizeFor("what time do we need to leave for", 592, 400);
  const labelSize = fontSizeFor("Alex Abraham", 198, 400);
  const msgFont = `400 ${msgSize}px ${FONT_FAMILY}`;
  const labelFont = `400 ${labelSize}px ${FONT_FAMILY}`;

  /* ---- shared pieces ---- */

  // Generated, fictional portraits. The source images are circles on white, so the
  // disc samples only the inner 92% of each image to keep the white rim out.
  const loader = new THREE.TextureLoader(ctx.manager);
  const loadAvatar = (url: string) => {
    const t = loader.load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const avatarTex: Record<Exclude<Who, "grok">, THREE.Texture> = {
    benji: loadAvatar(avatarBenjiUrl),
    alex: loadAvatar(avatarAlexUrl),
    me: loadAvatar(avatarMeUrl),
  };
  const avatarGeo = new THREE.CircleGeometry(LAYOUT.avatar / 2, 48);
  {
    const uv = avatarGeo.attributes.uv as THREE.BufferAttribute;
    const inset = 0.92;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, 0.5 + (uv.getX(i) - 0.5) * inset, 0.5 + (uv.getY(i) - 0.5) * inset);
    }
  }
  const glyphCanvas = drawGlyph();

  /** A neutral AI mark (a four-point spark) standing in for the assistant's logo. */
  function drawGlyph() {
    const d = 48;
    const { canvas, g } = makeCanvas(d, d);
    const c = d / 2;
    const R = 21;
    const r = 6.5;
    g.fillStyle = "#ffffff";
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      const rad = i % 2 === 0 ? R : r;
      const x = c + Math.cos(a) * rad;
      const y = c + Math.sin(a) * rad;
      if (i === 0) g.moveTo(x, y);
      else g.quadraticCurveTo(c, c, x, y);
    }
    g.closePath();
    g.fill();
    return canvas;
  }

  function bubbleCanvas(w: number, h: number, fill: string, lines: string[]) {
    const { canvas, g } = makeCanvas(w, h);
    g.fillStyle = fill;
    g.beginPath();
    g.roundRect(0, 0, w, h, h <= 100 ? h / 2 : 44);
    g.fill();
    g.font = msgFont;
    g.fillStyle = COLORS.text;
    g.textBaseline = "middle";
    g.textAlign = "left";
    lines.forEach((line, i) => {
      const cy = lines.length === 1 ? h / 2 : LAYOUT.firstLine + i * LAYOUT.lineHeight;
      g.fillText(line, LAYOUT.textPad, cy + 1);
    });
    return canvas;
  }

  function labelCanvas(text: string) {
    const m = new OffscreenCanvas(8, 8).getContext("2d")!;
    m.font = labelFont;
    const w = Math.ceil(m.measureText(text).width) + 8;
    const h = 44;
    const { canvas, g } = makeCanvas(w, h);
    g.font = labelFont;
    g.fillStyle = COLORS.label;
    g.textBaseline = "middle";
    g.fillText(text, 0, h / 2 + 1);
    return { canvas, w, h };
  }

  /* ---- items ---- */

  const built: Built[] = [];
  let order = 100; // older items draw ON TOP of newer ones, as in the reference

  for (const spec of SCRIPT) {
    const group = new THREE.Group();
    group.name = spec.id;
    root.add(group);
    const materials: THREE.MeshBasicMaterial[] = [];
    const out: Built = { spec, group, materials };
    const outgoing = spec.who === "me";

    if (spec.kind === "typing") {
      const w = LAYOUT.typingW;
      const h = H1;
      const bubble = plane(bubbleCanvas(w, h, COLORS.incoming, []), w, h, `${spec.id}-bubble`);
      bubble.position.set(LAYOUT.incomingX, h, 0);
      bubble.renderOrder = order;
      group.add(bubble);
      materials.push(bubble.material as THREE.MeshBasicMaterial);

      const dotGeo = new THREE.CircleGeometry(6.5, 24);
      out.dots = [];
      for (let i = 0; i < 3; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: COLORS.dot, transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
        });
        const dot = new THREE.Mesh(dotGeo, mat);
        dot.name = `${spec.id}-dot-${i + 1}`;
        dot.position.set(LAYOUT.incomingX + w / 2 + (i - 1) * 24, h / 2, 0);
        dot.renderOrder = order + 1;
        group.add(dot);
        out.dots.push(mat);
      }
    } else {
      const w = spec.width!;
      const h = spec.height!;
      const x = outgoing ? LAYOUT.outgoingRight - w : LAYOUT.incomingX;
      const fill = outgoing ? COLORS.outgoing : COLORS.incoming;
      const bubble = plane(bubbleCanvas(w, h, fill, spec.lines!), w, h, `${spec.id}-bubble`);
      bubble.position.set(x, h, 0);
      bubble.renderOrder = order;
      group.add(bubble);
      materials.push(bubble.material as THREE.MeshBasicMaterial);

      if (spec.label) {
        const l = labelCanvas(spec.label);
        const label = plane(l.canvas, l.w, l.h, `${spec.id}-name`);
        label.position.set(LAYOUT.labelX, h + LAYOUT.labelAbove + l.h / 2, 0);
        label.renderOrder = order;
        group.add(label);
        materials.push(label.material as THREE.MeshBasicMaterial);
      }
    }
    // (positions above are in "px up from the bubble's bottom"; group.y does the rest)

    // Avatar: one per slot. A message that replaces a typing indicator reuses it.
    const prevTyping = built.find((b) => b.spec.kind === "typing" && b.spec.until === spec.at && b.spec.who === spec.who);
    if (prevTyping?.avatar) {
      out.avatar = prevTyping.avatar;
    } else {
      const ag = new THREE.Group();
      ag.name = spec.who === "grok" ? "assistant-mark" : `avatar-${spec.who}`;
      root.add(ag);
      let mesh: THREE.Mesh;
      if (spec.who === "grok") {
        mesh = plane(glyphCanvas, 48, 48, `${spec.id}-assistant-mark`);
        mesh.position.set(LAYOUT.incomingAvatarX - 24, 30 + 24, 0);
      } else {
        const d = LAYOUT.avatar;
        mesh = new THREE.Mesh(
          avatarGeo,
          new THREE.MeshBasicMaterial({
            map: avatarTex[spec.who], transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
          }),
        );
        mesh.name = `${spec.id}-avatar`;
        const cx = outgoing ? LAYOUT.outgoingAvatarX : LAYOUT.incomingAvatarX;
        mesh.position.set(cx, d / 2, 0);
      }
      mesh.renderOrder = order;
      ag.add(mesh);
      out.avatar = { group: ag, material: mesh.material as THREE.MeshBasicMaterial, from: spec.at };
    }

    built.push(out);
    order -= 3;
  }

  /* ---- the reaction on "thanks grok" ---- */
  const thanks = built.find((b) => b.spec.id === "message-thanks")!;
  const reactW = 78 + 6;
  const reactH = 48 + 6;
  const reactCanvas = (() => {
    const { canvas, g } = makeCanvas(reactW, reactH);
    g.fillStyle = "#000000";
    g.beginPath();
    g.roundRect(0, 0, reactW, reactH, reactH / 2);
    g.fill();
    g.fillStyle = COLORS.reactionFill;
    g.beginPath();
    g.roundRect(3, 3, reactW - 6, reactH - 6, (reactH - 6) / 2);
    g.fill();
    g.font = `34px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("\u{1F44D}", reactW / 2, reactH / 2 + 2);
    return canvas;
  })();
  const reactionPivot = new THREE.Group();
  reactionPivot.name = "reaction-thumbs-up";
  thanks.group.add(reactionPivot);
  const reaction = plane(reactCanvas, reactW, reactH, "reaction-thumbs-up-pill");
  reaction.geometry.translate(-reactW / 2, reactH / 2, 0); // centre the pill on its pivot
  reaction.renderOrder = 200;
  reactionPivot.add(reaction);
  const reactionMat = reaction.material as THREE.MeshBasicMaterial;

  /* ---- overlays: the top fade, and the final fade to black ---- */
  const fadeCanvas = (() => {
    const c = new OffscreenCanvas(4, 512);
    const g = c.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, `rgba(0,0,0,${FADE_TOP_ALPHA})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 512);
    return c;
  })();
  const stageW = 1080 * aspect;
  const topFade = plane(fadeCanvas, stageW, FADE_BOTTOM, "top-fade");
  topFade.position.set(540 - stageW / 2, 0, 1);
  topFade.renderOrder = 1000;
  topFade.userData.pickable = false;
  root.add(topFade);

  const blackout = new THREE.Mesh(
    new THREE.PlaneGeometry(stageW, 1080),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }),
  );
  blackout.name = "outro-fade";
  blackout.position.set(540, -540, 2);
  blackout.renderOrder = 1001;
  blackout.userData.pickable = false;
  root.add(blackout);
  const blackoutMat = blackout.material as THREE.MeshBasicMaterial;

  /* ---------------------------------------------------------------------- */
  /* Per frame                                                              */
  /* ---------------------------------------------------------------------- */

  const dotRest = new THREE.Color(COLORS.dot);
  const dotLit = new THREE.Color(COLORS.dotLit);

  return (f: number) => {
    for (const b of built) {
      const { spec } = b;
      const bottom = bottomAt(spec.at, f);
      let alpha = 0;
      let rise = 0;

      if (spec.kind === "typing") {
        // Fresh indicators wait for the list to start moving before they show.
        const start = spec.push > 0 ? spec.at + 6 : spec.at;
        const fadeIn = interpolate(f, [start, start + 8], [0, 1], Easing.easeOut);
        const fadeOut = interpolate(f, [spec.until! - 2, spec.until! + 4], [1, 0], Easing.easeIn);
        alpha = fadeIn * fadeOut;
        // Dots: a soft brightness wave, one dot after another.
        b.dots!.forEach((m, i) => {
          const phase = ((f - spec.at) / 54 - i * 0.18) * Math.PI * 2;
          const k = Math.pow(Math.max(0, Math.sin(phase)), 2);
          m.color.lerpColors(dotRest, dotLit, k);
          m.opacity = alpha;
        });
      } else if (spec.who === "me") {
        // Sent bubbles fade in where they land (no slide), ~16 frames.
        alpha = interpolate(f, [spec.at + 1, spec.at + 17], [0, 1], softOut);
      } else {
        // Incoming messages crossfade over the typing bubble and settle up 8px.
        alpha = interpolate(f, [spec.at + 2, spec.at + 20], [0, 1], softOut);
        rise = interpolate(f, [spec.at + 2, spec.at + 20], [8, 0], softOut);
      }

      b.group.visible = alpha > 0.001;
      b.group.position.y = -(bottom + rise);
      for (const m of b.materials) m.opacity = alpha;

      // Avatar: lives from its slot's first appearance onward.
      const av = b.avatar!;
      if (av.from === spec.at) {
        const start = spec.kind === "typing" && spec.push > 0 ? spec.at + 6 : spec.at;
        const slotIn =
          spec.kind === "typing" ? interpolate(f, [start, start + 8], [0, 1], Easing.easeOut) : alpha;
        av.material.opacity = slotIn;
        av.group.visible = slotIn > 0.001;
        av.group.position.y = -bottomAt(spec.at, f);
      }
      // Once a message takes over the slot, the avatar rides with the message.
      if (spec.kind === "message" && f >= spec.at) av.group.position.y = -bottomAt(spec.at, f);
    }

    // Reaction: pops out from under the bubble's lower edge with a small overshoot.
    const rt = f - REACTION.at;
    const pop = interpolate(rt, [3, 12, 17], [0.4, 1.06, 1], Easing.easeOut);
    reactionMat.opacity = interpolate(rt, [3, 8], [0, 1], Easing.easeOut);
    reactionPivot.visible = rt > 3;
    reactionPivot.scale.setScalar(pop);
    reactionPivot.position.set(LAYOUT.outgoingRight - 77, -interpolate(rt, [3, 13], [6, 20], Easing.easeOut), 0);

    blackoutMat.opacity = interpolate(f, OUTRO, [0, 1], Easing.easeInOut);
  };
}

/** Map a scene's local frame to the reference's 60fps global frame. */
export function toSourceFrame(localFrame: number, fps: number, offset: number) {
  return offset + (localFrame * SOURCE_FPS) / fps;
}
