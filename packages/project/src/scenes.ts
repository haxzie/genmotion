import path from "node:path";
import fs from "node:fs/promises";
import { MANIFEST_FILE, SCENES_DIR } from "./paths";
import { ProjectError, readManifest, writeManifest } from "./project";
import type { ProjectEngine, ProjectManifest } from "./schema";

export interface AddSceneInput {
  projectDir: string;
  /** Human name; the file name is derived from it. */
  name: string;
  durationInFrames: number;
  /** Insert after this scene (file path or name). Appends when omitted. */
  after?: string;
}

export interface AddedScene {
  file: string;
  name: string;
  durationInFrames: number;
  index: number;
  manifest: ProjectManifest;
}

/**
 * Creates a scene file from the engine's stub and registers it in
 * `project.json` in one step — the step agents otherwise half-do, writing a
 * file the manifest never mentions and then wondering why it isn't in the video.
 */
export async function addScene(input: AddSceneInput): Promise<AddedScene> {
  const manifest = await readManifest(input.projectDir);
  if (manifest.engine === "hyperframes") {
    throw new ProjectError("HyperFrames scenes are sub-compositions in index.html — add them there, not through project.json");
  }

  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "scene";
  const ext = manifest.engine === "three" ? ".ts" : ".tsx";
  const taken = new Set(manifest.scenes.map((s) => s.file));
  let index = manifest.scenes.length;
  if (input.after) {
    const found = manifest.scenes.findIndex((s) => s.file === input.after || s.name === input.after);
    if (found === -1) throw new ProjectError(`No scene "${input.after}" in ${MANIFEST_FILE}`);
    index = found + 1;
  }

  // Numbered like the starter (`01-intro`), but never renumbering existing
  // files: the number is just a sort hint, the manifest is the order.
  const highest = manifest.scenes.reduce((max, s) => {
    const n = Number(/^(\d+)-/.exec(path.basename(s.file))?.[1]);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  let n = highest + 1;
  let file = `${SCENES_DIR}/${String(n).padStart(2, "0")}-${slug}${ext}`;
  while (taken.has(file) || (await exists(path.join(input.projectDir, file)))) {
    n++;
    file = `${SCENES_DIR}/${String(n).padStart(2, "0")}-${slug}${ext}`;
  }

  await fs.mkdir(path.join(input.projectDir, SCENES_DIR), { recursive: true });
  await fs.writeFile(path.join(input.projectDir, file), sceneStub(manifest.engine, input.name), "utf8");

  const entry = { file, durationInFrames: Math.max(1, Math.round(input.durationInFrames)), name: input.name };
  manifest.scenes.splice(index, 0, entry);
  await writeManifest(input.projectDir, manifest);
  return { ...entry, index, manifest };
}

async function exists(file: string): Promise<boolean> {
  return fs.stat(file).then(() => true, () => false);
}

/** A scene that already follows every rule, and draws something so a still isn't blank. */
export function sceneStub(engine: ProjectEngine, name: string): string {
  if (engine === "three") {
    return `import * as THREE from "three";
import { interpolate, Easing, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";

/** ${name} */
export default function buildScene(ctx: ThreeSceneContext): ThreeSceneUpdate {
  const { scene, camera } = ctx;
  scene.background = new THREE.Color("#0b0b10");

  const subject = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.2, 1),
    new THREE.MeshStandardMaterial({ color: "#c6f91e", roughness: 0.35, flatShading: true }),
  );
  subject.name = "subject";
  scene.add(subject);

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 4, 5);
  scene.add(key, new THREE.AmbientLight(0xffffff, 0.6));
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);

  return ({ time, progress }) => {
    const enter = interpolate(progress, [0, 0.25], [0, 1], Easing.easeOut);
    subject.scale.setScalar(0.6 + 0.4 * enter);
    subject.rotation.set(time * 0.4, time * 0.7, 0);
  };
}
`;
  }
  return `import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "@genmotion/motion";

/** ${name} */
export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0b10", alignItems: "center", justifyContent: "center" }}>
      <h1 style={{ color: "#ffffff", fontSize: 120, fontFamily: "Inter, sans-serif", opacity }}>${name.replace(/[<>{}]/g, "")}</h1>
    </AbsoluteFill>
  );
}
`;
}
