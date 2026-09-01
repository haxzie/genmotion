import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Publish the installer at genmotion.dev/install.sh.
 *
 * `curl -fsSL https://genmotion.dev/install.sh | sh` has to serve the script in
 * the repo, not a copy of it that someone remembered to update. So the file
 * lives once, at scripts/install.sh, and is copied into public/ before every
 * build and every dev run — the same arrangement esbuild.wasm has next door.
 */
const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "..", "..", "..", "scripts", "install.sh");
const dest = join(here, "..", "public", "install.sh");

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(source, dest);
console.log("Copied install.sh →", dest);
