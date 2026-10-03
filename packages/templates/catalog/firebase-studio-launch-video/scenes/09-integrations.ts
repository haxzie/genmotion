/**
 * 09 — Integrations ring (film frames 951–979, 24 fps)
 * The Fireworks tile at the centre of a hairline cross, eight integration
 * tiles on a rigid ring 45° apart, spiralling in and turning clockwise.
 * Ring angle, radius and tile size are measured per frame off the reference;
 * the tile artwork is cropped from the reference itself (assets/integrations).
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { pixelStage, sx, sy } from "../components/stage";
import { withBrandFonts } from "../components/brand";
import { rrect } from "../components/rect";
import { sampled } from "../components/ease";
import { INTEGRATIONS } from "../components/integrations";
import { flame } from "../components/firebase";
import { C } from "../components/brand";
import { canvasTexture, rrPath } from "../components/ui";

const START = 951;

function solid(w: number, h: number, color: string, name: string, order: number) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
  );
  m.name = name;
  m.renderOrder = order;
  return m;
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withBrandFonts(ctx, () => {
    const { scene } = ctx;
    pixelStage(ctx, "#ffffff");

    // ---- the hairline cross and its corner dots
    const cell = solid(1, 1, "#fbfbfb", "centre-cell", 1);
    const lines = ["left", "right", "top", "bottom"].map((n) => solid(1, 1, "#e6e6e6", `cross-line-${n}`, 2));
    const dots = [0, 1, 2, 3].map((i) => solid(11, 11, C.orange, `cross-dot-${i + 1}`, 3));
    scene.add(cell, ...lines, ...dots);

    // ---- centre tile
    const halo = rrect("firebase-tile-halo", 100, 100, 40, "#f9f9f9");
    halo.set({ stroke: "#efefef", strokeA: 1, strokeW: 1.5 });
    halo.renderOrder = 4;
    const tile = rrect("firebase-tile", 100, 100, 30, "#ffffff");
    tile.set({ stroke: "#ededed", strokeA: 1, strokeW: 1.2 });
    tile.renderOrder = 5;
    const logo = flame(150, "firebase-tile-flame");
    scene.add(halo, tile, logo.group);

    // ---- the ring: white tiles carrying each platform's real mark in its brand colour
    const ring = INTEGRATIONS.map((it, idx) => {
      const T = 148;
      const tex = canvasTexture(T, T, (g) => {
        g.beginPath();
        rrPath(g, 1, 1, T - 2, T - 2, 32);
        g.fillStyle = "#ffffff";
        g.fill();
        g.strokeStyle = "#ececec";
        g.lineWidth = 1.5;
        g.stroke();
        g.save();
        g.translate(T / 2 - 34, T / 2 - 34);
        g.scale(68 / 24, 68 / 24);
        g.fillStyle = it.color;
        g.fill(new Path2D(it.d));
        g.restore();
      });
      const shadow = rrect(`${it.name}-shadow`, 150, 150, 32, "#000000", 0.06);
      shadow.renderOrder = 7;
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(T, T),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
      );
      m.name = `integration-${it.name}`;
      m.renderOrder = 8;
      const r = { name: it.name, k: idx - 3 };
      scene.add(shadow, m);
      return { ...r, m, shadow };
    });

    // ---- measured tracks
    const angle = sampled([[951, -15.4], [952, -6.6], [953, 0.2], [954, 5.4], [955, 9.6], [956, 13.1], [957, 16.2], [958, 18.7], [959, 21.0], [960, 23.0], [961, 24.8], [962, 26.4], [963, 27.8], [964, 29.0], [965, 30.2], [966, 31.2], [967, 32.2], [968, 33.0], [969, 33.8], [970, 34.5], [971, 35.2], [972, 35.9], [973, 36.7], [974, 37.4], [975, 38.1], [976, 38.9], [977, 39.6], [978, 40.3], [979, 41.1]]);
    const radius = sampled([[951, 568], [952, 534], [953, 509], [954, 490], [955, 475], [956, 464], [957, 454], [958, 447], [959, 441], [960, 436], [961, 432], [962, 429], [963, 426], [964, 424], [965, 422], [966, 420], [967, 419], [973, 419], [974, 418], [975, 416], [976, 414], [977, 411], [978, 407], [979, 399]]);
    const size = sampled([[951, 148], [975, 148], [976, 146], [977, 145], [978, 143], [979, 140]]);
    const lineX = sampled([[951, 680.5], [952, 693.5], [953, 702.5], [954, 709.5], [955, 714.5], [956, 718.5], [958, 724.5], [961, 730.5], [962, 731.5], [963, 732.5], [964, 733.5], [966, 734.5], [973, 735.5], [975, 736.5], [976, 737.5], [977, 739.5], [978, 742], [979, 745.5]]);
    const lineY = sampled([[951, 327.5], [952, 324.5], [953, 322.5], [954, 320.5], [955, 319.5], [956, 318.5], [958, 317.5], [960, 316.5], [962, 315.5], [973, 315.5], [975, 316.5], [976, 317.5], [977, 319.5], [978, 322], [979, 325.5]]);
    const tileS = sampled([[951, 360], [953, 324], [956, 296], [960, 286], [966, 280], [972, 280], [977, 284], [979, 290]]);
    const haloS = sampled([[951, 436], [953, 400], [956, 368], [960, 350], [966, 340], [972, 340], [977, 344], [979, 348]]);
    const markW = sampled([[951, 106], [956, 128], [962, 132], [970, 138], [978, 136]]);

    return ({ frame: local }) => {
      const F = local + START;
      const x0 = lineX(F), x1 = 1920 - x0 + 0.5, y0 = lineY(F), y1 = 1080 - y0 + 0.5;
      cell.scale.set(x1 - x0, y1 - y0, 1);
      cell.position.set(sx((x0 + x1) / 2), sy((y0 + y1) / 2), 0);
      const [l, r, t, b] = lines as unknown as [THREE.Mesh, THREE.Mesh, THREE.Mesh, THREE.Mesh];
      l.scale.set(1, 1080, 1); l.position.set(sx(x0), 0, 0);
      r.scale.set(1, 1080, 1); r.position.set(sx(x1), 0, 0);
      t.scale.set(1920, 1, 1); t.position.set(0, sy(y0), 0);
      b.scale.set(1920, 1, 1); b.position.set(0, sy(y1), 0);
      [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].forEach(([x, y], i) => dots[i]!.position.set(sx(x!), sy(y!), 0));

      const ts = tileS(F), hs = haloS(F);
      halo.set({ w: hs * 1.08, h: hs * 0.86, r: hs * 0.24 });
      tile.set({ w: ts * 1.14, h: ts * 0.94, r: ts * 0.2 });
      halo.position.set(0, 0, 0);
      tile.position.set(0, 0, 0);
      logo.group.scale.setScalar(markW(F) / 138);
      logo.group.position.set(0, 0, 0);

      const a0 = angle(F), R = radius(F), s = size(F) / 148;
      for (const it of ring) {
        const a = THREE.MathUtils.degToRad(a0 + 45 * it.k);
        const x = 960 + R * Math.cos(a), y = 540 + R * Math.sin(a);
        it.m.scale.setScalar(s);
        it.m.position.set(sx(x), sy(y), 0);
        it.shadow.set({ w: 150 * s, h: 150 * s, r: 32 * s });
        it.shadow.position.set(sx(x), sy(y + 3), 0);
      }
    };
  });
}
