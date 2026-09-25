import { afterEach, beforeEach, describe, expect, it } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { createSceneBundler, type SceneBundler } from "../bundle";
import { renderThreeStarterScene } from "../scaffold-three";
import { validateThreeSceneFile } from "../validate";

let dir: string;
let bundler: SceneBundler;

const write = async (rel: string, body: string) => {
  await fs.mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
  await fs.writeFile(path.join(dir, rel), body, "utf8");
};

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "gm-bundle-three-"));
  bundler = createSceneBundler({ projectDir: dir });
});

afterEach(async () => {
  await bundler.dispose();
  await fs.rm(dir, { recursive: true, force: true });
});

const ROTATING_CUBE = `import * as THREE from "three";
import { interpolate, type ThreeSceneContext, type ThreeSceneUpdate } from "@genmotion/three-engine";

export default function buildScene({ scene, camera }: ThreeSceneContext): ThreeSceneUpdate {
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: "#6ee7ff" }),
  );
  scene.add(cube, new THREE.DirectionalLight(0xffffff, 3));
  camera.position.z = 4;
  return ({ time, frame }) => {
    cube.rotation.y = time;
    cube.position.y = interpolate(frame, [0, 150], [0, 1]);
  };
}
`;

describe("createSceneBundler with a plain-TS three-engine scene", () => {
  it("bundles a .ts scene with no JSX, keeping three and @genmotion/three-engine external", async () => {
    await write("scenes/01-intro.ts", ROTATING_CUBE);
    const result = await bundler.bundle("scenes/01-intro.ts");
    if (!result.ok) throw new Error(`expected a bundle, got: ${JSON.stringify(result.error)}`);

    expect(result.code).toContain('require("three")');
    expect(result.code).toContain('require("@genmotion/three-engine")');
  });

  it("evaluates to a builder function that returns an update callback", async () => {
    await write("scenes/01-intro.ts", ROTATING_CUBE);
    const result = await bundler.bundle("scenes/01-intro.ts");
    if (!result.ok) throw new Error("expected a bundle");

    const { evaluateThreeScene } = await import("@genmotion/compiler/evaluate-three");
    const evaluated = evaluateThreeScene(result.code);
    if (!evaluated.ok) throw new Error(`expected evaluation to succeed: ${evaluated.error.message}`);

    const THREE = await import("three");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const update = evaluated.build({
      canvas: {} as HTMLCanvasElement,
      renderer: {} as unknown as InstanceType<typeof THREE.WebGLRenderer>,
      scene,
      camera,
      setCamera: () => {},
      manager: new THREE.LoadingManager(),
      width: 1920,
      height: 1080,
      fps: 30,
      durationInFrames: 150,
    });

    expect(typeof update).toBe("function");
    expect(scene.children.length).toBeGreaterThan(0);
    // Calling the update callback shouldn't throw, and should move the cube.
    const cube = scene.children[0]!;
    update?.({ frame: 30, time: 1, fps: 30, progress: 0.2 });
    expect(cube.rotation.y).toBe(1);
  });
});

describe("validateThreeSceneFile", () => {
  const validate = (sceneFile = "scenes/01-intro.ts") =>
    validateThreeSceneFile({ bundler, sceneFile });

  it("passes a well-formed scene, with a reminder that this can't smoke-render", async () => {
    await write("scenes/01-intro.ts", ROTATING_CUBE);
    const result = await validate();
    expect(result.error).toBeNull();
    expect(result.warnings.some((w) => w.includes("capture_frames"))).toBe(true);
  });

  it("requires a default export", async () => {
    await write(
      "scenes/01-intro.ts",
      `export function buildScene() { return () => {}; }`,
    );
    const result = await validate();
    expect(result.error).toMatch(/default export/);
  });

  it("rejects THREE.Clock as a wall-clock footgun", async () => {
    await write(
      "scenes/01-intro.ts",
      `import * as THREE from "three";
       export default function buildScene() {
         const clock = new THREE.Clock();
         return () => { clock.getDelta(); };
       }`,
    );
    const result = await validate();
    expect(result.error).toMatch(/THREE\.Clock/);
  });

  it("rejects setAnimationLoop as a wall-clock footgun", async () => {
    await write(
      "scenes/01-intro.ts",
      `export default function buildScene({ renderer, scene, camera }: any) {
         renderer.setAnimationLoop(() => renderer.render(scene, camera));
         return () => {};
       }`,
    );
    const result = await validate();
    expect(result.error).toMatch(/setAnimationLoop/);
  });

  it("passes the starter scene every new three project opens with", async () => {
    // The welcome scene is the one piece of three-engine code we ship, and the
    // first thing the agent reads in a fresh project. If it ever trips the
    // determinism rules, or stops compiling against the engine's types, every
    // new project opens on a broken preview.
    await write("scenes/01-intro.ts", renderThreeStarterScene());
    const result = await validate();
    expect(result.error).toBeNull();
  });

  it("rejects non-deterministic code", async () => {
    await write(
      "scenes/01-intro.ts",
      `export default function buildScene() {
         return () => { Math.random(); };
       }`,
    );
    const result = await validate();
    expect(result.error).toMatch(/Math\.random/);
  });
});
