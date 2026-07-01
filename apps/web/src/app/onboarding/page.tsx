"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, updateUser, organization } from "@/lib/auth-client";
import { Button, Input, Spinner, cx } from "@/components/ui";

const ROLES = [
  "Founder / CEO",
  "Marketing",
  "Engineering",
  "Design",
  "Product",
  "Other",
];

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "team"
  );
}

function teamNameFrom(name: string): string {
  const n = name.trim();
  if (!n) return "";
  return /s$/i.test(n) ? `${n}' Team` : `${n}'s Team`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spinLogo, setSpinLogo] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (session.user.onboardingCompleted) {
      router.replace("/dashboard");
      return;
    }
    if (!prefilled) {
      const existing = session.user.name?.trim() ?? "";
      setName(existing);
      setOrgName(teamNameFrom(existing));
      setPrefilled(true);
    }
  }, [session, isPending, router, prefilled]);

  async function finish() {
    setSubmitting(true);
    setError(null);
    try {
      const targetName = orgName.trim() || teamNameFrom(name) || "My Team";

      // Rename the auto-created default org, or create one if none exists yet
      // (e.g. an account that predates orgs).
      const list = await organization.list();
      const orgs = list.data ?? [];
      if (orgs.length > 0) {
        await organization.update({
          organizationId: orgs[0]!.id,
          data: { name: targetName },
        });
        await organization.setActive({ organizationId: orgs[0]!.id });
      } else {
        const created = await organization.create({
          name: targetName,
          slug: `${slugify(targetName)}-${crypto.randomUUID().slice(0, 8)}`,
        });
        if (created.data) {
          await organization.setActive({ organizationId: created.data.id });
        }
      }

      await updateUser({
        name: name.trim() || session!.user.email,
        jobRole: role ?? undefined,
        onboardingCompleted: true,
      });

      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
      setSubmitting(false);
    }
  }

  if (isPending || !session || session.user.onboardingCompleted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0c] px-4">
      {/* Animated brand gradient behind the card */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="size-[130vh] rounded-full opacity-40 blur-[100px] animate-[spin-once_24s_linear_infinite]"
            style={{
              background:
                "conic-gradient(from 90deg, #C6F91E, #16F5BD, #3b6ef6, #FFD60A, #C6F91E)",
            }}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/60 to-[#0a0a0c]/30" />
      </div>

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface/90 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <Link href="/" className="group mb-8 inline-flex" aria-label="GenMotion home">
          <span className="flex size-12 items-center justify-center rounded-[28%] border border-border bg-surface-raised shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="GenMotion"
              onAnimationEnd={() => setSpinLogo(false)}
              className={cx(
                "size-7 rounded-[6px]",
                spinLogo
                  ? "animate-[spin-once_0.6s_ease-in-out]"
                  : "group-hover:animate-[spin-once_0.6s_ease-in-out]",
              )}
            />
          </span>
        </Link>

        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-1.5">
          {[1, 2].map((n) => (
            <span
              key={n}
              className={cx(
                "h-1 flex-1 rounded-full transition-colors duration-200",
                n <= step ? "bg-cta" : "bg-surface-raised",
              )}
            />
          ))}
        </div>

        {step === 1 ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) {
                setSpinLogo(true);
                setStep(2);
              }
            }}
          >
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              What should we call you?
            </h1>
            <p className="mt-2 text-text-secondary">
              This is how you&apos;ll appear across GenMotion.
            </p>
            <div className="mt-6">
              <Input
                autoFocus
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={!name.trim()}
              className="mt-4 h-11 w-full"
            >
              Continue
            </Button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!submitting) finish();
            }}
          >
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Set up your workspace
            </h1>
            <p className="mt-2 text-text-secondary">
              Name your team and tell us what you do.
            </p>

            <div className="mt-6">
              <label className="mb-1.5 block text-[0.857rem] text-text-secondary">
                Organization name
              </label>
              <Input
                autoFocus
                placeholder="Acme Inc."
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="mt-5">
              <label className="mb-1.5 block text-[0.857rem] text-text-secondary">
                What&apos;s your role?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cx(
                      "h-10 rounded-md border px-3 text-[0.95rem] transition-colors duration-150",
                      role === r
                        ? "border-border-strong bg-surface-raised text-text-primary"
                        : "border-border text-text-secondary hover:border-border-strong hover:text-text-primary",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="mt-4 text-[0.857rem] text-danger">{error}</p>}

            <div className="mt-6 flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(1)}
                disabled={submitting}
                className="h-11"
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting || !orgName.trim()}
                className="h-11 flex-1"
              >
                {submitting ? (
                  <Spinner className="text-background" />
                ) : (
                  "Enter GenMotion"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
