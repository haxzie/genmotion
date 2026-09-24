import path from "node:path";
import fs from "node:fs/promises";
import { nativeImage, type NativeImage } from "electron";
import { readManifest, type ProjectManifest } from "@genmotion/project";
import type { ProjectSession } from "../project-session";
import type { FilmstripData } from "../shared";
import { hasActiveExport, onExportChange } from "./service";
import { openCompositionWindow } from "./hyperframes-window";
import {
  bundleScene,
  captureWaiting,
  openRenderHost,
  releaseWarmHost,
  serialize,
  type CompiledScene,
} from "./capture";
import {
  FILMSTRIP_SCALE,
  compositeStrip,
  coverCrop,
  filmstripKey,
  filmstripSlug,
  planFilmstrip,
  type FilmstripPlan,
} from "./filmstrip-plan";

/**
 * Scene filmstrips: the frames behind each card on the timeline.
 *
 * A scene is a composition, not a clip, so there is no file to pull frames
 * from — every tile is rendered, through the same offscreen page an export
 * drives. What makes that affordable is the shape of the cost: opening the
 * page and getting it to "ready" is the expensive part (a load, a bundle,
 * fonts, assets); a seek and a capture after that is what the export does
 * thirty times a second. So a rebuild opens ONE page, walks every stale
 * scene's tiles through it, and closes — never a page per tile — and the
 * page is a quarter-scale one, since the tiles are 44px tall.
 *
 * It runs when nothing else needs the machine: well after the folder's last
 * change (the agent writes a scene several times over), never while an
 * export holds the window, and never while the preview is playing — a
 * raster job in the background is exactly what drops frames in the
 * foreground. Only scenes whose inputs changed are re-rendered; the rest are
 * found on disk by content key.
 */

/** Project-relative; inside `.genmotion/`, which the watcher ignores. */
const FILMSTRIP_DIR = [".genmotion", "cache", "filmstrips"];

/**
 * How long after the last folder change to start. Shorter than the card
 * thumbnail's four seconds — the strips are on screen, the card is not — but
 * long enough to ride out the agent saving a file twice in a row.
 */
const SETTLE_MS = 1500;

/**
 * Painted at a quarter of the composition's pixels. A tile is 88 device
 * pixels tall, so a 1080p frame captured at 270 still has three times the
 * detail the tile can show; what it saves is sixteen-fold on raster and
 * readback per frame.
 */
const RENDER_SCALE = 0.25;

const JPEG_QUALITY = 72;

/** Change this when the strip's look changes, so cached files are rebuilt. */
const FORMAT_VERSION = 1;

type Listener = (dir: string, sceneId: string, strip: FilmstripData | null) => void;

interface Published {
  key: string;
  data: FilmstripData;
}

interface Entry {
  session: ProjectSession;
  timer: NodeJS.Timeout | null;
  /** Something changed since the last run finished — or one never ran. */
  wanted: boolean;
  running: Promise<void> | null;
  /** Bumped per change; a run in flight stops when it sees a newer one. */
  generation: number;
  published: Map<string, Published>;
}

/** One tile's inputs, before any picture exists. */
interface SceneJob {
  sceneId: string;
  key: string;
  plan: FilmstripPlan;
  /** Absolute time in the page, per tile — seconds for HyperFrames, frames for React. */
  at: number[];
}

const entries = new Map<string, Entry>();
/** Projects whose preview is playing right now. Empty is the go signal. */
const playing = new Set<string>();
const listeners = new Set<Listener>();

/** Thrown inside a run when the project changed underneath it. */
class Stale extends Error {}

export function onFilmstripChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** What the renderer asks for on mount: whatever has been published so far. */
export function filmstripsFor(dir: string): Record<string, FilmstripData> {
  const entry = entries.get(path.resolve(dir));
  if (!entry) return {};
  return Object.fromEntries([...entry.published].map(([id, p]) => [id, p.data]));
}

