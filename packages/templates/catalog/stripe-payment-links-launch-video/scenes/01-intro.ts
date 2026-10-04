/**
 * 01 · "Global payments are a" — 0–60
 * Black frame, a faint centre grid and a soft white horizon glow at the bottom.
 * "Global" blurs in, "payments" ripples in letter by letter, both clear, then
 * "are" and "a" land one word at a time — the cut to scene 02 completes "a pain".
 */
import * as THREE from "three";
import { interpolate, Easing, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import { withFonts } from "../components/fonts";
import { makeText, makeChars, measureText, type TextOpts } from "../components/type";
import { orthoStage } from "../components/stage";
import { gridTexture, backdrop } from "../components/fx";
import { C } from "../components/brand";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene } = ctx;
    scene.background = new THREE.Color(C.page);
    orthoStage(ctx);

    // faint centre grid, fading to the edges
    const grid = new THREE.Mesh(
      new THREE.PlaneGeometry(1400, 1400),
      new THREE.MeshBasicMaterial({
        map: gridTexture({ cells: 17, cell: 82, line: "rgba(10,37,64,0.07)", cross: "rgba(10,37,64,0.28)", crossEvery: 2, crossSize: 9, fade: true }),
        transparent: true, depthWrite: false, toneMapped: false,
      }),
    );
    grid.name = "intro-grid";
    grid.userData.pickable = false;
    grid.position.y = 60;

    // the horizon glow at the bottom edge
    const glow = backdrop(1920, 1080, (g, w, h) => {
      g.save();
      g.translate(w / 2, h + 90);
      g.scale(1, 0.4);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 900);
      gr.addColorStop(0, "rgba(99,91,255,0.42)");
      gr.addColorStop(0.3, "rgba(169,96,238,0.22)");
      gr.addColorStop(0.6, "rgba(0,212,255,0.07)");
      gr.addColorStop(1, "rgba(0,212,255,0)");
      g.fillStyle = gr;
      g.fillRect(-1000, -1000, 2000, 2000);
      g.restore();
    }, "horizon-glow");
    scene.add(grid, glow);

    const base: TextOpts = { size: 104, weight: 500, tracking: -0.025, color: C.navy };

    // "Selling online"
    const line1W = measureText("Selling online", base);
    const global = makeText("Selling", { ...base, anchor: "left", blur: 10 }, "selling");
    const gW = measureText("Selling ", base);
    global.group.position.x = -line1W / 2;
    const payments = makeChars("online", { ...base, color: C.slate, blur: 8 }, "online");
    payments.group.position.x = -line1W / 2 + gW + payments.width / 2;
    const line1 = new THREE.Group();
    line1.name = "selling-online";
    line1.add(global.group, payments.group);

    // "are a" — laid out as "are a pain" so the next scene's "pain" completes it
    const line2W = measureText("is a pain", base);
    const are = makeText("is", { ...base, anchor: "left", blur: 10 }, "is");
    are.group.position.x = -line2W / 2;
    const a = makeText("a", { ...base, anchor: "left", blur: 10 }, "a");
    a.group.position.x = -line2W / 2 + measureText("is ", base);
    const line2 = new THREE.Group();
    line2.name = "is-a";
    // "pain" sits dim in place, waiting for the cut
    const pain = makeText("pain", { ...base, anchor: "left", color: C.navy, blur: 10 }, "pain");
    pain.group.position.x = -line2W / 2 + measureText("is a ", base);
    line2.add(are.group, a.group, pain.group);
    line1.position.y = line2.position.y = 8;
    scene.add(line1, line2);

    return ({ frame }) => {
      // the glow breathes very slightly, the grid drifts up a few px
      glow.material.opacity = 0.92 + Math.sin(frame * 0.12) * 0.04;
      grid.position.y = 60 + frame * 0.15;
      const push = 1 + frame * 0.0006;
      line1.scale.setScalar(push);
      line2.scale.setScalar(push);

      // "Global": blur-in 8→15, exit 38→45
      const gin = interpolate(frame, [8, 15], [0, 1], Easing.easeOut);
      const out1 = interpolate(frame, [34, 45], [0, 1], Easing.easeIn);
      global.set(gin * (1 - out1), (1 - gin) + out1 * 0.8);
      line1.position.y = 8 + out1 * 50;
      payments.chars.forEach((c, i) => {
        const s = 13 + i * 0.8;
        const p = interpolate(frame, [s, s + 6], [0, 1], Easing.easeOut);
        c.set(p * (1 - out1), (1 - p) + out1 * 0.8);
      });

      // "are" 44→49, "a" 50→55; hold to the cut
      const ain = interpolate(frame, [40, 48], [0, 1], Easing.easeOut);
      are.set(ain, 1 - ain);
      are.group.position.y = (1 - ain) * -50;
      const pin = interpolate(frame, [52, 59], [0, 0.16], Easing.easeOut);
      pain.set(pin, 0.6);
      const a2 = interpolate(frame, [50, 55], [0, 1], Easing.easeOut);
      a.set(a2, 1 - a2);
      a.group.position.y = (1 - a2) * -40;
      pain.group.position.y = (1 - pin / 0.16) * -40 - 10;
    };
  });
}
