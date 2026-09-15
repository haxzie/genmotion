"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PLANS,
  planPrice,
  type PlanId,
} from "@genmotion/shared";
import { api, API_URL } from "@/lib/api";
import { track } from "@/lib/analytics";
import { openBillingPortal, startCheckout, type PurchasablePlan } from "@/lib/billing";
import { limitsQueryKey } from "@/components/upgrade-modal";
import { Button, Spinner, cx } from "@/components/ui";
import { Modal } from "@/components/modal";
import { useFeedback } from "@/components/feedback-modal";

interface Subscription {
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  manageable: boolean;
  paid: boolean;
}

interface Trial {
  active: boolean;
  daysLeft: number;
  endsAt: string | null;
}


interface UsageResponse {
  plan: { id: PlanId; name: string; seats: number; canInvite: boolean };
  seats: { used: number; max: number };
  team?: { message: string };
  /** The caller's role: billing is an owner's or admin's page. */
  role?: string;
  subscription: Subscription;
  trial: Trial;
  entitled: boolean;
}

/**
 * Status pill — colour follows the state, not the plan. An org with no
 * subscription is on its trial (or past it), never "Active": that word belongs
 * to a subscription that is being paid for.
 */
function PlanStatusPill({
  subscription,
  trial,
}: {
  subscription: Subscription;
  trial: Trial;
}) {
  let label: string;
  let tone: "good" | "warn" | "muted";
  if (!subscription.paid) {
    if (trial.active) {
      label = `${trial.daysLeft} ${trial.daysLeft === 1 ? "day" : "days"} left`;
      tone = "muted";
    } else {
      label = "Trial ended";
      tone = "warn";
    }
  } else if (subscription.status === "on_hold" || subscription.status === "failed") {
    label = "Payment issue";
    tone = "warn";
  } else if (subscription.status === "paused") {
    label = "Paused";
    tone = "muted";
  } else if (subscription.cancelAtPeriodEnd || subscription.status === "cancelled") {
    label = "Ending";
    tone = "muted";
  } else {
    label = "Active";
    tone = "good";
  }
  return (
    <span
      className={cx(
        "rounded-full px-2 py-0.5 text-[0.786rem]",
        tone === "warn"
          ? "bg-orange-muted text-warning"
          : tone === "muted"
            ? "bg-surface-hover text-text-secondary"
            : "bg-green-muted text-success",
      )}
    >
      {label}
    </span>
  );
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** The one line under the plan name that says what happens next. */
function statusLine(s: Subscription, trial: Trial): string | null {
  if (!s.paid) {
    if (trial.active && trial.endsAt) return `Trial ends ${shortDate(trial.endsAt)}`;
    if (!trial.active) {
      return `Your trial${trial.endsAt ? ` ended ${shortDate(trial.endsAt)}` : " has ended"}. Upgrade to keep exporting.`;
    }
    return null;
  }
  if (!s.currentPeriodEnd) return null;
  const when = shortDate(s.currentPeriodEnd);
  if (s.status === "on_hold" || s.status === "failed") {
    return `We couldn't collect the last payment. Access continues until ${when} — update your payment method to keep it.`;
  }
  if (s.status === "paused") return `Paused. Access continues until ${when}.`;
  return s.cancelAtPeriodEnd || s.status === "cancelled"
    ? `Access ends ${when}`
    : `Renews ${when}`;
}

const PURCHASABLE = ["pro", "max"] as const;

/**
 * How long to wait for the subscription webhook after checkout. It usually
 * lands within a second or two; a minute covers a slow provider without
 * leaving the page spinning indefinitely.
 */
const ACTIVATION_POLL_MS = 2000;
const ACTIVATION_ATTEMPTS = 30;

/**
 * A single plan, priced and buyable on its own. The price is repeated in the
 * button because that button starts a paid checkout — what you're about to be
 * charged should be legible at the point of commitment, not only in the
 * heading above it.
 */
interface PaymentRow {
  id: string;
  createdAt: string;
  amount: number;
  currency: string;
  status: string;
  subscriptionId: string | null;
}

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

/**
 * Payments and their invoices, from the provider by way of our API. Always
 * on the page for an owner or admin — before the first payment it says so,
 * rather than leaving them to wonder where invoices will be.
 */
function PaymentsSection({ paid }: { paid: boolean }) {
  const payments = useQuery({
    queryKey: ["billing-payments"],
    queryFn: () => api<{ payments: PaymentRow[] }>("/api/billing/payments"),
    staleTime: 60_000,
    retry: false,
  });
  const rows = payments.data?.payments ?? [];
  return (
    <>
      <h2 className="mb-3 mt-10 text-[0.95rem] font-medium text-text-secondary">Payments</h2>
      <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
        {payments.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : payments.isError ? (
          <p className="px-5 py-6 text-[0.9rem] text-text-tertiary">
            Couldn&apos;t load payments just now. They&apos;re also in the billing portal.
          </p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-6 text-[0.9rem] text-text-tertiary">
            {paid
              ? "No payments yet. Invoices appear here after each charge, as PDFs."
              : "No payments yet. Once you upgrade, every charge and its invoice will be listed here."}
          </p>
        ) : (
          <table className="w-full text-[0.9rem]">
            <thead>
              <tr className="text-left text-[0.857rem] text-text-tertiary">
                <th className="px-5 py-3 font-normal">Date</th>
                <th className="px-5 py-3 font-normal">Amount</th>
                <th className="px-5 py-3 font-normal">Status</th>
                <th className="px-5 py-3 text-right font-normal">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3 text-text-primary">
                    {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-text-primary">{money(p.amount, p.currency)}</td>
                  <td className="px-5 py-3">
                    <span
                      className={cx(
                        "rounded-full px-2 py-0.5 text-[0.786rem] capitalize",
                        p.status === "succeeded" ? "bg-success/15 text-success" : p.status === "failed" || p.status === "cancelled" ? "bg-danger/15 text-danger" : "bg-surface-hover text-text-secondary",
                      )}
                    >
                      {p.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {p.status === "succeeded" && (
                      <a
                        href={`${API_URL}/api/billing/payments/${encodeURIComponent(p.id)}/invoice`}
                        className="text-accent hover:underline"
                        download
                      >
                        Download PDF
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function PlanCard({
  plan,
  current,
  busy,
  disabled,
  onSelect,
}: {
  plan: (typeof PURCHASABLE)[number];
  /** The plan the org is on now — decides whether this card is up, down, or a fresh start. */
  current: PlanId;
  busy: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const def = PLANS[plan];
  const featured = plan === "pro";
  const live = current !== "free";
  const down = live && PLANS[current].priceUsd > def.priceUsd;
  const label = !live
    ? `Upgrade to ${def.name} — ${planPrice(plan)}/mo`
    : down
      ? `Switch to ${def.name} at renewal — ${planPrice(plan)}/mo`
      : `Upgrade to ${def.name} — ${planPrice(plan)}/mo`;
  return (
    <div
      className={cx(
        "flex flex-col rounded-xl border p-5",
        featured
          ? "border-accent/40 bg-accent-muted/40"
          : "border-border bg-surface-raised",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display text-xl font-semibold tracking-tight">
          {def.name}
        </p>
        <p className="text-[0.857rem] text-text-tertiary">
          <span className="text-text-primary tabular-nums">{planPrice(plan)}</span>
          {" / month"}
        </p>
      </div>
      <p className="mt-2 text-[0.9rem] text-text-secondary">
        {def.includedSeats === 1 ? "Everything, for one person." : `Everything, for a team of ${def.includedSeats}.`}
      </p>
      <ul className="mt-3 flex flex-1 flex-col gap-1.5">
        {def.features.map((f) => (
          <li key={f} className="text-[0.9rem] text-text-secondary">
            {f}
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        // The one thing to do on a plan card is buy it, whichever plan: the
        // button is the primary one on every card.
        className="mt-4 inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-transparent bg-cta font-medium text-background transition-colors hover:bg-cta-hover disabled:opacity-60"
      >
        {busy ? <Spinner /> : label}
      </button>
    </div>
  );
}

export default function BillingPage() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  /** The page could not load at all — replaces the content. */
  const [error, setError] = useState<string | null>(null);
  /** An action failed — shown beside the cards; the page stays. */
  const [actionError, setActionError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState<PurchasablePlan | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const { openFeedback } = useFeedback();
  // "polling" while we wait for the webhook after checkout; "slow" once we've
  // given up waiting but the payment may still be landing.
  const [activation, setActivation] = useState<"idle" | "polling" | "slow">("idle");
  const queryClient = useQueryClient();

  const load = useCallback(
    () =>
      api<UsageResponse>("/api/billing/usage")
        .then((d) => {
          setData(d);
          return d;
        })
        .catch((e) => {
          setError(e.message ?? "Couldn't load usage.");
          return null;
        })
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Schedule the cancellation, or take it back — then re-read the plan.
   * Cancelling is confirmed in the modal below, so its error shows there;
   * resuming is one click and its error shows on the page.
   */
  async function setCancelling(cancel: boolean) {
    setCancelBusy(true);
    setActionError(null);
    setCancelError(null);
    try {
      await api(`/api/billing/${cancel ? "cancel" : "resume"}`, { method: "POST" });
      await load();
      queryClient.invalidateQueries({ queryKey: limitsQueryKey });
      setCancelOpen(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Couldn't update the subscription.";
      if (cancel) setCancelError(message);
      else setActionError(message);
    } finally {
      setCancelBusy(false);
    }
  }

  /**
   * Returning from checkout, the subscription webhook usually lands within a
   * second — but it is not synchronous with the redirect, so the page can load
   * while the org is still on Free. Poll briefly rather than show a stale plan.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success") return;

    setActivation("polling");
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      const fresh = await load();
      const done = fresh ? fresh.plan.id !== "free" : false;
      if (done || attempts >= ACTIVATION_ATTEMPTS) {
        clearInterval(timer);
        setActivation(done ? "idle" : "slow");
        if (done) {
          track("upgrade_plan_activated", { plan: fresh!.plan.id });
          // The sidebar and dashboard read the plan through react-query; this
          // page's own fetch does not update them.
          queryClient.invalidateQueries({ queryKey: limitsQueryKey });
        }
        // Drop the query param so a refresh doesn't poll again.
        window.history.replaceState({}, "", window.location.pathname);
      }
    }, ACTIVATION_POLL_MS);
    return () => clearInterval(timer);
  }, [load, queryClient]);

  // Never offer the plan they're already on.
  const upgradable = PURCHASABLE.filter((p) => p !== data?.plan.id);

  return (
    <div className="mx-auto max-w-3xl px-8 pb-20 pt-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium">Billing</h1>
          <p className="text-[0.95rem] text-text-secondary">Your plan and generation usage.</p>
        </div>
        {/* A question about a charge, an invoice, or a plan that doesn't fit —
            the same form as Help & feedback, on the billing topic. */}
        <Button variant="secondary" onClick={() => openFeedback("billing")} className="h-9 shrink-0">
          Contact us
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : error ? (
        <div className="rounded-md border border-dashed border-border py-14 text-center text-text-tertiary">
          {error}
        </div>
      ) : data && data.role !== undefined && data.role !== "owner" && data.role !== "admin" ? (
        <div className="rounded-xl border border-border bg-surface-raised p-6">
          <p className="font-medium text-text-primary">Billing is managed by your organization&apos;s owner</p>
          <p className="mt-1.5 text-[0.9rem] text-text-secondary">
            You&apos;re on the {data.plan.name} plan. Plan changes, invoices and cancellation are for an owner or admin — ask
            yours, or use Contact us above.
          </p>
        </div>
      ) : (
        data && (
          <>
            {activation === "polling" && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-accent/40 bg-accent-muted/40 px-5 py-4 text-[0.9rem] text-text-secondary">
                <Spinner />
                Activating your plan… this usually takes a few seconds.
              </div>
            )}
            {activation === "slow" && data.plan.id === "free" && (
              <div className="mb-4 rounded-xl border border-warning/40 bg-orange-muted/40 px-5 py-4 text-[0.9rem] text-text-secondary">
                Your payment went through but the plan hasn&apos;t activated
                here yet. This can take a minute —{" "}
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    load();
                    queryClient.invalidateQueries({ queryKey: limitsQueryKey });
                  }}
                  className="cursor-pointer underline underline-offset-2 hover:text-text-primary"
                >
                  refresh
                </button>
                , or contact support if it still shows the trial.
              </div>
            )}

            {/* Current plan, plus the billing portal once there's something to
                manage. Upgrade options get their own cards further down. */}
            <div
              className={cx(
                "grid gap-4",
                (data.subscription.manageable || data.subscription.status === "active") && "sm:grid-cols-2",
              )}
            >
              <div className="rounded-xl border border-border bg-surface-raised p-5">
                <div className="flex items-center gap-2">
                  <span className="text-[0.857rem] text-text-tertiary">
                    Current plan
                  </span>
                  <PlanStatusPill subscription={data.subscription} trial={data.trial} />
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <p className="font-display text-xl font-semibold tracking-tight">
                    {data.plan.name}
                  </p>
                  {data.subscription.paid && (
                    <span className="text-[0.857rem] text-text-tertiary tabular-nums">
                      {planPrice(data.plan.id)} / month
                    </span>
                  )}
                </div>
                <ul className="mt-2.5 flex flex-col gap-1.5">
                  {PLANS[data.plan.id].features.map((f) => (
                    <li
                      key={f}
                      className="text-[0.9rem] text-text-secondary"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
                {statusLine(data.subscription, data.trial) && (
                  <p
                    className={cx(
                      "mt-3 text-[0.857rem]",
                      !data.entitled ? "text-warning" : "text-text-tertiary",
                    )}
                  >
                    {statusLine(data.subscription, data.trial)}
                  </p>
                )}
              </div>

              {/* Anyone paying sees how to stop paying. The portal needs a
                  billing account at the provider; the cancel button only
                  needs an active subscription, and the API says so if
                  there is nothing behind it to cancel. */}
              {data.subscription.manageable || data.subscription.status === "active" ? (
                <div className="rounded-xl border border-border bg-surface-raised p-5">
                  <span className="text-[0.857rem] text-text-tertiary">
                    Billing
                  </span>
                  <p className="mt-1.5 font-display text-xl font-semibold tracking-tight">
                    Manage subscription
                  </p>
                  <p className="mt-2 text-[0.9rem] text-text-secondary">
                    {data.subscription.manageable
                      ? "Update your payment method, download invoices, or cancel."
                      : data.subscription.cancelAtPeriodEnd
                        ? "Your subscription ends at the close of this billing period."
                        : "Cancel any time; Pro stays on until the end of the period you've paid for."}
                  </p>
                  {data.subscription.manageable && (
                  <button
                    type="button"
                    disabled={portalBusy}
                    onClick={async () => {
                      setPortalBusy(true);
                      setActionError(null);
                      try {
                        await openBillingPortal();
                      } catch (e) {
                        setActionError(
                          e instanceof Error
                            ? e.message
                            : "Couldn't open the billing portal.",
                        );
                        setPortalBusy(false);
                      }
                    }}
                    className="mt-4 inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-md border border-border bg-surface font-medium text-text-primary transition-colors hover:bg-surface-hover disabled:opacity-60"
                  >
                    {portalBusy ? <Spinner /> : "Manage billing"}
                  </button>
                  )}
                  {data.subscription.status === "active" && (
                    <button
                      type="button"
                      disabled={cancelBusy}
                      onClick={() => {
                        if (data.subscription.cancelAtPeriodEnd) void setCancelling(false);
                        else {
                          setCancelError(null);
                          setCancelOpen(true);
                        }
                      }}
                      className={cx(
                        "inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-md border font-medium transition-colors disabled:opacity-60",
                        data.subscription.manageable ? "mt-2" : "mt-4",
                        data.subscription.cancelAtPeriodEnd
                          ? "border-border bg-surface text-text-primary hover:bg-surface-hover"
                          : "border-transparent bg-transparent text-danger hover:bg-danger/10",
                      )}
                    >
                      {cancelBusy ? (
                        <Spinner />
                      ) : data.subscription.cancelAtPeriodEnd ? (
                        "Resume subscription"
                      ) : (
                        "Cancel subscription"
                      )}
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            <Modal open={cancelOpen} onClose={() => !cancelBusy && setCancelOpen(false)} dismissible={!cancelBusy} labelledBy="cancel-title">
              <div className="p-6">
                <h2 id="cancel-title" className="font-display text-lg font-semibold tracking-tight">
                  Cancel your subscription?
                </h2>
                <p className="mt-2 text-[0.9rem] text-text-secondary">
                  Pro stays on until{" "}
                  <span className="text-text-primary">
                    {data.subscription.currentPeriodEnd
                      ? new Date(data.subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                      : "the end of the period you've paid for"}
                  </span>
                  . After that, exports stop and the chat&rsquo;s voiceover, sound-effect and image tools turn off.
                  Your projects and files are untouched, and you can resume any time before then.
                </p>
                {cancelError && <p className="mt-3 text-[0.857rem] text-danger">{cancelError}</p>}
                <div className="mt-6 flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setCancelOpen(false)} disabled={cancelBusy} className="h-9">
                    Keep Pro
                  </Button>
                  <Button type="button" variant="danger" onClick={() => void setCancelling(true)} disabled={cancelBusy} className="h-9">
                    {cancelBusy && <Spinner className="size-3.5" />}
                    Cancel subscription
                  </Button>
                </div>
              </div>
            </Modal>

            {/* One card per purchasable plan the org isn't already on, so each
                plan states its own price and features instead of sharing a box. */}
            {upgradable.length > 0 && (
              <>
                <h2 className="mb-3 mt-10 text-[0.95rem] font-medium text-text-secondary">
                  {data.subscription.status === "active" ? "Change plan" : data.subscription.status !== "none" ? "Resubscribe" : "Upgrade"}
                </h2>
                <div
                  className={cx(
                    "grid gap-4",
                    upgradable.length > 1 && "sm:grid-cols-2",
                  )}
                >
                  {upgradable.map((p) => (
                    <PlanCard
                      key={p}
                      plan={p}
                      current={data.plan.id}
                      busy={checkoutBusy === p}
                      disabled={checkoutBusy !== null}
                      onSelect={async () => {
                        setCheckoutBusy(p);
                        setActionError(null);
                        try {
                          // In place for a live subscription: reload the page's
                          // data rather than leaving for a checkout that isn't.
                          if ((await startCheckout(p)) === "changed") {
                            await load();
                            queryClient.invalidateQueries({ queryKey: limitsQueryKey });
                            setCheckoutBusy(null);
                          }
                        } catch (e) {
                          setActionError(
                            e instanceof Error
                              ? e.message
                              : "Couldn't start checkout.",
                          );
                          setCheckoutBusy(null);
                        }
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            <PaymentsSection paid={data.subscription.paid} />

            {actionError && (
              <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-[0.9rem] text-danger">{actionError}</p>
            )}


          </>
        )
      )}
    </div>
  );
}
