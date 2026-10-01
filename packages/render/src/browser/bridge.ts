/**
 * The page-side contract every host bundle implements, shared by the render
 * page (driven by Playwright) and the studio page (driven by its own UI).
 *
 *   window.__gmInit(payload)   → mounts the composition, returns {} or {error}
 *   window.__gm.setFrame(n)    → resolves once frame n is drawn and settled
 *
 * The same bridge the desktop export window and `apps/renderer` drive, so a
 * scene that renders in one renders identically in the others.
 */
export interface HostScene {
  id: string;
  name: string;
  durationInFrames: number;
  compiledCode: string;
}

export interface HostPayload {
  scenes: HostScene[];
  fps: number;
  width: number;
  height: number;
  /** `capture` waits on every frame's readiness barrier; `preview` is for live playback. */
  mode?: "capture" | "preview";
}

export interface HostHandle {
  setFrame(frame: number, options?: { live?: boolean }): Promise<void> | void;
  getTotalFrames(): number;
  getLastError(): string | null;
  dispose?(): void;
}

declare global {
  interface Window {
    __gmInit: (payload: HostPayload) => { error?: string };
    __gm?: HostHandle;
  }
}

/** Sizes the `#root` container to the composition, or reports why it can't. */
export function prepareRoot(payload: HostPayload): HTMLElement | { error: string } {
  const container = document.getElementById("root");
  if (!container) return { error: "no #root element on the page" };
  container.style.width = `${payload.width}px`;
  container.style.height = `${payload.height}px`;
  container.style.position = "relative";
  container.style.overflow = "hidden";
  return container;
}
