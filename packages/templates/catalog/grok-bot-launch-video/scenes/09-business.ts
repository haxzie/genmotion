import * as THREE from "three";
import { withFonts, track, Easing, interpolate, hash1, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";
import interUrl from "../assets/Inter.woff2";
import serifUrl from "../assets/Merriweather-400.woff2";
import slide4Url from "../assets/deck/slide-4.png";
import slide3Url from "../assets/deck/slide-3-foot.png";
import photoUrl from "../assets/deck/headphones-photo.png";
import { C } from "../components/brand";
import { botMesh, drawBot } from "../components/bots";
import { canvasMesh, fillRR, keys, layer, place, setOpacity, setupStage, text } from "../components/stage";
import { interstitial } from "../components/title";
import { callButton, clipPlanes, clipTo, panel, setClip, speechBubble, waveDot } from "../components/ui";

/**
 * 0:50.5–1:02.13 (reference frames 1515–1864). Local 0 = ref 1515.
 *  1515–1538 "Knows your business"
 *  1539–1626 a call with Deck Bot (orange); you ask it to share the deck
 *  1627–1730 the deck flies past to slide 6, "Year one: $8M in revenue."; the bot points at it
 *  1731–1831 it answers: slide 6 has sensitive financials — send without it?
 *  1832–1864 "good catch, yes"
 */
const REF0 = 1515;
const SERIF = '"Merriweather", Georgia, serif';
const ORANGE = "#ee5f0b";
const PEACH = "#fbefe8";
const DECK_BG = "#f9d2bb";

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: "Inter", url: interUrl }, { family: "Merriweather", url: serifUrl, weight: "400" }], () => {
    const { scene } = setupStage(ctx, C.white);
    ctx.renderer.localClippingEnabled = true;
    const bg = scene.background as THREE.Color;
    const loader = new THREE.TextureLoader(ctx.manager);
    const imgMesh = (name: string, url: string, w: number, h: number) => {
      const t = loader.load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
      m.name = name;
      return m;
    };

    // ------------------------------------------------------------ title
    const title = interstitial("Knows your business", 551, 355);
    title.mesh.name = "knows-your-business";
    scene.add(title.mesh);

    // ------------------------------------------------------------ call card
    const card = panel("deck-bot-call", { color: "#fdfdfd", radius: 79, shadow: 34, shadowY: 14, shadowA: 0.09, border: "#ececec", borderA: 0.5 });
    scene.add(card.mesh);
    const ctl = new THREE.Group();
    ctl.name = "call-controls";
    const bot = botMesh("orange", 78, "deck-bot", { eyes: { rot: -0.1, dy: 0.12, w: 0.11, h: 0.24, gap: 0.22 } });
    ctl.add(bot);
    const dots = Array.from({ length: 14 }, (_, i) => {
      const d = waveDot("#e8551a", `voice-dot-${i + 1}`, 6.5);
      ctl.add(d);
      return d;
    });
    const btns = (["gear", "chat", "mic", "end"] as const).map((k) => {
      const b = callButton(k, 98, `button-${k}`);
      ctl.add(b);
      return b;
    });
    layer(ctl, 10);
    scene.add(ctl);
    const clip = clipPlanes();
    const ask = speechBubble("Can you share the deck with the ad agency?", { size: 31.5, fg: "#ffffff", bg: ORANGE, padX: 22, h: 73, name: "bubble-can-you-share-the-deck-with-the-ad-agency" });
    const reply = canvasMesh("bubble-sure-heads-up-slide-6-has-sensitive-financials", 675, 113, (g) => {
      fillRR(g, 0, 0, 675, 113, 40, "#f1f1f1");
      text(g, "Sure. Heads up, slide 6 has sensitive", 26, 36, { size: 31.5, color: "#111114", tracking: -0.3 });
      text(g, "financials. Want me to send it without that?", 26, 77, { size: 31.5, color: "#111114", tracking: -0.3 });
    });
    clipTo(ask, clip);
    layer(ask, 11);
    layer(reply, 11);
    scene.add(ask, reply);

    // ------------------------------------------------------------ deck
    const deck = new THREE.Group();
    deck.name = "pitch-deck";
    const SW = 951, SH = 533, PITCH = 582, SX = 174;
    const slideNo = (n: number) =>
      canvasMesh(`slide-number-${n}`, 60, 50, (g) => text(g, `${n}.`, 0, 25, { size: 34, weight: 600, color: ORANGE }));
    const s3 = imgMesh("slide-3", slide3Url, SW, 126);
    const s4 = imgMesh("slide-4-eight-parts-a-cup", slide4Url, SW, SH);
    const s5 = canvasMesh("slide-5-launching-in-five-markets", SW, SH, (g) => {
      g.fillStyle = "#fcfcfc"; g.fillRect(0, 0, SW, SH);
      text(g, "Pendel", 46, 40, { size: 25, family: SERIF, color: "#111" });
      text(g, "Launching in five", 46, 108, { size: 49, family: SERIF, color: "#111", tracking: -1.8 });
      text(g, "markets at once.", 46, 156, { size: 49, family: SERIF, color: "#111", tracking: -1.8 });
      text(g, "France, Germany, Japan, Korea and Spain.", 46, 279, { size: 20, family: SERIF, color: "#222" });
      const rows = [["Channel", "Share", "Lead creative"], ["Pendel.com", "42%", "Product page and launch email"], ["Retail", "38%", "In-store display, the hanging key visual"], ["Marketplaces", "20%", "Listings and a 6-second video"]];
      rows.forEach((r, i) => {
        const y = 351 + i * 31 + (i ? 3 : 0);
        const st = { size: i ? 12 : 10, color: i ? "#222" : "#777" };
        text(g, r[0], 46, y, st); text(g, r[1], 225, y, st); text(g, r[2], 305, y, st);
        g.fillStyle = "#e6e6e6"; g.fillRect(46, y + 14, 480, 1);
      });
      text(g, "Creative brief 2026", 46, 494, { size: 10, color: "#666" });
    });
    const photo = imgMesh("slide-5-headphones-photo", photoUrl, 347, 460);
    // slide 6, drawn
    const X6 = [47, 225, 440, 654, 868];
    const Y6 = [444, 415, 370, 312, 238];
    const s6 = canvasMesh("slide-6-year-one-8m-in-revenue", SW, SH, (g) => {
      g.fillStyle = "#fcfcfc"; g.fillRect(0, 0, SW, SH);
      text(g, "Pendel", 47, 40, { size: 25, family: SERIF, color: "#111" });
      text(g, "Year one: $8M", 47, 108, { size: 49, family: SERIF, color: "#111", tracking: -2 });
      text(g, "in revenue.", 47, 158, { size: 49, family: SERIF, color: "#111", tracking: -2 });
      [["$249", "Price", 516], ["73%", "Gross margin", 663], ["32k", "Units, year one", 812]].forEach(([v, l, x]) => {
        text(g, v as string, x as number, 104, { size: 31, family: SERIF, color: "#111", tracking: -1 });
        text(g, l as string, x as number, 128, { size: 9.5, color: "#777" });
      });
      text(g, "Break-even in month 7. Launch marketing budget, $1.5M.", 515, 164, { size: 10.5, color: "#555" });
      text(g, "Cumulative revenue, year one", 47, 239, { size: 10.5, color: "#555" });
      // area + line
      g.beginPath();
      g.moveTo(X6[0], Y6[0]);
      for (let i = 1; i < X6.length; i++) {
        const xm = (X6[i - 1] + X6[i]) / 2;
        g.quadraticCurveTo(xm, (Y6[i - 1] + Y6[i]) / 2 + 6, X6[i], Y6[i]);
      }
      g.lineTo(X6[4], 447); g.lineTo(X6[0], 447); g.closePath();
      const gr = g.createLinearGradient(0, 238, 0, 447);
      gr.addColorStop(0, "rgba(238,95,11,0.22)"); gr.addColorStop(1, "rgba(238,95,11,0)");
      g.fillStyle = gr; g.fill();
      g.beginPath();
      g.moveTo(X6[0], Y6[0]);
      for (let i = 1; i < X6.length; i++) {
        const xm = (X6[i - 1] + X6[i]) / 2;
        g.quadraticCurveTo(xm, (Y6[i - 1] + Y6[i]) / 2 + 6, X6[i], Y6[i]);
      }
      g.strokeStyle = ORANGE; g.lineWidth = 2; g.stroke();
      g.fillStyle = "#e5e5e5"; g.fillRect(47, 447, 860, 1);
      ["$1.2M", "$2.9M", "$5.1M", "$8M"].forEach((l, i) => {
        const x = X6[i + 1], y = Y6[i + 1];
        g.beginPath(); g.arc(x, y, i === 3 ? 4 : 3.5, 0, Math.PI * 2);
        g.fillStyle = i === 3 ? ORANGE : "#fff"; g.fill(); g.strokeStyle = ORANGE; g.lineWidth = 1.5; g.stroke();
        text(g, l, x, y - (i === 3 ? 24 : 18), { size: i === 3 ? 22 : 17, family: SERIF, color: "#222", align: "center" });
      });
      ["Q1", "Q2", "Q3", "Q4"].forEach((q, i) => text(g, q, 154 + i * 214, 461, { size: 9, color: "#888", align: "center" }));
      text(g, "Creative brief 2026", 47, 494, { size: 10, color: "#666" });
      text(g, "Confidential, do not share", 904, 494, { size: 10, color: "#666", align: "right" });
    }, { res: 3 });
    const s7 = canvasMesh("slide-7", SW, SH, (g) => {
      g.fillStyle = "#fcfcfc"; g.fillRect(0, 0, SW, SH);
      g.strokeStyle = "#9a9a9e"; g.lineWidth = 16; g.lineCap = "round";
      g.beginPath(); g.moveTo(560, 0); g.lineTo(530, 60); g.stroke();
      g.strokeStyle = "#cfcfd2"; g.lineWidth = 10; g.beginPath(); g.moveTo(590, 0); g.lineTo(565, 55); g.stroke();
    });
    const slides = [s3, s4, s5, s6, s7];
    const nums = [null, slideNo(4), slideNo(5), slideNo(6), null];
    slides.forEach((s) => deck.add(s));
    nums.forEach((n) => n && deck.add(n));
    deck.add(photo);
    layer(deck, 20);
    photo.renderOrder = 21;
    deck.children.forEach((c) => { if (c.name.startsWith("slide-number")) c.renderOrder = 21; });
    scene.add(deck);

    const cursor = canvasMesh("deck-bot-cursor", 90, 110, (g) => {
      g.beginPath(); g.moveTo(45, 4); g.lineTo(62, 36); g.lineTo(45, 30); g.lineTo(28, 36); g.closePath();
      g.lineJoin = "round"; g.strokeStyle = "#fff"; g.lineWidth = 6; g.stroke(); g.fillStyle = ORANGE; g.fill();
      drawBot(g, "orange", 46, 72, 56, { eyes: { rot: -0.2, dy: 0.12, dx: -0.05 } });
    }, { pad: 4 });
    cursor.geometry.translate(0, -(55 - 4), 0); // tip at origin
    const cursorLayer = new THREE.Group();
    cursorLayer.add(cursor);
    layer(cursorLayer, 40);
    scene.add(cursorLayer);

    // ------------------------------------------------------------ good catch
    const yes = canvasMesh("good-catch-yes", 838, 220, (g) => {
      fillRR(g, 0, 0, 838, 220, 110, ORANGE);
      text(g, "good catch, yes", 419, 108, { size: 103, color: "#ffffff", align: "center", tracking: -1.5 });
    }, { res: 2.4 });
    layer(yes, 30);
    scene.add(yes);

    // ------------------------------------------------------------ timing
    const slide6Top = track([[1627, 1350], [1638, 698], [1647, 157], [1653, 126], [1659, 103], [1700, 94], [1731, 92]]);
    const curX = track([[1655, 820], [1665, 793], [1671, 789], [1683, 806], [1695, 847], [1701, 896], [1713, 893], [1725, 918], [1731, 920]]);
    const curY = track([[1655, 720], [1659, 643], [1665, 621], [1671, 598], [1683, 571], [1695, 594], [1713, 600], [1725, 612]]);

    return ({ frame: f, time }) => {
      const ref = f + REF0;
      const sTitle = ref < 1539, sAsk = ref >= 1539 && ref < 1627, sDeck = ref >= 1627 && ref < 1731;
      const sReply = ref >= 1731 && ref < 1832, sYes = ref >= 1832;
      bg.set(sTitle ? C.white : sDeck ? DECK_BG : PEACH);
      title.update(f, 0, 50, 20);
      if (!sTitle) title.mesh.visible = false;

      // ---- call card
      const callOn = sAsk || sReply || sYes;
      card.mesh.visible = ctl.visible = callOn && !sYes;
      ask.visible = (sAsk && ref >= 1584) || sReply;
      reply.visible = sReply;
      let top = 281, bottom = 438, row = 360;
      if (sAsk) {
        const g = interpolate(ref, [1584, 1594], [0, 1], Easing.easeInOut);
        top = THREE.MathUtils.lerp(281, 227, g);
        bottom = THREE.MathUtils.lerp(438, 506, g);
        row = top + 73 - THREE.MathUtils.lerp(-6, 0, g) - 0;
        row = THREE.MathUtils.lerp(360, 300, g);
        place(ask, 1076 - ask.userData.width / 2, THREE.MathUtils.lerp(470, 438.5, interpolate(ref, [1586, 1596], [0, 1], Easing.outCubic)));
      } else if (sReply) {
        top = 163; bottom = 571; row = 237;
        place(ask, 1076 - ask.userData.width / 2, 374);
        place(reply, 202 + 337.5, 488.5);
      }
      card.rect(173, top, 934, bottom - top);
      setClip(clip, 173, top, 934, bottom - top);
      if (callOn) {
        place(bot, 256, row);
        const talk = sAsk ? interpolate(ref, [1548, 1552, 1578, 1582], [0, 1, 1, 0]) : sReply ? interpolate(ref, [1731, 1734, 1806, 1812], [0, 1, 1, 0]) : 0;
        dots.forEach((d, i) => {
          const shown = sAsk ? interpolate(ref, [1539 + i * 0.6, 1541 + i * 0.6], [0, 1]) : 1;
          place(d, 316 + i * 15.6, row);
          const wob = 0.5 + 0.5 * Math.sin(time * 17 + hash1(i) * 6.28);
          const env = Math.exp(-Math.pow((i - 5) / 3.4, 2));
          d.scale.set(1, (1 + talk * env * (1.4 + 4 * wob * hash1(i + 3))) / 6, 1);
          setOpacity(d, shown);
        });
        const xs = [675, 790, 906, 1024];
        btns.forEach((b, i) => {
          const at = 1539 + [0, 1, 3, 6][i];
          const pop = sAsk ? interpolate(ref, [at - 2, at + 3, at + 6], [0, 1.08, 1], Easing.easeOut) : 1;
          place(b, xs[i], row);
          b.scale.setScalar(Math.max(0.001, pop));
          setOpacity(b, pop > 0.01 ? 1 : 0);
        });
      }

      // ---- deck
      deck.visible = sDeck;
      if (sDeck) {
        const t6 = slide6Top(ref);
        const tops = [t6 - 2 * PITCH - 126 + SH - 49 - SH + 49 + 0, t6 - 2 * PITCH, t6 - PITCH, t6, t6 + PITCH];
        tops[0] = tops[1] - 49 - 126;
        slides.forEach((s, i) => place(s, SX + SW / 2, tops[i] + (i === 0 ? 63 : SH / 2)));
        nums.forEach((n, i) => n && place(n, 132 + 30, tops[i] + 22));
        place(photo, SX + 557 + 173.5, tops[2] + 28 + 230);
      }
      cursorLayer.visible = sDeck && ref >= 1655;
      place(cursor, curX(ref) + Math.sin(time * 4) * 2, curY(ref));

      // ---- good catch
      yes.visible = sYes;
      if (sYes) {
        const p = interpolate(ref, [1832, 1840], [0.92, 1], Easing.outCubic);
        place(yes, 639, 361);
        yes.scale.setScalar(p);
      }
    };
  });
}
