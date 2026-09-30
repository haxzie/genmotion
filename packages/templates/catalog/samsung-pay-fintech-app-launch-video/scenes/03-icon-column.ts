import * as THREE from "three";
import { interpolate, Easing } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { words, setOpacity } from "../components/text";
import { backdrop, fitCamera } from "../components/stage";
import { tile, tileLights, type Glyph } from "../components/tiles";

/**
 * 33 frames. Macro: big tiles race upward past the lens, parting around the caption, then
 * decelerate and LAND on a held frame (cart above, coins below) ~10 frames before the cut —
 * matching the reference, which settles rather than cutting mid-motion.
 */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera, width, height, durationInFrames } = ctx;
  fitCamera(camera, height);
  scene.background = new THREE.Color(C.black);
  const bg = backdrop(width / height);
  bg.u.uRadial.value = 0.2;
  scene.add(bg.mesh);
  tileLights(scene);

  const kinds: Glyph[] = ["arrow", "check", "globe", "chart", "shirt", "shield", "cart", "coins", "card", "bag"];
  const skins = ["light", "dark", "light", "dark", "light", "light", "dark", "light", "light", "dark"] as const;
  const STEP = 3.3; // vertical spacing (world units)
  const column = new THREE.Group();
  column.name = "tile-column";
  scene.add(column);
  const items = kinds.map((k, i) => {
    const t = tile(k, skins[i], 2.4, `column-tile-${k}`);
    t.rotation.set(-0.35, 0.22 * (i % 2 ? 1 : -1), 0.05 * (i % 3 - 1));
    column.add(t);
    return { t, i };
  });

  const caption = words(
    [{ text: "wherever" }, { text: "India", fill: C.violet }, { text: "shops" }],
    { size: 52, fill: C.text },
  );
  caption.name = "caption-wherever-india-shops";
  scene.add(caption);
  const cw = caption.userData.words as THREE.Mesh[];

  return ({ frame }) => {
    // Fast start, smooth quartic deceleration: ~99% of the travel is done by f22, then the
    // column creeps into its resting pose and holds for the cut (no kink, no hard brake).
    const t = Math.min(1, frame / (durationInFrames - 1));
    const land = 1 - Math.pow(1 - t, 4);
    // rest pose: tile 6 (cart) at y0 = +STEP/2, tile 7 (coins) at y0 = −STEP/2, caption centred
    const REST = 3 + STEP / 2 + 2 * STEP;
    const scroll = land * REST;
    items.forEach(({ t, i }) => {
      const y0 = (i - 4) * -STEP + scroll - 3;
      // smooth, monotonic parting: tiles spread away from the caption line and
      // slip back in depth as they pass it — no sign flip, so no jump
      const y = y0 + 1.1 * (y0 / Math.sqrt(y0 * y0 + 0.9));
      const near = Math.exp(-(y0 * y0) / 1.6);
      t.position.set(0, y, 1.5 - Math.abs(y) * 0.12 - near * 2.2);
      t.rotation.x = -0.35 + y * 0.06;
      t.scale.setScalar(2.4 * (1 - 0.6 * near));
    });

    cw.forEach((w, i) => {
      const at = 4 + i * 3;
      const e = interpolate(frame, [at, at + 7], [0, 1], Easing.easeOut);
      setOpacity(w, e);
      w.position.y = (1 - e) * (i === 1 ? -0.3 : -0.12);
    });
    camera.position.z = THREE.MathUtils.lerp(7.2, 6.6, land);
    // after landing, the caption breathes so the held frame isn't frozen
    caption.scale.setScalar(1 + Math.max(0, frame - 20) * 0.0015);
  };
}
