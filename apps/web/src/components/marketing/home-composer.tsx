"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { HeroComposer } from "@/components/composer";
import { AuthOptions } from "@/components/auth-options";
import { Modal } from "@/components/modal";
import { writePendingCreate } from "@/lib/pending-create";

/**
 * The marketing-home composer. Captures the prompt and stashes it so it survives
 * the auth round-trip. Signed-in users go straight to the dashboard (which
 * creates the project and auto-sends the prompt); everyone else gets a sign-in
 * modal and lands in the same place after authenticating.
 */
export function HomeComposer() {
  const router = useRouter();
  const { data: session } = useSession();
  const [redirecting, setRedirecting] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <HeroComposer
        pending={redirecting}
        onSubmit={(prompt, dims) => {
          writePendingCreate({ prompt, ...dims });
          if (session) {
            setRedirecting(true);
            router.push("/dashboard");
          } else {
            setAuthOpen(true);
          }
        }}
      />

      <Modal open={authOpen} onClose={() => setAuthOpen(false)} labelledBy="home-auth-title">
        <div className="p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="GenMotion" className="mb-5 size-9 rounded-[6px]" />
          <div className="mb-6">
            <h2
              id="home-auth-title"
              className="font-display text-xl font-semibold tracking-tight"
            >
              Sign in to start creating
            </h2>
            <p className="mt-1.5 text-[0.9rem] text-text-secondary">
              We&apos;ll pick up right where you left off with your prompt.
            </p>
          </div>
          <AuthOptions />
          <p className="mt-4 text-center text-[0.786rem] text-text-tertiary">
            We&apos;ll create your account automatically on first sign-in.
          </p>
        </div>
      </Modal>
    </>
  );
}
