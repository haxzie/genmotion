import * as THREE from "three";
import { C } from "./brand";

/**
 * The headset bot, built as a real 3D object with flat (unlit) materials: a
 * sphere, two pill eyes on its surface and a headset. Under the orthographic
 * stage it reads as flat 2D art, but it can turn, look, blink and squash, and
 * its eyes and ear cups hide behind the head the way the reference's do.
 *
 * Built at radius 1: `root.scale` is the body radius in stage px.
 */
export interface Bot {
  root: THREE.Group;
  /** Rotation z = axis of the squash/stretch. */
  tilt: THREE.Group;
  squash: THREE.Group;
  untilt: THREE.Group;
  /** Look direction: rotation.x pitch (−up), .y yaw (+ = face to viewer's right), .z roll. */
  head: THREE.Group;
  eyes: THREE.Mesh[];
  headset: THREE.Group;
  bodyMat: THREE.MeshBasicMaterial;
  eyeMat: THREE.MeshBasicMaterial;
  greenMat: THREE.MeshBasicMaterial;
  setInverted(v: boolean): void;
  setBlink(open: number): void;
  setSquash(stretch: number, angle: number): void;
  setLook(pitch: number, yaw: number, roll?: number): void;
}

/** The resting 3/4 pose the bot holds between moves. */
export const POSE = { pitch: -0.06, yaw: 0.42, roll: -0.1 };

export function makeBot(name: string): Bot {
  const bodyMat = new THREE.MeshBasicMaterial({ color: C.black });
  const eyeMat = new THREE.MeshBasicMaterial({ color: C.eye });
  const greenMat = new THREE.MeshBasicMaterial({ color: C.green });

  const root = new THREE.Group();
  root.name = name;
  const tilt = new THREE.Group();
  const squash = new THREE.Group();
  const untilt = new THREE.Group();
  const head = new THREE.Group();
  head.name = `${name}-head`;
  root.add(tilt);
  tilt.add(squash);
  squash.add(untilt);
  untilt.add(head);

  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), bodyMat);
  body.name = `${name}-body`;
  head.add(body);

  const eyeGeo = new THREE.CapsuleGeometry(0.12, 0.2, 6, 12);
  const eyes: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const yaw = side * 0.24;
    const pitch = 0.12;
    const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    const holder = new THREE.Group();
    holder.position.copy(dir).multiplyScalar(0.985);
    holder.lookAt(dir.clone().multiplyScalar(3));
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.name = `${name}-eye-${side < 0 ? "left" : "right"}`;
    eye.scale.set(1, 1, 0.35);
    // lookAt aims +Z out of the surface; the capsule's long axis stays "up".
    holder.add(eye);
    head.add(holder);
    eyes.push(eye);
  }

  // Headset: band over the top, two ear cups, a mic boom to the mouth.
  const headset = new THREE.Group();
  headset.name = `${name}-headset`;
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.17, 0.12, 10, 64, Math.PI), greenMat);
  band.rotation.x = -0.12;
  band.position.y = 0.02;
  band.name = `${name}-headset-band`;
  const cupGeo = new THREE.CapsuleGeometry(0.27, 0.32, 6, 16);
  const cupL = new THREE.Mesh(cupGeo, greenMat);
  cupL.position.set(-1.06, -0.1, 0.02);
  cupL.scale.set(0.8, 1, 1);
  cupL.name = `${name}-earcup-left`;
  const cupR = cupL.clone();
  cupR.position.x = 1.06;
  cupR.name = `${name}-earcup-right`;
  const boomCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.02, -0.32, 0.2),
    new THREE.Vector3(-0.85, -0.58, 0.55),
    new THREE.Vector3(-0.5, -0.66, 0.8),
    new THREE.Vector3(-0.2, -0.62, 0.92),
  ]);
  const boom = new THREE.Mesh(new THREE.TubeGeometry(boomCurve, 24, 0.055, 6, false), greenMat);
  boom.name = `${name}-mic-boom`;
  const mic = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.16, 6, 12), greenMat);
  mic.position.set(-0.17, -0.62, 0.93);
  mic.rotation.z = Math.PI / 2 - 0.15;
  mic.name = `${name}-mic`;
  headset.add(band, cupL, cupR, boom, mic);
  head.add(headset);

  const bot: Bot = {
    root, tilt, squash, untilt, head, eyes, headset, bodyMat, eyeMat, greenMat,
    setInverted(v) {
      bodyMat.color.set(v ? C.white : C.black);
      eyeMat.color.set(v ? C.black : C.eye);
    },
    setBlink(open) {
      const s = Math.max(0.06, open);
      for (const e of eyes) e.scale.y = s;
      for (const e of eyes) e.visible = open > 0.02;
    },
    setSquash(stretch, angle) {
      tilt.rotation.z = angle;
      untilt.rotation.z = -angle;
      squash.scale.set(stretch, 1 / Math.sqrt(stretch), 1);
    },
    setLook(pitch, yaw, roll = 0) {
      head.rotation.set(pitch, yaw, roll, "YXZ");
    },
  };
  bot.setLook(POSE.pitch, POSE.yaw, POSE.roll);
  return bot;
}

/** The bot drawn flat into a 2D canvas, for app avatars inside UI textures. */
export function drawBot2D(g: OffscreenCanvasRenderingContext2D, cx: number, cy: number, r: number, inverted = false): void {
  g.save();
  g.lineCap = "round";
  // band
  g.strokeStyle = C.green;
  g.lineWidth = r * 0.17;
  g.beginPath();
  g.arc(cx, cy, r * 1.13, Math.PI * 1.08, Math.PI * 1.98);
  g.stroke();
  // body
  g.fillStyle = inverted ? C.white : C.black;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  // cups
  g.fillStyle = C.green;
  const cup = (x: number, y: number, w: number, h: number) => {
    g.beginPath();
    g.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    g.fill();
  };
  cup(cx - r * 0.98, cy + r * 0.05, r * 0.24, r * 0.38);
  cup(cx + r * 1.0, cy - r * 0.02, r * 0.15, r * 0.32);
  // mic boom
  g.strokeStyle = C.green;
  g.lineWidth = r * 0.08;
  g.beginPath();
  g.moveTo(cx - r * 0.9, cy + r * 0.35);
  g.quadraticCurveTo(cx - r * 0.7, cy + r * 0.62, cx - r * 0.3, cy + r * 0.6);
  g.stroke();
  cup(cx - r * 0.22, cy + r * 0.6, r * 0.17, r * 0.1);
  // eyes
  g.fillStyle = inverted ? C.black : C.eye;
  const eye = (x: number) => {
    const w = r * 0.17;
    const h = r * 0.34;
    g.beginPath();
    g.roundRect(x - w / 2, cy - r * 0.32, w, h, w / 2);
    g.fill();
  };
  eye(cx + r * 0.12);
  eye(cx + r * 0.48);
  g.restore();
}
