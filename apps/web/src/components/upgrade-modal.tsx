"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PAYWALL_STATUS,
  PLANS,
  SEAT_PRICE_USD,
  TRIAL_DAYS,
  isPaywallBody,
  type PlanId,
  type UpgradeReason,
} from "@genmotion/shared";
import { ApiError, api } from "@/lib/api";
import { track } from "@/lib/analytics";
import { startCheckout, type PurchasablePlan } from "@/lib/billing";
import { Modal } from "@/components/modal";
import { Spinner } from "@/components/ui";

const COPY: Record<UpgradeReason, { title: string; body: string }> = {
  trial: {
    title: "Your free trial has ended",
    body: `The ${TRIAL_DAYS}-day trial covered the whole studio. Upgrade to ${PLANS.pro.name} for $${SEAT_PRICE_USD} a month to keep exporting — unlimited projects, no watermark.`,
  },
  seats: {
    title: "That needs another seat",
    body: `Your plan covers the people already in it. Adding a teammate costs $${SEAT_PRICE_USD} a month, charged from today.`,
  },
  plugin: {
    title: `Chat plugins are part of ${PLANS.pro.name}`,
    body: `Voiceover and image generation run on providers we pay for per use, so unlike the rest of the app they aren't part of the trial. Upgrade for $${SEAT_PRICE_USD} a month to use them.`,
  },
};

export const limitsQueryKey = ["billing-limits"] as const;

export interface PlanPayload {
  id: PlanId;
  name: string;
  seats: number;
  canInvite: boolean;
  prioritySupport: boolean;
}

export interface TrialPayload {
  active: boolean;
  daysLeft: number;
  endsAt: string | null;
}

export interface LimitsResponse {
  plan: PlanPayload;
  seats: { used: number; max: number };
  trial: TrialPayload;
  /** Whether the org may do paid-tier work right now: paying, or still in trial. */
  entitled: boolean;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    manageable: boolean;
    paid: boolean;
  };
}

interface UpgradeContextValue {
  /** Open the upgrade modal for the trial or seat gate. */
  openUpgrade: (reason: UpgradeReason) => void;
  /**
   * Show the modal if `err` is a paywall rejection from our own API. Returns
   * true when handled, so callers can skip their own error toast.
   */
  handleLimitError: (err: unknown) => boolean;
  /**
   * The same, for errors from the auth client — which returns `{error}` rather
   * than throwing an ApiError, so `handleLimitError` can't see invite refusals.
   */
  handleAuthClientError: (err: unknown) => boolean;
  plan?: PlanPayload;
  seats?: LimitsResponse["seats"];
  trial?: TrialPayload;
  subscription?: LimitsResponse["subscription"];
  /** Whether the org may invite at all — false while loading. */
  canInvite: boolean;
}

const UpgradeContext = createContext<UpgradeContextValue | null>(null);

export function UpgradeProvider({ children }: { children: ReactNode }) {
  const [reason, setReason] = useState<UpgradeReason | null>(null);
  const queryClient = useQueryClient();

  // Kept fresh so the client can warn before an action rather than after the
  // server rejects it. The server remains the authority either way.
  const { data } = useQuery({
    queryKey: limitsQueryKey,
    queryFn: () => api<LimitsResponse>("/api/billing/limits"),
    staleTime: 30_000,
  });

  const openUpgrade = useCallback(
    (next: UpgradeReason) => {
      track("upgrade_modal_shown", { limit: next });
      setReason(next);
      // The count that triggered this is now known-stale.
      queryClient.invalidateQueries({ queryKey: limitsQueryKey });
    },
    [queryClient],
  );

  const handleLimitError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === PAYWALL_STATUS) {
        if (isPaywallBody(err.body)) {
          openUpgrade(err.body.paywall.reason);
          return true;
        }
      }
      return false;
    },
    [openUpgrade],
  );

  const handleAuthClientError = useCallback(
    (err: unknown) => {
      const code = (err as { code?: string } | null)?.code;
      if (code === "PLAN_REQUIRES_PRO") {
        openUpgrade("seats");
        return true;
      }
      if (code === "SEAT_LIMIT_REACHED") {
        openUpgrade("seats");
        return true;
      }
      return false;
    },
    [openUpgrade],
  );

  const value = useMemo(
    () => ({
      openUpgrade,
      handleLimitError,
      handleAuthClientError,
      plan: data?.plan,
      seats: data?.seats,
      trial: data?.trial,
      subscription: data?.subscription,
      canInvite: data?.plan.canInvite ?? false,
    }),
    [openUpgrade, handleLimitError, handleAuthClientError, data],
  );

  return (
    <UpgradeContext.Provider value={value}>
      {children}
      <UpgradeModal reason={reason} onClose={() => setReason(null)} />
    </UpgradeContext.Provider>
  );
}

