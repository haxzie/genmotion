import { afterEach, beforeEach, describe, expect, it } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { createProject } from "../project";
import { createSceneBundler, type SceneBundler } from "../bundle";
import { validateSceneFile } from "../validate";

let dir: string;
let bundler: SceneBundler;

const write = (rel: string, body: string) =>
  fs.writeFile(path.join(dir, rel), body, "utf8");

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "gm-bundle-"));
  await createProject({ dir, name: "Bundle Test" });
  bundler = createSceneBundler({ projectDir: dir });
});

afterEach(async () => {
  await bundler.dispose();
  await fs.rm(dir, { recursive: true, force: true });
});

describe("createSceneBundler", () => {
  it("bundles the starter scene with no node_modules present", async () => {
    const result = await bundler.bundle("scenes/01-intro.tsx");
    expect(result.ok).toBe(true);
  });

  it("keeps the host runtime external so there is one React and one clock", async () => {
    const result = await bundler.bundle("scenes/01-intro.tsx");
    if (!result.ok) throw new Error("expected a bundle");

    // The host injects these through the require-shim; a second copy of React
    // or the motion runtime silently breaks hooks and the frame context.
    expect(result.code).toContain('require("@genmotion/motion")');
    expect(result.code).not.toContain("useCurrentFrame = ");
  });

  it("keeps three external — the host owns the one instance the hook renders with", async () => {
    await write(
      "scenes/01-intro.tsx",
      `import * as THREE from "three";
       import { ThreeScene } from "@genmotion/motion";
       export default function Scene() {
         return <ThreeScene build={({ scene }) => { scene.add(new THREE.AmbientLight(0xffffff)); }} />;
       }`,
    );
    const result = await bundler.bundle("scenes/01-intro.tsx");
    if (!result.ok) throw new Error("expected a bundle");

    // A bundled second copy would be megabytes, and its classes would fail the
    // instanceof checks the renderer makes against the host's.
    expect(result.code).toContain('require("three")');
    expect(result.code.length).toBeLessThan(20_000);
  });

  it("resolves a shared component from components/", async () => {
    await write(
      "components/Title.tsx",
      `export function Title({ text }: { text: string }) {
         return <h1 style={{ color: "#fff" }}>{text}</h1>;
       }`,
    );
    await write(
      "scenes/01-intro.tsx",
      `import { AbsoluteFill } from "@genmotion/motion";
       import { Title } from "../components/Title";
       export default function Scene() {
         return <AbsoluteFill><Title text="hi" /></AbsoluteFill>;
       }`,
    );

    const result = await bundler.bundle("scenes/01-intro.tsx");
    if (!result.ok) throw new Error("expected a bundle");
    expect(result.code).toContain("Title");
    expect(result.localInputs.some((p) => p.endsWith("Title.tsx"))).toBe(true);
  });

  it("inlines small images and serves large media by URL", async () => {
    // A 1x1 GIF, comfortably under the inline limit.
    await fs.writeFile(
      path.join(dir, "assets/dot.gif"),
      Buffer.from("R0lGODlhAQABAAAAACw=", "base64"),
    );
    await fs.writeFile(path.join(dir, "assets/clip.mp4"), Buffer.alloc(64));
    await write(
      "scenes/01-intro.tsx",
      `import { AbsoluteFill, Img, Video } from "@genmotion/motion";
       import dot from "../assets/dot.gif";
       import clip from "../assets/clip.mp4";
       export default function Scene() {
         return <AbsoluteFill><Img src={dot} /><Video src={clip} /></AbsoluteFill>;
       }`,
    );

    const result = await bundler.bundle("scenes/01-intro.tsx");
    if (!result.ok) throw new Error("expected a bundle");
    expect(result.code).toContain("data:image/gif;base64,");
    expect(result.code).toContain("gm-asset://assets/clip.mp4");
  });

  it("reports a compile error instead of throwing", async () => {
    await write("scenes/01-intro.tsx", `export default function Scene() { return <div>; }`);
    const result = await bundler.bundle("scenes/01-intro.tsx");
    expect(result.ok).toBe(false);
  });

  it("rebuilds incrementally when a dependency of the scene changes", async () => {
    await write("components/Title.tsx", `export const LABEL = "first";`);
    await write(
      "scenes/01-intro.tsx",
      `import { AbsoluteFill } from "@genmotion/motion";
       import { LABEL } from "../components/Title";
       export default function Scene() { return <AbsoluteFill>{LABEL}</AbsoluteFill>; }`,
    );
    const first = await bundler.bundle("scenes/01-intro.tsx");
    expect(first.ok && first.code).toContain("first");

    await write("components/Title.tsx", `export const LABEL = "second";`);
    const second = await bundler.bundle("scenes/01-intro.tsx");
    expect(second.ok && second.code).toContain("second");
  });
});

