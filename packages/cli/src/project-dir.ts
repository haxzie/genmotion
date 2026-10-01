import path from "node:path";
import { existsSync } from "node:fs";
import { MANIFEST_FILE } from "@genmotion/project";
import { CliError } from "./output";

/**
 * The project a command acts on: `--dir` when given, otherwise the nearest
 * folder at or above the working directory with a `project.json` — so an
 * agent that has `cd`'d into `scenes/` still hits the right project.
 */
export function resolveProjectDir(dir: string | undefined): string {
  if (dir) {
    const absolute = path.resolve(dir);
    if (!existsSync(path.join(absolute, MANIFEST_FILE))) {
      throw new CliError(`No ${MANIFEST_FILE} in ${absolute}`, { fix: `npx @genmotion/cli init ${dir}` });
    }
    return absolute;
  }
  let current = process.cwd();
  for (;;) {
    if (existsSync(path.join(current, MANIFEST_FILE))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new CliError(`Not inside a GenMotion project (no ${MANIFEST_FILE} here or above)`, {
    fix: "npx @genmotion/cli init my-video && cd my-video",
  });
}
