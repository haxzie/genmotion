import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import { COPY, FONT_FAMILY } from "../components/brand";
import { screenLayer, designWidth, DH, fy, track } from "../components/stage";
import { label, setLabel, haloOf, withFonts } from "../components/type";
import { backdrop, glowDot, streak, type Dot } from "../components/fx";
import { curve, C_ZOOM } from "../components/ref-curves";

/*
 * Opens inside the star from scene 1: it blooms into the line, the lattice of
 * stars settles around it, four neon streaks draw on to their nodes, a slow
 * push, then a fast push through the type into white.
 */

/** Layout was measured at this zoom; base positions are stored at Z = 1. */
const Z_REF = 1.15;
const STAR_Y = track([[0, 0.37], [3, 0.5], [6, 0.5]]);
const STAR_HALO = track([[0, 70], [3, 170], [6, 210], [10, 150]]);
const TEXT_BLUR = track([[3, 44], [6, 26], [9, 12], [12, 5], [15, 0], [70, 0], [74, 3], [77, 8], [80, 16], [84, 30]]);

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: FONT_FAMILY, url: interUrl }], () => {
    const { scene, camera, width, height } = ctx;
    const layer = screenLayer(scene, camera);
    const W = designWidth(width, height);
    const P = (x: number, y: number) => new THREE.Vector2(((x - 0.5) * W) / Z_REF, ((0.5 - y) * DH) / Z_REF);

    const bg = backdrop();
    bg.grad("#06080d", "#05060a", [0, 1]);
    scene.add(bg);

    const world = new THREE.Group();
    world.name = "constellation";
    layer.add(world);

    /* lattice of stars */
    const DX = (0.2875 * W) / Z_REF;
    const DY = 360 / Z_REF;
    const stars: { dot: Dot; delay: number }[] = [];
    for (let r = -3; r <= 3; r++) {
      for (let c = -4; c <= 4; c++) {
        if (r === 0 && c === 0) continue;
        const dot = glowDot(4.5, 24, "#ffffff");
        dot.name = `star-${r + 3}-${c + 4}`;
        dot.position.set(c * DX, r * DY, 0);
        world.add(dot);
        stars.push({ dot, delay: (Math.abs(r) + Math.abs(c)) * 1.5 });
      }
    }
    // the fine dust left over from the floor, gone as the lattice settles
    const dust: Dot[] = [];
    for (let r = -6; r <= 6; r++) {
      for (let c = -8; c <= 8; c++) {
        if ((r + c) % 2 !== 0 || (r === 0 && c === 0)) continue;
        const d = glowDot(2.5, 10, "#dfe8ff");
        d.position.set((c * DX) / 2.2, (r * DY) / 2.2 + 40, 0);
        d.name = "floor-dust";
        d.userData.pickable = false;
        world.add(d);
        dust.push(d);
      }
    }

    /* streaks: path, colours, head keys (local frames) */
    const lines = [
      { name: "streak-green", s: streak([P(-0.03, 0.42), P(0.2125, 0.167)], "#2c7a2c", "#7cf06a"), head: track([[14, 0], [28, 1]]), node: 1 },
      { name: "streak-yellow", s: streak([P(-0.03, 0.585), P(0.2125, 0.833), P(0.05, 1.03)], "#c9a020", "#ffe040"), head: track([[8, 0], [15, 0.55], [28, 1]]), node: 0.55 },
      { name: "streak-blue", s: streak([P(0.635, -0.03), P(0.7875, 0.167), P(1.03, 0.167)], "#2850e0", "#dfe8ff"), head: track([[11, 0], [24, 0.42], [40, 1]]), node: 0.42 },
      { name: "streak-arc", s: streak([P(0.56, 1.04), P(0.68, 0.86), P(0.7875, 0.833), P(0.9, 0.86), P(1.03, 0.97)], "#3a6cf0", "#ff4a5a", 14, 2, true), head: track([[14, 0], [33, 0.48], [62, 1]]), node: 0.48 },
    ];
    lines.forEach((l) => {
      l.s.name = l.name;
      l.s.material.uniforms.uTail!.value = 0.22;
      l.s.material.uniforms.uFloor!.value = 0.3;
      world.add(l.s);
    });
    const nodeColors = ["#7cf06a", "#ffd23a", "#4a7cff", "#ff4a5a"];
    const nodePos = [P(0.2125, 0.167), P(0.2125, 0.833), P(0.7875, 0.167), P(0.7875, 0.833)];
    const nodes = nodePos.map((p, i) => {
      const d = glowDot(5, 40, "#ffffff", nodeColors[i]);
      d.position.set(p.x, p.y, 0);
      d.name = `node-${["green", "yellow", "blue", "red"][i]}`;
      world.add(d);
      return d;
    });
    // little heads riding the front of each streak
    const heads = lines.map((l, i) => {
      const d = glowDot(3.5, 26, "#ffffff", nodeColors[i]);
      d.name = `${l.name}-head`;
      d.userData.pickable = false;
      world.add(d);
      return d;
    });

    /* the line */
    const text = label(COPY.forAll, { size: 106, weight: 450, pad: 80 });
    const halo = haloOf(text, 28, 0.5);
    world.add(halo, text);

    /* the star we arrive inside */
    const star = glowDot(12, 100, "#ffffff", "#d6e4ff");
    star.name = "star";
    layer.add(star);
    const starU = star.material.uniforms;

    return ({ frame: f, time }) => {
      const z = curve(C_ZOOM, f + 201); // measured push: fast settle, slow drift, exponential rush
      world.scale.setScalar(z);
      world.position.set(Math.sin(time * 0.6) * 2, Math.cos(time * 0.5) * 2, 0);

      /* backdrop: the bloom's blue haze, then warm corners */
      const warm = interpolate(f, [9, 26], [0, 1], Easing.easeOut);
      bg.glow(0, { x: 0.05, y: 0.95, rx: 0.45, ry: 0.4, color: "#4a3a0c", amount: 0.55 * warm });
      bg.glow(1, { x: 0.95, y: 0.95, rx: 0.45, ry: 0.4, color: "#4a0f1c", amount: 0.55 * warm });
      bg.glow(2, { x: 0.85, y: 0.0, rx: 0.4, ry: 0.3, color: "#0d1f44", amount: 0.5 });
      bg.glow(3, { x: 0.5, y: 0.52, rx: 0.3, ry: 0.26, color: "#2a4f9a", amount: interpolate(f, [0, 6, 12, 21, 30], [0.05, 0.28, 0.25, 0.12, 0]) });

      /* star bloom */
      const sh = STAR_HALO(f);
      star.scale.setScalar(sh / 100);
      star.position.set(0, fy(STAR_Y(f)), 1);
      starU.uCore!.value = interpolate(f, [0, 3, 8], [0.1, 0.07, 0.03]);
      starU.uHalo!.value = interpolate(f, [0, 3, 8], [1.0, 1.6, 1.0]);
      starU.uOpacity!.value = interpolate(f, [0, 4, 11], [1, 1, 0]);
      star.visible = f < 12;

      /* text */
      const tIn = interpolate(f, [3, 10], [0, 1], Easing.easeOut);
      const tint = new THREE.Color("#86adff").lerp(new THREE.Color("#f6f8fc"), interpolate(f, [6, 21], [0, 1]));
      setLabel(text, { opacity: tIn, blur: TEXT_BLUR(f) / Math.max(1, z * 0.6), color: tint });
      setLabel(halo, { opacity: interpolate(f, [3, 8, 18, 70, 80], [0, 1.1, 0.5, 0.5, 0.9]), color: tint, blur: 28 + TEXT_BLUR(f) * 0.5 });

      /* lattice + dust */
      stars.forEach(({ dot, delay }) => {
        dot.material.uniforms.uOpacity!.value = interpolate(f, [-2 + delay * 0.3, 4 + delay * 0.3], [0, 1]) * (0.85 + 0.15 * Math.sin(time * 2 + delay));
      });
      const dustOp = interpolate(f, [0, 3, 6], [0.5, 0.25, 0]);
      dust.forEach((d) => {
        d.material.uniforms.uOpacity!.value = dustOp;
        d.visible = dustOp > 0;
      });

      /* streaks */
      lines.forEach((l, i) => {
        const h = l.head(f);
        l.s.material.uniforms.uHead!.value = h;
        l.s.visible = h > 0;
        const p = l.s.pointAt(h);
        heads[i]!.position.set(p.x, p.y, 0);
        heads[i]!.material.uniforms.uOpacity!.value = h > 0 && h < 1 ? 1 : 0;
        const lit = h >= l.node ? interpolate(h - l.node, [0, 0.05], [0, 1]) : 0;
        nodes[i]!.material.uniforms.uOpacity!.value = lit * (0.9 + 0.1 * Math.sin(time * 3 + i));
      });
    };
  });
}
