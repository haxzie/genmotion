/**
 * 10 · Coin returns → "Powered by Stripe" — one shot, global frames 666–716
 *
 * Merges the old scenes 10 and 11 so there is no cut between them.
 *  666–682  the blurple column is back; the link coin flips in edge-on and lands big.
 *  680–696  the column widens and dissolves into the light wedge, while the SAME coin
 *           glides down and shrinks into the front coin's slot (the persisting element).
 *  686–700  two more coins drift in from depth; "Powered by" + the Stripe wordmark rise in.
 *  700–711  hold with gentle drift.
 *  711–716  the light and the left coin let go into the end card.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { withFonts } from "../components/fonts";
import { makeText } from "../components/type";
import { perspStage, seg, easeOutCubic, easeInCubic, easeInOutCubic, splineKeys } from "../components/stage";
import { studioEnvLight, linkCoin } from "../components/linkmark";
import { C, stripeWordmark } from "../components/brand";
import { blurpleColumn } from "../components/column";
import { backdrop } from "../components/fx";

const G0 = 666;

/** hero coin flip-in: [G, rotX, rotY, roll, scale] (scale 1 = the big 336px coin) */
const FLIP: number[][] = [
  [666, 0.0, 1.52, 0.5, 0.92],
  [667.5, -0.2, 1.2, 0.35, 0.95],
  [668, -0.5, 0.6, 0.05, 1.0],
  [676, -0.46, 0.55, 0.08, 1.0],
  [682, -0.44, 0.52, 0.09, 1.02],
];
// column width multiplier while it is visible
const COL: number[][] = [[666, 1.1], [668, 1.65], [676, 1.78], [684, 2.4], [694, 3.6]];

const BIG_R = 336;
// [x, y, radius, z, name, arrival frame]
const SPECS: [number, number, number, number, string, number][] = [
  [-307, 72, 135, 0, "link-coin-left", 688],
  [292, 3, 117, -60, "link-coin-right", 691],
  [0, -278, 180, 80, "link-coin-front", 0], // the hero lands here
];

