import pkg from "../package.json" with { type: "json" };
import { DEFAULT_THREE_VERSIONS, type ThreeScaffoldVersions } from "@genmotion/project";

export const VERSION: string = pkg.version;

/**
 * What a Three.js project this CLI creates pins its own `genmotion` to: this
 * CLI's minor line, so `npm run dev` in the project runs the studio that made
 * it, never an older one. Every path that scaffolds (`init`, `init
 * --template`, the `create_project` tool) goes through this; a remix that
 * didn't once installed 0.2.x, whose studio has no audio.
 */
export const THREE_VERSIONS: ThreeScaffoldVersions = {
  ...DEFAULT_THREE_VERSIONS,
  cli: `^${VERSION.split(".").slice(0, 2).join(".")}.0`,
};
