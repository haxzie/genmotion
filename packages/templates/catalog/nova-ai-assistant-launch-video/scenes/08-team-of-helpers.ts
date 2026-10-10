import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import { FONT_FAMILY } from "../components/brand";
import { screenLayer, track } from "../components/stage";
import { label, setLabel, withFonts } from "../components/type";
import { backdrop } from "../components/fx";

/*
 * The send lands on a soft headline; then a ring of glossy toy-like shapes
 * bursts outward around the second line. Pacing follows the reference beat
 * (global frames 1185-1317); the shapes and words are our own.
 */
const F0 = 1185;
const CUT = 1229; // headline -> shapes

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RING = track([[1229, 1.5], [1240, 3.3], [1256, 4.3], [1317, 4.9]]);

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: FONT_FAMILY, url: interUrl }], () => {
    const { scene, camera } = ctx;
    const layer = screenLayer(scene, camera);
    const rand = mulberry32(42);

    const bg = backdrop();
    scene.add(bg);

    /* headline */
    const h1 = label("Building a team", { size: 96, weight: 450, pad: 40 }, "#1d2230");
    const h2 = label("of helpers", { size: 96, weight: 450, pad: 40 }, "#1d2230");
    h1.position.y = 58;
    h2.position.y = -58;
    layer.add(h1, h2);

    /* second beat: words + shapes */
    const s1 = label("to finish", { size: 72, weight: 450, pad: 30 }, "#1d2230");
    const s2 = label("the hard stuff", { size: 72, weight: 450, pad: 30 }, "#1d2230");
    s1.position.y = 42;
    s2.position.y = -42;
    layer.add(s1, s2);

    /* glossy shapes in a ring, real 3D, lit */
    const world = new THREE.Group();
    world.name = "helper-shapes";
    scene.add(world);
    const COLORS = ["#ff6a3d", "#7b61ff", "#19c6a7", "#3c7be8", "#ff4f8b", "#f7b500", "#2bb24c", "#a259ff", "#0aa5d8", "#ff8a1f"];
    const geos = [
      new THREE.TorusGeometry(0.42, 0.17, 24, 48),
      new THREE.IcosahedronGeometry(0.5, 0),
      new THREE.CapsuleGeometry(0.24, 0.5, 8, 16),
      new THREE.ConeGeometry(0.42, 0.8, 32),
      new THREE.OctahedronGeometry(0.52, 0),
      new THREE.BoxGeometry(0.66, 0.66, 0.66, 4, 4, 4),
      new THREE.SphereGeometry(0.42, 32, 16),
      new THREE.TorusKnotGeometry(0.3, 0.1, 80, 12),
    ];
    const shapes = new Array(12).fill(0).map((_, i) => {
      const mat = new THREE.MeshPhysicalMaterial({ color: COLORS[i % COLORS.length], roughness: 0.25, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.4 });
      const m = new THREE.Mesh(geos[i % geos.length]!, mat);
      m.name = `helper-shape-${i + 1}`;
      world.add(m);
      return { m, a: (i / 12) * Math.PI * 2 + rand() * 0.2, spin: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(2), z: (rand() - 0.5) * 1.6, rr: 0.9 + rand() * 0.2, s: 0.85 + rand() * 0.35 };
    });
    const key = new THREE.DirectionalLight(0xffffff, 3.0);
    key.position.set(3, 4, 6);
    const fill = new THREE.DirectionalLight(0xdfe8ff, 1.4);
    fill.position.set(-4, -2, 4);
    scene.add(key, fill, new THREE.AmbientLight(0xffffff, 0.9));

    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    const pale = new THREE.Color("#e3ecfb");
    const white = new THREE.Color("#ffffff");
    const top = new THREE.Color();

    return ({ frame, time }) => {
      const f = frame + F0;
      const second = f >= CUT;

      /* backdrop: pale blue wash for the headline, white for the shapes */
      top.copy(second ? white : pale);
      bg.grad(top, second ? "#f8f9fc" : "#f4f6fa", [0, 1]);
      bg.glow(0, { x: 0.5, y: 0.0, rx: 0.9, ry: 0.5, color: second ? "#000000" : "#c9dbfb", amount: second ? 0 : 0.35 });

      /* headline: blur up by line, slow push, then gone at the cut */
      [h1, h2].forEach((l, i) => {
        const k = interpolate(f, [1185 + i * 4, 1197 + i * 4], [0, 1], Easing.easeOut);
        setLabel(l, { opacity: k, blur: (1 - k) * 14 });
        l.position.y = (i === 0 ? 58 : -58) - (1 - k) * 20;
        l.visible = !second;
      });
      const push = interpolate(f, [1185, 1229], [0.97, 1.03]);
      h1.scale.setScalar(push);
      h2.scale.setScalar(push);

      /* words in the ring */
      [s1, s2].forEach((l, i) => {
        const at = i === 0 ? 1238 : 1262;
        const k = interpolate(f, [at, at + 10], [0, 1], Easing.easeOut);
        setLabel(l, { opacity: k * interpolate(f, [1308, 1317], [1, 0.7]), blur: (1 - k) * 12 });
        l.visible = second;
      });

      /* shapes burst out from the middle into a ring, then keep drifting outward */
      world.visible = second;
      const R = RING(f);
      shapes.forEach(({ m, a, spin, z, rr, s }, i) => {
        const ang = a + (f - CUT) * 0.004;
        const r = R * rr;
        m.position.set(Math.cos(ang) * r * 1.35, Math.sin(ang) * r * 0.82 + Math.sin(time * 1.4 + i) * 0.05, z);
        m.rotation.set(spin.x * time, spin.y * time, spin.z * time);
        const grow = interpolate(f, [CUT, CUT + 12], [0.35, 1], Easing.easeOut);
        m.scale.setScalar(s * grow * 1.15);
      });
    };
  });
}
