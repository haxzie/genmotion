/**
 * 116–179 · "easier"
 *
 * White frame. "easier" focuses in (blur → sharp) and slowly shrinks; a feather
 * swoops up from the bottom-left, hangs beside the word, drifts back down and
 * becomes the fomo coin, which tumbles up-left as the camera tilts away.
 *
 * Feather transform = the tracked centroid, axis angle, length and width of the
 * feather in every reference frame. Local frame numbers = global − 116.
 */
import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import featherUrl from "../assets/feather.png";
import { withBrandFonts } from "../components/fonts";
import { orthoStage, X, Y } from "../components/stage";
import { backdrop } from "../components/background";
import { coin, pose } from "../components/logo";
import { text, setText } from "../components/text";
import { curve, linear, type Key } from "../components/keys";

const D2R = Math.PI / 180;
const G = 116; // global frame of local 0
const K = (rows: number[][]) => rows.map((r) => [r[0] - G, r[1]] as Key);

// feather: [frame, cx, cy, angle(deg, y-down), L, Wd]
const FEATHER = [
  [116, -20, 270, 75, 150, 30], [117, 60.2, 407.7, 56.9, 208, 41], [118, 169.5, 530.8, 38.7, 188, 50],
  [119, 307.3, 605.7, 21.8, 179, 57], [120, 440.7, 630.3, 7.1, 180, 61], [121, 558.8, 624.5, -1.1, 183, 67],
  [122, 647.5, 603.3, -8.8, 187, 72], [123, 718.0, 578.5, -12.7, 194, 72], [124, 776.1, 549.9, -17.7, 199, 76],
  [125, 817.9, 525.4, -22.0, 198, 77], [126, 858.5, 499.5, -25.2, 207, 81], [127, 887.1, 479.7, -26.8, 207, 81],
  [128, 912.2, 460.5, -28.8, 210, 83], [129, 932.8, 443.8, -30.4, 212, 84], [130, 950.7, 428.1, -32.9, 216, 85],
  [131, 965.9, 415.1, -33.8, 216, 86], [132, 979.3, 403.1, -35.0, 219, 86], [133, 989.1, 394.0, -35.6, 218, 87],
  [134, 999.2, 384.9, -36.2, 223, 88], [135, 1008.8, 376.0, -37.3, 230, 88], [136, 1015.8, 370.2, -36.8, 235, 89],
  [137, 1019.2, 367.4, -36.8, 233, 90], [138, 1024.8, 362.3, -37.9, 242, 90], [139, 1025.9, 362.5, -37.1, 242, 90],
  [140, 1026.9, 362.9, -37.2, 243, 90], [141, 1027.2, 364.7, -36.3, 247, 89], [142, 1023.5, 369.9, -35.2, 245, 90],
  [143, 1021.1, 374.5, -35.0, 250, 90], [144, 1016.9, 381.5, -33.9, 255, 89], [145, 1010.0, 390.8, -32.8, 259, 89],
  [146, 998.8, 404.1, -30.8, 257, 90], [147, 985.2, 419.3, -29.4, 256, 91], [148, 969.4, 437.1, -27.5, 259, 90],
  [149, 947.6, 459.2, -24.9, 259, 90], [150, 918.1, 485.5, -22.4, 257, 90], [151, 879.6, 516.5, -19.1, 258, 90],
  [152, 825.9, 551.6, -15.4, 260, 91], [153, 746.2, 589.2, -10.7, 258, 89], [154, 639.6, 615.0, -5.5, 259, 91],
];
const fcol = (i: number) => curve(K(FEATHER.map((r) => [r[0], r[i]])));
const fX = fcol(1);
const fY = fcol(2);
const fA = fcol(3);
const fL = fcol(4);
const fW = fcol(5);
/** the texture was lifted from frame 144: its tracked pose there */
const TEX = { cx: 1016.9, cy: 381.5, ang: -33.9, L: 255, W: 89, left: 871, top: 281, w: 277, h: 195 };
const featherOn = (f: number) => f + G >= 116 && f + G < 155;
const featherA = curve(K([[116, 0.45], [117, 0.85], [118, 1]]));

// "easier": centred, shrinking (camera pull-back), focusing in
const TEXT_SIZE = 140;
const textSize = curve(K([[119, 145.5], [122, 145], [125, 144.3], [128, 143.5], [131, 142.7], [134, 141.6], [137, 141.2], [140, 140.4], [143, 139.6], [146, 138.4], [149, 137.6], [152, 136.9], [155, 135.7], [158, 134.5], [161, 133.7], [164, 132.5], [167, 131.4], [170, 130.2], [173, 128.6], [176, 127.5], [179, 125.9]]));
const textCX = curve(K([[119, 649], [122, 646.8], [125, 643.2], [128, 641.4], [131, 639.4], [134, 638.2], [137, 637.6], [140, 637], [146, 636], [152, 634.8], [158, 635], [179, 635]]));
const TEXT_CY = 371.5;
const TEXT_BASE = 409.5 - 371.5; // baseline below centre at size 140
const textBlur = curve(K([[116, 7], [117, 5.5], [119, 3.2], [121, 1.6], [123, 0.4], [124, 0]]));
const textA = curve(K([[116, 0.42], [117, 0.55], [118, 0.62], [119, 0.66], [120, 0.69], [122, 0.75], [124, 0.82], [126, 0.85], [128, 0.88], [130, 0.91], [132, 0.95], [134, 0.99], [135, 1]]));
const pan = curve(K([[171, 0], [172, -0.4], [173, -1.5], [174, -4.2], [175, -8.4], [176, -15.3], [177, -26.1], [178, -44.6], [179, -85.4]]));

