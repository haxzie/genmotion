import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX, RES, rx, ry } from "../components/stage";
import { glide, prog, outCubic, inQuad, lerp } from "../components/ease";
import { line, measure, setLabel, withInter } from "../components/type";
import { bottomGlow } from "../components/glow";

/**
 * Global f811–f882 (scene frame = global - 811). Hard cut in.
 * "how one change / affects" rises in at the left beside two towers of outlined shapes.
 * The towers give way and tumble into a heap along the bottom while the line is replaced by
 * "Everything else". A teal glow wells up from the bottom to hand off to the Assemble mark.
 */
const G0 = 811;
const STROKE = "#aecbdb";

type Kind = "circle" | "clover" | "triangle" | "square";

function shapeTexture(kind: Kind) {
  const S = 340 * RES;
  const c = new OffscreenCanvas(S, S);
  const g = c.getContext("2d")!;
  g.translate(S / 2, S / 2);
  g.scale(RES, RES);
  g.strokeStyle = STROKE;
  g.lineWidth = 5;
  g.lineJoin = "round";
  g.beginPath();
  if (kind === "circle") {
    g.arc(0, 0, 123, 0, Math.PI * 2);
  } else if (kind === "square") {
    g.roundRect(-118, -118, 236, 236, 14);
  } else if (kind === "triangle") {
    // rounded equilateral triangle pointing up, side ~250
    const R = 140, r = 14;
    const pts = [0, 1, 2].map((i) => {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
      return [Math.cos(a) * R, Math.sin(a) * R + 22] as const;
    });
    g.moveTo((pts[0]![0] + pts[1]![0]) / 2, (pts[0]![1] + pts[1]![1]) / 2);
    for (let i = 1; i <= 3; i++) {
      const p = pts[i % 3]!, q = pts[(i + 1) % 3]!;
      g.arcTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, r);
    }
  } else {
    // four-lobed rounded star
    for (let i = 0; i <= 240; i++) {
      const a = (i / 240) * Math.PI * 2;
      const rr = 128 + 30 * Math.cos(4 * a);
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
  }
  g.closePath();
  g.stroke();
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withInter(ctx, () => {
    const { scene, camera, height } = ctx;
    scene.background = new THREE.Color("#fdfdfd");
    fitCamera(camera, height, 50);

    const glow = bottomGlow();
    scene.add(glow.group);

    /* ------------------------------------------------------------ shapes */
    const tex: Record<Kind, THREE.CanvasTexture> = {
      circle: shapeTexture("circle"),
      clover: shapeTexture("clover"),
      triangle: shapeTexture("triangle"),
      square: shapeTexture("square"),
    };
    const geo = new THREE.PlaneGeometry(340 * PX, 340 * PX);
    // [name, kind, start x, y, rot, mid (f831) x, y, rot, end x, y, rot]
    const SHAPES: [string, Kind, number, number, number, number, number, number, number, number, number][] = [
      ["circle-a1", "circle", 1480, -80, 0, 1294, 616, 0, 60, 1010, 0],
      ["clover-a2", "clover", 1480, 270, 0, 1034, 750, 20, 640, 1010, 30],
      ["triangle-a3", "triangle", 1480, 530, 180, 860, 970, 270, 440, 1050, 360],
      ["square-a4", "square", 1478, 760, 0, 1194, 960, 8, 1186, 1060, 0],
      ["circle-a5", "circle", 1480, 1020, 0, 1454, 1000, 0, 1440, 1070, 0],
      ["square-b1", "square", 1800, 170, 0, 1514, 744, 20, 1590, 900, 45],
      ["circle-b2", "circle", 1800, 460, 0, 988, 490, 0, 894, 1010, 0],
      ["clover-b3", "clover", 1800, 750, 0, 1810, 830, 10, 1870, 1100, 20],
      ["triangle-b4", "triangle", 1800, 1000, 180, 1700, 1150, 250, 1670, 1080, 360],
      ["circle-b5", "circle", 1800, -150, 0, 1820, 590, 0, 1860, 920, 0],
    ];
    const heap = new THREE.Group();
    heap.name = "shape-heap";
    scene.add(heap);
    const shapes = SHAPES.map(([name, kind, x0, y0, r0, xm, ym, rm, x1, y1, r1]) => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex[kind], transparent: true, depthWrite: false }));
      m.name = name;
      heap.add(m);
      return { m, x0, y0, r0, xm, ym, rm, x1, y1, r1 };
    });
    const sway = glide([[811, 0], [815, -4], [819, -10]]);
    const enter = glide([[806, 420], [808, 200], [810, 40], [811, 0]]);
    const sink = glide([[843, 100], [851, 40], [859, 0]]); // the heap settles after landing

    /* -------------------------------------------------------------- words */
    const ST = { weight: 400, tracking: 0.01 };
    const s1 = 100 * (780 / measure("how one change", { ...ST, size: 100 }));
    const l1 = line("how one change", { ...ST, size: s1 }, "left");
    const l2 = line("affects", { ...ST, size: s1 }, "left");
    l1.group.position.set(rx(260), 0, 0);
    l2.group.position.set(rx(260), 0, 0);
    scene.add(l1.group, l2.group);
    const words = [...l1.words.map((w) => ({ w, line: 0 })), ...l2.words.map((w) => ({ w, line: 1 }))];
    const IN = [807, 809, 811, 813];
    const y1 = glide([[811, 550], [815, 500], [819, 474], [831, 466], [836, 450]]);
    const gap = glide([[815, 150], [819, 140], [831, 124]]);
    const ink = new THREE.Color("#333333");
    const grey = new THREE.Color("#8a8a8a");
    const tint = new THREE.Color();

    const ST2 = { weight: 450, tracking: 0.01 };
    const s2 = 100 * (888 / measure("Everything else", { ...ST2, size: 100 }));
    const l3 = line("Everything else", { ...ST2, size: s2 }, "center");
    l3.group.position.set(rx(980), ry(540), 0);
    scene.add(l3.group);
    const s3 = glide([[837, 1.06], [843, 1], [859, 1], [879, 1.085], [883, 1.1]]);

    return ({ frame: local }) => {
      const f = local + G0;

      /* shapes */
      const sw = sway(f);
      const ent = enter(f);
      const sk = sink(f);
      for (const s of shapes) {
        let x: number, y: number, r: number;
        if (f <= 819) {
          // the towers lean over from a pivot near the floor
          const lean = THREE.MathUtils.degToRad(sw);
          const h = 1150 - s.y0;
          x = s.x0 + ent + Math.sin(lean) * h;
          y = s.y0 + (1 - Math.cos(lean)) * h;
          r = s.r0 + sw * 1.5;
        } else if (f <= 831) {
          const p = (f - 819) / 12;
          x = lerp(s.x0 + Math.sin(THREE.MathUtils.degToRad(-10)) * (1150 - s.y0), s.xm, outCubic(p));
          y = lerp(s.y0, s.ym, inQuad(p) * 0.6 + p * 0.4);
          r = lerp(s.r0 - 15, s.rm, p);
        } else if (f <= 843) {
          const p = (f - 831) / 12;
          x = lerp(s.xm, s.x1, outCubic(p));
          y = lerp(s.ym, s.y1 - 100, outCubic(p));
          r = lerp(s.rm, s.r1, outCubic(p));
        } else {
          x = s.x1;
          y = s.y1 - sk;
          r = s.r1;
        }
        s.m.position.set(rx(x), ry(y), 0);
        s.m.rotation.z = -THREE.MathUtils.degToRad(r);
      }

      /* how one change / affects */
      const out1 = prog(f, 833, 5, outCubic);
      const baseY = y1(f);
      words.forEach(({ w, line: ln }, i) => {
        const p = prog(f, IN[i]!, 7, outCubic);
        w.position.y = ry(baseY + ln * gap(f)) - (1 - p) * 60 * PX + out1 * 20 * PX;
        tint.copy(grey).lerp(ink, prog(f, IN[i]! + 2, 6, outCubic));
        setLabel(w, { opacity: Math.min(1, p * 1.5) * (1 - out1), blur: (1 - p) * 10 + out1 * 8, color: tint });
      });

      /* Everything else */
      l3.group.visible = f >= 836;
      l3.group.scale.setScalar(s3(f));
      l3.words.forEach((w, i) => {
        const p = prog(f, 836 + i * 2.5, 7, outCubic);
        w.position.y = -(1 - p) * 40 * PX;
        tint.copy(grey).lerp(ink, prog(f, 837 + i * 2.5, 6, outCubic));
        setLabel(w, { opacity: Math.min(1, p * 1.5), blur: (1 - p) * 12, color: tint });
      });

      /* glow */
      const gp = prog(f, 866, 16, outCubic);
      glow.set(gp, (1 - gp) * -260, 0);
    };
  });
}
