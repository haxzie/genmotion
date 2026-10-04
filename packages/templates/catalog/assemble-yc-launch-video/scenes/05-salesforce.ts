import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX, RES, rx, ry } from "../components/stage";
import { glide, prog, outCubic, inCubic, clamp01 } from "../components/ease";
import { label, line, measure, setLabel, withInter, GREY_FROM } from "../components/type";
import { svgPlane } from "../components/svg";
import sfUrl from "../assets/salesforce-logo.svg";

/**
 * Global f396–f550 (scene frame = global - 396).
 * "A change" drifts left; "started in [Salesforce cloud] Salesforce" slides in after it.
 * The words clear, the cloud pushes in and lifts away up a hairline that leads down a chain
 * of departments (Billing -> Finance -> Compliance), each on its own arc with an icon,
 * scrolling up one level at a time. Everything clears by f548.
 */
const G0 = 396;

const CHAIN_X = 620;
const LEVEL = 560; // px between levels
const LOGO_TO_BILLING = 1035;
const PALE = new THREE.Color("#b2cbd8");
const HAIR = "#c6d6de";
const STEM = "#9aa6ac";

function canvasTex(w: number, h: number, draw: (g: OffscreenCanvasRenderingContext2D) => void) {
  const c = new OffscreenCanvas(w, h);
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

type IconKind = "receipt" | "invoice" | "shield";
function drawDeptIcon(g: OffscreenCanvasRenderingContext2D, kind: IconKind, s: number) {
  g.save();
  g.scale(s, s);
  g.fillStyle = "#b2cbd8";
  const BG = "#fdfdfd";
  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    g.beginPath();
    g.roundRect(x, y, w, h, r);
    g.fill();
  };
  if (kind === "receipt") {
    // rounded slip with a wavy bottom and three text bars
    g.beginPath();
    g.moveTo(-40, -45);
    g.arcTo(40, -45, 40, 45, 8);
    g.lineTo(40, 40);
    for (let i = 0; i < 4; i++) g.quadraticCurveTo(30 - i * 20, 52, 20 - i * 20, 42);
    g.lineTo(-40, 42);
    g.arcTo(-40, -45, 40, -45, 8);
    g.closePath();
    g.fill();
    g.fillStyle = BG;
    rr(-22, -24, 44, 9, 4.5);
    rr(-22, -4, 44, 9, 4.5);
    rr(-22, 16, 26, 9, 4.5);
  } else if (kind === "invoice") {
    g.beginPath();
    g.moveTo(-50, -55); g.lineTo(5, -55); g.lineTo(25, -35); g.lineTo(25, 55); g.lineTo(-50, 55); g.closePath(); g.fill();
    g.fillStyle = BG;
    g.beginPath(); g.moveTo(5, -55); g.lineTo(5, -35); g.lineTo(25, -35); g.closePath(); g.fill();
    rr(-38, -18, 34, 6, 3); rr(-38, -4, 26, 6, 3); rr(-38, 40, 8, 6, 3);
    g.beginPath(); g.arc(25, 22, 36, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#b2cbd8";
    g.beginPath(); g.arc(25, 22, 30, 0, Math.PI * 2); g.fill();
    g.fillStyle = BG;
    g.font = `700 40px Inter, sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("$", 25, 24);
  } else {
    g.beginPath();
    g.moveTo(-50, -55); g.lineTo(5, -55); g.lineTo(25, -35); g.lineTo(25, 55); g.lineTo(-50, 55); g.closePath(); g.fill();
    g.fillStyle = BG;
    rr(-38, -30, 44, 7, 3.5); rr(-38, -14, 34, 7, 3.5); rr(-38, 2, 24, 7, 3.5);
    g.beginPath(); g.arc(25, 25, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#b2cbd8";
    g.beginPath();
    g.moveTo(25, -2); g.lineTo(48, 7); g.lineTo(48, 25); g.quadraticCurveTo(46, 46, 25, 55); g.quadraticCurveTo(4, 46, 2, 25); g.lineTo(2, 7); g.closePath(); g.fill();
    g.strokeStyle = BG; g.lineWidth = 6; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); g.moveTo(14, 26); g.lineTo(22, 34); g.lineTo(37, 18); g.stroke();
  }
  g.restore();
}

/** a circle-arc polyline from a0 to a1 (radians, y-down screen convention), drawn as thin quads */
function arcMesh(name: string, radiusPx: number, a0: number, a1: number, colour: string, widthPx = 2) {
  const N = 160;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const a = a0 + ((a1 - a0) * i) / N;
    const c = Math.cos(a), s = Math.sin(a);
    const rIn = (radiusPx - widthPx / 2) * PX, rOut = (radiusPx + widthPx / 2) * PX;
    pos.push(c * rIn, -s * rIn, 0, c * rOut, -s * rOut, 0);
    if (i < N) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: colour, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  m.name = name;
  m.userData.pickable = false;
  return m;
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withInter(ctx, () => {
    const { scene, camera, height } = ctx;
    scene.background = new THREE.Color("#fdfdfd");
    fitCamera(camera, height, 50);

    /* --------------------------------------------------------- "A change" */
    const S1 = { weight: 450, tracking: 0.01 };
    const s1 = 100 * (452 / measure("A change", { ...S1, size: 100 }));
    const aChange = line("A change", { ...S1, size: s1 }, "center");
    aChange.group.position.y = ry(529);
    scene.add(aChange.group);
    const aInk = new THREE.Color("#585858");
    const aCx = glide([[396, 1110], [398, 1100], [400, 1068], [402, 1031], [404, 994], [406, 974], [408, 963], [410, 950], [412, 933], [414, 905], [416, 827], [418, 740]]);
    const changeExtra = glide([[397, 70], [400, 40], [402, 25], [406, 0]]);

    /* ------------------------------------- "started in [logo] Salesforce" */
    const S2 = { weight: 450, tracking: 0.015 };
    const s2 = 100 * (451 / measure("started in", { ...S2, size: 100 }));
    const started = label("started", { ...S2, size: s2 }, "left");
    const inW = label("in", { ...S2, size: s2 }, "left");
    const sfWord = label("Salesforce", { ...S2, size: s2 }, "left");
    started.name = "started";
    inW.name = "in";
    sfWord.name = "salesforce-word";
    const xStarted = 0, xIn = 451 - measure("in", { ...S2, size: s2 }), xSf = 1079 - 364;
    scene.add(started, inW, sfWord);
    const anchor = glide([[417, 640], [418, 600], [420, 492], [422, 431], [424, 399], [426, 390], [432, 364], [438, 345], [440, 323], [442, 286], [444, 250], [446, 200]]);
    const lineInk = new THREE.Color("#474747");
    const sfGrey = new THREE.Color("#a7a7a7");

    /* ------------------------------------------------- the Salesforce cloud */
    const LOGO_BASE = 720;
    const logo = svgPlane(ctx, sfUrl, LOGO_BASE, 191 / 273, undefined, "salesforce-logo");
    logo.renderOrder = 5;
    scene.add(logo);
    const nodeTex = canvasTex(128, 128, (g) => {
      g.fillStyle = "#fdfdfd";
      g.strokeStyle = "#b9cfda";
      g.lineWidth = 12;
      g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.fill(); g.stroke();
    });
    const nodeMat = new THREE.MeshBasicMaterial({ map: nodeTex, transparent: true, depthWrite: false });
    const quad = new THREE.PlaneGeometry(1, 1);
    const logoNode = new THREE.Mesh(quad, nodeMat);
    logoNode.name = "salesforce-node";
    logoNode.renderOrder = 6;
    scene.add(logoNode);

    const logoW = glide([[421, 0], [423, 120], [425, 170], [438, 174], [446, 260], [450, 358], [456, 415], [460, 586], [462, 690], [466, 710], [480, 710]]);
    const logoXk = glide([[438, 934], [446, 940], [450, 911], [454, 894], [456, 868], [458, 808], [460, 690], [462, 629], [466, 605], [474, 600]]);
    const B = glide([[446, 1564], [456, 1535], [461, 1525], [466, 1475], [470, 1350], [474, 1178], [479, 900], [485, 635], [491, 575], [494, 450], [497, 310], [500, 160], [503, 75], [509, 40], [515, -25], [518, -120], [521, -230], [524, -450], [527, -560], [533, -575], [539, -590], [542, -640], [545, -725], [548, -900]]);

    /* ----------------------------------------------------------- the chain */
    const chain = new THREE.Group();
    chain.name = "department-chain";
    scene.add(chain);
    const depts: { name: string; icon: IconKind }[] = [
      { name: "Billing", icon: "receipt" },
      { name: "Finance", icon: "invoice" },
      { name: "Compliance", icon: "shield" },
    ];
    const LBL = { size: 80, weight: 400, tracking: 0 };
    const lblSize = 80 * (300 / measure("Billing", LBL));
    const stemMat = new THREE.MeshBasicMaterial({ color: STEM, transparent: true, depthWrite: false });
    const bracketMat = new THREE.MeshBasicMaterial({ color: "#a9c4d2", transparent: true, depthWrite: false });
    const levels = depts.map((d, k) => {
      const g = new THREE.Group();
      g.name = `dept-${d.name.toLowerCase()}`;
      g.position.set(0, -k * LEVEL * PX, 0);
      chain.add(g);
      // label + brackets
      const lab = label(d.name, { ...LBL, size: lblSize, color: "#b2cbd8" }, "center");
      lab.name = `label-${d.name.toLowerCase()}`;
      const boxW = measure(d.name, { ...LBL, size: lblSize }) + 70, boxH = 176;
      const lgroup = new THREE.Group();
      lgroup.name = `${d.name.toLowerCase()}-tag`;
      lgroup.add(lab);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const b = new THREE.Mesh(quad, bracketMat);
        b.scale.set(13 * PX, 13 * PX, 1);
        b.position.set((sx * boxW) / 2 * PX, (sy * boxH) / 2 * PX, 0);
        lgroup.add(b);
      }
      lgroup.position.set(rx(CHAIN_X), 0, 0);
      g.add(lgroup);
      // stem from the thing above down to this label
      const stem = new THREE.Mesh(quad, stemMat);
      stem.name = `${d.name.toLowerCase()}-stem`;
      const stemLen = k === 0 ? LOGO_TO_BILLING - 255 - 88 : LEVEL - 176;
      stem.scale.set(2 * PX, stemLen * PX, 1);
      stem.position.set(rx(CHAIN_X), (88 + stemLen / 2) * PX, 0);
      g.add(stem);
      // the level's own big circle (label sits at its bottom)
      const circle = new THREE.Group();
      circle.name = `${d.name.toLowerCase()}-orbit`;
      circle.add(
        arcMesh(`${d.name.toLowerCase()}-orbit-left`, 950, Math.PI / 2 + 0.2, Math.PI / 2 + 0.78, HAIR),
        arcMesh(`${d.name.toLowerCase()}-orbit-right`, 950, Math.PI / 2 - 0.74, Math.PI / 2 - 0.2, HAIR),
      );
      circle.position.set(rx(CHAIN_X), 950 * PX, 0);
      g.add(circle);
      // connector arcs from the node above sweeping down to this icon
      const arcs = [[900, -1.2, 0.5], [1010, -1.05, 0.22]].map(([r, a0, a1], i) => {
        const a = arcMesh(`${d.name.toLowerCase()}-link-${i + 1}`, r!, a0!, a1!, HAIR);
        a.position.set(rx(CHAIN_X), 218 * PX, 0);
        g.add(a);
        return a;
      });
      // icon + its node
      const iconTex = canvasTex(200 * RES, 200 * RES, (cg) => {
        cg.translate(100 * RES, 100 * RES);
        drawDeptIcon(cg, d.icon, 1.95 * RES);
      });
      const icon = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ map: iconTex, transparent: true, depthWrite: false }));
      icon.name = `icon-${d.name.toLowerCase()}`;
      icon.scale.set(200 * PX, 200 * PX, 1);
      const ICON_UP = [330, 290, 150][k]!;
      icon.position.set(rx(1338), ICON_UP * PX, 0);
      const node = new THREE.Mesh(quad, nodeMat);
      node.name = `node-${d.name.toLowerCase()}`;
      node.scale.set(90 * PX, 90 * PX, 1);
      node.position.set(rx(1404), (ICON_UP + 125) * PX, 0);
      g.add(icon, node);
      return { g, lab, lgroup, stem, circle, arcs, icon, node };
    });
    const labelIn = [480, 500, 523];
    const iconIn = [477, 495, 518];
    const arcIn = [462, 486, 510];

    const tint = new THREE.Color();

    return ({ frame: local }) => {
      const f = local + G0;

      /* A change */
      const aOut = prog(f, 411, 6, inCubic);
      aChange.group.visible = f < 419;
      aChange.group.position.x = rx(aCx(f));
      aChange.words.forEach((w, i) => {
        const t0 = 396 + i * 2;
        const p = prog(f, t0, 7, outCubic);
        w.position.x = w.userData.restX + (i === 1 ? changeExtra(f) * PX : (1 - p) * 30 * PX);
        tint.copy(GREY_FROM).lerp(aInk, prog(f, t0, 8, outCubic));
        setLabel(w, { opacity: Math.min(1, p * 1.6) * (1 - aOut), blur: (1 - p) * 12 + aOut * 10, color: tint });
      });

      /* started in ... Salesforce */
      const ax = anchor(f);
      const sOut = prog(f, 441, 5, inCubic);
      const words: [typeof started, number, number, THREE.Color][] = [
        [started, xStarted, 417.5, lineInk],
        [inW, xIn, 419.5, lineInk],
        [sfWord, xSf, 423.5, sfGrey],
      ];
      for (const [w, x0, t0, ink] of words) {
        const p = prog(f, t0, 7, outCubic);
        w.visible = f >= t0 && sOut < 1;
        w.position.set(rx(ax + x0 + (1 - p) * 40), ry(529), 0);
        tint.copy(GREY_FROM).lerp(ink, prog(f, t0, 8, outCubic));
        setLabel(w, { opacity: Math.min(1, p * 1.6) * (1 - sOut), blur: (1 - p) * 12 + sOut * 12, color: tint });
      }

      /* logo */
      const lw = logoW(f);
      const b = B(f);
      const lx = f < 438 ? ax + 589 : logoXk(f);
      const ly = f < 446 ? 529 : b - LOGO_TO_BILLING;
      logo.visible = lw > 1;
      logo.position.set(rx(lx), ry(ly), 0);
      logo.scale.setScalar(lw / LOGO_BASE);
      const pLogo = prog(f, 421.5, 5, outCubic);
      (logo.material as THREE.MeshBasicMaterial).opacity = Math.min(1, pLogo * 1.5);
      const nodeOn = prog(f, 448, 4, outCubic);
      logoNode.visible = nodeOn > 0.01 && lw > 1;
      logoNode.position.set(rx(lx + 0.52 * lw), ry(ly + 0.07 * lw), 0.01);
      logoNode.scale.set(0.125 * lw * nodeOn * PX, 0.125 * lw * nodeOn * PX, 1);

      /* chain */
      const endFade = 1 - prog(f, 544, 4, inCubic);
      chain.visible = f >= 462;
      chain.position.y = ry(b);
      stemMat.opacity = prog(f, 468, 6, outCubic) * endFade;
      bracketMat.opacity = endFade;
      levels.forEach((L, k) => {
        const pl = prog(f, labelIn[k]!, 6, outCubic);
        L.lgroup.visible = pl > 0.01;
        L.lgroup.scale.setScalar(0.35 + 0.65 * pl);
        setLabel(L.lab, { opacity: pl * endFade, blur: (1 - pl) * 6 });
        const pi = prog(f, iconIn[k]!, 6, outCubic);
        L.icon.visible = L.node.visible = pi > 0.01;
        L.icon.scale.set(200 * (0.5 + 0.5 * pi) * PX, 200 * (0.5 + 0.5 * pi) * PX, 1);
        (L.icon.material as THREE.MeshBasicMaterial).opacity = pi * endFade;
        L.node.scale.set(90 * pi * PX, 90 * pi * PX, 1);
        const pa = prog(f, arcIn[k]!, 14, outCubic);
        for (const a of [...L.circle.children, ...L.arcs] as THREE.Mesh[]) {
          a.visible = pa > 0.01;
          (a.material as THREE.MeshBasicMaterial).opacity = pa * endFade;
        }
        L.stem.visible = k === 0 ? f >= 468 : pl > 0.01;
      });
      nodeMat.opacity = endFade;
      void clamp01;
    };
  });
}
