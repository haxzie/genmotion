import { readManifest } from "@genmotion/project";
import { resolveXPost, type XResolvedPost, type XVideoVariant } from "@genmotion/shared";
import { downloadAsset } from "./assets";
import { CliError } from "./output";

/**
 * The video from a public post on X, in the project's `assets/`.
 *
 * The desktop app does this through our API because it has a session there and
 * the server is the one place a change to X's embed endpoint can be fixed
 * without shipping a build. The CLI has neither, so it calls the same resolver
 * (`@genmotion/shared`) itself: one copy of the awkward part, two surfaces, and
 * nothing here needs an account.
 *
 * The bytes come straight from `video.twimg.com` either way.
 */

/**
 * A video the user asked for by name, rather than a logo some scene happens to
 * want — so it gets a ceiling of its own. A 1080p two-minute X clip is roughly
 * 90MB; past this, the clip belongs on the machine already.
 */
const MAX_X_VIDEO_BYTES = 100 * 1024 * 1024;

export interface SavedXVideo {
  /** Project-relative, e.g. `assets/x-someone.mp4`. */
  path: string;
  bytes: number;
  kind: "video" | "gif";
  label: string;
  width: number;
  height: number;
  durationSeconds: number;
  /** The clip's length in the project's own frames, when the manifest is readable. */
  durationInFrames: number | null;
  post: { id: string; url: string; author: XResolvedPost["author"]; text: string };
  /** Renditions below the one taken, for a caller that wants a smaller file. */
  smaller: string[];
  /** Renditions passed over for being too big to save. */
  skipped: string[];
}

export interface XVideoOptions {
  quality?: "best" | "smallest";
  index?: number;
  filename?: string;
}

export async function downloadXPostVideo(
  projectDir: string,
  url: string,
  { quality = "best", index = 0, filename }: XVideoOptions = {},
): Promise<SavedXVideo> {
  const result = await resolveXPost(url);
  if (!result.ok) throw new CliError(FAILURES[result.reason].message, { fix: FAILURES[result.reason].fix });

  const { post } = result;
  const media = post.media[index];
  if (!media) {
    throw new CliError(
      `That post has ${post.media.length} video${post.media.length === 1 ? "" : "s"}, so there is no index ${index}.`,
      { fix: `--index 0..${post.media.length - 1}` },
    );
  }

  // The resolver answers best-first, so the chosen rung and everything smaller
  // is a slice — which is also the order to step through when a file turns out
  // to be too big to save.
  const ladder = media.variants.slice(quality === "smallest" ? media.variants.length - 1 : 0);
  const fps = await readManifest(projectDir)
    .then((m) => m.fps)
    .catch(() => null);

  const skipped: string[] = [];
  for (const [position, variant] of ladder.entries()) {
    const saved = await downloadAsset(projectDir, variant.url, filenameFor(post, media.kind, variant, filename), {
      maxBytes: MAX_X_VIDEO_BYTES,
      // Whole videos, not images: the asset default would time out part-way
      // through a big one and leave the caller thinking X was unreachable.
      timeoutMs: 5 * 60_000,
    }).catch((err: unknown) => {
      // Too big is the one failure worth stepping down for, because the next
      // rung is the same clip, smaller. Anything else fails the same way on
      // every rung, so it is raised rather than retried three more times.
      if (!(err instanceof Error) || !/limit/.test(err.message)) throw err;
      skipped.push(variant.label);
      return null;
    });
    if (!saved) continue;

    const durationSeconds = media.durationMs / 1000;
    return {
      path: saved.path,
      bytes: saved.bytes,
      kind: media.kind,
      label: variant.label,
      width: variant.width,
      height: variant.height,
      durationSeconds,
      durationInFrames: fps ? Math.round(durationSeconds * fps) : null,
      post: { id: post.id, url: `https://x.com/${post.author.handle}/status/${post.id}`, author: post.author, text: post.text },
      smaller: ladder.slice(position + 1).map((v) => v.label),
      skipped,
    };
  }

  throw new CliError(`Every rendition of that clip is over the 100MB limit (${skipped.join(", ")}).`, {
    fix: "Download it by hand and put the file in assets/",
  });
}

/**
 * `x-<handle>.mp4` by default, because `assets/` full of X's own
 * `Ldr5wfY5COSHMX62.mp4` tells nobody anything.
 */
function filenameFor(
  post: XResolvedPost,
  kind: "video" | "gif",
  variant: XVideoVariant,
  preferred?: string,
): string {
  if (preferred) return preferred;
  const stem = post.author.handle || post.id;
  return `x-${stem}${kind === "gif" ? "-gif" : ""}-${variant.label}.mp4`;
}

/** Why a resolve produced no video, in the words the command prints. */
const FAILURES = {
  "bad-url": {
    message: "That isn't a link to a post on X.",
    fix: "genmotion x-video https://x.com/<handle>/status/<id>",
  },
  "not-found": {
    // One message for deleted, protected, suspended and age-restricted: the
    // upstream does not distinguish them, and guessing which it was would be
    // inventing detail.
    message: "That post can't be seen. It may be deleted, private or restricted.",
    fix: "Check the link is a public post",
  },
  "no-video": {
    message: "That post doesn't have a video in it.",
    fix: "Use save_asset for an image, or pick a post with a clip",
  },
  upstream: {
    message: "Couldn't reach X just now.",
    fix: "Try again in a moment",
  },
} as const;
