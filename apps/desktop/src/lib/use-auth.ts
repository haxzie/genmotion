import { useEffect, useState } from "react";
import { api } from "../api";
import type { AuthState } from "../../electron/shared";

/**
 * The signed-in account, kept in step with the main process.
 *
 * The main process owns the token and the polling, so this only mirrors what
 * it broadcasts: seed once, then follow. Starting from `loading` rather than
 * `signed-out` matters — the login screen must not flash while a stored token
 * is being checked.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let live = true;
    void api.auth.state().then((next) => {
      // A push may have landed first; it is newer than this answer.
      if (live) setState((current) => (current.status === "loading" ? next : current));
    });
    const off = api.auth.onChanged(setState);
    return () => {
      live = false;
      off();
    };
  }, []);

  return state;
}
