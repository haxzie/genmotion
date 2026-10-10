import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";
import interUrl from "../assets/InterVariable.woff2";
import { FONT_FAMILY } from "../components/brand";
import { screenLayer, track } from "../components/stage";
import { label, setLabel, withFonts } from "../components/type";
import { backdrop, glowDot } from "../components/fx";
import { canvasPlane, rr, text, bars, markPlane, cursor, type Panel } from "../components/ui";

/*
 * Nova works the request: its mark streaks in, "Mapping it out…" appears, a
 * step list builds and scrolls, the camera pulls out to the whole plan and
 * pushes into Nova's question, the user replies and clicks send.
 * Pacing follows the reference beat (global frames 823-1185); all content is ours.
 */
const F0 = 823;

const STEPS: { icon: "doc" | "clock" | "search" | "list"; title: string; body?: number }[] = [
  { icon: "doc", title: "Reading Launch notes" },
  { icon: "clock", title: "Pulling last spring's timeline" },
  { icon: "search", title: "Weighing budget and dates", body: 4 },
  { icon: "list", title: "Checking the team calendar" },
  { icon: "doc", title: "Drafting the plan" },
];
const STEP_AT = [928, 952, 976, 1012, 1032]; // global frame each step appears
const STEP_GAP = 92;

// camera over the plan (zoom + the doc point held at frame centre)
const Z = track([[913, 1.25], [1040, 1.22], [1050, 0.62], [1064, 0.6], [1076, 1.28], [1125, 1.3], [1140, 1.3], [1185, 1.32]]);
const FY = track([[913, 120], [940, 60], [990, -40], [1040, -150], [1050, -260], [1064, -260], [1076, -470], [1125, -470], [1140, -560], [1185, -570]]);
const FX = track([[913, 0], [1050, 60], [1064, 60], [1076, 0], [1185, 20]]);

function icon(g: OffscreenCanvasRenderingContext2D, kind: string, x: number, y: number) {
  g.strokeStyle = "#5b6475";
  g.lineWidth = 2.2;
  g.lineJoin = "round";
  if (kind === "doc") {
    rr(g, x - 9, y - 12, 18, 24, 3);
    g.stroke();
    g.beginPath();
    g.moveTo(x - 4, y - 3);
    g.lineTo(x + 4, y - 3);
    g.moveTo(x - 4, y + 3);
    g.lineTo(x + 4, y + 3);
    g.stroke();
  } else if (kind === "clock") {
    g.beginPath();
    g.arc(x, y, 11, 0, Math.PI * 2);
    g.moveTo(x, y - 6);
    g.lineTo(x, y);
    g.lineTo(x + 5, y + 3);
    g.stroke();
  } else if (kind === "search") {
    g.beginPath();
    g.arc(x - 2, y - 2, 8, 0, Math.PI * 2);
    g.moveTo(x + 4, y + 4);
    g.lineTo(x + 10, y + 10);
    g.stroke();
  } else {
    [-7, 0, 7].forEach((d) => {
      g.beginPath();
      g.moveTo(x - 8, y + d);
      g.lineTo(x + 9, y + d);
      g.stroke();
    });
  }
}

