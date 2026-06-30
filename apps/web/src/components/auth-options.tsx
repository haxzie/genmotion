"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { Button, Input, Spinner, cx } from "@/components/ui";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.45 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 4.75 12 4.75Z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 fill-current" aria-hidden="true">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-1.96c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.2-3.1-.12-.3-.52-1.48.11-3.08 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.5 3.17-1.18 3.17-1.18.63 1.6.23 2.78.11 3.07.75.82 1.2 1.85 1.2 3.11 0 4.43-2.7 5.41-5.28 5.69.42.36.79 1.07.79 2.16v3.2c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

const socialButton =
  "flex h-10 w-full items-center justify-center gap-2.5 rounded-md border border-border bg-surface-raised text-text-primary font-medium transition-colors duration-150 outline-none hover:border-border-strong hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * The sign-in controls (Google, GitHub, and magic link) shared by the full auth
 * page and the homepage login modal. After a successful sign-in the browser is
 * sent to `callbackURL` (defaults to /dashboard), where any pending prompt from
 * the homepage composer is picked up.
 */
export function AuthOptions({ callbackURL }: { callbackURL?: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<null | "google" | "github" | "magic">(null);
  const [sent, setSent] = useState(false);

  const resolvedCallback =
    callbackURL ??
    (typeof window !== "undefined"
      ? `${window.location.origin}/dashboard`
      : "/dashboard");

  async function handleSocial(provider: "google" | "github") {
    setError(null);
    setPending(provider);
    const result = await signIn.social({ provider, callbackURL: resolvedCallback });
    // On success the browser redirects to the provider; only errors return here.
    if (result?.error) {
      setError(result.error.message ?? "Couldn't start sign-in. Try again.");
      setPending(null);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending("magic");
    const result = await signIn.magicLink({ email, callbackURL: resolvedCallback });
    setPending(null);
    if (result.error) {
      setError(result.error.message ?? "Couldn't send the link. Try again.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex flex-col gap-3">
      {sent ? (
        <div className="py-2 text-center">
          <p className="text-text-primary">Check your inbox</p>
          <p className="mt-1.5 text-[0.857rem] text-text-secondary">
            We sent a sign-in link to{" "}
            <span className="text-text-primary">{email}</span>. Open it on this
            device to continue.
          </p>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setError(null);
            }}
            className="mt-4 text-[0.857rem] text-accent hover:text-accent-hover"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => handleSocial("google")}
            disabled={pending !== null}
            className={socialButton}
          >
            {pending === "google" ? <Spinner /> : <GoogleIcon />}
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => handleSocial("github")}
            disabled={pending !== null}
            className={socialButton}
          >
            {pending === "github" ? <Spinner /> : <GithubIcon />}
            Continue with GitHub
          </button>

          <div className="my-1 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[0.786rem] text-text-tertiary">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
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
              disabled={pending !== null || !email.trim()}
              className={cx("h-10")}
            >
              {pending === "magic" ? (
                <Spinner className="text-background" />
              ) : (
                "Email me a sign-in link"
              )}
            </Button>
          </form>
        </>
      )}

      {error && <p className="text-[0.857rem] text-danger">{error}</p>}
    </div>
  );
}
