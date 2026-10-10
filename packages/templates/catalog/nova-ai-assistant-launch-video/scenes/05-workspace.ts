import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import { FONT_FAMILY } from "../components/brand";
import { screenLayer, track } from "../components/stage";
import { withFonts } from "../components/type";
import { backdrop, flood } from "../components/fx";
import { canvasPlane, rr, text, bars, drawMark, cursor } from "../components/ui";

/*
 * Nova's workspace. Pacing follows the reference beat (global frames 408-614):
 * a close-up of the window corner pulls back to the whole window, pushes into
 * the composer, a prompt types itself, the camera rushes to the send button,
 * a cursor clicks it and a blue bloom floods the frame into the next scene.
 * The window, copy and cursor are our own design.
 */
const F0 = 408;
const PROMPT = "Draft a plan for our spring launch";

// camera over the window: zoom, and the window point held at frame centre
const Z = track([[408, 3.0], [450, 2.75], [462, 2.3], [470, 1.45], [478, 1.06], [495, 1.0], [504, 1.03], [511, 2.0], [518, 2.55], [558, 2.7], [564, 3.3], [570, 5.6], [612, 5.9]]);
const FX = track([[408, -470], [450, -455], [466, -260], [478, -40], [495, 0], [504, 0], [518, 10], [558, 40], [564, 230], [570, 388], [612, 388]]);
const FY = track([[408, 300], [450, 290], [466, 160], [478, 20], [495, 0], [504, -20], [518, -40], [558, -40], [564, -70], [570, -88], [612, -88]]);

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: FONT_FAMILY, url: interUrl }], () => {
    const { scene, camera } = ctx;
    const layer = screenLayer(scene, camera);

    const bg = backdrop();
    bg.grad("#f3f5f9", "#eef2f8", [0, 1]);
    scene.add(bg);

    const world = new THREE.Group();
    world.name = "nova-window-shot";
    layer.add(world);

    /* soft dotted field around the composer, seen when we push in */
    const dots = canvasPlane(1400, 700, (g, w, h) => {
      for (let y = 6; y < h; y += 12) {
        for (let x = 6; x < w; x += 12) {
          const dx = (x - w / 2) / (w / 2);
          const dy = (y - h / 2) / (h / 2);
          const r = Math.sqrt(dx * dx + dy * dy);
          const a = Math.max(0, Math.min(1, (r - 0.35) * 1.8)) * Math.max(0, 1 - (r - 0.8) * 2.5);
          if (a <= 0.02) continue;
          g.fillStyle = `rgba(120,160,235,${(0.55 * a).toFixed(3)})`;
          g.beginPath();
          g.arc(x, y, 1.6, 0, Math.PI * 2);
          g.fill();
        }
      }
    }, 1.5);
    dots.name = "dot-field";
    dots.userData.pickable = false;
    dots.position.set(120, -60, 0);
    dots.renderOrder = 40;
    world.add(dots);

    /* the edge glow that travels around the window as it pulls back */
    const halo = canvasPlane(1700, 1060, (g, w, h) => {
      g.filter = "blur(26px)";
      const grad = g.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#5b8cff");
      grad.addColorStop(0.35, "#a27bff");
      grad.addColorStop(0.6, "#ff8fb1");
      grad.addColorStop(0.8, "#ffd166");
      grad.addColorStop(1, "#5bd6c0");
      g.strokeStyle = grad;
      g.lineWidth = 34;
      rr(g, 100, 100, w - 200, h - 200, 46);
      g.stroke();
    }, 1);
    halo.name = "window-edge-glow";
    halo.userData.pickable = false;
    halo.renderOrder = 45;
    world.add(halo);

    /* the window */
    const WW = 1500;
    const WH = 860;
    const win = canvasPlane(WW, WH, (g, w, h) => {
      g.fillStyle = "#ffffff";
      rr(g, 0, 0, w, h, 34);
      g.fill();
      // top bar: mark + name
      drawMark(g, 52, 50, 17);
      text(g, "Nova", 82, 51, 26, "#1d2230", 500);
      g.fillStyle = "#eef1f6";
      rr(g, w - 120, 34, 32, 32, 16);
      g.fill();
      rr(g, w - 76, 34, 32, 32, 16);
      g.fill();
      // left rail: icons + unreadable bars
      [130, 178, 226, 274].forEach((y, i) => {
        g.fillStyle = i === 0 ? "#3c7be8" : "#c9d0dc";
        rr(g, 34, y - 9, 18, 18, 5);
        g.fill();
      });
      bars(g, 66, 126, [86, 70, 92, 64], 9, 39, "#d6dbe4");
      bars(g, 34, 360, [150, 120, 170, 130, 110, 140], 8, 20, "#e6e9ef");
      g.fillStyle = "#e9edf4";
      g.beginPath();
      g.arc(52, h - 50, 16, 0, Math.PI * 2);
      g.fill();
      bars(g, 78, h - 54, [90], 8, 0, "#dde1e8");
      // greeting
      text(g, "What should we tackle today?", w / 2 + 60, h / 2 - 132, 40, "#1d2230", 450, "center");
    });
    win.name = "nova-window";
    world.add(win);

    /* composer glow + composer + its live content */
    const CW = 760;
    const CH = 200;
    const PAD = 24; // inner padding on every side of the composer
    const CY = -40;
    const glow = canvasPlane(CW + 420, CH + 380, (g, w, h) => {
      g.filter = "blur(48px)";
      g.fillStyle = "rgba(96,150,245,0.55)";
      rr(g, 150, 150, w - 300, h - 300, 60);
      g.fill();
    }, 1);
    glow.name = "composer-glow";
    glow.userData.pickable = false;
    glow.position.set(60, CY, 0);
    glow.renderOrder = 61;
    world.add(glow);

    const composer = canvasPlane(CW, CH, (g, w, h) => {
      g.fillStyle = "#ffffff";
      g.shadowColor = "rgba(40,80,160,0.18)";
      g.shadowBlur = 18;
      rr(g, 4, 4, w - 8, h - 8, 26);
      g.fill();
      g.shadowColor = "transparent";
      g.strokeStyle = "#e3e7ee";
      g.lineWidth = 1.5;
      g.stroke();
      // bottom row, centred 52px above the bottom edge: + , mode chip | model, mic, (send)
      const row = h - PAD - 28;
      text(g, "+", PAD + 8, row, 26, "#4a5163", 400);
      g.fillStyle = "#f1f4f9";
      rr(g, PAD + 40, row - 16, 150, 32, 16);
      g.fill();
      text(g, "Check with me", PAD + 56, row, 15, "#4a5163", 450);
      text(g, "Smart", w - PAD - 56 - 112, row, 16, "#4a5163", 450);
      text(g, "⌄", w - PAD - 56 - 64, row - 4, 16, "#4a5163", 450);
      // mic
      g.strokeStyle = "#4a5163";
      g.lineWidth = 2;
      rr(g, w - PAD - 56 - 34, row - 10, 10, 16, 5);
      g.stroke();
      g.beginPath();
      g.arc(w - PAD - 56 - 29, row, 9, 0.15 * Math.PI, 0.85 * Math.PI);
      g.stroke();
    }, 3);
    composer.name = "composer";
    composer.position.set(60, CY, 0);
    composer.renderOrder = 62;
    world.add(composer);

    // file chip that drops in, and the typed prompt (one plane per prefix length, drawn once)
    const chip = canvasPlane(196, 46, (g, w, h) => {
      g.fillStyle = "#eef2f8";
      rr(g, 0, 0, w, h, 12);
      g.fill();
      g.fillStyle = "#3c7be8";
      rr(g, 10, 9, 22, 28, 4);
      g.fill();
      text(g, "Launch notes", 42, h / 2, 17, "#1d2230", 500);
    }, 3);
    chip.name = "launch-notes-chip";
    const CHIP_Y = CY + CH / 2 - PAD - 23;
    chip.position.set(60 - CW / 2 + PAD + 98, CHIP_Y, 0);
    chip.renderOrder = 63;
    world.add(chip);

    const typed: THREE.Mesh[] = [];
    for (let n = 0; n <= PROMPT.length; n++) {
      const t = canvasPlane(560, 34, (g, w, h) => {
        text(g, PROMPT.slice(0, n), 0, h / 2, 21, "#1d2230", 450);
        g.font = `450 21px "${FONT_FAMILY}", Inter, sans-serif`;
        const cw = g.measureText(PROMPT.slice(0, n)).width;
        g.fillStyle = "#3c7be8";
        g.fillRect(cw + 2, 6, 2, h - 12);
      }, 3);
      t.position.set(60 - CW / 2 + PAD + 280, CY + CH / 2 - PAD - 46 - 18 - 17, 0);
      t.renderOrder = 63;
      t.visible = false;
      t.name = "prompt";
      world.add(t);
      typed.push(t);
    }

    // the send button
    const SEND = new THREE.Vector2(60 + CW / 2 - PAD - 28, CY - CH / 2 + PAD + 28);
    const send = canvasPlane(56, 56, (g, w) => {
      const grad = g.createLinearGradient(0, 0, w, w);
      grad.addColorStop(0, "#7fb0ff");
      grad.addColorStop(1, "#4d86f0");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(w / 2, w / 2, w / 2 - 1, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#ffffff";
      g.lineWidth = 3.4;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.beginPath();
      g.moveTo(w / 2, w * 0.72);
      g.lineTo(w / 2, w * 0.3);
      g.moveTo(w * 0.33, w * 0.46);
      g.lineTo(w / 2, w * 0.29);
      g.lineTo(w * 0.67, w * 0.46);
      g.stroke();
    }, 4);
    send.name = "send-button";
    send.position.set(SEND.x, SEND.y, 0);
    send.renderOrder = 64;
    world.add(send);

    /* the cursor and the bloom live in screen space */
    const ptr = cursor(84);
    layer.add(ptr);
    const bloom = flood("#4a86f2", "#7aa6f5");
    bloom.name = "send-bloom";
    bloom.material.uniforms.uAspect!.value = ctx.width / ctx.height;
    scene.add(bloom);

    return ({ frame }) => {
      const f = frame + F0;
      const z = Z(f);
      world.scale.setScalar(z);
      world.position.set(-FX(f) * z, -FY(f) * z, 0);

      // edge glow sweeps on, travels, fades as the window lands
      halo.material.opacity = interpolate(f, [414, 424, 452, 470], [0, 0.75, 0.6, 0]);
      halo.rotation.z = 0;
      halo.position.x = interpolate(f, [414, 470], [-40, 40]);

      glow.material.opacity = interpolate(f, [470, 484, 600, 612], [0, 1, 1, 0.4]);
      dots.material.opacity = interpolate(f, [500, 516], [0, 1]);

      // the greeting fades as we push into the composer (it lives in the window texture,
      // so dim the window's upper area by letting the composer stack carry the shot)
      chip.material.opacity = interpolate(f, [510, 516], [0, 1], Easing.easeOut);
      chip.position.y = CHIP_Y + interpolate(f, [510, 516], [-8, 0], Easing.easeOut);

      const n = Math.round(interpolate(f, [517, 557], [0, PROMPT.length]));
      typed.forEach((t, i) => (t.visible = f >= 516 && i === n));

      // cursor: glides in from the lower right, clicks, eases away
      const tIn = interpolate(f, [573, 585], [0, 1], Easing.easeOut);
      const press = interpolate(f, [587, 589, 593], [0, 1, 0]);
      const away = interpolate(f, [597, 606], [0, 1], Easing.easeIn);
      const bx = (SEND.x - FX(f)) * z;
      const by = (SEND.y - FY(f)) * z;
      ptr.visible = f >= 573 && f < 607;
      ptr.position.set(THREE.MathUtils.lerp(bx + 380, bx + 6, tIn) + away * 60, THREE.MathUtils.lerp(by - 420, by - 8, tIn) - away * 140, 0);
      ptr.scale.setScalar(1.6 * (1 - press * 0.12));
      send.scale.setScalar(1 - press * 0.1 + interpolate(f, [593, 597, 603], [0, 0.06, 0]));

      // light pushes out from the pressed button until it floods the frame
      const b = interpolate(f, [594, 614], [0, 1], Easing.easeIn);
      bloom.visible = f >= 594;
      bloom.set({
        x: 0.5 + bx / (1080 * (ctx.width / ctx.height)),
        y: 0.5 - by / 1080,
        radius: 0.12 + b * 2.4,
        soft: 0.35 + b * 0.4,
        core: interpolate(f, [594, 606, 614], [0.7, 0.45, 0.0]),
        amount: Math.min(1, b * 2.2),
      });
    };
  });
}
