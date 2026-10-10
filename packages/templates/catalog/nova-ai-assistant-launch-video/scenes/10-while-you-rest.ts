import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import { COLOR, FONT_FAMILY } from "../components/brand";
import { screenLayer, track } from "../components/stage";
import { label, setLabel, measure, withFonts } from "../components/type";
import { backdrop } from "../components/fx";
import { canvasPlane, rr, text, bars, drawMark } from "../components/ui";

/*
 * Out of the white flash: a two-line promise writes on word by word with the
 * last word inking blue; then Nova's home screen, where the camera pushes into
 * the task list and a finished task lifts off the page.
 * Pacing follows the reference beat (global frames 1722-1883); all content ours.
 */
const F0 = 1722;
const L1 = ["so", "work", "moves"];
const L2 = ["while", "you", "rest"];
const CUT = 1768;

const Z = track([[1768, 0.78], [1790, 0.86], [1800, 1.5], [1812, 1.62], [1870, 1.66], [1883, 1.58]]);
const FX = track([[1768, 0], [1790, 40], [1800, 330], [1883, 330]]);
const FY = track([[1768, 0], [1790, 0], [1800, 60], [1883, 70]]);

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: FONT_FAMILY, url: interUrl }], () => {
    const { scene, camera } = ctx;
    const layer = screenLayer(scene, camera);

    const bg = backdrop();
    bg.grad("#f7f8fb", "#f3f5f9", [0, 1]);
    scene.add(bg);

    /* the promise, laid out word by word */
    const style = { size: 92, weight: 450, pad: 30 };
    const sp = style.size * 0.27;
    const lay = (ws: string[], y: number) => {
      const widths = ws.map((w) => measure(w, style));
      const total = widths.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
      let x = -total / 2;
      return ws.map((w, i) => {
        const l = label(w, style, COLOR.ink);
        l.position.set(x + widths[i]! / 2, y, 0);
        x += widths[i]! + sp;
        layer.add(l);
        return l;
      });
    };
    const line1 = lay(L1, 58);
    const line2 = lay(L2, -58);
    const words = [...line1, ...line2];

    /* Nova home */
    const home = new THREE.Group();
    home.name = "nova-home";
    layer.add(home);
    const app = canvasPlane(1760, 1000, (g, w, h) => {
      g.fillStyle = "#ffffff";
      rr(g, 0, 0, w, h, 36);
      g.fill();
      drawMark(g, 54, 54, 18);
      text(g, "Nova", 84, 55, 26, "#1d2230", 500);
      bars(g, 40, 130, [200, 160, 220, 150, 190, 170, 140, 210], 12, 30, "#e7eaf0");
      text(g, "Good evening, Sam", 640, h - 160, 44, "#1d2230", 450, "center");
      g.fillStyle = "#f4f6fa";
      rr(g, 400, h - 100, 480, 52, 26);
      g.fill();
      // right task column
      g.fillStyle = "#f7f8fb";
      rr(g, w - 620, 90, 580, h - 130, 26);
      g.fill();
      g.fillStyle = "#e6f6ec";
      rr(g, w - 590, 112, 140, 36, 18);
      g.fill();
      text(g, "Activity", w - 556, 131, 18, "#1f7a43", 500);
    }, 1.5);
    app.name = "nova-home-screen";
    home.add(app);

    const TASKS = [
      { t: "Launch brief", s: "Ready", c: "#3c7be8" },
      { t: "Press list", s: "Needs a look", c: "#f7b500" },
      { t: "Weekly recap", s: "Writing…", c: "#9aa3b2" },
      { t: "Budget check", s: "Done", c: "#2bb24c" },
    ];
    const cards = TASKS.map((tk, i) => {
      const c = canvasPlane(540, 96, (g, w, h) => {
        g.fillStyle = "#ffffff";
        rr(g, 2, 2, w - 4, h - 4, 18);
        g.fill();
        g.strokeStyle = "#e6e9ef";
        g.lineWidth = 1.5;
        g.stroke();
        g.fillStyle = tk.c;
        g.beginPath();
        g.arc(36, h / 2, 9, 0, Math.PI * 2);
        g.fill();
        text(g, tk.t, 62, h / 2 - 14, 28, "#1d2230", 500);
        text(g, tk.s, 62, h / 2 + 20, 20, "#5b6475", 450);
      }, 3);
      c.name = tk.t.toLowerCase().replace(/ /g, "-") + "-card";
      c.renderOrder = 62;
      c.position.set(1760 / 2 - 330, 300 - i * 118, 0);
      home.add(c);
      return c;
    });
    // the glow that lifts the finished task
    const lift = canvasPlane(760, 300, (g, w, h) => {
      g.filter = "blur(30px)";
      g.fillStyle = "rgba(80,140,245,0.6)";
      rr(g, 110, 100, w - 220, h - 200, 40);
      g.fill();
    }, 1);
    lift.name = "launch-brief-glow";
    lift.userData.pickable = false;
    lift.renderOrder = 61;
    home.add(lift);

    return ({ frame, time }) => {
      const f = frame + F0;
      const first = f < CUT;

      /* words: write on left to right, blue sweeps through the last word */
      words.forEach((l, i) => {
        const at = 1722 + i * 4 + (i >= 3 ? 4 : 0);
        const k = interpolate(f, [at, at + 10], [0, 1], Easing.easeOut);
        const isLast = i === words.length - 1;
        const ink = interpolate(f, [at + 2, at + 12], [0, 1]);
        setLabel(l, {
          opacity: k,
          blur: (1 - k) * 12,
          color: isLast ? new THREE.Color(COLOR.ink).lerp(new THREE.Color(COLOR.accent), ink) : COLOR.ink,
        });
        l.position.x += 0;
        l.visible = first;
      });
      const drift = interpolate(f, [1722, CUT], [1, 1.04]);
      words.forEach((l) => l.scale.setScalar(drift));

      /* home: wide, then push into the task list; the first task lifts */
      home.visible = !first;
      const z = Z(f);
      home.scale.setScalar(z);
      home.position.set(-FX(f) * z, -FY(f) * z, 0);
      app.material.opacity = interpolate(f, [CUT, CUT + 6], [0, 1]);
      const up = interpolate(f, [1806, 1818], [0, 1], Easing.easeOut);
      cards.forEach((c, i) => {
        const k = interpolate(f, [CUT + 4 + i * 3, CUT + 14 + i * 3], [0, 1], Easing.easeOut);
        c.material.opacity = k;
        const base = 300 - i * 118;
        c.position.y = base - (1 - k) * 20 + (i === 0 ? 0 : -up * 22);
        if (i === 0) {
          c.scale.setScalar(1 + up * 0.08 + Math.sin(time * 2) * 0.003 * up);
          c.position.x = 1760 / 2 - 330 - up * 10;
          c.renderOrder = 70;
        }
      });
      lift.position.copy(cards[0]!.position);
      lift.material.opacity = up;
    };
  });
}
