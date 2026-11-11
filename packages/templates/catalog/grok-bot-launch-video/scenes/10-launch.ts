import * as THREE from "three";
import { withFonts, track, Easing, interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import lato400 from "../assets/Lato-400.woff2";
import lato700 from "../assets/Lato-700.woff2";
import adAUrl from "../assets/ads/ad-a-blue.png";
import adBUrl from "../assets/ads/ad-b-curly.png";
import adCUrl from "../assets/ads/ad-c-woman.png";
import pivotUrl from "../assets/collage/render-pivot.png";
import cupsUrl from "../assets/collage/render-cups.png";
import bandUrl from "../assets/collage/render-band.png";
import adEUrl from "../assets/collage/ad-e-red.png";
import { C } from "../components/brand";
import { drawBot } from "../components/bots";
import { drawAppIcon } from "../components/chat";
import { mediaTile } from "../components/tile";
import { EMOJI, canvasMesh, fillRR, keys, layer, measure, place, setupStage, text } from "../components/stage";
import { handCursor } from "../components/ui";

/**
 * 1:02.13–1:08.13 (reference frames 1864–2044). Local 0 = ref 1864.
 *  1864–1903 Launch Bot: "The new headphones campaign is live 🚀"
 *  1904–1965 a fly-past over the campaign's ads and renders
 *  1966–2029 the red ad lands; reactions climb; a hand keeps clicking ❤ and
 *            the who-reacted tooltip grows ("…Deck Bot and 50 others")
 *  2030–2043 push into the tooltip's heart, which turns away
 */
const REF0 = 1864;
const LATO = '"Lato", -apple-system, "Helvetica Neue", Arial, sans-serif';

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: "Lato", url: lato400, weight: "400" }, { family: "Lato", url: lato700, weight: "700" }], () => {
    const { scene, view } = setupStage(ctx, C.white);
    const loader = new THREE.TextureLoader(ctx.manager);
    const tex = (url: string) => {
      const t = loader.load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };

    // ------------------------------------------------ launch message
    const msg = canvasMesh("launch-bot-the-new-headphones-campaign-is-live", 820, 124, (g) => {
      drawAppIcon(g, 0, 4, 92, "#7d3fe6", "#e2c8fb", "#8b55ea");
      text(g, "Launch Bot", 113, 31, { size: 37, weight: 700, family: LATO, color: "#1d1c1d" });
      const nw = measure("Launch Bot", { size: 37, weight: 700, family: LATO });
      fillRR(g, 113 + nw + 21, 12, 64, 38, 6, "#ebebeb");
      text(g, "APP", 113 + nw + 53, 31, { size: 23, weight: 700, family: LATO, color: "#616061", align: "center" });
      text(g, "10:06 AM", 113 + nw + 106, 31, { size: 32, family: LATO, color: "#616061" });
      text(g, "The new headphones campaign is live", 113, 88, { size: 37, family: LATO, color: "#1d1c1d" });
      const bw = measure("The new headphones campaign is live ", { size: 37, family: LATO });
      g.font = `34px ${EMOJI}`; g.textBaseline = "middle"; g.fillText("🚀", 113 + bw, 88);
    });
    msg.geometry.translate(410, -62, 0);
    layer(msg, 10);
    scene.add(msg);

    // ------------------------------------------------ collage wall
    const T = {
      a: tex(adAUrl), b: tex(adBUrl), c: tex(adCUrl),
      pivot: tex(pivotUrl), cups: tex(cupsUrl), band: tex(bandUrl), e: tex(adEUrl),
    };
    // rects at ref 1910 (x, y, w, h), texture, aspect
    const WALL: [string, THREE.Texture, number, [number, number, number, number]][] = [
      ["ad-blue", T.a, 328 / 413, [-100, -120, 371, 609]],
      ["render-pivot", T.pivot, 295 / 371, [273, -10, 184, 371]],
      ["ad-curly", T.b, 389 / 393, [365, 61, 672, 700]],
      ["render-band", T.band, 217 / 126, [100, 589, 265, 160]],
      ["ad-woman", T.c, 332 / 412, [1198, 22, 320, 599]],
      ["render-cups", T.cups, 358 / 230, [1090, -250, 358, 230]],
      ["ad-woman-large", T.c, 332 / 412, [700, 760, 606, 480]],
      ["ad-curly-portrait", T.b, 389 / 393, [-40, 760, 330, 700]],
    ];
    const wall = WALL.map(([name, t, asp, r]) => {
      const m = mediaTile(`collage-${name}`, t, asp);
      m.u.uRadius.value = 1;
      layer(m.mesh, 5);
      scene.add(m.mesh);
      return { m, r };
    });
    layer(wall[2].m.mesh, 6);
    layer(wall[1].m.mesh, 7);

    // ------------------------------------------------ the red ad + reactions
    const E = mediaTile("ad-red-a-lighter-fit-for-longer-days", T.e, 908 / 559);
    E.u.uRadius.value = 1;
    layer(E.mesh, 8);
    scene.add(E.mesh);
    const E2 = mediaTile("ad-red-previous", T.e, 908 / 559);
    E2.u.uRadius.value = 1;
    layer(E2.mesh, 8);
    scene.add(E2.mesh);

    const bar = new THREE.Group();
    bar.name = "reactions";
    const PILLS: { k: string; emoji: string; x: number; w: number; vals: [number, number][] }[] = [
      { k: "rocket", emoji: "🚀", x: 36, w: 147, vals: [[1966, 12], [1968, 13], [1972, 14], [1975, 15], [1980, 16], [1984, 17], [1992, 18], [1996, 19], [2000, 20], [2004, 21], [2008, 22]] },
      { k: "headphones", emoji: "🎧", x: 221, w: 148, vals: [[1966, 17], [1975, 18], [2004, 19]] },
      { k: "heart", emoji: "", x: 393, w: 153, vals: [[1966, 42], [1968, 43], [1975, 44], [1988, 45], [1996, 46], [2008, 47], [2016, 48], [2020, 50], [2024, 51]] },
      { k: "hundred", emoji: "💯", x: 567, w: 150, vals: [[1966, 18], [1972, 19]] },
      { k: "goat", emoji: "🐐", x: 757, w: 150, vals: [[1966, 18], [1988, 19], [2004, 20], [2024, 21]] },
    ];
    const H = 71;
    const pillMeshes = PILLS.map((p) => {
      const set = new Map<number, THREE.Mesh>();
      for (const [, v] of p.vals) {
        if (set.has(v)) continue;
        const hl = p.k === "heart";
        const m = canvasMesh(`reaction-${p.k}-${v}`, p.w, H, (g) => {
          fillRR(g, 0, 0, p.w, H, H / 2, hl ? "#e3eefb" : "#f6f6f6", { blur: 10, y: 3, color: "rgba(0,0,0,0.08)" });
          if (hl) { g.strokeStyle = "#2f74d0"; g.lineWidth = 3; g.beginPath(); g.roundRect(1.5, 1.5, p.w - 3, H - 3, H / 2 - 1.5); g.stroke(); }
          if (hl) drawBot(g, "red", 40, H / 2 + 1, 40, { eyes: { rot: -0.2, w: 0.11, h: 0.24 } });
          else { g.font = `32px ${EMOJI}`; g.textBaseline = "middle"; g.fillText(p.emoji, 22, H / 2 + 2); }
          text(g, String(v), 74, H / 2 + 1, { size: 33, family: LATO, color: hl ? "#1e64c8" : "#55555a", weight: hl ? 700 : 400 });
        }, { pad: 8 });
        m.geometry.translate(p.w / 2, 0, 0);
        bar.add(m);
        set.set(v, m);
      }
      return set;
    });
    layer(bar, 9);
    scene.add(bar);

    // ------------------------------------------------ tooltip (three versions)
    const tip = (name: string, lines: [string, boolean][], w: number) => {
      const lh = 50;
      const h = 33 + 141 + 30 + lines.length * lh + 20;
      const m = canvasMesh(name, w, h + 20, (g) => {
        fillRR(g, 0, 0, w, h, 40, "#ffffff", { blur: 24, y: 8, color: "rgba(0,0,0,0.14)" });
        g.beginPath(); g.moveTo(w / 2 - 24, h - 1); g.lineTo(w / 2, h + 18); g.lineTo(w / 2 + 24, h - 1); g.closePath(); g.fillStyle = "#fff"; g.fill();
        fillRR(g, w / 2 - 70, 33, 140, 141, 22, "#fde6eb");
        drawBot(g, "red", w / 2, 33 + 70, 108, { eyes: { rot: -0.3, w: 0.1, h: 0.22, dx: 0.06 } });
        lines.forEach(([s, strong], i) =>
          text(g, s, w / 2, 33 + 141 + 40 + i * lh, { size: 37, weight: strong ? 700 : 400, family: LATO, color: strong ? "#1d1c1d" : "#616061", align: "center" }),
        );
      }, { pad: 30, res: 3 });
      m.geometry.translate(0, h / 2 + 8, 0); // origin = arrow tip
      return m;
    };
    const tips: { from: number; m: THREE.Mesh }[] = [
      { from: 1986, m: tip("tooltip-you-launch-bot-and-43-others", [["You, Launch Bot and 43 others", true], ["reacted with :grok-bot-heart:", false]], 600) },
      { from: 1996, m: tip("tooltip-you-launch-bot-copy-bot-and-43-others", [["You, Launch Bot, Copy Bot,", true], ["and 43 others reacted with", true], [":grok-bot-heart:", false]], 620) },
      ...[[2008, 44], [2012, 45], [2016, 46], [2020, 47], [2024, 49], [2032, 50]].map(([from, n]) => ({
        from,
        m: tip(`tooltip-and-${n}-others`, [["You, Launch Bot, Research Bot,", true], [`Copy Bot, Deck Bot and ${n} others`, true], ["reacted with :grok-bot-heart:", false]], 720),
      })),
    ];
    const tipLayer = new THREE.Group();
    tipLayer.name = "who-reacted";
    tips.forEach((t) => tipLayer.add(t.m));
    layer(tipLayer, 20);
    scene.add(tipLayer);
    // the heart inside the tooltip, turning away during the push-in
    const blob = canvasMesh("tooltip-heart-turning", 120, 120, (g) => drawBot(g, "red", 60, 60, 112, { eyes: false }));
    const blobLayer = new THREE.Group();
    blobLayer.add(blob);
    layer(blobLayer, 21);
    scene.add(blobLayer);

    const hand = handCursor(ctx.manager, "hand-cursor", 86);
    const handLayer = new THREE.Group();
    handLayer.add(hand);
    layer(handLayer, 30);
    scene.add(handLayer);

    // ------------------------------------------------ timing
    const msgX = track([[1864, 403], [1880, 247], [1903, 200]]);
    const panX = track([[1904, 40], [1910, 0], [1950, -240], [1966, -1240]]);
    const panY = track([[1904, 8], [1910, 0], [1950, -40], [1966, -60]]);
    const ex = track([[1950, 1300], [1962, 330], [1968, 285], [1975, 271], [2010, 186], [2044, 150]]);
    const clicks = [1988, 1996, 2008, 2016, 2020, 2024];
    const cam = track([[2028, 0], [2036, 1], [2043, 2]]);

    return ({ frame: f, time }) => {
      const ref = f + REF0;
      const sMsg = ref < 1904, sWall = ref >= 1904 && ref < 1968, sAd = ref >= 1950;
      msg.visible = sMsg;
      msg.position.set(msgX(ref) - 640, 360 - 300, 0);

      wall.forEach(({ m, r }) => {
        m.mesh.visible = sWall;
        m.rect(r[0] + panX(ref), r[1] + panY(ref), r[2], r[3]);
      });
      const exv = ex(ref);
      E.mesh.visible = E2.mesh.visible = sAd;
      E.rect(exv, 0, 908, 559);
      E2.rect(exv - 1118, 0, 908, 559);

      bar.visible = ref >= 1966;
      PILLS.forEach((p, i) => {
        let cur = p.vals[0][1];
        for (const [fr, v] of p.vals) if (ref >= fr) cur = v;
        const isClick = p.k === "heart" && clicks.some((c) => ref >= c && ref < c + 3);
        pillMeshes[i].forEach((m, v) => {
          m.visible = v === cur;
          place(m, exv + p.x, 620);
          m.scale.setScalar(isClick ? 0.95 : 1);
        });
      });

      // hand
      const handIn = interpolate(ref, [1976, 1986], [0, 1], Easing.easeOut);
      handLayer.visible = ref >= 1976 && ref < 2030;
      const hx = exv + 393 + 70, hy = 650;
      const press = clicks.some((c) => ref >= c && ref < c + 3) ? 1 : 0;
      place(hand, hx + (1 - handIn) * 120, hy + (1 - handIn) * 140);
      hand.scale.setScalar(1 - press * 0.1);

      // tooltip
      let active = -1;
      tips.forEach((t, i) => { if (ref >= t.from) active = i; });
      const pop = interpolate(ref, [1986, 1990, 1993], [0.7, 1.04, 1], Easing.easeOut);
      tips.forEach((t, i) => {
        t.m.visible = i === active && ref < 2044;
        place(t.m, exv + 393 + 76, 538);
        t.m.scale.setScalar(pop);
      });
      // camera push into the heart icon
      const iconX = exv + 393 + 76, iconY = 538 - 18 - (33 + 141 + 30 + 3 * 50 + 20) + 33 + 70;
      const k = cam(ref);
      const z = k <= 1 ? 1 + k * 0.5 : 1.5 + (k - 1) * 2.1;
      const cy = 360 + (iconY + 73 - 360) * Math.min(1, k) + (k > 1 ? (k - 1) * -57 : 0);
      view(640 + (iconX - 640) * Math.min(1, k), cy, z);
      const turning = ref >= 2038;
      blobLayer.visible = turning && ref < 2044;
      place(blob, iconX, iconY);
      blob.scale.set(1 - (ref - 2038) * 0.03, 1, 1);
      void time;
    };
  });
}
