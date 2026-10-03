/**
 * 01 — Hook (film frames 0–99, 24 fps)
 * "You want an app" -> "that's" -> Faster / Smarter / Safer, all under one
 * sweeping Firebase-warm light. Motion is measured off the reference film.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { pixelStage, sy } from "../components/stage";
import { withBrandFonts, C } from "../components/brand";
import { letters, label, setLabel, measure, type TypeStyle } from "../components/type";
import { glowLayer, glowAt } from "../components/glow";
import { GLOW_KEYS } from "../components/glowKeys";
import { canvasTexture, texPlane, rrPath, drawIcon, setOpacity } from "../components/ui";
import { prog, outCubic, outQuart, inQuad, sampled, clamp01, lerp } from "../components/ease";

const HERO: TypeStyle = { size: 126, weight: 500, tracking: -0.022 };
const BIG: TypeStyle = { size: 159, weight: 500, tracking: -0.025 };
const INK = C.ink;

/** The white icon tile with its translucent halo (outer 220 px, inner 178 px). */
function iconTile(icon: string, name: string) {
  const group = new THREE.Group();
  group.name = name;
  const OUT = 220, IN = 178;
  const halo = texPlane(OUT + 4, OUT + 4, canvasTexture(OUT + 4, OUT + 4, (g) => {
    g.beginPath(); rrPath(g, 2, 2, OUT, OUT, 62); g.fillStyle = "#ffffff"; g.fill();
  }), `${name}-halo`);
  halo.userData.baseOpacity = 0.16;
  const face = texPlane(IN + 4, IN + 4, canvasTexture(IN + 4, IN + 4, (g) => {
    g.beginPath(); rrPath(g, 2, 2, IN, IN, 46); g.fillStyle = "#ffffff"; g.fill();
  }), `${name}-face`);
  // icon sizes measured off the reference tiles: ~105 px glyphs, ~7 px strokes
  const size = icon === "zap" ? 108 : icon === "sparkles" ? 120 : 128;
  // icons in the flame colours: the core amber is too light on white, so they use red / orange
  const ink = icon === "zap" ? C.orange : icon === "sparkles" ? C.red : C.ink;
  const glyph = texPlane(160, 160, canvasTexture(160, 160, (g) => drawIcon(g, icon, 80 - size / 2, 80 - size / 2, size, ink, (7 * 24) / size)), `${name}-icon`);
  halo.renderOrder = 20; face.renderOrder = 21; glyph.renderOrder = 22;
  group.add(halo, face, glyph);
  return { group, face: face.material as THREE.MeshBasicMaterial };
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withBrandFonts(ctx, () => {
    const { scene } = ctx;
    pixelStage(ctx, "#000000");

    const glow = glowLayer();
    scene.add(glow.mesh);

    // "You want an app": per-letter blur reveal while the line settles from 1.33x to 1x
    const want = letters("You want an app", HERO);
    want.group.name = "you-want-an-app";
    want.group.position.y = sy(540);
    want.letters.forEach((m) => (m.renderOrder = 30));
    scene.add(want.group);

    // "that's": dark type in the full light
    const thats = label("that’s", { ...HERO, color: INK });
    thats.name = "thats";
    thats.renderOrder = 30;
    scene.add(thats);

    // Cheaper / Faster / Better, each a word + icon tile, centred as a pair
    const GAP = 58;
    const words = [
      { text: "Faster", icon: "zap", from: 46, to: 59 },
      { text: "Smarter", icon: "sparkles", from: 59, to: 75 },
      { text: "Safer", icon: "shield", from: 75, to: 100 },
    ].map((w) => {
      const group = new THREE.Group();
      group.name = `${w.text.toLowerCase()}-lockup`;
      const word = label(w.text, BIG, "left");
      word.renderOrder = 30;
      const tile = iconTile(w.icon, `${w.text.toLowerCase()}-tile`);
      const ww = measure(w.text, BIG);
      const total = ww + GAP + 220;
      word.position.x = -total / 2;
      tile.group.position.x = -total / 2 + ww + GAP + 110;
      group.add(word, tile.group);
      group.position.y = sy(540);
      scene.add(group);
      return { ...w, group, word, tile };
    });

    // measured: line scale (ink height / 92)
    const wantScale = sampled([[0, 1.36], [2, 1.27], [6, 1.135], [12, 1.065], [20, 1.02], [26, 1.0], [30, 1.0]]);
    const wipeX = sampled([[0, 260], [1, 330], [2, 430], [3, 600], [4, 770], [5, 935], [6, 1075], [7, 1195], [8, 1285], [9, 1360], [10, 1410], [11, 1470], [12, 1560], [13, 1700]]);
    // measured: "that's" ink-centre y
    const thatsY = sampled([[27, 500], [30, 518], [33, 529], [36, 537], [39, 543], [41, 550], [42, 556], [43, 565], [44, 579], [45, 599], [46, 630], [47, 680]]);

    const cheaperY = sampled([[46, 575], [47, 571], [48, 566], [49, 562], [50, 558], [52, 553], [55, 549], [58, 548]]);

    return ({ frame }) => {
      glowAt(glow, frame, GLOW_KEYS);

      // ---- You want an app (0–26)
      const showWant = frame < 27;
      want.group.visible = showWant;
      if (showWant) {
        want.group.scale.setScalar(wantScale(frame));
        // a soft left-to-right wipe whose leading edge (screen x) is measured per frame
        const edge = wipeX(frame);
        const sc = wantScale(frame);
        want.letters.forEach((m) => {
          const right = 960 + (m.position.x + m.userData.w) * sc;
          const p = clamp01((edge - right) / 110 + 0.5);
          setLabel(m, { opacity: p, blur: (1 - p) * 12 });
        });
      }

      // ---- that's (27–47)
      const tOn = frame >= 27 && frame < 48;
      thats.visible = tOn;
      if (tOn) {
        thats.position.y = sy(thatsY(frame));
        setLabel(thats, { opacity: 1 - prog(frame, 45, 2, inQuad), blur: prog(frame, 44, 3) * 8 });
      }

      // ---- Faster / Smarter / Safer
      for (const w of words) {
        const on = frame >= w.from && frame < w.to;
        w.group.visible = on;
        if (!on) continue;
        const local = frame - w.from;
        let a = 1;
        // the words hold still; only the tile pops in (0.89 -> 1 over 7f, measured)
        let tileS = lerp(0.89, 1, prog(frame, w.from, 7, outCubic));
        let y = 540;
        if (w.from === 46) {
          a = prog(frame, 45.5, 1.5, outCubic);
          tileS = lerp(0.92, 1, prog(frame, 46.5, 8, outCubic));
          y = cheaperY(frame);
        }
        if (w.from === 75) {
          a = 1 - prog(frame, 92.5, 5, inQuad);
          tileS *= 1 - 0.5 * prog(frame, 92.5, 5, inQuad);
        }
        w.group.position.y = sy(y);
        w.tile.group.scale.setScalar(tileS);
        setOpacity(w.tile.group, a);
        setLabel(w.word, { opacity: a, blur: (1 - a) * 6 });
        // the tile face flashes amber on the cut and settles to white over 3 frames
        const flash = w.from === 46 ? 0 : clamp01(1 - local / 2.5);
        w.tile.face.color.setRGB(1, lerp(1, 0.85, flash), lerp(1, 0.55, flash));
      }
    };
  });
}
