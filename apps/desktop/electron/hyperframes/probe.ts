import { execFile } from "node:child_process";
import { bundledBinary } from "../bundled-bin";

/**
 * Seconds of a media file, by asking the bundled ffmpeg.
 *
 * No ffprobe ships with the app, but `ffmpeg -i` prints the same `Duration:`
 * line to stderr before complaining that no output was given — which is the
 * one thing this needs. Zero when the file can't be read: the compiler treats
 * that as "unknown" and leaves the clip's own `data-duration` in charge.
 */
export function probeMediaDuration(file: string): Promise<number> {
  return new Promise((resolve) => {
    execFile(
      bundledBinary("ffmpeg"),
      ["-hide_banner", "-i", file],
      { timeout: 15_000, maxBuffer: 1024 * 1024 },
      (_err, _stdout, stderr) => {
        const match = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(String(stderr));
        if (!match) return resolve(0);
        const [, h, m, s] = match;
        resolve(Number(h) * 3600 + Number(m) * 60 + Number(s));
      },
    );
  });
}
