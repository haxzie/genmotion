/**
 * Scene 3 — Again. The attempts pile up, each one the only sharp thing in a
 * dark, defocused desktop: stop the audio take (it clipped), erase the Trash,
 * rename the file demo_v3_FINAL.mov. Then the cuts accelerate — record, trash,
 * audio, erase, rename — until the counter runs to 36. Then one last rename,
 * typed tired, slips and all: "demo_final_v9 (use this one).mov". ATTEMPTS: 37.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, withFonts, prog, inOutCubic, inOutSine, outCubic, lerp, framing, rng, hash } from "../components/core";
import { placeOn, makeCursor, mousePath, type Rect } from "../components/page";
import {
  SW, DOCK_Y, TRASH, FIELD_W,
  makeDesktop, captureBar, audioWindow, eraseDialog, movIcon, renameField, recordingThumb, trashFull, put, at, type Sprite,
} from "../components/mac";
import { BG, makeFilm, makeCounter } from "../components/film";
import { AGAIN_T as T, V3_TRIM } from "../components/timeline";
import v3Timing from "../assets/typing-rename-v3.timing.json";
import finalTiming from "../assets/typing-rename-final-2.timing.json";

type Steps = { frame: number; text: string }[];
const typed = (steps: Steps, f: number) => {
  let s = "";
  for (const st of steps) {
    if (st.frame > f) break;
    s = st.text;
  }
  return s;
};

interface Shot {
  kind: string;
  start: number;
  end: number;
  click: number;
  count: number;
  rapid: boolean;
  rot: THREE.Euler;
  zoom: [number, number];
  off: [number, number];
  from: [number, number];
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene, camera, width, height, durationInFrames: N } = ctx;
    const D = fitCamera(camera, height);
    const FR = framing(width, height);
    const cam = camera as THREE.PerspectiveCamera;
    scene.background = new THREE.Color(BG);

    const desk = makeDesktop("desktop", { clock: "Tue Nov 4  5:41 PM" }, ctx.manager);
    scene.add(desk.mesh);

    // ------------------------------------------------------------ the props
    const AUDIO = { x: 490, y: 300 };
    const ERASE = { x: 570, y: 290 };
    const RN = { x: 720, y: 330 }; // centre-top of the renamed file
    const bar = captureBar();
    const BAR = { x: (SW - bar.w) / 2, y: DOCK_Y - 20 - bar.h };
    const audio = audioWindow(11);
    const erase = eraseDialog();
    const icon = movIcon();
    const thumb = recordingThumb();
    thumb.mesh.renderOrder = 5;
    const trash = trashFull();

    // one field per distinct thing the name ever says
    const fields = new Map<string, Sprite>();
    const field = (text: string, committed = false) => {
      const key = `${committed ? 1 : 0}|${text}`;
      if (!fields.has(key)) fields.set(key, renameField(text, committed));
      return fields.get(key)!;
    };
    const v3Steps = (v3Timing.steps as Steps).map((s) => ({ frame: s.frame - V3_TRIM, text: s.text }));
    const finalSteps = finalTiming.steps as Steps;
    for (const s of [...v3Steps, ...finalSteps]) field(s.text);
    field("");
    const V3_NAME = v3Steps[v3Steps.length - 1]!.text;
    const FINAL_NAME = finalSteps[finalSteps.length - 1]!.text;
    field(V3_NAME, true);
    field(FINAL_NAME, true);

    const targets: Record<string, { x: number; y: number; r: Rect }> = {
      audio: at(audio, "stop", AUDIO.x, AUDIO.y),
      erase: at(erase, "erase", ERASE.x, ERASE.y),
      record: at(bar, "record", BAR.x, BAR.y),
      trash: { x: TRASH.x + TRASH.w / 2, y: TRASH.y + TRASH.h / 2, r: TRASH },
      rename: { x: RN.x, y: RN.y + 91, r: { x: RN.x - 130, y: RN.y + 76, w: 260, h: 30 } },
    };
    targets["rename-v3"] = targets.rename!;

    // ------------------------------------------------------------ the shots
    const slowPose: Record<string, [number, number, number]> = {
      audio: [0.06, -0.14, 0.01],
      erase: [-0.05, 0.12, -0.01],
      "rename-v3": [0.04, -0.06, 0],
    };
    const r = rng(37);
    const shots: Shot[] = [
      ...T.slow.map((s) => ({
        ...s, rapid: false, rot: new THREE.Euler(...slowPose[s.kind]!), zoom: [2.0, 2.35] as [number, number],
        off: [0, 0] as [number, number], from: [targets[s.kind]!.x + 240, targets[s.kind]!.y + 160] as [number, number],
      })),
      ...T.rapid.map((s) => ({
        ...s, click: s.start, rapid: true,
        rot: new THREE.Euler((r() - 0.5) * 0.22, (r() - 0.5) * 0.32, (r() - 0.5) * 0.06),
        zoom: [2.0 + r() * 0.7, 0] as [number, number], off: [(r() - 0.5) * 70, (r() - 0.5) * 40] as [number, number], from: [0, 0] as [number, number],
      })),
    ];

    const all: Sprite[] = [bar, audio, erase, icon, thumb, trash, ...fields.values()];
    const cursor = makeCursor("cursor", 30);
    const film = makeFilm(scene, camera, width, height, D);
    const counter = makeCounter(film, width, height, "ATTEMPTS", [1, ...shots.map((s) => s.count), T.final.count]);

    const rot = new THREE.Euler();
    const tmp = new THREE.Vector3();
    const frameOn = (fx: number, fy: number, zoom: number, e: THREE.Euler) => {
      rot.copy(e);
      desk.mesh.rotation.copy(rot);
      desk.mesh.position.copy(placeOn(desk, fx, fy, rot, tmp));
      void zoom;
    };
    const putRename = (text: string, committed: boolean) => {
      put(desk, icon, RN.x - icon.w / 2, RN.y);
      put(desk, field(text, committed), RN.x - FIELD_W / 2, RN.y + 76);
    };
    const finalRot = new THREE.Euler(0.03, -0.05, 0);
    const fit = Math.max(0.9, FR.fit);

    return ({ frame: f }) => {
      for (const s of all) s.mesh.visible = false;
      cursor.group.visible = false;
      const hx = Math.sin(f * 0.21) * 0.03 + Math.sin(f * 0.53) * 0.012;
      const hy = Math.cos(f * 0.17) * 0.025 + Math.sin(f * 0.71) * 0.01;
      desk.u.exposure.value = 0.8;
      let flash = 0;
      let grain = 0.07;

      // the counter carries over from scene 2 at 1, and ticks on every attempt
      let count = 1;
      let tickedAt = -99;
      for (const s of shots) if (f >= s.click + 1 && s.count > count) { count = s.count; tickedAt = s.click + 1; }
      if (f >= T.final.enter + 1) { count = T.final.count; tickedAt = T.final.enter + 1; }

      const shot = shots.find((s) => f >= s.start && f < s.end);
      if (shot) {
        const t = targets[shot.kind]!;
        const len = shot.end - shot.start;
        const p = (f - shot.start) / len;
        const zoom = (shot.rapid ? shot.zoom[0] * (1 + 0.04 * p) : lerp(shot.zoom[0], shot.zoom[1], inOutSine(p))) * fit;
        let fx = t.x + shot.off[0];
        let fy = t.y + shot.off[1];
        if (!shot.rapid) {
          const k = inOutCubic(Math.min(1, p * 1.3));
          fx = lerp(t.x + (shot.from[0] - t.x) * 0.35, t.x, k);
          fy = lerp(t.y + (shot.from[1] - t.y) * 0.35, t.y, k);
        }
        frameOn(fx, fy, zoom, shot.rot);
        const sh = shot.rapid ? 2.5 : 1;
        cam.position.set(hx * sh, hy * sh, D / zoom);
        cam.rotation.set(0, 0, Math.sin(f * 0.13) * 0.006);
        desk.lens(t.r, 14, zoom, shot.rapid ? 1 : lerp(0.5, 1, prog(f, shot.start, len * 0.6, inOutCubic)));

        // the prop for this attempt
        if (shot.kind === "audio") put(desk, audio, AUDIO.x, AUDIO.y);
        else if (shot.kind === "erase") put(desk, erase, ERASE.x, ERASE.y);
        else if (shot.kind === "record") put(desk, bar, BAR.x, BAR.y);
        else if (shot.kind === "trash") {
          put(desk, trash, TRASH.x, TRASH.y);
          const s = 0.42 * (1 - prog(f, shot.start, Math.max(2, len - 1), inOutCubic));
          put(desk, thumb, t.x + 30 - thumb.w / 2, t.y - 60 - thumb.h / 2, { scale: Math.max(1e-4, s), opacity: 0.92 });
        } else if (shot.kind === "rename") putRename(V3_NAME, true);
        else if (shot.kind === "rename-v3") {
          const done = f >= shot.click;
          putRename(done ? V3_NAME : typed(v3Steps, f - shot.start), done);
        }

        // the cursor (none while typing)
        if (shot.kind !== "rename-v3") {
          let mx = t.x + 5;
          let my = t.y + 4;
          if (!shot.rapid) {
            const tt = prog(f, shot.start + 2, shot.click - 5 - shot.start - 2, inOutCubic);
            const pt = mousePath(tt, shot.from[0], shot.from[1], t.x + 5, t.y + 4, 0.1);
            mx = pt.x; my = pt.y;
          } else {
            mx += (hash(shot.start) - 0.5) * 30;
          }
          const press = f >= shot.click && f < shot.click + 3 ? 1 : 0;
          cursor.group.visible = true;
          cursor.set(desk, mx, my, { press, ring: f >= shot.click ? (f - shot.click) / 12 : 0 });
        }
        flash = f === shot.click && !shot.rapid ? 0.05 : 0;
        grain = shot.rapid ? 0.09 : 0.07;
      } else {
        // ------------------------------------------- the last rename, typed tired
        const F = T.final;
        const p = prog(f, F.start, N - F.start, inOutSine);
        const zoom = lerp(2.5, 2.95, p) * fit;
        const t = targets.rename!;
        frameOn(t.x, t.y - 20, zoom, finalRot);
        cam.position.set(hx * 0.6, hy * 0.6, D / zoom);
        cam.rotation.set(0, 0, 0);
        desk.lens(t.r, 10, zoom, 1);
        desk.u.exposure.value = 0.8 * (0.8 + 0.2 * prog(f, F.start, 8, outCubic));
        const done = f >= F.enter;
        putRename(done ? FINAL_NAME : typed(finalSteps, f - F.typeAt), done);
        flash = f === F.enter ? 0.05 : 0;
      }

      counter.set(count, 1, f - tickedAt);
      film.set(f, { flash, flashColor: "#ffffff", grain });
    };
  });
}
