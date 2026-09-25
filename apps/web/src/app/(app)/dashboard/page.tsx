"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FREE_EXPORTS_PER_MONTH, SEAT_PRICE_USD, planPrice, type PlanId } from "@genmotion/shared";
import { api } from "@/lib/api";
import { DownloadButton } from "@/components/marketing/download-button";
import { GenerationAndSeats } from "@/components/generation-and-seats";
import { limitsQueryKey, type LimitsResponse } from "@/components/upgrade-modal";

/**
 * The signed-in landing page.
 *
 * This used to be the project grid. Making a video happens in the desktop app
 * now, so what a signed-in visitor needs from the web is the app itself and the
 * state of their account.
 *
 * The route survives its own emptying on purpose: OAuth `callbackURL`, the
 * proxy redirect, onboarding's `?next` default and accept-invitation all send
 * people here, and every one of those would need rewiring to point elsewhere —
 * along with every bookmark already pointing at it.
 */
export default function AccountHomePage() {
  const { data, error } = useQuery({
    queryKey: limitsQueryKey,
    queryFn: () => api<LimitsResponse>("/api/billing/limits"),
    staleTime: 30_000,
  });

  const exportMeter = data?.exports;
  const paid = data?.subscription.paid ?? false;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl tracking-tight">Your account</h1>
      <p className="mt-2 text-text-secondary">
        GenMotion runs on your Mac. Projects are folders on your machine, and
        rendering never leaves it.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-surface-raised p-6">
        <h2 className="font-medium text-text-primary">Get the app</h2>
        <p className="mt-1.5 text-[0.9rem] text-text-secondary">
          Sign in with this account and your plan and teammates come with you.
        </p>
        <div className="mt-4">
          <DownloadButton />
        </div>
      </div>

      <div className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-border bg-surface-raised p-6">
        <div className="min-w-0">
        <h2 className="font-medium text-text-primary">Plan</h2>
        {/* Absent while loading rather than guessed at — a wrong export count
            reads worse than no export count. */}
        {data ? (
          <p className="mt-1.5 text-[0.9rem] text-text-secondary">
            {paid ? (
              <>
                {data.plan.name} · {data.seats.used} of {data.seats.max}{" "}
                {data.seats.max === 1 ? "seat" : "seats"} in use · {planPrice(data.plan.id)} a month.
              </>
            ) : exportMeter?.limit != null ? (
              <>
                You&apos;re on {data.plan.name} —{" "}
                <span className="text-text-primary">
                  {exportMeter.remaining} of {exportMeter.limit} export
                  {exportMeter.limit === 1 ? "" : "s"} left
                </span>{" "}
                this month. Unlimited exports are ${SEAT_PRICE_USD} a month.
              </>
            ) : (
              <>
                You&apos;re on {data.plan.name} — {FREE_EXPORTS_PER_MONTH}{" "}
                exports a month. Upgrade for unlimited exports, $
                {SEAT_PRICE_USD} a month.
              </>
            )}
          </p>
        ) : error ? (
          // Said plainly rather than left on "Loading…" for good: the one
          // thing worse than a plan card that fails is one that looks stuck.
          <p className="mt-1.5 text-[0.9rem] text-danger">
            Couldn&apos;t load your plan — {error.message || "try again in a moment."}
          </p>
        ) : (
          <p className="mt-1.5 text-[0.9rem] text-text-tertiary">Loading…</p>
        )}
        </div>
        <Link
          href="/settings/billing"
          className="inline-flex h-9 shrink-0 items-center rounded-md border border-border bg-surface px-3 text-[0.9rem] font-medium text-text-primary transition-colors hover:bg-surface-hover"
        >
          Manage
        </Link>
      </div>

      {/* What the plan gives, and how much of it is used: the month's
          generation and the seats. Only once the plan is known. Free has no
          generation meters — its allowance is zero — so instead of the section
          silently missing, which reads as "usage didn't load", it says where
          the meters come from. */}
      {data && paid && (
        <GenerationAndSeats plan={data.plan} seats={data.seats} team={data.team} />
      )}
      {data && !paid && (
        <>
          <h2 className="mb-3 mt-10 text-[0.95rem] font-medium text-text-secondary">Generation</h2>
          <div className="rounded-xl border border-dashed border-border px-5 py-4 text-[0.857rem] text-text-tertiary">
            Voiceover, sound effects and image generation come with Pro and Max. Once you
            upgrade, this month&apos;s meters show here.
          </div>
        </>
      )}
    </div>
  );
}
