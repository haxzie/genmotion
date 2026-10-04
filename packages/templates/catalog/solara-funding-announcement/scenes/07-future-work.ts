import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { C, F } from "../components/brand";
import skyUrl from "../assets/sky-landscape.jpg";
import mfgUrl from "../assets/card-manufacturing.jpg";
import healthUrl from "../assets/card-healthcare.jpg";
import retailUrl from "../assets/card-retail.jpg";
import financeUrl from "../assets/card-finance.jpg";
import travelUrl from "../assets/card-travel.jpg";
import bpoUrl from "../assets/card-bpo.jpg";
import { at, clipTo, cover, image, keys, measure, rect, setBox, sizeForInk, stage, text, tint, withFonts } from "../components/kit";
import type { Panel, Picture, TStyle, Txt } from "../components/kit";

/** Global frames 265–465: "The future of work is on Solara", then the customer list scrolls beside it. */
const START = 265;
const STATIC: number | null = null;
const SPLIT_AT = 287; // the landscape card snaps right and the list appears

const CARD_FULL = [48, 54, 1872, 1026] as const;
const CARD_RIGHT = [675, 52, 1866, 1028] as const;

// Horizontal drift of the headline block before the split (Solara label ink-left, global frames).
const DRIFT: [number, number][] = [[265, 938], [267, 932], [269, 926], [271, 920], [273, 916], [275, 912], [277, 906], [279, 902], [281, 900], [283, 898], [285, 896], [286, 896]];
// Characters of "Solara" typed at the end of line 2.
const TYPED = (g: number) => (g < 270 ? 1 : g < 272 ? 2 : g < 273 ? 3 : g < 275 ? 4 : g < 280 ? 5 : 6);

// Active card's top edge per frame (global 287..465), measured, and the frames the highlight advances.
const ACTIVE_TOP = [
  65, 64, 63, 63, 63, 62, 61, 60, 60, 59, 58, 58, 57, 56, 56, 55, 54, 54, 53, 53, 52, 51, 50, 50, 49, 48, 47, 45, 45, 43, 39, 35, 29, 29, 20, 10, -5, -25, -25, -52, -85,
  202, 176, 176, 157, 142, 132, 123, 123, 117, 112, 107, 104, 104, 102, 100, 99, 99, 98, 97, 96, 94, 92, 92, 90, 87, 85, 81, 81, 76, 70, 64, 55, 55, 44, 29, 8,
  302, 302, 280, 263, 250, 241, 241, 233, 226, 221, 216, 216, 212, 209, 206, 203, 203, 201, 198, 197, 195, 195, 194, 193, 192, 191, 191, 189, 188, 185, 181, 181, 175, 167, 155, 137, 137, 107,
  389, 356, 333, 333, 317, 303, 293, 284, 284, 276, 269, 264, 259, 259, 255, 251, 248, 245, 245, 242, 240, 238, 236, 236, 235, 234, 233, 232, 231, 230, 229, 227, 225, 225, 223, 220, 217, 213, 213, 208, 203, 197, 191, 191, 183, 175,
  486, 476, 476, 465, 453, 439, 423, 423, 405, 385,
  680, 652, 652, 618, 574, 512, 452, 452,
];
const ADVANCE = [328, 364, 402, 448, 458];
const PITCH = 314;
const CARD_H = 271;
const LIST_X = [53, 635] as const;

const STATS: { n: string; lines: string[]; url: string }[] = [
  { n: "16", lines: ["Manufacturing", "Companies"], url: mfgUrl },
  { n: "12", lines: ["Healthcare &", "Pharmacy", "Organizations"], url: healthUrl },
  { n: "12", lines: ["Retailers"], url: retailUrl },
  { n: "10", lines: ["Financial", "Services Firms"], url: financeUrl },
  { n: "9", lines: ["Travel & Hospitality", "Companies"], url: travelUrl },
  { n: "8", lines: ["Business Process", "Outsourcers"], url: bpoUrl },
  { n: "16", lines: ["Manufacturing", "Companies"], url: mfgUrl },
];

interface Card {
  group: THREE.Group;
  base: Panel;
  border: Panel;
  photo: Picture;
  num: Txt;
  lead: Txt;
  lines: Txt[];
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    stage(ctx, C.beige);
    const { scene } = ctx;
    const page = rect("page", 0, 0, 1920, 1080, "#f4f6ec");
    page.userData.pickable = false;
    scene.add(page);

    /* ---------------- the stat list ---------------- */
    const NUM: TStyle = { font: F.inter, weight: 500, size: 100, color: C.blue, tracking: -0.03 };
    const numSize = (165 / measure("12", NUM).ascent) * 100;
    const LEAD: TStyle = { font: F.inter, weight: 600, size: 100, color: C.blue };
    const leadSize = 38; // ref: cap height ~27 px, 42 px line pitch
    const CAT: TStyle = { font: F.inter, weight: 400, size: leadSize, color: C.white };

