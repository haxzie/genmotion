/**
 * The agent turn running in each open project, so a new one can supersede it.
 *
 * One entry per project folder rather than one slot for the app: two tabs are
 * two agents, and starting a turn in one must never stop the other. Kept in its
 * own module because both the loopback server (which starts turns) and the
 * session registry (which refuses to close a project mid-turn) need it, and
 * neither should import the other.
 */

const inFlight = new Map<string, AbortController>();
/** Resolved when the turn for that project reaches its `onFinish`. */
const settled = new Map<string, { promise: Promise<void>; resolve: () => void }>();

/**
 * Register a turn about to run for `dir`, aborting whatever was running there.
 *
 * Without the abort, hitting retry leaves the old turn alive: two agents
 * editing the same files at once, both billed to the user's plan.
 */
export function beginTurn(dir: string): AbortController {
  inFlight.get(dir)?.abort();
  const controller = new AbortController();
  inFlight.set(dir, controller);
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  settled.set(dir, { promise, resolve });
  return controller;
}

/**
 * Mark a turn finished. Identity-checked: a stale turn's finish, arriving after
 * a retry has already registered the next one, must not drop the live entry.
 */
export function endTurn(dir: string, controller: AbortController): void {
  if (inFlight.get(dir) !== controller) return;
  inFlight.delete(dir);
  settled.get(dir)?.resolve();
  settled.delete(dir);
}

export function isTurnRunning(dir: string): boolean {
  return inFlight.has(dir);
}

export function abortTurn(dir: string): void {
  inFlight.get(dir)?.abort();
}

/** Resolves once the project's current turn ends; immediately if none is running. */
export function turnSettled(dir: string): Promise<void> {
  return settled.get(dir)?.promise ?? Promise.resolve();
}
