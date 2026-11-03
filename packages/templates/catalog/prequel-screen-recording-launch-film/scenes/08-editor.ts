/**
 * Scene 8 — The editor. Prequel opens on the take: the Finder window on a lime
 * background, the camera in the bottom-right. The cursor selects the camera,
 * drags it to the top-left corner, pulls a handle to make it bigger; opens
 * Background and picks an aurora — the preview changes under it; clicks
 * Export, and in the modal clicks Export again: the button fills as the
 * progress bar, fast, and lands on "Exported".
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, withFonts, prog, inOutCubic, outCubic, inCubic, keyed, framing, PX } from "../components/core";
import { placeOn, makeCursor, type Rect } from "../components/page";
import { put } from "../components/mac";
import { squircleMask } from "../components/prequel";
import {
  PV, REC, PANEL, TOP_EXPORT, MODAL, MODAL_BTN, AURORA_Y, PICKED, RAIL_ICON,
  makePrequelEditor, previewBackground, recordedWindow, selectionBox, railSelect, cameraPanel, backgroundPanel,
  tileRing, tileRect, exportModal, modalButton, exportingLabel,
} from "../components/prequelEditor";
import { footage } from "../components/media";
import { BG, makeFilm } from "../components/film";
import { EDITOR_T as T } from "../components/timeline";
import webcamUrl from "../assets/webcam-man-smirk.webm";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene, camera, width, height } = ctx;
    const D = fitCamera(camera, height);
    const FR = framing(width, height);
    const fit = Math.max(0.9, FR.fit);
    const cam = camera as THREE.PerspectiveCamera;
    scene.background = new THREE.Color(BG);

    const ed = makePrequelEditor("prequel-editor");
    scene.add(ed.mesh);

    // ------------------------------------------------------------ overlays
    const bgLime = previewBackground("lime");
    const bgAurora = previewBackground("aurora", ctx.manager);
    const rec = recordedWindow();
    const sel = selectionBox();
    const railCam = railSelect("camera");
    const railImg = railSelect("image");
    const camPanel = cameraPanel();
    const bgPanel = backgroundPanel(ctx.manager);
    const ring = tileRing();
    const modal = exportModal(ctx.manager);
    const btnIdle = modalButton("idle");
    const btnTrack = modalButton("track");
    const btnFill = modalButton("fill");
    const btnDone = modalButton("done");
    // the fill is cropped from the left, never squashed
    btnFill.mesh.geometry.translate((MODAL_BTN.w * PX) / 2, 0, 0);
    const steps = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const labels = steps.map((p) => exportingLabel(p));
    const all = [bgLime, bgAurora, rec, sel, railCam, railImg, camPanel, bgPanel, ring, modal, btnIdle, btnTrack, btnFill, btnDone, ...labels];

    // the camera in the preview: a frame of the webcam take, in a squircle
    const clip = footage(ctx, webcamUrl, { size: [640, 640] });
    const bubble = new THREE.Mesh(
      new THREE.PlaneGeometry(100 * PX, 100 * PX),
      new THREE.MeshBasicMaterial({ map: clip.texture, alphaMap: squircleMask(), transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
    );
    bubble.name = "preview-camera";
    bubble.renderOrder = 5;
    ed.mesh.add(bubble);

    const cursor = makeCursor("cursor", 30);
    const film = makeFilm(scene, camera, width, height, D);

    // the camera's journey on the canvas: bottom-right → top-left, then bigger
    const START = { x: 790, y: 512, s: 150 };
    const MOVED = { x: 262, y: 236, s: 150 };
    const TL0 = { x: MOVED.x - MOVED.s / 2, y: MOVED.y - MOVED.s / 2 };
    const BR0 = { x: TL0.x + MOVED.s, y: TL0.y + MOVED.s };
    const GROW = 56;

    const bgIcon = RAIL_ICON(2);
    const camIcon = RAIL_ICON(4);
    const pick = tileRect(AURORA_Y, PICKED % 5, Math.floor(PICKED / 5));
    const pickC = { x: PANEL.x + pick.x + pick.w / 2, y: PANEL.y + pick.y + pick.h / 2 };
    const expC = { x: TOP_EXPORT.x + 50, y: TOP_EXPORT.y + TOP_EXPORT.h / 2 };
    const btnC = { x: MODAL_BTN.x + MODAL_BTN.w / 2, y: MODAL_BTN.y + MODAL_BTN.h / 2 };

    // cursor keys (frame, x, y)
    const ck: [number, number, number][] = [
      [0, 1010, 720], [24, 1010, 720], [52, START.x + 4, START.y + 4], [60, START.x + 4, START.y + 4],
      [100, MOVED.x + 4, MOVED.y + 4], [104, MOVED.x + 4, MOVED.y + 4], [116, BR0.x, BR0.y], [120, BR0.x, BR0.y],
      [140, BR0.x + GROW, BR0.y + GROW], [150, BR0.x + GROW, BR0.y + GROW], [168, bgIcon.x + 2, bgIcon.y + 2], [176, bgIcon.x + 2, bgIcon.y + 2],
      [194, pickC.x, pickC.y], [236, pickC.x, pickC.y], [254, expC.x, expC.y], [266, expC.x, expC.y],
      [296, btnC.x + 30, btnC.y + 4], [330, btnC.x + 30, btnC.y + 4], [372, btnC.x + 60, btnC.y + 40],
    ];
    const clicks = [T.clickCam, T.clickBg, T.pick, T.clickExport, T.exportBtn];
    const downs: [number, number][] = [[T.move[0]!, T.move[1]!], [T.resize[0]!, T.resize[1]! + 2]];

    // camera keys: focus point (page px), zoom
    const [o0, o1] = T.open as [number, number];
    const [v0, v1] = T.toPreview as [number, number];
    const [n0, n1] = T.toPanel as [number, number];
    const [b0, b1] = T.pullBack as [number, number];
    const [m0, m1] = T.toModal as [number, number];
    const [t0, t1] = T.toBtn as [number, number];
    const fxK: [number, number][] = [[0, 720], [v0, 720], [v1, 520], [n0, 520], [n1, 1150], [b0, 1150], [b1, 735], [m0, 735], [m1, 720], [t0, 720], [t1, btnC.x]];
    const fyK: [number, number][] = [[0, 440], [v0, 440], [v1, 368], [n0, 368], [n1, 330], [b0, 330], [b1, 400], [m0, 400], [m1, 430], [t0, 430], [t1, btnC.y - 40]];
    const zK: [number, number][] = [[0, 0.82], [v0, 0.86], [v1, 1.42], [n0, 1.48], [n1, 1.75], [b0, 1.75], [b1, 0.98], [m0, 0.98], [m1, 1.3], [t0, 1.3], [t1, 1.95], [T.length, 2.02]];
    const rxK: [number, number][] = [[0, 0.06], [v1, 0.04], [n1, 0.03], [b1, 0.02], [m1, 0.02], [t1, 0.03]];
    const ryK: [number, number][] = [[0, -0.1], [v1, -0.06], [n1, 0.07], [b1, 0.0], [m1, -0.03], [t1, 0.03]];
    const rot = new THREE.Euler();
    const tmp = new THREE.Vector3();

    return ({ frame: f }) => {
      for (const s of all) s.mesh.visible = false;
      const hx = Math.sin(f * 0.19) * 0.02 + Math.sin(f * 0.47) * 0.008;
      const hy = Math.cos(f * 0.15) * 0.016 + Math.sin(f * 0.63) * 0.006;

      const zoom = keyed(f, zK) * fit;
      rot.set(keyed(f, rxK), keyed(f, ryK), 0);
      ed.mesh.rotation.copy(rot);
      ed.mesh.position.copy(placeOn(ed, keyed(f, fxK), keyed(f, fyK), rot, tmp));
      cam.position.set(hx, hy, D / zoom);
      // the window opens: a quick scale-up out of the dark
      const op = prog(f, o0, o1 - o0, outCubic);
      ed.mesh.scale.setScalar(0.96 + 0.04 * op);
      ed.u.exposure.value = 0.86 * op;

      // the cursor
      const mx = keyed(f, ck.map(([k, x]) => [k, x]));
      const my = keyed(f, ck.map(([k, , y]) => [k, y]));
      const lastClick = clicks.filter((c) => f >= c).pop() ?? -99;
      const down = downs.some(([a, b]) => f >= a && f < b);
      cursor.group.visible = f >= 24;
      cursor.set(ed, mx, my, {
        press: f >= lastClick && f < lastClick + 3 ? 1 : down ? 0.5 : 0,
        ring: f >= lastClick && f < lastClick + 12 ? (f - lastClick) / 12 : 0,
        opacity: prog(f, 24, 6, outCubic),
      });

      // preview: background (lime → aurora), the recorded window
      const swap = prog(f, T.pick, 12, inOutCubic);
      put(ed, bgLime, PV.x, PV.y, { opacity: op });
      if (swap > 0) put(ed, bgAurora, PV.x, PV.y, { opacity: swap * op });
      put(ed, rec, REC.x, REC.y, { opacity: op });

      // the camera: where it is, how big
      let cx = START.x, cy = START.y, s = START.s;
      if (f >= T.move[0]!) {
        const d = prog(f, T.move[0]!, T.move[1]! - T.move[0]!, inOutCubic);
        cx = START.x + (MOVED.x - START.x) * d;
        cy = START.y + (MOVED.y - START.y) * d;
      }
      if (f >= T.resize[0]!) {
        const r = prog(f, T.resize[0]!, T.resize[1]! - T.resize[0]!, inOutCubic);
        s = MOVED.s + GROW * r;
        cx = TL0.x + s / 2;
        cy = TL0.y + s / 2;
      }
      bubble.position.copy(ed.local(cx, cy, 0));
      bubble.scale.setScalar(s / 100);
      (bubble.material as THREE.MeshBasicMaterial).opacity = op;
      clip.seek(4.2); // a held frame of the take: the smirk, leaned in

      // selected: the box and handles follow it until another tool is picked
      if (f >= T.clickCam && f < T.clickBg) {
        put(ed, sel, cx - (s / 100) * 58, cy - (s / 100) * 58, { scale: s / 100 });
        sel.mesh.position.copy(ed.local(cx, cy, 0));
      }

      // the rail and the panel: Camera, then Background
      const onBg = f >= T.clickBg;
      const ri = onBg ? bgIcon : camIcon;
      put(ed, onBg ? railImg : railCam, ri.x - 18, ri.y - 18, { opacity: op });
      put(ed, onBg ? bgPanel : camPanel, PANEL.x, PANEL.y, { opacity: op });
      if (f >= T.pick) put(ed, ring, PANEL.x + pick.x - 4, PANEL.y + pick.y - 4, { opacity: prog(f, T.pick, 6, outCubic) });

      // the export modal; its button is the progress bar
      if (f >= T.modal) {
        const mi = prog(f, T.modal, 10, outCubic);
        put(ed, modal, MODAL.x, MODAL.y + (1 - mi) * 14, { opacity: mi, scale: 0.97 + 0.03 * mi });
        const by = MODAL_BTN.y + (1 - mi) * 14;
        if (f < T.exportBtn + 2) {
          put(ed, btnIdle, MODAL_BTN.x, by, { opacity: mi });
        } else if (f < T.progress[1]!) {
          const p = prog(f, T.progress[0]!, T.progress[1]! - T.progress[0]!, (t) => 1 - Math.pow(1 - t, 1.6));
          put(ed, btnTrack, MODAL_BTN.x, by);
          put(ed, btnFill, MODAL_BTN.x, by);
          btnFill.mesh.position.copy(ed.local(MODAL_BTN.x, by + MODAL_BTN.h / 2, 0));
          btnFill.mesh.scale.set(Math.max(1e-4, p), 1, 1);
          btnFill.tex.repeat.x = Math.max(1e-4, p);
          put(ed, labels[Math.min(10, Math.floor(p * 10 + 1e-6))]!, MODAL_BTN.x, by);
        } else {
          const pop = prog(f, T.progress[1]!, 8, outCubic);
          put(ed, btnDone, MODAL_BTN.x, by, { scale: 1 + 0.03 * Math.sin(Math.PI * pop) });
        }
      }

      // the lens follows the hand
      const focus: Rect = f < T.toPanel[0]! ? PV
        : f < T.pullBack[0]! ? { x: PANEL.x - 60, y: PANEL.y, w: PANEL.w + 60, h: PANEL.h }
        : f < T.modal ? { x: PV.x, y: 30, w: 1290, h: PV.h + 120 }
        : MODAL;
      ed.lens(focus, 20, zoom, f >= T.pullBack[0]! && f < T.modal ? 0.25 : 0.8);

      const flash = clicks.includes(f) ? 0.035 : f === T.progress[1] ? 0.05 : 0;
      film.set(f, { flash, flashColor: "#ffffff" });
      void inCubic;
    };
  });
}
