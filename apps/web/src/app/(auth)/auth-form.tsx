import Link from "next/link";
import { AuthOptions } from "@/components/auth-options";

export function AuthForm() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Left — the sign-in inputs */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Brand, top-left of the form column */}
          <Link href="/" className="group mb-6 inline-flex" aria-label="GenMotion home">
            <span className="flex size-12 items-center justify-center rounded-[28%] border border-border bg-surface-raised shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="GenMotion"
                className="size-7 rounded-[6px] group-hover:animate-[spin-once_0.6s_ease-in-out]"
              />
            </span>
          </Link>

          <div className="mb-8">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Welcome to GenMotion
            </h1>
            <p className="mt-2 text-text-secondary">Sign in or create an account</p>
          </div>

          <AuthOptions />

          <p className="mt-4 text-center text-[0.786rem] text-text-tertiary">
            We&apos;ll create your account automatically on first sign-in.
          </p>
        </div>
      </div>

      {/* Right — animated gradient fill + testimonial (desktop only) */}
      <div className="relative hidden flex-col justify-center overflow-hidden bg-[#0a0a0c] p-12 lg:flex">
        {/* Slowly rotating conic gradient, heavily blurred, in brand hues */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div
              className="size-[130vh] rounded-full opacity-60 blur-[90px] animate-[spin-once_22s_linear_infinite]"
              style={{
                background:
                  "conic-gradient(from 90deg, #C6F91E, #16F5BD, #3b6ef6, #FFD60A, #C6F91E)",
              }}
            />
          </div>
          {/* Darken toward the edges so foreground text stays readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#0a0a0c]/60" />
        </div>

        {/* Testimonial, centered block with left-aligned text */}
        <figure className="relative mx-auto max-w-md text-left">
          <blockquote className="font-display text-2xl font-medium leading-snug tracking-tight text-text-primary">
            &ldquo;GenMotion turned a one-line brief into a polished launch video
            in minutes. What used to take a week with a freelancer now takes a
            coffee break.&rdquo;
          </blockquote>
          <figcaption className="mt-6 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-surface-raised text-[0.9rem] font-medium text-text-primary ring-1 ring-border">
              MC
            </span>
            <span className="flex flex-col">
              <span className="text-[0.95rem] font-medium text-text-primary">
                Maya Chen
              </span>
              <span className="text-[0.857rem] text-text-secondary">
                Head of Marketing, Northwind
              </span>
            </span>
          </figcaption>
        </figure>
      </div>
    </main>
  );
}
