/**
 * Scene 1 — The ping. A macOS desktop late in the afternoon, dim and out of
 * focus: a Finder window full of old recordings, a desktop littered with
 * demo_v1, demo_v2_FINAL… A Slack banner slides in from the right edge:
 * "hey! can you send a quick demo video?". The camera leans in until the
 * message fills the frame, and the cursor drag-selects one word: quick.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { FONT, PX, framing, fitCamera, withFonts, prog, inOutCubic, outCubic, lerp, keyed } from "../components/core";
import { placeOn, makeCursor, HILITE, type Rect } from "../components/page";
import { SW, MENU_H, makeDesktop, panelShape } from "../components/mac";
import { BG, makeFilm } from "../components/film";
import { PING_T as T } from "../components/timeline";
import slackLogoUrl from "../assets/slack-logo.png";

/* ---------------------------------------------------- the Slack banner */

const CW = 372;
const CH = 84;
const CARD_X = SW - 14 - CW;
const CARD_Y = MENU_H + 10;
const MSG = "hey! can you send a quick demo video?";
const MSG_PREFIX = "hey! can you send a ";
const WORD = "quick";
const MSG_SIZE = 14.5;
const TX = 66;
const MSG_Y = 55;

const font = (size: number, weight: number) => `${weight} ${size}px ${FONT}`;

