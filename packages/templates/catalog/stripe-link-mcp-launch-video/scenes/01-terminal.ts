import * as THREE from "three";
import type { ThreeSceneContext, ThreeSceneUpdate } from "@genmotion/three-engine";
import { interpolate, Easing } from "@genmotion/three-engine";
import { C } from "../components/brand";
import { setupStage, place, wx, wy, enter, leave, setOpacity, revealLeft, U } from "../components/stage";
import { textPlane, richLine, measure, type Run } from "../components/type";
import { backdrop } from "../components/backdrop";

/** Beat 1 — the prompt is typed, then the agent's terminal output streams in. */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene } = ctx;
  setupStage(ctx, C.bg);
  const ambient = backdrop(scene, { frame: true });
  const card = scene.getObjectByName("frame-card")!;

  // ── Prompt ────────────────────────────────────────────────────────────
  const P = { size: 50, weight: 500, mono: true, anchor: "left" as const };
  const prompt = new THREE.Group();
  prompt.name = "prompt";
  const chevron = textPlane("prompt-chevron", "❯", { ...P, color: "#ffffff" });
  const cmd = textPlane("prompt-command", "install link using", { ...P, color: "#ffffff" });
  const url = textPlane("prompt-url", "https://link.com/skill.md", { ...P, color: "#ffffff" });
  cmd.position.x = 52 / U;
  url.position.set(52 / U, -62 / U, 0);
  prompt.add(chevron, cmd, url);
  scene.add(prompt);

  const cmdText = "install link using";
  const cmdW = cmd.userData.wPx as number;
  // Irregular keystroke frames — bursts and small hesitations, not a metronome.
  const keyFrames = [1, 2, 4, 5, 6, 8, 9, 10, 10, 11, 13, 14, 15, 16, 16, 18, 19, 21];
  const PASTE = 25;
  const urlGreen = new THREE.Color(C.termGreen);
  const white = new THREE.Color("#ffffff");

  // ── Terminal output ───────────────────────────────────────────────────
  const T = { size: 30, weight: 400, mono: true };
  const g = C.termGreen;
  const t = C.termText;
  type L = { name: string; runs: Run[]; x: number; y: number; at: number; bullet?: boolean };
  const lines: L[] = [
    { name: "term-setup", runs: [["I'll help you set up your link account", t]], x: 158, y: 160, at: 56, bullet: true },
    { name: "term-setup-2", runs: [["to use for a wallet", t]], x: 158, y: 199, at: 58 },
    { name: "term-install", runs: [["install ", t], ["link-cli", g]], x: 158, y: 276, at: 64, bullet: true },
    { name: "term-install-done", runs: [["L  Done", t]], x: 178, y: 315, at: 70 },
    { name: "term-connect", runs: [["Starting connection...", t]], x: 158, y: 392, at: 76, bullet: true },
    { name: "term-connect-call", runs: [["L  Calling ", t], ["link auth-start", g], [".", t]], x: 178, y: 431, at: 82 },
    { name: "term-visit", runs: [["Visit", t]], x: 158, y: 508, at: 88, bullet: true },
    { name: "term-visit-url", runs: [["https://link.com/device?code=apple-", g]], x: 158, y: 547, at: 90 },
    { name: "term-visit-url-2", runs: [["grape-orange", g], [" and follow the instructions", t]], x: 158, y: 586, at: 91 },
    { name: "term-visit-3", runs: [["to connect your Link account.", t]], x: 158, y: 625, at: 92 },
    { name: "term-visit-4", runs: [["When prompted, verify or enter the", t]], x: 158, y: 664, at: 93 },
    { name: "term-visit-5", runs: [["following  passphrase:", t]], x: 158, y: 703, at: 94 },
    { name: "term-passphrase", runs: [["apple-grape-orange", g]], x: 158, y: 742, at: 95 },
  ];
  const terminal = new THREE.Group();
  terminal.name = "terminal-output";
  const meshes = lines.map((l) => {
    const m = richLine(l.name, l.runs, { ...T, bullet: l.bullet });
    m.position.set(wx(l.x), wy(l.y), 0);
    terminal.add(m);
    return m;
  });
  const waiting = richLine("term-waiting", [["Waiting for approval...", t]], { ...T, bullet: true });
  waiting.position.set(wx(158), wy(820), 0);
  terminal.add(waiting);
  const WAIT_AT = 100;
  const waitBase = 30 + measure("Waiting for approval", T);
  const dotW = measure(".", T);
  const waitFull = waiting.userData.wPx as number;
  scene.add(terminal);

  return ({ frame, time }) => {
    ambient(time);

    // Prompt: typed, URL pasted green and cooling to white, a slow zoom-in.
    let n = 0;
    while (n < keyFrames.length && frame >= keyFrames[n]) n++;
    const typed = measure(cmdText.slice(0, n), P);
    revealLeft(cmd, n === 0 ? 0 : (typed + 2) / cmdW);
    (url.material as THREE.MeshBasicMaterial).color.lerpColors(
      urlGreen, white, interpolate(frame, [PASTE + 4, PASTE + 18], [0, 1], Easing.easeInOut));
    const zoom = interpolate(frame, [0, 48], [0.78, 1], Easing.easeInOut);
    const lift = interpolate(frame, [PASTE, PASTE + 8], [0, 31], Easing.easeOut);
    prompt.scale.setScalar(zoom);
    place(prompt, interpolate(frame, [0, 48], [60, 87], Easing.easeInOut), 540 - lift);
    const pOut = leave(frame, 50, 7);
    setOpacity(prompt, 1 - pOut);
    url.visible = frame >= PASTE && pOut < 1;
    prompt.position.y += pOut * 0.4;

    // Frame card arrives with the output.
    const cIn = enter(frame, 52, 10);
    setOpacity(card, cIn);
    card.scale.setScalar(0.97 + 0.03 * cIn);

    // Output lines stream in.
    lines.forEach((l, i) => {
      const k = enter(frame, l.at, 8);
      setOpacity(meshes[i], k);
      meshes[i].position.y = wy(l.y) - (1 - k) * 0.16;
    });
    const wk = enter(frame, WAIT_AT, 8);
    setOpacity(waiting, wk);
    waiting.position.y = wy(820) - (1 - wk) * 0.16;
    const dots = Math.floor(Math.max(0, frame - WAIT_AT) / 9) % 4;
    revealLeft(waiting, (waitBase + dots * dotW + 4) / waitFull);

    // Gentle drift so the hold is never frozen.
    const s = 1 + interpolate(frame, [56, 170], [0, 0.02], Easing.easeInOut);
    terminal.scale.setScalar(s);
  };
}
