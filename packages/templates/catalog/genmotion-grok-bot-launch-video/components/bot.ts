import * as THREE from "three";
import { C } from "./brand";

/**
 * The director bot, built as a real 3D object with flat (unlit) materials: a
 * sphere, two pill eyes on its surface and a beret. Under the orthographic
 * stage it reads as flat 2D art, but it can turn, look, blink and squash, and
 * its eyes hide behind the head the way the reference's do.
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
  /** The beret (kept as `headset`: it is the thing that flies in and lands). */
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

  // Beret: a soft flattened dome cocked to one side, a darker band where it
  // meets the head, and the little stalk on top. The whole group is what
  // flies in and lands in scene 1, so it keeps the `headset` handle.
  const headset = new THREE.Group();
  headset.name = `${name}-beret`;
  const bandMat = new THREE.MeshBasicMaterial({ color: C.greenDeep });
  const cocked = new THREE.Group();
  cocked.position.set(-0.12, 0.8, -0.04);
  cocked.rotation.set(-0.18, 0, 0.34);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), greenMat);
  crown.scale.set(1.08, 0.36, 1.0);
  crown.position.y = 0.1;
  crown.name = `${name}-beret-crown`;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.075, 8, 48), bandMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.05;
  rim.name = `${name}-beret-band`;
  const stalk = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.12, 4, 8), greenMat);
  stalk.position.set(0.05, 0.5, 0);
  stalk.rotation.z = -0.3;
  stalk.name = `${name}-beret-stalk`;
  cocked.add(crown, rim, stalk);
  headset.add(cocked);
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
  // body
  g.fillStyle = inverted ? C.white : C.black;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  // beret, cocked to the viewer's left
  g.save();
  g.translate(cx - r * 0.12, cy - r * 0.8);
  g.rotate(-0.34);
  g.fillStyle = C.green;
  g.beginPath();
  g.ellipse(0, 0, r * 1.08, r * 0.42, 0, Math.PI, Math.PI * 2);
  g.ellipse(0, 0, r * 1.08, r * 0.16, 0, 0, Math.PI);
  g.fill();
  g.fillStyle = C.greenDeep;
  g.beginPath();
  g.ellipse(0, r * 0.06, r * 0.84, r * 0.1, 0, 0, Math.PI);
  g.fill();
  g.strokeStyle = C.green;
  g.lineCap = "round";
  g.lineWidth = r * 0.12;
  g.beginPath();
  g.moveTo(r * 0.02, -r * 0.4);
  g.lineTo(r * 0.1, -r * 0.6);
  g.stroke();
  g.restore();
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
