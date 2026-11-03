/**
 * Scene 2 — Take one. The capture toolbar: the cursor clicks Record. Up in the
 * menu bar the red pill counts the seconds… and Slack pings again, right into
 * the take: "any update on the demo?". Stop. The floating thumbnail of the
 * ruined recording is dragged straight into the Trash. ATTEMPTS: 1.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, withFonts, prog, inOutCubic, inOutSine, outCubic, inCubic, lerp, framing, PX } from "../components/core";
import { placeOn, makeCursor, mousePath, mixRect, type Rect } from "../components/page";
import {
  SW, SH, DOCK_Y, TRASH, REC_PILL_X, REC_PILL_Y, THUMB_X, THUMB_Y, BANNER_X, BANNER_Y,
  makeDesktop, captureBar, recPill, recordingThumb, trashFull, slackBanner, put, at,
} from "../components/mac";
import { BG, makeFilm, makeCounter } from "../components/film";
import { TAKE_T as T } from "../components/timeline";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene, camera, width, height } = ctx;
    const D = fitCamera(camera, height);
    const FR = framing(width, height);
    const cam = camera as THREE.PerspectiveCamera;
    scene.background = new THREE.Color(BG);

    const desk = makeDesktop("desktop", { clock: "Tue Nov 4  4:53 PM" }, ctx.manager);
    scene.add(desk.mesh);

    const bar = captureBar();
    const BAR_X = (SW - bar.w) / 2;
    const BAR_Y = DOCK_Y - 20 - bar.h;
    const rec = at(bar, "record", BAR_X, BAR_Y);

    const pills = Array.from({ length: 12 }, (_, i) => recPill(i));
    const pillRect: Rect = { x: REC_PILL_X, y: REC_PILL_Y, w: pills[0]!.w, h: pills[0]!.h };
    const pillC = { x: REC_PILL_X + pillRect.w / 2, y: REC_PILL_Y + pillRect.h / 2 };
    const banner = slackBanner("slack-followup", "Maya Chen", "any update on the demo?", ctx.manager);
    const bannerRect: Rect = { x: BANNER_X, y: BANNER_Y, w: banner.w, h: banner.h };

    const thumb = recordingThumb();
    thumb.mesh.renderOrder = 5;
    const thumbC = { x: THUMB_X + thumb.w / 2, y: THUMB_Y + thumb.h / 2 };
    const trash = trashFull();
    const trashC = { x: TRASH.x + TRASH.w / 2, y: TRASH.y + TRASH.h / 2 };

    const all = [bar, ...pills, banner, thumb, trash];
    const cursor = makeCursor("cursor", 30);
    const film = makeFilm(scene, camera, width, height, D);
    const counter = makeCounter(film, width, height, "ATTEMPTS", [1]);

    const rot = new THREE.Euler();
    const tmp = new THREE.Vector3();

    /** Frame the desktop on page px (fx, fy), never past its edges. */
    const frameOn = (fx: number, fy: number, zoom: number, rx: number, ry: number, rz = 0, yMin = 0, clamp = true) => {
      const halfW = width / 2 / zoom;
      const halfH = ((height / 2) * (1 - 2 * FR.bar)) / zoom;
      if (clamp) {
        fx = THREE.MathUtils.clamp(fx, halfW, SW - halfW);
        fy = THREE.MathUtils.clamp(fy, Math.min(yMin, halfH), SH - halfH);
      }
      rot.set(rx, ry, rz);
      desk.mesh.rotation.copy(rot);
      desk.mesh.position.copy(placeOn(desk, fx, fy, rot, tmp));
    };

    return ({ frame: f }) => {
      for (const s of all) s.mesh.visible = false;
      const hx = Math.sin(f * 0.19) * 0.025 + Math.sin(f * 0.47) * 0.01;
      const hy = Math.cos(f * 0.15) * 0.02 + Math.sin(f * 0.63) * 0.008;
      desk.u.exposure.value = 0.82;
      let flash = 0;

      if (f < T.a.end) {
        // ------------------------------------------------ A: Record
        const { start, end, click } = T.a;
        const p = (f - start) / (end - start);
        const zoom = lerp(2.0, 2.3, inOutSine(p)) * Math.max(0.9, FR.fit);
        const k = inOutCubic(Math.min(1, p * 1.25));
        frameOn(lerp(rec.x - 120, rec.x - 40, k), lerp(rec.y - 60, rec.y - 10, k), zoom, 0.07, -0.13, 0.01, 9999);
        cam.position.set(hx, hy, D / zoom);
        desk.lens(rec.r, 10, zoom, lerp(0.6, 1, prog(f, start, 24, inOutCubic)));
        desk.u.exposure.value = 0.82 * prog(f, 0, 5, outCubic);
        const gone = prog(f, click + 3, 5, inCubic);
        put(desk, bar, BAR_X, BAR_Y, { opacity: 1 - gone });
        const t = prog(f, start + 2, click - 5 - start - 2, inOutCubic);
        const pt = mousePath(t, rec.x + 260, rec.y + 170, rec.x + 6, rec.y + 4, 0.1);
        const press = f >= click && f < click + 3 ? 1 : 0;
        cursor.set(desk, pt.x, pt.y, { press, ring: f >= click ? (f - click) / 12 : 0 });
        flash = f === click ? 0.05 : 0;
      } else if (f < T.b.end) {
        // ------------------------------------- B: recording… and the ping
        const { start, end, ping, click, secondsEvery } = T.b;
        const p = (f - start) / (end - start);
        const zoom = lerp(2.3, 2.5, inOutSine(p)) * Math.max(0.9, FR.fit);
        frameOn(lerp(1200, 1215, p), 130, zoom, 0.05, 0.1, -0.01, 130);
        cam.position.set(hx, hy, D / zoom);
        const toBanner = prog(f, ping, 10, inOutCubic) * (1 - prog(f, click - 22, 12, inOutCubic));
        desk.lens(mixRect(pillRect, bannerRect, toBanner), 10, zoom, 1);

        const sec = Math.min(pills.length - 1, Math.floor((f - start) / secondsEvery));
        if (f < click + 1) put(desk, pills[sec]!, REC_PILL_X, REC_PILL_Y);
        const bin = prog(f, ping, 12, outCubic);
        put(desk, banner, BANNER_X + (1 - bin) * (banner.w + 40), BANNER_Y, { opacity: bin });

        const t = prog(f, click - 30, 25, inOutCubic);
        const pt = mousePath(t, 1330, 420, pillC.x + 4, pillC.y + 3, 0.12);
        const press = f >= click && f < click + 3 ? 1 : 0;
        cursor.set(desk, pt.x, pt.y, { press, ring: f >= click ? (f - click) / 12 : 0, opacity: prog(f, click - 30, 6, outCubic) });
        flash = f === ping ? 0.035 : f === click ? 0.05 : 0;
      } else {
        // ------------------------------------------- C: into the Trash
        const { start, thumbIn, grab, drag, drop } = T.c;
        const follow = prog(f, grab - 4, drop - grab + 12, inOutCubic);
        const zoom = lerp(2.2, 2.4, prog(f, start, T.length - start, inOutSine)) * Math.max(0.9, FR.fit);
        frameOn(lerp(thumbC.x - 40, trashC.x + 10, follow), lerp(thumbC.y - 70, trashC.y - 110, follow), zoom, 0.08, -0.12, 0, 0, false);
        cam.position.set(hx, hy, D / zoom);

        const tin = prog(f, thumbIn, 12, outCubic);
        const d = prog(f, drag[0]!, drag[1]! - drag[0]!, inOutCubic);
        const into = prog(f, drop, 4, inCubic);
        // the cursor, then the thumbnail riding under it
        let mx: number, my: number;
        if (f < grab) {
          const t = prog(f, start, grab - 4 - start, inOutCubic);
          const pt = mousePath(t, 1120, 600, thumbC.x + 20, thumbC.y + 10, 0.1);
          mx = pt.x; my = pt.y;
        } else {
          const pt = mousePath(d, thumbC.x + 20, thumbC.y + 10, trashC.x + 6, trashC.y - 4, 0.16);
          mx = pt.x; my = pt.y;
        }
        const sc = lerp(1, 0.42, d) * (1 - into);
        const cx = f < grab ? thumbC.x + (1 - tin) * 240 : mx - 20 * sc;
        const cy = f < grab ? thumbC.y : my - 10 * sc;
        put(desk, thumb, cx - thumb.w / 2, cy - thumb.h / 2, { scale: Math.max(1e-4, sc), opacity: tin * (f >= grab ? 0.92 : 1) });

        if (f >= drop) {
          const bump = prog(f, drop, 8, outCubic);
          put(desk, trash, TRASH.x, TRASH.y, { scale: 1.15 - 0.15 * bump });
        }
        const focus: Rect = f < drop ? { x: cx - 60, y: cy - 40, w: 120, h: 80 } : TRASH;
        desk.lens(focus, 16, zoom, 1);
        const down = f >= grab && f < drop;
        cursor.set(desk, mx, my, { press: down ? 0.5 : 0 });
      }

      // the count starts the moment the first take hits the Trash
      const cin = prog(f, T.c.drop + 2, 10, outCubic);
      counter.set(1, cin, f - T.c.drop - 2, 1 - cin);
      film.set(f, { flash, flashColor: "#ffffff" });
    };
  });
}
