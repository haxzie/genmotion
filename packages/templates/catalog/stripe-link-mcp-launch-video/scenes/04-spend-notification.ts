import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";
import iconUrl from "../assets/link-app-icon.png";
import { C, SANS } from "../components/brand";
import { setupStage, place, wx, wy, enter, pop, setOpacity, canvasPlane, rr, U } from "../components/stage";
import { backdrop } from "../components/backdrop";
import { PHONE, SCREEN, SY, lockScreen, deviceFrame, glassSheen, phoneShadow, roundedMask } from "../components/phone";

/** Beat 4 — the phone lights up with a spend request from Link. */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene } = ctx;
  setupStage(ctx, C.bg);
  const ambient = backdrop(scene, { frame: true });

  const phone = new THREE.Group();
  phone.name = "phone";
  const screen = lockScreen();
  phone.add(screen, deviceFrame(), glassSheen());

  // Notification banner.
  const NW = SCREEN.w - 32, NH = 100;
  const notif = new THREE.Group();
  notif.name = "notification-approve-spend";
  const banner = canvasPlane("notification-banner", NW, NH, (g) => {
    rr(g, 0, 0, NW, NH, 24);
    g.fillStyle = "#3f5747"; g.fill();
    g.textBaseline = "middle";
    g.font = `500 28px ${SANS}`; g.fillStyle = "#ffffff";
    g.fillText("Approve spend request", 80, 34);
    g.font = `400 28px ${SANS}`; g.fillStyle = "#d3ddd6";
    g.fillText("Triplo · $180", 80, 68);
    g.textAlign = "right"; g.fillStyle = "#c2cec6";
    g.fillText("now", NW - 18, 68);
  });
  const iconTex = new THREE.TextureLoader(ctx.manager).load(iconUrl);
  iconTex.colorSpace = THREE.SRGBColorSpace;
  const icon = new THREE.Mesh(
    new THREE.PlaneGeometry(0.54, 0.54),
    new THREE.MeshBasicMaterial({ map: iconTex, alphaMap: roundedMask(0.24), transparent: true, depthWrite: false, toneMapped: false }),
  );
  icon.name = "notification-link-icon";
  icon.position.set((-NW / 2 + 14 + 27) / U, 0, 0.01);
  notif.add(banner, icon);
  const NOTIF_Y = SY(790);
  place(notif, PHONE.cx, NOTIF_Y, 0.02);
  phone.add(notif);

  const shadow = phoneShadow();
  scene.add(shadow, phone);

  const NOTIF_AT = 14;
  const LIFT = 56;

  return ({ frame, time }) => {
    ambient(time);
    const k = enter(frame, 0, 14);
    setOpacity(phone, k);
    setOpacity(shadow, k * 0.8);
    phone.scale.setScalar(0.96 + 0.04 * k);
    phone.position.y = -(1 - k) * 0.6;
    shadow.position.y = wy(PHONE.cy) - (1 - k) * 0.6;

    // Banner drops in from the top of its slot, then lifts towards the viewer.
    const n = enter(frame, NOTIF_AT, 12);
    const s = pop(frame, NOTIF_AT, 12);
    const lift = interpolate(frame, [LIFT, LIFT + 18], [0, 1], Easing.easeInOut);
    setOpacity(notif, n * k);
    notif.scale.setScalar((0.94 + 0.06 * s) * (1 + 0.05 * lift));
    notif.position.set(wx(PHONE.cx), wy(NOTIF_Y) + (1 - n) * 0.5 + lift * 0.22, 0.02);

    // Faint float.
    phone.position.y += Math.sin(time * 1.6) * 0.02;
  };
}
