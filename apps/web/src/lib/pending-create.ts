/**
 * A prompt the visitor submitted from a public composer (e.g. the marketing
 * home) before they had a project — or before they signed in. It's stashed in
 * localStorage so it survives the auth round-trip, then consumed on the
 * dashboard to create the project and auto-send the first message.
 */
export const PENDING_CREATE_KEY = "gm-pending-create";

export type PendingCreate = {
  prompt: string;
  width: number;
  height: number;
};

export function writePendingCreate(value: PendingCreate): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PENDING_CREATE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage failures (private mode, quota) — worst case the prompt is lost.
  }
}

/** Read and remove the pending prompt in one step. */
export function consumePendingCreate(): PendingCreate | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_CREATE_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(PENDING_CREATE_KEY);
    const parsed = JSON.parse(raw) as Partial<PendingCreate>;
    if (
      typeof parsed.prompt === "string" &&
      parsed.prompt.trim() &&
      typeof parsed.width === "number" &&
      typeof parsed.height === "number"
    ) {
      return { prompt: parsed.prompt, width: parsed.width, height: parsed.height };
    }
    return null;
  } catch {
    return null;
  }
}