function setOpacity(obj: THREE.Object3D, o: number) {
  obj.traverse((n) => {
    const m = (n as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!m) return;
    for (const mm of Array.isArray(m) ? m : [m]) {
      mm.transparent = true; // stay in the transparent pass so they sort after the backdrops
      mm.opacity = o;
    }
  });
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene, renderer } = ctx;
    scene.background = new THREE.Color(C.page);
    perspStage(ctx);
    const env = studioEnvLight(renderer as THREE.WebGLRenderer);

    // ---------------------------------------------------------------- the light wedge (under)
    const beam = backdrop(1920, 1080, (g, w, h) => {
      g.fillStyle = "#F6F9FC";
      g.fillRect(0, 0, w, h);
      for (const [x, r] of [[w * 1.0, w * 0.35], [0, w * 0.25]] as const) {
        const gr = g.createRadialGradient(x, h * 0.55, 0, x, h * 0.55, r);
        gr.addColorStop(0, "rgba(0,212,255,0.22)");
        gr.addColorStop(1, "rgba(0,212,255,0)");
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
      }
      g.beginPath();
      g.moveTo(555, 0); g.lineTo(1372, 0); g.lineTo(1770, h); g.lineTo(225, h); g.closePath();
      const lin = g.createLinearGradient(300, 0, 1650, 0);
      lin.addColorStop(0, "#E4E1FF");
      lin.addColorStop(0.3, "#ECEAFF");
      lin.addColorStop(0.55, "#D3CFFF");
      lin.addColorStop(0.8, "#B3ADFF");
      lin.addColorStop(1, "#9A94FF");
      g.fillStyle = lin;
      g.fill();
      g.save();
      g.clip();
      const rg = g.createRadialGradient(500, h, 0, 500, h, 900);
      rg.addColorStop(0, "rgba(255,255,255,0.7)");
      rg.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = rg;
      g.fillRect(0, 0, w, h);
      g.restore();
      g.strokeStyle = "rgba(99,91,255,0.45)";
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(1372, 0); g.lineTo(1770, h); g.stroke();
      g.beginPath(); g.moveTo(555, 0); g.lineTo(225, h); g.stroke();
    }, "light-wedge", 0.5);
    beam.renderOrder = -11;
    const bm = beam.material as THREE.MeshBasicMaterial;
    bm.depthTest = false;
    bm.transparent = true;
    scene.add(beam);

    // ---------------------------------------------------------------- the column (over the wedge, dissolves)
    const column = blurpleColumn("blurple-column-return");
    column.renderOrder = -10;
    const cm = column.material as THREE.MeshBasicMaterial;
    cm.transparent = true;
    scene.add(column);

    // ---------------------------------------------------------------- coins
    const hero = linkCoin(env, SPECS[2][2], "link-coin-hero");
    const roll = new THREE.Group();
    roll.name = "link-coin-hero-roll";
    roll.add(hero);
    scene.add(roll);
    const others = SPECS.slice(0, 2).map(([x, y, r, z, name]) => {
      const c = linkCoin(env, r, name);
      c.position.set(x, y, z);
      scene.add(c);
      return c;
    });

    const key = new THREE.DirectionalLight(0xffffff, 2.5);
    key.position.set(-400, 550, 800);
    const fill = new THREE.DirectionalLight(0xe9e7ff, 0.9);
    fill.position.set(500, -200, 400);
    scene.add(key, fill, new THREE.AmbientLight(0xffffff, 0.48));

    // ---------------------------------------------------------------- title
    const l1 = makeText("Powered by", { size: 88, weight: 400, tracking: -0.02, color: C.navy, blur: 10 }, "powered-by");
    const mark = stripeWordmark(104, C.blurple, "stripe-wordmark");
    const markMat = mark.mesh.material as THREE.MeshBasicMaterial;
    l1.group.position.set(0, 390, 0);
    mark.mesh.position.set(0, 282, 0);
    scene.add(l1.group, mark.mesh);

    // coins must draw after the (transparent, depthTest-off) backdrops
    for (const c of [hero, ...others]) setOpacity(c, 1);
    const fv = [0, 0, 0, 0];
    const cv = [0];
    const bigScale = BIG_R / SPECS[2][2];

    return ({ frame, time }) => {
      const G = frame + G0;

      // column → wedge: the column keeps widening while it dissolves away
      splineKeys(COL, G, cv);
      column.scale.x = cv[0];
      const dissolve = easeInOutCubic(seg(G, 682, 696));
      cm.opacity = 1 - dissolve;
      column.visible = dissolve < 1;

      // hero coin: flip-in, then glide into the front slot of the trio
      splineKeys(FLIP, G, fv);
      const glide = easeInOutCubic(seg(G, 680, 698));
      const ph = 2 * 1.7;
      const tRotX = -0.55 + Math.sin(time * 1.3 + ph) * 0.06;
      const tRotY = 0.6 + Math.sin(time * 0.9 + ph) * 0.1;
      const L = THREE.MathUtils.lerp;
      hero.rotation.set(L(fv[0], tRotX, glide), L(fv[1], tRotY, glide), L(-0.2, -0.35, glide), "YXZ");
      roll.rotation.z = L(fv[2], 0, glide);
      roll.scale.setScalar(L(fv[3] * bigScale, 1, glide));
      const bob = Math.sin(time * 1.6 + ph) * 6 * glide;
      roll.position.set(0, L(0, SPECS[2][1], glide) + bob, L(0, SPECS[2][3], glide));

      // the other two coins drift in from depth
      others.forEach((c, i) => {
        const [x, y, , z, , at] = SPECS[i];
        const a = easeOutCubic(seg(G, at, at + 12));
        const p = i * 1.7;
        c.position.set(x * (0.7 + 0.3 * a), y + Math.sin(time * 1.6 + p) * 6, z - (1 - a) * 1400);
        c.rotation.set(-0.55 + Math.sin(time * 1.3 + p) * 0.06 + (1 - a) * 0.6, 0.6 + Math.sin(time * 0.9 + p) * 0.1 + (1 - a) * 0.9, -0.35, "YXZ");
        c.visible = G >= at;
      });

      // title rises in once the wedge is up
      const t1 = easeOutCubic(seg(G, 690, 702));
      const t2 = easeOutCubic(seg(G, 693, 705));

      // last beat: the light and the left coin let go first
      const off = easeInCubic(seg(G, 711, 716));
      bm.opacity = 1 - off * 0.85;
      beam.scale.x = 1 - off * 0.5;
      beam.position.x = -off * 480;
      setOpacity(others[0], 1 - off);
      others[0].visible = others[0].visible && G < 714.5;
      setOpacity(others[1], 1 - off * 0.4);
      setOpacity(hero, 1 - off * 0.4);

      l1.set(t1 * (1 - off), 1 - t1);
      l1.group.position.y = 390 - (1 - t1) * 30;
      markMat.opacity = t2 * (1 - off);
      mark.mesh.position.y = 282 - (1 - t2) * 30;
    };
  });
}
