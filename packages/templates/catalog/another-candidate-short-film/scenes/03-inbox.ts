/**
 * Act II — The email. Straight from the phone: an inbox wakes in the dark; the
 * cursor hesitates, then opens "Update on your application". A slow scroll,
 * a slower push, and the focus closes in until one sentence is all that is
 * left — which the cursor selects, word by word, in red.
 *
 * Hands off to Act III with the line locked dead centre at Z_LOCK.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { framing, fitCamera, withFonts, prog, inOutCubic, inOutSine, inCubic, outCubic, outQuart, lerp, keyed, PX } from "../components/core";
import { makeCursor, mixRect, mousePath, placeOn, punchLine, pressShade } from "../components/page";
import { BODY, gmailInbox, mailPage } from "../components/sites";
import { BG, makeFilm } from "../components/film";
import { INBOX_T as T } from "../components/timeline";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, () => {
    const { scene, camera, width, height, durationInFrames: N } = ctx;
    const D = fitCamera(camera, height);
    const FR = framing(width, height);
    const Z_LOCK = FR.lock;
    const cam = camera as THREE.PerspectiveCamera;
    scene.background = new THREE.Color(BG);

    const inbox = gmailInbox();
    const mail = mailPage(0);
    scene.add(inbox.mesh, mail.mesh);

    const line = punchLine("punchline", mail.mail.punch, BODY.size, 400, mail.ink);
    const pr = mail.punchRect;
    const lineCx = pr.x + pr.w / 2;
    const lineCy = pr.y + pr.h / 2;
    line.group.position.copy(mail.local(lineCx, lineCy, 0));
    mail.mesh.add(line.group);

    const row = inbox.rects["row-1"]!;
    const rowShade = pressShade("row-1-pressed", row, 0, inbox);

    const cursor = makeCursor("cursor", 30);
    const film = makeFilm(scene, camera, width, height, D);

    const full = { x: 0, y: 0, w: inbox.w, h: inbox.h };
    const mailFull = { x: 0, y: 0, w: mail.w, h: mail.h };
    const tmp = new THREE.Vector3();
    const SCROLL_TOTAL = lineCy - 420;

    return ({ frame: f }) => {
      const hx = Math.sin(f * 0.11) * 0.02;
      const hy = Math.cos(f * 0.09) * 0.016;

      if (f < T.cut) {
        // ------------------------------------------------------ the inbox
        inbox.mesh.visible = true;
        mail.mesh.visible = false;
        const rot = new THREE.Euler(0.035, -0.05, 0);
        inbox.mesh.rotation.copy(rot);
        const p = prog(f, T.dimUp[0]!, T.cut - T.dimUp[0]!, inOutSine);
        const zoom = lerp(1.05, 1.5, p) * FR.fit;
        inbox.mesh.position.copy(placeOn(inbox, lerp(980, FR.wide ? 900 : 780, p), lerp(560, 330, p), rot, tmp));
        cam.position.set(hx, hy, D / zoom);

        const fp = prog(f, T.rack, 44, inOutCubic);
        inbox.lens(mixRect(full, row, fp), lerp(0, 6, fp), zoom, lerp(0.15, 1, fp));
        inbox.u.exposure.value = 0.8 * prog(f, T.dimUp[0]!, T.dimUp[1]! - T.dimUp[0]!, inOutSine);

        // cursor: in, hesitate, commit
        const ks = T.cursor;
        let mx = ks[0]![1];
        let my = ks[0]![2];
        for (let i = 1; i < ks.length; i++) {
          const [f0, x0, y0] = ks[i - 1]!;
          const [f1, x1, y1] = ks[i]!;
          if (f >= f0) {
            const pt = mousePath(prog(f, f0, f1 - f0, inOutCubic), x0, y0, x1, y1, 0.08);
            mx = pt.x;
            my = pt.y;
          }
        }
        const press = f >= T.rowClick && f < T.rowClick + 3 ? 1 : 0;
        cursor.set(inbox, mx, my, {
          press,
          ring: f >= T.rowClick ? (f - T.rowClick) / 12 : 0,
          opacity: prog(f, ks[0]![0], 6),
        });
        // Gmail's hover: the row lifts a shade once the pointer is on it
        (rowShade.material as THREE.MeshBasicMaterial).opacity = (f >= 140 ? 0.06 : 0) + press * 0.08;
        line.group.visible = false;
        film.set(f, {});
        return;
      }

      // ---------------------------------------------------------- the email
      inbox.mesh.visible = false;
      mail.mesh.visible = true;
      line.group.visible = true;

      const push = prog(f, T.push[0]!, T.push[1]! - T.push[0]!, inOutCubic);
      const breathe = f > T.push[1]! ? Math.sin((Math.PI * (f - T.push[1]!)) / (N - T.push[1]!)) * 0.012 : 0;
      const zoom = lerp(FR.wide ? 1.0 : 0.95, Z_LOCK, push) * (1 + breathe);

      // scroll: mouse-wheel notches, each one an eased step
      let scroll = 0;
      T.scroll.forEach((s) => (scroll += prog(f, s, T.scrollLen, outQuart)));
      scroll = (scroll / T.scroll.length) * SCROLL_TOTAL;
      const fx = lerp(FR.wide ? mail.w / 2 : 610, lineCx, push);
      const fy = 420 + scroll;

      const flat = prog(f, T.cut, T.push[1]! - T.cut, inOutCubic);
      const rot = new THREE.Euler(lerp(0.04, 0, flat), lerp(-0.05, 0, flat), 0);
      mail.mesh.rotation.copy(rot);
      mail.mesh.position.copy(placeOn(mail, fx, fy, rot, tmp));
      const settle = 1 - prog(f, T.push[1]! - 40, 40, inOutSine);
      cam.position.set(hx * settle, hy * settle, D / zoom);

      // focus: page → paragraph → the line
      const a = prog(f, T.focusPara[0]!, T.focusPara[1]! - T.focusPara[0]!, inOutCubic);
      const b = prog(f, T.focusLine[0]!, T.focusLine[1]! - T.focusLine[0]!, inOutCubic);
      const r1 = mixRect(mailFull, mail.paraRect, a);
      mail.lens(mixRect(r1, pr, b), lerp(lerp(0, 20, a), 10, b), zoom, lerp(0, 0.6, a) + 0.4 * b);
      mail.u.exposure.value = 0.8 * keyed(f, [[T.cut, 0.82], [T.cut + 4, 1]], outCubic);

      // selection: the I-beam drags across the line
      const sweep = prog(f, T.drag[0]!, T.drag[1]! - T.drag[0]!, inOutCubic);
      line.setSweep(sweep);
      const left = pr.x - 2;
      const right = pr.x + pr.w + 4;
      let mx: number;
      let my: number;
      let beam = false;
      let op = 1;
      if (f < T.beamAt) {
        const pt = mousePath(prog(f, T.cut + 6, 90, inOutCubic), 860, 250, 1080, 790, 0.1);
        mx = pt.x;
        my = pt.y;
      } else if (f < T.drag[0]!) {
        beam = true;
        const pt = mousePath(prog(f, T.beamAt, T.beamArrive - T.beamAt, inOutCubic), 1080, 790, left, lineCy, -0.06);
        mx = pt.x;
        my = pt.y;
      } else if (f < T.cursorAway[0]!) {
        beam = true;
        mx = lerp(left, right, sweep);
        my = lineCy + Math.sin(f * 0.9) * 0.6;
      } else {
        const t = prog(f, T.cursorAway[0]!, T.cursorAway[1]! - T.cursorAway[0]!, inCubic);
        mx = right + t * 260;
        my = lineCy + t * 160;
        op = 1 - t;
      }
      const down = f >= T.mouseDown && f < T.release;
      cursor.set(mail, mx, my, { beam, press: down ? 0.5 : 0, opacity: op });

      // the line breathes; one glitch shudders through it
      const g = f >= T.glitch[0]! && f < T.glitch[1]!;
      line.setShift(g ? (f % 2 ? 7 : -5) : 0);
      if (g) mail.mesh.position.x += (f % 2 ? 0.06 : -0.04);
      line.hiMat.color.set("#a3201c").multiplyScalar(0.92 + 0.08 * Math.sin(f * 0.12));
      film.set(f, { flash: g ? 0.05 : 0, flashColor: "#ff2a1f", vig: lerp(0.92, 1.0, b) });
    };
  });
}
