/**
 * Act II, prologue — The notification. Darkness. A phone lying face-up on a
 * table chimes; its screen wakes to a near-black lock screen and an email
 * notification rises in: "Halcyon Labs Recruiting · Update on your application".
 * The only light in the room is the screen. The camera leans in until the
 * notification can be read, then cuts to the inbox.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { FONT, PX, fitCamera, withFonts, prog, inOutCubic, outCubic, lerp, framing } from "../components/core";
import { BG, makeFilm } from "../components/film";
import { NOTIFY_T as T } from "../components/timeline";
import gmailLogoUrl from "../assets/gmail-logo.png";

/** Screen size in points; 1 pt = 1 px at zoom 1. */
const SW = 390;
const SH = 844;

function roundedRect(w: number, h: number, r: number): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, 24);
  // UVs from position, so a canvas maps edge to edge
  const pos = g.attributes.position!;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - x) / w;
    uv[i * 2 + 1] = (pos.getY(i) - y) / h;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.scale(PX, PX, 1);
  return g;
}

function canvasTexture(w: number, h: number, scale: number, draw: (g: OffscreenCanvasRenderingContext2D) => void) {
  const c = new OffscreenCanvas(Math.round(w * scale), Math.round(h * scale));
  const g = c.getContext("2d")!;
  g.scale(scale, scale);
  draw(g);
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const font = (size: number, weight: number) => `${weight} ${size}px ${FONT}`;

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene, camera, width, height, durationInFrames: N } = ctx;
    const D = fitCamera(camera, height);
    const FR = framing(width, height);
    const cam = camera as THREE.PerspectiveCamera;
    scene.background = new THREE.Color(BG);

    // ------------------------------------------------------------ lock screen
    const lockTex = canvasTexture(SW, SH, 3, (g) => {
      const bg = g.createLinearGradient(0, 0, 0, SH);
      bg.addColorStop(0, "#05060a");
      bg.addColorStop(1, "#0b0e16");
      g.fillStyle = bg;
      g.fillRect(0, 0, SW, SH);
      const glow = g.createRadialGradient(SW * 0.5, SH * 0.32, 10, SW * 0.5, SH * 0.32, SW * 0.9);
      glow.addColorStop(0, "rgba(60,80,120,0.22)");
      glow.addColorStop(1, "rgba(60,80,120,0)");
      g.fillStyle = glow;
      g.fillRect(0, 0, SW, SH);
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = "rgba(255,255,255,0.62)";
      g.font = font(19, 500);
      g.fillText("Tuesday, October 14", SW / 2, 118);
      g.fillStyle = "rgba(255,255,255,0.86)";
      g.font = font(92, 500);
      g.fillText("9:41", SW / 2, 192);
      for (const cx of [62, SW - 62]) {
        g.beginPath();
        g.arc(cx, SH - 86, 24, 0, Math.PI * 2);
        g.fillStyle = "rgba(255,255,255,0.10)";
        g.fill();
      }
      g.beginPath();
      g.roundRect(SW / 2 - 67, SH - 16, 134, 5, 3);
      g.fillStyle = "rgba(255,255,255,0.55)";
      g.fill();
    });

    // the notification, drawn on its own plane so it can rise in
    const CW = 362;
    const CH = 98;
    const cardTex = canvasTexture(CW, CH, 4, (g) => {
      g.beginPath();
      g.roundRect(0, 0, CW, CH, 22);
      g.fillStyle = "rgba(52,54,62,0.82)";
      g.fill();
      // the Gmail app icon: a white rounded tile; the real mark is drawn onto it once it loads
      g.beginPath();
      g.roundRect(14, 14, 38, 38, 9);
      g.fillStyle = "#ffffff";
      g.fill();
      g.textBaseline = "middle";
      g.textAlign = "left";
      g.fillStyle = "#ffffff";
      g.font = font(15, 600);
      g.fillText("Halcyon Labs Recruiting", 64, 26);
      g.textAlign = "right";
      g.fillStyle = "rgba(255,255,255,0.55)";
      g.font = font(13, 400);
      g.fillText("now", CW - 16, 26);
      g.textAlign = "left";
      g.fillStyle = "#ffffff";
      g.font = font(15, 400);
      g.fillText("Update on your application", 64, 49);
      g.fillStyle = "rgba(255,255,255,0.62)";
      g.fillText("Thank you for your interest in the Pro…", 64, 72);
    });

    // ------------------------------------------------------------- the phone
    // A real object: an extruded, bevelled slab with a metal frame and black glass,
    // side buttons, resting on a table lit only by its own screen.
    const BW = (SW + 22) * PX;
    const BH = (SH + 22) * PX;
    const BR = 62 * PX;
    const THICK = 0.4;
    const BEV = 0.05;

    // reflections: a tiny dark studio with two soft panels, baked to an env map
    const pmrem = new THREE.PMREMGenerator(ctx.renderer);
    const studio = new THREE.Scene();
    studio.add(new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: "#000000", side: THREE.BackSide })));
    const panel = (w: number, h: number, x: number, y: number, z: number, c: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c, c, c * 1.1), side: THREE.DoubleSide }));
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      studio.add(m);
    };
    panel(8, 2, -4, 6, 5, 5);
    panel(3, 6, 7, 1, 3, 2);
    panel(10, 1, 0, -6, 4, 1.4);
    const env = pmrem.fromScene(studio, 0.04).texture;
    pmrem.dispose();
    scene.environment = env;

    const roundedShape = (w: number, h: number, r: number) => {
      const s = new THREE.Shape();
      const x = -w / 2;
      const y = -h / 2;
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y);
      s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r);
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h);
      s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r);
      s.quadraticCurveTo(x, y, x + r, y);
      return s;
    };
    const bodyGeo = new THREE.ExtrudeGeometry(roundedShape(BW - 2 * BEV, BH - 2 * BEV, BR - BEV), {
      depth: THICK - 2 * BEV, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 6, curveSegments: 40,
    });
    bodyGeo.translate(0, 0, -(THICK - BEV)); // front glass at z = 0, back at -THICK
    const glass = new THREE.MeshPhysicalMaterial({ color: "#030304", roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.5 });
    const frameMat = new THREE.MeshStandardMaterial({ color: "#4a4b52", metalness: 0.95, roughness: 0.26, envMapIntensity: 1.6 });
    const body = new THREE.Mesh(bodyGeo, [glass, frameMat]);
    body.name = "phone-body";

    const button = (name: string, x: number, y: number, len: number) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, len, 0.15), frameMat);
      b.name = name;
      b.position.set(x, y, -THICK / 2);
      return b;
    };
    const buttons = [
      button("action-button", -BW / 2 - 0.012, 2.55, 0.3),
      button("volume-up", -BW / 2 - 0.012, 1.85, 0.6),
      button("volume-down", -BW / 2 - 0.012, 1.1, 0.6),
      button("side-button", BW / 2 + 0.012, 1.55, 0.95),
    ];

    const screenMat = new THREE.MeshBasicMaterial({ map: lockTex, color: new THREE.Color(0, 0, 0), toneMapped: false });
    const screenMesh = new THREE.Mesh(roundedRect(SW, SH, 52), screenMat);
    screenMesh.name = "lock-screen";
    screenMesh.position.z = 0.002;

    // the real Gmail logo (assets/gmail-logo.png), loaded through the frame barrier
    new THREE.ImageLoader(ctx.manager).load(gmailLogoUrl, (img) => {
      const g = (cardTex.image as OffscreenCanvas).getContext("2d")!; // still scaled to points
      const w = 26;
      const h = (w * img.height) / img.width;
      g.drawImage(img, 33 - w / 2, 33 - h / 2, w, h);
      cardTex.needsUpdate = true;
    });
    const cardMat = new THREE.MeshBasicMaterial({ map: cardTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const card = new THREE.Mesh(roundedRect(CW, CH, 22), cardMat);
    card.name = "email-notification";
    const CARD_Y = -40 * PX;
    card.position.set(0, CARD_Y, 0.004);

    // the glass: a faint diagonal sheen that slides as the camera moves over it
    const sheenTex = canvasTexture(256, 256, 1, (g) => {
      const lg = g.createLinearGradient(0, 0, 256, 256);
      lg.addColorStop(0.0, "rgba(255,255,255,0)");
      lg.addColorStop(0.42, "rgba(255,255,255,0)");
      lg.addColorStop(0.5, "rgba(255,255,255,1)");
      lg.addColorStop(0.62, "rgba(255,255,255,0)");
      lg.addColorStop(1.0, "rgba(255,255,255,0)");
      g.fillStyle = lg;
      g.fillRect(0, 0, 256, 256);
    });
    sheenTex.wrapS = sheenTex.wrapT = THREE.ClampToEdgeWrapping;
    const sheenMat = new THREE.MeshBasicMaterial({ map: sheenTex, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const sheen = new THREE.Mesh(roundedRect(SW + 20, SH + 20, 60), sheenMat);
    sheen.name = "glass-reflection";
    sheen.position.z = 0.006;
    sheen.userData.pickable = false;

    const phone = new THREE.Group();
    phone.name = "phone";
    phone.add(body, ...buttons, screenMesh, card, sheen);
    phone.rotation.z = -0.06; // left where it was dropped, not squared to the table

    // the table, lit only by the screen; a soft contact shadow where the phone sits
    const table = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: "#2a2c33", roughness: 0.55, metalness: 0.05, envMapIntensity: 0 }),
    );
    table.name = "table";
    table.position.z = -THICK - 0.002;
    table.userData.pickable = false;

    const shadowTex = canvasTexture(512, 1024, 1, (g) => {
      g.shadowColor = "rgba(0,0,0,0.95)";
      g.shadowBlur = 46;
      g.shadowOffsetX = 2000;
      g.beginPath();
      g.roundRect(70 - 2000, 70, 512 - 140, 1024 - 140, 70);
      g.fillStyle = "#000";
      g.fill();
    });
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(BW * (512 / 372), BH * (1024 / 884)),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false }),
    );
    shadow.name = "contact-shadow";
    shadow.position.set(0.04, -0.06, -THICK + 0.001);
    shadow.rotation.z = -0.06;
    shadow.userData.pickable = false;

    const screenLight = new THREE.PointLight("#a9bde6", 0, 0, 2);
    screenLight.position.set(0, 0.2, 0.7);
    const world = new THREE.Group();
    world.name = "desk";
    world.add(table, shadow, phone, screenLight);
    scene.add(world);

    const moon = new THREE.DirectionalLight("#7f8fb0", 0.1);
    moon.position.set(-4, 6, 5);
    scene.add(moon);

    const film = makeFilm(scene, camera, width, height, D);
    const target = new THREE.Vector3();
    const cardWorld = new THREE.Vector3();
    // zoom at which the card fills ~86% of the frame width
    const zEnd = (width * 0.86) / CW;
    const zStart = 0.92 * FR.fit + (FR.wide ? 0 : 0.08);

    return ({ frame: f }) => {
      // the screen wakes fast, like a real one, and its light falls on the table
      const bright = prog(f, T.wake, 6, outCubic);
      screenMat.color.setScalar(0.04 + 0.96 * bright);
      screenLight.intensity = 26 * bright;

      const cin = prog(f, T.cardIn, 12, outCubic);
      cardMat.opacity = cin;
      card.position.y = CARD_Y - (1 - cin) * 46 * PX;
      card.scale.setScalar(0.97 + 0.03 * cin);

      // lean in: the camera comes over the phone, the table tilt easing toward flat
      const p = prog(f, T.push[0]!, T.push[1]! - T.push[0]!, inOutCubic);
      const settle = prog(f, T.push[1]!, N - T.push[1]!, outCubic);
      world.rotation.x = lerp(-0.66, -0.2, p) + 0.02 * settle;
      world.rotation.y = lerp(0.42, 0.08, p);
      world.updateMatrixWorld();
      sheenTex.offset.set(lerp(-0.25, 0.2, p), lerp(0.25, -0.2, p));
      cardWorld.set(0, CARD_Y, 0.004).applyMatrix4(card.parent!.matrixWorld);
      target.set(0, 0, 0).lerp(cardWorld, p);
      const zoom = lerp(zStart, zEnd, p) * (1 + 0.025 * settle);
      cam.position.set(target.x, target.y - 0.4 * (1 - p), target.z + D / zoom);
      cam.lookAt(target);

      film.set(f, { vig: 1.05 });
    };
  });
}