function canvasTex(w: number, h: number, scale: number, draw: (g: OffscreenCanvasRenderingContext2D) => void) {
  const c = new OffscreenCanvas(Math.round(w * scale), Math.round(h * scale));
  const g = c.getContext("2d")!;
  g.scale(scale, scale);
  draw(g);
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene, camera, width, height } = ctx;
    const D = fitCamera(camera, height);
    const FR = framing(width, height);
    const cam = camera as THREE.PerspectiveCamera;
    scene.background = new THREE.Color(BG);

    const desk = makeDesktop("desktop", {}, ctx.manager);
    scene.add(desk.mesh);

    // the banner, at 4x so it stays crisp with the camera right on it
    const cardTex = canvasTex(CW, CH, 4, (g) => {
      panelShape(g, CW, CH, 18, "rgba(44,45,52,0.97)");
      // app icon tile; the real Slack mark is drawn onto it once it loads
      g.beginPath();
      g.roundRect(14, (CH - 40) / 2, 40, 40, 10);
      g.fillStyle = "#ffffff";
      g.fill();
      g.textBaseline = "middle";
      g.textAlign = "left";
      g.fillStyle = "#ffffff";
      g.font = font(14.5, 600);
      g.fillText("Maya Chen", TX, 31);
      g.textAlign = "right";
      g.fillStyle = "rgba(255,255,255,0.62)";
      g.font = font(12.5, 400);
      g.fillText("now", CW - 16, 31);
      g.textAlign = "left";
      g.fillStyle = "#f2f2f5";
      g.font = font(MSG_SIZE, 400);
      g.fillText(MSG, TX, MSG_Y);
    });
    new THREE.ImageLoader(ctx.manager).load(slackLogoUrl, (img) => {
      const g = (cardTex.image as OffscreenCanvas).getContext("2d")!; // still scaled to points
      g.drawImage(img, 14 + 8, CH / 2 - 12, 24, 24);
      cardTex.needsUpdate = true;
    });
    const cardMat = new THREE.MeshBasicMaterial({ map: cardTex, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false });
    const card = new THREE.Mesh(new THREE.PlaneGeometry(CW * PX, CH * PX), cardMat);
    card.name = "slack-notification";
    card.renderOrder = 4;
    desk.mesh.add(card);

    // where "quick" sits on the banner, in banner px
    const m = new OffscreenCanvas(8, 8).getContext("2d")!;
    m.font = font(MSG_SIZE, 400);
    const qx = TX + m.measureText(MSG_PREFIX).width;
    const qw = m.measureText(WORD).width;

    // the selection: red block + white word, revealed left to right by cropping (never squashing)
    const HW = qw + 6;
    const HH = MSG_SIZE * 1.42;
    const hiTex = canvasTex(HW, HH, 6, (g) => {
      g.fillStyle = HILITE;
      g.fillRect(0, 0, HW, HH);
      g.fillStyle = "#ffffff";
      g.font = font(MSG_SIZE, 400);
      g.textBaseline = "middle";
      g.fillText(WORD, 3, HH / 2 + 0.5);
    });
    const hiGeo = new THREE.PlaneGeometry(HW * PX, HH * PX);
    hiGeo.translate((HW * PX) / 2, 0, 0); // left edge pinned
    const hiMat = new THREE.MeshBasicMaterial({ map: hiTex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    const hilite = new THREE.Mesh(hiGeo, hiMat);
    hilite.name = "quick-selection";
    hilite.renderOrder = 5;
    hilite.position.set((qx - 3 - CW / 2) * PX, (CH / 2 - MSG_Y) * PX, 0);
    card.add(hilite);

    const cursor = makeCursor("cursor", 30);
    const film = makeFilm(scene, camera, width, height, D);

    const cardRect: Rect = { x: CARD_X, y: CARD_Y, w: CW, h: CH };
    const cardCX = CARD_X + CW / 2;
    const cardCY = CARD_Y + CH / 2;
    const quickX0 = CARD_X + qx;
    const quickY = CARD_Y + MSG_Y + 2;
    const cursorKeys = T.cursor.map(([f, x, y]) => (x === 0 ? [f, quickX0 - 1, quickY] : [f, x, y]) as [number, number, number]);
    cursorKeys.splice(3, 0, [60, cursorKeys[2]![1], cursorKeys[2]![2]]);

    const rot = new THREE.Euler();
    const tmp = new THREE.Vector3();
    const z0 = 1.05;
    const z1 = Math.min(2.6, (width * 0.84) / CW);
    const [p0, p1] = T.push as [number, number];

    return ({ frame: f }) => {
      // handheld: a breath of movement under everything
      const hx = Math.sin(f * 0.19) * 0.025 + Math.sin(f * 0.47) * 0.01;
      const hy = Math.cos(f * 0.15) * 0.02 + Math.sin(f * 0.63) * 0.008;

      // the lean: from a wide, tilted look at the desktop onto the banner
      const p = prog(f, p0, p1 - p0, inOutCubic);
      const settle = prog(f, p1, T.length - p1, outCubic);
      const zoom = lerp(z0, z1, p) * (1 + 0.03 * settle);
      rot.set(lerp(0.12, 0.03, p), lerp(-0.2, -0.04, p), lerp(0.01, 0, p));
      const fx = lerp(820, cardCX, p);
      const fy = lerp(380, Math.max(cardCY, 96), p);
      desk.mesh.rotation.copy(rot);
      desk.mesh.position.copy(placeOn(desk, fx, fy, rot, tmp));
      cam.position.set(hx, hy, D / zoom);
      cam.rotation.set(0, 0, Math.sin(f * 0.11) * 0.005);

      // the desktop surfaces out of black; the lens racks to the banner as it lands
      desk.u.exposure.value = 0.82 * prog(f, T.wake[0]!, T.wake[1]! - T.wake[0]!, outCubic);
      const onCard = prog(f, T.notify, 16, inOutCubic);
      const focus: Rect = {
        x: lerp(520, cardRect.x, onCard), y: lerp(420, cardRect.y, onCard),
        w: lerp(260, cardRect.w, onCard), h: lerp(220, cardRect.h, onCard),
      };
      desk.lens(focus, 12, zoom, lerp(0.75, 1, onCard));

      // the banner slides in from the right edge
      const cin = prog(f, T.notify, 12, outCubic);
      cardMat.opacity = cin;
      card.position.copy(desk.local(cardCX + (1 - cin) * (CW + 40), cardCY, 0));

      // the selection
      const sweep = prog(f, T.drag[0]!, T.drag[1]! - T.drag[0]!, inOutCubic);
      hilite.visible = sweep > 0.001;
      hilite.scale.x = Math.max(1e-4, sweep);
      hiTex.repeat.x = Math.max(1e-4, sweep);

      // cursor: idles, freezes when the banner lands, then goes for one word
      let mx = keyed(f, cursorKeys.map(([k, x]) => [k, x]));
      let my = keyed(f, cursorKeys.map(([k, , y]) => [k, y]));
      if (f >= T.drag[0]!) mx = quickX0 - 1 + qw * sweep;
      const beam = f >= 86;
      const down = f >= T.mouseDown && f < T.release;
      cursor.set(desk, mx, my, { beam, press: down ? 0.5 : 0, opacity: prog(f, 4, 10, outCubic) });

      film.set(f, { vig: 1.0, flash: f === T.notify ? 0.035 : 0, flashColor: "#ffffff" });
    };
  });
}
