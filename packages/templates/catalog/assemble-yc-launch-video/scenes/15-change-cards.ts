import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX, rx, ry } from "../components/stage";
import { glide, prog, outCubic, inCubic } from "../components/ease";
import { withInter } from "../components/type";
import { svgTexture } from "../components/svg";
import { panel, rrect, text } from "../components/ui";
import sfUrl from "../assets/salesforce-logo.svg";

/**
 * Global f1206–f1246 (scene frame = global - 1206).
 * Assemble's timeline of governed Salesforce changes: each new change set lands on top of the
 * stack as a pale placeholder that fills in, pushing the older ones down; then the stack
 * lifts away.
 */
const G0 = 1206;
const W = 1272, H = 186, GAP = 206;

const CARDS: { title: string; sub: string; pill: "revert" | "reversible"; applied: string; t: number }[] = [
  { title: "Create 1 Account", sub: "Import target Account: Acme Renewals Group", pill: "revert", applied: "1 applied", t: 1203 },
  { title: "Create 1 Contact", sub: "Create buying committee Contact: Jordan Lee (Acme Renewals Group)", pill: "revert", applied: "1 applied", t: 1220 },
  { title: "Create 1 Opportunity", sub: "Open qualification Opportunity: Acme Renewals - Lifecycle Automation Pilot", pill: "revert", applied: "1 applied", t: 1225 },
  { title: "Update 3 Accounts", sub: "Qualify selected target Accounts from Cold to", pill: "reversible", applied: "3 applied", t: 1229 },
  { title: "Create 1 Task", sub: "Create owner follow-up Task: Acme Renewals Group", pill: "revert", applied: "1 applied", t: 1230.5 },
  { title: "Create 1 Task", sub: "Create regulated-industry review Task: Acme Renewals Group", pill: "revert", applied: "1 applied", t: 1237 },
];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withInter(ctx, () => {
    const { scene, camera, height } = ctx;
    scene.background = new THREE.Color("#fafbfc");
    fitCamera(camera, height, 50);

    const stack = new THREE.Group();
    stack.name = "change-timeline";
    scene.add(stack);
    const sfTex = svgTexture(ctx, sfUrl, 80);

    const cards = CARDS.map((c, i) => {
      const g = new THREE.Group();
      g.name = `change-card-${i + 1}`;
      const content = panel(W, H, (x) => {
        rrect(x, 1.5, 1.5, W - 3, H - 3, 14, "#fdfdfd", "#e1e7ea", 2.5);
        rrect(x, 38, 38, 48, 48, 9, "#ffffff", "#e3e8eb", 2);
        text(x, c.title, 116, 50, 28, "#1f2a3a", 500);
        text(x, c.sub, 116, 88, 26, "#6a7378", 400);
        const orange = c.pill === "revert";
        const pw = orange ? 306 : 239;
        rrect(x, 116, 120, pw, 48, 6, orange ? "#fbf1ea" : "#eef8f0", orange ? "#e8c3a6" : "#b8dfc0", 2);
        text(x, (orange ? "↶  Compensating revert" : "↻  Fully reversible"), 132, 145, 25, orange ? "#b5652b" : "#3c8f4f", 500);
        text(x, c.applied, 116 + pw + 18, 145, 25, "#9aa2a7");
        rrect(x, W - 186, 42, 141, 39, 6, "#eef8f0", "#b8dfc0", 2);
        text(x, "✓ APPLIED", W - 172, 62, 21, "#3c8f4f", 500);
        rrect(x, W - 172, 120, 143, 47, 7, "#ffffff", "#e1e6e9", 2);
        text(x, "↶  Revert", W - 152, 144, 25, "#4a5258", 400);
      }, 2, `${g.name}-content`);
      const logo = new THREE.Mesh(new THREE.PlaneGeometry(34 * PX, 34 * 191 / 273 * PX), new THREE.MeshBasicMaterial({ map: sfTex, transparent: true, depthWrite: false }));
      logo.position.set((62 - W / 2) * PX, (H / 2 - 62) * PX, 0.001);
      const ghost = panel(W, H, (x) => rrect(x, 1.5, 1.5, W - 3, H - 3, 14, "#e5f2f6", "#d5e7ee", 2), 1, `${g.name}-placeholder`);
      ghost.position.z = 0.002;
      g.add(content, logo, ghost);
      stack.add(g);
      return { g, content, logo, ghost, t: c.t, i };
    });

    const top = glide([[1203, 473], [1219, 470], [1225, 400], [1229, 346], [1235, 325], [1238, 300], [1246, 160]]);

    return ({ frame: local }) => {
      const f = local + G0;
      const out = prog(f, 1239, 10, inCubic);
      let slot = 0;
      for (let k = cards.length - 1; k >= 0; k--) {
        const c = cards[k]!;
        const p = prog(f, c.t, 4, outCubic);
        c.g.visible = f >= c.t;
        if (!c.g.visible) continue;
        // older cards slide down one slot as each new one lands
        const ahead = cards.filter((o) => o.i > c.i && f >= o.t);
        const pos = ahead.reduce((s, o) => s + prog(f, o.t, 4, outCubic), 0);
        void slot;
        const y = top(f) + pos * GAP + (1 - p) * -30;
        const xNudge = Math.min(4, pos) * 5;
        c.g.position.set(rx(300 + xNudge + W / 2), ry(y + H / 2), 0);
        const fill = prog(f, c.t + 3, 3, outCubic);
        (c.ghost.material as THREE.MeshBasicMaterial).opacity = p * (1 - fill);
        const o = fill * (1 - out) * (1 - Math.max(0, pos - 3.2) * 0.8);
        (c.content.material as THREE.MeshBasicMaterial).opacity = o;
        (c.logo.material as THREE.MeshBasicMaterial).opacity = o;
        slot++;
      }
    };
  });
}
