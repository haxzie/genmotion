/**
 * 04 · "Meet 🔗" → "🔗 Payment Links" → whip into a streak — global frames 234–303
 * (Stripe remix: light studio, blurple glossy chain-link mark, same choreography)
 *
 * Opens on the bare chrome ∞ turning out of the coin's edge-on pose (scene 03's last
 * frame), over a dark grey studio: a faint 219px grid with diamond markers and a
 * diagonal beam of light from the bottom-right. "Meet" blurs in on its left. Then
 * "Meet" dims away, the ∞ slides left and "Infinite" un-blurs in beside it to form
 * the lockup. The studio fades to black, the lockup drifts in slowly, and at the
 * end it whips left and swells, smeared by real sub-frame motion blur, leaving a
 * white streak that scene 05 picks up.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { withFonts } from "../components/fonts";
import { makeText, measureText, type TextOpts } from "../components/type";
import { perspStage, seg, easeOutCubic, easeInOutCubic, easeInCubic, clamp01 } from "../components/stage";
import { studioEnvLight, linkGeometry } from "../components/linkmark";
import { C } from "../components/brand";
import { backdrop, drawDiamond, streakTexture } from "../components/fx";

const G0 = 234;
const MARK_W = 172; // px, the link mark across
const K = 28; // sub-frame samples for the whip's motion blur

/** Lockup pose: centre x, scale. Keys in global frames. */
const LOCK: [number, number, number][] = [
  [261, 0, 1.0],
  [294, 0, 1.06],
  [296, -20, 1.1],
  [297, -60, 1.2],
  [298, -290, 1.9],
  [299, -756, 2.4],
  [300, -981, 2.6],
  [302, -1422, 2.6],
  [303, -1700, 2.6],
];
function lockPose(G: number): [number, number] {
  if (G <= LOCK[0][0]) return [LOCK[0][1], LOCK[0][2]];
  let i = 0;
  while (i < LOCK.length - 2 && G > LOCK[i + 1][0]) i++;
  const a = LOCK[i], b = LOCK[i + 1];
  const u = clamp01((G - a[0]) / (b[0] - a[0]));
  const e = i === 0 ? easeInOutCubic(u) : u; // the whip runs at speed, the drift eases
  return [THREE.MathUtils.lerp(a[1], b[1], e), THREE.MathUtils.lerp(a[2], b[2], e)];
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene, renderer } = ctx;
    scene.background = new THREE.Color(C.page);
    perspStage(ctx);
    const env = studioEnvLight(renderer as THREE.WebGLRenderer);

    // ---------------------------------------------------------------- studio backdrop
    const grid = backdrop(1920, 1080, (g, w, h) => {
      g.fillStyle = "#F6F9FC";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(10,37,64,0.07)";
      g.lineWidth = 1.5;
      g.beginPath();
      for (let x = 85; x < w; x += 219) { g.moveTo(x, 0); g.lineTo(x, h); }
      for (let y = 102; y < h; y += 219) { g.moveTo(0, y); g.lineTo(w, y); }
      g.stroke();
      for (const [x, y] of [[85, 102], [742, 321], [1836, 321], [1617, 540], [304, 759], [1180, 102]])
        drawDiamond(g, x, y, 15, "rgba(99,91,255,0.4)");
    }, "studio-grid", 1);
    grid.renderOrder = -20;
    const beam = backdrop(1920, 1080, (g, w, h) => {
      g.save();
      g.translate(w * 0.74, h * 1.12);
      g.rotate(-0.42);
      g.scale(1, 0.46);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1750);
      gr.addColorStop(0, "rgba(99,91,255,0.55)");
      gr.addColorStop(0.3, "rgba(169,96,238,0.32)");
      gr.addColorStop(0.6, "rgba(0,212,255,0.12)");
      gr.addColorStop(1, "rgba(0,212,255,0)");
      g.fillStyle = gr;
      g.fillRect(-2200, -2600, 4400, 5200);
      g.restore();
    }, "light-beam", 0.5);
    beam.renderOrder = -19;
    for (const b of [grid, beam]) (b.material as THREE.MeshBasicMaterial).depthTest = false;
    scene.add(grid, beam);

    // ---------------------------------------------------------------- type
    const FS = 118;
    const base: TextOpts = { size: FS, weight: 450, tracking: -0.01 };
    const meet = makeText("Meet", { ...base, size: 133, gradient: [C.navy, "#33496a"], gradientDir: "h", anchor: "right", blur: 14 }, "meet");
    const WORD = { ...base, size: 112, weight: 500, tracking: -0.03 };
    const infW = measureText("Payment Links", WORD);
    const infinite = makeText("Payment Links", { ...WORD, gradient: [C.navy, "#33496a"], gradientDir: "h", anchor: "left", blur: 14 }, "payment-links");

    // ---------------------------------------------------------------- the ∞ mark
    const markGeo = linkGeometry();
    markGeo.computeBoundingBox();
    const bw = markGeo.boundingBox!.max.x - markGeo.boundingBox!.min.x;
    const markScale = MARK_W / bw;
    const chrome = new THREE.MeshPhysicalMaterial({ color: "#5148F0", metalness: 0.15, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05, envMap: env, envMapIntensity: 0.7, transparent: true });

    // The lockup is built K times: copy 0 is the real one, the rest only appear in the
    // whip, each posed a fraction of a frame earlier, to make a shutter.
    const lockups: { root: THREE.Group; mark: THREE.Mesh; word: THREE.Mesh; wordSoft?: THREE.Mesh }[] = [];
    for (let k = 0; k < K; k++) {
      const root = new THREE.Group();
      root.name = k === 0 ? "payment-links-lockup" : `payment-links-lockup-smear-${k}`;
      const mark = new THREE.Mesh(markGeo, chrome);
      mark.name = k === 0 ? "link-mark" : `link-mark-smear-${k}`;
      mark.scale.setScalar(markScale);
      const word = k === 0 ? infinite.sharp : infinite.sharp.clone();
      if (k > 0) {
        word.name = `payment-links-smear-${k}`;
        word.position.copy(infinite.sharp.position);
      }
      root.add(mark);
      if (k === 0) root.add(infinite.group);
      else {
        const holder = new THREE.Group();
        holder.add(word);
        root.add(holder);
        (root as any).wordHolder = holder;
      }
      root.visible = k === 0;
      if (k > 0) root.userData.pickable = false;
      scene.add(root);
      lockups.push({ root, mark, word });
    }
    scene.add(meet.group);

    // streak the whip leaves behind
    const streak = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 300),
      new THREE.MeshBasicMaterial({ map: streakTexture("#ffffff"), color: C.blurple, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }),
    );
    streak.name = "whip-streak";
    streak.renderOrder = 50;
    const head = new THREE.Mesh(
      new THREE.CircleGeometry(22, 32),
      new THREE.MeshBasicMaterial({ color: C.blurple, transparent: true, depthTest: false, toneMapped: false }),
    );
    head.name = "whip-head";
    head.renderOrder = 51;
    scene.add(streak, head);

    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(-300, 500, 900);
    scene.add(key, new THREE.AmbientLight(0xffffff, 0.6));

    // positions within a lockup (relative to its centre, at scale 1)
    // Meet-state: "Meet" right edge 773, ∞ 837–1087 → ∞ centre +2 from frame centre.
    // Lockup: ∞ 640–890 (centre −195), "Infinite" starts at 902 (−58), ends ≈ 1306.
    const MARK_MEET_X = 2;
    const GAP = 30;
    const LOCK_L = -(MARK_W + GAP + infW) / 2;
    const MARK_LOCK_X = LOCK_L + MARK_W / 2;
    const WORD_X = LOCK_L + MARK_W + GAP;
    const MEET_R = MARK_MEET_X - MARK_W / 2 - 46;

    function poseLockup(L: (typeof lockups)[number], G: number, isMain: boolean) {
      // ∞ turns out of edge-on, then slides into the lockup slot
      const turn = easeOutCubic(seg(G, 234, 239));
      const slide = easeInOutCubic(seg(G, 249, 259));
      L.mark.rotation.set(0, THREE.MathUtils.lerp(-1.5, 0, turn), 0);
      L.mark.position.x = THREE.MathUtils.lerp(MARK_MEET_X, MARK_LOCK_X, slide);
      const [cx, s] = lockPose(G);
      L.root.position.x = cx;
      L.root.scale.setScalar(s);
      if (isMain) {
        infinite.group.position.x = WORD_X + (1 - easeOutCubic(seg(G, 247, 261))) * 134;
      } else {
        const holder = (L.root as any).wordHolder as THREE.Group;
        holder.position.x = WORD_X;
      }
    }

    return ({ frame }) => {
      const G = frame + G0;

      // studio fades: beam first, then the grid, to black by ~282
      const dim = easeInOutCubic(seg(G, 251, 262));
      const black = easeInOutCubic(seg(G, 255, 268));
      (beam.material as THREE.MeshBasicMaterial).opacity = 1 - dim * 0.75 - black * 0.25;
      (grid.material as THREE.MeshBasicMaterial).opacity = 1 - black;
      beam.visible = grid.visible = G < 283;

      // "Meet": blurs in sliding right, holds, dims out
      const mIn = easeOutCubic(seg(G, 233, 243));
      const mOut = easeOutCubic(seg(G, 249, 258));
      meet.group.position.x = MEET_R - 70 * (1 - mIn) - (MARK_MEET_X - MARK_LOCK_X) * easeInOutCubic(seg(G, 249, 259));
      meet.set(mIn * (1 - mOut), Math.max(1 - mIn, mOut * 0.6));

      // "Infinite": un-blurs in from the right
      const iIn = easeInOutCubic(seg(G, 247, 261));
      infinite.set(iIn, 1 - iIn);

      // main lockup + whip smear
      const whip = G >= 296;
      poseLockup(lockups[0], G, true);
      const alpha = whip ? 0.16 : 1;
      chrome.opacity = alpha;
      infinite.sharp.material.opacity = whip ? alpha : infinite.sharp.material.opacity;
      for (let k = 1; k < K; k++) {
        const L = lockups[k];
        L.root.visible = whip;
        if (whip) poseLockup(L, G - (k / (K - 1)) * 1.0, false);
      }

      // the streak: from inside the type out to a purple-white head
      const sIn = seg(G, 300, 302);
      const show = G >= 300.5;
      streak.visible = head.visible = show;
      if (show) {
        const headX = THREE.MathUtils.lerp(-200, 134, easeOutCubic(sIn)) + (G - 302) * 360;
        const tailX = headX - 900;
        streak.scale.x = headX - tailX;
        streak.position.set((headX + tailX) / 2, 0, 5);
        head.position.set(headX - 18, 0, 6);
      }
    };
  });
}
