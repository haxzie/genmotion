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
  FREE_LIMITS,
  LIMIT_STATUS,
  PLANS,
  isLimitExceededBody,
  type LimitKind,
  type LimitSnapshot,
  type PlanId,
  type UpgradeReason,
} from "@genmotion/shared";
import { ApiError, api } from "@/lib/api";
import { track } from "@/lib/analytics";
import { startCheckout, type PurchasablePlan } from "@/lib/billing";
import { Modal } from "@/components/modal";
import { Spinner } from "@/components/ui";

const COPY: Record<UpgradeReason, { title: string; body: string }> = {
  projects: {
    title: `You've used all ${FREE_LIMITS.projects} free projects`,
    body: `The Free plan includes ${FREE_LIMITS.projects} projects. Upgrade for unlimited projects, or delete one to free a slot.`,
  },
  exports: {
    title: `You've used your ${FREE_LIMITS.exports} free exports`,
    body: `The Free plan includes ${FREE_LIMITS.exports} exports a month. Upgrade for unlimited exports at 1080p and 4K, with no watermark.`,
  },
  aiTurns: {
    title: `You've used your ${FREE_LIMITS.aiTurns} free AI messages`,
    body: `The Free plan includes ${FREE_LIMITS.aiTurns} AI messages a month. Upgrade to keep building with the agent.`,
  },
  invite: {
    title: "Inviting teammates is part of Team",
    body: `Team includes ${PLANS.team.seats} seats so you can bring your collaborators into the same projects.`,
  },
  seats: {
    title: "Every seat is in use",
    body: `Your plan includes ${PLANS.team.seats} seats and all of them are taken. Remove a member or cancel a pending invitation to free one up.`,
  },
};

/** Pro can't invite, so offering it for a seat problem would be a trap. */
const TEAM_ONLY: ReadonlySet<UpgradeReason> = new Set(["invite", "seats"]);

export const limitsQueryKey = ["billing-limits"] as const;

export interface PlanPayload {
  id: PlanId;
  name: string;
  seats: number;
  canInvite: boolean;
  prioritySupport: boolean;
}

export interface LimitsResponse {
  plan: PlanPayload;
  limits: LimitSnapshot;
  seats: { used: number; max: number };
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    manageable: boolean;
    paid: boolean;
  };
}

interface UpgradeContextValue {
  /** Open the upgrade modal for a quota, or for the invite/seat gates. */
  openUpgrade: (reason: UpgradeReason) => void;
  /**
   * Show the modal if `err` is a quota rejection from our own API. Returns true
   * when handled, so callers can skip their own error toast.
   */
  handleLimitError: (err: unknown) => boolean;
  /**
   * The same, for errors from the auth client — which returns `{error}` rather
   * than throwing an ApiError, so `handleLimitError` can't see invite refusals.
   */
  handleAuthClientError: (err: unknown) => boolean;
  limits?: LimitSnapshot;
  plan?: PlanPayload;
  seats?: LimitsResponse["seats"];
  subscription?: LimitsResponse["subscription"];
  /** Whether the org may invite at all — false while loading. */
  canInvite: boolean;
  /** True when this quota has no room left. Falsy while limits are loading. */
  isExhausted: (kind: LimitKind) => boolean;
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
      if (err instanceof ApiError && err.status === LIMIT_STATUS) {
        if (isLimitExceededBody(err.body)) {
          openUpgrade(err.body.limit.kind);
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
      if (code === "PLAN_REQUIRES_TEAM") {
        openUpgrade("invite");
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

  const limits = data?.limits;

  // An unlimited quota is never exhausted, so every client-side pre-gate stops
  // firing the moment an org upgrades — no per-call-site plan checks needed.
  const isExhausted = useCallback(
    (k: LimitKind) => {
      const l = limits?.[k];
      if (!l || l.unlimited) return false;
      return (l.remaining ?? 0) <= 0;
    },
    [limits],
  );

  const value = useMemo(
    () => ({
      openUpgrade,
      handleLimitError,
      handleAuthClientError,
      limits,
      plan: data?.plan,
      seats: data?.seats,
      subscription: data?.subscription,
      canInvite: data?.plan.canInvite ?? false,
      isExhausted,
    }),
    [openUpgrade, handleLimitError, handleAuthClientError, limits, data, isExhausted],
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
  const teamOnly = reason ? TEAM_ONLY.has(reason) : false;

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

          <div
            className={
              teamOnly ? "mt-5" : "mt-5 grid gap-3 sm:grid-cols-2"
            }
          >
            {!teamOnly && (
              <PlanCard
                plan="pro"
                reason={reason}
                featured
                busy={busy}
                onChoose={choose}
              />
            )}
            <PlanCard
              plan="team"
              reason={reason}
              featured={teamOnly}
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