export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  return withFonts(ctx, [{ family: FONT_FAMILY, url: interUrl }], () => {
    const { scene, camera } = ctx;
    const layer = screenLayer(scene, camera);

    const bg = backdrop();
    bg.grad("#f2f5fa", "#f7f8fb", [0, 1]);
    scene.add(bg);

    /* ---------------- stage A: the mark, and "Mapping it out…" */
    const mark = markPlane(240);
    mark.name = "nova-mark";
    layer.add(mark);
    const trail = [0, 1, 2].map((i) => {
      const d = glowDot(10 - i * 2, 14 - i * 2, "#5b8cff", "#5b8cff");
      d.material.blending = THREE.NormalBlending;
      d.material.uniforms.uHalo!.value = 0.2;
      d.name = `mark-trail-${i}`;
      d.userData.pickable = false;
      layer.add(d);
      return d;
    });
    const thinking = label("Mapping it out", { size: 56, weight: 450, pad: 30 }, "#2a3142", "left");
    thinking.name = "mapping-it-out";
    layer.add(thinking);
    const ellipsis = [0, 1, 2].map((i) => {
      const d = label(".", { size: 56, weight: 450, pad: 10 }, "#2a3142", "left");
      d.name = `ellipsis-${i}`;
      layer.add(d);
      return d;
    });

    /* ---------------- stage B: the plan document */
    const doc = new THREE.Group();
    doc.name = "plan-view";
    layer.add(doc);

    // the surrounding app, seen when we pull out
    const shell = canvasPlane(2300, 1500, (g, w, h) => {
      g.fillStyle = "#ffffff";
      rr(g, 0, 0, w, h, 40);
      g.fill();
      bars(g, 50, 120, [220, 180, 240, 160, 200, 150, 210, 170, 190], 12, 34, "#e7eaf0");
      g.fillStyle = "#f6f8fb";
      rr(g, w - 520, 90, 470, h - 180, 26);
      g.fill();
      for (let i = 0; i < 9; i++) {
        g.fillStyle = i % 3 === 0 ? "#3c7be8" : "#cfd6e2";
        g.beginPath();
        g.arc(w - 480, 160 + i * 120, 9, 0, Math.PI * 2);
        g.fill();
        bars(g, w - 455, 150 + i * 120, [300, 220], 10, 16, "#e1e5ec");
      }
      // main column: title + sections as bars
      text(g, "Spring launch plan", 520, 110, 44, "#1d2230", 500);
      // the plan body below Nova's working list
      for (let s = 0; s < 2; s++) {
        bars(g, 520, 1130 + s * 200, [380], 14, 0, "#c7cedb");
        bars(g, 520, 1170 + s * 200, [1100, 1050, 900], 10, 22, "#e3e7ee");
      }
    }, 1);
    shell.name = "plan-app";
    shell.position.set(60, -260, 0);
    doc.add(shell);

    // the readable step list column
    const listTop = 260;
    const header = canvasPlane(300, 50, (g, w, h) => {
      text(g, "On it…", 0, h / 2, 30, "#5b6475", 450);
      text(g, "⌄", 98, h / 2 - 4, 26, "#5b6475", 450);
    }, 3);
    header.name = "on-it";
    header.position.set(-420 + 150, listTop + 70, 0);
    doc.add(header);

    const rail = canvasPlane(4, STEP_GAP * STEPS.length + 140, (g, w, h) => {
      g.fillStyle = "#dfe3ea";
      g.fillRect(0, 0, w, h);
    }, 1);
    rail.name = "step-rail";
    rail.userData.pickable = false;
    doc.add(rail);

    let y = listTop;
    const steps: { p: Panel; y: number; h: number }[] = STEPS.map((s, i) => {
      const extra = s.body ? s.body * 28 + 24 : 0;
      const h = 56 + extra;
      const p = canvasPlane(840, h, (g) => {
        icon(g, s.icon, 20, 28);
        text(g, s.title, 56, 28, 30, "#1d2230", 450);
        if (s.body) bars(g, 56, 66, [720, 690, 740, 560].slice(0, s.body), 10, 18, "#d7dce5");
      }, 3);
      p.name = `step-${i + 1}`;
      const top = y;
      p.position.set(0, top - h / 2, 0);
      y -= h + (STEP_GAP - 56);
      doc.add(p);
      return { p, y: top, h };
    });
    rail.position.set(-420 + 20, listTop - (STEP_GAP * STEPS.length + 140) / 2, 0);

    // the question at the bottom of the plan, and the reply composer
    const question = canvasPlane(900, 160, (g) => {
      bars(g, 0, 4, [620, 700, 540], 10, 16, "#e1e5ec");
      text(g, "Ready when you are. Shall I line up", 0, 96, 30, "#1d2230", 450);
      text(g, "three helpers for phase one?", 0, 136, 30, "#1d2230", 450);
    }, 3);
    question.name = "nova-question";
    question.position.set(30, -478, 0);
    doc.add(question);
    const reactions = canvasPlane(240, 40, (g) => {
      ["#9aa3b2", "#9aa3b2", "#9aa3b2", "#9aa3b2"].forEach((c, i) => {
        g.strokeStyle = c;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(14 + i * 40, 20, 9, 0, Math.PI * 2);
        g.stroke();
      });
    }, 3);
    reactions.name = "reactions";
    reactions.position.set(-300, -580, 0);
    doc.add(reactions);

    const composer = canvasPlane(900, 120, (g, w, h) => {
      g.fillStyle = "#ffffff";
      g.shadowColor = "rgba(40,80,160,0.16)";
      g.shadowBlur = 18;
      rr(g, 4, 4, w - 8, h - 8, 26);
      g.fill();
      g.shadowColor = "transparent";
      g.strokeStyle = "#e3e7ee";
      g.lineWidth = 1.5;
      g.stroke();
      text(g, "+", 30, h - 30, 26, "#4a5163", 400);
      g.fillStyle = "#f1f4f9";
      rr(g, 58, h - 46, 150, 32, 16);
      g.fill();
      text(g, "Check with me", 74, h - 30, 15, "#4a5163", 450);
    }, 3);
    composer.name = "reply-composer";
    doc.add(composer);
    const REPLY = "Go ahead!";
    const replies = [...Array(REPLY.length + 1).keys()].map((n) => {
      const t = canvasPlane(400, 40, (g, w, h) => {
        text(g, REPLY.slice(0, n), 0, h / 2, 26, "#1d2230", 450);
        g.font = `450 26px "${FONT_FAMILY}", Inter, sans-serif`;
        g.fillStyle = "#3c7be8";
        g.fillRect(g.measureText(REPLY.slice(0, n)).width + 2, 6, 2, h - 12);
      }, 3);
      t.name = "reply";
      t.visible = false;
      doc.add(t);
      return t;
    });
    const send = canvasPlane(52, 52, (g, w) => {
      g.fillStyle = "#5b8ef2";
      g.beginPath();
      g.arc(w / 2, w / 2, w / 2 - 1, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#fff";
      g.lineWidth = 3.2;
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
    doc.add(send);

    const ptr = cursor(84);
    layer.add(ptr);

    return ({ frame, time }) => {
      const f = frame + F0;

      /* ---- stage A */
      const a = f < 913;
      mark.visible = trail.every(() => true) && f < 913;
      // streaks in big from the lower left, settles small, bobs, slides left as the line arrives
      const land = interpolate(f, [823, 836], [0, 1], Easing.easeOut);
      const slide = interpolate(f, [866, 884], [0, 1], Easing.easeInOut);
      const mx = THREE.MathUtils.lerp(-520, 0, land) - slide * 330;
      const my = THREE.MathUtils.lerp(-260, 150, land) + Math.sin(time * 2.2) * 6 * (1 - slide) - slide * 150;
      const ms = THREE.MathUtils.lerp(3.2, 0.42, land) * (1 - slide * 0.45);
      mark.position.set(mx, my, 0);
      mark.scale.setScalar(ms);
      mark.rotation.z = (1 - land) * 0.5;
      mark.material.opacity = interpolate(f, [900, 912], [1, 0]);
      trail.forEach((d, i) => {
        const lagLand = interpolate(f, [823 + (i + 1) * 2, 836 + (i + 1) * 3], [0, 1], Easing.easeOut);
        const k = 0.5 + i * 0.32;
        d.position.set(mx - 70 * ms * k, my - 55 * ms * k - Math.sin(time * 2.2 - 0.6 - i * 0.5) * 4, 0);
        d.scale.setScalar(ms * 1.6);
        d.material.uniforms.uOpacity!.value = lagLand * interpolate(f, [866, 880], [1, 0]);
        d.visible = a;
      });
      const tIn = interpolate(f, [872, 886], [0, 1], Easing.easeOut);
      thinking.position.set(-250 + (1 - tIn) * 260, 0, 0);
      setLabel(thinking, { opacity: tIn * interpolate(f, [902, 912], [1, 0]), blur: (1 - tIn) * 14 });
      thinking.visible = a;
      const ew = thinking.userData.inkWidth as number;
      ellipsis.forEach((e, i) => {
        e.position.set(-250 + ew + 2 + i * 16 + (1 - tIn) * 260, 0, 0);
        const phase = ((f - 880) / 6 - i) % 3;
        setLabel(e, { opacity: tIn * interpolate(f, [902, 912], [1, 0]) * (phase >= 0 && phase < 2 ? 1 : 0.25) });
        e.visible = a;
      });

      /* ---- stage B */
      doc.visible = f >= 913;
      const z = Z(f);
      doc.scale.setScalar(z);
      doc.position.set(-FX(f) * z, -FY(f) * z, 0);
      header.material.opacity = interpolate(f, [913, 922], [0, 1]);
      steps.forEach(({ p }, i) => {
        const at = STEP_AT[i]!;
        const k = interpolate(f, [at, at + 10], [0, 1], Easing.easeOut);
        p.material.opacity = k;
        p.position.x = (1 - k) * 18;
      });
      rail.material.opacity = interpolate(f, [925, 940], [0, 1]);
      // the app shell only shows when we pull out
      shell.material.opacity = interpolate(f, [1040, 1050, 1066, 1076], [0, 1, 1, 0]);
      question.material.opacity = interpolate(f, [1046, 1056], [0, 1]);
      reactions.material.opacity = interpolate(f, [1080, 1090], [0, 1]);
      const listFade = interpolate(f, [1066, 1076], [1, 0.0]);
      steps.forEach(({ p }) => (p.material.opacity *= listFade));
      header.material.opacity *= listFade;
      rail.material.opacity *= listFade;

      // reply composer slides up, types, gets clicked
      const cIn = interpolate(f, [1128, 1140], [0, 1], Easing.easeOut);
      composer.position.set(20, -640 - (1 - cIn) * 80, 0);
      composer.material.opacity = cIn;
      const n = Math.round(interpolate(f, [1142, 1160], [0, REPLY.length]));
      replies.forEach((t, i) => {
        t.visible = f >= 1140 && i === n;
        t.position.set(20 - 450 + 22 + 200, -640 - (1 - cIn) * 80 + 22, 0);
      });
      const SX = 20 + 450 - 42;
      const SY = -640 - (1 - cIn) * 80 - 30;
      send.position.set(SX, SY, 0);
      send.material.opacity = cIn;
      const press = interpolate(f, [1172, 1174, 1178], [0, 1, 0]);
      send.scale.setScalar(1 - press * 0.12);

      const pIn = interpolate(f, [1158, 1170], [0, 1], Easing.easeOut);
      const sx = (SX - FX(f)) * z;
      const sy = (SY - FY(f)) * z;
      ptr.visible = f >= 1158;
      ptr.position.set(THREE.MathUtils.lerp(sx + 300, sx + 4, pIn), THREE.MathUtils.lerp(sy - 260, sy - 6, pIn), 0);
      ptr.scale.setScalar(1.3 * (1 - press * 0.12));
    };
  });
}