/** The project's folder changed (or it was just opened): rebuild once it settles. */
export function scheduleFilmstrips(session: ProjectSession): void {
  let entry = entries.get(session.dir);
  if (!entry) {
    entry = { session, timer: null, wanted: false, running: null, generation: 0, published: new Map() };
    entries.set(session.dir, entry);
  }
  entry.generation++;
  entry.wanted = true;
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => {
    entry.timer = null;
    kick(entry);
  }, SETTLE_MS);
}

/** The project closed: nothing more to draw, and nothing to wait for. */
export function forgetFilmstrips(dir: string): void {
  const resolved = path.resolve(dir);
  const entry = entries.get(resolved);
  if (entry) {
    if (entry.timer) clearTimeout(entry.timer);
    // A run in flight sees the bump and stops at its next tile.
    entry.generation++;
    entry.wanted = false;
    entries.delete(resolved);
  }
  setPlaybackState(resolved, false);
}

export function setPlaybackState(dir: string, isPlaying: boolean): void {
  const resolved = path.resolve(dir);
  if (isPlaying) playing.add(resolved);
  else playing.delete(resolved);
  if (playing.size === 0) kickAll();
}

/** The export finished (or gave up the window): whoever was waiting may go. */
onExportChange(() => {
  if (!hasActiveExport()) kickAll();
});

function blocked(): boolean {
  return hasActiveExport() || playing.size > 0;
}

function kickAll(): void {
  for (const entry of entries.values()) kick(entry);
}

/**
 * Come back after the usual settle rather than the moment the queue frees.
 *
 * Standing aside for one capture only to restart into the next is how a run
 * that yields ends up thrashing — and the restart would close the window that
 * capture just warmed. The agent looks at a frame two or three times in a
 * row, so wait out the burst the same way a burst of file writes is waited
 * out.
 */
function defer(entry: Entry): void {
  entry.wanted = true;
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => {
    entry.timer = null;
    kick(entry);
  }, SETTLE_MS);
}

/** Start a run if one is wanted and nothing stands in the way. */
function kick(entry: Entry): void {
  if (!entry.wanted || entry.timer || entry.running || entry.session.disposed) return;
  if (blocked()) return;
  entry.wanted = false;
  entry.running = run(entry)
    .catch((err) => {
      if (err instanceof Stale) return;
      console.warn(`[filmstrip] ${path.basename(entry.session.dir)}:`, err instanceof Error ? err.message : err);
    })
    .finally(() => {
      entry.running = null;
      // A change that landed mid-run is still wanted; an early stop left work.
      if (entries.get(entry.session.dir) === entry) kick(entry);
    });
}

function publish(entry: Entry, sceneId: string, next: Published | null): void {
  const current = entry.published.get(sceneId);
  if (next) {
    if (current?.key === next.key) return;
    entry.published.set(sceneId, next);
  } else {
    if (!current) return;
    entry.published.delete(sceneId);
  }
  for (const listener of listeners) listener(entry.session.dir, sceneId, next?.data ?? null);
}

function stripDir(session: ProjectSession): string {
  return path.join(session.dir, ...FILMSTRIP_DIR);
}

function stripFile(sceneId: string, key: string): string {
  return `${filmstripSlug(sceneId)}.${key}.jpg`;
}

function stripData(session: ProjectSession, sceneId: string, key: string, plan: FilmstripPlan): FilmstripData {
  return {
    url: session.assetUrl([...FILMSTRIP_DIR, stripFile(sceneId, key)].join("/")),
    tileWidth: plan.tileWidth,
    tileHeight: plan.tileHeight,
    count: plan.count,
  };
}

/** Drop every strip for a scene except the one named — or all of them. */
async function pruneStrips(session: ProjectSession, sceneId: string, keep: string | null): Promise<void> {
  const dir = stripDir(session);
  const prefix = `${filmstripSlug(sceneId)}.`;
  const names = await fs.readdir(dir).catch(() => [] as string[]);
  await Promise.all(
    names
      .filter((name) => name.startsWith(prefix) && name.endsWith(".jpg") && name !== keep)
      .map((name) => fs.rm(path.join(dir, name), { force: true })),
  );
}

