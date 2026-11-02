import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import logoUrl from "../assets/link-logo.png";
import { C } from "../components/brand";
import { setupStage, enter, pop, U } from "../components/stage";
import { backdrop } from "../components/backdrop";

/** Beat 6 — the Link mark lands centre frame. */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene } = ctx;
  setupStage(ctx, C.bg);
  const ambient = backdrop(scene, { frame: false, glow: [[760, 860], [980, 620]] });

  // The real mark, taken from the source film (300×132 px, keyed onto alpha).
  const tex = new THREE.TextureLoader(ctx.manager).load(logoUrl);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(300 / U, 132 / U),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }),
  );
  logo.name = "link-logo";
  scene.add(logo);
  const mat = logo.material as THREE.MeshBasicMaterial;

  return ({ frame, time }) => {
    ambient(time);
    const k = enter(frame, 0, 10);
    const s = pop(frame, 0, 10);
    mat.opacity = k;
    // Settles with a small overshoot, then breathes.
    logo.scale.setScalar((0.9 + 0.1 * s) * (1 + Math.sin(time * 1.8) * 0.008));
  };
}
