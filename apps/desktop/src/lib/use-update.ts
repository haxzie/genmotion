import { useEffect, useState } from "react";
import { api } from "../api";
import type { UpdateState } from "../../electron/shared";

/**
 * The update cycle, mirrored from the main process.
 *
 * The check itself runs at launch in main, so this only follows: seed once,
 * then take what it pushes. Same shape as `useAuth`, and for the same reason —
 * the main process owns the state, the renderer only draws it.
 */
export function useUpdate(): UpdateState {
  const [state, setState] = useState<UpdateState>({ status: "idle" });

  useEffect(() => {
    let live = true;
    void api.update.state().then((next) => {
      // A push may have landed first, and it is newer than this answer.
      if (live) setState((current) => (current.status === "idle" ? next : current));
    });
    const off = api.update.onChanged(setState);
    return () => {
      live = false;
      off();
    };
  }, []);

  return state;
}

/** Whether there is anything worth showing a badge for. */
export function hasUpdate(state: UpdateState): boolean {
  return (
    state.status === "available" ||
    state.status === "downloading" ||
    state.status === "ready"
  );
}