    const list = new THREE.Group();
    list.name = "customer-list";
    const cards: Card[] = STATS.map((st, i) => {
      const group = new THREE.Group();
      group.name = `stat-card-${i + 1}`;
      const border = rect(`stat-card-${i + 1}-edge`, LIST_X[0] - 2, -2, LIST_X[1] + 2, CARD_H + 2, "#e4e6db", 24);
      const base = rect(`stat-card-${i + 1}-fill`, LIST_X[0], 0, LIST_X[1], CARD_H, "#f4f6ec", 22);
      const photo = image(ctx, `stat-card-${i + 1}-photo`, st.url, 1);
      photo.userData.panY = 0.62;
      photo.material.uniforms.uRadius.value = 22;
      photo.material.uniforms.uDim.value = 0;
      photo.material.uniforms.uColor.value.setRGB(1.35, 1.6, 1.25);
      const num = text(`stat-${st.n}`, st.n, { ...NUM, size: numSize }, "left", 4);
      const lead = text(`stat-${i + 1}-of-the-largest`, "of the largest", { ...LEAD, size: leadSize }, "left", 4);
      const lines = st.lines.map((l, j) => text(`stat-${i + 1}-line-${j + 1}`, l, CAT, "left", 4));
      group.add(border, base, photo, num, lead, ...lines);
      list.add(group);
      return { group, base, border, photo, num, lead, lines };
    });
    scene.add(list);
    const numAsc = measure("12", { ...NUM, size: numSize }).ascent;
    const leadAsc = measure("of the largest", { ...LEAD, size: leadSize }).ascent;

    /* ---------------- the landscape card ---------------- */
    const land = image(ctx, "landscape", skyUrl, 1);
    land.userData.panY = 0.48;
    land.material.uniforms.uRadius.value = 28;
    land.material.uniforms.uDim.value = 0.42;
    land.material.uniforms.uColor.value.set("#d6e2ea");
    scene.add(land);

    const W: TStyle = { font: F.poppins, weight: 500, size: 100, color: C.white };
    const solara = text("headline-solara", "Solara", { ...W, size: sizeForInk("Solara", W, 138) }, "left", 4);
    const lineSize = sizeForInk("work is on Solara", W, 726);
    const L2: TStyle = { ...W, size: lineSize };
    const SER: TStyle = { font: F.serif, weight: 400, size: lineSize * 1.12, color: C.white, italic: true };
    const the = text("headline-the", "The", L2, "left", 4);
    const future = text("headline-future", "future", SER, "left", 4);
    const of = text("headline-of", "of", L2, "left", 4);
    const work = text("headline-work-is-on", "work is on", L2, "left", 4);
    const brand = "Solara".split("").map((ch, i) => text(`headline-solara-${i}`, ch, L2, "left", 4));
    const head = new THREE.Group();
    head.name = "headline";
    head.add(solara, the, future, of, work, ...brand);
    scene.add(head);
    const textMeshes = [solara, the, future, of, work, ...brand];

    // Line layout relative to the block's left reference (Solara label ink-left = 0 at drift 938).
    const sp = measure(" ", L2).adv;
    const l1x = 726 - 938;
    const theW = measure("The", L2).adv;
    const futW = measure("future", SER).adv;
    const l1Base = 538 - 4; // line 1 baseline
    const l2Base = 623 - measure("work is on Solara", L2).descent;
    const l2x = 642 - 938;
    const workW = measure("work is on ", L2).adv;
    const brandX: number[] = [];
    {
      let acc = "";
      for (const ch of "Solara") {
        brandX.push(measure(acc, L2).adv);
        acc += ch;
      }
    }
    const solAsc = measure("Solara", { ...W, size: solara.userData.size }).ascent;

    return ({ frame }) => {
      const g = STATIC ?? frame + START;
      const split = g >= SPLIT_AT;
      page.visible = split;
      ctx.scene.background = new THREE.Color(split ? "#f4f6ec" : C.beige);

      const box = split ? CARD_RIGHT : CARD_FULL;
      setBox(land, ...box);
      cover(land);

      // headline block
      const ref = split ? 1216 : keys(g, DRIFT);
      at(solara, ref, 376 + solAsc);
      at(the, ref + l1x, l1Base);
      at(future, ref + l1x + theW + sp + future.userData.inkL, l1Base);
      at(of, ref + l1x + theW + sp + futW + sp + of.userData.inkL, l1Base);
      at(work, ref + l2x, l2Base);
      const n = split ? 6 : TYPED(g);
      brand.forEach((m, i) => {
        m.visible = i < n;
        at(m, ref + l2x + workW + brandX[i] + m.userData.inkL, l2Base);
      });
      for (const m of textMeshes) clipTo(m, ...box, 28);

      // list
      list.visible = split;
      if (!split) return;
      const i = Math.min(ACTIVE_TOP.length - 1, Math.max(0, g - SPLIT_AT));
      let k = 0;
      for (const a of ADVANCE) if (g >= a) k++;
      const listTop = ACTIVE_TOP[i] - PITCH * k;
      cards.forEach((c, j) => {
        const top = listTop + PITCH * j;
        c.group.visible = top < 1080 && top + CARD_H > 0;
        if (!c.group.visible) return;
        const active = j === k;
        setBox(c.border, LIST_X[0] - 2, top - 2, LIST_X[1] + 2, top + CARD_H + 2);
        setBox(c.base, LIST_X[0], top, LIST_X[1], top + CARD_H);
        c.photo.visible = active;
        setBox(c.photo, LIST_X[0], top, LIST_X[1], top + CARD_H);
        cover(c.photo);
        const numX = 100;
        at(c.num, numX, top + 57 + numAsc);
        const lx = c.num.userData.ink < 150 ? numX + c.num.userData.ink + 18 : 321;
        at(c.lead, lx, top + 68 + leadAsc);
        c.lines.forEach((m, li) => at(m, lx, top + 68 + leadAsc + 42 * (li + 1)));
        tint(c.num, active ? C.blue : "#cacbc4");
        tint(c.lead, active ? C.blue : "#d8dace");
        c.lines.forEach((m) => tint(m, active ? C.white : "#e2e4d9"));
      });
    };
  });
}