async function run(entry: Entry): Promise<void> {
  const { session } = entry;
  const generation = entry.generation;
  const assertFresh = () => {
    if (entry.generation !== generation || session.disposed) throw new Stale();
  };

  const manifest = await readManifest(session.dir).catch(() => null);
  if (!manifest) return;
  assertFresh();

  const prepared =
    manifest.engine === "hyperframes" ? prepareComposition(session) : await prepareReact(session, manifest);
  assertFresh();

  // Scenes that went, then scenes that stayed: what is already on disk is
  // published without a render, the rest are the work.
  const present = new Set(prepared.jobs.map((job) => job.sceneId));
  for (const sceneId of [...entry.published.keys()]) {
    if (!present.has(sceneId)) {
      publish(entry, sceneId, null);
      await pruneStrips(session, sceneId, null);
    }
  }
  const dirty: SceneJob[] = [];
  for (const job of prepared.jobs) {
    if (entry.published.get(job.sceneId)?.key === job.key) continue;
    const file = path.join(stripDir(session), stripFile(job.sceneId, job.key));
    const cached = await fs.stat(file).then(() => true, () => false);
    if (cached) {
      publish(entry, job.sceneId, { key: job.key, data: stripData(session, job.sceneId, job.key, job.plan) });
    } else {
      dirty.push(job);
    }
  }
  if (dirty.length === 0) return;

  // Re-checked at the last moment: the settle timer may have run out while a
  // play started. Wanted again, so the pause brings it back.
  if (blocked()) {
    entry.wanted = true;
    return;
  }

  // Through the same queue as the card thumbnail and the agent's capture
  // tool: each of those wants the machine to itself while it holds a window.
  await serialize(async () => {
    assertFresh();
    if (blocked()) {
      entry.wanted = true;
      return;
    }
    // A page of its own is about to open, and only one may be up at a time.
    releaseWarmHost();
    const page = await prepared.open();
    try {
      for (const job of dirty) {
        const tiles: Buffer[] = [];
        for (const at of job.at) {
          assertFresh();
          // The agent asked to see a frame while this was drawing tiles.
          // Strips are background work and this can be hundreds of captures
          // long; give the machine back between tiles rather than make the
          // model wait out the whole strip, and come back for the rest.
          if (captureWaiting()) {
            defer(entry);
            return;
          }
          await page.seek(at);
          const image = await page.capture();
          if (image.isEmpty()) throw new Error(`blank capture in ${job.sceneId}`);
          tiles.push(tileBitmap(image, job.plan));
        }
        const file = await writeStrip(session, job, tiles);
        await pruneStrips(session, job.sceneId, path.basename(file));
        publish(entry, job.sceneId, { key: job.key, data: stripData(session, job.sceneId, job.key, job.plan) });
      }
    } finally {
      page.close();
    }
  });
}

/** One captured frame, scaled and cropped to a tile, as BGRA. */
function tileBitmap(image: NativeImage, plan: FilmstripPlan): Buffer {
  const tile = { width: plan.tileWidth * FILMSTRIP_SCALE, height: plan.tileHeight * FILMSTRIP_SCALE };
  const fit = coverCrop(image.getSize(), tile);
  return image
    .resize({ ...fit.resize, quality: "good" })
    .crop({ ...fit.crop, ...tile })
    .toBitmap();
}

async function writeStrip(session: ProjectSession, job: SceneJob, tiles: Buffer[]): Promise<string> {
  const width = job.plan.tileWidth * FILMSTRIP_SCALE;
  const height = job.plan.tileHeight * FILMSTRIP_SCALE;
  const bitmap = compositeStrip(tiles, width, height);
  const jpeg = nativeImage
    .createFromBitmap(bitmap, { width: width * tiles.length, height, scaleFactor: 1 })
    .toJPEG(JPEG_QUALITY);
  const dir = stripDir(session);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, stripFile(job.sceneId, job.key));
  // Write-then-rename: the renderer may fetch the moment it is told.
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, jpeg);
  await fs.rename(tmp, file);
  return file;
}