describe("validateSceneFile", () => {
  const validate = (sceneFile = "scenes/01-intro.tsx") =>
    validateSceneFile({ bundler, sceneFile });

  it("passes the starter scene", async () => {
    const result = await validate();
    expect(result.error).toBeNull();
    expect(result.warnings).toEqual([]);
  });

  it("renders a scene built from a shared component", async () => {
    await write(
      "components/Bar.tsx",
      `export function Bar({ w }: { w: number }) { return <div style={{ width: w }} />; }`,
    );
    await write(
      "scenes/01-intro.tsx",
      `import { AbsoluteFill } from "@genmotion/motion";
       import { Bar } from "../components/Bar";
       export default function Scene() { return <AbsoluteFill><Bar w={10} /></AbsoluteFill>; }`,
    );
    const result = await validate();
    expect(result.error).toBeNull();
  });

  it("loads and server-renders a three.js scene", async () => {
    await write(
      "scenes/01-intro.tsx",
      `import * as THREE from "three";
       import { ThreeScene } from "@genmotion/motion";
       export default function Scene() {
         return (
           <ThreeScene
             id="cube"
             build={({ scene, camera }) => {
               const cube = new THREE.Mesh(
                 new THREE.BoxGeometry(1, 1, 1),
                 new THREE.MeshStandardMaterial({ color: "#6ee7ff" }),
               );
               scene.add(cube, new THREE.DirectionalLight(0xffffff, 3));
               camera.position.z = 4;
               return ({ time }) => { cube.rotation.y = time; };
             }}
           />
         );
       }`,
    );
    // The smoke render has no DOM and no GL: this passes only because the hook
    // keeps every WebGL call inside a layout effect.
    const result = await validate();
    expect(result.error).toBeNull();
  });

  it("rejects non-deterministic code in the scene", async () => {
    await write(
      "scenes/01-intro.tsx",
      `import { AbsoluteFill } from "@genmotion/motion";
       export default function Scene() { return <AbsoluteFill>{Math.random()}</AbsoluteFill>; }`,
    );
    const result = await validate();
    expect(result.error).toMatch(/Math\.random/);
  });

  it("rejects non-deterministic code in a shared component too", async () => {
    await write("components/Clock.tsx", `export const now = () => Date.now();`);
    await write(
      "scenes/01-intro.tsx",
      `import { AbsoluteFill } from "@genmotion/motion";
       import { now } from "../components/Clock";
       export default function Scene() { return <AbsoluteFill>{now()}</AbsoluteFill>; }`,
    );
    const result = await validate();
    expect(result.error).toMatch(/components\/Clock\.tsx/);
    expect(result.error).toMatch(/Date\.now/);
  });

  it("requires a default export", async () => {
    await write(
      "scenes/01-intro.tsx",
      `import { AbsoluteFill } from "@genmotion/motion";
       export function Scene() { return <AbsoluteFill />; }`,
    );
    const result = await validate();
    expect(result.error).toMatch(/default export/);
  });

  it("rejects hot-linked logo CDNs", async () => {
    await write(
      "scenes/01-intro.tsx",
      `import { AbsoluteFill, Img } from "@genmotion/motion";
       export default function Scene() {
         return <AbsoluteFill><Img src="https://cdn.simpleicons.org/react" /></AbsoluteFill>;
       }`,
    );
    const result = await validate();
    expect(result.error).toMatch(/logo CDN/);
  });

  it("rejects raster pinning under a camera", async () => {
    await write(
      "scenes/01-intro.tsx",
      `import { AbsoluteFill, Camera } from "@genmotion/motion";
       export default function Scene() {
         return (
           <AbsoluteFill>
             <Camera>
               <div style={{ willChange: "transform" }}>zoom me</div>
             </Camera>
           </AbsoluteFill>
         );
       }`,
    );
    const result = await validate();
    expect(result.error).toMatch(/willChange/);
  });

  it("catches a scene that crashes only at a later frame", async () => {
    await write(
      "scenes/01-intro.tsx",
      `import { AbsoluteFill, useCurrentFrame } from "@genmotion/motion";
       export default function Scene() {
         const frame = useCurrentFrame();
         const items: string[] = [];
         if (frame > 10) { throw new Error("boom"); }
         return <AbsoluteFill>{items.length}</AbsoluteFill>;
       }`,
    );
    const result = await validate();
    expect(result.error).toMatch(/crashed while rendering frame/);
  });
});
