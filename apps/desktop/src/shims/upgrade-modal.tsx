import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { Modal } from "@/components/modal";
import { Button, Spinner } from "@/components/ui";
import { api as desktop } from "../api";

/**
 * The web components' upgrade contract, wired up for the desktop app.
 *
 * It used to be a stub, on the grounds that the paywall was enforced at export
 * in the main process. Chat plugins changed that: they are refused by the
 * hosted API with a 402, and the composer has to know the answer *before* the
 * user types a script, so the plan has to be readable from the renderer.
 *
 * Two things stay desktop-shaped. The plan is fetched from the loopback server
 * (`/api/billing/limits`), which proxies the hosted route with the session
 * token the main process holds — this window has no cookie of its own. And the
 * call to action is not a checkout: there is no checkout here, so the button
 * opens the billing page in the real browser.
 */

const COPY: Record<UpgradeReason, { title: string; body: string }> = {
  trial: {
    title: "Your free trial has ended",
    body: `The ${TRIAL_DAYS}-day trial covered the whole studio. Upgrade to ${PLANS.pro.name} for $${SEAT_PRICE_USD} a month to keep going.`,
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

/**
 * The export dialog offers an upgrade while the trial is still running — to
 * drop the badge, not because anything is blocked — so "your trial has ended"
 * would be a lie there.
 */
const TRIAL_STILL_ACTIVE = {
  title: "Export without the GenMotion badge",
  body: `Your trial has everything else. ${PLANS.pro.name} removes the badge from exports and keeps the studio going after the ${TRIAL_DAYS} days — $${SEAT_PRICE_USD} a month.`,
};

export const limitsQueryKey = ["billing-limits"] as const;

export interface PlanPayload {
  id: PlanId;
  name: string;
  seats: number;
  canInvite: boolean;
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
  /** Paying, or still in trial. Not enough for a plugin — see `subscription.paid`. */
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
  openUpgrade: (reason: UpgradeReason) => void;
  handleLimitError: (err: unknown) => boolean;
  handleAuthClientError: (err: unknown) => boolean;
  plan?: PlanPayload;
  seats?: LimitsResponse["seats"];
  trial?: TrialPayload;
  subscription?: LimitsResponse["subscription"];
  canInvite: boolean;
}

const UpgradeContext = createContext<UpgradeContextValue | null>(null);

/**
 * How long to keep re-reading the plan after the user has been sent to the
 * browser to pay. Checkout plus the webhook takes a minute or two; ten covers a
 * user who stops to find their card.
 */
const UPGRADE_WATCH_MS = 10 * 60_000;
const UPGRADE_WATCH_INTERVAL_MS = 5_000;

export function UpgradeProvider({ children }: { children: ReactNode }) {
  const [reason, setReason] = useState<UpgradeReason | null>(null);
  const queryClient = useQueryClient();
  // Set when the user leaves for the browser to upgrade; while it's in the
  // future the plan is polled, so the app notices the purchase without a
  // restart.
  const [watchUntil, setWatchUntil] = useState<number | null>(null);

  const { data } = useQuery({
    queryKey: limitsQueryKey,
    queryFn: () => api<LimitsResponse>("/api/billing/limits"),
    staleTime: 30_000,
    // The upgrade happens in the browser, so coming back to this window is the
    // moment the plan is most likely to have changed. The app-wide default is
    // off; this query is the exception.
    refetchOnWindowFocus: "always",
    refetchInterval: watchUntil !== null && Date.now() < watchUntil ? UPGRADE_WATCH_INTERVAL_MS : false,
    // Signed out, or the API is unreachable. Neither is worth retrying into a
    // login screen the app already handles elsewhere.
    retry: false,
  });

  // Stop watching as soon as the purchase shows up, or when the window closes.
  const paid = data?.subscription.paid ?? false;
  const wasPaid = useRef(paid);
  useEffect(() => {
    if (paid && !wasPaid.current) setWatchUntil(null);
    wasPaid.current = paid;
  }, [paid]);
  useEffect(() => {
    if (watchUntil === null) return;
    const t = setTimeout(() => setWatchUntil(null), Math.max(0, watchUntil - Date.now()));
    return () => clearTimeout(t);
  }, [watchUntil]);

  const watchForUpgrade = useCallback(() => {
    setWatchUntil(Date.now() + UPGRADE_WATCH_MS);
  }, []);

  const openUpgrade = useCallback(
    (next: UpgradeReason) => {
      setReason(next);
      // The plan may have changed in the browser since this was last read.
      void queryClient.invalidateQueries({ queryKey: limitsQueryKey });
    },
    [queryClient],
  );

  /** True when the error *was* a paywall and the modal has taken it. */
  const handleLimitError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === PAYWALL_STATUS && isPaywallBody(err.body)) {
        openUpgrade(err.body.paywall.reason);
        return true;
      }
      return false;
    },
    [openUpgrade],
  );

  // better-auth reports the seat gate as its own error code rather than a 402,
  // because it is thrown from an invitation hook, not a route.
  const handleAuthClientError = useCallback(
    (err: unknown) => {
      const code = (err as { error?: { code?: string }; code?: string } | null)?.error?.code ??
        (err as { code?: string } | null)?.code;
      if (code === "PLAN_REQUIRES_PRO" || code === "SEAT_LIMIT_REACHED") {
        openUpgrade("seats");
        return true;
      }
      return false;
    },
    [openUpgrade],
  );

  const value = useMemo<UpgradeContextValue>(
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
      <UpgradeModal
        reason={reason}
        trialActive={data?.trial.active ?? false}
        onClose={() => setReason(null)}
        onLeaveForBrowser={watchForUpgrade}
      />
    </UpgradeContext.Provider>
  );
}

export function useUpgrade(): UpgradeContextValue {
  const value = useContext(UpgradeContext);
  // Storybook-less safety: the editor components call this unconditionally, and
  // a missing provider should not take the window down.
  if (!value) {
    return {
      openUpgrade: () => {},
      handleLimitError: () => false,
      handleAuthClientError: () => false,
      canInvite: false,
    };
  }
  return value;
}

function UpgradeModal({
  reason,
  trialActive,
  onClose,
  onLeaveForBrowser,
}: {
  reason: UpgradeReason | null;
  trialActive: boolean;
  onClose: () => void;
  onLeaveForBrowser: () => void;
}) {
  const [opening, setOpening] = useState(false);
  const copy =
    reason === "trial" && trialActive ? TRIAL_STILL_ACTIVE : reason ? COPY[reason] : null;

  async function openBilling() {
    setOpening(true);
    // Billing needs the browser's session cookie, which this window does not
    // have — so the upgrade always finishes outside the app.
    await desktop.openWeb("/settings/billing").catch(() => undefined);
    onLeaveForBrowser();
    setOpening(false);
    onClose();
  }

  return (
    <Modal open={Boolean(copy)} onClose={onClose} labelledBy="upgrade-title">
      {copy && (
        <div className="w-[26rem] max-w-full p-6">
          <h2 id="upgrade-title" className="font-display text-xl text-text-primary">
            {copy.title}
          </h2>
          <p className="mt-2 text-[0.929rem] leading-relaxed text-text-secondary">{copy.body}</p>
          <ul className="mt-4 space-y-1.5">
            {PLANS.pro.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-[0.857rem] text-text-secondary">
                <svg viewBox="0 0 16 16" className="mt-1 size-3 shrink-0 text-success" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8.5l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Not now
            </Button>
            <Button variant="primary" onClick={() => void openBilling()} disabled={opening}>
              {opening ? <Spinner className="size-4" /> : "Upgrade in browser"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
