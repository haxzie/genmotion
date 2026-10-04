import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX, rx, ry } from "../components/stage";
import { glide, prog, outCubic, clamp01 } from "../components/ease";
import { label, measure, setLabel, withInter, type Label } from "../components/type";
import { svgTexture } from "../components/svg";
import { panel, rrect, text, chevron, cursorPanel } from "../components/ui";
import hubspotUrl from "../assets/hubspot.svg";
import sfUrl from "../assets/salesforce-logo.svg";
import excelUrl from "../assets/excel.svg";

/**
 * Global f923–f1041 (scene frame = global - 923). Hard cut in from the Assemble mark.
 * The Assemble composer: the prompt types itself, a CSV is dragged in and becomes an inline
 * chip, the rest of the brief types out, then the camera pushes in on Send and the cursor
 * clicks it. Laid out at "base" px (the f970–f1012 framing); a camera transform zooms it.
 */
const G0 = 923;
const TEAL_TEXT = "#4a7d93";
const LINE_X = 283;
const LINE_Y = [376, 423.5, 471, 518.5, 566];
const TXT = { weight: 400, tracking: 0.0 };

const L1A = "Build a Salesforce warm-account automation. Use the Accounts in";
const L1B = "as the source";
const LINES = [
  "data. Create them in Salesforce and set each Account’s status to Cold. Then, build an Apex",
  "automation that runs when an Account changes from Cold to Warm. The automation should create a",
  "follow-up Task for the Account owner, avoid duplicate open follow-up Tasks, and include tests so",
  "the logic is easy to review.",
];

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withInter(ctx, () => {
    const { scene, camera, height } = ctx;
    scene.background = new THREE.Color("#fcfcfd");
    fitCamera(camera, height, 50);

    const ui = new THREE.Group();
    ui.name = "composer";
    scene.add(ui);
    const at = (m: THREE.Object3D, x: number, y: number, z = 0) => m.position.set(rx(x), ry(y), z);

    /* chrome: chips, box, divider */
    const SMALL = 24;
    const chips = panel(720, 70, (g) => {
      rrect(g, 1, 1, 324, 60, 10, "#fdfdfd", "#e0e5e8", 2);
      // model glyph
      g.strokeStyle = "#8a8f94"; g.lineWidth = 2.4; g.lineJoin = "round";
      g.beginPath(); g.moveTo(24, 41); g.lineTo(31, 21); g.lineTo(38, 41); g.moveTo(34, 21); g.lineTo(41, 41); g.stroke();
      text(g, "Claude Fable 5", 60, 32, SMALL, "#5f6468", 500);
      chevron(g, 298, 31, 12, "#8a8f94");
      rrect(g, 343, 1, 352, 60, 10, "#fdfdfd", "#e0e5e8", 2);
      g.strokeStyle = "#8a8f94"; g.lineWidth = 2;
      for (const [x, y] of [[366, 22], [377, 22], [366, 33], [377, 33]] as const) g.strokeRect(x, y, 8, 8);
      text(g, "Default Workspace", 398, 32, SMALL, "#5f6468", 500);
      chevron(g, 670, 31, 12, "#8a8f94");
    }, 3, "composer-chips");
    at(chips, 250 + 360, 242 + 35);
    ui.add(chips);

    const box = panel(1419, 510, (g) => {
      rrect(g, 2, 2, 1415, 506, 16, "#fdfdfd", "#e1e6e9", 2);
      g.fillStyle = "#e3e8eb";
      g.fillRect(33, 389, 1349, 2);
      rrect(g, 33, 418, 191, 52, 8, "#f5f7f8", "#dfe5e8", 2);
      text(g, "Hubspot", 86, 444, SMALL, "#5f6468", 500);
      rrect(g, 242, 418, 208, 52, 8, "#f5f7f8", "#dfe5e8", 2);
      text(g, "Salesforce", 296, 444, SMALL, "#5f6468", 500);
    }, 3, "composer-box");
    at(box, 250 + 709.5, 330 + 255, -0.01);
    ui.add(box);
    // brand icons in the bottom chips
    const hsBg = new THREE.Mesh(new THREE.PlaneGeometry(30 * PX, 30 * PX), new THREE.MeshBasicMaterial({ color: "#ef4b2f" }));
    hsBg.name = "hubspot-chip-icon";
    at(hsBg, 283 + 34, 330 + 444, 0.001);
    const hsMark = new THREE.Mesh(new THREE.PlaneGeometry(20 * PX, 20 * PX), new THREE.MeshBasicMaterial({ map: svgTexture(ctx, hubspotUrl, 40, "#ffffff"), transparent: true, depthWrite: false }));
    at(hsMark, 283 + 34, 330 + 444, 0.002);
    const sfIcon = new THREE.Mesh(new THREE.PlaneGeometry(34 * PX, 34 * 191 / 273 * PX), new THREE.MeshBasicMaterial({ map: svgTexture(ctx, sfUrl, 68), transparent: true, depthWrite: false }));
    sfIcon.name = "salesforce-chip-icon";
    at(sfIcon, 522, 330 + 444, 0.001);
    ui.add(hsBg, hsMark, sfIcon);

    // send button: pale until the cursor arrives, then slate
    const sendPale = panel(92, 54, (g) => {
      rrect(g, 1, 1, 90, 52, 9, "#c7d8e1");
      g.strokeStyle = "#ffffff"; g.lineWidth = 3; g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath(); g.moveTo(46, 37); g.lineTo(46, 17); g.moveTo(37, 25); g.lineTo(46, 16); g.lineTo(55, 25); g.stroke();
    }, 5, "send-button");
    const sendDark = panel(92, 54, (g) => {
      rrect(g, 1, 1, 90, 52, 9, "#4a83a0");
      g.strokeStyle = "#ffffff"; g.lineWidth = 3; g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath(); g.moveTo(46, 37); g.lineTo(46, 17); g.moveTo(37, 25); g.lineTo(46, 16); g.lineTo(55, 25); g.stroke();
    }, 5, "send-button-active");
    at(sendPale, 1588, 773.5, 0.003);
    at(sendDark, 1588, 773.5, 0.004);
    ui.add(sendPale, sendDark);

    /* the prompt */
    const size = 100 * (886 / measure(L1A, { ...TXT, size: 100 }));
    const st = { ...TXT, size, color: TEAL_TEXT };
    const l1a = label(L1A, st, "left", 6);
    at(l1a, LINE_X, LINE_Y[0]!, 0.005);
    const chipX = LINE_X + measure(L1A, st) + 14;
    const chipW = 214;
    const csvChip = panel(chipW, 42, (g) => {
      rrect(g, 1, 1, chipW - 2, 40, 7, "#edf5f7", "#cfe1e6", 2);
      text(g, "accounts.csv", 50, 21.5, size * 0.84, TEAL_TEXT, 400);
    }, 4, "accounts-csv-chip");
    at(csvChip, chipX + chipW / 2, LINE_Y[0]!, 0.005);
    const xlsTex = svgTexture(ctx, excelUrl, 48, "#1f7a46");
    const chipIcon = new THREE.Mesh(new THREE.PlaneGeometry(24 * PX, 24 * PX), new THREE.MeshBasicMaterial({ map: xlsTex, transparent: true, depthWrite: false }));
    at(chipIcon, chipX + 30, LINE_Y[0]!, 0.006);
    const l1bX = chipX + chipW + 14;
    const l1b = label(L1B, st, "left", 6);
    at(l1b, l1bX, LINE_Y[0]!, 0.005);
    const rest = LINES.map((s, i) => {
      const l = label(s, st, "left", 6);
      at(l, LINE_X, LINE_Y[i + 1]!, 0.005);
      return l;
    });
    ui.add(l1a, csvChip, chipIcon, l1b, ...rest);

    // char advance tables for the typing mask
    const adv = (s: string) => {
      const out = [0];
      for (let i = 1; i <= s.length; i++) out.push(measure(s.slice(0, i), st));
      return out;
    };
    const segs: { l: Label; x0: number; a: number[] }[] = [
      { l: l1a, x0: LINE_X, a: adv(L1A) },
      { l: l1b, x0: l1bX, a: adv(L1B) },
      ...rest.map((l, i) => ({ l, x0: LINE_X, a: adv(LINES[i]!) })),
    ];
    const seg2Len = segs.slice(1).reduce((n, s) => n + s.a.length - 1, 0);
    const caret = new THREE.Mesh(new THREE.PlaneGeometry(2.5 * PX, 36 * PX), new THREE.MeshBasicMaterial({ color: "#3d6f86" }));
    caret.name = "text-caret";
    ui.add(caret);

    const typed1 = glide([[923, 0], [924.5, 0], [928, 12], [934, 38], [940, 43], [946, 58], [952, 64]]);
    const typed2 = glide([[970, 0], [976, 65], [982, 209], [988, 270], [994, 292], [1000, 312], [1006, 322], [1009, seg2Len]]);

    /* the dragged file */
    const file = new THREE.Group();
    file.name = "accounts-csv-file";
    const fileCard = panel(96, 112, (g) => {
      rrect(g, 18, 6, 60, 60, 10, "#ffffff", "#e3e8eb", 1.5);
      text(g, "accounts.csv", 48, 88, 15, "#6d7f88", 500, undefined, "center");
    }, 4, "file-card");
    const fileIcon = new THREE.Mesh(new THREE.PlaneGeometry(36 * PX, 36 * PX), new THREE.MeshBasicMaterial({ map: xlsTex, transparent: true, depthWrite: false }));
    fileIcon.position.set(0, 20 * PX, 0.001);
    file.add(fileCard, fileIcon);
    ui.add(file);
    const fileX = glide([[943, 1100], [946, 1067], [952, 1056], [958, 1027], [964, 1021], [968, 1021]]);
    const fileY = glide([[943, 800], [946, 750], [952, 750], [958, 565], [964, 554], [968, 554]]);

    /* the pointer */
    const pointer = cursorPanel(40, "pointer");
    scene.add(pointer);
    const pointerOn = (f: number) => (f >= 943 && f < 969) || f >= 1019;
    const pX = glide([[943, 1112], [946, 1079], [952, 1068], [958, 1039], [964, 1033], [968, 1033], [1019, 1700], [1024, 1618], [1028, 1619], [1032, 1612], [1042, 1612]]);
    const pY = glide([[943, 830], [946, 780], [952, 780], [958, 595], [964, 584], [968, 584], [1019, 950], [1024, 864], [1028, 816], [1032, 791], [1042, 791]]);

    /* camera */
    const S = glide([[923, 1.3], [930, 1.17], [940, 1.035], [955, 1.0], [1012, 1.0], [1018, 1.45], [1024, 1.78], [1032, 1.79], [1041, 1.83]]);
    const TX = glide([[923, -286], [930, -150], [940, -32], [955, 0], [1012, 0], [1018, -953], [1024, -1583], [1032, -1624], [1041, -1700]]);
    const TY = glide([[923, 117], [930, 60], [940, 16], [955, 0], [1012, 0], [1018, -388], [1024, -652], [1032, -663], [1041, -720]]);

    const toWorldX = (bx: number, s: number, tx: number) => (bx * s + tx - 960) * PX;

    return ({ frame: local }) => {
      const f = local + G0;
      const s = S(f), tx = TX(f), ty = TY(f);
      ui.scale.setScalar(s);
      ui.position.set((tx + 960 * (s - 1)) * PX, (540 - ty - 540 * s) * PX, 0);

      /* typing */
      const n1 = Math.floor(typed1(f));
      const n2 = Math.floor(typed2(f));
      const chipOn = prog(f, 968.5, 2, outCubic);
      let caretX = LINE_X, caretY = LINE_Y[0]!;
      // line 1a
      {
        const sg = segs[0]!;
        const k = Math.min(n1, sg.a.length - 1);
        const bx = sg.x0 + sg.a[k]!;
        setLabel(sg.l, { maskX: k >= sg.a.length - 1 ? 1e9 : toWorldX(bx, s, tx), opacity: 1 });
        caretX = bx; caretY = LINE_Y[0]!;
      }
      csvChip.visible = chipIcon.visible = chipOn > 0.01;
      (csvChip.material as THREE.MeshBasicMaterial).opacity = chipOn;
      (chipIcon.material as THREE.MeshBasicMaterial).opacity = chipOn;
      if (chipOn > 0.5) caretX = chipX + chipW + 4;
      let left = n2;
      for (let i = 1; i < segs.length; i++) {
        const sg = segs[i]!;
        const len = sg.a.length - 1;
        const k = clamp01(left / len) * len;
        const kk = Math.floor(k);
        setLabel(sg.l, { maskX: kk >= len ? 1e9 : toWorldX(sg.x0 + sg.a[kk]!, s, tx), opacity: kk > 0 ? 1 : 0 });
        if (left > 0 && kk > 0) {
          caretX = sg.x0 + sg.a[kk]!;
          caretY = i === 1 ? LINE_Y[0]! : LINE_Y[i - 1]!;
        }
        left -= len;
      }
      const blink = f < 1012 || Math.floor(f / 8) % 2 === 0;
      caret.visible = blink && f < 1016;
      at(caret, caretX + 3, caretY, 0.01);

      /* the file drag */
      const fOn = prog(f, 943, 3, outCubic) * (1 - prog(f, 966, 3, outCubic));
      file.visible = fOn > 0.01;
      at(file, fileX(f), fileY(f), 0.02);
      file.scale.setScalar(1.75 * (0.85 + 0.15 * fOn));
      (fileCard.material as THREE.MeshBasicMaterial).opacity = fOn;
      (fileIcon.material as THREE.MeshBasicMaterial).opacity = fOn;

      /* pointer: positions are in base px; place it through the camera transform */
      pointer.visible = pointerOn(f);
      const sx = pX(f) * s + tx, sy = pY(f) * s + ty;
      const press = f >= 1029 && f < 1032 ? 0.9 : 1;
      const cs = (f < 1000 ? 1 : 1.25) * press;
      pointer.scale.setScalar(cs);
      pointer.position.set(rx(sx) + (20 - 3.3) * cs * PX, ry(sy) - (30 - 3.3) * cs * PX, 0.05);

      /* send */
      const dark = prog(f, 1029, 2, outCubic);
      (sendDark.material as THREE.MeshBasicMaterial).opacity = dark;
      sendDark.visible = dark > 0.01;
    };
  });
}
