/**
 * Does the pure-Three.js engine's render host actually advance in a DESKTOP
 * export, including across a scene boundary?
 *
 * Same shape as `three-export-probe.mts` (which validates the React engine's
 * `<ThreeScene>` layer), but drives `render-host-three.js` directly — no
 * React, no JSX — and mounts TWO scenes back to back, so the one-renderer/
 * many-scenes dispose-and-rebuild path (see `mountThreeRenderHost`) is
 * actually exercised, not just a single scene's steady state.
 *
 *   distinct   — how many of N captures differ. Anything under N/N means the
 *                capture read a stale texture and the export would stutter.
 *   luma       — mean brightness of the centre box, sampled once per scene.
 *   boundary   — the frame right after the cut isn't stale/blank, which a
 *                single-scene probe can't catch.
 *
 *   pnpm --dir apps/desktop exec tsx --tsconfig ../../tsconfig.tsx-runtime.json \
 *     scripts/three-engine-host-probe.mts [framesPerScene]
 */
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createSceneBundler } from "@genmotion/project";
import { buildThreeRenderHost } from "./build-render-host.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRAMES_PER_SCENE = Number(process.argv[2] ?? 20);

/** Distinct colours and motion per scene, so a stale/mixed-up scene is obvious. */
const SCENE_A = `
import * as THREE from "three";

export default function buildScene({ scene, camera }) {
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshStandardMaterial({ color: "#6ee7ff", roughness: 0.35 }),
  );
  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(3, 4, 5);
  scene.add(cube, key, new THREE.AmbientLight(0xffffff, 0.6));
  camera.position.z = 6;
  return ({ time }) => {
    cube.rotation.y = time * 1.5;
    cube.rotation.x = time * 0.9;
  };
}
`;

const SCENE_B = `
import * as THREE from "three";

export default function buildScene({ scene, camera }) {
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 24, 24),
    new THREE.MeshStandardMaterial({ color: "#ff6e9e", roughness: 0.2 }),
  );
  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(-3, 2, 4);
  scene.add(sphere, key, new THREE.AmbientLight(0xffffff, 0.4));
  camera.position.z = 6;
  return ({ time }) => {
    sphere.position.x = Math.sin(time * 2) * 1.5;
  };
}
`;

const dir = mkdtempSync(join(tmpdir(), "gm-three-engine-probe-"));
mkdirSync(join(dir, "scenes"), { recursive: true });
writeFileSync(join(dir, "scenes", "01-cube.ts"), SCENE_A);
writeFileSync(join(dir, "scenes", "02-sphere.ts"), SCENE_B);

const bundler = createSceneBundler({ projectDir: dir });
const built = [];
for (const file of ["scenes/01-cube.ts", "scenes/02-sphere.ts"]) {
  const result = await bundler.bundle(file);
  if (!result.ok) {
    console.error(`bundle failed for ${file}:`, result.error);
    process.exit(1);
  }
  built.push({ file, code: result.code });
}
await bundler.dispose();
// If `three`/`@genmotion/three-engine` stopped being host modules this is
// where it shows: the bundle would carry its own copy instead of requiring it.
for (const { file, code } of built) {
  console.log(
    `${file} bundle ${(code.length / 1024).toFixed(1)}kB, requires: ${[
      ...code.matchAll(/require\("([^"]+)"\)/g),
    ]
      .map((m) => m[1])
      .join(", ")}`,
  );
}

await buildThreeRenderHost();
const hostBundle = await readFile(join(HERE, "..", "dist", "main", "render-host-three.js"), "utf8");
console.log(`render host ${(hostBundle.length / 1024 / 1024).toFixed(2)}MB`);

const payloadPath = join(dir, "payload.json");
const reportPath = join(dir, "report.txt");
writeFileSync(
  payloadPath,
  JSON.stringify({
    framesPerScene: FRAMES_PER_SCENE,
    hostBundle,
    scenes: [
      { id: "01-cube.ts", name: "cube", durationInFrames: FRAMES_PER_SCENE, compiledCode: built[0]!.code },
      { id: "02-sphere.ts", name: "sphere", durationInFrames: FRAMES_PER_SCENE, compiledCode: built[1]!.code },
    ],
  }),
);

// Electron's main process doesn't get its stdout piped through on macOS, so
// the probe writes a report file and this half prints it.
const child = spawn(
  join(HERE, "..", "node_modules", ".bin", "electron"),
  [join(HERE, "three-engine-host-probe.electron.mjs"), payloadPath, reportPath],
  { stdio: ["ignore", "inherit", "pipe"] },
);
child.stderr.on("data", (d: Buffer) => {
  const line = String(d);
  if (!/GPU|gpu_|Vulkan|dawn|DevTools|libva|autofill/i.test(line)) process.stderr.write(line);
});
child.on("close", async (code) => {
  process.stdout.write(await readFile(reportPath, "utf8").catch(() => "no report\n"));
  process.exit(code ?? 0);
});
