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
  MAX_PRICE_USD,
  PAYWALL_STATUS,
  FREE_EXPORTS_PER_MONTH,
  PLANS,
  SEAT_PRICE_USD,
  isPaywallBody,
  type ExportUsage,
  type PlanId,
  type PluginUsage,
  type TeamPolicy,
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
  exports: {
    title: "You have used this month's free exports",
    body: `${PLANS.free.name} includes ${FREE_EXPORTS_PER_MONTH} exports a month. Upgrade to ${PLANS.pro.name} for $${SEAT_PRICE_USD} a month and export as many as you like.`,
  },
  seats: {
    title: `Teammates are on ${PLANS.max.name}`,
    body: `${PLANS.pro.name} is one seat. ${PLANS.max.name} brings ${PLANS.max.includedSeats} seats and ${PLANS.max.allowanceMultiplier}× the generation allowance, shared across the team, for $${MAX_PRICE_USD} a month.`,
  },
  plugin: {
    title: `Chat plugins are part of ${PLANS.pro.name}`,
    body: `Voiceover, sound effects and image generation run on providers we pay for per use, so unlike the rest of the app they aren't part of ${PLANS.free.name}. Upgrade for $${SEAT_PRICE_USD} a month to use them.`,
  },
};

/**
 * The export dialog offers an upgrade while exports are still left, so the
 * modal cannot assume it was opened by a refusal — "you have used this month's
 * free exports" would be a lie there.
 */
const EXPORTS_REMAINING = {
  title: `${PLANS.pro.name} lifts the export limit`,
  body: `${PLANS.free.name} includes ${FREE_EXPORTS_PER_MONTH} exports a month, unbranded and at any resolution. ${PLANS.pro.name} removes the ceiling and adds voiceover, sound effects and image generation in chat — $${SEAT_PRICE_USD} a month.`,
};

export const limitsQueryKey = ["billing-limits"] as const;

export interface PlanPayload {
  id: PlanId;
  name: string;
  seats: number;
  canInvite: boolean;
}

export interface LimitsResponse {
  plan: PlanPayload;
  seats: { used: number; max: number };
  /** The team policy, decided by the API. Absent from an API older than it. */
  team?: TeamPolicy;
  /** This month's plugin meters. Absent from an API older than the meters. */
  usage?: PluginUsage;
  /** This month's export meter. Absent from an API older than it. */
  exports?: ExportUsage;
  /** Paying, or with free exports left. Not enough for a plugin — see `subscription.paid`. */
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
  exports?: ExportUsage;
  subscription?: LimitsResponse["subscription"];
  usage?: PluginUsage;
  team?: TeamPolicy;
  canInvite: boolean;
  /** Re-read the plan and meters now — after a generation, say. */
  refresh: () => void;
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
      // Only a refusal an upgrade lifts is an upsell; a full Max team is a
      // sentence for the form.
      if (code === "PLAN_REQUIRES_UPGRADE") {
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
      exports: data?.exports,
      subscription: data?.subscription,
      usage: data?.usage,
      team: data?.team,
      canInvite: data?.plan.canInvite ?? false,
      refresh: () => void queryClient.invalidateQueries({ queryKey: limitsQueryKey }),
    }),
    [openUpgrade, handleLimitError, handleAuthClientError, data, queryClient],
  );

  return (
    <UpgradeContext.Provider value={value}>
      {children}
      <UpgradeModal
        reason={reason}
        exportsLeft={data?.exports?.remaining ?? null}
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
      refresh: () => {},
    };
  }
  return value;
}

function UpgradeModal({
  reason,
  exportsLeft,
  onClose,
  onLeaveForBrowser,
}: {
  reason: UpgradeReason | null;
  /** Free exports left this month; `null` on a plan with no ceiling. */
  exportsLeft: number | null;
  onClose: () => void;
  onLeaveForBrowser: () => void;
}) {
  const [opening, setOpening] = useState(false);
  const copy =
    reason === "exports" && exportsLeft !== 0
      ? EXPORTS_REMAINING
      : reason
        ? COPY[reason]
        : null;

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
          {/* A seats refusal is answered by Max; everything else by Pro. */}
          <ul className="mt-4 space-y-1.5">
            {PLANS[reason === "seats" ? "max" : "pro"].features.map((feature) => (
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
