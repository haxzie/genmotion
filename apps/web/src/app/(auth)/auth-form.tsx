"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";
import { Button, Input, Spinner } from "@/components/ui";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result =
      mode === "signup"
        ? await signUp.email({ email, password, name })
        : await signIn.email({ email, password });
    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "Something went wrong");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl">GenMotion</h1>
          <p className="mt-2 text-text-secondary">
            {mode === "login"
              ? "Welcome back. Sign in to continue."
              : "Create an account to start making videos."}
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 rounded-md border border-border bg-surface p-6"
        >
          {mode === "signup" && (
            <Input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus={mode === "login"}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          {error && <p className="text-[0.857rem] text-danger">{error}</p>}
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? (
              <Spinner className="text-white" />
            ) : mode === "login" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </Button>
        </form>
        <p className="mt-4 text-center text-text-secondary">
          {mode === "login" ? (
            <>
              No account?{" "}
              <Link href="/signup" className="text-accent hover:text-accent-hover">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-accent hover:text-accent-hover">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
