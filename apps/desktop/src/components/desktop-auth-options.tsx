import { useState } from "react";
import { formatUserCode } from "@genmotion/shared";
import { Button, Input, Spinner, cx } from "@/components/ui";
import { GithubIcon, GoogleIcon, socialButton } from "@/components/auth-options";
import { api } from "../api";
import type { AuthState } from "../../electron/shared";

/**
 * The desktop half of the sign-in controls.
 *
 * Deliberately the same markup as the web app's `AuthOptions` — same buttons,
 * same divider, same magic-link form — because it is the same product and the
 * same three choices. What differs is where the click goes: the browser cannot
 * hand a session back to an Electron app, so each button opens the real
 * browser and the main process waits for the approval to come through.
 *
 * The waiting state is the one thing web has no equivalent of, and the code it
 * shows is not decoration: it is what the user checks the browser against
 * before approving.
 */
export function DesktopAuthOptions({ state }: { state: AuthState }) {
  const [email, setEmail] = useState("");
  const [starting, setStarting] = useState<null | "google" | "github" | "magic">(null);

  const pending = state.status === "pending" ? state : null;
  const error = state.status === "signed-out" ? state.error : undefined;
  // `starting` covers the gap between the click and the main process answering;
  // after that the state itself says whether something is in flight.
  const busy = starting !== null || pending !== null;

  async function start(provider: "google" | "github" | "magic", withEmail?: string) {
    setStarting(provider);
    try {
      await api.auth.start(provider, withEmail);
    } finally {
      setStarting(null);
    }
  }

  if (pending) {
    return (
      <div className="flex flex-col gap-3">
        {pending.provider === "magic" ? (
          <div className="text-center">
            <p className="text-text-primary">Check your inbox</p>
            <p className="mt-1.5 text-[0.857rem] text-text-secondary">
              We sent a sign-in link to{" "}
              <span className="text-text-primary">{pending.email}</span>. Open it
              in your browser to continue.
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-text-primary">Finish in your browser</p>
            <p className="mt-1.5 text-[0.857rem] text-text-secondary">
              We opened GenMotion in your browser. Approve the request there to
              sign in here.
            </p>
          </div>
        )}

        <p className="mt-2 rounded-md border border-border bg-surface-raised py-3 text-center font-mono text-xl tracking-[0.3em] text-text-primary">
          {formatUserCode(pending.userCode)}
        </p>
        <p className="text-center text-[0.786rem] text-text-tertiary">
          Only approve if your browser shows this code.
        </p>

        <div className="mt-2 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => void api.auth.openBrowser()}
            className="text-[0.857rem] text-accent hover:text-green"
          >
            Open browser again
          </button>
          <span className="h-3 w-px bg-border" />
          <button
            type="button"
            onClick={() => void api.auth.cancel()}
            className="text-[0.857rem] text-text-tertiary hover:text-text-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => void start("google")}
        disabled={busy}
        className={socialButton}
      >
        {starting === "google" ? <Spinner /> : <GoogleIcon />}
        Continue with Google
      </button>
      <button
        type="button"
        onClick={() => void start("github")}
        disabled={busy}
        className={socialButton}
      >
        {starting === "github" ? <Spinner /> : <GithubIcon />}
        Continue with GitHub
      </button>

      <div className="my-1 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[0.786rem] text-text-tertiary">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void start("magic", email.trim());
        }}
        className="flex flex-col gap-3"
      >
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          className="h-10"
        />
        <Button
          type="submit"
          variant="primary"
          disabled={busy || !email.trim()}
          className={cx("h-10")}
        >
          {starting === "magic" ? (
            <Spinner className="text-background" />
          ) : (
            "Email me a sign-in link"
          )}
        </Button>
      </form>

      {error && <p className="text-[0.857rem] text-danger">{error}</p>}
    </div>
  );
}
