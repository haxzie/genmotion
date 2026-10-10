import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import { FONT_FAMILY } from "../components/brand";
import { screenLayer, designWidth, DH, track } from "../components/stage";
import { label, setLabel, haloOf, withFonts } from "../components/type";
import { backdrop, glowDot, streak, type Streak, type Dot } from "../components/fx";
import { canvasPlane, rr, text, type Panel } from "../components/ui";

/*
 * Night stage. Glowing orbs streak in on neon trails and drop off helper pills;
 * the stage pans as more helpers join; the trails straighten into horizon lines
 * and the words punch in one at a time; a light streak flashes to white.
 * Pacing follows the reference beat (global frames 1317-1722); all content ours.
 */
const F0 = 1317;

type Helper = { name: string; color: string; at: number; x: number; y: number; from: [number, number][] };
// x, y in frame fractions at the moment the pill lands (before the pan)
const HELPERS: Helper[] = [
  { name: "Research helper", color: "#4a7cff", at: 1352, x: 0.62, y: 0.3, from: [[-0.05, -0.1], [0.3, 0.05], [0.5, 0.28]] },
  { name: "Budget helper", color: "#ff4a5a", at: 1362, x: 0.72, y: 0.68, from: [[0.98, 1.12], [0.8, 0.95], [0.65, 0.72]] },
  { name: "Launch planner", color: "#3fd17a", at: 1428, x: 1.32, y: 0.5, from: [[0.6, 1.1], [0.95, 0.7], [1.2, 0.52]] },
  { name: "Review helper", color: "#4a7cff", at: 1452, x: 1.55, y: 0.27, from: [[1.2, -0.1], [1.4, 0.12], [1.48, 0.26]] },
  { name: "Outreach helper", color: "#ffc63a", at: 1478, x: 1.68, y: 0.58, from: [[1.3, 1.1], [1.55, 0.8], [1.62, 0.6]] },
  { name: "Notes helper", color: "#3fd17a", at: 1500, x: 1.95, y: 0.36, from: [[1.7, -0.1], [1.85, 0.15], [1.9, 0.34]] },
];
const PAN = track([[1317, 0], [1395, 0.06], [1420, 0.62], [1440, 0.7], [1500, 0.9], [1525, 1.3], [1560, 1.6]]);
const WORDS: { t: string; at: number; end: number }[] = [
  { t: "Works", at: 1566, end: 1600 },
  { t: "in", at: 1600, end: 1615 },
  { t: "the", at: 1615, end: 1641 },
  { t: "cloud,", at: 1641, end: 1659 },
  { t: "nonstop", at: 1659, end: 1684 },
];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: FONT_FAMILY, url: interUrl }], () => {
    const { scene, camera, width, height } = ctx;
    const layer = screenLayer(scene, camera);
    const W = designWidth(width, height);
    const P = (x: number, y: number) => new THREE.Vector2((x - 0.5) * W, (0.5 - y) * DH);

    const bg = backdrop();
    bg.grad("#05060b", "#07070d", [0, 1]);
    scene.add(bg);

    const stage = new THREE.Group();
    stage.name = "night-stage";
    layer.add(stage);

    /* helpers: trail + comet + pill */
    const helpers = HELPERS.map((h, i) => {
      const end = P(h.x, h.y);
      const pts = [...h.from.map(([x, y]) => P(x, y)), end.clone().add(new THREE.Vector2(-150, 0))];
      const s = streak(pts, "#101830", h.color, 16, 2.2, true) as Streak;
      s.name = `trail-${i + 1}`;
      s.material.uniforms.uTail!.value = 0.35;
      s.material.uniforms.uFloor!.value = 0.25;
      stage.add(s);
      const comet = glowDot(9, 60, "#ffffff", h.color) as Dot;
      comet.material.uniforms.uHalo!.value = 1.3;
      comet.name = `comet-${i + 1}`;
      stage.add(comet);
      const pill = canvasPlane(340, 76, (g, w, hh) => {
        g.shadowColor = h.color;
        g.shadowBlur = 22;
        g.fillStyle = "rgba(14,18,30,0.92)";
        rr(g, 12, 12, w - 24, hh - 24, (hh - 24) / 2);
        g.fill();
        g.shadowBlur = 0;
        g.strokeStyle = h.color;
        g.lineWidth = 2;
        g.stroke();
        g.fillStyle = h.color;
        g.beginPath();
        g.arc(44, hh / 2, 8, 0, Math.PI * 2);
        g.fill();
        text(g, h.name, 64, hh / 2 + 1, 28, "#f2f4f8", 450);
      }, 3);
      pill.name = h.name.toLowerCase().replace(/ /g, "-");
      pill.position.set(end.x, end.y, 0);
      stage.add(pill);
      return { h, s, comet, pill, end };
    });

    /* horizon lines the trails straighten into */
    const horizon = [
      { y: 0.36, a: "#0a2a14", b: "#3fd17a" },
      { y: 0.47, a: "#0a1830", b: "#4a7cff" },
      { y: 0.55, a: "#2a2008", b: "#ffc63a" },
      { y: 0.66, a: "#300a10", b: "#ff4a5a" },
    ].map((l, i) => {
      const s = streak([P(-0.1, l.y + 0.06), P(0.3, l.y + 0.01), P(0.7, l.y - 0.01), P(1.1, l.y - 0.04)], l.a, l.b, 18, 2.2, true);
      s.name = `horizon-${i + 1}`;
      s.material.uniforms.uTail!.value = 0.5;
      s.material.uniforms.uFloor!.value = 0.35;
      layer.add(s);
      return s;
    });

    /* words */
    const words = WORDS.map((w) => {
      const l = label(w.t, { size: 230, weight: 500, tracking: -0.03, pad: 90 }, "#ffffff");
      const glow = haloOf(l, 40, 0.6);
      layer.add(glow, l);
      return { w, l, glow };
    });

    /* the closing light streak */
    const flare = canvasPlane(2400, 240, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, "rgba(120,170,255,0)");
      gr.addColorStop(0.3, "rgba(170,210,255,0.8)");
      gr.addColorStop(0.5, "rgba(255,255,255,1)");
      gr.addColorStop(0.7, "rgba(255,190,200,0.8)");
      gr.addColorStop(1, "rgba(255,120,140,0)");
      g.fillStyle = gr;
      g.filter = "blur(18px)";
      g.fillRect(0, h / 2 - 26, w, 52);
      g.filter = "blur(4px)";
      g.fillStyle = "rgba(255,255,255,0.95)";
      g.fillRect(w * 0.15, h / 2 - 4, w * 0.7, 8);
    }, 1);
    flare.name = "light-streak";
    flare.userData.pickable = false;
    flare.material.blending = THREE.AdditiveBlending;
    flare.renderOrder = 300;
    layer.add(flare);

    return ({ frame, time }) => {
      const f = frame + F0;

      /* colour in the corners breathes with the action */
      const wordsOn = f >= 1560;
      bg.glow(0, { x: 0.95, y: 1.0, rx: 0.5, ry: 0.4, color: "#5a0d1c", amount: 0.7 + Math.sin(time) * 0.05 });
      bg.glow(1, { x: 0.15, y: 0.0, rx: 0.5, ry: 0.35, color: "#0d2050", amount: 0.7 });
      bg.glow(2, { x: 0.0, y: 0.55, rx: 0.3, ry: 0.4, color: "#0d3a1c", amount: interpolate(f, [1400, 1440], [0, 0.6]) });
      bg.glow(3, { x: 0.5, y: 0.5, rx: 0.5, ry: 0.35, color: "#16224a", amount: wordsOn ? 0.5 : 0 });

      /* the stage pans to make room for the next helpers */
      stage.position.x = -PAN(f) * W;

      helpers.forEach(({ h, s, comet, pill }) => {
        const head = interpolate(f, [h.at - 28, h.at], [0, 1], Easing.easeOut);
        s.material.uniforms.uHead!.value = head;
        s.visible = head > 0;
        const p = s.pointAt(Math.min(head, 0.999));
        const fly = interpolate(f, [h.at, h.at + 10], [0, 1], Easing.easeOut);
        // the comet carries on past the pill, then fades
        comet.position.set(p.x + fly * 240, p.y + fly * 30, 0);
        comet.material.uniforms.uOpacity!.value = head > 0 ? interpolate(f, [h.at, h.at + 12], [1, 0]) : 0;
        comet.visible = head > 0 && f < h.at + 13;
        const pop = interpolate(f, [h.at - 2, h.at + 6, h.at + 10], [0, 1.06, 1], Easing.easeOut);
        pill.scale.setScalar(Math.max(0.001, pop));
        pill.material.opacity = Math.min(1, pop * 1.5) * interpolate(f, [1540, 1560], [1, 0]);
        pill.position.y = (0.5 - h.y) * DH + Math.sin(time * 1.2 + h.at) * 4;
        s.material.opacity = interpolate(f, [1540, 1560], [1, 0]);
        s.material.uniforms.uOpacity!.value = interpolate(f, [1540, 1560], [1, 0]);
      });

      /* horizon lines draw across as the helpers clear */
      horizon.forEach((s, i) => {
        const k = interpolate(f, [1530 + i * 4, 1575 + i * 4], [0, 1], Easing.easeOut);
        s.material.uniforms.uHead!.value = k;
        s.visible = k > 0;
        s.material.uniforms.uOpacity!.value = interpolate(f, [1680, 1700], [1, 0]);
        s.position.y = Math.sin(time * 0.8 + i) * 6;
      });

      /* kinetic words: punch in, hold, cut */
      words.forEach(({ w, l, glow }) => {
        const on = f >= w.at && f < w.end;
        l.visible = glow.visible = on;
        if (!on) return;
        const k = interpolate(f, [w.at, w.at + 5], [0, 1], Easing.easeOut);
        const drift = interpolate(f, [w.at, w.end], [1.0, 1.06]);
        const s = (1.18 - 0.18 * k) * drift;
        l.scale.setScalar(s);
        glow.scale.setScalar(s);
        setLabel(l, { opacity: k, blur: (1 - k) * 18 });
        setLabel(glow, { opacity: 0.55 * k });
      });

      /* light streak: thin line widens to a flash */
      const fl = interpolate(f, [1682, 1700, 1716, 1722], [0, 1, 1.4, 3], Easing.easeIn);
      flare.visible = f >= 1682;
      flare.scale.set(0.5 + fl * 0.6, 0.6 + fl * fl * 2.2, 1);
      flare.material.opacity = Math.min(1, fl);
      bg.glow(4, { x: 0.5, y: 0.5, rx: 0.8, ry: 0.06 + fl * 0.3, color: "#ffffff", amount: interpolate(f, [1704, 1722], [0, 1.6], Easing.easeIn) });
      // resolve to pure white on the last frames, matching the next scene's ground
      bg.material.uniforms.uFade!.value = interpolate(f, [1708, 1721], [1, 0], Easing.easeIn);
      (bg.material.uniforms.uFadeTo!.value as THREE.Color).set("#f7f8fb");
      horizon.forEach((h) => (h.material.uniforms.uOpacity!.value *= interpolate(f, [1704, 1716], [1, 0])));
    };
  });
}
