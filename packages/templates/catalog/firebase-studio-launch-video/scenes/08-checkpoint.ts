/**
 * 08 — "Prototype to production … in One Click" (film frames 836–950, 24 fps)
 * The line types in, its words turn into pills, the pipeline steps slide out
 * from behind "Production", collapse, and "Export" becomes the One Click pill
 * that the camera then pushes into, framed by hairlines that start to turn.
 * Every pill box is measured per frame (components/pillData.ts).
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { pixelStage, sx, sy } from "../components/stage";
import { withBrandFonts, C } from "../components/brand";
import { label, setLabel, type TypeStyle, type Label } from "../components/type";
import { inkPlacer } from "../components/place";
import { rrect, type RRect } from "../components/rect";
import { canvasTexture, texPlane } from "../components/ui";
import { PILLS } from "../components/pillData";
import { sampled, clamp01 } from "../components/ease";

const START = 836;
const PURPLE = C.red; // brand colour (name kept from the template)
const WHITE_T: TypeStyle = { size: 129, weight: 500, tracking: -0.025, color: "#ffffff", embolden: 0.8 };
const PILL_T: TypeStyle = { size: 129, weight: 500, tracking: -0.02, color: PURPLE };
const TEXT_RATIO = 0.432; // filled pill text size / pill height (measured)
const TEXT_RATIO_OUTLINE = 0.419; // outlined pill text size / pill height (measured)

function solid(w: number, h: number, color: string, name: string, order: number) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
  );
  m.name = name;
  m.renderOrder = order;
  return m;
}

/** Split a key list into contiguous segments (gaps > 3 frames mean the item is off screen). */
function tracks(keys: number[][]) {
  const segs: number[][][] = [];
  for (const k of keys) {
    const last = segs[segs.length - 1];
    if (last && k[0]! - last[last.length - 1]![0]! <= 3) last.push(k);
    else segs.push([k]);
  }
  return segs.map((s) => ({
    from: s[0]![0]!,
    to: s[s.length - 1]![0]!,
    at: [1, 2, 3, 4].map((j) => sampled(s.map((k) => [k[0]!, k[j]!] as [number, number]))),
  }));
}

