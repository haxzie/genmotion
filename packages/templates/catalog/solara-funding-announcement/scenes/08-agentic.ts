import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C, F } from "../components/brand";
import { at, clipTo, measure, opacity, rect, sizeForInk, solaraMark, stage, text, tint, withFonts, wx, wy } from "../components/kit";
import type { TStyle } from "../components/kit";

/** Global frames 466–551: "The agentic control plane for enterprises" rises word by word, seen close, then whole. */
const START = 466;
const STATIC: number | null = null;
const ZOOM_OUT_FROM = 476; // the close-up starts pulling back here (the reference hard-cuts at 483)
const ZOOM_OUT_LEN = 16; // frames for the pull-back to land on the full line
const CARD = [44, 50, 1876, 1030] as const;

const easeOutQuart = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 4);
const easeInOutCubic = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    stage(ctx, C.beige);
    const { scene } = ctx;
    const card = rect("agentic-panel", ...CARD, C.navy, 28);
    card.userData.pickable = false;
    scene.add(card);

    const base: TStyle = { font: F.poppins, weight: 400, size: 100, color: C.white };
    const size = sizeForInk("The agentic control plane", base, 1048);
    const st = { ...base, size };
    const l1Base = 484 + measure("The agentic control plane", st).ascent;
    const l2Base = 582 + measure("for enterprises", st).ascent;
    const sp = measure(" ", st).adv;

    // Words laid out on two centred lines (ink boxes measured on the reference).
    const words: { w: string; x: number; y: number }[] = [];
    const lay = (line: string, left: number, y: number) => {
      let x = left;
      for (const w of line.split(" ")) {
        words.push({ w, x, y });
        x += measure(w, st).adv + sp;
      }
    };
    lay("The agentic control plane", 438, l1Base);
    lay("for enterprises", 666, l2Base);

    const group = new THREE.Group();
    group.name = "tagline";
    const meshes = words.map(({ w }) => {
      const m = text(`tagline-${w}`, w, st, "left", 4);
      clipTo(m, ...CARD, 28);
      group.add(m);
      return m;
    });

    const mark = solaraMark("tagline-mark", 38, "white");
    mark.position.set(wx(895), wy(410), 0);
    const lab = { font: F.poppins, weight: 500, size: 100, color: C.white };
    const sol = text("tagline-solara", "Solara", { ...lab, size: sizeForInk("Solara", lab, 102) }, "left", 4);
    at(sol, 922, 422);
    group.add(mark, sol);
    scene.add(group);

    // Close-up framing: "agentic" fills 772 px of the frame with its ink-left at x = 318.
    const agentic = words[1];
    const Z = 772 / measure("agentic", st).ink;
    const cx = agentic.x - (318 - 960) / Z;
    const cy = agentic.y - (585 - 540) / Z;
    const grey = new THREE.Color(C.agenticGrey);
    const white = new THREE.Color(C.white);
    const col = new THREE.Color();

    return ({ frame }) => {
      const g = STATIC ?? frame + START;
      // Zoom out from the close-up to the full line instead of cutting: scale eases in log space
      // (so the pull reads at a constant rate), while the framed point glides to the frame centre.
      const z = easeInOutCubic((g - ZOOM_OUT_FROM) / ZOOM_OUT_LEN);
      const s = Math.pow(Z, 1 - z);
      const fx = cx + (960 - cx) * z;
      const fy = cy + (540 - cy) * z;
      group.scale.setScalar(s);
      group.position.set(-wx(fx) * s, -wy(fy) * s, 0);
      // the Solara mark settles in as the pull lands
      const markIn = Math.min(1, Math.max(0, (g - (ZOOM_OUT_FROM + ZOOM_OUT_LEN - 6)) / 8));
      mark.visible = sol.visible = markIn > 0;
      opacity(mark, markIn);
      opacity(sol, markIn);
      meshes.forEach((m, i) => {
        const s = 466 + 2.2 * i;
        const p = easeOutQuart((g - s) / 16);
        const { x, y } = words[i];
        // local (unscaled) placement: text meshes are positioned in world px, the group applies the zoom
        m.position.set(wx(x + m.userData.inkL), wy(y + (1 - p) * 200), 0);
        m.visible = g >= s;
        col.copy(grey).lerp(white, easeOutQuart((g - s - 3) / 20));
        tint(m, col);
      });
      // clip windows are world-space; keep them on the card whatever the zoom
      meshes.forEach((m) => clipTo(m, ...CARD, 28));
    };
  });
}
