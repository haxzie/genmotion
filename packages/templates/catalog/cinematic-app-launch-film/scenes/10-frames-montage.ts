/**
 * Shot 10 — the montage. Where the reference cuts to footage, we cut through
 * real, PLAYING renders of films made in GenMotion (the tracker teaser, the
 * Sequel x Grok Bot launch, the Notch Metrics fintech launch, the 3D Lanyard Drop): hard cuts on the music, each clip on
 * glass at a different angle with its own lens move. Clips are VP9 WebM
 * segments in assets/clips/, cut from each project's exports/ with ffmpeg,
 * and seeked from the frame through components/footage.ts.
 */
import * as THREE from "three";
import { Easing, interpolate } from "@genmotion/three-engine";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { aim, createFilm, handheld } from "../components/film";
import { footage } from "../components/footage";
import { addStudioLights, createRoom } from "../components/screen";
import trackerCounter from "../assets/clips/tracker-counter.webm";
import grokBot from "../assets/clips/grok-bot-call.webm";
import fintechSale from "../assets/clips/fintech-sale.webm";
import lanyard from "../assets/clips/lanyard-spin.webm";
import { bleedEdges } from "../components/preview-ui";
import trackerLogo from "../assets/clips/tracker-logo.webm";

interface Shot {
  name: string;
  url: string;
  start: number;
  end: number;
  portrait?: boolean;
  /** 1080 x 1080 source, shown square; its edges bleed outward instead of a flat surround. */
  square?: boolean;
  /** Lens move: target (plane-local units), distance, yaw, pitch, roll — from → to. */
  from: [number, number, number, number, number, number];
  to: [number, number, number, number, number, number];
  /** Focus point, plane-local. */
  focus: [number, number];
  aperture: number;
  /** The frame's own background, continued past its edges so no border shows. */
  surround: string;
}

const SHOTS: Shot[] = [
  // GenMotion tracker teaser: the 3D frame counter.
  { name: "clip-tracker-counter", surround: "#0d0f0f", url: trackerCounter, start: 0, end: 8, from: [0, 0.05, 0.86, 12, 3, 0], to: [0.02, 0.05, 0.76, 9, 3, 0], focus: [0, 0.1], aperture: 30 },
  // Sequel x Grok Bot: the phone forwarding a call.
  { name: "clip-grok-bot", surround: "#f4f7fa", url: grokBot, start: 8, end: 36, from: [-0.1, 0.12, 0.85, 28, 6, 4], to: [0.08, 0.1, 0.72, 22, 4, 3], focus: [0.0, 0.2], aperture: 55 },
  // Notch Metrics (fintech launch): "A new sale? Payment received +$49. You'll know."
  { name: "clip-fintech-sale", surround: "#efefef", url: fintechSale, start: 36, end: 56, from: [-0.08, 0.0, 0.78, -22, -8, -6], to: [0.06, 0.0, 0.66, -18, -6, -5], focus: [0, 0], aperture: 55 },
  // Notion launch: the dock cycling wallpapers.
  // 3D Lanyard Drop (Three.js): the GenMotion badge spinning edge-on.
  { name: "clip-lanyard-spin", surround: "#1c1e1f", url: lanyard, start: 56, end: 68, square: true, from: [0.0, 0.06, 0.98, 18, 5, 3], to: [0.0, 0.06, 0.86, 14, 4, 3], focus: [0.0, 0.06], aperture: 50 },
  // GenMotion tracker teaser: the logo lock-up, handing off to Export.
  { name: "clip-tracker-logo", surround: "#0d0f0f", url: trackerLogo, start: 68, end: 85, from: [0.05, 0.02, 0.9, -16, 10, -6], to: [0.05, 0.02, 0.78, -12, 8, -5], focus: [0.05, 0.02], aperture: 50 },
];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera } = ctx;
  const film = createFilm(ctx, "#0c0c0e");
  addStudioLights(scene);

  const clips: ReturnType<typeof footage>[] = [];
  const groups = SHOTS.map((s, i) => {
    const grp = new THREE.Group();
    grp.name = s.name;
    grp.position.set(i * 8, 0, 0);
    const w = s.portrait ? 0.9 : s.square ? 1.0 : 1.6;
    const aspect = s.portrait ? 1920 / 3414 : s.square ? 1 : 16 / 9;
    const clip = footage(ctx, s.url, { size: s.square ? [1080, 1080] : [1600, 900] });
    clips.push(clip);
    const img = new THREE.Mesh(
      new THREE.PlaneGeometry(w, w / aspect),
      new THREE.MeshBasicMaterial({ map: clip.texture, toneMapped: false }),
    );
    img.name = `${s.name}-video`;
    if (s.square) bleedEdges(img, w, w / aspect);
    grp.add(img);
    const sur = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 5, (w / aspect) * 5),
      new THREE.MeshBasicMaterial({ color: s.surround, toneMapped: false }),
    );
    sur.position.z = -0.0006;
    sur.name = `${s.name}-surround`;
    sur.userData.pickable = false;
    grp.add(sur);
    scene.add(grp);
    return grp;
  });
  // Soft room light behind each set-up, for the bokeh.
  createRoom(scene, SHOTS.flatMap((_, i) => [
    { x: i * 8 + 2.0, y: 0.9, z: -1.6, r: 1.0, b: 0.55 },
    { x: i * 8 - 2.2, y: -0.8, z: -2.4, r: 1.1, b: 0.3 },
  ]));

  const target = new THREE.Vector3();
  const focus = new THREE.Vector3();
  return ({ frame, time }) => {
    const idx = Math.max(0, SHOTS.findIndex((s) => frame >= s.start && frame < s.end));
    const s = SHOTS[idx]!;
    groups.forEach((g, i) => (g.visible = i === idx));
    // Only the clip on screen is seeked; it plays in real time from its cut.
    clips[idx]!.seek((frame - s.start) / ctx.fps);
    const t = interpolate(frame, [s.start, s.end], [0, 1], Easing.easeInOut);
    const k = (j: number) => THREE.MathUtils.lerp(s.from[j]!, s.to[j]!, t);
    const ox = idx * 8;
    target.set(ox + k(0), k(1), 0);
    aim(camera, target, k(2), k(3), k(4), k(5));
    handheld(camera, time, 1.3, 10 + idx);
    focus.set(ox + s.focus[0], s.focus[1], 0);
    film.render(frame, focus, s.aperture);
  };
}
