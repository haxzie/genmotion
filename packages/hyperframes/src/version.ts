import core from "@hyperframes/core/package.json" with { type: "json" };

/**
 * The HyperFrames release this app was built against.
 *
 * Everything the main process does — compiling, linting, the runtime it falls
 * back to — comes from this copy. A project may carry a newer `@hyperframes/core`
 * of its own in `node_modules` (see `install.ts`), whose runtime the preview and
 * export prefer when `isRuntimeCompatible` says the two agree on the
 * composition contract.
 */
export const HYPERFRAMES_VERSION: string = core.version;

/**
 * The GSAP release a fresh project pins — the one the desktop app vendors and
 * serves to compositions in place of the CDN (see `rewriteCdnScripts`). Keep
 * it equal to `apps/desktop`'s `gsap` dependency.
 */
export const GSAP_VERSION = "3.15.0";

/**
 * Whether a project-local runtime can stand in for the app's own.
 *
 * Upstream releases roughly daily and the compiler in this process must agree
 * with the runtime in the page on the attributes it stamps, so only the same
 * minor line is trusted; anything else falls back to the vendored runtime,
 * and the UI says so rather than rendering something subtly off.
 */
export function isRuntimeCompatible(projectVersion: string): boolean {
  const [appMajor, appMinor] = HYPERFRAMES_VERSION.split(".");
  const [major, minor] = projectVersion.split(".");
  return major === appMajor && minor === appMinor;
}
