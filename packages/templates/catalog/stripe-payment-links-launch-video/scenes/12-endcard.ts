/**
 * 12 · End card — global frames 716–900 (Stripe remix: blurple app icon with the link mark, Payment Links, stripe.com CTA)
 *
 * Back in the grey studio of scene 04 (grid, diamonds, a beam from the bottom
 * right). The app icon blurs in near centre and glides left; "Infinite" and the
 * tagline slide out from behind it (clipped at the icon's right edge). "GET STARTED
 * / INFINITE.DEV" fades up in mono. Then it holds, breathing, to the end.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { withFonts, MONO } from "../components/fonts";
import { makeText, roundRect } from "../components/type";
import { perspStage, seg, easeOutCubic, clamp01 } from "../components/stage";
import { studioEnvLight, linkGeometry, chromeLight } from "../components/linkmark";
import { C } from "../components/brand";
import { backdrop, drawDiamond } from "../components/fx";

const G0 = 716;
const ICON = 206;

function keyed(keys: [number, number][], G: number, ease = (t: number) => t) {
  if (G <= keys[0][0]) return keys[0][1];
  let i = 0;
  while (i < keys.length - 2 && G > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1];
  return THREE.MathUtils.lerp(a[1], b[1], ease(clamp01((G - a[0]) / (b[0] - a[0]))));
}
// screen px (from frame left)
const ICON_X: [number, number][] = [[716, 854], [717, 797], [718, 750], [719, 720], [720, 701], [722, 662], [724, 643], [726, 626], [728, 614], [730, 605], [735, 599], [745, 597]];
const WORD_L: [number, number][] = [[717, 470], [719, 543], [722, 625], [724, 656], [726, 699], [728, 740], [732, 757]];
const TAG_L: [number, number][] = [[717, 820], [718, 864], [720, 929], [722, 979], [724, 1014], [726, 1037], [728, 1052], [730, 1067], [745, 1083]];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene, renderer } = ctx;
    (renderer as THREE.WebGLRenderer).localClippingEnabled = true;
    scene.background = new THREE.Color(C.page);
    perspStage(ctx);
    const env = studioEnvLight(renderer as THREE.WebGLRenderer);

    // ---------------------------------------------------------------- studio
    const grid = backdrop(1920, 1080, (g, w, h) => {
      g.fillStyle = "#F6F9FC";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(10,37,64,0.07)";
      g.lineWidth = 1.5;
      g.beginPath();
      for (let x = 105; x < w; x += 211.5) { g.moveTo(x, 0); g.lineTo(x, h); }
      for (let y = 112; y < h; y += 211.5) { g.moveTo(0, y); g.lineTo(w, y); }
      g.stroke();
      for (const [x, y] of [[105, 112], [740, 323], [1797, 323], [1587, 535], [315, 746]]) drawDiamond(g, x, y, 15, "rgba(99,91,255,0.4)");
      g.strokeStyle = "rgba(99,91,255,0.25)";
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(1797, 268); g.lineTo(1852, 323); g.lineTo(1797, 378); g.lineTo(1742, 323); g.closePath(); g.stroke();
    }, "endcard-grid", 1);
    const beam = backdrop(1920, 1080, (g, w, h) => {
      g.save();
      g.translate(w * 0.82, h * 1.1);
      g.rotate(-0.45);
      g.scale(1, 0.48);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1600);
      gr.addColorStop(0, "rgba(99,91,255,0.5)");
      gr.addColorStop(0.3, "rgba(169,96,238,0.3)");
      gr.addColorStop(0.62, "rgba(0,212,255,0.12)");
      gr.addColorStop(1, "rgba(0,212,255,0)");
      g.fillStyle = gr;
      g.fillRect(-1700, -1700, 3400, 3400);
      g.restore();
      // soft lift behind the lockup
      const r = g.createRadialGradient(860, 500, 0, 860, 500, 420);
      r.addColorStop(0, "rgba(255,255,255,0.7)");
      r.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, w, h);
    }, "endcard-light", 0.5);
    for (const [i, b] of [grid, beam].entries()) {
      b.renderOrder = -20 + i;
      (b.material as THREE.MeshBasicMaterial).depthTest = false;
      scene.add(b);
    }

    // ---------------------------------------------------------------- app icon
    const icon = new THREE.Group();
    icon.name = "app-icon";
    const tile = backdrop(ICON + 120, ICON + 120, (g, w, h) => {
      const m = 60;
      g.save();
      g.shadowColor = "rgba(255,255,255,0.18)";
      g.shadowBlur = 40;
      roundRect(g, m, m, ICON, ICON, 46);
      g.fillStyle = "#5148F0";
      g.fill();
      g.restore();
      g.save();
      roundRect(g, m, m, ICON, ICON, 46);
      g.clip();
      const r = g.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h / 2, ICON * 0.8);
      r.addColorStop(0, "#8C86FF");
      r.addColorStop(1, "#4B44E0");
      g.fillStyle = r;
      g.fillRect(m, m, ICON, ICON);
      g.fillStyle = "rgba(255,255,255,0.07)";
      for (let y = m + 10; y < m + ICON; y += 9) for (let x = m + 10; x < m + ICON; x += 9) g.fillRect(x, y, 2, 2);
      g.restore();
      roundRect(g, m + 1, m + 1, ICON - 2, ICON - 2, 45);
      const bg = g.createLinearGradient(m, m, m + ICON, m + ICON);
      bg.addColorStop(0, "rgba(255,255,255,0.28)");
      bg.addColorStop(0.5, "rgba(255,255,255,0.08)");
      bg.addColorStop(1, "rgba(255,255,255,0.2)");
      g.strokeStyle = bg;
      g.lineWidth = 2.5;
      g.stroke();
    }, "app-icon-tile", 1);
    icon.add(tile);
    const markGeo = linkGeometry();
    markGeo.computeBoundingBox();
    const bw = markGeo.boundingBox!.max.x - markGeo.boundingBox!.min.x;
    const chrome = chromeLight(env, "#ffffff");
    chrome.emissive = new THREE.Color("#d8d6ff");
    chrome.emissiveIntensity = 0.5;
    chrome.transparent = true;
    const mark = new THREE.Mesh(markGeo, chrome);
    mark.name = "app-icon-mark";
    mark.scale.setScalar(116 / bw);
    mark.position.z = 12;
    icon.add(mark);
    scene.add(icon);
    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(-200, 400, 800);
    scene.add(key, new THREE.AmbientLight(0xffffff, 0.6));

    // ---------------------------------------------------------------- type
    const clip = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
    const word = makeText("Payment Links", { size: 104, weight: 500, tracking: -0.03, gradient: [C.navy, "#3b5170"], gradientDir: "h", anchor: "left" }, "payment-links-wordmark");
    // "Payment Links" is wider than the original word: re-centre the lockup and push the tagline out
    const extra = word.width - 326 + 52;
    const dI = -extra / 2;
    const tag1 = makeText("Create a link.", { size: 31, weight: 400, color: C.slate, anchor: "left" }, "tagline-create-a-link");
    const tag2 = makeText("Sell anywhere.", { size: 31, weight: 400, color: C.slate, anchor: "left" }, "tagline-sell-anywhere");
    const tag = new THREE.Group();
    tag.name = "tagline";
    tag1.group.position.y = 16;
    tag2.group.position.y = -16;
    tag.add(tag1.group, tag2.group);
    for (const t of [word, tag1, tag2]) t.sharp.material.clippingPlanes = [clip];
    scene.add(word.group, tag);
    const cta1 = makeText("GET STARTED", { size: 33, weight: 400, tracking: 0.08, color: C.slate, font: MONO }, "get-started");
    const cta2 = makeText("STRIPE.COM/PAYMENTS/PAYMENT-LINKS", { size: 33, weight: 400, tracking: 0.04, color: C.blurple, font: MONO }, "cta-url");
    cta1.group.position.y = -320;
    cta2.group.position.y = -385;
    scene.add(cta1.group, cta2.group);

    return ({ frame, time }) => {
      const G = frame + G0;
      const ix = keyed(ICON_X, G) - 960 + dI;
      icon.position.set(ix, -3, 0);
      const iIn = easeOutCubic(seg(G, 715, 719));
      icon.scale.setScalar(1.15 - 0.15 * iIn);
      (tile.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.65 * iIn;
      chrome.opacity = 0.35 + 0.65 * iIn;
      mark.rotation.y = Math.sin(time * 0.9) * 0.1;

      clip.constant = -(ix + ICON / 2 + 4);
      word.group.position.set(keyed(WORD_L, G) - 960 + dI, 0, 0);
      tag.position.set(keyed(TAG_L, G) - 960 + dI + extra, 0, 0);
      word.set(seg(G, 718, 719.5));
      tag1.set(seg(G, 717, 718.5));
      tag2.set(seg(G, 717, 718.5));

      const cIn = easeOutCubic(seg(G, 717, 727));
      cta1.set(cIn);
      cta2.set(cIn);

      // the hold breathes: the light drifts, a slow push
      beam.position.x = Math.sin(time * 0.35) * 18;
      (beam.material as THREE.MeshBasicMaterial).opacity = 0.9 + Math.sin(time * 0.7) * 0.1;
    };
  });
}