// coin: [frame, cx, cy(before pan), axis angle (deg y-down), diameter, flip θ (deg, 0 = face to camera)]
const COIN = [
  [155, 569.9, 622.2, -76.6, 157, 34], [156, 483.0, 613.9, -77.3, 164, 43], [157, 413.6, 592.9, -80.8, 170, 61],
  [158, 384.3, 567.9, -87.7, 168, 90], [159, 343.7, 539.7, -102.1, 170, 135], [160, 312.9, 511.5, -110, 172, 162],
  [161, 290.2, 484.8, -51.2 - 180 + 180, 174, 212], [162, 272.8, 459.9, -70.9, 176, 236], [163, 259.4, 437.2, -80.0, 180, 256],
  [164, 249.1, 417.0, -86.3, 185, 263], [165, 262.9, 396.8, -91.6, 190, 281], [166, 262.9, 379.0, -96.4, 193, 289],
  [167, 257.5, 362.5, -101.0, 195, 291], [168, 253.1, 348.3, -105.6, 196, 297], [169, 249.4, 335.9, -110.1, 197, 303],
  [170, 246.6, 324.6, -114.4, 199, 307], [171, 244.4, 309.7, -119.7, 200, 309], [172, 243.0, 291.8, -125.8, 200, 310],
  [173, 241.8, 271.7, -132.2, 201, 308], [174, 241.1, 250.1, -138.2, 201, 303], [175, 240.8, 227.0, -143.0, 201, 295],
  [176, 241.1, 203.0, -145.8, 201, 285], [177, 225.5, 201.9, -145.8, 200, 270], [178, 226.9, 177.9, -138.6, 198, 248],
  [179, 228.2, 162.4, -111.7, 196, 220],
];
const ccol = (i: number) => curve(K(COIN.map((r) => [r[0], r[i]])));
const cX = ccol(1);
const cY = ccol(2);
const cAxis = ccol(3);
const cD = ccol(4);
const cFlip = linear(K(COIN.map((r) => [r[0], r[5]])));

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withBrandFonts(ctx, () => {
    const { scene } = ctx;
    orthoStage(ctx);
    scene.add(backdrop("#ffffff", "#ffffff"));

    const world = new THREE.Group();
    world.name = "easier-world";
    scene.add(world);

    // feather
    const tex = new THREE.TextureLoader(ctx.manager).load(featherUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const featherMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(TEX.w, TEX.h), featherMat);
    plane.name = "feather-art";
    // plane centre relative to the tracked centroid, in world (y up)
    const off = new THREE.Vector2(TEX.left + TEX.w / 2 - TEX.cx, -(TEX.top + TEX.h / 2 - TEX.cy));
    const axisW = -TEX.ang * D2R; // feather axis in world radians
    off.rotateAround(new THREE.Vector2(0, 0), -axisW);
    plane.position.set(off.x, off.y, 0);
    plane.rotation.z = -axisW;
    const featherInner = new THREE.Group();
    featherInner.add(plane);
    const feather = new THREE.Group();
    feather.name = "feather";
    feather.add(featherInner);
    feather.renderOrder = 20;
    plane.renderOrder = 20;
    world.add(feather);

    // "easier"
    const word = new THREE.Group();
    word.name = "easier";
    const label = text("easier", { size: TEXT_SIZE, weight: 400, color: "#171233", tracking: -0.025, align: "center" }, "easier-text");
    label.position.set(0, -TEXT_BASE, 0);
    word.add(label);
    world.add(word);

    // coin
    const c = coin(0.2, "fomo-coin");
    const axis = new THREE.Group();
    axis.name = "fomo-coin-axis";
    axis.add(c);
    world.add(axis);

    return ({ frame: f }) => {
      world.position.y = -pan(f); // pan moves content up (y down px → world)

      // feather
      feather.visible = featherOn(f);
      if (feather.visible) {
        feather.position.set(X(fX(f)), Y(fY(f)), 0);
        feather.rotation.z = -fA(f) * D2R;
        featherInner.scale.set(1, Math.min(1, fW(f) / TEX.W), 1);
        featherMat.opacity = featherA(f);
      }

      // word
      const s = textSize(f) / TEXT_SIZE;
      word.scale.setScalar(s);
      word.position.set(X(textCX(f)), Y(TEXT_CY), 0);
      setText(label, { blur: textBlur(f), opacity: textA(f) });

      // coin
      axis.visible = f + G >= 155;
      if (axis.visible) {
        axis.position.set(X(cX(f)), Y(cY(f)), 0);
        axis.rotation.z = -cAxis(f) * D2R;
        // eyes stay level on screen: roll the face against the flip axis
        c.rotation.set(-cFlip(f) * D2R, 0, (cAxis(f) - 30) * D2R);
        c.scale.setScalar(cD(f) / 2);
        pose(c, { blink: 0, lookX: -0.1, lookY: 0, handle: 0 });
      }
    };
  });
}