/** A page ready to seek and capture, however the engine spells that. */
interface Page {
  seek(at: number): Promise<void>;
  capture(): Promise<NativeImage>;
  close(): void;
}

interface Prepared {
  jobs: SceneJob[];
  open(): Promise<Page>;
}

/**
 * HyperFrames: the compiled composition is the page, and every sub-composition
 * on its timeline is a scene. A scene's key covers its own file and
 * `index.html` (which places it), so editing one scene rebuilds one strip.
 */
function prepareComposition(session: ProjectSession): Prepared {
  const compiled = session.hyperframes.current;
  if (!compiled || compiled.durationSeconds <= 0) return { jobs: [], open: unavailable };
  const state = session.hyperframes.state();
  const code = new Map(state.files.map((f) => [f.path, f.code]));
  const aspect = compiled.width / compiled.height;

  const jobs: SceneJob[] = [];
  for (const scene of compiled.timeline.scenes) {
    const duration = scene.duration ?? Math.max(0, compiled.durationSeconds - scene.start);
    if (duration <= 0) continue;
    const plan = planFilmstrip(duration, aspect);
    jobs.push({
      sceneId: scene.file,
      key: filmstripKey([
        FORMAT_VERSION,
        "hyperframes",
        code.get("index.html") ?? "",
        code.get(scene.file) ?? "",
        scene.start,
        duration,
        compiled.width,
        compiled.height,
        plan.tileWidth,
        plan.count,
      ]),
      plan,
      at: plan.times.map((t) => scene.start + t),
    });
  }

  return {
    jobs,
    open: async () => {
      const page = await openCompositionWindow(session, {
        width: compiled.width,
        height: compiled.height,
        scale: RENDER_SCALE,
      });
      return {
        seek: (t) => page.seek(Math.min(t, Math.max(0, page.durationSeconds - 1 / 1000))),
        capture: () => page.capture(),
        close: () => page.close(),
      };
    },
  };
}

/**
 * React: every scene that builds is mounted into one render host, in manifest
 * order, and a tile is a frame into that concatenation. A scene that does not
 * build keeps whatever strip it had — the agent is mid-edit, and a blank
 * card would say less than the old picture.
 */
async function prepareReact(session: ProjectSession, manifest: ProjectManifest): Promise<Prepared> {
  const { fps, width, height } = manifest;
  const aspect = width / height;
  const scenes: CompiledScene[] = [];
  const jobs: SceneJob[] = [];
  let offset = 0;
  for (const entry of manifest.scenes) {
    const built = await bundleScene(session, entry);
    if (!built.ok) continue;
    const { scene } = built;
    scenes.push(scene);
    const plan = planFilmstrip(scene.durationInFrames / fps, aspect);
    jobs.push({
      sceneId: scene.id,
      key: filmstripKey([
        FORMAT_VERSION,
        session.engine,
        scene.compiledCode,
        scene.durationInFrames,
        scene.startFrom ?? 0,
        scene.sourceDurationInFrames ?? scene.durationInFrames,
        fps,
        width,
        height,
        plan.tileWidth,
        plan.count,
      ]),
      plan,
      at: plan.times.map((t) =>
        offset + Math.min(scene.durationInFrames - 1, Math.max(0, Math.round(t * fps))),
      ),
    });
    offset += scene.durationInFrames;
  }
  if (scenes.length === 0) return { jobs: [], open: unavailable };

  return {
    jobs,
    open: async () => {
      const host = await openRenderHost({
        manifest,
        scenes,
        scale: RENDER_SCALE,
        engine: session.engine === "three" ? "three" : undefined,
      });
      return {
        seek: (frame) => host.setFrame(frame),
        capture: () => host.capture(),
        close: () => host.close(),
      };
    },
  };
}

function unavailable(): Promise<Page> {
  return Promise.reject(new Error("nothing to render"));
}
