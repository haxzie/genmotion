/**
 * Act I — Apply. A cursor clicks "Easy Apply", "Submit application", "Apply now",
 * "Submit"… across job boards, each button the only sharp thing in a dark,
 * defocused screen. The cuts accelerate until the clicks become a blur and the
 * counter in the letterbox runs to 247. Then one confirmation, and the screen
 * goes dark.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { framing, fitCamera, withFonts, prog, inOutCubic, inOutSine, inCubic, outCubic, lerp, rng, hash, PX } from "../components/core";
import { makeCursor, mousePath, placeOn, pressShade, type Page } from "../components/page";
import { atsReview, hostedForm, indeedApply, indeedJob, linkedInJob, linkedInModal, linkedInSent } from "../components/sites";
import { BG, INK, MUTED, hudLabel, makeFilm } from "../components/film";
import { APPLY } from "../components/timeline";


interface Shot {
  page: Page;
  target: string;
  start: number;
  end: number;
  click: number;
  from: [number, number];
  z0: number;
  z1: number;
  rot: THREE.Euler;
  off: [number, number];
  rapid: boolean;
  shade?: THREE.Mesh;
  count?: number;
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene, camera, width, height } = ctx;
    const D = fitCamera(camera, height);
    scene.background = new THREE.Color(BG);
    const cam = camera as THREE.PerspectiveCamera;

    const pages = {
      job: linkedInJob(),
      modal: linkedInModal(),
      indeed: indeedJob(),
      indeedApply: indeedApply(),
      ats: atsReview(),
      form: hostedForm(),
      sent: linkedInSent(),
    };
    for (const p of Object.values(pages)) {
      p.mesh.visible = false;
      scene.add(p.mesh);
    }

    const shots: Shot[] = APPLY.slow.map((s) => ({
      page: pages[s.page as keyof typeof pages],
      target: s.target,
      start: s.start,
      end: s.end,
      click: s.click,
      from: s.from as [number, number],
      z0: s.z[0]!,
      z1: s.z[1]!,
      rot: new THREE.Euler(s.rot[0], s.rot[1], s.rot[2] ?? 0),
      off: [0, 0],
      rapid: false,
      count: s.count,
    }));

    // the rapid run: seeded, so every export is the same film
    const r = rng(247);
    const cycle: (keyof typeof pages)[] = ["modal", "indeedApply", "ats", "form", "job", "indeed"];
    APPLY.rapid.forEach((c, i) => {
      const key = cycle[i % cycle.length]!;
      const page = pages[key];
      const target = key === "job" ? "easy-apply" : key === "indeed" ? "apply-now" : "submit";
      shots.push({
        page, target, start: c.start, end: c.end, click: c.start, from: [0, 0],
        z0: 1.9 + r() * 0.7, z1: 0, rot: new THREE.Euler((r() - 0.5) * 0.22, (r() - 0.5) * 0.3, (r() - 0.5) * 0.06),
        off: [(r() - 0.5) * 60, (r() - 0.5) * 30], rapid: true, count: c.count,
      });
    });

    // press shades, one per page/button pair
    const shades = new Map<string, THREE.Mesh>();
    for (const s of shots) {
      const key = `${s.page.mesh.name}/${s.target}`;
      if (!shades.has(key)) {
        const rect = s.page.rects[s.target]!;
        shades.set(key, pressShade(`${s.target}-pressed`, rect, s.target === "apply-now" || s.page === pages.form ? 8 : rect.h / 2, s.page));
      }
      s.shade = shades.get(key);
    }

    const cursor = makeCursor("cursor", 30);
    const film = makeFilm(scene, camera, width, height, D);

    // the counter, in the bottom letterbox bar
    const FR = framing(width, height);
    const barY = -(height / 2 - (height * FR.bar) / 2) * PX;
    const eyebrow = hudLabel("APPLICATIONS SENT", 28, MUTED, { weight: 500, tracking: 0.16, align: "left", name: "counter-label" });
    eyebrow.position.set(FR.hudX * PX, barY, 0);
    film.hud.add(eyebrow);
    const counts = [...new Set(shots.map((s) => s.count).filter((c): c is number => !!c))];
    const numbers = new Map<number, THREE.Mesh>();
    counts.forEach((c) => {
      const m = hudLabel(String(c), 40, INK, { weight: 500, align: "left", name: `counter-${c}` });
      m.position.set(FR.hudX * PX + eyebrow.textWidth * PX + 26 * PX, barY - 1 * PX, 0);
      m.visible = false;
      film.hud.add(m);
      numbers.set(c, m);
    });

    const fin = APPLY.final;
    const sentRect = pages.sent.rects["sent-message"]!;
    const tmp = new THREE.Vector3();

    return ({ frame: f }) => {
      for (const p of Object.values(pages)) p.mesh.visible = false;
      for (const m of shades.values()) (m.material as THREE.MeshBasicMaterial).opacity = 0;

      let shot = shots.find((s) => f >= s.start && f < s.end);
      let count = 0;
      for (const s of shots) if (s.count && f >= s.click + 1) count = Math.max(count, s.count);

      const hx = Math.sin(f * 0.21) * 0.03 + Math.sin(f * 0.53) * 0.012;
      const hy = Math.cos(f * 0.17) * 0.025 + Math.sin(f * 0.71) * 0.01;

      if (shot) {
        const { page } = shot;
        page.mesh.visible = true;
        const rect = page.rects[shot.target]!;
        const cx = rect.x + rect.w / 2;
        const cy = rect.y + rect.h / 2;
        const len = shot.end - shot.start;
        const p = (f - shot.start) / len;

        page.mesh.rotation.copy(shot.rot);
        let zoom: number;
        let fx = cx + shot.off[0];
        let fy = cy + shot.off[1];
        if (!shot.rapid) {
          zoom = lerp(shot.z0, shot.z1, inOutSine(p)) * FR.fit;
          const k = inOutCubic(Math.min(1, p * 1.3));
          fx = lerp(cx + (shot.from[0] - cx) * 0.45, cx, k);
          fy = lerp(cy + (shot.from[1] - cy) * 0.45, cy, k);
        } else {
          zoom = shot.z0 * (1 + 0.04 * p) * FR.fit;
        }
        // keep the frame on the page: never let the camera drift past its edges
        const halfW = width / 2 / zoom;
        const halfH = (height / 2) * (1 - 2 * FR.bar) / zoom;
        fx = THREE.MathUtils.clamp(fx, Math.min(halfW, page.w / 2), Math.max(page.w - halfW, page.w / 2));
        fy = THREE.MathUtils.clamp(fy, Math.min(halfH, page.h / 2), Math.max(page.h - halfH, page.h / 2));
        page.mesh.position.copy(placeOn(page, fx, fy, shot.rot, tmp));
        cam.position.set(hx * (shot.rapid ? 2.5 : 1), hy * (shot.rapid ? 2.5 : 1), D / zoom);
        cam.rotation.set(0, 0, Math.sin(f * 0.13) * 0.006);

        // focus: the button is the only sharp thing on screen
        // the lens racks in as the cursor approaches: the button is the focal plane
        const rack = shot.rapid ? 1 : lerp(0.45, 1, prog(f, shot.start, len * 0.7, inOutCubic));
        page.lens(rect, 10, zoom, rack);
        page.u.exposure.value = 0.8 * prog(f, 0, 10, outCubic);

        // cursor
        let mx = cx;
        let my = cy;
        if (!shot.rapid) {
          const arrive = shot.click - 5;
          const t = prog(f, shot.start + 2, arrive - shot.start - 2, inOutCubic);
          const pt = mousePath(t, shot.from[0], shot.from[1], cx + 6, cy + 4, 0.1);
          mx = pt.x;
          my = pt.y;
        } else {
          mx = cx + 4 + (hash(shot.start) - 0.5) * rect.w * 0.4;
          my = cy + 3;
        }
        const press = f >= shot.click && f < shot.click + 3 ? 1 : f === shot.click + 3 ? 0.4 : 0;
        const ring = f >= shot.click ? (f - shot.click) / 12 : 0;
        cursor.set(page, mx, my, { press, ring });
        if (shot.shade) (shot.shade.material as THREE.MeshBasicMaterial).opacity = press * 0.22;
        film.set(f, { flash: f === shot.click && !shot.rapid ? 0.05 : 0, flashColor: "#ffffff", grain: shot.rapid ? 0.09 : 0.07 });
      } else {
        // the confirmation, then the screen dies
        const page = pages.sent;
        page.mesh.visible = true;
        const p = (f - fin.start) / (fin.end - fin.start);
        const rot = new THREE.Euler(0.03, -0.05, 0);
        page.mesh.rotation.copy(rot);
        const cx = sentRect.x + sentRect.w / 2;
        const cy = sentRect.y + 20;
        page.mesh.position.copy(placeOn(page, cx, cy, rot, tmp));
        cam.position.set(hx * 0.6, hy * 0.6, D / (lerp(1.7, 1.95, inOutSine(Math.min(1, p))) * FR.fit));
        cam.rotation.set(0, 0, 0);
        page.lens({ x: sentRect.x - 30, y: sentRect.y - 110, w: sentRect.w + 60, h: 210 }, 0, 1.8, 1);
        page.u.exposure.value = 0.8 * (1 - prog(f, fin.dark, 10, inCubic));
        cursor.set(page, cx + 230, cy + 150, { opacity: 1 - prog(f, fin.dark, 10, inCubic) });
        film.set(f, {});
      }

      // counter
      const shown = count > 0;
      const out = prog(f, fin.dark, 8, inCubic);
      const enter = prog(f, APPLY.slow[1]!.click + 1, 10, outCubic);
      const op = shown ? enter * (1 - out) : 0;
      (eyebrow.material as THREE.MeshBasicMaterial).opacity = op;
      eyebrow.position.y = barY - (1 - enter) * 16 * PX;
      for (const [c, m] of numbers) {
        m.visible = c === count && op > 0;
        (m.material as THREE.MeshBasicMaterial).opacity = op;
        const since = f - (shots.find((s) => s.count === c)?.click ?? 0) - 1;
        m.scale.setScalar(since >= 0 && since < 3 ? 1.06 - since * 0.02 : 1);
      }
    };
  });
}
