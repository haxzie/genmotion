import path from "node:path";
import fs from "node:fs/promises";
import { readManifest } from "@genmotion/project";
import { captureCompositionFrame, captureFrame } from "./export/capture";
import { prune, snapshotJpeg } from "./agent/tools";
import type { ProjectSession } from "./project-session";

/**
 * The user's markup on a preview frame, made into a picture the agent reads.
 *
 * The preview's Draw tool lets someone circle a thing and say what's wrong
 * with it. The strokes arrive here in composition pixels; the frame under
 * them is rendered offscreen through the export path (so it is the frame as
 * it ships, not a screenshot of a scaled-down preview), the strokes are laid
 * over it, and the result is saved where `capture_frames` saves its own
 * snapshots. The chat then points the agent at the file and lists each mark's
 * geometry and what sat under it, which is the half of the feedback a picture
 * alone cannot carry: a model reads "the pill is too low" off a circle well,
 * and "move it to y=340" off one badly.
 */

/** One thing the user drew. Points are in composition pixels. */
export interface MarkupMark {
  /** 1-based; the number burned into the picture next to the mark. */
  n: number;
  kind: "pen" | "rect";
  points: { x: number; y: number }[];
}

export interface MarkupRequest {
  /** Where the playhead stood, on the timeline. */
  frame: number;
  marks: MarkupMark[];
}

/** Burned-in stroke colour: hot pink, which no dark or light scene wears. */
const INK = "#ff2d75";
const MARKUP_DIR = [".genmotion", "cache", "markups"];
const MARKUP_KEEP = 20;

function escapeXml(text: string): string {
  return text.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
}

function bounds(points: { x: number; y: number }[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
}

/**
 * The marks as SVG content for `CaptureInput.overlay`.
 *
 * Stroke width scales with the composition so a mark reads the same on a
 * 1080p and a 4K frame once both are shrunk to the model's 1024 pixels. Each
 * mark carries its number in a badge at its top-left corner — the chat's
 * note refers to "mark 2", and the picture has to say which one that is.
 */
function overlayFor(marks: MarkupMark[], width: number): string {
  const stroke = Math.max(4, Math.round(width / 400));
  const badge = stroke * 3.5;
  const parts: string[] = [];
  for (const mark of marks) {
    if (mark.points.length === 0) continue;
    const common = `fill="none" stroke="${INK}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"`;
    if (mark.kind === "rect" && mark.points.length >= 2) {
      const b = bounds(mark.points);
      parts.push(
        `<rect x="${b.left}" y="${b.top}" width="${b.width}" height="${b.height}" rx="${stroke}" ${common}/>`,
      );
    } else {
      const d = mark.points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
      parts.push(`<path d="${d}" ${common}/>`);
    }
    const b = bounds(mark.points);
    const cx = b.left;
    const cy = b.top;
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="${badge}" fill="${INK}"/>`,
      `<text x="${cx}" y="${cy}" fill="#fff" font-family="system-ui, sans-serif" font-weight="700" ` +
        `font-size="${badge * 1.3}" text-anchor="middle" dominant-baseline="central">${escapeXml(String(mark.n))}</text>`,
    );
  }
  return parts.join("");
}

/**
 * Render the frame with the marks on it and save it in the project.
 *
 * Returns the project-relative path — what the chat tells the agent to open —
 * and the composition size the marks were measured against, so the same
 * note can quote a mark's box as a fraction of the frame.
 */
export async function renderMarkup(
  session: ProjectSession,
  input: MarkupRequest,
): Promise<{ path: string; width: number; height: number }> {
  const manifest = await readManifest(session.dir);
  const frame = Math.max(0, Math.round(input.frame));

  let jpeg: Buffer;
  let size: { width: number; height: number };
  if (session.engine === "hyperframes") {
    const state = session.hyperframes.state();
    if (state.compileError) throw new Error(`the composition does not compile: ${state.compileError}`);
    const width = state.width ?? manifest.width;
    const captured = await captureCompositionFrame(
      session,
      frame / manifest.fps,
      overlayFor(input.marks, width),
    );
    jpeg = snapshotJpeg(captured.image, captured.width);
    size = { width: captured.width, height: captured.height };
  } else {
    const image = await captureFrame(session, {
      manifest,
      scenes: manifest.scenes,
      frame,
      overlay: overlayFor(input.marks, manifest.width),
    });
    jpeg = snapshotJpeg(image, manifest.width);
    size = { width: manifest.width, height: manifest.height };
  }

  const dir = path.join(session.dir, ...MARKUP_DIR);
  await fs.mkdir(dir, { recursive: true });
  // Frame first so the folder sorts the way the timeline runs; the stamp
  // keeps two rounds of notes on the same frame apart.
  const name = `markup-f${String(frame).padStart(4, "0")}-${Date.now().toString(36)}.jpg`;
  await fs.writeFile(path.join(dir, name), jpeg);
  await prune(dir, MARKUP_KEEP).catch(() => {});

  return { path: [...MARKUP_DIR, name].join("/"), ...size };
}
