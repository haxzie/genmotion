import path from "node:path";
import fs from "node:fs/promises";
import { readManifest } from "@genmotion/project";
import type { ProjectSession } from "../project-session";
import { captureCompositionFrame, captureFrame } from "./capture";
import { recordExport, type ExportRecord } from "./history";
import { slug } from "./service";

/**
 * A still of the frame under the playhead, filed with the exports.
 *
 * The preview's Screenshot button. Rendered through the same offscreen path an
 * export runs — so it is the frame as it ships, at the composition's own
 * pixels, not a screen grab of the scaled preview — and written as a PNG next
 * to the videos in the project's `exports/` folder. It is remembered in the
 * export history too, so it shows in the Exports panel and page with "Show in
 * Finder" like any other export; a still is one more thing the project made.
 */
export async function captureScreenshot(
  session: ProjectSession,
  frame: number,
): Promise<ExportRecord> {
  const manifest = await readManifest(session.dir);
  const at = Math.max(0, Math.round(frame));

  let png: Buffer;
  let size: { width: number; height: number };
  if (session.engine === "hyperframes") {
    const captured = await captureCompositionFrame(session, at / manifest.fps);
    png = captured.image.toPNG();
    size = { width: captured.width, height: captured.height };
  } else {
    const image = await captureFrame(session, { manifest, scenes: manifest.scenes, frame: at });
    // `capturePage` answers at the display's pixel ratio; a still is the
    // composition's size, the same as a frame of the export.
    png = image.resize({ width: manifest.width, height: manifest.height, quality: "best" }).toPNG();
    size = { width: manifest.width, height: manifest.height };
  }

  const outDir = path.join(session.dir, "exports");
  await fs.mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outputPath = path.join(outDir, `${slug(manifest.name)}-${stamp}-f${at}.png`);
  await fs.writeFile(outputPath, png);

  const now = Date.now();
  const record: ExportRecord = {
    id: crypto.randomUUID(),
    projectDir: session.dir,
    projectName: manifest.name,
    format: "png",
    outputPath,
    sizeBytes: png.byteLength,
    ...size,
    fps: manifest.fps,
    durationSeconds: 0,
    createdAt: now,
    finishedAt: now,
  };
  await recordExport(record);
  return record;
}
