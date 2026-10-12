import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The home page showreel's clips: small, silent, local MP4s.
 *
 * The showreel plays a dozen videos at once, above the fold, so none of them
 * can be the template's own master — those are 1080p, tens of megabytes, and
 * served from the API in another region. Each card is at most a few hundred
 * pixels wide on screen, so this takes a few seconds out of the middle of each
 * template, drops the audio, and encodes it at card size. The result is a
 * couple of megabytes for the whole reel, which is what lets it start playing
 * rather than buffer.
 *
 * Run it after changing CLIPS (or when a template is re-rendered):
 *
 *   node scripts/build-showreel.mjs          # only what's missing
 *   node scripts/build-showreel.mjs --force  # re-encode everything
 *
 * The output is committed — the site builds on machines with no ffmpeg and no
 * reason to pull 200MB of masters at build time.
 */

/**
 * Which templates play, in the order they ride the marquee, and where in each
 * one to start.
 *
 * The newest twelve, newest first — the reel is the front page's evidence that
 * the catalog is alive, so it should be showing what landed last month, not
 * what landed first. Widescreen only: the card is 16:9 and a square template
 * would be squashed into it. `at` is a fraction of the video's duration, on a
 * moment that reads at this size — a title card, a reveal, something moving.
 */
const CLIPS = [
  { id: "cities-in-ink", at: 0.2 },
  { id: "nova-ai-assistant-launch-video", at: 0.42 },
  { id: "solara-funding-announcement", at: 0.6 },
  { id: "assemble-yc-launch-video", at: 0.55 },
  { id: "stripe-payment-links-launch-video", at: 0.45 },
  { id: "firebase-studio-launch-video", at: 0.4 },
  { id: "samsung-pay-fintech-app-launch-video", at: 0.5 },
  { id: "p-doom-music-video", at: 0.3 },
  { id: "crypto-launch-video", at: 0.5 },
  { id: "fintech-app-launch-video", at: 0.45 },
  { id: "notchbrowser-app-launch-video", at: 0.55 },
  { id: "types-of-databases", at: 0.35 },
];

/** Seconds of each template that make the reel. */
const CLIP_SECONDS = 7;
/** Encoded width; the card is never wider than this on a 2x screen. */
const WIDTH = 640;

const API_URL = process.env.GM_TEMPLATES_API_URL ?? "https://api.genmotion.dev";
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public", "home", "showreel");
// Masters are big and the encode is the part worth iterating on, so they are
// kept outside public/ and out of git between runs.
const cacheDir = join(here, "..", ".showreel-cache");
const force = process.argv.includes("--force");

mkdirSync(outDir, { recursive: true });
mkdirSync(cacheDir, { recursive: true });

const ffmpeg = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);

async function master(id) {
  const file = join(cacheDir, `${id}.mp4`);
  if (existsSync(file)) return file;
  const url = `${API_URL}/api/templates/${id}/video`;
  process.stdout.write(`  downloading ${url}\n`);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${id}: ${res.status} ${res.statusText}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

function duration(file) {
  const out = execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  return Number(out.toString().trim());
}

const manifest = [];

for (const clip of CLIPS) {
  const mp4 = join(outDir, `${clip.id}.mp4`);
  const poster = join(outDir, `${clip.id}.jpg`);
  const src = await master(clip.id);
  const total = duration(src);
  // Never start so late that the clip runs off the end of the video.
  const start = Math.max(0, Math.min(total * clip.at, total - CLIP_SECONDS));

  if (force || !existsSync(mp4)) {
    process.stdout.write(`  encoding ${clip.id}\n`);
    ffmpeg([
      // Seek before -i so ffmpeg jumps rather than decodes up to the point,
      // then -i again after for frame accuracy at the cut.
      "-ss", String(start),
      "-i", src,
      "-t", String(CLIP_SECONDS),
      "-an",
      "-vf", `scale=${WIDTH}:-2:flags=lanczos,fps=30`,
      "-c:v", "libx264",
      "-profile:v", "main",
      "-pix_fmt", "yuv420p",
      // CRF rather than a bitrate: these are flat motion-graphic frames, which
      // compress far better than footage, and quality should track that.
      "-crf", "32",
      "-preset", "slower",
      "-g", "60",
      // The moov atom up front, so playback starts on the first bytes.
      "-movflags", "+faststart",
      mp4,
    ]);
    ffmpeg(["-ss", String(start), "-i", src, "-frames:v", "1",
      "-vf", `scale=${WIDTH}:-2:flags=lanczos`, "-q:v", "6", poster]);
  }

  const bytes = statSync(mp4).size;
  manifest.push({ id: clip.id, bytes });
}

// Anything left over from a clip that has since dropped off the reel. The
// directory is committed, so a stale MP4 would ship forever otherwise.
const keep = new Set(CLIPS.flatMap((c) => [`${c.id}.mp4`, `${c.id}.jpg`]));
for (const file of readdirSync(outDir)) {
  if (keep.has(file)) continue;
  rmSync(join(outDir, file));
  console.log(`  removed ${file}`);
}

const total = manifest.reduce((sum, c) => sum + c.bytes, 0);
for (const c of manifest) console.log(`  ${c.id}  ${(c.bytes / 1024).toFixed(0)} KB`);
console.log(`showreel: ${manifest.length} clips, ${(total / 1024 / 1024).toFixed(2)} MB total`);