interface Pill {
  name: string;
  bg: RRect;
  text: Label | null;
  icon: THREE.Mesh | null;
  segs: ReturnType<typeof tracks>;
  kind: "fill" | "outline" | "arrow";
  textW: number;
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withBrandFonts(ctx, () => {
    const { scene } = ctx;
    pixelStage(ctx, C.flood);

    // ---- the typed line (836–852)
    const cp = label("Prototype", WHITE_T, "left");
    cp.name = "word-checkpoint";
    const to = label("to", WHITE_T, "left");
    to.name = "word-to";
    const prod = label("production", WHITE_T, "left");
    prod.name = "word-production";
    for (const m of [cp, to, prod]) { m.renderOrder = 10; scene.add(m); }
    // "Checkpoint" -> "Prototype": the rest of the line slides left by the width saved, and the line re-centres
    const dCp = inkPlacer("Checkpoint", WHITE_T).width - inkPlacer("Prototype", WHITE_T).width;
    const pCp = inkPlacer("Prototype", WHITE_T), pTo = inkPlacer("to", WHITE_T), pProd = inkPlacer("production", WHITE_T);
    const cpTop = sampled([[837, 530], [838, 517], [839, 510], [840, 505], [841, 501], [842, 498], [843, 496], [844, 495], [846, 496]]);
    const toTop = sampled([[839, 540], [840, 527], [841, 519], [842, 514], [843, 510], [844, 508], [845, 506], [846, 504], [847, 503]]);
    const toX = sampled([[839, 928], [848, 929], [849, 952], [850, 970]]);
    const prodTop = sampled([[841, 532], [842, 519], [843, 511], [844, 506], [845, 502], [846, 500], [847, 498], [848, 497]]);
    const prodX = sampled([[841, 1069], [847, 1071], [848, 1078], [849, 1112], [850, 1164], [851, 1200], [852, 1245]]);

    // ---- pills
    const arrowTex = canvasTexture(100, 100, (g) => {
      g.strokeStyle = PURPLE;
      g.lineWidth = 7.5;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.beginPath();
      g.moveTo(26, 50); g.lineTo(74, 50);
      g.moveTo(53, 29); g.lineTo(74, 50); g.lineTo(53, 71);
      g.stroke();
    });
    const defs: [string, string | null, Pill["kind"]][] = [
      ["checkpoint", "Prototype", "fill"],
      ["arrow1", null, "arrow"],
      ["export", "Build", "outline"],
      ["convert", "Test", "outline"],
      ["validate", "Secure", "outline"],
      ["handoff", "Deploy", "outline"],
      ["arrow2", null, "arrow"],
      ["production", "Production", "fill"],
      ["oneclick", "One Click", "fill"],
    ];
    const pills: Pill[] = defs.map(([name, text, kind]) => {
      const bg = rrect(`${name}-pill`, 100, 100, 20, "#ffffff", kind === "outline" ? 0 : 1);
      if (kind === "outline") bg.set({ stroke: "#ffffff", strokeA: 0.9, strokeW: 2.6 });
      bg.renderOrder = 20;
      scene.add(bg);
      let t: Label | null = null;
      let tw = 0;
      if (text) {
        t = label(text, { ...PILL_T, color: kind === "outline" ? "#ffffff" : PURPLE }, "center");
        t.name = `${name}-label`;
        t.renderOrder = 21;
        scene.add(t);
        tw = t.userData.w as number;
      }
      let icon: THREE.Mesh | null = null;
      if (kind === "arrow") {
        icon = texPlane(100, 100, arrowTex, `${name}-icon`);
        icon.renderOrder = 21;
        scene.add(icon);
      }
      // the pipeline steps slide out from behind Production, so it draws on top
      if (name === "production") { bg.renderOrder = 30; if (t) t.renderOrder = 31; }
      return { name, bg, text: t, icon, segs: tracks(PILLS[name]!), kind, textW: tw };
    });
    const byName = (n: string) => pills.find((p) => p.name === n)!;
    const oneclick = byName("oneclick");
    const ocWhite = new THREE.Color("#ffffff"), ocPurple = new THREE.Color(PURPLE), tmp = new THREE.Color();

    // "in" above the pipeline (899–921)
    const inWord = label("in", WHITE_T, "left");
    inWord.name = "word-in";
    inWord.renderOrder = 22;
    scene.add(inWord);
    const pIn = inkPlacer("in", WHITE_T);
    const inTop = sampled([[899, 406], [900, 388], [901, 378], [902, 370], [903, 365], [904, 361], [905, 359], [906, 357], [907, 355], [908, 354], [910, 353]]);

    // ---- the push-in frame (923–950)
    const halo = rrect("one-click-halo", 100, 100, 40, "#ffffff", 0.065);
    halo.renderOrder = 19;
    scene.add(halo);
    const frameGroup = new THREE.Group();
    frameGroup.name = "frame-lines";
    scene.add(frameGroup);
    const hairs = ["top", "bottom", "left", "right"].map((n) => {
      const m = solid(1, 1, "#ffffff", `frame-${n}`, 5);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.32;
      frameGroup.add(m);
      return m;
    });
    const spokes = ["left", "right", "top", "bottom"].map((n) => {
      const line = solid(1, 1, "#ffffff", `spoke-${n}`, 6);
      (line.material as THREE.MeshBasicMaterial).opacity = 0.7;
      const dot = solid(13, 13, "#ffffff", `spoke-${n}-dot`, 7);
      frameGroup.add(line, dot);
      return { line, dot };
    });
    const spokeL = sampled([[923, 319], [924, 366], [925, 401], [926, 429], [927, 451], [928, 469], [929, 483], [930, 496], [931, 506], [932, 515], [933, 523], [934, 530], [935, 535], [936, 540], [937, 545], [938, 548], [939, 551], [940, 554], [941, 556], [942, 557], [943, 560]]);
    const spokeT = sampled([[923, 156], [924, 174], [925, 188], [926, 198], [927, 206], [928, 213], [929, 219], [930, 223], [931, 227], [932, 231], [933, 234], [934, 236], [935, 238], [936, 240], [937, 242], [938, 243], [939, 244], [940, 245], [941, 246], [942, 247], [943, 248]]);
    const frameX = sampled([[923, 459], [925, 536], [927, 574], [930, 605], [933, 619], [936, 625], [943, 625]]);
    const frameY = sampled([[923, 251], [925, 292], [927, 313], [930, 329], [933, 337], [936, 340], [943, 340]]);
    const spin = sampled([[943, 0], [944, 0.9], [945, 1.6], [946, 2.4], [947, 3.7], [948, 5.8], [949, 9.2], [950, 13.5]]);
    const shrink = sampled([[948, 1], [949, 0.95], [950, 0.87]]);

    return ({ frame: local }) => {
      const F = local + START;

      // ---- typed line
      cp.visible = F >= 837 && F < 847;
      if (cp.visible) pCp.at(cp, 280 + dCp / 2, cpTop(F));
      to.visible = F >= 839 && F < 851;
      if (to.visible) pTo.at(to, toX(F) - dCp / 2, toTop(F));
      prod.visible = F >= 841 && F < 853;
      if (prod.visible) pProd.at(prod, prodX(F) - dCp / 2, prodTop(F));

      // ---- pills
      for (const p of pills) {
        const seg = p.segs.find((s) => F >= s.from && F <= s.to);
        const on = !!seg;
        p.bg.visible = on;
        if (p.text) p.text.visible = on;
        if (p.icon) p.icon.visible = on;
        if (!seg) continue;
        const [x, y, w, h] = seg.at.map((fn) => fn(F)) as [number, number, number, number];
        const cx = x + w / 2, cy = y + h / 2;
        p.bg.set({ w, h, r: h * 0.24 });
        p.bg.position.set(sx(cx), sy(cy), 0);
        if (p.text) {
          const k = (h * (p.kind === "outline" ? TEXT_RATIO_OUTLINE : TEXT_RATIO)) / PILL_T.size;
          // never let the label spill out of a pill that is still emerging or collapsing
          const fit = Math.min(k, (w * 0.86) / Math.max(p.textW, 1));
          p.text.scale.setScalar(fit);
          p.text.position.set(sx(cx), sy(cy) + h * 0.01, 0);
        }
        if (p.icon) {
          p.icon.scale.setScalar(h / 100);
          p.icon.position.set(sx(cx), sy(cy), 0);
        }
      }
      // One Click: white -> transparent outline (917–920) -> white again from the push-in
      if (oneclick.bg.visible) {
        let fillA = 1;
        if (F >= 917 && F < 923) fillA = clamp01(1 - (F - 916) / 3.9);
        oneclick.bg.set({ fillA, stroke: "#ffffff", strokeA: F >= 917 && F < 923 ? 0.9 : 0, strokeW: 2.4 });
        tmp.copy(ocWhite).lerp(ocPurple, fillA);
        if (oneclick.text) setLabel(oneclick.text, { color: tmp });
      }
      // the Export pill hands its place to One Click at 900
      inWord.visible = F >= 899 && F <= 921;
      if (inWord.visible) pIn.at(inWord, 952, inTop(F));

      // ---- push-in frame
      const push = F >= 923;
      halo.visible = push;
      frameGroup.visible = push;
      if (push) {
        const seg = oneclick.segs.find((sg) => F >= sg.from && F <= sg.to) ?? oneclick.segs[oneclick.segs.length - 1]!;
        const [x, y, w, h] = seg.at.map((fn) => fn(Math.min(F, seg.to))) as [number, number, number, number];
        halo.set({ w: w + 64, h: h + 64, r: h * 0.24 + 32 });
        halo.position.set(sx(x + w / 2), sy(y + h / 2), 0);
        const fx = frameX(F), fy = frameY(F);
        const [top, bottom, left, right] = hairs as unknown as [THREE.Mesh, THREE.Mesh, THREE.Mesh, THREE.Mesh];
        top.scale.set(3000, 1, 1); top.position.set(0, sy(fy), 0);
        bottom.scale.set(3000, 1, 1); bottom.position.set(0, sy(1080 - fy), 0);
        left.scale.set(1, 3000, 1); left.position.set(sx(fx), 0, 0);
        right.scale.set(1, 3000, 1); right.position.set(sx(1920 - fx), 0, 0);
        const L = spokeL(F), T = spokeT(F);
        const [sl, sr, st, sb] = spokes as { line: THREE.Mesh; dot: THREE.Mesh }[];
        sl!.line.scale.set(L + 600, 1.5, 1); sl!.line.position.set(sx((L - 600) / 2), 0, 0); sl!.dot.position.set(sx(L - 6.5), 0, 0);
        sr!.line.scale.set(L + 600, 1.5, 1); sr!.line.position.set(sx(1920 - (L - 600) / 2), 0, 0); sr!.dot.position.set(sx(1920 - L + 6.5), 0, 0);
        st!.line.scale.set(1.5, T + 600, 1); st!.line.position.set(0, sy((T - 600) / 2), 0); st!.dot.position.set(0, sy(T - 6.5), 0);
        sb!.line.scale.set(1.5, T + 600, 1); sb!.line.position.set(0, sy(1080 - (T - 600) / 2), 0); sb!.dot.position.set(0, sy(1080 - T + 6.5), 0);
        frameGroup.rotation.z = -THREE.MathUtils.degToRad(spin(F));
        frameGroup.scale.setScalar(shrink(F));
      }
    };
  });
}
