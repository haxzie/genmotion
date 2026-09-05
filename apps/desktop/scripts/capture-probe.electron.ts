/**
 * TEMPORARY probe — drives electron/export/capture.ts against a real project.
 * Delete after verifying `capture_frames`.
 *
 *   electron dist/main/capture-probe.cjs <projectDir> <outDir>
 */
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { app, net, protocol } from "electron";
import { createSceneBundler, readManifest } from "@genmotion/project";
import { captureFrame } from "../electron/export/capture";
import { resolveFrameTarget } from "../electron/export/frame-target";
import type { ProjectSession } from "../electron/project-session";

const projectDir = process.argv[2]!;
const outDir = process.argv[3]!;
const ASSET_KEY = "probe";

protocol.registerSchemesAsPrivileged([
  { scheme: "gm-asset", privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } },
]);

// Each capture destroys its window; without this Electron quits the moment the
// first one closes. The real app always has its main window open.
app.on("window-all-closed", () => {});

const lines: string[] = [];
const log = (line: string) => {
  lines.push(line);
  fs.writeFileSync(path.join(outDir, "report.txt"), lines.join("\n") + "\n");
};

app.whenReady().then(async () => {
  protocol.handle("gm-asset", (request) => {
    const url = new URL(request.url);
    const file = path.join(projectDir, decodeURIComponent(url.pathname));
    return net.fetch(pathToFileURL(file).toString());
  });

  fs.mkdirSync(outDir, { recursive: true });
  try {
    const manifest = await readManifest(projectDir);
    const bundler = createSceneBundler({
      projectDir,
      assetUrlPrefix: `gm-asset://${ASSET_KEY}/`,
    });
    const session = { dir: projectDir, bundler } as unknown as ProjectSession;

    log(`${manifest.name} — ${manifest.width}x${manifest.height} @ ${manifest.fps}fps, ${manifest.scenes.length} scenes`);
    manifest.scenes.forEach((s, i) => log(`  ${i}. ${s.file} ${s.durationInFrames}f`));

    const cases: { label: string; args: { scene?: string; at?: string } }[] = [
      { label: "default-whole-timeline", args: {} },
      { label: "scene0-default", args: { scene: manifest.scenes[0]!.file } },
      { label: "scene2-default", args: { scene: manifest.scenes[2]!.file } },
      { label: "scene2-at-0s", args: { scene: manifest.scenes[2]!.file, at: "0s" } },
      { label: "scene2-at-2s", args: { scene: manifest.scenes[2]!.file, at: "2s" } },
      { label: "scene2-at-frame-140", args: { scene: manifest.scenes[2]!.file, at: "140" } },
      { label: "bad-scene", args: { scene: "scenes/nope.tsx" } },
    ];

    for (const { label, args } of cases) {
      const resolved = resolveFrameTarget(manifest, args);
      if (!resolved.ok) {
        log(`\n${label}: REFUSED — ${resolved.error}`);
        continue;
      }
      try {
      const { frame, scene, localFrame, totalFrames } = resolved.target;
      log(`\n${label}: frame ${frame}/${totalFrames} → ${scene.file} local ${localFrame}`);
      const started = Date.now();
      const single = args.scene !== undefined;
      const image = await captureFrame(session, {
        manifest,
        scenes: single ? [scene] : manifest.scenes,
        frame: single ? localFrame : frame,
      });
      const jpeg = image.resize({ width: 1024, quality: "good" }).toJPEG(80);
      const file = path.join(outDir, `${label}.jpg`);
      fs.writeFileSync(file, jpeg);
      log(`  captured in ${Date.now() - started}ms · ${image.getSize().width}x${image.getSize().height} raw · ${jpeg.byteLength} bytes jpeg`);
      } catch (err) {
        log(`  FAILED — ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    log("\nDONE");
  } catch (err) {
    log(`\nFAILED: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
  }
  app.quit();
});
