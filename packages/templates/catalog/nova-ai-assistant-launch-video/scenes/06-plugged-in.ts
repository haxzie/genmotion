import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import { FONT_FAMILY } from "../components/brand";
import { screenLayer, track } from "../components/stage";
import { label, setLabel, measure, withFonts } from "../components/type";
import { backdrop } from "../components/fx";
import { tile } from "../components/ui";

/*
 * Out of the blue bloom: a word assembles from scattered letters, then shrinks
 * away as a ring of app tiles flies in and orbits three supporting lines; the
 * ring swells past the frame to hand off. Pacing follows the reference beat
 * (global frames 614-823); the words and tiles are our own.
 */
const F0 = 614;
const WORD = "Plugged in";
const LINES = ["to your apps", "your files", "every corner of your day"];
const N_TILES = 18;

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ring radius (px), spin (radians) and swell; line timings (global frames)
const RING_R = track([[648, 1500], [662, 470], [700, 455], [770, 470], [790, 560], [806, 900], [823, 1500]]);
const SPIN = track([[648, -0.9], [662, 0], [823, 1.15]]);
const LINE_T: [number, number][] = [[656, 702], [702, 738], [738, 806]];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: FONT_FAMILY, url: interUrl }], () => {
    const { scene, camera } = ctx;
    const layer = screenLayer(scene, camera);
    const rand = mulberry32(7);

    const bg = backdrop();
    bg.grad("#3a80f2", "#a79ef0", [0.55, 0.85]);
    scene.add(bg);

    /* the word, one plane per letter, laid out by measured advances */
    const style = { size: 136, weight: 450, tracking: -0.01, pad: 30 };
    const total = measure(WORD, style);
    const word = new THREE.Group();
    word.name = "plugged-in";
    layer.add(word);
    const letters = [...WORD].map((ch, i) => {
      const before = measure(WORD.slice(0, i), style);
      const w = measure(ch, style);
      const l = label(ch === " " ? " " : ch, style);
      l.name = `plugged-in-${i}`;
      const home = new THREE.Vector2(-total / 2 + before + w / 2, 0);
      const from = new THREE.Vector2((rand() - 0.5) * 260, (rand() - 0.5) * 120);
      word.add(l);
      return { l, home, from, delay: rand() * 8 };
    });

    /* supporting lines */
    const lines = LINES.map((t) => {
      const l = label(t, { size: 64, weight: 450, pad: 40 });
      layer.add(l);
      return l;
    });

    /* the ring */
    const tiles = new Array(N_TILES).fill(0).map((_, i) => {
      const t = tile(i, 92);
      t.name = `app-tile-${i + 1}`;
      layer.add(t);
      return { t, a: (i / N_TILES) * Math.PI * 2, wob: rand() * Math.PI * 2, lag: rand() * 6 };
    });

    return ({ frame, time }) => {
      const f = frame + F0;

      /* letters fly from a scatter into place, staggered */
      const shrink = interpolate(f, [648, 660], [1, 0.42], Easing.easeIn);
      const wordOut = interpolate(f, [652, 660], [1, 0]);
      word.scale.setScalar(shrink);
      word.position.y = Math.sin(time * 1.1) * 2;
      letters.forEach(({ l, home, from, delay }) => {
        const p = interpolate(f, [614 + delay, 636 + delay], [0, 1], Easing.easeOut);
        l.position.set(THREE.MathUtils.lerp(from.x, home.x, p), THREE.MathUtils.lerp(from.y, home.y, p), 0);
        l.scale.setScalar(THREE.MathUtils.lerp(0.18, 1, p));
        setLabel(l, { color: "#ffffff", opacity: Math.min(1, p * 2.5) * wordOut, blur: (1 - p) * 10 });
      });
      word.visible = f < 661;

      /* lines: blur in, hold, blur out */
      lines.forEach((l, i) => {
        const [a, b] = LINE_T[i]!;
        const inP = interpolate(f, [a, a + 9], [0, 1], Easing.easeOut);
        const outP = interpolate(f, [b - 7, b], [0, 1], Easing.easeIn);
        setLabel(l, { color: "#ffffff", opacity: inP * (1 - outP), blur: (1 - inP) * 12 + outP * 12 });
        l.scale.setScalar(0.94 + inP * 0.06 + outP * 0.05);
        l.position.y = Math.sin(time * 0.9) * 2;
        l.visible = f >= a && f <= b;
      });

      /* ring: flies in from beyond the frame, orbits, swells out */
      const R = RING_R(f);
      const spin = SPIN(f);
      tiles.forEach(({ t, a, wob, lag }) => {
        const arrive = interpolate(f, [646 + lag, 664 + lag], [0, 1], Easing.easeOut);
        const r = THREE.MathUtils.lerp(1500, R, arrive) * (1 + Math.sin(time * 1.3 + wob) * 0.012);
        const ang = a + spin;
        t.position.set(Math.cos(ang) * r * 1.22, Math.sin(ang) * r * 1.0, 0);
        const swell = interpolate(f, [780, 823], [1, 1.6], Easing.easeIn);
        t.scale.setScalar(swell);
        t.material.opacity = Math.min(1, arrive * 1.5) * interpolate(f, [806, 823], [1, 0.6]);
        t.visible = f >= 646;
      });
    };
  });
}
