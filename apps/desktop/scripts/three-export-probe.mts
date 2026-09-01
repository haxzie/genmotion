/**
 * Does a three.js scene actually advance in a DESKTOP export?
 *
 * A WebGL canvas is its own composited layer, fed asynchronously — the same
 * shape as the <video> layer that `camera-video-probe` caught going stale under
 * headless capture. This asks the question directly of the pipe that ships:
 * the scene bundler, the offscreen render host, `setFrame`, `capturePage`.
 *
 *   distinct  — how many of N captures differ. Anything under N/N means the
 *               capture read a stale texture and the export would stutter.
 *   luma      — mean brightness of the centre box. A scene that renders black
 *               (no lights, no context, dropped canvas) still passes a
 *               distinctness check on its DOM background alone; this doesn't.
 *
 *   pnpm --dir apps/desktop exec tsx --tsconfig ../../tsconfig.tsx-runtime.json \
 *     scripts/three-export-probe.mts [frames]
 */
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createSceneBundler } from "@genmotion/project";
import { buildRenderHost } from "./build-render-host.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRAMES = Number(process.argv[2] ?? 30);

/** Everything moves every frame, so a repeated capture can only be staleness. */
const SCENE = `
import * as THREE from "three";
import { ThreeScene } from "@genmotion/motion";

export default function Scene() {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#101018" }}>
      <ThreeScene
        id="cube"
        build={({ scene, camera }) => {
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
        }}
      />
    </div>
  );
}
`;

const dir = mkdtempSync(join(tmpdir(), "gm-three-probe-"));
mkdirSync(join(dir, "scenes"), { recursive: true });
writeFileSync(join(dir, "scenes", "01-cube.tsx"), SCENE);

const bundler = createSceneBundler({ projectDir: dir });
const built = await bundler.bundle("scenes/01-cube.tsx");
await bundler.dispose();
if (!built.ok) {
  console.error("bundle failed:", built.error);
  process.exit(1);
}
// If `three` stopped being a host module this line is where it shows: the
// bundle would carry its own megabyte-plus copy instead of requiring it.
console.log(
  `scene bundle ${(built.code.length / 1024).toFixed(1)}kB, requires: ${[
    ...built.code.matchAll(/require\("([^"]+)"\)/g),
  ]
    .map((m) => m[1])
    .join(", ")}`,
);

await buildRenderHost();
const hostBundle = await readFile(join(HERE, "..", "dist", "main", "render-host.js"), "utf8");
console.log(`render host ${(hostBundle.length / 1024 / 1024).toFixed(2)}MB`);

const payloadPath = join(dir, "payload.json");
const reportPath = join(dir, "report.txt");
writeFileSync(
  payloadPath,
  JSON.stringify({
    frames: FRAMES,
    hostBundle,
    scenes: [
      { id: "01-cube.tsx", name: "cube", durationInFrames: FRAMES, compiledCode: built.code },
    ],
  }),
);

// Electron's main process doesn't get its stdout piped through on macOS, so the
// probe writes a report file and this half prints it.
const child = spawn(
  join(HERE, "..", "node_modules", ".bin", "electron"),
  [join(HERE, "three-export-probe.electron.mjs"), payloadPath, reportPath],
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
