/**
 * Scene 7 — Record. Back on the same dark desktop, past midnight. Prequel's
 * toolbar rises above the dock; the cursor picks window mode, crosses to the
 * Finder window, and Prequel's picker lights it up: Finder · Recordings ·
 * 1400 × 860 · Start recording. Click — and a camera squircle pops up in the
 * screen's bottom-right corner. The camera pans to it: a man, amused, leaning
 * in. Then across to Prequel's recording panel, where the cursor clicks stop.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, withFonts, prog, inOutCubic, outCubic, inCubic, keyed, framing, PX } from "../components/core";
import { placeOn, makeCursor, mousePath, type Rect } from "../components/page";
import { DOCK_Y, SW, SH, makeDesktop, put, at } from "../components/mac";
import { prequelToolbar, windowPicker, recordingPanel, squircleMask } from "../components/prequel";
import { footage } from "../components/media";
import { BG, makeFilm } from "../components/film";
import { REC_T as T } from "../components/timeline";
import webcamUrl from "../assets/webcam-man-smirk.webm"; // take B: amused smirk, leans in

/** the Finder window drawn into the desktop (see drawDesktop) */
const WIN: Rect = { x: 150, y: 150, w: 700, h: 430 };
/** the camera bubble: a squircle in the screen's bottom-right corner */
const CAM = 200;
const CAM_RECT: Rect = { x: SW - 28 - CAM, y: SH - 28 - CAM, w: CAM, h: CAM };

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene, camera, width, height, fps } = ctx;
    const D = fitCamera(camera, height);
    const FR = framing(width, height);
    const fit = Math.max(0.9, FR.fit);
    const cam = camera as THREE.PerspectiveCamera;
    scene.background = new THREE.Color(BG);

    const desk = makeDesktop("desktop", { clock: "Wed Nov 5  12:03 AM" }, ctx.manager);
    scene.add(desk.mesh);

    const barIdle = prequelToolbar("none");
    const barWin = prequelToolbar("window");
    const BX = (SW - barIdle.w) / 2;
    const BY = DOCK_Y - 16 - barIdle.h;
    const winBtn = at(barIdle, "window", BX, BY);
    const picker = windowPicker(WIN.w, WIN.h, "Finder", "Recordings", "1400 × 860", ctx.manager);
    const start = at(picker, "start", WIN.x, WIN.y);

    // the recording panel takes the toolbar's place, one sprite per second of the timer
    const panels = Array.from({ length: 10 }, (_, i) => recordingPanel(i));
    const PX0 = (SW - panels[0]!.w) / 2;
    const PY0 = BY + (barIdle.h - panels[0]!.h) / 2;
    const stopBtn = at(panels[0]!, "stop", PX0, PY0);
    const all = [barIdle, barWin, picker, ...panels];

    // the camera bubble: the generated webcam clip, seeked from the frame, in a squircle
    const clip = footage(ctx, webcamUrl, { size: [640, 640] });
    const bubble = new THREE.Mesh(
      new THREE.PlaneGeometry(CAM * PX, CAM * PX),
      new THREE.MeshBasicMaterial({ map: clip.texture, alphaMap: squircleMask(), transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
    );
    bubble.name = "webcam-bubble";
    bubble.renderOrder = 5;
    const rim = new THREE.Mesh(
      new THREE.PlaneGeometry((CAM + 6) * PX, (CAM + 6) * PX),
      new THREE.MeshBasicMaterial({ color: "#000000", alphaMap: squircleMask(), transparent: true, opacity: 0.45, depthTest: false, depthWrite: false }),
    );
    rim.name = "webcam-bubble-shadow";
    rim.renderOrder = 4;
    rim.userData.pickable = false;
    desk.mesh.add(rim, bubble);
    const camC = { x: CAM_RECT.x + CAM / 2, y: CAM_RECT.y + CAM / 2 };

    const cursor = makeCursor("cursor", 30);
    const film = makeFilm(scene, camera, width, height, D);

    const [w0, w1] = T.toWindow as [number, number];
    const [p0, p1] = T.push as [number, number];
    const [c0, c1] = T.toCam as [number, number];
    const [r0, r1] = T.toPanel as [number, number];
    const zoomK: [number, number][] = [
      [0, 2.45], [w0, 2.6], [w1, 1.42], [p0, 1.42], [p1, 2.05], [c0, 2.05], [c1, 2.9], [r0, 3.1], [r1, 2.7], [T.length, 2.8],
    ];
    const fxK: [number, number][] = [
      [0, SW / 2], [w0, winBtn.x], [w1, WIN.x + WIN.w / 2], [p0, WIN.x + WIN.w / 2], [p1, start.x], [c0, start.x], [c1, camC.x - 60], [r0, camC.x - 60], [r1, stopBtn.x - 40],
    ];
    const fyK: [number, number][] = [
      [0, BY + 10], [w0, BY + 10], [w1, WIN.y + WIN.h / 2], [p0, WIN.y + WIN.h / 2], [p1, start.y - 40], [c0, start.y - 40], [c1, camC.y - 40], [r0, camC.y - 40], [r1, stopBtn.y - 30],
    ];
    const rxK: [number, number][] = [[0, 0.07], [w0, 0.07], [w1, 0.04], [p1, 0.02], [c0, 0.02], [c1, 0.04], [r0, 0.04], [r1, 0.05]];
    const ryK: [number, number][] = [[0, -0.12], [w0, -0.12], [w1, 0.08], [p1, 0.03], [c0, 0.03], [c1, -0.08], [r0, -0.08], [r1, 0.06]];
    const rot = new THREE.Euler();
    const tmp = new THREE.Vector3();

    return ({ frame: f }) => {
      for (const s of all) s.mesh.visible = false;
      const hx = Math.sin(f * 0.19) * 0.02 + Math.sin(f * 0.47) * 0.008;
      const hy = Math.cos(f * 0.15) * 0.016 + Math.sin(f * 0.63) * 0.006;

      const zoom = keyed(f, zoomK) * fit;
      rot.set(keyed(f, rxK), keyed(f, ryK), 0);
      desk.mesh.rotation.copy(rot);
      desk.mesh.position.copy(placeOn(desk, keyed(f, fxK), keyed(f, fyK), rot, tmp));
      cam.position.set(hx, hy, D / zoom);
      desk.u.exposure.value = 0.82 * (0.4 + 0.6 * prog(f, 0, 8, outCubic));

      // the toolbar: rises in, takes the window-mode click, leaves when recording starts
      const bin = prog(f, T.barIn, 12, outCubic);
      const bout = prog(f, T.start + 2, 6, inCubic);
      const bar = f >= T.clickWindow ? barWin : barIdle;
      if (bout < 1) put(desk, bar, BX, BY + (1 - bin) * 24, { opacity: bin * (1 - bout) });

      // the picker lights the window while the pointer is over it
      const hov = prog(f, T.hover, 6, outCubic) * (1 - prog(f, T.start + 2, 4, inCubic));
      if (hov > 0) put(desk, picker, WIN.x, WIN.y, { opacity: hov });

      // recording: the panel replaces the toolbar and its timer runs until stop
      const recording = f >= T.start + 6;
      const pin = prog(f, T.start + 6, 8, outCubic);
      const pout = prog(f, T.stop + 2, 6, inCubic);
      if (recording && pout < 1) {
        const sec = Math.min(panels.length - 1, Math.floor((Math.min(f, T.stop) - T.start) / fps));
        put(desk, panels[sec]!, PX0, PY0 + (1 - pin) * 16, { opacity: pin * (1 - pout) });
      }

      // the camera bubble pops up in the corner, plays the take, and goes when the recording stops
      const cin = prog(f, T.camIn, 12, (t) => {
        const o = outCubic(t);
        return o + Math.sin(Math.PI * o) * 0.08; // a little overshoot
      });
      const cout = prog(f, T.stop + 2, 8, inCubic);
      const cs = Math.max(1e-4, (0.55 + 0.45 * cin) * (1 - cout));
      const showCam = f >= T.camIn && cout < 1;
      bubble.visible = rim.visible = showCam;
      if (showCam) {
        bubble.position.copy(desk.local(camC.x, camC.y, 0));
        rim.position.copy(desk.local(camC.x, camC.y + 4, 0));
        bubble.scale.setScalar(cs);
        rim.scale.setScalar(cs);
        (bubble.material as THREE.MeshBasicMaterial).opacity = Math.min(1, cin * 1.5) * (1 - cout);
        (rim.material as THREE.MeshBasicMaterial).opacity = 0.45 * Math.min(1, cin * 1.5) * (1 - cout);
      }
      clip.seek(T.camFrom + Math.max(0, f - T.camIn) / fps);

      // the lens: toolbar → window → picker card → the bubble → the panel
      const card: Rect = { x: start.x - 110, y: start.y - 190, w: 220, h: 220 };
      const panelRect: Rect = { x: PX0, y: PY0, w: panels[0]!.w, h: panels[0]!.h };
      const focus: Rect = f < w0 + 14 ? { x: BX, y: BY, w: barIdle.w, h: barIdle.h }
        : f < T.hover ? WIN
        : f < c0 ? card
        : f < r0 + 10 ? CAM_RECT
        : panelRect;
      desk.lens(focus, 14, zoom, f < w0 + 14 ? 1 : f < T.hover ? 0.6 : f < c0 ? 0.6 + 0.3 * hov : 1);

      // the cursor: window mode, Start recording, then — after the take — stop
      let mx: number, my: number;
      if (f < T.clickWindow + 6) {
        const pt = mousePath(prog(f, T.barIn + 6, T.clickWindow - 5 - T.barIn - 6, inOutCubic), winBtn.x + 120, winBtn.y - 90, winBtn.x + 3, winBtn.y + 3, 0.1);
        mx = pt.x; my = pt.y;
      } else if (f < T.start + 6) {
        const pt = mousePath(prog(f, T.clickWindow + 8, T.start - 5 - T.clickWindow - 8, inOutCubic), winBtn.x + 3, winBtn.y + 3, start.x + 6, start.y + 4, 0.14);
        mx = pt.x; my = pt.y;
      } else {
        const pt = mousePath(prog(f, r0 + 4, T.stop - 5 - r0 - 4, inOutCubic), start.x + 6, start.y + 4, stopBtn.x - 14, stopBtn.y + 3, 0.12);
        mx = pt.x; my = pt.y;
      }
      const c = f < T.start ? T.clickWindow : f < T.stop ? T.start : T.stop;
      const press = f >= c && f < c + 3 ? 1 : 0;
      cursor.set(desk, mx, my, { press, ring: f >= c ? (f - c) / 12 : 0 });

      const flash = f === T.clickWindow || f === T.stop ? 0.04 : f >= T.start && f < T.start + 3 ? 0.08 : 0;
      film.set(f, { flash, flashColor: f >= T.start && f < T.stop ? "#ff5a4f" : "#ffffff" });
    };
  });
}