export function useUpgrade(): UpgradeContextValue {
  const ctx = useContext(UpgradeContext);
  if (!ctx) {
    throw new Error("useUpgrade must be used inside <UpgradeProvider>");
  }
  return ctx;
}

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4 shrink-0 text-success"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function PlanCard({
  plan,
  reason,
  featured,
  busy,
  onChoose,
}: {
  plan: PurchasablePlan;
  reason: UpgradeReason;
  featured: boolean;
  busy: PurchasablePlan | null;
  onChoose: (plan: PurchasablePlan) => void;
}) {
  const def = PLANS[plan];
  return (
    <div
      className={
        featured
          ? "rounded-xl border border-accent/40 bg-accent-muted/40 p-4"
          : "rounded-xl border border-border bg-surface-raised p-4"
      }
    >
      <p className="font-display text-base font-semibold tracking-tight">
        {def.name}
      </p>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        {def.features.map((f) => (
          <li
            key={f}
            className="flex items-center gap-2 text-[0.857rem] text-text-secondary"
          >
            <CheckIcon />
            {f}
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => onChoose(plan)}
        className={
          "mt-4 inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-md border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 " +
          (featured
            ? "border-transparent bg-cta text-background hover:bg-cta-hover"
            : "border-border bg-surface text-text-primary hover:bg-surface-hover")
        }
      >
        {busy === plan ? <Spinner /> : `Upgrade to ${def.name}`}
      </button>
      <p className="sr-only">{reason}</p>
    </div>
  );
}

function UpgradeModal({
  reason,
  onClose,
}: {
  reason: UpgradeReason | null;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<PurchasablePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const copy = reason ? COPY[reason] : null;

  async function choose(plan: PurchasablePlan) {
    if (!reason) return;
    setBusy(plan);
    setError(null);
    try {
      // Navigates away on success, so there's no success state to render.
      await startCheckout(plan, reason);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't start checkout.",
      );
      setBusy(null);
    }
  }

  return (
    <Modal
      open={!!reason}
      onClose={busy ? () => {} : onClose}
      labelledBy="upgrade-title"
    >
      {copy && reason && (
        <div className="p-6">
          <span className="inline-flex items-center rounded-full bg-accent-muted px-2.5 py-1 text-[0.786rem] font-medium text-accent">
            Free plan
          </span>
          <h2
            id="upgrade-title"
            className="mt-3 font-display text-lg font-semibold tracking-tight"
          >
            {copy.title}
          </h2>
          <p className="mt-1.5 text-[0.9rem] text-text-secondary">{copy.body}</p>

          <div className="mt-5">
            <PlanCard
              plan="pro"
              reason={reason}
              featured
              busy={busy}
              onChoose={choose}
            />
          </div>

          {error && <p className="mt-3 text-[0.857rem] text-danger">{error}</p>}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={busy !== null}
              className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-3 text-[0.9rem] text-text-secondary transition-colors hover:text-text-primary disabled:opacity-60"
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
