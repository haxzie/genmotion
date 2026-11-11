import * as THREE from "three";
import { withFonts, Easing, interpolate, track, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import interUrl from "../assets/Inter.woff2";
import alexUrl from "../assets/call/alex.webm";
import mayaUrl from "../assets/call/maya.webm";
import kaiUrl from "../assets/call/kai.webm";
import { C } from "../components/brand";
import { botMesh } from "../components/bots";
import { botCursor, botMessage, drawAvatar, reactionPill } from "../components/chat";
import { footage } from "../components/footage";
import { mediaTile } from "../components/tile";
import { smoothCam, canvasMesh, fillRR, keys, layer, measure, place, setOpacity, setupStage, text } from "../components/stage";
import { clipPlanes, clipTo, drawMic, panel, setClip } from "../components/ui";

/**
 * 0:20.93–0:33.17 (reference frames 628–995). Local frame 0 = ref 628.
 * The camera dives from the call grid into the meeting chat; Research Bot
 * steps out of its avatar as a cursor, pulls up "What testers mentioned"
 * and drags along the curve; back in chat the reactions land, it asks
 * "Want me to ping marketing?", the camera pushes in on that line and a 👍
 * pops onto it.
 * World units = reference px of the close chat view (zoom 1).
 */
const REF0 = 628;

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: "Inter", url: interUrl }], () => {
    const { scene, view } = setupStage(ctx, C.white);
    ctx.renderer.localClippingEnabled = true;

    // ===================================================== call grid (world)
    // screen→world at ref 632: wx = (sx-640)/0.2372 - 1333, wy = (sy-360)/0.2372 - 272
    const W = (sx: number) => (sx - 640) / 0.2372 - 1333;
    const H = (sy: number) => (sy - 360) / 0.2372 - 272;
    const vids = [
      footage(ctx, alexUrl, { size: [506, 260] }),
      footage(ctx, mayaUrl, { size: [507, 260] }),
      footage(ctx, kaiUrl, { size: [506, 259] }),
    ];
    const tileRects: [number, number, number, number][] = [
      [W(10), H(55), W(468) - W(10), H(324) - H(55)],
      [W(488), H(54), W(946) - W(488), H(322) - H(54)],
      [W(10), H(342), W(468) - W(10), H(610) - H(342)],
    ];
    const tiles = ["alex", "maya", "kai"].map((n, i) => {
      const t = mediaTile(`video-tile-${n}`, vids[i].texture, 506 / 260);
      t.rect(...tileRects[i]);
      t.u.uRadius.value = 67;
      layer(t.mesh, 5);
      scene.add(t.mesh);
      return t;
    });
    const botTile = panel("research-bot-tile", { color: C.blueBg, radius: 67, shadow: 1, shadowA: 0, border: "#cfe0ee", borderA: 0.9 });
    botTile.rect(W(488), H(342), W(946) - W(488), H(608) - H(342));
    layer(botTile.mesh, 5);
    scene.add(botTile.mesh);
    const tileBot = botMesh("blue", 729, "research-bot-in-call", { eyes: { rot: 0, dy: 0.06, w: 0.1, h: 0.24, gap: 0.24 }, res: 0.8 });
    place(tileBot, W(708), H(474));
    layer(tileBot, 6);
    scene.add(tileBot);
    const tileLabel = canvasMesh("research-bot-label", 700, 100, (g) => text(g, "Research Bot", 0, 50, { size: 80, color: "#8a9099" }), { res: 0.8 });
    tileLabel.geometry.translate(350, 0, 0);
    place(tileLabel, W(510), H(585));
    layer(tileLabel, 6);
    scene.add(tileLabel);
    const BAR_W = 457, BAR_H = 52;
    const bar = canvasMesh("meeting-toolbar", BAR_W, BAR_H, (g) => {
      fillRR(g, 0, 0, BAR_W, BAR_H, 26, "#ffffff");
      g.strokeStyle = "#e3e3e3"; g.lineWidth = 1;
      g.beginPath(); g.roundRect(0.5, 0.5, BAR_W - 1, BAR_H - 1, 25.5); g.stroke();
      for (const x of [71, 148, 192, 236, 281, 325]) { g.beginPath(); g.arc(x, 26, 19, 0, Math.PI * 2); g.fillStyle = "#f1f3f4"; g.fill(); }
      drawMic(g, 71, 26, 16, "#3c4043");
      fillRR(g, 397, 7, 52, 38, 19, "#d93025");
    }, { res: 1 });
    const barScale = (W(849) - W(384)) / BAR_W;
    bar.scale.setScalar(barScale);
    place(bar, (W(384) + W(849)) / 2, (H(637) + H(678)) / 2);
    layer(bar, 6);
    scene.add(bar);

    // ===================================================== chat panel (world)
    const PANEL_L = 96, PANEL_R = 1213, PANEL_T = -1545, PANEL_B = 774;
    const borders = canvasMesh("chat-panel-frame", PANEL_R - PANEL_L, PANEL_B - PANEL_T, (g) => {
      g.strokeStyle = "#e6e6ea"; g.lineWidth = 3;
      g.beginPath(); g.roundRect(1.5, 1.5, PANEL_R - PANEL_L - 3, PANEL_B - PANEL_T - 3, 40); g.stroke();
      // header + empty-state copy, seen only from far away
      const ox = -PANEL_L, oy = -PANEL_T;
      g.beginPath(); g.arc(ox + 175, oy - 1482, 20, 0, Math.PI * 2); g.fillStyle = "#9a9aa0"; g.fill();
      text(g, "Launch kickoff", ox + 210, oy - 1482, { size: 44, weight: 500, color: "#1f1f1f" });
      text(g, "×", ox + 1133, oy - 1482, { size: 56, color: "#5f6368", align: "center" });
      text(g, "HISTORY IS ON", ox + 653, oy - 571, { size: 30, weight: 600, color: "#3c4043", align: "center", tracking: 1 });
      text(g, "Messages sent with history on are saved", ox + 653, oy - 504, { size: 34, color: "#5f6368", align: "center" });
      text(g, "Today", ox + 653, oy - 415, { size: 34, color: "#5f6368", align: "center" });
    }, { res: 0.9 });
    place(borders, (PANEL_L + PANEL_R) / 2, (PANEL_T + PANEL_B) / 2);
    layer(borders, 8);
    scene.add(borders);

    const input = canvasMesh("chat-input", 1100, 180, (g) => {
      fillRR(g, 0, 18, 98, 145, 49, "#edf2fb");
      g.strokeStyle = "#b9c4d6"; g.lineWidth = 3; g.lineCap = "round";
      g.beginPath(); g.moveTo(49, 72); g.lineTo(49, 108); g.moveTo(31, 90); g.lineTo(67, 90); g.stroke();
      fillRR(g, 130, 0, 762, 175, 87, "#f6f6f8");
      text(g, "History is on", 203, 91, { size: 40, color: "#c4c4ca" });
      text(g, "A", 710, 91, { size: 42, color: "#c4c4ca", align: "center" });
      g.fillStyle = "#c4c4ca"; g.fillRect(694, 115, 32, 3);
      text(g, "···", 822, 86, { size: 36, color: "#c4c4ca", align: "center" });
      fillRR(g, 915, 18, 100, 145, 50, "#f6f6f8");
      g.beginPath(); g.moveTo(950, 75); g.lineTo(990, 90); g.lineTo(950, 105); g.lineTo(958, 90); g.closePath(); g.fillStyle = "#d6d6dc"; g.fill();
    });
    input.geometry.translate(550, -90, 0);
    place(input, 132, 518);
    layer(input, 12);
    scene.add(input);

    // message list (list space → world y = listY + scroll)
    const list = new THREE.Group();
    list.name = "chat-messages";
    scene.add(list);
    const msg1 = botMessage("message-let-me-look-up-the-latest-tester-feedback", "Let me look up the latest tester feedback.");
    const msg1Empty = canvasMesh("avatar-empty", 69, 69, (g) => drawAvatar(g, 34.5, 34.5, 69, true));
    const msg2 = botMessage("message-testers-love-how-light-the-headphones-are", "Testers love how light the headphones are.");
    const msg3 = botMessage("message-want-me-to-ping-marketing", "Want me to ping marketing?", { header: "Research Bot  10:02 AM" });
    const heart1 = reactionPill("reaction-heart-1", "❤️", "1");
    const heart2 = reactionPill("reaction-heart-2", "❤️", "2");
    const phones = reactionPill("reaction-headphones-1", "🎧", "1", 133);
    const listY = { m1: 0, m2: 257, m3: 604 };
    list.add(msg1, msg1Empty, msg2, msg3, heart1, heart2, phones);
    local(msg1, 157, listY.m1 - 20);
    local(msg1Empty, 192, listY.m1 + 15);
    local(msg2, 157, listY.m2 - 20);
    local(msg3, 157, listY.m3 - 20);
    local(heart1, 234, listY.m2 + 159);
    local(heart2, 234, listY.m2 + 159);
    local(phones, 380, listY.m2 + 159);
    const listClip = clipPlanes();
    clipTo(list, listClip);
    layer(list, 10);
    function local(o: THREE.Object3D, x: number, y: number) {
      o.userData.lx = x;
      o.userData.ly = y;
      o.position.set(x - 640, 360 - y, 0);
    }

    // ===================================================== the chart
    const chart = new THREE.Group();
    chart.name = "chart-what-testers-mentioned";
    const CH_W = 1700, CH_H = 960;
    const X = (v: number) => 219 + (v - 20) * 16.6;
    const Y = (val: number) => 553 - (val - 25) * 4.133;
    const L = (v: number) => 90 - 55 * Math.exp(-(v - 20) / 22);
    const Cf = (v: number) => 50 - 19 * Math.pow(Math.max(0, (v - 20) / 62), 1.3);
    const P = (v: number) => 37 - 8 * ((v - 20) / 62);
    const chartBg = panel("chart-card", { color: "#fcfcfc", radius: 0, shadow: 60, shadowY: 0, shadowA: 0.07 });
    const chartBgLayer = new THREE.Group();
    chartBgLayer.name = "chart-card-layer";
    chartBgLayer.add(chartBg.mesh);
    layer(chartBgLayer, 20); // a group, so it sorts above the chat-messages group (10)
    scene.add(chartBgLayer);
    const chartArt = canvasMesh("chart-lines", CH_W, CH_H, (g) => {
      g.translate(0, 120);
      text(g, "What testers mentioned", 62, 55, { size: 66, weight: 500, color: "#111114", tracking: -1.4 });
      const leg = (x: number, col: string, label: string) => {
        fillRR(g, x, 152, 50, 9, 4.5, col);
        text(g, label, x + 74, 157, { size: 46, color: "#55555c", tracking: -0.4 });
      };
      leg(64, C.blue, "Lightness");
      leg(394, "#a3a3aa", "Comfort");
      leg(701, "#d3d3d8", "Price");
      for (const [v, y] of [[100, 243], [75, 348], [50, 449], [25, 553]] as const) {
        text(g, String(v), 64, y, { size: 42, color: "#8a8a93" });
        g.fillStyle = "#ececf0";
        g.fillRect(182, y - 1, 1500, 2);
      }
      g.strokeStyle = "#e2e2e6"; g.lineWidth = 2; g.setLineDash([6, 8]);
      for (const v of [20, 40, 60, 80]) {
        g.beginPath(); g.moveTo(X(v), 243); g.lineTo(X(v), 600); g.stroke();
        text(g, String(v), X(v), 660, { size: 42, color: "#8a8a93", align: "center" });
      }
      g.setLineDash([]);
      const curve = (fn: (v: number) => number) => {
        g.beginPath();
        for (let v = 20; v <= 110; v += 0.5) {
          const x = X(v), y = Y(fn(v));
          if (v === 20) g.moveTo(x, y); else g.lineTo(x, y);
        }
      };
      // fill under the lightness curve
      curve(L);
      g.lineTo(X(110), 600);
      g.lineTo(X(20), 600);
      g.closePath();
      const gr = g.createLinearGradient(0, 260, 0, 600);
      gr.addColorStop(0, "rgba(25,136,246,0.30)");
      gr.addColorStop(1, "rgba(25,136,246,0.0)");
      g.fillStyle = gr;
      g.fill();
      g.lineCap = "round";
      curve(P); g.strokeStyle = "#d6d6db"; g.lineWidth = 5; g.stroke();
      curve(Cf); g.strokeStyle = "#a9a9b0"; g.lineWidth = 5; g.stroke();
      curve(L); g.strokeStyle = C.blue; g.lineWidth = 6; g.stroke();
    }, { res: 2.4 });
    chartArt.geometry.translate(CH_W / 2, -CH_H / 2 + 120, 0);
    chart.add(chartArt);
    const marker = (name: string, ring: string) =>
      canvasMesh(name, 30, 30, (g) => {
        g.beginPath(); g.arc(15, 15, 11, 0, Math.PI * 2);
        g.fillStyle = "#fff"; g.fill(); g.strokeStyle = ring; g.lineWidth = 5; g.stroke();
      }, { res: 4 });
    const mL = marker("marker-lightness", C.blue);
    const mC = marker("marker-comfort", "#a9a9b0");
    chart.add(mL, mC);
    // tooltip
    const TT_W = 304, TT_H = 203;
    const tip = new THREE.Group();
    tip.name = "tooltip-80-testers";
    const tipBg = canvasMesh("tooltip-card", TT_W, TT_H, (g) => {
      fillRR(g, 0, 0, TT_W, TT_H, 18, "#ffffff", { blur: 20, y: 6, color: "rgba(0,0,0,0.08)" });
      g.strokeStyle = "#e8e8ec"; g.lineWidth = 1.5; g.beginPath(); g.roundRect(0.75, 0.75, TT_W - 1.5, TT_H - 1.5, 18); g.stroke();
      text(g, "80 testers", 20, 30, { size: 17, color: "#55555c" });
      const row = (y: number, col: string, label: string) => {
        g.beginPath(); g.arc(28, y, 6.5, 0, Math.PI * 2); g.fillStyle = col; g.fill();
        text(g, label, 44, y + 1, { size: 18, color: "#2b2b30" });
      };
      row(63, C.blue, "Lightness");
      row(96, "#a9a9b0", "Comfort");
      row(129, "#e0e0e4", "Price");
    }, { pad: 24, res: 4 });
    tipBg.geometry.translate(TT_W / 2, -TT_H / 2, 0);
    tip.add(tipBg);
    const num = (n: number, y: number) => {
      const m = canvasMesh(`value-${n}`, 60, 26, (g) => text(g, `${n}%`, 60, 13, { size: 18, color: "#2b2b30", align: "right" }), { res: 4 });
      m.geometry.translate(-30, 0, 0);
      m.position.set(285, -y, 0);
      tip.add(m);
      return m;
    };
    const nums = {
      l: Array.from({ length: 13 }, (_, i) => num(77 + i, 63)),
      c: Array.from({ length: 9 }, (_, i) => num(33 + i, 96)),
      p: Array.from({ length: 5 }, (_, i) => num(30 + i, 129)),
    };
    chart.add(tip);
    layer(chart, 21);
    layer(tip, 23);
    scene.add(chart);

    // ===================================================== bot cursor + 👍
    const cursor = botCursor("research-bot-cursor", 1.3);
    // its own top layer: group order outranks a mesh's renderOrder, so a
    // root-level cursor would sort under the chart and message groups
    const cursorLayer = new THREE.Group();
    cursorLayer.name = "cursor-layer";
    cursorLayer.add(cursor);
    layer(cursorLayer, 100);
    scene.add(cursorLayer);
    const thumbs = reactionPill("reaction-thumbs-up-1", "👍", "1", 116, 66, { bg: "#dbe7fb", border: "#3a74d6", size: 36 });
    const thumbsLayer = new THREE.Group();
    thumbsLayer.name = "reaction-layer";
    thumbsLayer.add(thumbs);
    layer(thumbsLayer, 40);
    scene.add(thumbsLayer);

    // ===================================================== timing
    const r = (ref: number) => ref - REF0;
    const cam = smoothCam([
      [r(628), -1400, -272, 0.226], [r(632), -1333, -272, 0.2372], [r(640), -1048, -133, 0.263],
      [r(650), 650, 380, 0.93], [r(660), 640, 360, 1.0], [r(688), 640, 360, 1.03],
      [r(722), 1365, 360, 1.0], [r(734), 1445, 360, 1.0], [r(748), 1445, 360, 1.0],
    ]);
    const scroll = track([[r(828), 24], [r(838), 24], [r(850), -55], [r(866), -55], [r(884), -366]]);
    const bigCam = smoothCam([[r(884), 640, 360, 1.0], [r(894), 600, 340, 1.3], [r(906), 430, 296, 2.85], [r(912), 455, 293, 2.96], [r(958), 677, 291, 2.96]]);
    // the cursor's screen path while leaving the avatar (ref px on screen)
    const curX = track([[r(685), 192], [r(692), 155], [r(700), 150], [r(712), 230], [r(722), 410], [r(730), 448], [r(748), 470]]);
    const curY = track([[r(685), 262], [r(692), 300], [r(700), 340], [r(712), 490], [r(722), 548], [r(730), 540], [r(748), 530]]);
    const pointV = track([[r(748), 30], [r(762), 33], [r(822), 56], [r(830), 57]]);

    return ({ frame: f }) => {
      const ref = f + REF0;
      const chatPhase = ref < 828;
      const chartPhase = ref >= 706 && ref < 828;

      // videos (they loop the clip; the grid is only seen for ~20 frames)
      vids.forEach((v) => v.seek(((ref - 434) / 30) % 4.8));

      // ---- camera
      let cx: number, cy: number, z: number;
      if (ref < 828) [cx, cy, z] = cam(f);
      else [cx, cy, z] = bigCam(f);

      // chart slides in from the right and owns the camera after 722
      const slide = interpolate(ref, [706, 722], [1, 0], Easing.outCubic);
      const chartOX = 805 + slide * 1280;
      let pv = pointV(f);
      if (ref < 748) pv = 30;
      const px = X(pv), py = Y(L(pv));
      if (chartPhase && ref >= 748) {
        const zin = interpolate(ref, [748, 764], [0, 1], Easing.easeInOut);
        const ccx = THREE.MathUtils.lerp(640, px, zin);
        const ccy = THREE.MathUtils.lerp(360, py - 12, zin);
        z = Math.exp(THREE.MathUtils.lerp(0, Math.log(1.55), zin));
        cx = chartOX + ccx;
        cy = ccy;
      }
      view(cx, cy, z);
      const uPx = 1.5 * z;
      [...tiles.map((t) => t.u), botTile.u, chartBg.u].forEach((u) => (u.uPx.value = uPx));

      // ---- grid visible only while zoomed out
      const gridOn = ref < 660;
      tiles.forEach((t) => (t.mesh.visible = gridOn));
      botTile.mesh.visible = tileBot.visible = tileLabel.visible = bar.visible = gridOn;

      // ---- chat list
      const sc = ref < 828 ? 247 : scroll(f);
      list.position.y = -sc;
      setClip(listClip, 96, -3000, 1117, 3000 + 515);
      list.visible = true;
      setOpacity(msg1, ref < 650 ? interpolate(ref, [642, 650], [0, 1]) : 1);
      msg1.visible = true;
      const leftAvatar = ref >= 686 && ref < 828;
      const m2in = interpolate(ref, [826, 834], [0, 1], Easing.outCubic);
      setOpacity(msg2, ref >= 828 ? m2in : 0);
      msg2.position.y = 360 - (msg2.userData.ly + (1 - m2in) * 40);
      setOpacity(heart1, ref >= 840 && ref < 848 ? 1 : 0);
      setOpacity(heart2, ref >= 848 ? 1 : 0);
      setOpacity(phones, ref >= 840 ? 1 : 0);
      const pop = (at: number) => interpolate(ref, [at, at + 4, at + 7], [0.6, 1.08, 1]);
      heart1.scale.setScalar(pop(840));
      phones.scale.setScalar(pop(840));
      heart2.scale.setScalar(ref < 852 ? pop(848) : 1);
      const m3in = interpolate(ref, [866, 875], [0, 1], Easing.outCubic);
      setOpacity(msg3, ref >= 866 ? m3in : 0);
      msg3.position.y = 360 - (msg3.userData.ly + (1 - m3in) * 40);
      input.visible = ref < 900;
      borders.visible = ref < 900;

      // ---- chart
      chart.visible = chartBg.mesh.visible = chartPhase;
      chart.position.set(chartOX - 640, 360, 0);
      chartBg.rect(chartOX, -2000, 4000, 4000);
      mL.position.set(px, -py, 0);
      mC.position.set(px, -Y(Cf(pv)), 0);
      setOpacity(mC, interpolate(ref, [756, 762], [0, 1]));
      setOpacity(mL, interpolate(ref, [752, 756], [0, 1]));
      const tIn = interpolate(ref, [756, 763], [0, 1], Easing.outCubic);
      setOpacity(tip, tIn);
      tip.scale.setScalar(0.94 + 0.06 * tIn);
      tip.position.set(px - TT_W / 2, -(py - 35 - TT_H), 0);
      const tt = interpolate(ref, [762, 815], [0, 1], Easing.easeInOut);
      const show = (arr: THREE.Mesh[], base: number, v: number) => arr.forEach((m, i) => (m.visible = base + i === Math.round(v) && tIn > 0.01));
      show(nums.l, 77, 77 + 12 * tt);
      show(nums.c, 33, 41 - 8 * tt);
      show(nums.p, 30, 34 - 4 * tt);

      // ---- bot cursor
      cursor.visible = ref >= 685 && ref < 828;
      if (cursor.visible) {
        let wx: number, wy: number;
        if (ref < 748) {
          // screen path → world
          wx = cx + (curX(f) - 640) / z;
          wy = cy + (curY(f) - 360) / z;
          // hotspot is the arrow tip; offset so the bot body sits on the path
          wx += 34; wy -= 44;
        } else {
          const grab = interpolate(ref, [748, 760], [0, 1], Easing.easeInOut);
          const fromX = cx + (470 - 640) / z + 34, fromY = cy + (530 - 360) / z - 44;
          wx = THREE.MathUtils.lerp(fromX, chartOX + px - 640 + 640, grab);
          wy = THREE.MathUtils.lerp(fromY, py, grab);
        }
        place(cursor, wx, wy);
        cursor.scale.setScalar(interpolate(ref, [685, 692], [0.7, 1]));
      }
      setOpacity(msg1Empty, leftAvatar ? 1 : 0);

      // ---- 👍
      const tp = interpolate(ref, [958, 963, 967], [0, 1.12, 1], Easing.easeOut);
      thumbs.visible = ref >= 958;
      place(thumbs, 750, 229 + sc + 366 - 0);
      thumbs.scale.setScalar(Math.max(0.001, tp));
    };
  });
}
