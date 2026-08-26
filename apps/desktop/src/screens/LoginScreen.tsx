import { DesktopAuthOptions } from "../components/desktop-auth-options";
import type { AuthState } from "../../electron/shared";

/**
 * The gate on launch.
 *
 * The web app's login page beside a testimonial panel; there is no marketing
 * to do inside an app the user has already installed, so only the left column
 * survives and it sits centred instead.
 */
export function LoginScreen({ state }: { state: AuthState }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <span className="mb-6 inline-flex">
          <span className="flex size-12 items-center justify-center rounded-[28%] border border-border bg-surface-raised shadow-sm">
            <img src="/logo.svg" alt="" className="size-7 rounded-[6px]" />
          </span>
        </span>

        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Welcome to GenMotion
          </h1>
          <p className="mt-2 text-text-secondary">Sign in or create an account</p>
        </div>

        <DesktopAuthOptions state={state} />

        <p className="mt-4 text-center text-[0.786rem] text-text-tertiary">
          We'll create your account automatically on first sign-in.
        </p>
      </div>
    </main>
  );
}
