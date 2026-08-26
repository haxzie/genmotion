"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SEAT_PRICE_USD, TRIAL_DAYS } from "@genmotion/shared";
import { api } from "@/lib/api";
import { DownloadButton } from "@/components/marketing/download-button";
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
  const { data } = useQuery({
    queryKey: limitsQueryKey,
    queryFn: () => api<LimitsResponse>("/api/billing/limits"),
    staleTime: 30_000,
  });

  const trial = data?.trial;
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

      <div className="mt-4 rounded-xl border border-border bg-surface-raised p-6">
        <h2 className="font-medium text-text-primary">Plan</h2>
        {/* Absent while loading rather than guessed at — a wrong trial count
            reads worse than no trial count. */}
        {data ? (
          <p className="mt-1.5 text-[0.9rem] text-text-secondary">
            {paid ? (
              <>
                {data.plan.name} · {data.seats.used} of {data.seats.max}{" "}
                {data.seats.max === 1 ? "seat" : "seats"} in use, at $
                {SEAT_PRICE_USD} each a month.
              </>
            ) : trial?.active ? (
              <>
                You&apos;re on the {TRIAL_DAYS}-day trial —{" "}
                <span className="text-text-primary">
                  {trial.daysLeft} {trial.daysLeft === 1 ? "day" : "days"} left
                </span>
                . Everything is included; no card needed until it ends.
              </>
            ) : (
              <>
                Your trial has ended. Upgrade to keep exporting — $
                {SEAT_PRICE_USD} a month.
              </>
            )}
          </p>
        ) : (
          <p className="mt-1.5 text-[0.9rem] text-text-tertiary">Loading…</p>
        )}
        <div className="mt-4 flex gap-3 text-[0.9rem]">
          <Link href="/settings/billing" className="text-accent hover:underline">
            Billing
          </Link>
          <Link href="/settings/members" className="text-accent hover:underline">
            Members
          </Link>
        </div>
      </div>
    </div>
  );
}
