/**
 * Act III — The montage. The red line never moves: it stays dead centre, the
 * same size, while the email underneath it keeps changing — Gmail, Outlook,
 * an ATS no-reply, dark mode — and each one says the same thing differently.
 * The cuts accelerate until the camera pulls back and reveals a wall of them.
 * Black. Then a job page wakes up, and the cursor finds "Easy Apply" again.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { framing, fitCamera, withFonts, prog, inOutCubic, inOutSine, inCubic, outCubic, lerp, rng, hash, PX } from "../components/core";
import { makeCursor, mousePath, placeOn, pressShade, punchLine, type PunchLine } from "../components/page";
import { BODY, MAILS, linkedInJob, mailPage, type MailPage } from "../components/sites";
import { BG, INK, MUTED, hudLabel, makeFilm } from "../components/film";
import { MONTAGE as M } from "../components/timeline";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene, camera, width, height, durationInFrames: N } = ctx;
    const D = fitCamera(camera, height);
    const FR = framing(width, height);
    const Z_LOCK = FR.lock;
    const cam = camera as THREE.PerspectiveCamera;
    scene.background = new THREE.Color(BG);

    // ------------------------------------------------------------ the emails
    const mails: MailPage[] = MAILS.map((_, i) => mailPage(i, i === 0 ? 1.5 : 1.25));
    const lines: PunchLine[] = mails.map((m, i) => {
      const l = punchLine(`punchline-${i + 1}`, m.mail.punch, BODY.size, 400, m.ink);
      const pr = m.punchRect;
      l.group.position.copy(m.local(pr.x + pr.w / 2, pr.y + pr.h / 2, 0));
      m.mesh.add(l.group);
      m.mesh.visible = false;
      m.lens(pr, 10, Z_LOCK, 1);
      m.u.exposure.value = 0.8;
      scene.add(m.mesh);
      return l;
    });
    const center = (m: MailPage) => ({ x: m.punchRect.x + m.punchRect.w / 2, y: m.punchRect.y + m.punchRect.h / 2 });

    const r = rng(1312);
    const shotPose = M.shots.map((s, i) =>
      i === 0
        ? { rot: new THREE.Euler(0, 0, 0), dz: 0.025 }
        : { rot: new THREE.Euler((r() - 0.5) * 0.12, (r() - 0.5) * 0.2, (r() - 0.5) * 0.035), dz: (r() - 0.5) * 0.08 },
    );

    // --------------------------------------------- the wall (for the pull-back)
    const wall = new THREE.Group();
    wall.name = "wall-of-rejections";
    // big enough that its edges never show before the frame has gone dark
    const COLS = 15;
    const ROWS = 15;
    const SX = 1680 * PX;
    const SY = 1580 * PX;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const ci = col - (COLS - 1) / 2;
        const rj = row - (ROWS - 1) / 2;
        if (ci === 0 && rj === 0) continue; // the centre tile is the live email
        const idx = (row * 3 + col * 5 + 7) % 8; // spread the styles evenly: no clumps of dark mode
        const m = mails[idx]!;
        const tile = new THREE.Mesh(m.mesh.geometry, m.mesh.material);
        tile.name = `rejection-${row * COLS + col + 1}`;
        const c = center(m);
        const off = m.local(c.x, c.y);
        tile.position.set(ci * SX - off.x, rj * SY - off.y, (hash(row * 13 + col * 29) - 0.5) * 2.4);
        wall.add(tile);
      }
    }
    wall.visible = false;
    // the rig carries the wall and the live email together, so they roll and tip as one
    const rig = new THREE.Group();
    rig.name = "rejection-rig";
    rig.add(wall);
    scene.add(rig);

    // ---------------------------------------------------------- the loop
    const job = linkedInJob();
    job.mesh.visible = false;
    scene.add(job.mesh);
    const btn = job.rects["easy-apply"]!;
    const shade = pressShade("easy-apply-pressed", btn, btn.h / 2, job);
    const cursor = makeCursor("cursor", 30);

    const film = makeFilm(scene, camera, width, height, D);
    const barY = -(height / 2 - (height * FR.bar) / 2) * PX;
    const eyebrow = hudLabel("APPLICATIONS SENT", 28, MUTED, { weight: 500, tracking: 0.16, align: "left", name: "counter-label" });
    eyebrow.position.set(FR.hudX * PX, barY, 0);
    const n247 = hudLabel("247", 40, INK, { weight: 500, align: "left", name: "counter-247" });
    const n248 = hudLabel("248", 40, INK, { weight: 500, align: "left", name: "counter-248" });
    for (const n of [n247, n248]) n.position.set(FR.hudX * PX + eyebrow.textWidth * PX + 26 * PX, barY - 1 * PX, 0);
    film.hud.add(eyebrow, n247, n248);

    const tmp = new THREE.Vector3();
    const L = M.loop;

    return ({ frame: f }) => {
      for (const m of mails) m.mesh.visible = false;
      wall.visible = false;
      job.mesh.visible = false;
      cursor.group.visible = false;
      eyebrow.visible = n247.visible = n248.visible = false;

      const pullStart = M.pull[0]!;
      if (f < pullStart && mails[0]!.mesh.parent !== scene) scene.add(mails[0]!.mesh);
      if (f < pullStart) {
        // ---------------------------------------------------- the montage
        const i = M.shots.findIndex((s) => f >= s.start && f < s.end);
        const s = M.shots[i]!;
        const m = mails[s.mail]!;
        const l = lines[s.mail]!;
        const pose = shotPose[i]!;
        const len = s.end - s.start;
        const p = (f - s.start) / len;
        m.mesh.visible = true;
        m.mesh.rotation.copy(pose.rot);
        const c = center(m);
        m.mesh.position.copy(placeOn(m, c.x, c.y, pose.rot, tmp));
        const zoom = Z_LOCK * (1 + pose.dz * inOutSine(p));
        const shake = len <= 4 ? 0.05 : len <= 8 ? 0.02 : 0;
        cam.position.set((hash(f * 3.1) - 0.5) * shake, (hash(f * 7.3) - 0.5) * shake, D / zoom);
        m.lens(m.punchRect, 10, zoom, 1);

        // shot 1 inherits the finished selection; later long shots re-select it fast
        const sweep = i === 0 || len < 12 ? 1 : prog(f, s.start + 1, 7, inOutCubic);
        l.setSweep(sweep);
        l.setOpacity(1);
        l.setShift(len <= 3 ? (f % 2 ? 5 : -4) : 0);
        l.hiMat.color.set("#a3201c");
        film.set(f, { flash: len <= 6 && f === s.start ? 0.06 : 0, flashColor: "#ff2a1f", vig: 1.0, grain: len <= 6 ? 0.1 : 0.07 });
        return;
      }

      if (f < M.black[0]!) {
        // ------------------------------------------- pull back: the wall
        const m = mails[0]!;
        const l = lines[0]!;
        m.mesh.visible = true;
        wall.visible = true;
        m.mesh.rotation.set(0, 0, 0);
        const c = center(m);
        m.mesh.position.copy(m.local(c.x, c.y).negate());
        for (const ll of lines) {
          ll.setSweep(1);
          ll.setShift(0);
          ll.hiMat.color.set("#a3201c");
        }
        void l;
        // one continuous move from the line to darkness: the camera keeps pulling
        // back and rolling, the wall tips away, and everything sinks into blur and black
        if (m.mesh.parent !== rig) rig.add(m.mesh);
        const T0 = pullStart;
        const T1 = M.black[0]!;
        const u = prog(f, T0, T1 - T0, (x) => x);
        const t = Math.min(1, prog(f, T0, M.pull[1]! - T0, inOutCubic) * 0.6 + Math.pow(u, 1.5) * 0.4);
        const zt = Math.pow(u, 1.45); // gathers speed and never stops
        const zoom = Math.exp(lerp(Math.log(Z_LOCK), Math.log(0.03), zt));
        cam.position.set(0, 0, D / zoom);
        cam.rotation.set(0, 0, -0.9 * Math.pow(u, 1.25));
        rig.rotation.set(0.32 * inOutSine(u), -0.12 * inOutSine(u), 0);
        lines[0]!.setOpacity(1 - THREE.MathUtils.smoothstep(u, 0.3, 0.55));
        const dark = Math.pow(1 - THREE.MathUtils.smoothstep(u, 0.5, 1.0), 1.6); // perceptual: reaches true black
        for (const mm of mails) {
          mm.lens(mm.punchRect, 10, zoom, 1);
          // the wall's selections are painted into the pages, so they defocus with them
          const pr = mm.punchRect;
          mm.u.hi.set(pr.x - 4, pr.y + pr.h / 2 - BODY.size * 0.71, pr.x + pr.w + 4, pr.y + pr.h / 2 + BODY.size * 0.71);
          mm.u.bgLum.value = mm.mail.style === "dark" ? 0.013 : 1;
          mm.u.exposure.value = lerp(0.8, 0.6, t) * dark;
          mm.u.world.value = t > 0.02 ? 1 : 0;
          mm.u.range.value = lerp(620 / Z_LOCK, 6000, t);
          mm.u.maxR.value = lerp(26 / Z_LOCK, 30 / zoom, t);
          mm.u.aniso.value = lerp(0.4, 0.8, t);
        }
        film.set(f, { vig: lerp(1.0, 1.6, u), grain: 0.08, black: THREE.MathUtils.smoothstep(u, 0.86, 1.0) });
        return;
      }

      cam.rotation.set(0, 0, 0);
      if (f < L.start) {
        film.set(f, { black: 1 });
        return;
      }

      // ------------------------------------------------ the loop: apply again
      if (f < L.cut) {
        job.mesh.visible = true;
        const rot = new THREE.Euler(0.05, -0.08, 0);
        job.mesh.rotation.copy(rot);
        const p = prog(f, L.start, L.cut - L.start, inOutSine);
        const zoom = lerp(1.35, 1.75, p) * FR.fit;
        const cx = btn.x + btn.w / 2;
        const cy = btn.y + btn.h / 2;
        job.mesh.position.copy(placeOn(job, lerp(cx + 180, cx, p), lerp(cy + 120, cy, p), rot, tmp));
        cam.position.set(Math.sin(f * 0.11) * 0.02, Math.cos(f * 0.09) * 0.015, D / zoom);
        const tf = prog(f, L.start, 40, inOutCubic);
        job.lens(btn, 10, zoom, lerp(0.4, 1, tf));
        job.u.exposure.value = 0.8 * prog(f, L.start, L.dimUp, inOutSine);
        // the cursor arrives, and hovers — a breath too long — then clicks
        const arrive = prog(f, L.start + 6, L.arrive - L.start - 6, inOutCubic);
        const pt = mousePath(arrive, 1500, 820, cx + 8, cy + 4, 0.1);
        const hover = f > L.arrive ? Math.sin((f - L.arrive) * 0.8) * 1.2 : 0;
        const press = f >= L.click ? 1 : 0;
        cursor.group.visible = true;
        cursor.set(job, pt.x + hover, pt.y, { press, ring: f >= L.click ? (f - L.click) / 12 : 0 });
        (shade.material as THREE.MeshBasicMaterial).opacity = press * 0.22;
        film.set(f, {});
      } else {
        film.set(f, { black: 1 });
      }

      // the counter wakes with the page, ticks on the click, and leaves last
      const cin = prog(f, L.start + 4, 10, outCubic);
      const cout = prog(f, N - 10, 6, inCubic);
      const op = cin * (1 - cout);
      eyebrow.visible = true;
      (eyebrow.material as THREE.MeshBasicMaterial).opacity = op;
      eyebrow.position.y = barY - (1 - cin) * 16 * PX;
      const ticked = f >= L.click + 1;
      const cur = ticked ? n248 : n247;
      cur.visible = true;
      (cur.material as THREE.MeshBasicMaterial).opacity = op;
      const since = f - L.click - 1;
      cur.scale.setScalar(ticked && since < 3 ? 1.06 - since * 0.02 : 1);
    };
  });
}
