"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatUserCode, DESKTOP_AUTH_DONE_URL } from "@genmotion/shared";
import { signIn, useSession } from "@/lib/auth-client";
import { api, ApiError } from "@/lib/api";
import { AuthOptions } from "@/components/auth-options";
import { Button, Input, Spinner } from "@/components/ui";

/**
 * Where a desktop sign-in is approved.
 *
 * The desktop app cannot receive a redirect, so it opens this page with the
 * user code it is polling on, the browser does the actual sign-in, and the
 * approval here is what releases the token back to the app. Reached only from
 * the app — never linked from the site.
 *
 * The provider hint in the URL is what makes the desktop buttons feel like
 * buttons: clicking "Continue with Google" over there should not mean picking
 * Google again over here.
 */

type Phase = "checking" | "confirm" | "approving" | "approved" | "denied" | "error";

/** The plugin returns RFC 8628 error codes; these are the ones a human can hit. */
const CODE_ERRORS: Record<string, string> = {
  invalid_request: "That code isn't valid. Check the code shown in the app.",
  expired_token: "That code has expired. Start again from the desktop app.",
  access_denied: "That request was already declined.",
};

function messageFor(err: unknown): string {
  const body =
    err instanceof ApiError
      ? (err.body as { error?: string; error_description?: string } | undefined)
      : undefined;
  const code = body?.error;
  if (code && CODE_ERRORS[code]) return CODE_ERRORS[code]!;
  if (body?.error_description) return body.error_description;
  return err instanceof Error ? err.message : "Something went wrong. Try again.";
}

/** A centered card — every state on this page is one. */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="group mb-6 inline-flex" aria-label="GenMotion home">
          <span className="flex size-12 items-center justify-center rounded-[28%] border border-border bg-surface-raised shadow-sm">
            <img
              src="/logo.svg"
              alt=""
              className="size-7 rounded-[6px] group-hover:animate-[spin-once_0.6s_ease-in-out]"
            />
          </span>
        </Link>
        {children}
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center">{children}</main>
  );
}

/** The code, spaced out so it can be compared against the app at a glance. */
function CodeBadge({ code }: { code: string }) {
  return (
    <p className="mt-5 rounded-md border border-border bg-surface-raised py-3 text-center font-mono text-xl tracking-[0.3em] text-text-primary">
      {formatUserCode(code)}
    </p>
  );
}

export default function DevicePage() {
  // useSearchParams opts the route out of prerendering unless it sits behind a
  // Suspense boundary.
  return (
    <Suspense
      fallback={
        <Centered>
          <Spinner />
        </Centered>
      }
    >
      <DeviceFlow />
    </Suspense>
  );
}

function DeviceFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, isPending } = useSession();

  const userCode = params.get("user_code") ?? "";
  const provider = params.get("provider");
  const hintedEmail = params.get("email") ?? "";

  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  /**
   * Where the sign-in round-trip comes back to. The provider hint is dropped:
   * it has already been acted on, and leaving it in would restart the redirect
   * the moment we land back here.
   */
  const selfUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/device${userCode ? `?user_code=${encodeURIComponent(userCode)}` : ""}`;

  // Honour the button the user pressed in the desktop app rather than making
  // them choose a provider twice. Guarded by a ref because the redirect is
  // asynchronous and this effect can run again before the page unloads.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (isPending || session || autoStarted.current || !provider) return;
    if (provider !== "google" && provider !== "github" && provider !== "magic") return;
    if (provider === "magic" && !hintedEmail) return;
    autoStarted.current = true;
    void (provider === "magic"
      ? signIn.magicLink({ email: hintedEmail, callbackURL: selfUrl })
      : signIn.social({ provider, callbackURL: selfUrl }));
  }, [isPending, session, provider, hintedEmail, selfUrl]);

  // A first-time user who signed up from the desktop app has never seen
  // onboarding; this route sits outside (app), so nothing else would send them.
  useEffect(() => {
    if (!session || session.user.onboardingCompleted) return;
    router.replace(`/onboarding?next=${encodeURIComponent(`/device?user_code=${userCode}`)}`);
  }, [session, router, userCode]);

  /**
   * Bind the code to this user. Until this runs the row has no `userId` and
   * cannot be approved, so it is the real first step, not a status probe.
   */
  const claim = useCallback(async (code: string) => {
    setError(null);
    setPhase("checking");
    try {
      const res = await api<{ status: string }>(
        `/api/auth/device?user_code=${encodeURIComponent(code)}`,
      );
      if (res.status === "approved") setPhase("approved");
      else if (res.status === "denied") setPhase("denied");
      else setPhase("confirm");
    } catch (err) {
      setError(messageFor(err));
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    if (!session || !session.user.onboardingCompleted || !userCode) return;
    void claim(userCode);
  }, [session, userCode, claim]);

  /**
   * Plain fetches rather than better-auth's generated client. `/device` is both
   * a GET endpoint and the prefix of `/device/approve`, and the client's proxy
   * cannot represent both — `device.approve()` resolves to the wrong path.
   */
  async function approve() {
    setPhase("approving");
    setError(null);
    try {
      await api("/api/auth/device/approve", { json: { userCode } });
    } catch (err) {
      setError(messageFor(err));
      setPhase("error");
      return;
    }
    setPhase("approved");
    // Best effort: brings the app to the front if the scheme is registered. The
    // app is polling regardless, so nothing depends on this working.
    window.location.href = DESKTOP_AUTH_DONE_URL;
  }

  async function deny() {
    setError(null);
    // A failure here is not worth a card: the code is not approved either way,
    // and it expires on its own.
    await api("/api/auth/device/deny", { json: { userCode } }).catch(() => null);
    setPhase("denied");
  }

  if (isPending) {
    return (
      <Centered>
        <Spinner />
      </Centered>
    );
  }

  // ── Not signed in yet ────────────────────────────────────────────────────
  if (!session) {
    if (provider === "google" || provider === "github") {
      return (
        <Card>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Taking you to {provider === "google" ? "Google" : "GitHub"}…
          </h1>
          <p className="mt-2 text-text-secondary">
            Finish signing in and you'll come straight back here.
          </p>
          <div className="mt-6">
            <Spinner />
          </div>
        </Card>
      );
    }
    if (provider === "magic" && hintedEmail) {
      return (
        <Card>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Check your inbox
          </h1>
          <p className="mt-2 text-text-secondary">
            We sent a sign-in link to{" "}
            <span className="text-text-primary">{hintedEmail}</span>. Open it on
            this device to connect the desktop app.
          </p>
          {userCode && <CodeBadge code={userCode} />}
        </Card>
      );
    }
    return (
      <Card>
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Sign in to connect
          </h1>
          <p className="mt-2 text-text-secondary">
            GenMotion for desktop is waiting for you to sign in.
          </p>
        </div>
        <AuthOptions callbackURL={selfUrl} />
      </Card>
    );
  }

  // ── Signed in, but the app never passed a code ───────────────────────────
  if (!userCode) {
    return (
      <Card>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Enter the code
        </h1>
        <p className="mt-2 text-text-secondary">
          Type the code shown in the GenMotion desktop app.
        </p>
        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const clean = manualCode.replace(/-/g, "").trim();
            if (clean) router.replace(`/device?user_code=${encodeURIComponent(clean)}`);
          }}
        >
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            placeholder="ABCD-1234"
            autoFocus
            className="h-10 text-center font-mono tracking-[0.3em]"
          />
          <Button type="submit" variant="primary" disabled={!manualCode.trim()} className="h-10">
            Continue
          </Button>
        </form>
      </Card>
    );
  }

  // ── Signed in, with a code ───────────────────────────────────────────────
  if (phase === "approved") {
    return (
      <Card>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          You're all set
        </h1>
        <p className="mt-2 text-text-secondary">
          GenMotion for desktop is signed in as{" "}
          <span className="text-text-primary">{session.user.email}</span>. You
          can close this tab.
        </p>
        <a
          href={DESKTOP_AUTH_DONE_URL}
          className="mt-5 inline-block text-[0.857rem] text-accent hover:text-green"
        >
          Open GenMotion
        </a>
      </Card>
    );
  }

  if (phase === "denied") {
    return (
      <Card>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Request declined
        </h1>
        <p className="mt-2 text-text-secondary">
          The desktop app was not signed in. You can close this tab.
        </p>
      </Card>
    );
  }

  if (phase === "error") {
    return (
      <Card>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Can't connect
        </h1>
        <p className="mt-2 text-text-secondary">{error}</p>
        <Button
          variant="secondary"
          onClick={() => router.replace("/device")}
          className="mt-5 h-10 w-full"
        >
          Enter a different code
        </Button>
      </Card>
    );
  }

  if (phase === "checking") {
    return (
      <Centered>
        <Spinner />
      </Centered>
    );
  }

  return (
    <Card>
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Connect the desktop app
      </h1>
      <p className="mt-2 text-text-secondary">
        Sign GenMotion for desktop in as{" "}
        <span className="text-text-primary">{session.user.email}</span>?
      </p>

      <CodeBadge code={userCode} />
      <p className="mt-2 text-center text-[0.786rem] text-text-tertiary">
        Only continue if this matches the code in the app.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <Button
          variant="primary"
          onClick={approve}
          disabled={phase === "approving"}
          className="h-10"
        >
          {phase === "approving" ? <Spinner className="text-background" /> : "Approve"}
        </Button>
        <Button variant="secondary" onClick={deny} disabled={phase === "approving"} className="h-10">
          Cancel
        </Button>
      </div>

      {error && <p className="mt-3 text-[0.857rem] text-danger">{error}</p>}
    </Card>
  );
}
