import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { fitCamera, PX, rx, ry } from "../components/stage";
import { glide, prog, outCubic, inCubic, clamp01, lerp } from "../components/ease";
import { label, line, measure, setLabel, withInter, GREY_FROM, type Label } from "../components/type";
import { C } from "../components/brand";

/**
 * Global f64–f141 (scene frame = global - 64).
 * A tick dial grows in around a counter that runs up to "30:00 minutes"; the dial steps round
 * like a clock. "30:00" slides off left, "its implementation took" assembles, the dial blows
 * outward and a fast counter 1..6 takes over the centre (hands off to "6 weeks").
 */
const G0 = 64;

const DIAL = { minor: "#dde2e9", major: "#4b84a3" };

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withInter(ctx, () => {
    const { scene, camera, height } = ctx;
    scene.background = new THREE.Color("#fdfdfd");
    fitCamera(camera, height, 50);

    /* ------------------------------------------------------------- the dial */
    const dial = new THREE.Group();
    dial.name = "dial";
    dial.position.set(rx(962), ry(540), -0.01);
    scene.add(dial);

    const tickGeo = new THREE.PlaneGeometry(1, 1);
    const minorMat = new THREE.MeshBasicMaterial({ color: DIAL.minor, transparent: true, depthWrite: false });
    const majorMat = new THREE.MeshBasicMaterial({ color: DIAL.major, transparent: true, depthWrite: false });

    const N_MINOR = 180;
    const minors = new THREE.InstancedMesh(tickGeo, minorMat, N_MINOR);
    minors.name = "dial-minor-ticks";
    const N_MAJOR = 18;
    const majors = new THREE.InstancedMesh(tickGeo, majorMat, N_MAJOR);
    majors.name = "dial-major-ticks";
    // Both rings are built at unit radius 1 (world) and scaled by their own radius.
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const zAxis = new THREE.Vector3(0, 0, 1);
    const tPos = new THREE.Vector3();
    const tScale = new THREE.Vector3();
    const majorLen = glide([[64, 8], [66, 9], [70, 18], [72, 36], [75, 66]]);
    const minorLen = glide([[63, 10], [68, 14], [72, 30], [75, 36]]);
    const placeTicks = (mesh: THREE.InstancedMesh, n: number, rMidPx: number, lenPx: number, thickPx: number, refR: number, offsetDeg: number) => {
      for (let i = 0; i < n; i++) {
        const a = THREE.MathUtils.degToRad(offsetDeg + (360 / n) * i);
        q.setFromAxisAngle(zAxis, -a);
        const r = rMidPx / refR;
        m4.compose(tPos.set(Math.cos(-a) * r, Math.sin(-a) * r, 0), q, tScale.set(lenPx / refR, thickPx / refR, 1));
        mesh.setMatrixAt(i, m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    placeTicks(minors, N_MINOR, 767, 36, 12, 767, 1);
    placeTicks(majors, N_MAJOR, 757, 66, 14, 757, 0);
    const minorRing = new THREE.Group();
    minorRing.add(minors);
    const majorRing = new THREE.Group();
    majorRing.add(majors);
    majors.renderOrder = 2;
    dial.add(minorRing, majorRing);

    // measured off the reference (radius in px, rotation in degrees clockwise on screen)
    const minorR = glide([[62, 560], [64, 600], [66, 641], [68, 666], [70, 684], [72, 719], [74, 767], [122, 768], [124, 773], [126, 776], [128, 786], [130, 800], [132, 822], [134, 856], [136, 902], [138, 1000], [140, 1084], [142, 1160]]);
    const majorR = glide([[64, 480], [66, 533], [68, 579], [70, 612], [72, 673], [74, 767], [122, 768], [124, 776], [126, 782], [128, 802], [130, 833], [132, 881], [134, 947], [136, 1056], [138, 1180], [142, 1400]]);
    const rot = glide([[62, 2], [66, 8.2], [70, 11.7], [73, 13.5], [76, 18.6], [78, 26.5], [80, 29.9], [84, 33.1], [90, 35.5], [98, 39], [100, 51.2], [103, 61.6], [110, 64.6], [120, 69.8], [134, 74.7], [142, 79]]);

    /* ------------------------------------------------------- counter 30:00 */
    const CLOCK = { size: 250, weight: 500, tracking: -0.01, font: '"Inter Tnum", Inter, sans-serif' };
    const clockSize = CLOCK.size * (651 / measure("30:00", CLOCK));
    const clockStyle = { ...CLOCK, size: clockSize };
    const secs = glide([[60, 1722], [62, 1735], [66, 1765], [68, 1791], [70, 1800]]);
    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    const clockLabels = new Map<string, Label>();
    for (let f = 60; f <= 72; f++) {
      const t = fmt(Math.round(secs(f)));
      if (!clockLabels.has(t)) {
        const m = label(t, clockStyle, "center", 40);
        m.name = t === "30:00" ? "clock-30-00" : `clock-${t.replace(":", "-")}`;
        m.visible = false;
        scene.add(m);
        clockLabels.set(t, m);
      }
    }
    const minutes = label("minutes", { size: 66, weight: 400, tracking: 0 }, "center");
    const minutesSize = 66 * (264 / measure("minutes", { size: 66, weight: 400, tracking: 0 }));
    minutes.scale.setScalar(minutesSize / 66);
    minutes.name = "minutes";
    scene.add(minutes);
    const black = new THREE.Color("#000000");
    const clockScaleK = glide([[60, 0.6], [62, 0.66], [66, 0.72], [71, 0.955], [80, 1], [100, 1]]);
    const digitFrom = new THREE.Color("#6a6c6e");
    const clockY = glide([[60, 515], [66, 520], [71, 548]]);
    const minutesInk = new THREE.Color("#636263");

    /* ------------------------------------------- "its implementation took" */
    const LINE = { size: 60, weight: 450, tracking: 0.02 };
    const lineSize = 60 * (1035 / measure("its implementation took", LINE));
    const sentence = line("its *implementation* took", { ...LINE, size: lineSize }, "left");
    sentence.group.name = "its-implementation-took";
    scene.add(sentence.group);
    const WORD_IN = [106, 110, 114];
    const anchor = glide([[104, 545], [106, 535], [110, 520], [113, 475], [116, 455], [119, 445], [122, 440], [140, 436]]);
    const pale = new THREE.Color("#b7c8d0");
    const accent = new THREE.Color("#4d8aa2");
    const lineInk = new THREE.Color("#444343");
    const tint = new THREE.Color();

    /* ------------------------------------------------- fast count 1..6 */
    const DIG = { size: 318, weight: 500, tracking: 0 };
    const digits = [1, 2, 3, 4, 5, 6].map((n) => {
      const m = label(String(n), DIG, "center", 30);
      m.name = `count-${n}`;
      m.visible = false;
      scene.add(m);
      return m;
    });
    const digitH = glide([[136, 135], [137, 150], [139, 185], [141, 207], [142, 214], [143, 225]]);
    const digitInk = new THREE.Color("#333333");

    return ({ frame: local }) => {
      const f = local + G0;

      /* dial */
      const sMinor = minorR(f) * PX;
      const sMajor = majorR(f) * PX;
      minorRing.scale.setScalar(sMinor);
      majorRing.scale.setScalar(sMajor);
      // ticks grow from dots to full length as the dial forms
      if (f >= 120) {
        const grow = Math.max(1, majorR(f) / 767);
        placeTicks(majors, N_MAJOR, 757 + 33 * (grow - 1), 66 * grow, 14 * Math.sqrt(grow), 757, 0);
      }
      if (f <= 78) {
        placeTicks(majors, N_MAJOR, 757 + (66 - majorLen(f)) * 0.5, majorLen(f), 14, 757, 0);
        placeTicks(minors, N_MINOR, 767, minorLen(f), 12, 767, 1);
      }
      const r = -THREE.MathUtils.degToRad(rot(f));
      minorRing.rotation.z = r;
      majorRing.rotation.z = r;
      minorMat.opacity = prog(f, 63, 8, outCubic) * (1 - prog(f, 135, 6, inCubic));
      majorMat.opacity = prog(f, 65, 6, outCubic) * (1 - prog(f, 133, 5, inCubic));

      /* clock */
      const current = fmt(Math.round(secs(f)));
      const pIn = prog(f, 62, 9, outCubic);
      const pOut = prog(f, 101, 5, inCubic);
      const clockScale = clockScaleK(f);
      clockLabels.forEach((m, t) => {
        const on = t === current && f < 106;
        m.visible = on;
        if (!on) return;
        m.scale.setScalar(clockScale);
        m.position.set(rx(962) - pOut * 270 * PX, ry(clockY(f)), 0);
        tint.copy(GREY_FROM).lerp(black, prog(f, 65, 6, outCubic));
        setLabel(m, { opacity: Math.min(1, pIn * 1.5) * (1 - pOut), blur: (1 - pIn) * 12 + pOut * 14, color: tint });
      });
      const pMin = prog(f, 77, 7, outCubic);
      minutes.position.set(rx(960) - pOut * 270 * PX, ry(742), 0);
      tint.copy(GREY_FROM).lerp(minutesInk, pMin);
      setLabel(minutes, { opacity: pMin * (1 - pOut), blur: (1 - pMin) * 10 + pOut * 12, color: tint });

      /* sentence */
      const ax = anchor(f);
      const pPale = prog(f, 134.5, 2, outCubic);
      const pGone = prog(f, 136, 5, outCubic);
      sentence.words.forEach((w, i) => {
        const p = prog(f, WORD_IN[i]!, 9, outCubic);
        w.position.x = rx(ax) + w.userData.restX + (1 - p) * 90 * PX;
        w.position.y = ry(541);
        const ink = w.userData.accent ? accent : lineInk;
        tint.copy(GREY_FROM).lerp(ink, prog(f, WORD_IN[i]!, 6, outCubic)).lerp(pale, pPale);
        setLabel(w, { opacity: Math.min(1, p * 1.5) * (1 - pGone * 0.85) * (f < 142 ? 1 : 0), blur: (1 - p) * 10 + pGone * 14, color: tint });
      });

      /* counter */
      const n = f >= 137 ? Math.min(6, f - 136) : 0;
      digits.forEach((m, i) => {
        const on = n === i + 1;
        m.visible = on;
        if (!on) return;
        const s = digitH(f) / 231;
        m.scale.setScalar(s);
        m.position.set(rx(952), ry(540), 0.01);
        const pD = clamp01((f - 136) / 3);
        tint.copy(digitFrom).lerp(digitInk, pD);
        setLabel(m, { opacity: 1, blur: lerp(4, 0, pD), color: tint });
      });
    };
  });
}
