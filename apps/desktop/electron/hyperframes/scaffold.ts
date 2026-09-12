import { installHyperframes, type InstallStep } from "@genmotion/hyperframes";
import { agentEnv, resolveExecutable } from "../agent/detect";
import type { ScaffoldState } from "../shared";

/**
 * The background install that follows a new HyperFrames project.
 *
 * The folder is complete and previewable before this starts — the scaffold
 * was written against the runtime the app carries — so what happens here is
 * an upgrade to the newest release, reported step by step to the editor's
 * scaffolding banner. It is keyed by folder because several projects can be
 * created in quick succession, and the renderer asks about them by folder.
 *
 * A clean landing is forgotten the moment it is announced: the banner shows
 * "installed" off that one event, and the project payload that follows —
 * whose runtime detection now sees the install — carries no scaffold state,
 * so it disappears and never comes back. Only a failure or a note stays,
 * because those are the ones with something to act on.
 */
const states = new Map<string, ScaffoldState>();
const listeners = new Set<(dir: string, state: ScaffoldState) => void>();
const controllers = new Map<string, AbortController>();

export function scaffoldState(dir: string): ScaffoldState | null {
  return states.get(dir) ?? null;
}

export function onScaffoldChange(listener: (dir: string, state: ScaffoldState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function set(dir: string, step: InstallStep): void {
  const state: ScaffoldState = { ...step, at: Date.now() };
  states.set(dir, state);
  for (const listener of listeners) listener(dir, state);
}

/**
 * Start (or restart) the install for a project. Returns once it settles.
 *
 * `npm` is looked up the way the agent CLIs are — through a login-shell PATH
 * — because a GUI app on macOS otherwise sees none of nvm, volta or homebrew.
 */
export async function runScaffoldInstall(dir: string): Promise<ScaffoldState> {
  controllers.get(dir)?.abort();
  const controller = new AbortController();
  controllers.set(dir, controller);

  const npm = await resolveExecutable("npm");
  const result = await installHyperframes(dir, {
    npm,
    env: agentEnv(),
    signal: controller.signal,
    onProgress: (step) => {
      if (controllers.get(dir) === controller) set(dir, step);
    },
  });
  if (controllers.get(dir) === controller) controllers.delete(dir);
  const settled = states.get(dir) ?? { ...result, at: Date.now() };
  if (settled.step === "done" && settled.note === null) states.delete(dir);
  return settled;
}

/** Closing or deleting a project mid-install stops the install. */
export function cancelScaffoldInstall(dir: string): void {
  controllers.get(dir)?.abort();
  controllers.delete(dir);
}

export function isScaffolding(dir: string): boolean {
  const state = states.get(dir);
  return state?.step === "resolving" || state?.step === "installing";
}
