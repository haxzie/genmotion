/**
 * 07 · "Checkout In Seconds" → "Get Paid Anywhere" — global frames 409–494
 * (Stripe remix: light studio, Stripe-hosted checkout and payment-success screens)
 *
 * A dark green studio. The phone rises from below with the account-linking screen
 * while "Sign Up In Seconds" builds word by word above it. A downward whip carries
 * the phone and title off the bottom; the activity screen drops in from the top and
 * settles, "Send Funds Anywhere" builds below. Everything whips off left, smeared,
 * into scene 08's dashboard.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { withFonts } from "../components/fonts";
import { makeText, measureText, type TextOpts, type TextObj } from "../components/type";
import { orthoStage, seg, easeOutCubic, clamp01, mulberry32 } from "../components/stage";
import { backdrop } from "../components/fx";
import { phoneMesh, PHONE_H } from "../components/phone";
import { checkoutScreen, successScreenCheck } from "../components/phone-light";
import { C } from "../components/brand";

const G0 = 409;
const K = 7; // motion-blur samples in the whips

function keyed(keys: [number, number][], G: number, ease = (t: number) => t) {
  if (G <= keys[0][0]) return keys[0][1];
  let i = 0;
  while (i < keys.length - 2 && G > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1];
  return THREE.MathUtils.lerp(a[1], b[1], ease(clamp01((G - a[0]) / (b[0] - a[0]))));
}

// phone 1: top edge (px from frame top)
const P1_TOP: [number, number][] = [[409, 670], [411, 570], [413, 492], [415, 442], [417, 404], [420, 365], [423, 354], [430, 355], [440, 370], [445, 366], [447, 400], [449, 760], [450, 1100]];
// phone 2 (scale 1.08): bottom edge
const P2_BOT: [number, number][] = [[449, 300], [450, 486], [451, 551], [453, 648], [455, 713], [457, 767], [459, 800], [462, 832], [475, 817], [488, 804]];
// phone 2 x at the exit whip
const P2_X: [number, number][] = [[486, 0], [488, -63], [490, -163], [492, -374], [494, -760]];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene } = ctx;
    scene.background = new THREE.Color(C.page);
    orthoStage(ctx);

    const rnd = mulberry32(7);
    const studio = backdrop(1920, 1080, (g, w, h) => {
      const v = g.createLinearGradient(0, 0, 0, h);
      v.addColorStop(0, "#F6F9FC");
      v.addColorStop(0.5, "#F2F4FB");
      v.addColorStop(1, "#E9E6FF");
      g.fillStyle = v;
      g.fillRect(0, 0, w, h);
      const r = g.createRadialGradient(w * 0.5, h * 1.1, 0, w * 0.5, h * 1.1, w * 0.6);
      r.addColorStop(0, "rgba(99,91,255,0.22)");
      r.addColorStop(1, "rgba(99,91,255,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, w, h);
      // faint "+" marks and dust
      g.strokeStyle = "rgba(99,91,255,0.3)";
      g.lineWidth = 1.5;
      for (const [x, y] of [[560, 470], [670, 450], [1350, 470], [1230, 650], [480, 650], [1460, 450], [700, 900]]) {
        g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + 10, y); g.moveTo(x, y - 10); g.lineTo(x, y + 10); g.stroke();
      }
      for (let i = 0; i < 70; i++) {
        g.fillStyle = `rgba(99,91,255,${0.08 + rnd() * 0.2})`;
        g.fillRect(w * (0.55 + rnd() * 0.45), h * rnd() * 0.6, 2, 2);
      }
    }, "light-studio", 0.5);
    scene.add(studio);

    // phones, each built K times for the whips (copy 0 is the real one)
    const p1: THREE.Mesh[] = [];
    const p2: THREE.Mesh[] = [];
    const base1 = phoneMesh(checkoutScreen, "phone-checkout");
    const base2 = phoneMesh(successScreenCheck, "phone-payment-success");
    for (let k = 0; k < K; k++) {
      const a = k === 0 ? base1 : base1.clone();
      const b = k === 0 ? base2 : base2.clone();
      if (k > 0) {
        a.name = `phone-checkout-smear-${k}`;
        b.name = `phone-payment-success-smear-${k}`;
        a.userData.pickable = b.userData.pickable = false;
      }
      b.scale.setScalar(1.08);
      p1.push(a);
      p2.push(b);
      scene.add(a, b);
    }
    const m1 = base1.material as THREE.MeshBasicMaterial;
    const m2 = base2.material as THREE.MeshBasicMaterial;

    // ---------------------------------------------------------------- titles
    const T: TextOpts = { size: 84, weight: 560, tracking: -0.01, color: C.navy, glow: { blur: 16, color: "rgba(99,91,255,0.22)", passes: 1 }, blur: 12, anchor: "left" };
    function line(words: string[], y: number, size: number, name: string) {
      const o = { ...T, size };
      const full = words.join(" ");
      const total = measureText(full, o);
      const grp = new THREE.Group();
      grp.name = name;
      grp.position.y = y;
      const objs: TextObj[] = [];
      let acc = "";
      for (const w of words) {
        const t = makeText(w, o, `${name}-${w.toLowerCase()}`);
        t.group.position.x = -total / 2 + measureText(acc, o);
        acc += w + " ";
        grp.add(t.group);
        objs.push(t);
      }
      scene.add(grp);
      return { grp, objs };
    }
    const sign = line(["Checkout", "In", "Seconds"], 300, 84, "checkout-in-seconds");
    const send = line(["Get", "Paid", "Anywhere"], -397, 92, "get-paid-anywhere");
    const SIGN_AT = [412, 417, 421];
    const SEND_AT = [455, 458, 461];

    return ({ frame }) => {
      const G = frame + G0;

      // phone 1 (+ smear in the downward whip)
      const whip1 = G >= 446 && G < 450;
      p1.forEach((m, k) => {
        const t = G - (k / (K - 1)) * 1.0;
        const top = keyed(P1_TOP, t, easeOutCubic);
        m.position.set(0, 540 - (top + PHONE_H / 2), 0);
        m.visible = G < 450 && (k === 0 || whip1);
      });
      m1.opacity = whip1 ? 0.3 : 1;

      // phone 2 drops in, then whips left
      const whip2 = G >= 487;
      p2.forEach((m, k) => {
        const t = G - (k / (K - 1)) * (whip2 ? 1.0 : 0.8);
        const bot = keyed(P2_BOT, t, easeOutCubic);
        m.position.set(keyed(P2_X, t), 540 - (bot - (PHONE_H * 1.08) / 2), 0);
        m.visible = G >= 449.5 && (k === 0 || whip2 || G < 456);
      });
      m2.opacity = whip2 || G < 456 ? 0.3 : 1;

      // "Sign Up In Seconds": words blur-rise in; ride the whip down and away
      const ride = keyed(P1_TOP, G, easeOutCubic) - keyed(P1_TOP, 445, easeOutCubic);
      sign.grp.position.y = 300 - Math.max(0, ride);
      sign.objs.forEach((o, i) => {
        const a = easeOutCubic(seg(G, SIGN_AT[i], SIGN_AT[i] + 5));
        o.group.position.y = -(1 - a) * 22;
        o.group.scale.setScalar(0.9 + 0.1 * a);
        const gone = G >= 449.5 ? 0 : 1;
        o.set(a * gone, Math.max(1 - a, seg(G, 445, 448)));
      });

      // "Send Funds Anywhere": builds below, smears off left with the phone
      const sx = keyed(P2_X, G);
      send.grp.position.x = sx * 1.1;
      send.objs.forEach((o, i) => {
        const a = easeOutCubic(seg(G, SEND_AT[i], SEND_AT[i] + 6));
        o.group.position.y = -(1 - a) * 22;
        o.group.scale.setScalar(0.9 + 0.1 * a);
        o.set(a * (1 - seg(G, 492, 494)), Math.max(1 - a, seg(G, 486, 490)));
      });
    };
  });
}
