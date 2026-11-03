/**
 * Scene 4 — The edit. A Premiere-style timeline: the playhead dragged back and
 * forth, three razor cuts, a slice lifted onto V2. Then the evening goes in
 * cuts — the counter in the letterbox becomes a clock, 6:24 PM… 11:09 PM — and
 * the export dialog arrives: 97%, 98%, 99%… while the time remaining only grows.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, withFonts, prog, inOutCubic, inOutSine, outCubic, inCubic, lerp, keyed, framing, rng, PX } from "../components/core";
import { placeOn, makeCursor, mousePath, type Rect } from "../components/page";
import { put, at } from "../components/mac";
import { BLUE, TL, makeEditor, playhead, cutLine, clipPiece, gapPatch, exportDialog, makeTimecode, timecode, secAt } from "../components/editor";
import { BG, INK, MUTED, hudLabel, makeFilm, makeCounter } from "../components/film";
import { EDIT_T as T } from "../components/timeline";

const CLOCKS = ["6:24 PM", "7:10 PM", "7:58 PM", "8:45 PM", "9:30 PM", "10:22 PM", "11:09 PM"];
const FINAL_CLOCK = "11:47 PM";
const EXPORT_STATES: [number, string][] = [[97, "00:04:12"], [98, "00:09:40"], [99, "00:31:07"], [99, "02:14:55"]];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene, camera, width, height } = ctx;
    const D = fitCamera(camera, height);
    const FR = framing(width, height);
    const cam = camera as THREE.PerspectiveCamera;
    scene.background = new THREE.Color(BG);
    const fit = Math.max(0.9, FR.fit);

    const ed = makeEditor("premiere-editor");
    scene.add(ed.mesh);

    // ------------------------------------------------------------ overlays
    const ph = playhead();
    const tc = makeTimecode("timeline-timecode", 22, BLUE);
    tc.group.position.copy(ed.local(394, 510, 0));
    ed.mesh.add(tc.group);

    const CUTS = [1010, 1080, 1150];
    const r = rng(2347);
    const pool = [...CUTS, ...Array.from({ length: 27 }, () => TL.x0 + 20 + r() * (TL.x1 - TL.x0 - 40))];
    const cuts = pool.map((_, i) => cutLine(i + 1));
    const [V1top] = TL.tracks.V1!;
    const placeCut = (i: number) => put(ed, cuts[i]!, pool[i]! - 3, V1top);

    const piece = clipPiece(CUTS[1]! - CUTS[0]!);
    const gap = gapPatch(CUTS[1]! - CUTS[0]! - 2);
    const dialogs = EXPORT_STATES.map(([p, t]) => exportDialog(p, t));
    const DLG = { x: 720 - dialogs[0]!.w / 2, y: 470 - dialogs[0]!.h / 2 };
    const cancel = at(dialogs[0]!, "cancel", DLG.x, DLG.y);

    const cursor = makeCursor("cursor", 30);
    const film = makeFilm(scene, camera, width, height, D);

    // the letterbox: ATTEMPTS 37 carries over, then becomes a clock
    const attempts = makeCounter(film, width, height, "ATTEMPTS", [37]);
    const barY = -(height / 2 - (height * FR.bar) / 2) * PX;
    const clockEyebrow = hudLabel("TIME", 28, MUTED, { weight: 500, tracking: 0.16, align: "left", name: "clock-label" });
    clockEyebrow.position.set(FR.hudX * PX, barY, 0);
    film.hud.add(clockEyebrow);
    const clockLabels = [...CLOCKS, FINAL_CLOCK].map((c) => {
      const m = hudLabel(c, 40, INK, { weight: 500, align: "left", name: `clock-${c.replace(/[^0-9a-z]+/gi, "-").toLowerCase()}` });
      m.position.set(FR.hudX * PX + clockEyebrow.textWidth * PX + 26 * PX, barY - 1 * PX, 0);
      film.hud.add(m);
      return m;
    });

    // the evening, as shots
    const hr = rng(1147);
    let hf = T.hours.start;
    const hours = T.hours.lengths.map((len, i) => {
      const s = {
        start: hf, end: hf + len, clock: i,
        rot: new THREE.Euler((hr() - 0.5) * 0.2, (hr() - 0.5) * 0.3, (hr() - 0.5) * 0.05),
        fx: 640 + hr() * 700, fy: 590 + hr() * 120, zoom: 2.0 + hr() * 0.6, ph: TL.x0 + 60 + hr() * 780,
        cuts: 6 + i * 3, cx: 0, cy: 0,
      };
      s.cx = s.fx + (hr() - 0.5) * 80;
      s.cy = TL.tracks.V1![0] + 18;
      hf += len;
      return s;
    });

    const rot = new THREE.Euler();
    const tmp = new THREE.Vector3();
    const frameOn = (fx: number, fy: number, e: THREE.Euler | [number, number, number]) => {
      if (Array.isArray(e)) rot.set(e[0], e[1], e[2]);
      else rot.copy(e);
      ed.mesh.rotation.copy(rot);
      ed.mesh.position.copy(placeOn(ed, fx, fy, rot, tmp));
    };
    const all = [ph, piece, gap, ...cuts, ...dialogs];
    const phKeys: [number, number][] = [[0, 840], [16, 1180], [32, 720], [50, 1000], [66, 960]];
    const PARK = 960;
    const DROP_DX = -40; // lands in the empty stretch of V2, clear of the titles

    return ({ frame: f }) => {
      for (const s of all) s.mesh.visible = false;
      cursor.group.visible = true;
      const hx = Math.sin(f * 0.19) * 0.025 + Math.sin(f * 0.47) * 0.01;
      const hy = Math.cos(f * 0.15) * 0.02 + Math.sin(f * 0.63) * 0.008;
      ed.u.exposure.value = 0.82;
      let flash = 0;
      let grain = 0.07;
      let clock = -1;

      // what has been done to the timeline by now
      const nCuts = f >= T.hours.start ? -1 : CUTS.filter((_, i) => f >= T.razor.cuts[i]!).length;
      const lifted = f >= T.move.grab;

      if (f < T.razor.start) {
        // -------------------------------------------- scrub the playhead
        const x = keyed(f, phKeys);
        put(ed, ph, x - 8, TL.ruler[0]);
        tc.set(timecode(secAt(x)));
        const zoom = lerp(1.9, 2.05, prog(f, 0, T.razor.start, inOutSine)) * fit;
        frameOn(lerp(900, x, 0.45), 610, [0.06, -0.1, 0.01]);
        cam.position.set(hx, hy, D / zoom);
        ed.lens({ x: x - 70, y: 500, w: 140, h: 290 }, 10, zoom, lerp(0.5, 1, prog(f, 0, 20, inOutCubic)));
        ed.u.exposure.value = 0.82 * prog(f, 0, 5, outCubic);
        cursor.set(ed, x + 3, TL.ruler[0] + 8, { press: f >= 4 ? 0.5 : 0, opacity: prog(f, 0, 4, outCubic) });
      } else if (f < T.move.start) {
        // ------------------------------------------------ three razor cuts
        const { start, end, cuts: clicks } = T.razor;
        const p = (f - start) / (end - start);
        put(ed, ph, PARK - 8, TL.ruler[0]);
        tc.set(timecode(secAt(PARK)));
        const zoom = lerp(2.3, 2.5, inOutSine(p)) * fit;
        frameOn(lerp(1050, 1110, inOutSine(p)), 645, [0.05, 0.1, -0.01]);
        cam.position.set(hx, hy, D / zoom);
        let i = clicks.findIndex((c) => f < c + 4);
        if (i < 0) i = clicks.length - 1;
        const prevX = i === 0 ? PARK + 10 : CUTS[i - 1]!;
        const prevY = i === 0 ? TL.ruler[0] + 10 : 640;
        const segStart = i === 0 ? start : clicks[i - 1]! + 4;
        const t = prog(f, segStart, clicks[i]! - 3 - segStart, inOutCubic);
        const pt = mousePath(t, prevX, prevY, CUTS[i]!, 640, 0.15);
        const c = clicks[i]!;
        cursor.set(ed, pt.x, pt.y, { press: f >= c && f < c + 3 ? 1 : 0, ring: f >= c ? (f - c) / 12 : 0 });
        ed.lens({ x: pt.x - 90, y: TL.tracks.V1![0], w: 180, h: 90 }, 10, zoom, 1);
        flash = clicks.includes(f) ? 0.04 : 0;
        for (let k = 0; k < nCuts; k++) placeCut(k);
      } else if (f < T.hours.start) {
        // --------------------------------------------- lift a slice onto V2
        const { start, end, grab, drop } = T.move;
        const p = (f - start) / (end - start);
        put(ed, ph, PARK - 8, TL.ruler[0]);
        tc.set(timecode(secAt(PARK)));
        const zoom = lerp(2.5, 2.7, inOutSine(p)) * fit;
        frameOn(lerp(1060, 1020, prog(f, start, end - start, inOutSine)), 628, [0.04, -0.07, 0]);
        cam.position.set(hx, hy, D / zoom);
        for (let k = 0; k < 3; k++) placeCut(k);
        const gx = (CUTS[0]! + CUTS[1]!) / 2;
        let mx: number, my: number;
        if (f < grab) {
          const pt = mousePath(prog(f, start, grab - 4 - start, inOutCubic), CUTS[2]!, 640, gx, 636, 0.12);
          mx = pt.x; my = pt.y;
        } else {
          const d = prog(f, grab + 2, drop - grab - 4, inOutCubic);
          mx = lerp(gx, gx + DROP_DX, d);
          my = lerp(636, 600, d);
        }
        if (lifted) {
          put(ed, gap, CUTS[0]! + 1, V1top);
          const dx = f < drop ? mx - gx : DROP_DX;
          const dy = f < drop ? my - 636 : -36;
          put(ed, piece, CUTS[0]! + dx, V1top + dy, { opacity: f < drop ? 0.92 : 1 });
        }
        cursor.set(ed, mx, my, { press: f >= grab && f < drop ? 0.5 : 0 });
        ed.lens({ x: mx - 100, y: 580, w: 200, h: 120 }, 10, zoom, 1);
      } else if (f < T.export.start) {
        // ------------------------------------------- the evening, in cuts
        const i = hours.findIndex((h) => f >= h.start && f < h.end);
        const h = hours[Math.max(0, i)]!;
        clock = h.clock;
        const zoom = h.zoom * (1 + 0.04 * ((f - h.start) / (h.end - h.start))) * fit;
        frameOn(h.fx, h.fy, h.rot);
        cam.position.set(hx * 2.5, hy * 2.5, D / zoom);
        put(ed, ph, h.ph - 8, TL.ruler[0]);
        tc.set(timecode(secAt(h.ph)));
        for (let k = 0; k < Math.min(cuts.length, h.cuts); k++) placeCut(k);
        put(ed, gap, CUTS[0]! + 1, V1top);
        put(ed, piece, CUTS[0]! + DROP_DX, V1top - 36);
        cursor.set(ed, h.cx, h.cy, { press: f - h.start < 2 ? 1 : 0, ring: (f - h.start) / 10 });
        ed.lens({ x: h.cx - 120, y: 560, w: 240, h: 160 }, 10, zoom, 1);
        flash = f === h.start ? 0.05 : 0;
        grain = 0.09;
      } else {
        // ------------------------------------------------ export: 99%…
        const { start, tick } = T.export;
        clock = CLOCKS.length;
        const p = prog(f, start, 300 - start, inOutSine);
        const zoom = lerp(1.95, 2.25, p) * fit;
        frameOn(720, 470, [0.03, -0.06, 0]);
        cam.position.set(hx * 0.7, hy * 0.7, D / zoom);
        put(ed, ph, 1340 - 8, TL.ruler[0]);
        tc.set(timecode(secAt(1340)));
        for (let k = 0; k < cuts.length; k++) placeCut(k);
        put(ed, gap, CUTS[0]! + 1, V1top);
        put(ed, piece, CUTS[0]! + DROP_DX, V1top - 36);
        let s = 0;
        tick.forEach((t, k) => { if (f >= t) s = k; });
        const din = prog(f, start, 10, outCubic);
        put(ed, dialogs[s]!, DLG.x, DLG.y + (1 - din) * 30, { opacity: din });
        const dRect: Rect = { x: DLG.x, y: DLG.y, w: dialogs[0]!.w, h: dialogs[0]!.h };
        ed.lens(dRect, 6, zoom, 1);
        ed.u.exposure.value = 0.82 * (1 - 0.25 * din);
        // the cursor drifts toward Cancel, and doesn't press it
        const pt = mousePath(prog(f, start + 6, 50, inOutCubic), 1120, 700, cancel.x + 18, cancel.y + 26, 0.1);
        const hover = f > start + 56 ? Math.sin((f - start - 56) * 0.35) * 1.5 : 0;
        cursor.set(ed, pt.x + hover, pt.y, {});
        flash = tick.includes(f) ? 0.025 : 0;
      }

      // letterbox: attempts out, the clock in
      const aOut = prog(f, T.hours.start - 8, 6, inCubic);
      attempts.set(37, 1 - aOut, 99, aOut);
      const cIn = prog(f, T.hours.start, 6, outCubic);
      (clockEyebrow.material as THREE.MeshBasicMaterial).opacity = cIn;
      clockEyebrow.visible = cIn > 0.001;
      clockLabels.forEach((m, k) => {
        m.visible = k === clock;
        (m.material as THREE.MeshBasicMaterial).opacity = cIn;
        const since = k < CLOCKS.length ? f - hours[k]!.start : f - T.export.start;
        m.scale.setScalar(since >= 0 && since < 3 ? 1.06 - since * 0.02 : 1);
      });
      film.set(f, { flash, flashColor: "#ffffff", grain });
    };
  });
}
