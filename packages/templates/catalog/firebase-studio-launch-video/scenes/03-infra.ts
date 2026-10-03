/**
 * 03 — "Global infrastructure" / "Zero DevOps" (film frames 153–247, 24 fps)
 * Black ground, two scrolling server racks either side, the line hung between
 * them by two square nodes. The racks' cells, widths and scroll phase are
 * measured per frame off the reference (components/rackData.ts).
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { pixelStage, sx, sy, H } from "../components/stage";
import { withBrandFonts, FONT_MONO, C } from "../components/brand";
import { label, letters, setLabel, measure, type TypeStyle } from "../components/type";
import { RACKS } from "../components/rackData";
import { sampled, clamp01 } from "../components/ease";

const START = 153;
const HERO: TypeStyle = { size: 129, weight: 500, tracking: -0.025, color: "#ffffff" };
const MONO: TypeStyle = { size: 31, weight: 400, tracking: 0, font: FONT_MONO, color: "#959595" };

const FRAG_LINES = /* glsl */ `
uniform float uPitch;
uniform float uPhase;
varying vec2 vS; // screen px (x right, y down)
void main() {
  float d = abs(mod(vS.y - 0.5 - uPhase + uPitch * 0.5, uPitch) - uPitch * 0.5);
  float a = 1.0 - smoothstep(0.3, 0.9, d);
  gl_FragColor = vec4(vec3(1.0), a * 0.92);
}`;
const VERT_LINES = /* glsl */ `
varying vec2 vS;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vS = vec2(w.x + ${960.0.toFixed(1)}, ${540.0.toFixed(1)} - w.y);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

function solid(w: number, h: number, color: string, name: string, order = 5) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
  );
  m.name = name;
  m.renderOrder = order;
  return m;
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withBrandFonts(ctx, () => {
    const { scene } = ctx;
    pixelStage(ctx, "#000000");

    // ---- racks: up to 4 columns, each a line field + its border + a pool of filled cells
    const racks = new THREE.Group();
    racks.name = "server-racks";
    scene.add(racks);
    const cols = [0, 1, 2, 3].map((i) => {
      const mat = new THREE.ShaderMaterial({
        uniforms: { uPitch: { value: 64 }, uPhase: { value: 0 } },
        vertexShader: VERT_LINES,
        fragmentShader: FRAG_LINES,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const field = new THREE.Mesh(new THREE.PlaneGeometry(1, H), mat);
      field.name = `rack-column-${i + 1}`;
      field.renderOrder = 4;
      const edgeL = solid(1, H, "#ffffff", `rack-column-${i + 1}-edge-left`, 6);
      const edgeR = solid(1, H, "#ffffff", `rack-column-${i + 1}-edge-right`, 6);
      const cells = Array.from({ length: 14 }, (_, k) => solid(1, 1, "#ffffff", `rack-column-${i + 1}-cell-${k + 1}`, 5));
      racks.add(field, edgeL, edgeR, ...cells);
      return { field, mat, edgeL, edgeR, cells };
    });

    // ---- the line and its nodes
    const nodeL = solid(19, 19, C.orange, "node-left", 8);
    const nodeR = solid(19, 19, C.orange, "node-right", 8);
    const wireL = solid(1, 1.5, "#b0561a", "wire-left", 7);
    const wireR = solid(1, 1.5, "#b0561a", "wire-right", 7);
    scene.add(nodeL, nodeR, wireL, wireR);

    // copy swapped from the reference: offsets keep each line centred where the original sat
    const OLD_SOTA = "SOTA infrastructure", NEW_SOTA = "Global infrastructure";
    const OLD_MGMT = "management", NEW_MGMT = "DevOps";
    const sotaShift = (measure(OLD_SOTA, HERO) - measure(NEW_SOTA, HERO)) / 2;
    const pairShift = (measure(OLD_MGMT, HERO) - measure(NEW_MGMT, HERO)) / 2;
    const sota = label(NEW_SOTA, HERO, "left");
    sota.name = "sota-infrastructure";
    const zero = label("Zero", HERO, "left");
    zero.name = "zero";
    const mgmt = label(NEW_MGMT, HERO, "left");
    mgmt.name = "management";
    for (const t of [sota, zero, mgmt]) t.renderOrder = 10;
    const gpus = letters("Built on Google Cloud", MONO);
    gpus.group.name = "built-on-google-cloud";
    gpus.letters.forEach((m) => (m.renderOrder = 10));
    gpus.group.position.set(sx(958.5), sy(262), 0);
    scene.add(sota, zero, mgmt, gpus.group);

    // measured tracks (global frames; screen px)
    const sotaLeft = sampled([[153, 426], [154, 434], [155, 440], [156, 445], [157, 449], [158, 452], [159, 454], [160, 456], [161, 457], [162, 458], [163, 459], [164, 459], [165, 459], [166, 459], [167, 459], [168, 459], [169, 459], [170, 459], [171, 459], [172, 459], [173, 459], [174, 459], [175, 459], [176, 459], [177, 459], [178, 459], [179, 459], [180, 459], [181, 459], [182, 459], [183, 459], [184, 459], [185, 459], [186, 461], [187, 467], [188, 481], [189, 511]]);
    const nodeLx = sampled([[153, 245.5], [154, 258.5], [155, 268.5], [156, 276.5], [157, 283.5], [158, 289.5], [159, 294.5], [160, 299.5], [161, 303.5], [162, 306.5], [163, 309.5], [164, 311.5], [165, 313.5], [166, 315.5], [167, 316.5], [168, 318.5], [169, 320.5], [170, 321.5], [171, 323.5], [172, 325.5], [173, 326.5], [174, 328.5], [175, 330.5], [176, 331.5], [177, 333.5], [178, 335.5], [179, 336.5], [180, 338.5], [181, 340.5], [182, 342.5], [183, 343.5], [184, 345.5], [185, 347.5], [186, 350.5], [187, 358.5], [188, 373.5], [189, 403.5], [190, 470.5], [191, 545.5], [192, 588.5], [193, 616.5], [194, 636.5], [195, 651.5], [196, 663.5], [197, 672.5], [198, 679.5], [199, 685.5], [200, 689.5], [201, 693.5], [202, 695.5], [203, 697.5], [204, 698.5], [205, 699.5], [206, 700.5], [207, 701.5], [208, 702.5], [209, 703.5], [210, 704.5], [211, 705.5], [212, 705.5], [213, 706.5], [214, 707.5], [215, 708.5], [216, 709.5], [217, 709.5], [218, 710.5], [219, 711.5], [220, 712.5], [221, 713.5], [222, 713.5], [223, 714.5], [224, 715.5], [225, 716.5], [226, 717.5], [227, 718.5], [228, 719.5], [229, 720.5], [230, 721.5], [231, 722.5], [232, 723.5], [233, 724.5], [234, 725.5], [235, 726.5], [236, 727.5], [237, 729.5], [238, 730.5], [239, 731.5], [240, 729.5], [241, 725.5], [242, 718.5], [243, 708.5], [244, 693.5], [245, 671.5], [246, 633.5], [247, 561.5]]);
    const nodeRx = sampled([[153, 1672.5], [154, 1659.5], [155, 1649.5], [156, 1641.5], [157, 1634.5], [158, 1628.5], [159, 1623.5], [160, 1618.5], [161, 1615.5], [162, 1612.5], [163, 1609.5], [164, 1607.5], [165, 1605.5], [166, 1603.5], [167, 1601.5], [168, 1599.5], [169, 1597.5], [170, 1596.5], [171, 1594.5], [172, 1592.5], [173, 1590.5], [174, 1588.5], [175, 1586.5], [176, 1584.5], [177, 1582.5], [178, 1580.5], [179, 1578.5], [180, 1576.5], [181, 1574.5], [182, 1572.5], [183, 1571.5], [184, 1574.5], [185, 1582.5], [186, 1595.5], [187, 1619.5], [188, 1661.5], [189, 1764.5], [190, 1900]]);
    const mgmtRight = sampled([[190, 1739], [191, 1758], [192, 1773], [193, 1784], [194, 1792], [195, 1798], [196, 1803], [197, 1806], [198, 1808], [199, 1809], [200, 1809], [201, 1809], [202, 1809], [203, 1809], [204, 1809], [205, 1809], [206, 1809], [207, 1809], [208, 1809], [209, 1809], [210, 1809], [211, 1809], [212, 1809], [213, 1809], [214, 1809], [215, 1809], [216, 1809], [217, 1809], [218, 1809], [219, 1809], [220, 1809], [221, 1809], [222, 1809], [223, 1809], [224, 1809], [225, 1809], [226, 1809], [227, 1809], [228, 1809], [229, 1809], [230, 1809], [231, 1809], [232, 1809], [233, 1809], [234, 1809], [235, 1809], [236, 1809], [237, 1809], [238, 1809], [239, 1809], [240, 1807], [241, 1803], [242, 1796], [243, 1785], [244, 1769], [245, 1741], [246, 1686], [247, 1636]]);
    const zeroLeft = sampled([[192, 742], [193, 762], [194, 776], [195, 787], [196, 795], [197, 802], [198, 806], [199, 809], [200, 811], [201, 813], [202, 813], [203, 813], [204, 813], [205, 813], [206, 813], [207, 813], [208, 813], [209, 813], [210, 813], [211, 813], [212, 813], [213, 813], [214, 813], [215, 813], [216, 813], [217, 813], [218, 813], [219, 813], [220, 813], [221, 813], [222, 813], [223, 813], [224, 813], [225, 813], [226, 813], [227, 813], [228, 813], [229, 813], [230, 813], [231, 813], [232, 813], [233, 813], [234, 813], [235, 813], [236, 813], [237, 813], [238, 813], [239, 812], [240, 810], [241, 806], [242, 799], [243, 789], [244, 772], [245, 745], [246, 689], [247, 639]]);

    let measured = false;
    let inkL = 0, inkR = 0, zeroInk = 0;

    return ({ frame: local }) => {
      const F = local + START;
      if (!measured) {
        // ink offsets of the planes (label "left" anchors the advance box, not the ink)
        inkL = HERO.size * 0.04; inkR = 0; zeroInk = HERO.size * 0.04;
        measured = true;
      }

      // ---- racks from data
      const row = RACKS[Math.min(Math.max(F - START, 0), RACKS.length - 1)]!;
      cols.forEach((c, i) => {
        const r = row[i];
        const on = !!r;
        c.field.visible = c.edgeL.visible = c.edgeR.visible = on;
        c.cells.forEach((cell) => (cell.visible = false));
        if (!r) return;
        const [x0, x1, pitch, phase, blocks] = r;
        const w = Math.max(x1 - x0, 1);
        c.field.scale.x = w;
        c.field.position.set(sx((x0 + x1) / 2), 0, 0);
        c.mat.uniforms.uPitch!.value = pitch;
        c.mat.uniforms.uPhase!.value = phase;
        c.edgeL.position.set(sx(x0), 0, 0);
        c.edgeR.position.set(sx(x1), 0, 0);
        c.edgeL.visible = x0 > 1;
        c.edgeR.visible = x1 < 1918;
        for (let k = 0; k < blocks.length / 2 && k < c.cells.length; k++) {
          const y0 = blocks[k * 2]!, y1 = blocks[k * 2 + 1]! + 1;
          const cell = c.cells[k]!;
          cell.visible = true;
          cell.scale.set(w, y1 - y0, 1);
          cell.position.set(sx((x0 + x1) / 2), sy((y0 + y1) / 2), 0);
        }
      });

      // the inner edge of each rack (for the wires)
      const leftEdge = Math.max(0, ...row.filter((r) => r[0] < 960).map((r) => r[1]));
      const rightEdges = row.filter((r) => r[0] > 960).map((r) => r[0]);
      const rightEdge = rightEdges.length ? Math.min(...rightEdges) : 1920;

      // ---- nodes + wires
      const lx = nodeLx(F);
      nodeL.position.set(sx(lx), sy(539.5), 0);
      wireL.scale.x = Math.max(lx - leftEdge, 0.01);
      wireL.position.set(sx((leftEdge + lx) / 2), sy(539.5), 0);
      const rOn = F < 190;
      nodeR.visible = wireR.visible = rOn;
      if (rOn) {
        const rx = nodeRx(F);
        nodeR.position.set(sx(rx), sy(539.5), 0);
        wireR.scale.x = Math.max(rightEdge - rx, 0.01);
        wireR.position.set(sx((rightEdge + rx) / 2), sy(539.5), 0);
      }

      // ---- type
      sota.visible = F < 190;
      if (sota.visible) sota.position.set(sx(sotaLeft(F) + sotaShift - inkL), sy(541.5), 0);
      mgmt.visible = F >= 190;
      if (mgmt.visible) mgmt.position.set(sx(mgmtRight(F) - 2 * pairShift) - mgmt.userData.w - inkR, sy(544), 0);
      zero.visible = F >= 192;
      if (zero.visible) zero.position.set(sx(zeroLeft(F) - zeroInk), sy(544), 0);

      // the label erases left to right over 186–189
      gpus.letters.forEach((m, i) => {
        const t = 186 + (i / (gpus.letters.length - 1)) * 3;
        setLabel(m, { opacity: clamp01(t + 0.5 - F) });
      });
    };
  });
}
