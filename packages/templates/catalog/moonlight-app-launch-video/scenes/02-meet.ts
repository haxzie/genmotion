/** 4.0–6.3s · Meet Moonlight: icon, name, then the phone rises with the pinned assistant. */
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { Stage, E, iv, drawText, measure, textLayer } from "../components/kit";
import { C, avatar, statusBar, glassPill, filterIcon, appIcon, appAvatar, phoneBody, pinkWash, circle } from "../components/ui";
import { blurUp } from "../components/fx";
import { AVATARS, AV_BG } from "../components/people";

const PW = 920;
const PHH = 1500;
const PHONE_TOP = 470;
const ICON = 240;

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const st = new Stage(ctx);

  const phone = st.layer(PW, PHH, (g, img) => {
    phoneBody(g, PW, PHH);
    statusBar(g, 96, 100, 728, "7:13", 1.15);
    glassPill(g, 70, 178, 136, 80);
    drawText(g, "Edit", 138, 218, { size: 36, weight: 600, color: C.ink, align: "center" });
    drawText(g, "Messages", PW / 2, 216, { size: 40, weight: 600, color: C.ink, align: "center" });
    glassPill(g, 764, 178, 80, 80);
    filterIcon(g, 804, 218, 1.1);
    const pins = [
      { x: 190, name: "Priya", av: "priya" },
      { x: PW / 2, name: "Moonlight", av: "" },
      { x: 730, name: "Dev", av: "dev" },
    ];
    for (const p of pins) {
      if (p.av) avatar(g, img[p.av], p.x, 380, 100, AV_BG[p.av]!);
      else appAvatar(g, p.x, 380, 100);
      drawText(g, p.name, p.x, 520, { size: 36, color: "#6c6c70", align: "center" });
    }
    // verified badge after the assistant's name
    const bx = PW / 2 + measure("Moonlight", { size: 36 }) / 2 + 22;
    g.fillStyle = "#8e8e93";
    circle(g, bx, 520, 13);
    g.fill();
    g.strokeStyle = "#fff";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(bx - 6, 520);
    g.lineTo(bx - 1, 525);
    g.lineTo(bx + 6, 515);
    g.stroke();
  }, { images: AVATARS, res: 1.5 });

  const wash = st.layer(1080, 1080, (g) => pinkWash(g, 1080, 1080), { pad: 0, res: 1 });

  const icon = st.layer(ICON, ICON, (g) => appIcon(g, 0, 0, ICON), { pad: 40 });

  const name = "Moonlight";
  const nst = { size: 72, weight: 600, color: C.ink, tracking: -1 };
  const total = measure(name, nst);
  let cx = 540 - total / 2;
  const letters = [...name].map((ch) => {
    const w = measure(ch, nst);
    const l = textLayer(st, ch, nst);
    const x = cx + w / 2;
    cx += w;
    return { l, x };
  });

  const tst = { size: 64, weight: 600, color: "#1c1c1e", tracking: -1 };
  const line1 = textLayer(st, "Your personal", tst);
  const line2 = textLayer(st, "assistant", { ...tst, color: "#48484a" });

  return ({ frame: f }) => {
    // Icon: pop in, then shrink down into the phone's pinned slot.
    const inP = iv(f, [5, 15], [0, 1], E.outBack);
    const move = iv(f, [32, 46], [0, 1], E.inOutCubic);
    const iconY = iv(move, [0, 1], [440, PHONE_TOP + 380]);
    const iconS = (0.55 + 0.45 * inP) * iv(move, [0, 1], [1, 200 / ICON]);
    icon.set({
      x: 540,
      y: iconY,
      s: iconS,
      op: iv(f, [5, 10], [0, 1]) * iv(f, [44, 48], [1, 0]),
      bx: iv(f, [5, 12], [14, 0]),
      by: iv(f, [5, 12], [14, 0]) + move * (1 - move) * 60,
    });

    letters.forEach(({ l, x }, i) => {
      blurUp(l, f, 12 + i * 1.2, x, 640, { dur: 8, dy: 16, blur: 14, outAt: 30 + i * 0.6, outDur: 6, outDy: -10 });
    });

    // Phone rises into place underneath.
    const rise = iv(f, [32, 50], [0, 1], E.outQuart);
    const exit = iv(f, [60, 68], [0, 1], E.inCubic);
    phone.set({
      x: 540,
      y: PHONE_TOP + PHH / 2 + (1 - rise) * 820 + exit * 40,
      op: iv(f, [32, 38], [0, 1]) * (1 - exit),
      bx: 0,
      by: (1 - rise) * 24 + exit * 30,
    });

    blurUp(line1, f, 38, 540, 200, { dur: 10, dy: 34, outAt: 59, outDur: 7, outDy: -20 });
    blurUp(line2, f, 41, 540, 272, { dur: 10, dy: 34, outAt: 60, outDur: 7, outDy: -20 });

    wash.set({ x: 540, y: 540 + (1 - iv(f, [34, 54], [0, 1], E.outCubic)) * 260, op: iv(f, [34, 52], [0, 1]) });
    st.look(540, 540, iv(f, [0, 70], [1, 1.015], E.inOutSine));
  };
}
