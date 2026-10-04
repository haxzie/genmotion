/**
 * 03 · Inside the column → the link coin — global frames 207–234 (Stripe remix: blurple glass column, chain-link coin)
 *
 * Opens inside the teal column scene 02 rushed into (a lit vertical band, glowing
 * edges, black either side). The band narrows to its resting width while a teal
 * coin with a chrome ∞ flips up from below, tumbles edge-on, and settles facing the
 * camera. It then turns about its vertical axis, and at the cut it is edge-on —
 * scene 04 opens on the bare ∞ turning out of that same edge-on pose.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { perspStage, seg, easeInOutCubic, splineKeys } from "../components/stage";
import { studioEnvLight, linkCoin } from "../components/linkmark";
import { C } from "../components/brand";
import { blurpleColumn } from "../components/column";

const G0 = 207;

/** [G, y px, rotX, rotY, rotZ, scale] */
type Key = [number, number, number, number, number, number];
const KEYS: Key[] = [
  [207, -760, -1.3, -0.3, 0.6, 1.1],
  [209, -330, -1.4, -0.3, 0.45, 1.06],
  [211, -110, 0.1, 1.42, 0.3, 1.03],
  [213, -20, -0.15, 1.1, -0.3, 1.0],
  [216, 0, -0.32, 0.6, -0.5, 1.0],
  [219, 0, -0.3, 0.48, -0.45, 1.0],
  [225, 0, -0.24, 0.4, -0.35, 1.0],
  [229, 0, -0.12, 0.12, -0.12, 1.0],
  [232, 0, 0.0, -0.45, 0.0, 1.0],
  [234, 0, 0.0, -1.5, 0.0, 1.0],
];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, renderer } = ctx;
  scene.background = new THREE.Color(C.page);
  const { cam } = perspStage(ctx);
  const env = studioEnvLight(renderer as THREE.WebGLRenderer);

  // ------------------------------------------------------------ the column (drawn band)
  const column = blurpleColumn();
  column.position.z = 0;
  scene.add(column);

  // ------------------------------------------------------------ the coin
  const R = 205;
  const coin = linkCoin(env, R, "link-coin");
  scene.add(coin);

  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(-300, 600, 800);
  const fill = new THREE.DirectionalLight(0xe9e7ff, 1.0);
  fill.position.set(500, -200, 400);
  scene.add(key, fill, new THREE.AmbientLight(0xffffff, 0.5));

  const kv = [0, 0, 0, 0, 0];
  return ({ frame }) => {
    const G = frame + G0;

    // the band settles from the wide rush-in framing to its resting width
    const s = easeInOutCubic(seg(G, 207, 211));
    column.scale.set(THREE.MathUtils.lerp(1.3, 1, s), 1, 1);
    column.position.x = THREE.MathUtils.lerp(-60, 0, s);
    column.position.z = 0;

    // one C1 spline through the coin's keys: it never stops on a key
    splineKeys(KEYS, G, kv);
    coin.position.set(0, kv[0], 0);
    coin.rotation.set(kv[1], kv[2], kv[3], "YXZ");
    coin.scale.setScalar(kv[4]);
    void cam;
  };
}
