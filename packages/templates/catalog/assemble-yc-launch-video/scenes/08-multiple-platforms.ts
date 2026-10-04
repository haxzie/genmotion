import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX } from "../components/stage";
import { glide, prog, outCubic } from "../components/ease";
import { label, measure, setLabel, withInter } from "../components/type";
import { svgTexture } from "../components/svg";
import zMarkUrl from "../assets/platform-z-mark.png";
import hubspotUrl from "../assets/hubspot.svg";
import sfWhiteUrl from "../assets/salesforce-tile-white.svg";
import sfSlateUrl from "../assets/salesforce-tile-slate.svg";
import stripeUrl from "../assets/stripe.svg";
import workdayUrl from "../assets/workday-symbol.svg";

/**
 * Global f690–f726 (scene frame = global - 690). Hard cut out at f727 (the film's midpoint).
 * "Multiple platforms" sits in a double-width cell of a hairline grid. The camera pulls back
 * hard; the platforms' marks pop in around it on the diagonals, their cells flood slate, and
 * pale cells check in further out.
 */
const G0 = 690;
const SLATE = "#4a83a0";
const PALE_CELL = "#a6c0cd";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withInter(ctx, () => {
    const { scene, camera, height } = ctx;
    scene.background = new THREE.Color("#fcfdfd");
    fitCamera(camera, height, 50);

    // everything is laid out in cell units (1 cell = 1 world unit inside `board`), scaled per frame
    const board = new THREE.Group();
    board.name = "platform-board";
    scene.add(board);
    const quad = new THREE.PlaneGeometry(1, 1);

    // hairline grid
    const lineMat = new THREE.MeshBasicMaterial({ color: "#cbe1eb", transparent: true, depthWrite: false });
    const gridLines: { m: THREE.Mesh; horiz: boolean }[] = [];
    const grid = new THREE.Group();
    grid.name = "grid";
    grid.userData.pickable = false;
    for (let k = -8; k <= 8; k++) {
      const h = new THREE.Mesh(quad, lineMat);
      h.position.set(0, k + 0.5, 0);
      h.scale.set(40, 1, 1);
      const v = new THREE.Mesh(quad, lineMat);
      v.position.set(k, 0, 0);
      v.scale.set(1, 40, 1);
      grid.add(h, v);
      gridLines.push({ m: h, horiz: true }, { m: v, horiz: false });
    }
    board.add(grid);
    // the text cell hides the grid line that would split it
    const textCell = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ color: "#fcfdfd", depthWrite: false }));
    textCell.name = "text-cell";
    textCell.scale.set(1.94, 0.94, 1);
    textCell.position.z = 0.001;
    board.add(textCell);
    const cornerMat = new THREE.MeshBasicMaterial({ color: SLATE, transparent: true, depthWrite: false });
    const corners = [[-1, -0.5], [1, -0.5], [-1, 0.5], [1, 0.5]].map(([x, y]) => {
      const c = new THREE.Mesh(quad, cornerMat);
      c.position.set(x!, y!, 0.003);
      board.add(c);
      return c;
    });

    // pale cells: [left col edge, row] with row + = down; appear at
    const PALES: [number, number, number][] = [[2, -2, 709], [2, 2, 710], [-1, -2, 715], [-4, -1, 716], [-3, 2, 717], [2, 0, 722]];
    const paleMat = new THREE.MeshBasicMaterial({ color: PALE_CELL, transparent: true, depthWrite: false });
    const pales = PALES.map(([c, r, t], i) => {
      const m = new THREE.Mesh(quad, paleMat.clone());
      m.name = `pale-cell-${i + 1}`;
      m.position.set(c + 0.5, -r, 0.002);
      board.add(m);
      return { m, t };
    });

    // platform marks: [name, url, col left edge, row, pop frame, flood frame, size (cells)]
    const PLATFORMS: [string, string, number, number, number, number, number][] = [
      ["z-mark", zMarkUrl, -2, -1, 690, 697, 0.48],
      ["hubspot", hubspotUrl, -2, 1, 692.5, 697.5, 0.5],
      ["salesforce", sfWhiteUrl, 1, -1, 694.5, 702, 0.72],
      ["stripe", stripeUrl, 1, 1, 693, 702.5, 0.46],
      ["workday", workdayUrl, -3, 0, 702, 703, 0.46],
    ];
    const marks = PLATFORMS.map(([name, url, c, r, pop, flood, size]) => {
      const g = new THREE.Group();
      g.name = `platform-${name}`;
      g.position.set(c + 0.5, -r, 0.004);
      const tile = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ color: SLATE, transparent: true, depthWrite: false }));
      tile.name = `${name}-cell`;
      // white-on-transparent marks are tinted slate for the unflooded state
      const tinted = name === "workday" || name === "z-mark";
      let slateTex: THREE.Texture, whiteTex: THREE.Texture;
      if (name === "z-mark") {
        slateTex = whiteTex = new THREE.TextureLoader(ctx.manager).load(url);
        slateTex.colorSpace = THREE.SRGBColorSpace;
      } else if (name === "salesforce") {
        slateTex = svgTexture(ctx, sfSlateUrl, 240);
        whiteTex = svgTexture(ctx, url, 240);
      } else {
        slateTex = svgTexture(ctx, url, 240, name === "workday" ? undefined : SLATE);
        whiteTex = svgTexture(ctx, url, 240, name === "workday" ? undefined : "#ffffff");
      }
      const aspect = name === "workday" ? 209 / 195 : name === "salesforce" ? 191 / 273 : name === "z-mark" ? 362 / 366 : 1;
      const markSlate = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ map: slateTex, transparent: true, depthWrite: false, color: tinted ? SLATE : "#ffffff" }));
      const markWhite = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ map: whiteTex, transparent: true, depthWrite: false }));
      markSlate.name = `${name}-logo`;
      markWhite.name = `${name}-logo-white`;
      for (const m of [markSlate, markWhite]) {
        m.scale.set(size, size * aspect, 1);
        m.position.z = 0.001;
      }
      g.add(tile, markSlate, markWhite);
      board.add(g);
      return { g, tile, markSlate, markWhite, pop, flood };
    });

    // the words
    const TXT = { weight: 450, tracking: -0.005 };
    const REF_C = 382; // cell px the type was measured at
    const size = 100 * ((1.74 * REF_C) / measure("platforms", { ...TXT, size: 100 }));
    const w1 = label("Multiple", { ...TXT, size, color: SLATE }, "center", 40);
    const w2 = label("platforms", { ...TXT, size, color: SLATE }, "center", 40);
    w1.name = "multiple";
    w2.name = "platforms";
    const k = 1 / (REF_C * PX); // world -> cell units
    for (const [w, y] of [[w1, (458 - 540) / REF_C], [w2, (600 - 540) / REF_C]] as const) {
      w.scale.setScalar(k);
      w.position.set(0, -y, 0.01);
      board.add(w);
    }

    const cell = glide([[689, 640], [690, 600], [692, 504], [695, 454], [700, 436], [706, 382], [709, 300], [712, 259], [716, 245], [720, 235], [726, 212], [727, 208]]);

    return ({ frame: local }) => {
      const f = local + G0;
      const c = cell(f);
      board.scale.setScalar(c * PX);
      board.position.set(0, 0, 0);
      // hairlines stay 2px on screen
      const t = 3 / c;
      for (const { m, horiz } of gridLines) {
        if (horiz) m.scale.y = t;
        else m.scale.x = t;
      }
      lineMat.opacity = 0.9;
      const cs = 11 / c;
      corners.forEach((m) => m.scale.set(cs, cs, 1));
      cornerMat.opacity = 1 - prog(f, 707, 4, outCubic);

      // words: "Multiple" arrives very blurred, "platforms" a beat ahead of it
      const p1 = prog(f, 690, 5.5, outCubic);
      const p2 = prog(f, 690, 2.5, outCubic);
      setLabel(w1, { opacity: Math.min(1, 0.3 + p1), blur: (1 - p1) * 40 });
      setLabel(w2, { opacity: Math.min(1, 0.3 + p2), blur: (1 - p2) * 36 });

      for (const mk of marks) {
        const p = prog(f, mk.pop, 5, outCubic);
        const fl = prog(f, mk.flood, 3, outCubic);
        mk.g.visible = p > 0.01;
        mk.g.scale.setScalar(0.3 + 0.7 * p);
        (mk.tile.material as THREE.MeshBasicMaterial).opacity = fl;
        (mk.markSlate.material as THREE.MeshBasicMaterial).opacity = p * (1 - fl);
        (mk.markWhite.material as THREE.MeshBasicMaterial).opacity = p * fl;
      }
      for (const pc of pales) {
        const p = prog(f, pc.t, 3, outCubic);
        pc.m.visible = p > 0.01;
        (pc.m.material as THREE.MeshBasicMaterial).opacity = p;
      }
    };
  });
}
