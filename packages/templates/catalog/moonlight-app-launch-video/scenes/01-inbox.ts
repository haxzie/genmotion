/** 0–4s · An inbox drowning in gigs, with the boss pinned front and centre. */
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { Stage, E, iv, drawText, measure } from "../components/kit";
import { C, avatar, statusBar, glassPill, filterIcon, chevron, circle } from "../components/ui";
import { AVATARS, AV_BG } from "../components/people";

const ROWS = [
  { name: "Priya", msg: "Invoice paid! 💸", time: "1:50 PM", av: "priya" },
  { name: "Dev", msg: "Can you ship it tonight?", time: "11:00 AM", av: "dev" },
  { name: "Boss", msg: "Quick call?", time: "10:34 AM", av: "boss" },
  { name: "Karen", msg: "Can we make it pop more?", time: "9:55 AM", av: "karen" },
  { name: "Marco", msg: "Still on for the DJ gig? 🎧", time: "1:30 PM", av: "marco" },
  { name: "Sam", msg: "Tutoring at 6 still ok? 📚", time: "2:25 PM", av: "sam" },
  { name: "Boss", msg: "Where are you?? 😤", time: "8:00 PM", av: "boss" },
  { name: "Priya", msg: "Logo v4 when you can 🎨", time: "7:20 AM", av: "priya" },
];

const ROW0 = 720;
const ROW_H = 170;
const LIST_H = ROW0 + ROWS.length * ROW_H + 120;
const SCROLL = 1100;

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const st = new Stage(ctx);

  const inbox = st.layer(1080, LIST_H, (g, img) => {
    statusBar(g, 200, 243, 680);
    glassPill(g, 185, 330, 118, 72);
    drawText(g, "Edit", 244, 366, { size: 32, weight: 600, color: C.ink, align: "center" });
    drawText(g, "Messages", 540, 364, { size: 36, weight: 600, color: C.ink, align: "center" });
    glassPill(g, 818, 330, 72, 72);
    filterIcon(g, 854, 366);

    const pins = [
      { x: 279, name: "Priya", av: "priya" },
      { x: 540, name: "Boss", av: "boss" },
      { x: 794, name: "Dev", av: "dev" },
    ];
    for (const p of pins) {
      avatar(g, img[p.av], p.x, 527, 88, AV_BG[p.av]!);
      drawText(g, p.name, p.x, 641, { size: 28, color: "#3c3c43", align: "center" });
    }
    // Status bubble over the boss
    const note = "Need you Saturday 😤";
    const nw = measure(note, { size: 28 }) + 44;
    const nx = 540 - nw / 2 + 20;
    g.save();
    g.shadowColor = "rgba(0,0,0,0.12)";
    g.shadowBlur = 20;
    g.shadowOffsetY = 4;
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.roundRect(nx, 412, nw, 64, 20);
    g.fill();
    g.beginPath();
    g.moveTo(nx + nw - 70, 470);
    g.lineTo(nx + nw - 44, 494);
    g.lineTo(nx + nw - 40, 470);
    g.fill();
    g.restore();
    drawText(g, note, nx + nw / 2, 445, { size: 28, color: C.ink, align: "center" });

    ROWS.forEach((r, i) => {
      const top = ROW0 + i * ROW_H;
      g.fillStyle = C.unread;
      circle(g, 190, top + 78, 9);
      g.fill();
      avatar(g, img[r.av], 257, top + 80, 42, AV_BG[r.av]!);
      drawText(g, r.name, 318, top + 50, { size: 32, weight: 600, color: C.ink });
      drawText(g, r.msg, 318, top + 94, { size: 30, color: C.grey });
      drawText(g, r.time, 858, top + 50, { size: 28, color: C.grey, align: "right" });
      chevron(g, 884, top + 50, 1);
      g.fillStyle = C.line;
      g.fillRect(318, top + 150, 590, 2);
    });
    // Home indicator
    g.fillStyle = "#1c1c1e";
    g.beginPath();
    g.roundRect(540 - 130, LIST_H - 70, 260, 10, 5);
    g.fill();
  }, { images: AVATARS, res: 2 });

  const scrollAt = (f: number) =>
    iv(f, [48, 66], [0, SCROLL], E.outExpo) + iv(f, [66, 120], [0, 24], E.inOutSine);

  return ({ frame: f }) => {
    const scroll = scrollAt(f);
    const v = Math.abs(scrollAt(f + 0.5) - scrollAt(f - 0.5));
    inbox.set({
      x: 540,
      y: LIST_H / 2 - scroll,
      op: iv(f, [0, 9], [0.35, 1], E.outCubic),
      bx: iv(f, [0, 9], [8, 0]),
      by: Math.min(v * 1.6, 220) + iv(f, [0, 9], [8, 0]) + iv(f, [116, 120], [0, 30]),
    });
    const zoom = iv(f, [0, 46, 66, 120], [0.9, 1.04, 1.0, 0.97], E.inOutCubic);
    st.look(540, iv(f, [0, 46], [560, 520], E.inOutCubic), zoom);
  };
}
